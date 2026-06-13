# reconcile-report-iteration-12.md · OMS 订阅 wms.inventory.changed

## 【焦点】
入库 → OMS available 自动 +N 闭环最后一公里。复用 iter-9 EventBus 框架，新增独立 consumer + handler，零侵入主流程。

## 一、文件清单（4 文件）

| 类型 | 文件 |
|---|---|
| handler 新 | `oms-backend/app/service/handler/WmsInventoryChangedHandler.php` |
| command 新 | `oms-backend/app/command/ConsumeWmsInventory.php` |
| config 改 | `oms-backend/config/console.php`（+1 命令注册）|
| supervisor 改 | `oms-backend/supervisor/consumer.conf`（+1 program）|

代码量：~120 行 PHP。

## 二、设计要点

| 主题 | 选择 | 理由 |
|---|---|---|
| Stream / Group | `wms.inventory.changed` + `oms-wms-inventory-group` | 与 iter-9 outbound 流隔离；独立消费、独立 lag、独立死信 |
| Consumer 进程 | 独立 supervisord program | 一个挂了不影响另一个；日志独立 |
| 幂等键 | `(related_order=inboundNo, sku_code, change_type=inbound)` 三元组 | inventory_log.related_order limit 32，单独 inbound_no（16 字符）足够，避开 `INBOUND:no:sku` 字符串拼接 |
| 首次见 SKU | INSERT inventory_status 0 行后 +N | OMS 视角可能未见过新 SKU，兜底建行 |
| 失败兜底 | EventBus delivery≥3 → dead_letter 表 + ACK | 复用 iter-9 机制 |

## 三、运行时验证

| Task ID | 验证项 | 状态 |
|---|---|---|
| P12-RUN-001 | OMS 重启后 consume-wms + consume-wms-inventory 双 RUNNING | ✅ |
| P12-RUN-002 | WMS 一键入库 +N → OMS available +N + WMS quantity +N 一致 | ✅ |

证据：
- `docker-compose logs oms-backend | grep consume`：双 starting + 双 entered RUNNING
- 用户实测：WMS 入库后 OMS/库存四态 available 与 WMS/实物库存 quantity 数据一致

## 四、闭环图（更新）

```
小程序下单 → OMS lock → 支付 → markPaid + XADD oms.order.paid
                                   ↓
                              WMS consume:oms → 建出库单 → 一键完成
                                                              ↓
                                                    扣 WMS quantity
                                                    XADD wms.outbound.completed → OMS markShipped
                                                    OMS unlock + 订单 shipped

WMS 入库一键完成 → 加 WMS quantity → XADD wms.inventory.changed
                                              ↓
                                  OMS consume:wms-inventory → available +N ✨ iter-12 新增
```

## 五、与历史 iter 对账

| iter | 主题 | 流 | OMS handler |
|---|---|---|---|
| iter-9 | 支付 → WMS 拉单 | `oms.order.paid` | (WMS 侧) |
| iter-9 | 出库 → OMS 发货 | `wms.outbound.completed` | `WmsOutboundCompletedHandler` |
| **iter-12** | **入库 → OMS 上架** | **`wms.inventory.changed`** | **`WmsInventoryChangedHandler`** ✨ |

至此 OMS↔WMS 三大业务流（拉单/发货/入库）全部走 Redis Stream，无任何同步 HTTP 调用。

## 六、剩余非阻塞（M3+）

| 编号 | 事项 |
|---|---|
| Q12-01 | PIM products → WMS products 同步（pim.sku.changed） |
| Q12-02 | 实时盘点 / 调拨 / 移库 |
| Q12-03 | 真实支付 + SMS |
| Q12-04 | 性能压测（hey/wrk）|

## 七、对账时间
2026-05-28

## 八、本对账使用的 skill
- `karpathy-guidelines`（不引入第三方消息中间件 / 不引入独立 microservice 框架；复用 iter-9 EventBus）
