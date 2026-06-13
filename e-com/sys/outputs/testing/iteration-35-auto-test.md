# iteration-35-auto-test.md · BIZ-08-1 多商家架构地基自动测试

> 主控跑 curl，手动测试见 [iteration-35-manual-test.md](iteration-35-manual-test.md)。

## 前置
- docker compose 4 后端 Up
- `docker exec ecom-oms-backend php think migrate:run` → 2 migration（stores + store_admins）成功，平台店 id=1 自动落地
- 端口：OMS=8003

## 范围
- **BIZ-08-1 架构地基**：建 stores + store_admins 表 + StoreService（CRUD/审批/暂停/恢复/抽佣/绑解管理员）+ StoreContextService（取当前 admin 的 store_ids，Redis 1h 缓存）+ AdminAuth middleware 增强（注入 `$request->store_ids`）+ Store controller + Vue Stores.vue
- **本轮不动业务表**：spus/skus/orders 等加 store_id 推迟到 iter-36~38 各自加
- **平台店 id=1 保护**：不可暂停、不可改抽佣、不可加移除管理员（UI 也按钮隐藏）

## 用例（共 12 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | `GET /admin/store/list` 初始 | 1 条（id=1 platform 平台自营，approved） | ✅ | ✅ |
| T2 | `POST /admin/store` 建 shop-iphone, 抽佣 0.08 | code=0, status=pending | id=2 created | ✅ |
| T3 | `POST /admin/store/2/approve` | status=approved + approved_at + approved_by=admin | 全字段写入 | ✅ |
| T4 | `POST /admin/store/2/commission` 改为 0.10 | commission_rate=0.1000 持久化 | ✅ | ✅ |
| T5 | `POST /admin/store/2/suspend reason=违规测试` | status=suspended + suspended_at + suspended_reason | 全字段写入 | ✅ |
| T6 | `POST /admin/store/1/suspend`（平台店）| 400 "平台店不可暂停" | 准确拦截 | ✅ |
| T7 | `POST /admin/store/2/admins admin_user_id=2 role=store_owner` | store_admins 表新增；warehouse user.role 不变（保留平台角色不覆盖） | 绑定成功，warehouse 仍然是 warehouse 角色 | ✅ |
| T8 | sales 调 store/list | 403 "权限不足，需要角色: super_admin" | 准确拦截 | ✅ |
| T9 | 详情含 admins 列表（join admin_users） | 1 个 warehouse / store_owner | ✅ | ✅ |
| T10 | `DELETE /admin/store/2/admins/2` 移除绑定 | code=0 + 关联表删除 | ✅ | ✅ |
| T11 | `POST /admin/store/2/resume` | status=approved + suspended_at/reason 清空 | ✅ | ✅ |
| T12 | warehouse 调 store/list | 403 | 准确拦截 | ✅ |

## 结论
**12/12 ✅** — 架构地基完整，0 fix。

## 关键产物
**新增 PHP（5）**
- `apps/oms-backend/database/migrations/20260603400001_create_stores.php`（含 id=1 平台店 INSERT）
- `apps/oms-backend/database/migrations/20260603400002_create_store_admins.php`
- `apps/oms-backend/app/service/StoreService.php`（CRUD + 7 业务动作 + AuditService 注入 7 处）
- `apps/oms-backend/app/service/StoreContextService.php`（getStoreIds + Redis 1h 缓存 + flushAdminCache）
- `apps/oms-backend/app/controller/Store.php`

**编辑 PHP（2）**
- `apps/oms-backend/app/middleware/AdminAuth.php`（+ 注入 `$request->store_ids` 给所有 admin 接口用）
- `apps/oms-backend/route/app.php`（+ 9 路由，super_admin group）

**新增 Vue（1）**
- `apps/shop-admin/src/pages/oms/Stores.vue`（列表 + 新建/详情对话框 + 7 步操作按钮按状态显示 + 关联管理员表）

**编辑 Vue（3）**
- `apps/shop-admin/src/apis/oms.ts`（+ 9 方法）
- `apps/shop-admin/src/router/index.ts` + `AdminLayout.vue`（+ 路由 + 系统管理子菜单 + "店铺管理"，仅 super_admin）

**0 ALTER 业务表** — 所有 spus/orders 等加 store_id 推迟到 iter-36~38 各自加，本轮风险隔离。

## 关键设计决策（用户拍板）

| 决策 | 选 |
|---|---|
| 拆单时机 | 下单时立即拆 N 单（iter-37 实施） |
| 商家仓储 | v1 商家必须自有仓 |
| 支付 | 父单整付 + 回调后所有子单 paid |
| 抽佣时机 | confirm 时（同 settlement 一起写） |
| 公共类目/品牌 | 商家可用不可改（默认） |

## 经验记录

1. **平台店 id=1 在 migration 即落地**：`$this->execute("INSERT INTO stores ... VALUES (1, 'platform', ...)")`，避免后续逻辑判断"是否存在默认店"。**经验：默认数据放 migration 比放 seed 更可靠 — 不会忘了跑**
2. **不 ALTER admin_users.role enum**：原是 VARCHAR(32)，新角色 `store_owner` / `store_staff` 直接存。enum 改动 ALTER 复杂且影响外部消费方。**经验：能用字符串就别强制 enum**
3. **AdminAuth 注入 store_ids 但不强制过滤**：iter-35 仅"提供能力"，业务 service 是否用是 iter-36~38 各自的事。super_admin/sales_ops/warehouse 注入 null = 跨店访问。**经验：架构能力 vs 业务约束分两步，地基轻量纯增加**
4. **Redis 缓存 store_ids 1 小时**：避免每请求 join store_admins；store.admin_add/remove 时主动 flush。**经验：高频读 + 低频写场景的标准缓存模式**
5. **不动业务表 ALTER**：风险隔离 — iter-35 失败也不影响现有 33 轮业务，回滚只需 drop 2 张新表 + revert middleware change
6. **OMS→PIM/SHOP/WMS 副连接暂不加**：仅本轮后台管理店铺，未来 iter-36~38 各自需要时再加 stores 副连接
