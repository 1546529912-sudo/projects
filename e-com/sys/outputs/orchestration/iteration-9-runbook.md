# iteration-9-runbook.md · Redis Stream 事件总线改造

## 【当前焦点】
把 OMS↔WMS 从同步 HTTP 改造成 Redis Stream 异步事件。
- **下行**：OMS 支付成功 → 发布 `oms.order.paid` → WMS 订阅 → 接拣货单
- **上行**：WMS 出库完成 → 发布 `wms.outbound.completed` → OMS 订阅 → 推进状态机 + 实物库存扣减

向后兼容：保留 OMS `/api/v1/order/{no}/wms-shipped` 与 WMS `/api/v1/picking-order` HTTP 端点（M2 删除）。

## 不在范围（M2+）
- `wms.picking.shortage` 短拣异常事件
- `pim.sku.changed` 事件流（PIM→OMS/WMS 同步 SKU 元数据）
- Redis Stream → Kafka 迁移
- 跨实例多 worker 协同（XPENDING 转移）

## 架构方案

```
[Producer]                  [Stream]                  [Consumer]
OMS markPaid    --XADD-->   oms.order.paid    <--XREADGROUP-- WMS consume:oms
                                                              → OmsOrderPaidHandler
                                                              → OutboundService::acceptPicking
                                                              → XACK

WMS autoComplete --XADD-->  wms.outbound.completed <--XREADGROUP-- OMS consume:wms
                                                              → WmsOutboundCompletedHandler
                                                              → OrderService::markShipped
                                                              → XACK

失败 N=3 次 → 死信表 dead_letter（同时 XACK 不再投递）
```

Stream 用 Redis DB 0（避开应用 cache 各自占的 DB 2/3），EventBus 独立连接。

Consumer group：
- WMS 用 `wms-oms-paid-group`，OMS 用 `oms-wms-outbound-group`
- 每个 worker `consumer name` = hostname + pid

## 微调说明（与早期设计对比）

| 项 | 早期方案 | 实际实施 | 原因 |
|---|---|---|---|
| Worker 进程 | docker-compose 加独立 `oms-worker` / `wms-worker` 容器 | 在 oms/wms 现有容器内用 supervisord 起 consumer | 复用现有容器、env、vendor；docker-compose 改动最小 |
| Command 名 | 统一 `event:consume` + handler 配置 | 分 `consume:wms`（OMS 容器）+ `consume:oms`（WMS 容器） | 一对一更直观、command 内嵌 stream 名无歧义 |
| 注册方式 | `app/console.php` | `composer.json extra.think.commands` | TP8 默认机制；不需额外配置文件 |
| 失败策略 | 一次失败即写死信 + XACK | 失败 3 次进死信（XPENDING 看 delivery_count） | 可恢复故障（短暂网络抖动）能自愈，重投零代价 |
| Handler 路径 | `app/event/` | `app/service/handler/` | 与现有 `app/service/` 命名一致 |

## Wave 划分（共 15 文件）

### Wave A · 共用基础（4 文件）
| 任务 | 文件 |
|---|---|
| 死信表 OMS | `oms-backend/database/migrations/20260526000001_create_dead_letter.php` |
| 死信表 WMS | `wms-backend/database/migrations/20260526000001_create_dead_letter.php` |
| EventBus OMS | `oms-backend/app/service/EventBus.php` |
| EventBus WMS | `wms-backend/app/service/EventBus.php` |

### Wave B · OMS 改造（5 文件）
| 任务 | 内容 |
|---|---|
| OMS-CHG-001 | `OrderService::markPaid` 改：删 `dispatchToWms`，改发布 `oms.order.paid`；picking_orders.status 初始 `pending` |
| OMS-HND-001 | `app/service/handler/WmsOutboundCompletedHandler.php`：消费 wms.outbound.completed → 调 markShipped |
| OMS-CMD-001 | `app/command/ConsumeWmsEvents.php`：`php think consume:wms` |
| OMS-CFG-001 | `composer.json` 加 `extra.think.commands` |
| OMS-ADM-001 | `Admin::deadLetter` + route `GET /api/v1/admin/dead-letter` |

### Wave C · WMS 改造（4 文件）
| 任务 | 内容 |
|---|---|
| WMS-CHG-001 | `OutboundService::autoComplete` 改：删 `callOmsShipped` + GuzzleHttp import，改发布 `wms.outbound.completed` |
| WMS-HND-001 | `app/service/handler/OmsOrderPaidHandler.php`：消费 oms.order.paid → 调 acceptPicking |
| WMS-CMD-001 | `app/command/ConsumeOmsEvents.php`：`php think consume:oms` |
| WMS-CFG-001 | `composer.json` 加 `extra.think.commands` |

### Wave D · 进程管理（4 文件）
| 任务 | 内容 |
|---|---|
| INF-001 | `Dockerfile.php`：supervisord.conf 拆主+ include；base.conf 含 php-fpm + nginx |
| INF-002 | `oms-backend/supervisor/consumer.conf`：`[program:consume-wms]` |
| INF-003 | `wms-backend/supervisor/consumer.conf`：`[program:consume-oms]` |
| INF-004 | `docker-compose.yml`：OMS/WMS 各 mount `consumer.conf:/etc/supervisor/conf.d/consumer.conf:ro` |

## 事件 Payload

### oms.order.paid
```json
{
  "order_no": "SO20260526...",
  "picking_no": "PK20260526...",
  "warehouse_code": "WH-DEFAULT",
  "items": [{"sku_code": "SPU001-001", "qty": 1}],
  "address": {"name":"...","phone":"...","province":"...","city":"...","district":"...","detail":"..."}
}
```

### wms.outbound.completed
```json
{
  "order_no": "SO20260526...",
  "picking_no": "PK20260526...",
  "express_no": "SF20260526...",
  "items": [{"sku_code": "SPU001-001", "qty": 1}]
}
```

## 消息格式（统一）
```
event_id  : uuid       (业务幂等键)
trace_id  : uuid       (跨服务链路追踪)
ts        : int        (发布时间戳)
payload   : JSON-string (业务负载)
```
Stream MAXLEN=10000。XGROUP CREATE 自动 MKSTREAM。

## 失败与重试
- handler 抛异常 → 不 ACK → 下次 XREADGROUP 重投
- XPENDING 看 delivery_count，≥3 进 dead_letter 表 + ACK
- 死信查询：`GET /api/v1/admin/dead-letter?stream=oms.order.paid`

## 幂等保证
- OmsOrderPaidHandler：先查 outbound_orders 是否已有 outbound_no=picking_no，命中即跳过
- WmsOutboundCompletedHandler：先查订单 status，已是 shipped/completed 即跳过
- 业务 Service 层（acceptPicking / markShipped）原有幂等键也起兜底作用

## 进程模型
```
[oms-backend container]
  supervisord
    ├─ php-fpm          (web)
    ├─ nginx            (反代)
    └─ consume:wms      (XREADGROUP wms.outbound.completed)

[wms-backend container]
  supervisord
    ├─ php-fpm
    ├─ nginx
    └─ consume:oms      (XREADGROUP oms.order.paid)
```
防内存泄漏：consumer 处理 1000 条后正常退出（exit 0），supervisord autorestart 拉回。

## 关键技术决策

| 决策 | 选择 | 理由 |
|---|---|---|
| Stream 客户端 | 原生 ext-redis（已装） | 不引入新依赖 |
| 消费阻塞 | XREADGROUP BLOCK 5000 + COUNT 10 | 5 秒阻塞，避免空轮询 |
| Stream DB | DB 0 | 各后端 cache 分别在 DB 2/3，避免污染 |
| Worker 进程模型 | supervisord 同容器 + autorestart | 复用容器/env/vendor，docker-compose 改动小 |
| 重试 | 失败 3 次后入死信 | 短暂故障可自愈；不阻塞 stream |
| 跨服务幂等 | handler 内查重 + Service 业务幂等键兜底 | 消息重投递安全 |
| 向后兼容 HTTP 端点 | 暂留 `/picking-order` 与 `/wms-shipped` | M2 删除 |

## 用户运行验证

```bash
cd apps/

# 1. 重新构建（Dockerfile.php 改了）
docker-compose build oms-backend wms-backend shop-backend pim-backend

# 2. 启动
docker-compose up -d

# 3. 新 migration
docker-compose exec oms-backend php think migrate:run
docker-compose exec wms-backend php think migrate:run

# 4. composer 重新发现 + 让 command 注册生效
docker-compose exec oms-backend composer dump-autoload -o
docker-compose exec wms-backend composer dump-autoload -o
docker-compose exec oms-backend php think service:discover
docker-compose exec wms-backend php think service:discover

# 5. 重启让 supervisord 拉起 consumer
docker-compose restart oms-backend wms-backend

# 6. 进程检查
docker-compose exec oms-backend supervisorctl status
docker-compose exec wms-backend supervisorctl status
# 期望：各 3 个 program 都 RUNNING

# 7. Stream 检查
docker-compose exec redis redis-cli -n 0 XINFO STREAM oms.order.paid
docker-compose exec redis redis-cli -n 0 XINFO STREAM wms.outbound.completed
# 期望：能看到 stream，可能 length=0

# 8. 端到端测试
bash apps/scripts/events-flow.sh

# 9. WMS 故障演练
docker-compose exec wms-backend supervisorctl stop consume-oms
# 下单 + mock 支付 → OMS 立即 paid，但 XLEN > 0
# 恢复 consumer → 自动追平积压
docker-compose exec wms-backend supervisorctl start consume-oms

# 10. 死信验证（毒消息）
docker-compose exec redis redis-cli -n 0 XADD oms.order.paid '*' \
  event_id bad-1 trace_id t1 ts $(date +%s) payload '{}'
sleep 15
curl -s "http://localhost:8003/api/v1/admin/dead-letter?stream=oms.order.paid" | python3 -m json.tool
# 期望：retry_count=3 的死信记录
```

## 升级与阻塞
（无）

## 对账触发
本 runbook + 4 Wave 代码 + events-flow.sh 完成后生成 [reconcile-report-iteration-9.md](reconcile-report-iteration-9.md)。
