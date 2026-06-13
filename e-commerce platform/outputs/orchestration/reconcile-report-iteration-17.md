# Reconcile Report · Iteration 17（Webhook 队列化 + 重试）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：iter-11 留的尾巴 —— Webhook 同步调用改为异步 + 失败自动重试 3 次（10s/30s/60s 指数退避）
- 结论：DispatchWebhookJob（ShouldQueue + tries=3 + backoff[]）；StockAlertService.trigger 改 dispatch 替代同步 dispatch；`webhook_attempts` 列追踪尝试次数
- 测试：PHPUnit **143/143**（+6）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 同步包 try/catch vs Job | **Job** | Laravel queue 原生 retry + backoff + failed hooks，比手撸 try/catch 强 |
| tries 数 | **3 次** | 经验值；网络抖动 1-2 次能恢复，3 次还失败基本是对端挂了 |
| backoff | **[10, 30, 60]** | 指数退避，对端有时间恢复；总等待 100s 内 |
| 失败时如何通知 queue 重试 | **`throw new RuntimeException`** | Laravel queue 看到异常就走 retry 链；`failed()` 在 tries 用尽后兜底 |
| sync queue vs async | **默认 sync，prod 可换 redis** | dev/test 用 sync 一次跑完，无需启 worker；生产配 `QUEUE_CONNECTION=redis` 切换零代码 |
| attempts 计数来源 | **`$this->attempts()`** | 来自 Queue\Job 元数据；脱离 queue 调用时（手动 / 测试）默认返 1 |

## 后端产物

| 文件 | 说明 |
|------|------|
| `database/migrations/2026_05_23_000017_add_webhook_attempts_to_stock_alerts.php` | + `webhook_attempts tinyint default 0` |
| `app/Models/StockAlert.php` | fillable + `webhook_attempts` |
| `app/Jobs/DispatchWebhookJob.php` | ShouldQueue + tries=3 + backoff=[10,30,60] + handle/failed 双路径 + 更新 alert |
| `app/Services/StockAlertService.php` | trigger 改为 `DispatchWebhookJob::dispatch(...)`，不再阻塞主流程 |
| `app/Http/Controllers/Api/AdminStockAlertController.php` | toJson 加 `webhook_attempts` |
| `tests/Feature/WebhookJobTest.php` | 6 测试：dispatch 验证 / 成功 / 失败抛异常 / failed() 兜底 / mock_only / tries+backoff 配置 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/api/admin-stock-alert.ts` | StockAlert 类型加 `webhook_attempts` |
| `src/views/admin/StockAlertsPage.vue` | webhook 徽章 attempts>1 时显示 ×N；title 含响应+尝试次数 |

## 端到端实测

```
$ php artisan tinker --execute='...'
QUEUE_CONNECTION = sync
Sku id=7 stock=2000 threshold=10
check() = triggered
Alert: status=open webhook_status=mock_only webhook_attempts=1     ← 队列同步跑了一次
```

生产侧切换：
```env
QUEUE_CONNECTION=redis
# 启动 worker
php artisan queue:work redis --tries=3 --queue=default
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `test_trigger_dispatches_webhook_job` | `Bus::fake()` 拦截；assert job event=stock.low + payload + alertId |
| `test_job_handles_success_marks_sent` | Http::fake 200 → handle → alert.webhook_status=sent, attempts=1 |
| `test_job_throws_on_failure_to_let_queue_retry` | Http::fake 500 → handle 抛 RuntimeException（让 queue 走 retry） |
| `test_failed_handler_marks_alert_failed_with_attempts_eq_tries` | `$job->failed(new Exception('exhausted'))` → alert.failed + attempts=3 + response 含 'exhausted' |
| `test_mock_only_when_no_url_marks_immediately` | 无 URL → handle 标 mock_only，不抛异常（即时结束） |
| `test_job_has_correct_retry_config` | tries=3, backoff=[10,30,60] |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 6 后端 + 2 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 143/143（+6）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ✅ tinker 实测：触发 → job sync 跑 → mock_only + attempts=1 |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. 默认 dev：QUEUE_CONNECTION=sync，行为与 iter-11 完全一致（无感）
2. 生产部署：
   - `.env` 加 `QUEUE_CONNECTION=redis` + `STOCK_ALERT_WEBHOOK_URL=https://...`
   - 起 worker：`php artisan queue:work redis --tries=3`
   - 触发预警后查 `php artisan queue:failed` 看失败队列
3. 后台 /admin/stock-alerts → webhook 状态徽章若有重试会显示 ×N

## 风险与已知问题

| 项 | 说明 |
|----|------|
| sync queue 与 DB 事务交互 | trigger 在 DB::transaction 内 dispatch，sync 模式下 job 看得到未提交的 alert（同事务）；async 模式下 job 异步执行时事务已提交，也 OK；只 sync 模式下出错回滚事务但 webhook 已发出 → 罕见但要注意 |
| failed() 只在最后一次兜底 | 中间失败的 attempts 由 handle() 自己更新；中间抛后没 update → 实际上 handle 是 `update + throw` 顺序，已正确 |
| backoff 单位 | seconds；prod 想分钟级要改 [600,1800,3600] |
| 队列持久化 | redis driver 默认；选 database driver 也 OK，但需 `php artisan queue:table` |
| 没有死信队列 UI | failed 后只能 CLI 看；后续可加 `/admin/queue/failed` 页面 |

## iteration-18 候选

| 方向 | 简述 |
|------|------|
| Sanctum token 过期 + 刷新 ⭐ | 安全收尾；当前 demo token 永不过期 |
| pgvector / sqlite-vec 语义检索 | 需 embedding API key |
| 真实快递鸟接入 | 需 appKey |
| label 协作冲突保护（updated_at 乐观锁） | iter-15 尾巴 |
| ai-service 一侧 confidence 标准化 | iter-16 留的下游 |
| 死信队列后台 UI | iter-17 留的尾巴 |
