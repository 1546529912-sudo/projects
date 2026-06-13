# iteration-6-runbook.md · Phase 2 P2 OMS→WMS 出库闭环

## 【当前焦点】
基于 iteration-5 已跑通的 OMS 订单/库存四态/支付，扩展出库链路：
**OMS 支付成功 → 调 WMS 下发拣货单 → WMS 分配库位+生成 PDA 任务 → 模拟 PDA 完成拣货 → WMS 回传出库 → OMS state machine paid→picking→shipped + 实物库存出库**

## 本轮范围（精简）

### 不在范围（M2 处理）
- 真实 PDA 扫码（逐条 pick → review → ship 分阶段）：本轮合并成一个"自动完成"端点 `POST /api/v1/outbound/:no/auto-complete`
- 入库流程（inbound_orders/inbound_items/difference_reports）：M2
- 短拣异常分支（picking.shortage Stream）：M2
- WMS 用户/角色/权限：M2
- 库存对账与盘点：M2
- WMS 库存流水 inventory_log：本轮只动 inventory 主表，流水 M2 补
- operation_log：M2

### 本轮范围

**Wave A · WMS（约 16 文件）：**

| 任务 | 内容 | 输出 |
|---|---|---|
| WMS-DB-001 | migration 新增：warehouses / locations / inventory / outbound_orders / outbound_items / picking_tasks | 6 migration |
| WMS-DB-002 | seed：1 仓 WH-DEFAULT + 5 库位 + 5 SKU × 1 库位 = 5 inventory 行（quantity=100 与 OMS 对齐）| SeedWarehouse.php |
| WMS-MOD-001 | Model：Warehouse / Location / Inventory / OutboundOrder / OutboundItem / PickingTask | 6 model |
| WMS-SVC-001 | InventoryService：findAvailable(sku, qty) 找库存够的库位；deduct(sku, location, qty) 扣减实物 | InventoryService.php |
| WMS-SVC-002 | OutboundService：acceptPicking（接 OMS 拣货单 + 分配库位 + 写 outbound + items + tasks）/ autoComplete（一键完成 + 回传 OMS）| OutboundService.php |
| WMS-CTL-001 | PickingController：POST /api/v1/picking-order 接 OMS 拣货单 | Picking.php |
| WMS-CTL-002 | OutboundController：GET /outbound/list / GET /outbound/:no / POST /outbound/:no/auto-complete | Outbound.php |
| WMS-RT-001 | route/app.php 注册全部接口 | route 更新 |

**Wave B · OMS 改动（约 3 文件）：**

| 任务 | 内容 | 输出 |
|---|---|---|
| OMS-CHG-001 | OrderService::markPaid 后调用 WmsClient::sendPickingOrder（HTTP POST WMS）；失败时 picking_orders.status='failed' + last_error，不影响支付成功 | OrderService.php + 新 WmsClient.php |
| OMS-CHG-002 | Order::wmsShipped 新方法：接 WMS 回传，状态 paid→picking→shipped；InventoryService::outboundBatch；写 express_no | Order.php + OrderService.php |
| OMS-RT-001 | route 加 `POST /api/v1/order/:no/wms-shipped` | route 更新 |

合计 **约 19 个新增/修改文件**。

## 状态机扩展

```
paid ──(WMS 接到拣货单)──> picking
picking ──(WMS auto-complete + 回传)──> shipped
shipped ──(用户)──> completed
```

之前 paid 之后只写本地 picking_orders 表。现在改为：
1. OMS markPaid → 触发 HTTP 调 WMS
2. WMS 接受后 OMS 状态从 paid 进 picking（自动通过 wmsShipped 端点或额外的 picking-accepted 端点）

简化：把"WMS 接到拣货单"和"WMS 回传出库"压缩。OMS picking 状态由 WMS auto-complete 回传时一次性 paid→picking→shipped 推进。本轮只看出库结果。

## 库位分配策略（MVP）

简单实现：`InventoryService::findAvailable(sku, qty)` 返回第一个 `quantity - locked_quantity >= qty` 的库位行。
不做：金钻位优先、ABC 分类、路径优化、合单。M2 处理。

## 跨服务调用关系

```
OMS markPaid()
  ↓ HTTP POST http://wms-backend/api/v1/picking-order  (含 outbound_no, oms_order_no, items, address)
WMS PickingController::create
  ↓ OutboundService::acceptPicking
     - InventoryService::findAvailable (找库位)
     - INSERT outbound_orders, outbound_items, picking_tasks
     - UPDATE inventory.locked_quantity += qty
  ← 返回 outbound_no
OMS：picking_orders.status='sent' （iteration-4 已有逻辑）

[模拟 PDA 完成拣货，curl 触发]
WMS OutboundController::autoComplete
  ↓ OutboundService::autoComplete
     - UPDATE inventory.quantity -= qty, locked_quantity -= qty
     - UPDATE outbound_orders.status='shipped' + express_no + shipped_at
     - HTTP POST http://oms-backend/api/v1/order/:no/wms-shipped
OMS Order::wmsShipped
  ↓ OrderService::markShipped (paid→picking→shipped + 写 express_no)
     - sm.transit(paid→picking)
     - sm.transit(picking→shipped)
     - InventoryService::outboundBatch (locked-=qty, 实物已减)
```

## 用户运行验证脚本

```bash
# 一次性 rebuild + migrate + seed
docker-compose up -d --build wms-backend
docker-compose exec wms-backend php think service:discover
docker-compose exec wms-backend php think migrate:run
docker-compose exec wms-backend php think seed:run

# 走一次完整流程
# 0. 重置登录（用 iteration-5 的步骤拿 TOKEN）
# 1. 加购 + 下单（沿用 iteration-5）→ 拿到 $ORDER
# 2. mock 支付
curl -X POST http://localhost:8001/api/v1/payment/callback/mock \
  -d "{\"order_no\":\"$ORDER\"}" -H 'Content-Type: application/json'

# 3. 看 OMS 这边的 picking_orders 表（应该 status=sent）
docker-compose exec mysql mysql -uroot -proot -e \
  "SELECT picking_no, order_no, status FROM oms_db.picking_orders ORDER BY id DESC LIMIT 1;"

# 4. 看 WMS 这边的 outbound_orders 表（应该已建好，status=allocated）
docker-compose exec mysql mysql -uroot -proot -e \
  "SELECT outbound_no, oms_order_no, status FROM wms_db.outbound_orders ORDER BY id DESC LIMIT 1;"

# 5. 拿到 outbound_no 后，触发自动完成出库
OUTBOUND_NO=...
curl -X POST http://localhost:8004/api/v1/outbound/$OUTBOUND_NO/auto-complete \
  -H 'Content-Type: application/json'

# 6. 验证 OMS 订单状态变成 shipped + 有 express_no
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/order/$ORDER

# 7. 验证 OMS 库存 locked -= qty（最终回到原来 100/0 - 已购数量）
curl http://localhost:8003/api/v1/inventory/SPU001-001

# 8. 验证 WMS 实物库存 quantity 减少
docker-compose exec mysql mysql -uroot -proot -e \
  "SELECT sku_code, location_code, quantity, locked_quantity FROM wms_db.inventory WHERE sku_code='SPU001-001';"
```

## 关键技术决策

| 决策 | 选择 | 理由 |
|---|---|---|
| OMS→WMS 调用 | Guzzle 同步 HTTP | 复用 iteration-4 模式；M2 改 Redis Stream |
| WMS 失败兜底 | OMS picking_orders.status=failed + last_error；订单仍 paid（不影响支付）| 用户体验：支付成功不应回滚；WMS 失败由运营修 |
| 库位分配 | findAvailable 简单取第一个有库存的 | MVP；M2 加 ABC + 路径优化 |
| PDA 流程 | auto-complete 一步完成（不分 pick→review→ship）| 本轮验证闭环；真实 PDA 留到 M2 |
| 实物库存流水 | 暂不写（直接改 inventory）| 简化；M2 补 inventory_log |
| OMS 状态机 | paid→picking→shipped 在 wmsShipped 一次推进 | 减少跨服务回调 |

## 升级与阻塞
（本轮无升级到用户决策的事项）

## 对账触发
本 runbook + 三个 Wave 全部代码就绪后，生成 [reconcile-report-iteration-6.md](reconcile-report-iteration-6.md)。运行时验证由用户跑通后再做 iteration-7 收尾。
