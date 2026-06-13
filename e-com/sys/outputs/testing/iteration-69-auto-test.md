# iteration-69-auto-test.md · WMS / 拣货 / 调拨深化（10 项）

## 范围
- Q22-02 盘点单 CSV：新 `GET /stock-take/export-csv?status=`
- Q23-01 调拨部分接收：transfer_items + line_status / received_qty；TransferService.receivePartial({items:[{line_no,received_qty}]})；全 received 自动 head=received
- Q23-02 调拨行级取消：transfer_items + line_cancel_reason；TransferService.cancelLine(transferNo, lineNo, reason)
- Q23-03 调拨单 CSV：新 `GET /transfer/export-csv?status=`
- Q24-01 inventory_log 归档 — 文档化（实际归档需 ops 手工 + cron；表无变化）
- Q24-03 拣货 PDA 批量条码扫描 ✅ 已支持（scan 接 incr_qty=N）
- Q25-02 库位 max_quantity：locations + max_quantity；LocationRecommendService.recommend 检测 used+qty > max → 剔除
- Q25-03 拣货 operator 维度：新 `GET /picking-task/operator-stats?days=7` — task总数 / picked量 / 完成数 / 平均耗时
- Q32-02 cron 表达式 — 文档化（现 daily/weekly/monthly enum 已满足 90% 场景；复杂频率留 v2）
- Q32-03 wms_configs 加 4 默认 key（picking.fifo_priority / inbound.upshelf_threshold_pct / stock_take.auto_diff_threshold / transfer.cross_warehouse_lock）

## 文件
- 1 新 migration（WMS Iter69WmsDeepen：locations +max_quantity / transfer_items +3 列 / wms_configs +4 seed）
- 1 编辑 PHP（WMS TransferService.receivePartial + cancelLine）
- 1 编辑 PHP（WMS Transfer controller +receivePartial +cancelLine +exportCsv）
- 1 编辑 PHP（WMS StockTake controller +exportCsv）
- 1 编辑 PHP（WMS Picking controller +operatorStats）
- 1 编辑 PHP（WMS LocationRecommendService 加 max_quantity 校验）
- 1 编辑 PHP（WMS route +6 endpoint）

## 收口
**Q22-02 / Q23-01 / Q23-02 / Q23-03 / Q24-03 / Q25-02 / Q25-03 / Q32-03** ✅
**Q24-01 / Q32-02** 文档化 — 需 ops/cron 表达式引擎，留 v2
