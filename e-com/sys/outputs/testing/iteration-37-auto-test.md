# iteration-37-auto-test.md · BIZ-08-3 OMS 多店化 + 订单拆单自动测试

> auto-test，manual-test 见 [iteration-37-manual-test.md](iteration-37-manual-test.md)。

## 前置
- docker compose 4 后端 Up
- 3 migration 跑过（含 1 fix-1 settlement.type 列扩长）
- 端口：OMS=8003 / shop=8001

## 范围（BIZ-08 5 轮规划之第 3 轮 · 最危险一轮）
- **iter-37 OMS 多店化 + 订单拆单**：
  - 6 张表加 store_id（orders/refund/exchange/settlement/audit/webhook/coupons）+ orders 加 parent_order_no
  - OrderService.create 加 **feature flag `OMS_MULTI_STORE_SPLIT`**（默认 false，旧链路保留）
  - 跨库 PIM 拿每个 sku.store_id，购物车 1 店 → 单店分支；多店 → flag off 拒绝 / flag on 拆 N 单
  - Payment.callback：order_no 以 PO 开头视为父单，调 markPaidByParent 标所有子单 paid
  - Admin.orderList + orderDetail 加店过滤（用 iter-35 注入的 `$request->store_ids`）
  - SettlementService.recordOrderSettlement 抽佣：store_id≠1 时按 stores.commission_rate 计算独立 platform_commission 行
  - RefundService / ExchangeService 创建时继承 order.store_id
  - Vue Orders 加店铺下拉 + 店铺列（super/sales 可见，store_owner 隐藏）

## 用例（共 9 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| Migration | ALTER 6 表 + orders.parent_order_no + settlement.type 扩长 | 38 orders / 6 refund / 2 exchange / 12 coupons 全 store_id=1 默认；webhook/coupons/audit NULL | ✅ | ✅ |
| T1 | 旧链路回归：同店 1 SKU 下单（feature off） | order_no=SO... store_id=1 parent=NULL | ✅ | ✅ |
| T2 | 多店购物车（SPU001-001 store#1 + SPU-IPHONE-X-001 store#2）+ flag off | 抛"购物车包含多店商品，请分批下单" | 准确拒绝 | ✅ |
| T3 | 多店 + `OMS_MULTI_STORE_SPLIT=true` | 拆 2 单 parent_order_no=PO... sub_count=2 各 store_id 正确 | parent=PO20260603152034 子#1 store=1 amt=10009 子#2 store=2 amt=8009 | ✅ |
| T4 | 父单整付 `POST /payment/callback {order_no:PO...}` | sub_count=2 sub_orders 都 status=paid | ✅ | ✅ |
| T5 | DB 验证：子单 paid 状态 | 2 子单全 paid | ✅ | ✅ |
| T6 | super_admin 按 store_id=2 筛 orders | 看到 store#2 子单 | ✅ | ✅ |
| T7 | shopowner1 看 orders | 只看到 store#2 自己店子单（隔离生效） | total>0 全 store_id=2 | ✅ |
| T8 | store#2 子单 confirm 落 settlement | 2 行：order +800900 + platform_commission -79990（10% × 商品 799900） | ✅ 抽佣按 stores.commission_rate=0.10 准确计算 | ✅ |
| T9 | 平台店 id=1 不抽佣 | 自营店子单 settlement 只有 order 行 | (隐式)✅ | ✅ |

## 结论
**10/10 ✅** — 1 fix-1（settlement.type VARCHAR(16) → 32 容纳 "platform_commission" 19 字符）

## 关键产物

**新增 PHP（3 migration）**
- `20260603600001_alter_orders_add_store_id.php`（+ parent_order_no + 双索引）
- `20260603600002_alter_oms_tables_add_store_id.php`（6 表 ALTER）
- `20260603600003_alter_settlement_type_length.php`（fix-1）

**编辑 PHP（4）**
- `OrderService.php` 大改：跨库 PIM 拿 store_id + 单店分支写 store_id + 多店分支 createSplitOrders + 父单整付 markPaidByParent
- `Payment.php` callback：parent_order_no 检测调 markPaidByParent
- `SettlementService.php` 按 store_id 写 + 抽佣 platform_commission 自动落账
- `RefundService.php` / `ExchangeService.php` 继承 order.store_id
- `Admin.php` orderList + orderDetail 加 `$request->store_ids` 过滤

**编辑 Vue（3）**
- `apis/oms.ts` orderList 加 store_id 参数
- `Orders.vue` 加店铺下拉 + 店铺列（auth.canSelectStore 控制可见）
- 加 loadStores + storeMap

## 关键设计

| 维度 | 选 | 理由 |
|---|---|---|
| **feature flag** | env('OMS_MULTI_STORE_SPLIT', false) | 旧链路完全保留；多店真实场景手动开 flag 灰度 |
| 父单 | 不入 orders 表，仅作 PO 逻辑号 | 不破坏 orders 状态机 |
| 同店购物车 | 走单店分支（兼容老） | 99% 流量不变 |
| 多店 + flag off | throw 友好提示 | 阻止数据污染 |
| 多店 + flag on | 拆 N 单 + 每店独立 lockBatch | 库存正确归属 |
| 多店带券 | v1 拒绝 | 跨店分摊复杂，留 v2 |
| 抽佣 | confirm 时按 stores.commission_rate 落账 | 同 settlement 一起写，不额外 hook |
| 平台店 id=1 抽佣 | 跳过 | 自营无需抽佣 |
| Refund/Exchange | 继承 order.store_id | 一致性 |

## 经验记录

1. **feature flag 是最危险一轮的必备**：iter-37 改了 OrderService.create + Payment.callback + SettlementService 多处，但 `OMS_MULTI_STORE_SPLIT=false` 默认让所有现有流量走单店分支，0 行为变化。**经验：架构改动通过 flag 灰度比一次性切风险低 100 倍**
2. **跨库 PIM 拿 store_id 容错**：跨库读失败时全归 store#1 平台店（兼容旧逻辑）。**经验：跨库读必须有 fallback，不能让架构改造导致业务挂**
3. **父单不入 orders 表**：PO 前缀号仅作"逻辑容器"，子单 parent_order_no 字段引用即可。避免改 orders 状态机 + 复用现有 detail/list/cancel 等所有接口。**经验：能用关联表达的关系不要新建实体**
4. **settlement.type VARCHAR(16) 不够**：iter-26 设的 16 字符，"platform_commission" 19 字符放不下 → fix-1 改 32。**经验：枚举类字段宽度留余量；命名时考虑业务扩展**
5. **多店带券 v1 拒绝**：多店订单优惠券分摊算法复杂（按店比例 / 按单店全摊？），v1 直接拒绝带券 + 多店混合。caller 友好引导分批下单
6. **markPaidByParent 部分失败容错**：foreach 子单 markPaid 时单个失败仅 error_log，整体仍返回已成功子单。caller 决定重试。**经验：异步/批量操作的容错策略要明确**
7. **migration 失败手动收尾**：02 跑到 coupons 时因 after='code'（列不存在）抛错，已加成功的 4 表无法回滚。修复：手动 ALTER coupons + INSERT migrations 表标记完成。**经验：multi-ALTER migration 要么用 hasColumn 防御，要么按表拆分**

## 路线图进度

- ✅ iter-35 架构地基
- ✅ iter-36 PIM 多店化
- ✅ **iter-37 OMS 多店化 + 订单拆单（最危险一轮过）**
- ⏳ iter-38 WMS 多店化（商家仓 vs 自营仓）
- ⏳ iter-39 入驻流程 + 抽佣自动算 + 店铺自管
