# iteration-34-auto-test.md · 换货流程 BIZ-07 v1 自动测试

> 主控跑 curl，手动测试见 [iteration-34-manual-test.md](iteration-34-manual-test.md)。

## 前置
- docker compose 4 后端 Up
- `docker exec ecom-oms-backend php think migrate:run` → 2 migration 成功（exchange_orders + exchange_items）
- 端口：OMS=8003 · shop=8001

## 范围
- **BIZ-07 换货流程 v1**：用户申请 → admin 审批 → 用户寄回旧货 → admin 收旧标记 → admin 发新货标记 → 完成
- **v1 设计选择**：纯工作流跟踪 + 状态机 + 时间戳 + 凭证图，**不自动联动库存**（运营线下/走标准入出库），换货实物状况复杂，自动联动反而僵化 → v2 留位
- 状态机：`pending_approve → approved → received_old → sent_new → completed`，加 `rejected / cancelled` 终态分支

## 用例（共 13 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | 用户申请换货（含 1 item 跨库 PIM 拉新 SKU 快照） | code=0 + EX 单号 + 状态 pending_approve | EX202606031056386647 created；items[0] new_sku_snapshot 含 PIM 数据 | ✅ |
| T2 | 同一 order_item_id 再申请 | 400 阻断"已有进行中的换货单" | "items[0] order_item_id=4 已有进行中的换货单" | ✅ |
| T3 | admin approve | 状态 → approved + approved_at + approved_by | 全字段写入 | ✅ |
| T4 | approved 状态非法转移到 completed | 400"换货状态非法转移" | "approved → completed" 准确拦截 | ✅ |
| T5 | admin 标记 received_old（tracking_no_old + note） | 状态 → received_old + 时间戳 + 物流单号 + 备注 | 全字段写入 | ✅ |
| T6 | admin 标记 sent_new（tracking_no_new） | 状态 → sent_new + 物流单号 + 时间戳 | 全字段写入 | ✅ |
| T7 | admin 标记 complete | 状态 → completed + completed_at | 全字段写入 | ✅ |
| T8 | completed 状态再 approve | 400 状态机拦截 | "completed → approved" | ✅ |
| T9 | 非本人 cancel | 400 "非本人换货单" | 准确拒绝 | ✅ |
| T10 | reject 不传 reason | 400 "reject reason 必填" | 准确校验 | ✅ |
| T11 | warehouse 调 admin/exchange/list | 403（仅 super_admin/sales_ops，换货审批不归仓管） | "权限不足，需要角色: super_admin/sales_ops" | ✅ |
| T12 | 新申请 → 用户 cancel | code=0 + 状态 cancelled | EX202606031109378938 cancelled OK | ✅ |
| T13 | sales 调 admin/exchange/list | 200（sales_ops 是销售运营，可审批换货） | total=2 OK | ✅ |
| BFF | shop-backend GET /exchange/list 透传到 OMS | code=0 + 返回该用户换货列表 | total/page/size/list 正常 | ✅ |

## 结论
**14/14 ✅** — 换货 v1 状态机 + 用户/admin 流程 + RBAC + 跨库快照全过。

## 关键产物
**新增 PHP（5）**
- `apps/oms-backend/database/migrations/20260603300001_create_exchange_orders.php`
- `apps/oms-backend/database/migrations/20260603300002_create_exchange_items.php`
- `apps/oms-backend/app/service/ExchangeStateMachine.php`（7 态 + can/assert/isTerminal）
- `apps/oms-backend/app/service/ExchangeService.php`（apply/cancel/approve/reject/markReceivedOld/markSentNew/markCompleted + 跨库 PIM 拉新 SKU 快照 + 阻断同 item 进行中）
- `apps/oms-backend/app/controller/Exchange.php`（user + admin 两套接口 + AuditService 注入 5 处）
- `apps/shop-backend/app/controller/Exchange.php`（BFF 透传 + Idempotency-Key）

**编辑 PHP（3）**
- `apps/oms-backend/config/database.php`（+ pim 副连接，第 4 个跨库方向 OMS→PIM）
- `apps/oms-backend/route/app.php`（+ 4 user 路由 + 7 admin 路由，super_admin/sales_ops 限制）
- `apps/shop-backend/route/app.php`（+ 4 路由）

**新增 Vue（1）**
- `apps/shop-admin/src/pages/oms/Exchanges.vue`（admin 列表 + 详情对话框 + 7 步操作按钮按状态显示）

**编辑 Vue（3）**
- `apps/shop-admin/src/apis/oms.ts`（+ 7 方法）
- `apps/shop-admin/src/router/index.ts` + `AdminLayout.vue`（+ 1 路由 + 1 菜单项）

**新增小程序（6）**
- `apps/shop-miniprogram/pages/exchange-apply/{js,wxml,wxss,json}`
- `apps/shop-miniprogram/pages/my-exchanges/{js,wxml,wxss,json}`

**编辑小程序（4）**
- `apps/shop-miniprogram/apis/index.js`（+ 4 方法）
- `apps/shop-miniprogram/app.json`（+ 2 页面注册）
- `apps/shop-miniprogram/pages/order-detail/{wxml,js}`（shipped/completed 状态加"申请换货"按钮）
- `apps/shop-miniprogram/pages/me/{wxml,js}`（订单分组加"我的换货"入口）

**跨库副连接新方向**：OMS→PIM（拉新 SKU 快照），累计 **6 个方向**（shop↔oms / oms↔wms / pim→oms+wms / **oms→pim**）

## 经验记录
1. **换货 v1 主动放弃自动库存联动**：换货实物状况复杂（旧货可能损坏/磨损/缺件），自动联动反而僵化。运营更习惯"看到实物再决定入不入库"。**经验：业务流程的"灵活性"有时比"自动化"更重要，v1 做工作流跟踪即可**
2. **同 order_item 进行中阻断**：用 join exchange_orders + exchange_items 一次查询过滤 `status NOT IN (rejected/cancelled/completed)`。**经验：防重复提交在数据库层校验比业务层判断更可靠**
3. **OMS→PIM 副连接首例**：iter-29 是 PIM→OMS+WMS，今天反向。换货需要在创建时锁住新 SKU 快照（同 order_items.sku_snapshot 模式），避免 PIM 那边改 SKU 后影响已申请换货。**经验：业务表存"快照"是常见模式，跨库读时机选在创建即可**
4. **状态机 RBAC 拆分**：审批 → super_admin + sales_ops；warehouse 不掺和换货审批（仓管只管入出库实物操作）。但仓管负责"标记收到旧货"在 v2 留位（按 BPM 更细颗粒度时考虑）
5. **路由 group 选择**：OMS 现有 group 1 是无 role middleware（任意 admin），group 3 是 super+sales。换货初版我误放 group 1 → warehouse 也能审批；改放 group 3 才对。**经验：新增 admin 接口先想清楚谁能操作再选 group，别盲目放第一个 group**
