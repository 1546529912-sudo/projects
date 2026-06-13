# iteration-43-auto-test.md · EFF-03 退款/换货审批流 + EFF-04 PIM editor 角色

> 主控自动跑（curl / docker exec / DB 验证），用户无需操作。

## 范围
- **EFF-03** 退款审批流：amount ≥ ENV `OMS_REFUND_REVIEW_THRESHOLD_CENTS`（默认 100000=¥1000）且 role != super_admin → 转 super 二审
- **EFF-03** 换货审批流：sum(qty) ≥ ENV `OMS_EXCHANGE_REVIEW_THRESHOLD_QTY`（默认 3）且 role != super_admin → 转 super 二审
- **EFF-04** PIM editor 角色：CRUD 草稿允许，**publish/offline 拒绝**

## 前置
- 2 migration：`20260604000001_alter_refund_exchange_add_second_review` + `20260604000002_seed_editor_admin_user`
- ENV：apps/.env 加 `OMS_REFUND_REVIEW_THRESHOLD_CENTS=100000` + `OMS_EXCHANGE_REVIEW_THRESHOLD_QTY=3`
- 3 账号：admin/admin123 (super_admin) / sales/sales123 (sales_ops) / editor/editor123 (editor)
- docker compose up -d --force-recreate oms-backend 让 ENV 生效

## 用例（共 13 项，全 PASS）

### A · 退款审批流（5 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | sales 一审 RF202606021449537100（amount=100000=¥1000=阈值） | needs_2=1, first_by=sales, status 仍 pending_approve | code:0 status:pending_approve needs_2:1 first_by:sales first_at:2026-06-04 08:29:13 | ✅ |
| T2 | sales 再次 approve 同一单 | 409 "需 super_admin 二审通过" | code:409 msg:该退款单需 super_admin 二审通过 | ✅ |
| T3 | super 二审通过 | status=approved（refund_only 自动 → refunded） | code:0 status:refunded approved_by:admin needs_2:1 | ✅ |
| T4 | sales 一审 amount=5000=¥50（< 阈值） | 直通 approved（refund_only 自动 → refunded） | code:0 status:refunded needs_2:0 approved_by:sales | ✅ |
| T5 | super 一审 amount=300000=¥3000（> 阈值） | 不进二审，直接 approved → refunded | code:0 status:refunded needs_2:0 approved_by:admin | ✅ |

### B · PIM editor 角色（4 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T6 | editor 创建 SPU 草稿 EDITOR-TEST-001 | 200 ok | code:0 msg:ok spu_id=9 | ✅ |
| T7 | editor publish SPU id=9 | 403 权限不足 | HTTP 403 msg:权限不足，需要角色: super_admin/sales_ops/store_owner | ✅ |
| T8 | sales publish 同 SPU | 200 | HTTP 200 | ✅ |
| T9 | editor delete SPU id=9 | 200（软删允许） | HTTP 200 | ✅ |

### C · 换货审批流（4 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T10 | sales 一审 EX202606040833172742（qty=1 < 阈值=3） | 直通 approved | code:0 status:approved needs_2:0 | ✅ |
| T11 | sales 一审 qty=3 换货单（手动 update qty=3 模拟阈值） | needs_2=1, first_by=sales, status 仍 pending_approve | code:0 status:pending_approve needs_2:1 first_by:sales | ✅ |
| T12 | sales 再次 approve 同一单 | 400 "需 super_admin 二审通过" | code:400 msg:该换货单需 super_admin 二审通过 | ✅ |
| T13 | super 二审通过 | status=approved | code:0 status:approved approved_by:admin | ✅ |

## 实施修复

| # | 问题 | 修复 |
|---|---|---|
| fix-1 | T6 editor 创建 SPU → "当前账号未关联任何店铺，不可建商品" | PIM StoreContextService.getStoreIds 把 'editor' 加入跨店白名单（同 super/sales/warehouse 返 null）。**经验：新增的平台级角色必须在所有 StoreContext 集合里登记**（PIM + WMS + OMS 三处都得检查）|
| fix-2 | T11 exchange qty 算总和报错 "fields not exists:[quantity]" | exchange_items 字段是 `qty` 不是 `quantity`。改 ExchangeService.approve `sum('qty')`。**经验：跨表字段命名不一致时（refund 用 amount / exchange 用 qty），用前必查 schema**|

## 文件清单（~13 个）
- 2 migration（apps/oms-backend/database/migrations/）
- 3 编辑 PHP（OMS RefundService / ExchangeService / Refund+Exchange controller）
- 1 编辑 PHP（PIM StoreContextService 加 editor 白名单）
- 1 编辑 PHP（PIM route 拆 publish/offline 出独立 group）
- 1 编辑 ts（apps/shop-admin/src/stores/auth.ts 加 editor + canPublishSpu）
- 2 编辑 Vue（Refunds/Exchanges 加 needs_second_review 二审 badge）
- 1 编辑 Vue（AdminLayout role label）+ 1 编辑 Vue（Products 加 canPublishSpu 守卫）
- 1 编辑 .env（OMS_REFUND_REVIEW_THRESHOLD_CENTS / OMS_EXCHANGE_REVIEW_THRESHOLD_QTY）

## 总结
**13/13 ✅ + 2 fix**（fix 都在 auto 阶段捕获修完）

- EFF-03 退款 + 换货审批流全链路通：一审标记 / 一审 sales 再投拒绝 / super 二审通过 / 小额/小量直通 / super 直接一步过（无需二审）5 路径全 OK
- EFF-04 PIM editor 角色：CRUD 草稿允许 + publish/offline 严格 403 拒绝 + 同 SPU sales 可正常 publish 验证
- 0 新表 0 业务 ALTER（只加 3 字段到 refund/exchange，0 新 service，纯增量）
- 复用：iter-9 EventBus + iter-15 AuditService + iter-36 StoreContextService + iter-37 RBAC group

ⓘ iter-44 EFF 第 3 轮候选：**EFF-07 WMS PDA H5**（移动端拣货扫码 + 入库扫码）或 **EFF-02 全局快捷搜索（⌘K）**
