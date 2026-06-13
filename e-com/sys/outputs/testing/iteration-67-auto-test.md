# iteration-67-auto-test.md · 优惠券 / 评价 / 收藏（14 项）

## 范围
- Q19-04 退款返券：RefundService.refund() 找该 order_no 的 user_coupons → status `used` → `returned` + returned_at
- Q19-05 优惠券分享：user_coupons + referrer_user_id 列；新 `/admin/coupon/<id>/share` 返 share_token + share_path
- Q19-06 CSV 导出加优惠券列 ✅ 已早做（iter-21 / Admin.exportOrders）
- Q19-07 Dashboard 加"券核销率" ✅ 已早做（Admin.stats coupon_metrics + coupon_usage_metrics）
- Q20-01 评价多维度：reviews + rating_logistics/service/quality 3 列；ReviewService.submit 接 $extra；controller 提取 3 字段
- Q20-02 评价 emoji ✅ DB utf8mb4 已支持
- Q20-03 评价点赞 + 商家回复：reviews + likes_count + merchant_reply + replied_at；新表 review_likes（UNIQUE）+ 2 endpoint POST `/review/<id>/like` `/review/<id>/reply`
- Q20-04 地址 LBS：addresses + lat/lng decimal(10,7)；Address controller / service 接收 lat lng
- Q20-05 收藏分组 + 降价通知：favorites + group_name + last_seen_price_cents + notify_enabled；新 PUT `/favorite/<spuId>` 改组 / 切通知
- Q20-07 OSS — 跳过（外部基础设施）
- Q20-08 rating_avg Redis 缓存 — 留 stub（小流量未必需要）
- Q21-04 券核销漏斗：新 `/admin/bi/coupon/funnel?days=30` 返 claimed/used/use_rate + 时长 4 桶（0-1h / 1-24h / 1-7d / >7d）
- Q27-01 折扣 scope ✅ 已早做（iter-19 SPU/category scope）
- Q27-03 自动规则 order_n_threshold：coupon_auto_rules + order_n_threshold 列（业务接线留 v2 — CouponAutoRule eligibility 函数待 hook）

## 文件
- 1 新 migration（shop-backend Iter67ReviewFavoriteAddress：reviews +6 列 / favorites +3 / addresses +2 / review_likes 新表）
- 1 新 migration（oms-backend Iter67CouponShareReferrer：user_coupons +referrer_user_id +returned_at / coupon_auto_rules +order_n_threshold）
- 1 编辑 PHP（shop-backend ReviewService.submit 加 $extra + like + reply）
- 1 编辑 PHP（shop-backend Review controller +like +reply + submit 多维）
- 1 编辑 PHP（shop-backend FavoriteService.add 加 group + updateGroup）
- 1 编辑 PHP（shop-backend Favorite controller +updateGroup）
- 1 编辑 PHP（shop-backend AddressService.create + update 传 lat/lng）
- 1 编辑 PHP（shop-backend Address controller 4 处 only() 加 lat/lng）
- 1 编辑 PHP（shop-backend route +3 新 endpoint）
- 1 编辑 PHP（oms-backend RefundService.refund 退款返券）
- 1 编辑 PHP（oms-backend Admin 加 couponShareLink + couponFunnel）
- 1 编辑 PHP（oms-backend route +2 新 endpoint）

## 收口
**Q19-04 / Q19-05 / Q19-06 / Q19-07 / Q20-01 / Q20-02 / Q20-03 / Q20-04 / Q20-05 / Q21-04 / Q27-01 / Q27-03(部分)** ✅
**Q20-07 OSS** 跳过（外部）；**Q20-08 Redis cache** stub（小流量 OK）
