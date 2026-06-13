# iteration-28-runbook.md · OMS 增强四件套（A）

## 一、文件清单（共 ~16 文件，5 Wave）

### Wave 1 · 数据层（1 文件）
1. `apps/oms-backend/database/migrations/20260602000006_create_webhook_subscriptions.php` — webhook 订阅配置 + 投递日志合并

### Wave 2 · 订单完成 webhook 推送（4 文件）
2. `apps/oms-backend/app/service/WebhookService.php` — 订阅 CRUD + 投递（含签名 + 重试 + 死信兜底）
3. `apps/oms-backend/app/controller/Webhook.php` — admin 订阅管理
4. `apps/oms-backend/app/service/OrderService.php` 改 — `confirm` 完成后调 webhook fire
5. `apps/oms-backend/app/service/RefundService.php` 改 — `refund` 完成后调 webhook fire（refund.refunded 事件复用）

### Wave 3 · OMS Dashboard 加财务维度（2 文件改）
6. `apps/oms-backend/app/controller/Admin.php` 改 — `stats()` 加 4 个字段：`finance_metrics`（总营收/总退款/净）+ `finance_series`（日营收+日退款）+ `settlement_metrics`（settled/unsettled 比例）+ `coupon_usage_metrics`（多券订单占比）
7. `apps/shop-admin/src/pages/Dashboard.vue` 改 — 加 财务 KPI 卡（4 张）+ 1 个新 ECharts（日营收 vs 日退款 双轴）

### Wave 4 · Refund Model 类封装（3 文件，2 新 1 改）
8. `apps/oms-backend/app/model/Refund.php` 新 — ThinkPHP Model 类
9. `apps/oms-backend/app/model/RefundItem.php` 新 — 关联 Model
10. `apps/oms-backend/app/service/RefundService.php` 改 — 部分 `Db::name('refund_orders')` 替换为 `Refund::query()`（**渐进式**，不全替换避免风险，仅 list/detail/markRefunded 等）

### Wave 5 · 订单导出增强（3 文件）
11. `apps/oms-backend/app/controller/Admin.php` 改 — `exportOrders` 加 format 参数（csv / xlsx），加 stream 模式（>5000 自动分片返多个文件 zip）；加 `exportOrdersAsync` 触发后台任务
12. `apps/oms-backend/app/service/OrderExportService.php` 新 — 封装导出逻辑 + 异步队列
13. `apps/oms-backend/app/command/RunOrderExport.php` 新 — supervisord 跑（M3+，本 iter 仅占位）

### Wave 6 · Vue 集成（2 文件）
14. `apps/shop-admin/src/pages/oms/Webhooks.vue` 新 — 订阅管理 + 投递日志
15. `apps/shop-admin/src/apis/oms.ts` 改 + `router/index.ts` + `AdminLayout.vue` — 加 webhook 路由 + 菜单

### Wave 7 · 测试 + 文档（3 文件）
16. `outputs/orchestration/reconcile-report-iteration-28.md`
17. `outputs/testing/iteration-28-auto-test.md`
18. `outputs/testing/iteration-28-manual-test.md`

> 计件 18，真实文件层面 ~20。

## 二、表结构

### webhook_subscriptions（订阅 + 投递日志合并）
```sql
CREATE TABLE webhook_subscriptions (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  events JSON NOT NULL,                 -- ['order.completed', 'order.cancelled', 'refund.refunded']
  secret VARCHAR(64) DEFAULT NULL,       -- HMAC-SHA256 签名密钥
  enabled TINYINT(1) DEFAULT 1,
  retry_max INT DEFAULT 3,
  total_fired INT DEFAULT 0,             -- 累计触发次数
  total_success INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  last_fired_at DATETIME NULL,
  last_status INT DEFAULT NULL,          -- 200 / 5xx / 0(timeout)
  last_error VARCHAR(500) DEFAULT '',
  created_by VARCHAR(64),
  created_at DATETIME,
  updated_at DATETIME
);
```

## 三、关键设计决策

| 主题 | 决策 |
|---|---|
| webhook 同步 vs 异步 | **同步**（HTTP POST 5s timeout），失败立即重试 3 次 + 500ms 退避。规模大时再切异步队列（M3+）|
| webhook 签名 | HMAC-SHA256(payload, secret) 放 X-Webhook-Signature header |
| 事件复用 | 不新建 stream，复用 iter-26 的 3 个事件 + iter-26 oms.order.paid，订阅时勾选感兴趣事件 |
| 失败兜底 | retry_max 用完进 dead_letter（复用 OMS 已有死信表）|
| Dashboard 财务维度 | 复用 iter-26 settlement_orders 聚合，单 SQL GROUP BY type + date |
| Refund Model 渐进 | **不全替换**：iter-28 仅引入 Model 类 + 在 list/detail/markRefunded 三处试用，其他保持裸 Db::name（降风险） |
| 导出 format | csv 仍是默认（兼容老）；xlsx 需 PhpSpreadsheet — **不引入新依赖**，xlsx 留 M3+ |
| 异步导出 | 本 iter 仅落 Command 占位文件，不接 supervisord（运行时仍 sync） |
| RBAC | webhook super_admin 独占；Dashboard 财务字段 sales+super |

## 四、API 设计

### Webhook（`/api/v1/admin/webhook/*`，super_admin）
| 方法 | 路径 | 用途 |
|---|---|---|
| GET   | `/webhook/list`          | 列表（含统计）|
| POST  | `/webhook`               | 新增订阅 |
| PUT   | `/webhook/:id`           | 改 url / events / enabled |
| DELETE| `/webhook/:id`           | 删 |
| POST  | `/webhook/:id/test`      | 试发一个空 payload，确认 url 可达 |

### Dashboard 扩展
- `/admin/stats` 响应加 4 字段：`finance_metrics` / `finance_series` / `settlement_metrics` / `coupon_usage_metrics`

## 五、避坑

| 风险 | 规避 |
|---|---|
| webhook 同步阻塞 OrderService.confirm | timeout=5s + try/catch 不阻塞，失败再 retry 3 次 |
| 订阅 events 数组不一致 | UNIQUE 不强加；service 层 filter |
| HMAC 签名密钥泄漏 | admin 可以重置 secret（轮转）|
| Dashboard 大数据慢 | days 限 90 内 + GROUP BY date 用索引 |
| Refund Model 双写不一致 | 仅查询用 Model，写仍走原 Db::name 路径（双轨过渡）|
| Model 字段不一致 | TP Model 默认按表自动 | 不引入 schema |
| 导出 xlsx 依赖 | 本 iter 不引入 PhpSpreadsheet，xlsx 留 M3+|
| 异步导出未接 | RunOrderExport 占位仅 `class` 不注册 supervisord |

## 六、待用户运行验证（2 步）
1. **migration**：
   ```bash
   docker-compose exec oms-backend php think migrate:run
   ```
2. **重启 oms-backend**

## 七、剩余非阻塞（M3+）
- Q28-01：xlsx 多 sheet 导出（接 PhpSpreadsheet）
- Q28-02：异步导出真实接入 supervisord + 任务表
- Q28-03：webhook 异步队列（Redis Stream + retry queue）
- Q28-04：webhook 签名校验文档（用户接入指南）
- Q28-05：Refund Model 全替换（移除裸 Db 调用）
