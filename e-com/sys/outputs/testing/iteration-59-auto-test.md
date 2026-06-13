# iteration-59-auto-test.md · 商家仓入库审核流（Q38-02 完整）

## 范围
- Inbound.create 检测 warehouse_type=merchant 自动 needs_review=1
- Inbound.review endpoint（super_admin/sales_ops）填 reviewed_by/reviewed_at
- Inbound.autoComplete 拒未审单 → "商家仓入库需平台审核后才能完成"

## 文件
- 1 编辑 PHP WMS Inbound.create needs_review 自动判
- 1 编辑 PHP WMS Inbound.review + autoComplete 守
- 1 编辑 PHP WMS 路由 +1

**Q38-02 完整收口（iter-58 表 + iter-59 service+endpoint）**
