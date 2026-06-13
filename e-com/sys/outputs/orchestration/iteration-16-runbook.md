# iteration-16-runbook.md · 售后超时自动关闭 + 最小 RBAC

## 【目标】
- A. return_refund 单 approved 超 7 天用户未发起退货物流 → 系统自动 closed_overtime + 释放 reserved
- B. 后台引入 admin_users + 真实 JWT 登录 + 3 角色（super_admin / warehouse / sales_ops）+ Vue 菜单按角色显隐

## 【非目标】
- 多后端（PIM/WMS）的 endpoint 级 enforcement（仅 OMS 加 AdminAuth middleware + UI 隐藏菜单）
- 角色编辑 UI / 用户管理 UI（dev 阶段直接改 DB）
- 微信通知 / 邮件提醒（超时关闭仅记录）
- 操作日志中关联 admin 用户（保持 operator 字符串即可，不引入 FK）

## 一、文件清单（共 14 文件，3 Wave）

### Wave A · 售后超时关闭（5 文件）
| 类型 | 文件 |
|---|---|
| service 改 | `oms-backend/app/service/RefundStateMachine.php`（approved 多一个转移目标 closed_overtime）|
| service 改 | `oms-backend/app/service/RefundService.php`（+ closeOvertime + listOvertime 两个方法）|
| command 新 | `oms-backend/app/command/CloseOvertimeRefunds.php`（loop scan / 1 小时 / 240 次后退出）|
| config 改 | `oms-backend/config/console.php`（注册命令）|
| supervisor 改 | `oms-backend/supervisor/consumer.conf`（+ program:refund-close-overdue）|
| page 改 | `shop-admin/src/pages/oms/Refunds.vue`（status 筛选加 closed_overtime 选项）|

### Wave B · 最小 RBAC（8 文件）
| 类型 | 文件 |
|---|---|
| migration 新 | `oms-backend/database/migrations/20260528000008_create_admin_users.php`（含 seed 3 账号）|
| service 新 | `oms-backend/app/service/AdminAuthService.php`（bcrypt + 手写 HS256 JWT，避新增 composer 依赖）|
| controller 新 | `oms-backend/app/controller/AdminAuth.php`（POST /admin/login + GET /admin/me）|
| middleware 新 | `oms-backend/app/middleware/AdminAuth.php`（Bearer JWT → 注入 request->admin）|
| route 改 | `oms-backend/route/app.php`（admin/login 外，其他 admin/* 套 middleware）|
| store 改 | `shop-admin/src/stores/auth.ts`（增加 role + name + canSeePim/Oms/Wms 计算属性）|
| page 改 | `shop-admin/src/pages/Login.vue`（接真实 `/api/oms/admin/login` 接口）|
| layout 改 | `shop-admin/src/components/AdminLayout.vue`（菜单 v-if 按角色 + 顶栏显示 role tag）|

### Wave C · 文档（3 文件）
- iteration-16-runbook.md（本文件）
- reconcile-report-iteration-16.md
- progress.md 追加 iter-16 块

合计代码量：~600 行 PHP + ~150 行 Vue/TS。

## 二、状态机扩展

```
pending_approve → approved → received_back → refunded
                ↘ rejected            ↗
                ↘ closed_overtime (iter-16, return_refund 超 7 天 approved 未收货)
```

库存动作：
- `closed_overtime` 触发 `unreserveBatch`（货物仍在用户手里，**不**加 available）
- approved_by 字段写入 'system'（区分人工 vs 自动）

## 三、角色权限矩阵

| 角色 | PIM | OMS | WMS | 总览 |
|---|---|---|---|---|
| super_admin | ✅ | ✅ | ✅ | ✅ |
| warehouse | ❌ | ❌ | ✅ | ✅ |
| sales_ops | ✅ | ✅ | ❌ | ✅ |

实现层级：
- **菜单显隐**：Vue auth store 提供 `canSeePim/Oms/Wms` 计算属性，AdminLayout 用 `v-if`
- **API 鉴权**：OMS 所有 admin/* 接口（除 login）走 AdminAuth middleware；其他后端（PIM/WMS）暂不加（M3+ 补）

## 四、JWT 实现选择

不用 firebase/php-jwt（OMS composer.json 没有），手写最小 HS256：
- header + payload + signature (HMAC-SHA256) base64url
- 约 30 行代码，零新增依赖
- secret 走 env('ADMIN_JWT_SECRET', env('JWT_SECRET', 'dev-insecure-secret'))

## 五、待用户运行（4 步）

```bash
cd /Users/linfeng/Desktop/project/e-com/sys/apps

# 1. OMS migrate（admin_users 表 + seed 3 账号）
docker-compose exec oms-backend php think migrate:run
# 期望: 1 行 migrated（CreateAdminUsers）

# 2. OMS 重启（加载 middleware + 新 controller + 拉起 refund-close-overdue consumer）
docker-compose restart oms-backend

# 3. 看 supervisord 确认 3 consumer 全 RUNNING
docker-compose logs --tail 30 oms-backend | grep -iE "consume|close-overdue"
# 期望: consume-wms / consume-wms-inventory / refund-close-overdue 都 entered RUNNING

# 4. Vue admin: 用户需要重新登录（旧 mock token 已失效）
# 浏览器手动清 localStorage 或重启 vite dev：
# localStorage.clear()  在浏览器 console 跑
# 或刷新自动跳到 /login
```

## 六、验证清单（7 步）

| # | 操作 | 期望 |
|---|---|---|
| 1 | Vue admin 退出登录（或清 localStorage）→ 重新登录 `admin / admin123` | 成功 + 顶栏显示"管理员"tag + 三大菜单都可见 |
| 2 | 退出 → 登录 `warehouse / wh123` | 成功 + 顶栏"仓管"tag + 仅 WMS + 总览菜单 |
| 3 | 退出 → 登录 `sales / sales123` | 成功 + 顶栏"销售运营"tag + 仅 PIM/OMS + 总览菜单 |
| 4 | 错误密码 | 401 + "用户名或密码错误" Toast |
| 5 | 直接清 localStorage + 访问 /oms/orders | 401 → 自动跳 /login |
| 6 | （超时关闭）UPDATE refund_orders SET approved_at='2026-05-20' WHERE refund_no='RF...' AND status='approved' AND type='return_refund'，等不到 1 小时 → 手动跑 `docker-compose exec oms-backend php think refund:close-overdue`（Ctrl+C 中断后台扫描器，前台跑一次）| 该单 status=closed_overtime + inventory_status reserved -N |
| 7 | OMS / 退款审批：筛选 closed_overtime | 出现该单 |

> 步骤 6 提示：默认 7 天才会关，验证时手动改 DB approved_at 模拟。

## 七、本轮主动避坑

| 风险 | 规避 |
|---|---|
| OMS 加 middleware 后旧 mock token 全 401 | runbook 明确告知"重新登录"+ 自动 redirect /login |
| Vue HMR 不刷新 store（pinia 状态保留）| 用户 localStorage 清掉再登录即可 |
| 7 天等待无法实测 | 验证步骤 6 提供"手动改 DB approved_at + 前台单次跑"方法 |
| 闭包 long-running PHP 内存泄漏 | 240 次扫描（~10 天）后正常退出，supervisord 重拉 |
| JWT secret 硬编码暴露 | env('ADMIN_JWT_SECRET', ...) fallback dev 默认；生产部署需设置 env |
| firebase/php-jwt 依赖膨胀 | 手写 HS256（~30 行），零新增 composer 依赖 |
| 旧 mock-jwt token 形如 `mock-jwt-1234567890` 进 middleware 解析时 explode('.') 长度=1 | middleware 严格校验 3 段 + 签名一致，会 401，用户重登 |
| 关闭超时单但库存动作失败 | closeOvertime 在事务内 + 抛错回滚；状态机阻止重复关闭 |
| 多后端 enforcement 不一致 | runbook 明确"MVP 仅 OMS 加 middleware；PIM/WMS UI 隐藏菜单"足够，M3 再补 |

## 八、与历史 iter 对账

| iter | 主题 | 关联 |
|---|---|---|
| iter-14 | 退款 reserved 启用 | iter-16 扩展状态机（+ closed_overtime）+ unreserveBatch 复用 |
| iter-15 | audit log | iter-16 暂未给 admin login 加 audit log（M3 补登录审计）|
| iter-9 | supervisord + consumer | iter-16 加 refund-close-overdue 也走 supervisord 拉起 |
| **iter-16** | **超时关闭 + 最小 RBAC** | 不引入新事件流；admin auth 仅在 OMS |

## 九、剩余非阻塞（M3+）

| 编号 | 事项 |
|---|---|
| Q16-01 | PIM/WMS endpoint 级 admin enforcement |
| Q16-02 | admin 用户管理 UI（增删改密 / 调角色）|
| Q16-03 | 登录审计（admin login/logout 写 audit_log）|
| Q16-04 | 退款超时阈值可配置（每个仓 / 每个商家不同）|
| Q16-05 | 关闭超时单后微信 / 邮件通知用户 |

## 十、时间
2026-05-28
