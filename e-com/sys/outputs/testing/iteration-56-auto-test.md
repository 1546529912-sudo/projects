# iteration-56-auto-test.md · 月度结算 + 店铺评分（Q50-04 + Q39-04）

## 范围
- Q50-04 月度结算单 endpoint：按 store_id + year_month 聚合 settlement_by_type + 含 paid_withdrawals 列表 + net/paid_total/remaining 三关键值
- Q39-04 stores ALTER +rating_avg/review_count/rating_calc_at + refreshStoreRatings endpoint：跨库 shop_db.reviews 聚合 → 跨库 PIM.spus 找 store_id → update stores（仅 super_admin）

## 用例

| # | 实际 | PASS |
|---|---|---|
| T1 | 月结 store#2 2026-06: net 720910 / paid 100000 / remaining 620910, by_type={order, platform_commission} | ✅ |
| T2 | refresh-ratings 跨库聚合：updated=1 reviews=2 | ✅ |
| T2-fix | only_full_group_by 错误：field('spu_id, rating, ...') 不合规 → 改 field('spu_id, COUNT(*) AS cnt, SUM(rating) AS sum') | ✅ |

## 文件
- 1 migration ALTER stores +3 字段
- 1 编辑 PHP OMS Admin.withdrawalMonthlyStatement + refreshStoreRatings + 2 路由

**2/2 ✅ + 1 fix (SQL only_full_group_by)**
