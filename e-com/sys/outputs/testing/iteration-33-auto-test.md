# iteration-33-auto-test.md · OMS Webhook 异步化 + 接入文档自动测试

> 主控跑 curl，手动测试见 [iteration-33-manual-test.md](iteration-33-manual-test.md)。

## 前置
- docker compose 4 后端 Up；`docker restart ecom-oms-backend` 加载新 supervisord program（`consume:webhook` 进程已起）
- **无新 migration**（复用 iter-28 webhook_subscriptions + iter-9 dead_letter + iter-9 EventBus）
- 端口：OMS=8003

## 范围
- **Q28-03** Webhook 异步化：WebhookService 拆 `fireAsync(XADD)` + `fireSync(原同步路径)`；OrderService/RefundService 3 处调用改用 fireAsync；新 `consume:webhook` supervisord consumer 拉一条 → 遍历订阅 → 用同步 `deliverWithRetry` 真正推送；失败仍走 iter-28 dead_letter
- **Q28-04** Webhook 接入指南文档 `docs/webhook-接入指南.md`（payload schema + 头部 + HMAC 签名 + PHP/Node/Python 验签示例 + 重试 + 幂等 + 故障排查）

## 用例（共 7 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | `GET /admin/webhook/list` | 返回 iter-28 留下的订阅 | iter-28 sub#1 total_fired=4 + secret 全 | ✅ |
| T2 | `POST /admin/webhook` 建测试订阅指向 httpbin | code=0 + secret 自动生成 | sub#3 创建成功 | ✅ |
| T3 | `XLEN oms.webhook.outbound` 初始 | 队列状态可观察 | 1（之前残留） | ✅ |
| T4 | docker exec php -r 调 `fireAsync('order.completed', ...)` | **入队耗时 ≤ 5ms**（关键 — 异步化核心目标） | **1.08 ms**（vs iter-28 同步最坏 15s+，提升 ~14000x） | ✅ |
| T5 | XLEN +1（在 consumer ACK 前）→ 等 3s → 两个匹配订阅 total_fired 各 +1 | consumer 自动消费且 httpbin 200 OK | sub#3 fired=1 success=1 last=10:29:21；sub#1 fired=5 success=5 last=10:29:20 | ✅ |
| T6 | 改 sub#3 URL = http://127.0.0.1:1（不存在）retry_max=2，再 fireAsync | retry 2 次后失败 → 入 dead_letter + sub.total_failed +1 + last_error 记 cURL 7 | dead_letter 1→2 + sub#3 failed=1 last_status=0 err="cURL error 7: Failed to connect..." | ✅ |
| T7 | Redis XINFO GROUPS 查 consumer group | name=webhook-consumer + consumers=1 + pending=0（消费正常）+ lag=0 | 全对 | ✅ |

## 异步降级安全网
- WebhookService.fireAsync 内 try/catch 包住 EventBus.publish。**Redis 宕机时降级直接 fireSync** → 保证业务不丢消息（即使代价是重新阻塞 5s）
- 用户业务接口（OrderService.confirm/cancel + RefundService.refund）只要进了 fireAsync 调用，最坏情况是退化为 iter-28 同步路径，绝不丢事件

## 结论
**7/7 ✅** — Webhook 异步链路全过。**核心指标**：业务请求阻塞 15s+ → **1ms**。

## 关键产物
**新增 PHP（1）**
- `apps/oms-backend/app/command/ConsumeWebhook.php`（订阅 oms.webhook.outbound + 遍历订阅 + 调 deliverWithRetry）

**编辑 PHP（6）**
- `apps/oms-backend/app/service/WebhookService.php`（+ fireAsync XADD + fireSync 保留 + deliverWithRetry 改 public + STREAM/CONSUMER_GROUP 常量）
- `apps/oms-backend/app/service/OrderService.php`（cancel + confirm 2 处 fire → fireAsync）
- `apps/oms-backend/app/service/RefundService.php`（refund 1 处 fire → fireAsync）
- `apps/oms-backend/config/console.php`（+ consume:webhook 注册）
- `apps/oms-backend/supervisor/consumer.conf`（+ program:consume-webhook）

**新增文档（1）**
- `docs/webhook-接入指南.md`（含 PHP/Node.js/Python 三语言验签示例 + 重试策略 + 幂等 + 故障排查 10 节）

## 经验记录
1. **异步化的关键收益**：业务路径耗时从 5s × 3 retry = 最差 15s+，降到 ~1ms（仅 XADD）。**对用户感知影响巨大** — 订单确认不会因为对外 webhook 失败而卡顿
2. **降级路径必须留**：fireAsync 内 try/catch EventBus.publish，Redis 宕 → 自动 fireSync 同步推。**不要让消息丢失风险与 Redis 可用性强绑定**
3. **EventBus 复用**：iter-9 写好的 publish/consume 已经有 dead_letter + 3 次 retry + 自动重连，这次直接复用，0 行新基础设施代码。**经验：基础设施抽象到位后，新事件流类型只是配 stream/group 名**
4. **WebhookService.fire 软弃用而非删除**：保留 fire() 默认路由到 fireAsync，老代码不破。**经验：渐进迁移比一刀切替换稳，老调用方编译通过同时获得新行为**
5. **接入文档三语言验签示例**：单语言示例不够。生产中外部对接方可能用 PHP/Node/Python/Go，至少给 3 种。**最常被坑的点：用 raw body 算签名，不能反序列化后再算** — 文档要标红
6. **OMS dead_letter 字段已踩过坑（iter-28 fix-1：retry_count 不是 delivery_count）**，本轮复用 deliverWithRetry 直接拿到正确字段，0 额外踩坑
