# iteration-65-auto-test.md · 换货 v2 + PDA + ⌘K（9 项）

## 范围
- Q34-01 换货 v2 自动联动库存：ExchangeService.markCompleted 增加 InventoryService.outboundBatch（按 new_sku_code 扣减新货库存）；旧货在 markReceivedBack 时已 inboundBatch（沿用既有）
- Q44-01 ⌘K phone 放宽：quickSearch 11 位 ctype_digit → 7-11 位（支持尾号 4 位以上模糊查）
- Q44-02 ⌘K SPU 跳列表带 q：SPU row 点击跳 `/pim/products?q=<code>`
- Q44-03 ⌘K localStorage 历史：HISTORY_KEY=qs_history_v1，最近 10，去重，清除按钮
- Q44-04 ⌘K 快捷键提示：header 尾部 kbd 提示 ↑↓ / ↵ / esc + 上下选 + Enter 跳
- Q45-01 PDA 摄像头扫码：getUserMedia + BarcodeDetector（Chrome 88+/Safari 16+，不可用时回 fallback 提示）；检测到自动 onScan + stopCamera
- Q45-02 PDA 入库分步：InboundDetail 加 scanned map + 每行 ± 步长按钮 + scan input；allScanned 时按钮文案切换"全部扫齐"
- Q45-03 PDA 离线缓存：online/offline 监听 + localStorage queue + flush 函数；onScan 失败时若 !navigator.onLine → queueOffline
- Q45-04 PDA 任务卡片图：PickingList 显示 row.image_url 或 sku_image 缩略图（32x32 圆角）

## 文件
- 1 编辑 PHP（OMS ExchangeService.markCompleted 加 inventory outbound 联动）
- 1 编辑 PHP（OMS Admin.quickSearch 改 7-11 位手机宽放）
- 1 编辑 Vue（shop-admin QuickSearch.vue 重写：history + kbd hints + ↑↓Enter + SPU 跳带 q）
- 1 编辑 Vue（shop-admin pda/PickingDetail.vue 加 camera scan + offline queue）
- 1 编辑 Vue（shop-admin pda/PickingList.vue 加任务卡片图）
- 1 编辑 Vue（shop-admin pda/InboundDetail.vue 加扫品分步 + ± 步长）

## 0 新表 0 新接口（全部 UI/SVC 层增强；摄像头 BarcodeDetector 走浏览器原生）

## 收口
**Q34-01 / Q44-01 / Q44-02 / Q44-03 / Q44-04 / Q45-01 / Q45-02 / Q45-03 / Q45-04** ✅
