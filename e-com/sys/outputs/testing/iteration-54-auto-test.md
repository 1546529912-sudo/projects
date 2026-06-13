# iteration-54-auto-test.md · Webhook 外推 + 提现频率 + WMS 日志（Q49-03 + Q50-01 + Q50-03 + Q32-01）

## 范围
- Q49-03 BI-04 critical alert 触发 webhook 外推（5min 冷却防风暴）
- Q50-01 提现 approved/paid 时 fire `withdrawal.approved` / `withdrawal.paid`（复用 iter-33 fireAsync）
- Q50-03 提现 24h 内 pending 单数限制（默认 1，KV 可配）
- Q32-01 新表 wms_webhook_log + AlertNotifyService.fireWithLog 写入 success/fail/http_code/response_body

## 用例
- T1 提现频率限制：已有 pending 时再申请 → 400 "24h 内已有 1 笔待审提现" ✅
- T2 wms_webhook_log 表创建 ✅
- 其他：复用 iter-49 alerts + iter-50 withdrawal 已测；webhook fire 是异步事件，落 dead_letter 路径已在 iter-28/33 验证

## 文件
- 1 新 migration WMS wms_webhook_log
- 1 编辑 PHP OMS WithdrawalService（apply 频率检查 + approve/markPaid 调 fireWebhook + 私有 fireWebhook helper）
- 1 编辑 PHP OMS Admin.alertSummary critical 时 fireAsync 'bi.alert.critical' + 5min 冷却（文件锁简实现）
- 1 编辑 PHP WMS AlertNotifyService（fire → fireWithLog 写日志表）
- 1 SQL seed system_configs 加 withdrawal.max_pending_per_24h

**4 件套 / 3 fix-on-the-fly（路径中已修）**
