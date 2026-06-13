# iteration-70-manual-test.md · 5 项

1. 跑 2 个 migration（PIM categories/brands +store_id / OMS webhook_delivery_log）
2. `curl /admin/stores/search?keyword=&order=rating_desc` → 按评分排序店列表
3. `curl /admin/stores/search?order=review_count_desc` → 按评价数
4. `curl -X POST /admin/spus/batch-set-store -d 'ids=[1,2,3]&store_id=2'` → 3 SPU 迁移到 store#2
5. 触发任意 webhook 推送（如 refund.refunded）→ `curl /admin/webhook/delivery-log?event=refund.refunded` 看到逐条 endpoint_url/http_status/duration_ms
6. supervisord conf 改 `numprocs=3` → webhook-consumer 3 实例并发
