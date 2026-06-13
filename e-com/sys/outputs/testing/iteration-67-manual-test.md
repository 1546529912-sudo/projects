# iteration-67-manual-test.md · 优惠券/评价/收藏

1. 跑 2 个 migration
2. /review POST 多维度（rating + rating_logistics 3-5 + 内容含 emoji 🎉）→ DB 存
3. POST /review/<id>/like → 第二次同 user 取消 → likes_count -1
4. POST /review/<id>/reply（admin token）→ replied_at + merchant_reply 存
5. POST /favorite/<id>?group_name=雪糕 → PUT /favorite/<id> notify_enabled=0 → DB 改
6. POST /address {name, phone, ..., lat:31.23, lng:121.47} → 入库
7. 触发一笔 refund_only 走到 refunded → 检查原 user_coupons.status='returned' + returned_at
8. GET /admin/coupon/1/share → share_token + share_path
9. GET /admin/bi/coupon/funnel?days=30 → 4 桶 + claimed/used/use_rate
