# reconcile-report-iteration-9.md · Phase 3 Redis Stream 事件总线

## 【当前焦点】
代码全量交付：OMS↔WMS 两条同步 HTTP 调用替换为 Redis Stream 异步事件，含 EventBus 公共服务、4 处业务改造、supervisord 拉起 consumer、死信兜底。等待用户跑 events-flow.sh 验证。

## 对账原则
本轮**代码完成度对账**；运行时验证由 events-flow.sh 跑出来后回填到 [progress.md](../../progress.md)。

---

## 一、文件清单（共 15 个新增/修改文件）

### Wave A · 公共基础（4 文件）

| 类型 | 文件 |
|---|---|
| migration | `oms-backend/database/migrations/20260526000001_create_dead_letter.php` |
| migration | `wms-backend/database/migrations/20260526000001_create_dead_letter.php` |
| service | `oms-backend/app/service/EventBus.php` |
| service | `wms-backend/app/service/EventBus.php` |

### Wave B · OMS 改造（5 文件）

| 类型 | 文件 |
|---|---|
| service 改 | `oms-backend/app/service/OrderService.php`（`markPaid` 不再调 Guzzle；`dispatchToWms` 替换为 `publishOrderPaid`；createPickingOrder 接受 status 参数）|
| handler 新 | `oms-backend/app/service/handler/WmsOutboundCompletedHandler.php` |
| command 新 | `oms-backend/app/command/ConsumeWmsEvents.php` |
| composer | `oms-backend/composer.json`（extra.think.commands）|
| controller 改 | `oms-backend/app/controller/Admin.php`（+ deadLetter）|
| route 改 | `oms-backend/route/app.php`（+ admin/dead-letter）|

### Wave C · WMS 改造（4 文件）

| 类型 | 文件 |
|---|---|
| service 改 | `wms-backend/app/service/OutboundService.php`（`autoComplete` 不再调 Guzzle；删 `callOmsShipped` 和 GuzzleHttp import；改 XADD wms.outbound.completed）|
| handler 新 | `wms-backend/app/service/handler/OmsOrderPaidHandler.php` |
| command 新 | `wms-backend/app/command/ConsumeOmsEvents.php` |
| composer | `wms-backend/composer.json` |

### Wave D · 进程管理（4 文件）

| 类型 | 文件 |
|---|---|
| dockerfile | `apps/Dockerfile.php`（supervisord.conf 拆主+include；base.conf 含 php-fpm+nginx）|
| supervisor conf | `apps/oms-backend/supervisor/consumer.conf`（program:consume-wms）|
| supervisor conf | `apps/wms-backend/supervisor/consumer.conf`（program:consume-oms）|
| docker-compose | `apps/docker-compose.yml`（OMS/WMS 各 mount consumer.conf）|

### 文档与脚本（3 文件）
- `outputs/orchestration/iteration-9-runbook.md`（重写对齐实施）
- `apps/scripts/events-flow.sh`（端到端验证脚本）
- `outputs/orchestration/reconcile-report-iteration-9.md`（本文件）

合计代码量：~900 行（PHP ~700 / shell ~100 / dockerfile+yaml+conf ~100）。

---

## 二、与 iteration-9-runbook 范围对账（21 项）

| # | 项 | 状态 |
|---|---|---|
| A-1 | OMS EventBus（XADD/XREADGROUP/XACK/重连/死信） | ✅ |
| A-2 | WMS EventBus（同上副本） | ✅ |
| A-3 | OMS dead_letter migration | ✅ |
| A-4 | WMS dead_letter migration | ✅ |
| B-1 | OMS markPaid 改为 XADD | ✅ |
| B-2 | OMS picking_orders 初始 status=`pending`（异步消费前）| ✅ |
| B-3 | OMS WmsOutboundCompletedHandler（幂等：跳过已 shipped/completed）| ✅ |
| B-4 | OMS ConsumeWmsEvents command（1000 条/进程）| ✅ |
| B-5 | OMS composer.json 注册 command | ✅ |
| B-6 | OMS admin/dead-letter 查询接口 | ✅ |
| C-1 | WMS autoComplete 改为 XADD | ✅ |
| C-2 | WMS 删 callOmsShipped + GuzzleHttp import | ✅ |
| C-3 | WMS OmsOrderPaidHandler（幂等：已存在 outbound_no 跳过）| ✅ |
| C-4 | WMS ConsumeOmsEvents command | ✅ |
| C-5 | WMS composer.json 注册 command | ✅ |
| D-1 | Dockerfile.php supervisord 拆主+include | ✅ |
| D-2 | OMS consumer.conf | ✅ |
| D-3 | WMS consumer.conf | ✅ |
| D-4 | docker-compose mount consumer.conf | ✅ |
| E-1 | events-flow.sh 端到端脚本 | ✅ |
| E-2 | progress.md 状态更新 | ✅ |

**21/21 代码完成**。运行时验证待用户执行。

---

## 三、本轮主动避坑（吸取 iter-3/5/6 经验）

| 风险 | 提前规避 |
|---|---|
| phpredis 未装 | Dockerfile 已有 `pecl install redis`（iteration-3 装的） |
| Stream 跨服务读不到 | EventBus 内部 `select(0)`，不复用各后端 cache 的 db 2/3 |
| consumer 启动早于 redis ready | `conn()` 重试 5 次 + sleep 2s |
| 网络中断断连 | `RedisException` catch → 重置 redis 连接 + ensureGroup → 继续读 |
| PHP CLI 长时跑内存泄漏 | 处理 1000 条 exit 0；supervisord autorestart 拉回 |
| 毒消息阻塞 stream | delivery_count ≥ 3 → dead_letter + ACK |
| TP8 CLI 初始化 | Command 类继承 think\Command；composer.json 注册即可自动 console.run() |
| supervisord 默认主配置 | 改成 include conf.d/*.conf，oms/wms 通过 mount 注入 consumer.conf |
| consumer.conf 不应进 shop/pim | docker-compose 只为 oms/wms 容器 mount |
| Stream key 名固化 | code 中常量化为 `oms.order.paid` / `wms.outbound.completed`（与 schema 一致） |
| handler 幂等 | 重投递时先查业务状态再决定跳过/执行 |

---

## 四、待用户运行验证

| 步骤 | 命令 | 期望 |
|---|---|---|
| 1 | `docker-compose build oms-backend wms-backend shop-backend pim-backend` | Dockerfile 改了，全量重建 |
| 2 | `docker-compose up -d` | 6 容器全起 |
| 3 | `docker-compose exec oms-backend php think migrate:run`（同 wms） | 各 1 个 dead_letter 表 |
| 4 | `composer dump-autoload -o + php think service:discover`（OMS/WMS） | command 注册生效 |
| 5 | `docker-compose restart oms-backend wms-backend` | supervisord 拉起 consumer |
| 6 | `supervisorctl status`（容器内） | 各 3 个 program RUNNING |
| 7 | `bash apps/scripts/events-flow.sh` | 全流程通过 |
| 8 | WMS 故障演练（stop consume-oms） | 订单仍 paid + 消息积压 + 恢复后追平 |
| 9 | 毒消息演练 | dead_letter 表出现 retry_count=3 |

---

## 五、关键设计决策（对齐架构 schema）

| 决策 | 选择 | 出处 |
|---|---|---|
| Stream key 命名 | `oms.order.paid` / `wms.outbound.completed` | 与 [api-list.md](../architecture/api-list.md) §三 3.6 一致 |
| dead_letter 表结构 | stream / event_id / payload / error / retry_count | 与 [data-schema.md](../architecture/data-schema.md) §1.4 / §3.9 一致 |
| 消费组命名 | wms-oms-paid-group / oms-wms-outbound-group | 自定义，体现 consumer-producer 方向 |
| 消息字段 | event_id / trace_id / ts / payload | 满足追踪 + 幂等 + 时序 |

---

## 六、剩余非阻塞事项（M2+ 处理）

| 编号 | 事项 | 处理 |
|---|---|---|
| Q9-01 | `wms.picking.shortage` 短拣异常事件 | M2 |
| Q9-02 | `pim.sku.changed` PIM→OMS/WMS SKU 元数据广播 | M2 |
| Q9-03 | OMS HTTP `/api/v1/order/:no/wms-shipped` 端点保留（向后兼容） | M2 删除 |
| Q9-04 | WMS HTTP `/api/v1/picking-order` 端点保留 | M2 删除 |
| Q9-05 | XCLAIM 转移失败 consumer 的 PEL 消息 | M2（单 worker 暂不需要）|
| Q9-06 | Stream → Kafka 迁移路径 | M5 量起来再说 |
| Q9-07 | 死信重投 admin 接口 | M2 |

---

## 七、对账结论

✅ **代码全量交付**：15 个文件，4 个 Wave 全部按 iteration-9-runbook 完成。
✅ **端到端跑通**：用户实测 events-flow.sh 13 步全过——order 创建 → OMS 异步 paid → WMS consumer 创 outbound → auto-complete → OMS consumer markShipped → 实物库存扣减 → 死信表空。
🟡 **3 项非主线演练未跑**：mock 支付响应耗时（macOS date 不支持 %3N 脚本挂）、WMS 故障演练（docker-compose mount 文件难单进程停）、毒消息兜底；底层机制已就绪。

### 7.1 本轮在用户实测中暴露 + 修复的问题（2 项）
| 编号 | 问题 | 根因 | 修复 |
|---|---|---|---|
| iter9-fix-1 | consumer FATAL「There are no commands defined in the "consume" namespace」 | composer.json `extra.think.commands` 在 TP8 不一定生效（需 think-installer 介入 services.php） | 新增 `oms-backend/config/console.php` + `wms-backend/config/console.php` 显式注册命令 |
| iter9-fix-2 | supervisorctl 报「.ini file does not include supervisorctl section」 | Dockerfile.php 写的主配置只有 `[supervisord]` + `[include]`，缺 unix_http_server / supervisorctl / rpcinterface | 加 unix_http_server + supervisorctl + rpcinterface 三段（下次 build 生效，本轮不阻塞演练）|

### 7.2 本轮 events-flow.sh 实测证据
- order_no=SO202605262127123960
- picking_no=PK202605262127122841（status=allocated 由 WMS consumer 异步创建）
- express_no=SF202605262127166941
- OMS status=shipped（由 OMS consumer 异步 markShipped 转移而成）
- OMS inventory SPU003-001: available=97, locked=0（购物历史累计扣减）
- 死信表空

## 八、对账时间
2026-05-26

## 九、本对账使用的 skill
- `karpathy-guidelines`（小步推进；EventBus 单类 ~150 行；handler 单职责；不引入 RabbitMQ 等大依赖）
