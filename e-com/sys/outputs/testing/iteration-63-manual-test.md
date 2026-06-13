# iteration-63-manual-test.md · BI 深化 endpoints（待 UI 接入）

后端 11 项 endpoint 全交付，前端 UI 集成可逐项接入：

1. `curl /admin/bi/rfm?mode=quintile` 对比 `?mode=absolute` 用户分群差异
2. `curl /admin/bi/rfm/trend?months=6` 看月度 segment 计数趋势
3. `curl /admin/bi/rfm/user/1` 看单用户卡片
4. `curl /admin/bi/funnel/cohort?days=30` 看同 cohort 5 阶段衰减
5. `curl /admin/bi/funnel/timeseries?days=14` 每日转化率
6. `curl /admin/bi/funnel/by-category?days=30`
7. `curl /admin/bi/funnel/drop-reasons?days=30`
8. `curl /admin/bi/sku-lifecycle/trend?months=6` PIM 月度阶段迁移
9. `curl /admin/bi/alerts/history?days=14`
10. `curl /admin/bi/alerts` 末尾看到 4 新预警 (order_abuse/sku_spike/coupon_abuse/withdraw_stuck)
