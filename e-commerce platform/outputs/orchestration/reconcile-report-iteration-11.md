# Reconcile Report · Iteration 11（库存预警 + Webhook + 后台 Dashboard）

> 完成时间：2026-05-22

## 【当前焦点】

- 范围：兑现 SKU 表早就预留的 `stock_threshold` 字段；库存变更后自动比对阈值；触发 → 写 `stock_alerts` + 调 Webhook；后台 Dashboard 红条 + 列表页 + 一键 resolve
- 结论：StockAlertService + WebhookDispatcher 双服务；下单/取消/超时取消/后台编辑 4 个触发点全部接通；新增 [admin/](frontend/src/views/admin/) Dashboard + StockAlertsPage 两页面
- 测试：PHPUnit **113/113**（+11）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| Observer vs 显式调用 | **显式调用** | Builder::decrement/increment 不触发 model events；显式更明确，无隐式依赖 |
| 触发条件 | `stock <= threshold` | 边界值更安全；阈值=10 时库存=10 立刻触发 |
| 防重 | 一个 SKU 同时只能有一条 `open` | service 层 firstOrCreate 风格保证（DB 不加 partial index，跨方言更兼容） |
| Webhook 阻塞 vs 异步 | **同步 try/catch，不抛异常** | 预警不能拖垮下单链路；失败标 `failed` 但业务继续 |
| URL 未配置时 | **mock_only 模式** | 开发/测试环境零配置；生产配 `STOCK_ALERT_WEBHOOK_URL` |
| 自动 resolve | **库存补回到阈值之上时自动 resolve** | 减少运营负担；admin 也能手动 resolve |

## 后端产物

| 文件 | 说明 |
|------|------|
| `database/migrations/2026_05_22_000014_create_stock_alerts_table.php` | `stock_alerts` 表（sku_id/current_stock/threshold/status/webhook_status/webhook_response/triggered_at/resolved_at） |
| `app/Models/StockAlert.php` | + belongsTo Sku |
| `app/Services/WebhookDispatcher.php` | 通用 webhook 发送：URL 未配 → mock_only；配了 → Http::post 3 秒超时，失败标 failed，永不抛 |
| `app/Services/StockAlertService.php` | check(skuId)：stock ≤ threshold 触发 / 已 open 仅更新快照 / 库存补回自动 resolve |
| `app/Http/Controllers/Api/OrderController.php` | store 扣库存 + cancel 回库存后各调 1 次 check |
| `app/Console/Commands/CancelStaleOrders.php` | 超时取消回库存后调 check |
| `app/Http/Controllers/Api/ProductAdminController.php` | + stock_threshold 字段（create/update 都允许），save 后调 check；JSON 输出加 stock_threshold |
| `app/Http/Controllers/Api/AdminStockAlertController.php` | GET /admin/stock-alerts?status=… + POST /{id}/resolve |
| `routes/api.php` | + 两条 admin 路由 |
| `tests/Feature/StockAlertServiceTest.php` | 6 测试：触发 / 防重 / 自动 resolve / 阈值上无事 / mock 模式 / Http::fake 真实推送 |
| `tests/Feature/AdminStockAlertTest.php` | 5 测试：list + open_count / resolve API / 状态过滤 / 下单触发 / 取消 resolve |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/api/admin-stock-alert.ts` | adminListStockAlerts / adminResolveStockAlert + 类型 |
| `src/views/admin/DashboardPage.vue` | 后台总览：红卡片显示未处理预警数（=0 显示绿√）+ 4 卡片导航 + 近期预警表 |
| `src/views/admin/StockAlertsPage.vue` | 预警列表页：tab(未处理/已处理/全部) + 红色徽章 + Webhook 状态徽章 + 一键 resolve |
| `src/router/index.ts` | + /admin（dashboard）和 /admin/stock-alerts 两路由 |
| `src/views/admin/ProductFormPage.vue` | + 低库存阈值输入框（带说明） |
| `src/views/profile/MePage.vue` | admin 卡片加"总览 →"和"库存预警 →"快捷入口 |

## 端到端实测（CLI）

```
$ php artisan tinker --execute='...'
Initial: sku_id=7  stock=2000  threshold=10
After update: stock=5 threshold=10
check() returns: triggered                                    # ← 触发
Alert: id=1 status=open webhook_status=mock_only current_stock=5
Stock restored to 100
check() returns: resolved                                     # ← 自动 resolve
Alert after resolve: status=resolved resolved_at=2026-05-22 11:40:09
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `StockAlertServiceTest.test_does_not_double_trigger_when_open_alert_exists` | 已有 open 时不重复发 webhook，但更新 current_stock 快照 |
| `StockAlertServiceTest.test_webhook_real_call_when_url_configured` | Http::fake 验证 payload 含 sku_id/sku_code/event=stock.low |
| `AdminStockAlertTest.test_order_creation_triggers_alert_when_decrement_crosses_threshold` | 库存 12 阈值 10，下 5 件 → 7 ≤ 10 → 自动 open |
| `AdminStockAlertTest.test_cancel_restores_stock_and_resolves_alert` | 取消订单 → 库存回 12 > 10 → 自动 resolved |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 11 后端 + 6 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 113/113（+11）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ⏳ 浏览器访问 /admin（admin 登录后） |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. admin 登录（13800000001/admin123）→ Profile 页 → "总览 →" 进入 /admin
2. 后台商品 → 编辑某商品 → 把"低库存阈值"设到当前库存之上 → 保存
3. 回到 /admin → 看到红色卡片 "⚠️ 1 个未处理库存预警"
4. 点进 /admin/stock-alerts → 表格 + "标记已处理" 按钮
5. 浏览器开另一身份下单消耗某 SKU 至 ≤ 阈值 → 后台自动产生新 alert

可选：配置真实 Webhook
```
# backend-laravel/.env
STOCK_ALERT_WEBHOOK_URL=https://hooks.example.com/your-webhook
```
配置后 alert 触发会真实 POST JSON：`{event: "stock.low", payload: {sku_id, sku_code, ...}, timestamp}`

## 风险与已知问题

| 项 | 说明 |
|----|------|
| `defaultSku` only | 当前 stock 字段只挂"默认 SKU"；多 SKU 商品 iter-7 已建表但触发链路只覆盖第一个 SKU。需扩展到所有 SKU |
| Observer 未启用 | 后台直接 SQL 改 stock 不会触发预警；admin 编辑走 controller 才会 |
| Webhook 失败重试 | 当前 failed 后不重试，运营需肉眼看 webhook_status；可后续接 Laravel queue retry |
| 资源化 webhook payload | 当前 payload 字段固定；下游若要更多字段可加 `WebhookPayloadBuilder` |
| admin 权限 | 后端仅 auth:sanctum，无 role middleware；任何登录用户调 /admin/stock-alerts 都能看，靠前端 router meta 拦 |

## iteration-12 候选

| 方向 | 简述 |
|------|------|
| Admin Policy 精细化 ⭐ | 后端 Gate/Policy enforcement，把 admin 权限从前端拦真正下沉到后端 |
| pgvector / sqlite-vec 语义检索 | 解决 FTS5 中文 token 召回弱点（需通义/智谱 embedding key） |
| Bad Case 收集 + 标注后台 | AI 持续改善闭环 |
| 真实快递鸟接入 | 用户提供 appKey 后接入 |
| Webhook 队列化 + 重试 | 用 Laravel queue + retry，提高 webhook 可靠性 |
