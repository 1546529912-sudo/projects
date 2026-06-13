# iteration-17-runbook.md · PIM/WMS endpoint enforcement + admin 用户管理 UI

## 【目标】
- A. PIM/WMS 后端独立校验 admin JWT + 按角色限制（之前仅 OMS 加 middleware）
- B. Vue 后台 super_admin 可视化增删改 admin_users（之前需直接改 DB）

## 【非目标】
- 跨服务通过 OMS `/admin/me` 鉴权（选择各后端独立 verify，避免每请求一次跨服务调用）
- 细粒度操作级权限（角色矩阵仍为 super_admin/warehouse/sales_ops 三档）
- 双因素 / 自助密码找回
- 用户角色更改时撤销现有 token（需 token blacklist，M3+）

## 一、文件清单（共 14 文件，3 Wave）

### Wave A · PIM/WMS endpoint enforcement（6 文件）
| 类型 | 文件 |
|---|---|
| service 新 | `pim-backend/app/service/AdminTokenService.php`（30 行 HS256 verify，secret 同 OMS）|
| middleware 新 | `pim-backend/app/middleware/AdminAuth.php`（支持 `...$allowedRoles` 变参）|
| route 改 | `pim-backend/route/app.php`（admin/* 套 middleware + `['super_admin', 'sales_ops']`，公开读接口保持开放）|
| service 新 | `wms-backend/app/service/AdminTokenService.php`（同 PIM）|
| middleware 新 | `wms-backend/app/middleware/AdminAuth.php`（同 PIM）|
| route 改 | `wms-backend/route/app.php`（除 `picking-order` 内部接口外全部套 middleware + `['warehouse', 'super_admin']`）|

### Wave B · admin 用户管理（6 文件）
| 类型 | 文件 |
|---|---|
| service 改 | `oms-backend/app/service/AdminAuthService.php`（+ listUsers/createUser/updateUser/changePassword/deleteUser + validateRole）|
| middleware 改 | `oms-backend/app/middleware/AdminAuth.php`（加 `...$allowedRoles` 变参支持，向后兼容）|
| controller 新 | `oms-backend/app/controller/AdminUser.php`（CRUD + 改密 + 写 audit_log）|
| route 改 | `oms-backend/route/app.php`（admin/user/* 套 middleware + `'super_admin'`）|
| api 改 | `shop-admin/src/apis/oms.ts`（+ adminUserList/Create/Update/ChangePassword/Delete 5 接口 + adminLogin/adminMe 别名）|
| store 改 | `shop-admin/src/stores/auth.ts`（+ isSuperAdmin 计算属性）|
| layout 改 | `shop-admin/src/components/AdminLayout.vue`（OMS 子菜单加"管理员用户"，仅 super_admin 可见）|
| router 改 | `shop-admin/src/router/index.ts`（+ /oms/admin-users）|
| page 新 | `shop-admin/src/pages/oms/AdminUsers.vue`（列表 + 新增 dialog + 编辑 dialog + 改密 + 删除 + 防误删兜底）|

### Wave C · 文档（3 文件）
- iteration-17-runbook.md（本文件）
- reconcile-report-iteration-17.md
- progress.md 追加 iter-17 块

合计代码量：~700 行 PHP + ~250 行 Vue/TS。

## 二、角色 enforcement 矩阵

| Endpoint | 允许角色 |
|---|---|
| **OMS** | |
| `POST /api/v1/admin/login` | （无 auth）|
| `GET /api/v1/admin/me` | 任意 admin |
| `GET/POST /api/v1/admin/order/*` | 任意 admin |
| `GET /api/v1/admin/stats` / `inventory/list` / `dead-letter` / `audit-log` | 任意 admin |
| `POST /api/v1/admin/order/*/cancel\|recover` / `PUT /admin/inventory/*` | 任意 admin |
| `GET/POST /api/v1/admin/refund/*` | 任意 admin |
| `POST/PUT/DELETE /api/v1/admin/user/*` | **super_admin 独占** |
| **PIM** | |
| `GET /api/v1/product/list` / `category/list` / `brand/list` / `sku/*` | （公开，无 auth）|
| `GET/POST/PUT/DELETE /api/v1/admin/*` | super_admin / sales_ops |
| **WMS** | |
| `POST /api/v1/picking-order` | （内部接口，无 auth）|
| 其余全部（出库 / 仓库 / 库位 / 入库 / 库存 / 商品 read replica）| super_admin / warehouse |

## 三、跨服务 JWT 校验设计

**选择 A**（采用）：各后端独立 AdminTokenService verify
- 同 secret（env `ADMIN_JWT_SECRET`）+ 同算法（HS256）
- 30 行代码 / 后端，零 composer 依赖
- 每请求本地校验，无跨服务延迟

**选择 B**（放弃）：每个 PIM/WMS 请求调 OMS `/admin/me` 校验
- 增加一次跨服务 HTTP，每请求 ~10ms 延迟
- OMS 故障会拖垮 PIM/WMS

**关键约束**：所有 3 后端必须配置相同 `ADMIN_JWT_SECRET`。默认 fallback `'dev-insecure-secret'` 仅 dev 用，生产部署须设置 env。

## 四、待用户运行（4 步）

```bash
cd /Users/linfeng/Desktop/project/e-com/sys/apps

# 1. 无新 migration —— 直接重启 3 后端加载新 middleware
docker-compose restart pim-backend wms-backend oms-backend

# 2. Vue HMR 自动加载（如果 vite dev 在跑）
# 否则:
# cd shop-admin && npm run dev

# 3. 浏览器清 localStorage（旧 token 仍有效但角色权限可能不一致）
# 或直接重新登录

# 4. （可选）测试 ADMIN_JWT_SECRET 跨服务一致性
docker-compose exec oms-backend printenv | grep -i admin_jwt
docker-compose exec pim-backend printenv | grep -i admin_jwt
docker-compose exec wms-backend printenv | grep -i admin_jwt
# 期望: 都没设 → 都 fallback 同样的 'dev-insecure-secret' → 跨服务校验通过
```

## 五、验证清单（8 步）

### A. 跨服务 JWT 校验
| # | 操作 | 期望 |
|---|---|---|
| 1 | admin 登录 → 访问 PIM 商品页 → 新增 SPU | 成功（携带 token 通过 PIM AdminAuth）|
| 2 | admin 登录 → WMS 入库页 → 新建入库单 | 成功（携带 token 通过 WMS AdminAuth）|
| 3 | 清 localStorage → 直接访问 /pim/products | 跳 /login（前端 401 拦截器）|
| 4 | 用 curl 不带 Authorization 调 `POST localhost:8002/api/v1/admin/spu` | 返回 401 + "缺少 Bearer token" |

### B. 角色限制
| # | 操作 | 期望 |
|---|---|---|
| 5 | warehouse/wh123 登录 → 用 curl 带其 token 调 `POST localhost:8002/api/v1/admin/spu` | 返回 403 + "需要角色: super_admin/sales_ops" |
| 6 | sales/sales123 登录 → 用 curl 带其 token 调 `POST localhost:8004/api/v1/inbound` | 返回 403 + "需要角色: warehouse/super_admin" |

### C. admin 用户管理
| # | 操作 | 期望 |
|---|---|---|
| 7 | admin 登录 → 看到"管理员用户"菜单 → 新增 user `manager/mgr123/sales_ops` → 可登录 | 列表 +1 行；新用户登录看到 PIM/OMS 菜单 |
| 8 | warehouse 登录 → 应**看不到**"管理员用户"菜单；手工访问 `/oms/admin-users` → 调 API 返 403 | 菜单隐藏 + 接口拒绝 |

## 六、本轮主动避坑

| 风险 | 规避 |
|---|---|
| 跨服务 token 校验不一致 | 同 secret + 同算法 + 同 b64UrlEncode 实现（3 份独立但完全一致代码）|
| PIM/WMS 公开读接口被误锁（小程序 / shop-backend 调用）| 公开路由放 middleware group 外 |
| picking-order 内部接口被误锁（OMS HTTP 触发）| 保留在 middleware 外 |
| 删除最后一个 super_admin → 系统失锁 | deleteUser 检查 enabled super_admin 数 ≥ 2 才允许删 |
| 删除当前登录用户自杀 | currentUserId 比对，禁止自删 |
| middleware 变参不向后兼容 | OMS 现有 admin/* 路由仍用 `->middleware(AdminAuth::class)` 不传 role，middleware 端 `if ($allowedRoles)` 判空兜底 |
| 旧 token 改 role 后仍 7 天有效 | 已知限制，需 token blacklist（M3+，Q17-01）|
| Vue 仅菜单隐藏不够 → URL 直接访问 | 路由层未加 role guard 但 API 层 middleware 会拦；UI 出现"加载失败"toast |
| `del` 未 import 报 TS 错 | 修：`import { get, post, put, del } from './http'` |

## 七、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-9 | EventBus 跨服务模式（同 Redis），iter-17 类比同 secret 模式 |
| iter-15 | audit log，iter-17 admin_user.create/update/changePassword/delete 自动记录 |
| iter-16 | 引入 admin_users + JWT + 3 角色（仅 OMS enforce）|
| **iter-17** | 把 iter-16 RBAC 推广到 PIM/WMS + admin 用户增删改 UI |

## 八、剩余非阻塞（M3+）

| 编号 | 事项 |
|---|---|
| Q17-01 | Token blacklist（角色 / 状态变更后撤销已签 token）|
| Q17-02 | 操作日志按 admin 用户聚合查询 |
| Q17-03 | 失败登录尝试限流（防暴力破解）|
| Q17-04 | 密码复杂度策略 |
| Q17-05 | 用户自助改密 / 找回 |

## 九、时间
2026-05-28
