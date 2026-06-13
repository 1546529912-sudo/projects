# reconcile-report-iteration-6.md · 主控对账（Phase 2 P2 OMS→WMS 出库闭环）

## 【当前焦点】
Phase 2 P2 OMS→WMS 出库闭环 ✅ **代码全量交付 + 用户实测通过（2026-05-25）**。
完整订单生命周期跑通：`pending_pay → paid → picking → shipped → completed`。修了 1 项运行时坑（见 §九）。

## 对账原则
本轮**代码 + 运行时双对账**，与 [iteration-6-runbook](iteration-6-runbook.md) 范围一一对照。

---

## 一、文件交付清单（21 个新增/修改文件）

### Wave A · WMS（18 文件）

| 类型 | 文件 |
|---|---|
| migration | `database/migrations/20260525000001_create_warehouses.php` |
| migration | `database/migrations/20260525000002_create_locations.php` |
| migration | `database/migrations/20260525000003_create_inventory.php` |
| migration | `database/migrations/20260525000004_create_outbound_orders.php` |
| migration | `database/migrations/20260525000005_create_outbound_items.php` |
| migration | `database/migrations/20260525000006_create_picking_tasks.php` |
| seed | `database/seeds/SeedWarehouse.php`（1 仓 + 5 库位 + 5 SKU × 100 实物）|
| model | `app/model/Warehouse.php` |
| model | `app/model/Location.php` |
| model | `app/model/Inventory.php` |
| model | `app/model/OutboundOrder.php` |
| model | `app/model/OutboundItem.php` |
| model | `app/model/PickingTask.php` |
| service | `app/service/InventoryService.php`（findAvailable / lock / deduct / unlock）|
| service | `app/service/OutboundService.php`（acceptPicking / autoComplete / detail / listAll）|
| controller | `app/controller/Picking.php`（POST /picking-order）|
| controller | `app/controller/Outbound.php`（list / detail / autoComplete）|
| route | `route/app.php`（4 新接口）|

### Wave B · OMS 联动（3 文件）

| 类型 | 文件 |
|---|---|
| service | `app/service/OrderService.php`（markPaid 调 WMS + 新增 markShipped 方法 + dispatchToWms helper）|
| controller | `app/controller/Order.php`（新增 wmsShipped 方法）|
| route | `route/app.php`（新增 `POST /order/<orderNo>/wms-shipped`）|

---

## 二、状态机扩展

```
pending_pay ──pay──> paid ──(WMS 回传)──> picking ──> shipped ──confirm──> completed
                        │
                        └─ 同步下发 WMS（失败时 picking_orders.status=failed）
```

OMS markShipped 一次性走 `paid → picking → shipped`（避免增加额外回调），并：
- 写 express_no
- 调 InventoryService::outboundBatch 把 OMS locked 扣到 0

## 三、关键技术决策（按 runbook §"关键技术决策" 落地）

| 决策 | 实现位置 |
|---|---|
| Guzzle 同步 HTTP 跨服务 | OrderService::dispatchToWms / OutboundService::callOmsShipped |
| WMS 失败兜底 picking_orders.status='failed' + last_error | OrderService::dispatchToWms try/catch 内 update picking_orders |
| 库位分配 findAvailable（quantity-locked_quantity >= qty）| InventoryService::findAvailable |
| 一键 auto-complete 替代 PDA 分阶段 | OutboundController::autoComplete + Service 同名方法 |
| 实物库存暂不写流水 | 直接 update inventory（M2 补 inventory_log）|
| 跨服务幂等 | OMS→WMS：`oms-wms-{pickingNo}`；WMS→OMS：`wms-shipped-{omsOrderNo}` |

## 四、跨服务调用关系（实际落地）

```
POST /payment/callback/mock (shop)
  ↓
shop → OMS POST /api/v1/payment/callback
  ↓ OMS::OrderService::markPaid
     - sm.transit(paid)
     - createPickingOrder() 写 picking_orders
     - dispatchToWms() Guzzle POST WMS /api/v1/picking-order
        ↓ WMS::OutboundService::acceptPicking
           - InventoryService::findAvailable 找库位
           - INSERT outbound_orders / outbound_items / picking_tasks
           - inventory.locked_quantity += qty
        ← {outbound_no, status=allocated}
     - 失败 → picking_orders.status='failed' + last_error（OMS 订单仍 paid）

[curl 触发：]
POST /api/v1/outbound/{outbound_no}/auto-complete (WMS)
  ↓ WMS::OutboundService::autoComplete
     - picking_tasks.status=picked
     - outbound_items.picked_qty=qty
     - inventory.quantity -= qty, locked_quantity -= qty
     - outbound_orders.status='shipped' + express_no
     - callOmsShipped() Guzzle POST OMS /api/v1/order/{no}/wms-shipped
        ↓ OMS::Order::wmsShipped
           - OrderService::markShipped
              - sm.transit(paid→picking→shipped)
              - orders.express_no = SF...
              - InventoryService::outboundBatch (locked -= qty)
        ← {order: {status:shipped, ...}}
```

## 五、用户运行验证脚本

```bash
cd apps/

# 1. rebuild WMS
docker-compose up -d --build wms-backend

# 2. WMS migrate + seed
docker-compose exec wms-backend php think service:discover
docker-compose exec wms-backend php think migrate:run    # 应看到 6 行 migrated
docker-compose exec wms-backend php think seed:run       # SeedWarehouse 输出

# 3. 重启 OMS（route 加了新端点）
docker-compose restart oms-backend

# 4. 复用 iteration-5 的登录 token 流程
TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/sms/code \
  -H 'Content-Type: application/json' -d '{"phone":"13800138000"}' >/dev/null; \
  curl -s -X POST http://localhost:8001/api/v1/user/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"13800138000","code":"123456"}' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print((d.get('data') or {}).get('token',''))")

# 5. 加购 + 下单
curl -s -X POST http://localhost:8001/api/v1/cart/add \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"sku_code":"SPU002-001","qty":1}' && echo

ORDER=$(curl -s -X POST http://localhost:8001/api/v1/order/submit \
  -H "Authorization: Bearer $TOKEN" -H 'Idempotency-Key: o-wms-1' \
  -H 'Content-Type: application/json' -d '{}' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['data']['order']['order_no'])")
echo "ORDER=$ORDER"

# 6. mock 支付（这一步会触发 OMS 调 WMS）
curl -s -X POST http://localhost:8001/api/v1/payment/callback/mock \
  -H 'Content-Type: application/json' \
  -d "{\"order_no\":\"$ORDER\"}" && echo

# 7. 验证 OMS picking_orders 表
docker-compose exec mysql mysql -uroot -proot -e \
  "SELECT picking_no, order_no, status, last_error FROM oms_db.picking_orders ORDER BY id DESC LIMIT 1;"
# 期望 status=sent（如果是 failed，看 last_error）

# 8. 拿到 picking_no = outbound_no（跨系统同名）
PICKING_NO=$(docker-compose exec -T mysql mysql -uroot -proot -N -e \
  "SELECT picking_no FROM oms_db.picking_orders WHERE order_no='$ORDER' LIMIT 1;" | tr -d '\r')
echo "PICKING_NO=$PICKING_NO"

# 9. 验证 WMS outbound_orders 已建好
docker-compose exec mysql mysql -uroot -proot -e \
  "SELECT outbound_no, oms_order_no, status FROM wms_db.outbound_orders WHERE outbound_no='$PICKING_NO';"
# 期望 status=allocated

# 10. 验证 WMS inventory.locked_quantity 已增加
docker-compose exec mysql mysql -uroot -proot -e \
  "SELECT sku_code, location_code, quantity, locked_quantity FROM wms_db.inventory WHERE sku_code='SPU002-001';"
# 期望 locked_quantity=1

# 11. 触发 auto-complete（模拟 PDA 一键完成 + 回传 OMS）
curl -s -X POST http://localhost:8004/api/v1/outbound/$PICKING_NO/auto-complete \
  -H 'Content-Type: application/json' && echo
# 期望 status=shipped + express_no + oms_callback_ok=true

# 12. 验证 OMS 订单变 shipped + express_no
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/order/$ORDER && echo
# 期望 status=shipped, express_no=SF...

# 13. 验证 OMS 库存 locked 回 0
curl -s http://localhost:8003/api/v1/inventory/SPU002-001 && echo
# 期望 available=99 + locked=0

# 14. 验证 WMS 实物 quantity 减少
docker-compose exec mysql mysql -uroot -proot -e \
  "SELECT sku_code, location_code, quantity, locked_quantity FROM wms_db.inventory WHERE sku_code='SPU002-001';"
# 期望 quantity=99, locked_quantity=0

# 15. 用户确认收货
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: confirm-$ORDER" \
  "http://localhost:8001/api/v1/order/$ORDER/confirm" && echo
# 期望 status=completed
```

## 六、可能的运行时坑预判（参考 iteration-3/5 经验）

| 风险点 | 预防 |
|---|---|
| `inventory` 表主键 ID 列正常（不复用 sku_code 做 PK），不会触发 iteration-5 #1 | ✅ |
| 路由 `<outboundNo>` 已加 `[\w\-]+` pattern | ✅ |
| OMS Order::wmsShipped 读 Idempotency-Key 走 controller，目前没强制校验（callback 内部用），不会被 TP header 怪坑命中 | ✅ |
| Guzzle 跨容器 DNS：OMS → http://wms-backend / WMS → http://oms-backend，都是 compose 内 DNS | ✅ |
| dispatchToWms 失败时只更新本地 picking_orders，不抛——markPaid 仍 commit；调用方 shop 看到 status=paid 没问题 | ✅ |
| WMS autoComplete 是非幂等的（同一 outbound 第二次会因 status != allocated 报错），符合预期 | ✅ |
| 时区：autoComplete 写 picked_at / shipped_at 用 PHP date()（CST），DB 列是 datetime（无 TZ 转换），存的值与 created_at（DB CST 默认）不一致——但不影响功能 | ⚠️ M2 统一时区 |
| WMS Inventory unique key `(sku_code, location_code, batch_no, status)`：seed 时 SPU003-001 和 SPU003-002 都在 A-01-02-02，因为 sku_code 不同所以不冲突 | ✅ |
| TP8 中间件 fastcgi_param HTTP_AUTHORIZATION：WMS 容器需要 rebuild（已在 Wave A 第 1 步指明 `--build`）| ✅ |

## 七、剩余非阻塞事项（M2+）

| 编号 | 事项 | 处理 |
|---|---|---|
| Q6-01 | 真实 PDA 流程（pick→review→ship 分阶段）| M2 加 3 个 controller 端点替代 auto-complete |
| Q6-02 | inventory_log 实物库存流水 | M2 |
| Q6-03 | 短拣异常（picking.shortage Stream）| M2 |
| Q6-04 | OMS→WMS 改 Redis Stream 异步 | M2 |
| Q6-05 | WMS 用户/角色/PDA 鉴权 | M2 |
| Q6-06 | 库存对账定时任务（OMS available+locked vs WMS quantity）| M2 |
| Q6-07 | 入库流程 | M2 |

## 八、对账结论

✅ **代码全量交付 + 用户实测通过**：21 文件，2 Wave。完整订单生命周期跑通，三段订单分别测试：
- `SO202605251943325996` 测 paid → 手动 wms-shipped → shipped
- `SO202605251950107414` 测 auto-complete（暴露 Guzzle 缺依赖）
- `SO202605251953197964` 测 auto-complete → callback ok → user confirm → completed

## 九、本轮运行时坑（1 项，与 iteration-3/5 类似的"代码 ok 但环境 / 依赖未对齐"）

| # | 问题 | 根因 | 修复 |
|---|---|---|---|
| 1 | WMS autoComplete 返回 `oms_callback_ok: false`，且无错误信息 | (a) wms-backend composer.json 没声明 guzzlehttp/guzzle 依赖，OutboundService::callOmsShipped 抛 `Class not found`；(b) callOmsShipped 只返 bool，看不到真实异常 | 添加 `guzzlehttp/guzzle: ^7.0` 到 wms composer.json + `composer update guzzlehttp/guzzle`；callOmsShipped 改返 `['ok'=>bool, 'http_status'=>..., 'raw'=>..., 'exception'=>...]` 数组方便排障 |

## 十、用户实测证据

| Task ID | 验证项 | 实测结果 |
|---|---|---|
| P2-WMS-001 | WMS migrate 6 表 + seed | ✅ `1 仓 + 5 库位 + 5 SKU × 100 实物已写入 wms_db` |
| P2-WMS-002 | mock 支付 → OMS picking_orders.status=sent + WMS outbound_orders.status=allocated | ✅ PK202605251943407179: oms=sent / wms=allocated；WMS inventory.locked_quantity=1 |
| P2-WMS-003 | WMS auto-complete → 实物库存扣减 + OMS 订单 shipped + express_no | ✅ SO202605251953197964 通过 auto-complete → status=shipped, express_no=SF202605251953477914 |
| P2-WMS-004 | 用户确认收货 → status=completed | ✅ confirm 接口返回 status=completed，completed_at=19:54:38 |

完整时间线：created 19:53:19 → paid 19:53:36 (+17s) → shipped 19:53:47 (+11s) → completed 19:54:38 (+51s)。

## 十一、对账时间
2026-05-25

## 十二、本对账使用的 skill
- `karpathy-guidelines`（auto-complete 一步合并 pick/review/ship 而不引入 PDA 抽象；找库位用最简单的 `quantity - locked_quantity >= qty` 而非 ABC/路径优化；callOmsShipped 改返结构化错误而不是只 bool——便于排障）
