# iteration-65-manual-test.md · 9 项 UI

## 换货
1. 用户走完一笔 return_refund + new SKU exchange 流程到 markCompleted → 后台 WMS 看新 SKU 库存 -N（OMS available 同步）

## ⌘K
2. ⌘K 输入 "1380013"（7 位手机号前缀）→ 模糊命中 address 内 phone
3. ⌘K 输入 SPU code → 点击 → 跳 `/pim/products?q=<code>`
4. ⌘K 关闭对话框 → 再开 → 输入 → 提交 → 关闭 → 再开看"最近搜索"区
5. ⌘K 用 ↑↓ 选项目 → Enter 跳转

## PDA
6. /pda/picking 卡片左侧出现 32x32 缩略图（数据需 wms_products 同步 image_url）
7. /pda/picking/<id> 点"📷 摄像头扫码"→ Chrome 88+ 自动识别 QR/Code128（在产品包装上）
8. 关网络（DevTools Network Offline）→ 扫码 → toast"离线已暂存 ✓" → 联网后 toast"已补传 N 条"
9. /pda/inbound/<no> 看到每物品行 −/+ 步长按钮 + 扫品 input；扫齐后按钮文案切"全部扫齐"
