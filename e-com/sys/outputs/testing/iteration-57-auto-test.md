# iteration-57-auto-test.md · 换货深化（Q34-02 + Q34-03）

## 范围
- Q34-02 PIM 新增 `GET /spu/<id>/skus` 公开列同 SPU 下所有 enabled SKU + shop-backend BFF `/sku/by-spu?spu_id=N` 透传 — 换货下拉用
- Q34-03 ExchangeService.markCompleted 加 fireAsync `exchange.completed` webhook 外推

## 用例

| # | 实际 | PASS |
|---|---|---|
| T1 | PIM /spu/1/skus → 2 项（SPU001-001/002 含 sales_attrs 颜色/容量）| ✅ |
| fix-1 | 参数命名 spuId 与路由 `<id>` 不匹配 → 改 int $id | ✅ |

## 文件
- 1 编辑 PIM Sku.listBySpu + 路由
- 1 编辑 shop-backend Product.skusBySpu + 路由
- 1 编辑 OMS ExchangeService.markCompleted +fireAsync

**1/1 ✅ + 1 fix（路由参数命名）**

> 小程序 wxml dropdown 改造留 v1.5（前端 picker 替换需要额外侦察）
