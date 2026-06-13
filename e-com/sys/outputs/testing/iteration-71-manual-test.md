# iteration-71-manual-test.md · 5 项

1. 跑 2 migration
2. POST /admin/export-tasks {scope:"orders",format:"csv",filters:{}} → 返 task_id pending
3. POST /admin/export-tasks/<id>/run → status running → done；file_path 落 /tmp/oms_exports/orders_*.csv
4. GET /admin/export-tasks → 我的任务列表
5. 新建 SPU 带 attrs={color:"red",size:"L"} → 查 spu_attributes 表 2 行
6. UPDATE SPU attrs={color:"blue"} → 表只剩 1 行 color=blue
7. SELECT spu_id FROM spu_attributes WHERE attr_key='color' AND attr_value='blue' → 强索引检索
8. POST /admin/import-tasks {scope:"spus",source_path:"/tmp/spus.csv"} → total_rows 统计正确
9. POST /admin/image-library/recount → updated=N 张图记录
