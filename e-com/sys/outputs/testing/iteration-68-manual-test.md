# iteration-68-manual-test.md · BI 5 endpoint

1. `curl /admin/bi/retention` → 3 个窗口 + rate
2. `curl /admin/bi/repurchase?days=30` → distinct_buyers + repurchase_rate
3. `curl /admin/bi/review-buckets?granularity=week&units=8` → 8 周 count + avg_rating
4. `curl /admin/bi/review-buckets?granularity=month&units=6` → 6 月
5. `curl /admin/stats/range?from=2026-05-01&to=2026-05-31` → 自定义日期段聚合
6. `curl /admin/webhooks/subscribers` → endpoint 列表
7. `curl -X POST /admin/webhooks/test -d 'event=test.fire&payload={"hello":1}'` → 触发 webhook
