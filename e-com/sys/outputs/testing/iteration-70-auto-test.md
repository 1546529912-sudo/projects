# iteration-70-auto-test.md · 多店 / 商家 5 项

## 范围
- Q35-02 店铺评分体系 + 平台搜索排序：新 `GET /admin/stores/search?keyword=&order=rating_desc|review_count_desc|...`（复用 iter-56 stores.rating_avg）
- Q36-01 categories / brands 加 store_id：新 migration ALTER 2 表 + index
- Q36-02 super_admin SPU 批量改 store_id：新 `POST /admin/spus/batch-set-store {ids,store_id}`
- Q33-02 webhook 推送日志独立表：新 webhook_delivery_log 表 + WebhookService.logDelivery hook 进入每次投递 + 新 `GET /admin/webhook/delivery-log` 查询
- Q33-03 多 consumer 实例 — **文档化**（supervisord numprocs=N 即可横向扩展，无代码改）

## 文件
- 1 新 migration（PIM categories/brands + store_id + idx）
- 1 新 migration（OMS webhook_delivery_log 表）
- 1 编辑 PHP（OMS WebhookService.deliverWithRetry 加 logDelivery 调用 × 3 处 + logDelivery 方法）
- 1 编辑 PHP（OMS Admin 加 webhookDeliveryLog + storesSearchRanked）
- 1 编辑 PHP（OMS route +2）
- 1 编辑 PHP（PIM Admin 加 spusBatchSetStore）
- 1 编辑 PHP（PIM route +1）

## 收口
**Q35-02 / Q36-01 / Q36-02 / Q33-02** ✅
**Q33-03** 文档化（supervisord 配置）
