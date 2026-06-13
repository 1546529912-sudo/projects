# iteration-63-auto-test.md · BI 深化（11 项）

## 范围
- Q46-01 RFM 分位法 mode 切换：rfmAnalysis 加 `?mode=quintile`，小样本（n<5）兜底 absolute
- Q46-03 RFM 历史趋势：新 `GET /admin/bi/rfm/trend?months=6` — 按月跑 RFM segment 计数
- Q46-04 客户级 RFM 卡片：新 `GET /admin/bi/rfm/user/<userId>` — 最近 20 单 + stats + top 5 SKU
- Q47-01 Funnel cohort：新 `GET /admin/bi/funnel/cohort` — 同一用户穿过 5 阶段
- Q47-02 Funnel 时间序列：新 `GET /admin/bi/funnel/timeseries` — 每日 created/paid/comp + 转化率
- Q47-03 Funnel 按 category：新 `GET /admin/bi/funnel/by-category` — JSON_EXTRACT sku_snapshot.category_id 切片
- Q47-04 Funnel 流失原因归因：新 `GET /admin/bi/funnel/drop-reasons` — cart_abandon + payment_timeout + refunded 三类
- Q48-02 SKU 生命周期月度迁移：PIM 新 `GET /admin/bi/sku-lifecycle/trend?months=6`
- Q49-02 预警历史时序：新 `GET /admin/bi/alerts/history?days=14` — 每日 orders + refunds + rate
- Q49-04 加 4 新预警类：alertSummary 末尾追 order_abuse / sku_spike / coupon_abuse / withdraw_stuck
- Q48-04 时间字段命名统一：**保留观察期不动**（refactor 风险大；该项独立立项）

## 文件
- 1 编辑 PHP（OMS Admin 加 6 endpoint + 改 rfmAnalysis 支持 mode + 加 quintileBoundaries/scoreByBoundaries 辅助 + alertSummary 末尾加 4 新预警）
- 1 编辑 PHP（PIM Admin 加 skuLifecycleTrend）
- 1 编辑 PHP（OMS route +7 BI endpoint）
- 1 编辑 PHP（PIM route +1 sku-lifecycle/trend）

## 0 新表 0 新 service（全部复用 iter-46/47/48/49 基建 + 跨库副连接）

## 收口
**Q46-01 / Q46-03 / Q46-04 / Q47-01 / Q47-02 / Q47-03 / Q47-04 / Q48-02 / Q49-02 / Q49-04** ✅
**Q48-04** 命名统一暂保留（高风险）
