# iteration-32-auto-test.md · WMS 自动化三件套自动测试

> 主控跑 curl，手动测试见 [iteration-32-manual-test.md](iteration-32-manual-test.md)。

## 前置
- docker compose 4 后端 Up；`docker restart ecom-wms-backend` 加载新 supervisord program（2 个新 loop 已起）
- `docker exec ecom-wms-backend php think migrate:run` → 3 migration 成功
- 端口：WMS=8004 · OMS=8003

## 范围
- **A Q25-01** 低库存外部 webhook 通知（stock_alert_rules 加 notify_webhook_url + cooldown；新 `wms:stock-alert-notify` supervisord loop 60s 扫触发并 POST，HMAC-SHA256 签名 + 5s timeout）
- **B Q22-06** 盘点定时建单（stock_take_schedules 表 daily/weekly/monthly + `wms:stock-take-schedule` loop 60s 扫到点 + 23h 防重复触发 + 复用 StockTakeService.create 建单）
- **C Q22-04** 上架推荐权重可配（wms_configs KV 表 + WmsConfigService + LocationRecommendService 改读配置，默认 fallback 硬编码）

## 用例（共 12 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| A-T1 | `POST /admin/stock-alert/rules` 带 notify_webhook_url + cooldown | code=0；新字段持久化 | sku=SPU001-001 threshold=50 url=httpbin cooldown=5 | ✅ |
| A-T2 | 列规则 | 含 notify_webhook_url / notify_cooldown_minutes / last_notified_at | 3 字段齐 | ✅ |
| A-T3 | 把阈值调到 999999 强制触发；改 cooldown=1 | 配置生效 | upsert OK | ✅ |
| A-T4 | 等 supervisord loop 60s | wms-stock-alert-notify 进程在跑 | `ps` 见 `php think wms:stock-alert-notify` | ✅ |
| A-T5 | 重查 rules | `last_notified_at` 已写入（说明 loop 推送 httpbin 成功）| `"last_notified_at":"2026-06-03 10:06:23"` | ✅ |
| B-T1 | `POST /admin/stock-take-schedule` daily 02:00 全仓 | 持久化 | id=1，daily 02:00 WH-MAIN scope=all | ✅ |
| B-T2 | `GET /admin/stock-take-schedule/list` | 返回调度列表 | 1 条 | ✅ |
| B-T3 | `POST /admin/stock-take-schedule/1/trigger` 手动触发 | code=0 + 返回 take_no | `take_no=ST202606031000122960` 建出真单 | ✅ |
| B-T4 | 建 weekly schedule 但漏 days_of_week | 400 校验告警 | "weekly 必须填 days_of_week" | ✅ |
| C-T1 | `GET /admin/config/location-weights/preview` | 返回 defaults + effective | defaults=40/30/20/10/100 同 effective | ✅ |
| C-T2 | `POST /admin/config/location_recommend_weights` 改成 60/20/15/5/150 | 持久化 | wms_configs 写入 | ✅ |
| C-T3 | 跑 `inbound/recommend-locations` 看 reasons | 新权重出现在 reasons 字符串里 | `"+60"`/`"+20"`/`"+15"`/`"+5"` + `"< 150"` 全在 | ✅ |
| C-T4 | warehouse 角色调 preview | 200 OK（warehouse+super_admin route group）| 正常返回 | ✅ |
| C-T5 | sales 角色调 preview | 403 | "权限不足，需要角色: warehouse/super_admin" | ✅ |

## 结论
**13/13 ✅** — WMS iter-32 自动化三件套全过。1 个开发期小修：B-T3 首次返 take_no=null，根因 StockTakeService.create 返回 `['take' => ..., 'items' => ...]` 而我误写 `$take['take_no']`，应是 `$take['take']['take_no']`。**经验：复用现成 service 时先看返回结构，别凭直觉**

## 关键产物
**新增 PHP（7）**
- `apps/wms-backend/database/migrations/20260603200001_alter_stock_alert_rules_add_webhook.php`（+ 3 字段）
- `apps/wms-backend/database/migrations/20260603200002_create_stock_take_schedules.php`
- `apps/wms-backend/database/migrations/20260603200003_create_wms_configs.php`
- `apps/wms-backend/app/service/AlertNotifyService.php`（HMAC-SHA256 + curl POST + 5s timeout）
- `apps/wms-backend/app/service/StockTakeScheduleService.php`（CRUD + tick + 校验）
- `apps/wms-backend/app/service/WmsConfigService.php`（KV get/set + getLocationWeights merge default）
- `apps/wms-backend/app/command/StockAlertNotify.php`
- `apps/wms-backend/app/command/StockTakeSchedule.php`
- `apps/wms-backend/app/controller/StockTakeSchedule.php`
- `apps/wms-backend/app/controller/WmsConfig.php`

**编辑 PHP（5）**
- `apps/wms-backend/app/controller/StockAlert.php`（ruleUpsert 接 webhook 字段）
- `apps/wms-backend/app/service/StockAlertService.php`（upsert 接 webhook 字段）
- `apps/wms-backend/app/service/LocationRecommendService.php`（读 WmsConfigService 权重）
- `apps/wms-backend/config/console.php`（+ 2 命令注册）
- `apps/wms-backend/route/app.php`（+ 9 路由）
- `apps/wms-backend/supervisor/consumer.conf`（+ 2 program）

**新增 Vue（2）**
- `apps/shop-admin/src/pages/wms/StockTakeSchedules.vue`（CRUD + 手动触发按钮 + daily/weekly/monthly 表单切换）
- `apps/shop-admin/src/pages/wms/Settings.vue`（权重表单 + 默认值对照 + 公式说明）

**编辑 Vue（3）**
- `apps/shop-admin/src/apis/wms.ts`（+ 11 接口方法）
- `apps/shop-admin/src/pages/wms/StockAlerts.vue`（加 Webhook 列 + 最近推送列 + dialog 加 webhook URL 输入 + 冷却分钟）
- `apps/shop-admin/src/router/index.ts` + `AdminLayout.vue`（+ 2 路由 + 2 菜单项；Settings 仅 super_admin）

## 经验记录
1. **WMS 第一次 webhook 推送**：iter-28 OMS webhook 是 admin 配订阅表 + 同步 fire；WMS 这里是规则上加 webhook URL（每 SKU 一行配置）。不复用 OMS 的 webhook_subscriptions 表是因为业务语义不同 — OMS 是"订阅多种事件"，WMS 是"为这个 SKU 设个钉钉通知 URL"
2. **supervisord loop vs cron job**：选 loop（while true + sleep 60）。理由：项目里已有 supervisord（OMS consume:* + WMS consume:*），加 loop 是最小增量；cron 还要装 crond + 配 docker，复杂度多一倍。**经验：项目已用 supervisord 时，定时任务也用 supervisord loop**
3. **23h 防重复触发**：定时调度 loop 每 60s 扫，可能在同一 hour:minute 多次匹配。用 `last_triggered_at` + 23h 间隔阻断，保证每天最多 1 单。**关键：不靠扫表频率控触发数，要靠状态字段**
4. **service create 返回结构陷阱**：StockTakeService.create 实际返回 `['take' => $detail, 'items' => $list]`，我误以为顶层就是 take row → `$take['take_no']` null。**经验：复用 service 时一定看返回，TP detail() 模式喜欢嵌套 wrap**
5. **WmsConfig 默认值合并**：getLocationWeights 用 `array_merge(DEFAULT, db)` — 数据库只覆盖被改的 key，没改的回落默认值。**经验：KV 配置必须 merge default 兜底，否则 db 删一个 key 程序就崩**
6. **weekly day_of_month 限 1-28**：避免每月底差异（2月只到 28/29，30/31 不一定有），强校验 ≤ 28。**经验：日期类配置默认拒绝边缘 case 比让用户自己想清楚更安全**
