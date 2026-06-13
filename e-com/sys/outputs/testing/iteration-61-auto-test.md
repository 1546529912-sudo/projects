# iteration-61-auto-test.md · 多店深化（4 项）

## 范围
- Q37-02 KV 灰度：OrderService.createOrder 把 env('OMS_MULTI_STORE_SPLIT') 替换 SystemConfigService.getInt('oms.multi_store_split')
- Q37-01 + Q35-04 多店券分摊：createSplitOrders 不再拒券，按 父订单 goods_amount 算满减总折扣 → 各子单按 goods 比例分摊，余数给最大子单
- Q38-01 跨店调拨平台代理：transfers 加 needs_review/reviewed_by/reviewed_at/cross_store_from/cross_store_to；create 检测跨店 → 默认需审；ship 守未审拒；新 review endpoint（super/sales）

## 文件
- 1 编辑 PHP（OMS OrderService.createOrder + createSplitOrders 券分摊算法 + KV 替代 env）
- 1 新 migration（OMS seed oms.multi_store_split + wms.transfer_cross_store_review）
- 1 新 migration（WMS transfers + needs_review + reviewed_by/at + cross_store_from/to）
- 1 编辑 PHP（WMS TransferService.create 检测跨店 + ship 守 + review 方法）
- 1 编辑 PHP（WMS Transfer controller +review 方法）
- 1 编辑 PHP（WMS route + transfer/<no>/review）

## 0 新接口（review endpoint 复用 admin 中间件）

## 收口
**Q37-01 / Q37-02 / Q35-04 / Q38-01** 全部 ✅
