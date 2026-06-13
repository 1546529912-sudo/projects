# iteration-54-manual-test.md

> auto-test 部分通过；前端无新页

| # | 步骤 | 期望 |
|---|---|---|
| M1 | 商家提现 2 次（24h 内） | 第 2 次拒绝"24h 内已有 1 笔" |
| M2 | super 系统参数页改 withdrawal.max_pending_per_24h=2 | 商家可申请 2 笔 |
| M3 | 触发 BI critical（如 dead_letter 积压 ≥10）后查 dead_letter 表 | 多一行 webhook.bi.alert.critical 出口（外部 url 失败的话）|
| M4 | 触发 WMS 低库存预警后 | 查 wms_webhook_log 应有记录（含 http_code）|
