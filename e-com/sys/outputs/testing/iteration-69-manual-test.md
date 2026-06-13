# iteration-69-manual-test.md · WMS 深化

1. 跑 migration → locations + max_quantity / transfer_items +3 列
2. `curl /stock-take/export-csv` → 下载 CSV
3. `curl /transfer/export-csv` → 下载 CSV
4. POST /transfer/<TR>/receive-partial -d 'items=[{line_no:1,received_qty:5}]' → 行更新
5. POST /transfer/<TR>/lines/2/cancel -d 'reason=...' → 行 cancelled
6. 设置某 location max_quantity=10，业务推荐上架超过此容量时 → 该库位被剔除
7. `curl /picking-task/operator-stats?days=7` → 每 operator 任务数 / 完成数 / 平均耗时
8. `curl /admin/config/list?category=warehouse` → 看到 picking.fifo_priority 等 4 新 key
