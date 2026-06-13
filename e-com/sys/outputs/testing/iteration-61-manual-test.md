# iteration-61-manual-test.md · 4 项 UI

1. 后台"系统配置"找到 `oms.multi_store_split` → 改 1 → 小程序多店购物车下单不再 400 拒绝
2. 多店购物车带跨店满减券下单：验证父单 PO# 下挂多子单，各子单 discount 按 goods 比例分摊（最大店得余数）
3. WMS 后台新建跨店调拨（from_warehouse store#1 → to_warehouse store#2），自动 needs_review=1
4. 试着对未审调拨调 ship → 400 "需平台代理审核"；用 super 调 review → 0 → ship 成功
