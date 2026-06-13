# event-bus.md · Redis Stream 事件总线

> **状态**：iter-9 引入，iter-12 完成入库流闭环，iter-13 引入 PIM→WMS 主数据同步，iter-14 示范字段扩展模式（退货回库复用 wms.inventory.changed 加 refund_no），iter-15/16 未新增 stream（iter-16 仅新增非事件型 supervisord loop process `refund-close-overdue`）。
> **范围**：OMS ↔ WMS ↔ PIM 三模块异步通信。shop-backend 仍走同步 HTTP（读为主，无强一致需求）。

## 一、为什么不用 RabbitMQ / Kafka

| 维度 | Redis Stream | RabbitMQ | Kafka |
|---|---|---|---|
| 部署复杂度 | 极低（已有 redis）| 中 | 高 |
| 持久化 | 支持（MAXLEN 修剪）| 支持 | 支持 |
| Consumer Group | 支持（XGROUP）| 支持 | 支持 |
| ACK / Pending List | 支持（XACK / XPENDING）| 支持 | offset commit |
| 死信 | 业务层自实现 | 内置 DLX | 业务层自实现 |
| 运维心智 | 已熟悉 | 新增 | 新增 |
| 中型档位适配 | ✅ | 重 | 重 |

**结论**：MVP 阶段已有 Redis 7 容器，Stream 能力满足 OMS↔WMS 通信需求；引入 RabbitMQ/Kafka 仅徒增运维负担。如未来日订单 >100k 或事件类型 >20，再评估迁移。

## 二、流（Stream）总览

| Stream | 生产者 | 消费者 | 消费组 | 触发场景 |
|---|---|---|---|---|
| `oms.order.paid` | oms-backend | wms-backend | `wms-oms-order-group` | 用户支付成功 → WMS 自动建出库单 |
| `wms.outbound.completed` | wms-backend | oms-backend | `oms-wms-outbound-group` | WMS 一键完成出库 → OMS 订单 shipped + locked -N |
| `wms.inventory.changed` | wms-backend | oms-backend | `oms-wms-inventory-group` | WMS 入库一键完成 → OMS available +N |
| `pim.sku.changed` | pim-backend | wms-backend | `wms-pim-sku-group` | PIM SKU/SPU CRUD → WMS wms_products upsert/delete |

**关键设计**：每个 stream 一个独立 group，互不干扰；同一服务的多 consumer 可水平扩。

## 三、消息格式

XADD 写入的 fields：
```
event_id  uuid v4，由 EventBus 自动生成（业务幂等键）
trace_id  uuid v4，调用链追踪（可由生产者传入）
ts        unix timestamp 秒
payload   JSON 字符串（业务数据）
```

### 各 stream 的 payload schema

**`oms.order.paid`**
```json
{
  "order_no": "SO202605261234567890",
  "user_id": 1001,
  "items": [
    {"sku_code": "SPU001-001", "qty": 2}
  ],
  "warehouse_code": "WH-DEFAULT"
}
```

**`wms.outbound.completed`**
```json
{
  "order_no": "SO202605261234567890",
  "picking_no": "PK202605261234567890",
  "express_no": "SF202605261234567890",
  "items": [
    {"sku_code": "SPU001-001", "qty": 2}
  ]
}
```

**`wms.inventory.changed`**（iter-12 新增，iter-14 加可选 refund_no 字段）
```json
{
  "inbound_no": "IB20260528123456",
  "warehouse_code": "WH-DEFAULT",
  "items": [
    {"sku_code": "SPU001-001", "delta": 100}
  ],
  "refund_no": "RF20260528..."    // 可选；source_type=return 时填入
}
```

OMS handler 分叉：
- 无 `refund_no` → 普通入库，available += delta（iter-12 原路径）
- 有 `refund_no` → 退货回库，调 `RefundService::markReceivedBack` → reserved -N + available +N + 退款单状态置 received_back（iter-14）

**`pim.sku.changed`**（iter-13 新增）
```json
{
  "action": "upsert",         // 或 "delete"
  "sku_code": "SPU001-001",
  "spu_code": "SPU001",
  "spu_name": "经典款 T 恤",
  "sku_name": "红 / L",
  "main_image": "/uploads/.../xxx.jpg",
  "price": 9900,
  "is_active": true            // SPU.status=published AND SKU.status=enabled
}
```
- `action=delete` 时仅 sku_code 字段有意义
- 全量快照语义（非增量）：每次事件包含完整 SKU 状态，handler 直接 upsert / delete

## 四、EventBus 服务实现

每个服务（OMS / WMS）都有独立的 `app/service/EventBus.php`，封装 4 个能力：

### 4.1 publish(stream, payload, traceId='') → eventId
```php
XADD <stream> MAXLEN ~10000 * event_id <uuid> trace_id <uuid> ts <epoch> payload <json>
```
- `MAXLEN ~10000`：~ 是近似裁剪，避免每次 XADD 触发整段 trim
- 返回 stream 内部 ID（如 `1716889234567-0`），不暴露给业务层

### 4.2 consume(stream, group, consumer, handler)
阻塞循环：
```php
while (true) {
    XREADGROUP GROUP <group> <consumer> COUNT 10 BLOCK 5000 STREAMS <stream> >
    foreach (msg) {
        try { handler(payload, eventId, traceId); XACK; }
        catch { 看 XPENDING delivery 次数：< 3 不 ACK 重投，≥ 3 入死信 + ACK }
    }
}
```

### 4.3 ensureGroup(stream, group)
```php
XGROUP CREATE <stream> <group> 0 MKSTREAM
```
- `MKSTREAM`：流不存在时自动建（开发环境友好）
- `BUSYGROUP` 异常吞掉（已存在视为成功）

### 4.4 dead_letter 表
```sql
CREATE TABLE dead_letter (
  id BIGINT PK,
  stream VARCHAR(64),
  event_id VARCHAR(64),
  payload TEXT,
  error VARCHAR(500),
  retry_count INT,
  created_at DATETIME
)
```
- 每个服务（OMS / WMS）各有一张
- delivery ≥ 3 时入表 + ACK 终止重投
- iter-9 提供 `GET /admin/dead-letter` 列表查询

## 五、Consumer 进程管理

### supervisord 拉起
docker-compose 把 `{service}/supervisor/consumer.conf` mount 到 `/etc/supervisor/conf.d/consumer.conf`：

```ini
[program:consume-wms]
command=php /var/www/html/think consume:wms
autorestart=true
startsecs=3
startretries=10
stopsignal=TERM
stopwaitsecs=10
```

### 启动顺序
Dockerfile 主 supervisord 配置 `[include] files=/etc/supervisor/conf.d/*.conf`，业务容器（shop/pim）只起 php-fpm + nginx；OMS/WMS 容器额外 mount consumer.conf，自动多拉 consumer 进程。

### 每 1000 消息正常退出
```php
if ($processed >= 1000) exit(0);  // supervisord autorestart 拉回
```
- 防止 PHP 长时间运行的内存泄漏
- 配合 autorestart 实现"软重启"

### 当前进程列表
| 服务 | 进程 | stream / 用途 |
|---|---|---|
| OMS | consume-wms | wms.outbound.completed |
| OMS | consume-wms-inventory | wms.inventory.changed（iter-12，含 iter-14 refund_no 分叉）|
| OMS | refund-close-overdue | 非事件 — supervisord loop sleep(3600) 扫超时退款（iter-16）|
| WMS | consume-oms | oms.order.paid |
| WMS | consume-pim | pim.sku.changed（iter-13）|

**注意**：`refund-close-overdue` 不是 Redis Stream consumer，是借用 supervisord 进程管理跑的定时任务（每小时扫一次 OMS DB），同 Dockerfile 主 `[program]` 集中管理。当 PHP 长跑 240 次后正常退出由 supervisord 重拉防内存泄漏。

## 六、幂等性

### 6.1 EventBus 层
- `XACK` 在 handler 成功后才发，失败的不 ACK → 下次 XREADGROUP 自动重投
- 重投次数靠 `XPENDING <stream> <group> <id> <id> 1` 取 delivery count

### 6.2 业务 handler 层
每个 handler 自检"我是否处理过这个事件"，常见两种方式：

**a) 业务状态自然幂等**（如 OMS WmsOutboundCompletedHandler）
```php
if (in_array($order['status'], ['shipped', 'completed'])) return;
```
- 订单已是 shipped/completed，跳过即可

**b) 三元组去重**（如 OMS WmsInventoryChangedHandler，iter-12）
```php
// (inventory_log.related_order=inbound_no, sku_code, change_type=inbound) 三元组
$dup = Db::name('inventory_log')
    ->where('related_order', $inboundNo)
    ->where('sku_code', $sku)
    ->where('change_type', 'inbound')
    ->find();
if ($dup) continue;
```
- 适合"加法操作"（available +N），自然状态无法判断是否处理过

**c) UPSERT 天然幂等**（如 WMS PimSkuChangedHandler，iter-13）
```php
if ($exist) update; else insert;
```
- 适合"全量快照"事件：重复处理结果一致，无需额外去重键
- 处理 `pim:replay-skus` 回填时尤为关键（同一 SKU 可能被推 N 次）

**d) 状态机早期返回**（如 OMS RefundService::markReceivedBack，iter-14）
```php
if (in_array($refund['status'], ['received_back', 'refunded'])) return;
$this->checkTransit($refund, 'received_back');
```
- 适合"状态机驱动"业务：终态判断 + 转移合法性检查双保险
- 处理重复事件投递时跳过即可，无需写日志去重表

## 七、端到端时序

```
[小程序] → [shop-backend] → [oms-backend]
                                  ↓ markPaid
                                  ↓ XADD oms.order.paid
                                  ↓
[wms-backend] consume:oms → 建出库单 picking
                                  ↓ 一键完成
                                  ↓ 扣 WMS quantity
                                  ↓ XADD wms.outbound.completed
                                  ↓
[oms-backend] consume:wms → markShipped + locked -N + 订单 shipped


[运营 - WMS/入库] → [wms-backend] autoComplete
                                  ↓ 加 WMS quantity
                                  ↓ XADD wms.inventory.changed
                                  ↓
[oms-backend] consume:wms-inventory → available +N (iter-12)


[运营 - PIM/商品] → [pim-backend] SKU/SPU CRUD
                                  ↓ publish in controller (try/catch, non-blocking)
                                  ↓ XADD pim.sku.changed
                                  ↓
[wms-backend] consume:pim → wms_products UPSERT / DELETE (iter-13)


[小程序] → 申请退货退款 → [oms-backend] RefundService::approve → reserved +N
[运营 - WMS/入库] → 建 return inbound + refund_no → 一键完成
                                  ↓ XADD wms.inventory.changed { ..., refund_no }
                                  ↓
[oms-backend] consume:wms-inventory → 见 refund_no → RefundService::markReceivedBack
                                                  → reserved -N + available +N
                                                  → refund.status = received_back (iter-14)
[运营 - OMS/退款审批] → 确认退款 → refund.status = refunded
```

主流程零同步跨服务调用，仅查询走 HTTP。

## 八、可观测性

| 维度 | 当前实现 | 后续可扩展 |
|---|---|---|
| 进程状态 | supervisord status | + Prometheus exporter |
| 消息追踪 | trace_id 贯穿 + handler 日志 stdout | + 集中日志（如 Loki）|
| Stream 长度 | `XLEN <stream>` 命令 | + 监控告警（阈值 >5000）|
| Pending 列表 | `XPENDING <stream> <group>` | + Pending 持续时长告警 |
| 死信 | `dead_letter` 表 + Admin 列表接口 | + 自动重投 / 通知 |

## 九、运维 SOP

### 重启 consumer
```bash
docker-compose restart oms-backend  # 触发 supervisord 重拉所有 consumer
```

### 看 consumer 状态
```bash
docker-compose logs --tail 50 oms-backend | grep -i consume
# 期望：[consume:wms] starting + [consume:wms-inventory] starting + entered RUNNING
```

### 查 stream 积压
```bash
docker-compose exec redis redis-cli XLEN wms.outbound.completed
docker-compose exec redis redis-cli XPENDING wms.outbound.completed oms-wms-outbound-group
```

### 看死信
```sql
SELECT id, stream, event_id, error, retry_count, created_at
FROM dead_letter ORDER BY id DESC LIMIT 20;
```
或浏览器：`GET /admin/dead-letter`

### 演练故障
1. 停 consumer：`docker-compose exec oms-backend supervisorctl stop consume-wms`
2. 触发事件：浏览器跑出库一键完成 N 次
3. 看 XLEN 累积
4. 拉起 consumer：`supervisorctl start consume-wms`
5. 看 PEL 自动追平

### 回填主数据（仅 iter-13 pim.sku.changed）
```bash
docker-compose exec pim-backend php think pim:replay-skus
# 把当前 PIM 所有 SKU 推一遍。WMS handler UPSERT 语义，重复跑无副作用。
# 首次部署 + 灾难恢复（wms_products 损坏需重建）时用。
```

## 十、设计决策：加新 stream vs 加字段

iter-14 退货回库的设计选择曾考虑两种方案：

| 方案 | 优点 | 缺点 |
|---|---|---|
| **A. 新增 stream `wms.refund.received_back`** | 语义边界清晰；OMS 可独立扩展该事件 handler | 多 1 个 stream / 1 个 consumer / 1 个 group / 1 个进程；运维成本+ |
| **B. 复用 `wms.inventory.changed` 加可选 refund_no 字段** ✅ | 无新流；OMS handler 一处分叉 | payload schema 多一个可选字段；schema 演进需文档化 |

最终选 B 的判据：
- 触发动作完全一致（WMS 入库 → OMS 库存变化），只是 OMS 端动作分叉
- 不存在"只关心 refund 不关心 inventory"的消费者
- 字段扩展不破坏旧消费者（schema 向后兼容）

**通用判据**：当事件含义未变、只是触发场景多了一个，优先字段扩展。当事件语义变化或新增了独立消费方时，加新 stream。

## 十一、不引入的能力（M3+ 可评估）

| 能力 | 原因 |
|---|---|
| 优先级队列 | 当前事件量低，FIFO 足够 |
| 延迟队列 | 用 Stream `XADD` MAXLEN + 业务字段实现可行，但 MVP 不需要 |
| Exactly-once 语义 | 业务层幂等已覆盖，引入 EOS 性价比低 |
| 多 region 复制 | 单 region 部署，无跨地域需求 |
| 跨服务追踪面板（如 Jaeger）| trace_id 已记录，可手工 grep；自动化成本 vs MVP 收益不匹配 |

## 十二、归档时间
2026-05-28（iter-16 收口后）
