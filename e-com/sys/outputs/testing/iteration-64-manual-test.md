# iteration-64-manual-test.md · 6 项 UI

1. 跑 migration → /admin/todos-counts 返回 items 含 delta + severity 字段
2. POST /admin/views {scope:"orders", name:"我的视图", filters:{...}} → 保存视图；GET /admin/views?scope=orders 列出
3. GET /admin/stream-policies 看 7 默认策略；POST 改某 stream max_retries=5
4. sales 用户 approve 大额退款（≥¥500）→ pending pending_approve + needs_second_review=1；super_admin 二审带 ?second_review_note="...确认通过" → DB 存 note
5. super_admin 在 audit-log 列表选某 force_cancel 行 → POST /admin/audit-log/<id>/reverse → 200 reversed=true
6. 重复 reverse 同条 → 400 "已撤销"
