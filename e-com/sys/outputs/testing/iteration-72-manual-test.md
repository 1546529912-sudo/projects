# iteration-72-manual-test.md · 4 项

1. 跑 migration，验 store_pages 表 + settlements +4 列
2. supervisord 重启容器 → `supervisorctl status` 看 `dead-letter-auto-replay RUNNING`
3. 造一条 dead_letter 行（stream='oms.refund.refunded', error=NULL, retry_count=0）→ 30s 内 error 字段被 worker 追 "auto-replayed at ..."
4. editor 登录 → 调任意 OMS endpoint → 401/403（路由）OR 403"无可见数据"（service 层）
5. store_owner 登录 → POST /admin/store/<本店>/page {layout:{blocks:[{type:"banner",image:"x.jpg"}]}} → 成功
6. POST /admin/store/<本店>/page/publish → status=published
7. 小程序无鉴权 `GET /store/<id>/page?page_type=home` → 返 blocks（spu_list 已展开 SPU 卡片）
8. super_admin POST /admin/settlement/<id>/approve → approval_status=approved，DB 写入 approved_by/at
9. POST /admin/settlement/<id>/reject {reason:"..."} → rejected + rejection_reason 落库
