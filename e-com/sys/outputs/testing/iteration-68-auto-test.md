# iteration-68-auto-test.md · BI / Dashboard 深化（5 项）

## 范围
- Q21-01 留存时间窗：新 `GET /admin/bi/retention` — 7/30/90 天窗注册 → 下单转化率
- Q21-02 复购：新 `GET /admin/bi/repurchase?days=30` — 同窗 ≥2 单用户 / distinct buyers
- Q21-03 评价周/月切换：新 `GET /admin/bi/review-buckets?granularity=week|month&units=8`
- Q21-05 Dashboard 自定义日期：新 `GET /admin/stats/range?from=&to=` — order_count/gmv/refund/new_users
- Q26-01 webhook 推送给小程序：新 `GET /admin/webhooks/subscribers` + `POST /admin/webhooks/test {event,payload}` 试发

## 文件
- 1 编辑 PHP（OMS Admin 加 5 endpoint：retentionWindows / repurchaseStats / reviewBuckets / statsRange / webhookSubscribers + webhookTestSend）
- 1 编辑 PHP（OMS route +6 endpoint）

## 0 新表（复用现有 orders / refund_orders / reviews / users / webhook_endpoints）

## 收口
**Q21-01 / Q21-02 / Q21-03 / Q21-05 / Q26-01** ✅
