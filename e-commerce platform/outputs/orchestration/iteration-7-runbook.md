# Iteration 7 · Runbook（SKU 多规格 + 阶梯价）

## 【当前焦点】

- 范围：TRADE-007-05 阶梯价 + sku_specs（规格参数表）+ 商品详情多 SKU 选择
- 目标：同一商品多规格（厚度/长度等组合）；价格随数量分档（100kg / 500kg / 1000kg+）
- 已具备：products + skus 单 SKU 模型；阶梯价 schema 早在 iter-1 设计但未建

## 状态机（价格计算）

```
用户选择 SKU + 输入数量 N
   ↓
查 price_tiers (sku_id, min_qty, max_qty, unit_price)
   ↓
找命中区间 → 用该档 unit_price 算 N × price
   ↓
无命中区间 → 用 sku.base_price 兜底
```

## Backend 任务

| Task | 简述 |
|------|------|
| Migration: price_tiers | 阶梯价表（sku_id / min_qty / max_qty / unit_price / sort_order） |
| Migration: sku_specs | SKU 参数表（sku_id / spec_key / spec_value / spec_unit） |
| Models: PriceTier, SkuSpec | Eloquent + 关系 |
| Sku model | 加 priceTiers() / specs() 关系 + resolvePrice(qty) 方法 |
| Seeder 升级 | T700 板加 3MM/5MM 两 SKU + 三档阶梯价；其他 SKU 加默认两档 |
| ProductController.show | 返回 skus 数组（不仅 defaultSku）+ 每 SKU 的 specs + price_tiers + price_range |
| CartController.addItem | 接 sku_id + qty → 用 resolvePrice(qty) 当 snapshot_price |
| OrderController.store | 同上：用阶梯价生成 order_items.unit_price |

## AI Service 任务

| Task | 简述 |
|------|------|
| quotation_engine | 调 catalog_repo 查 price_tiers，按 qty 应用分档价 |
| catalog_repo | 加 get_price_tiers(sku_id) |

## Frontend 任务

| Task | 简述 |
|------|------|
| api/product.ts | ProductDetail 类型加 skus[] + tiers[] |
| ProductDetailPage.vue | 加 SKU 选择器（按 spec_key 分组的 chips） + 阶梯价表 + 价格随数量动态切换 |
| ProductCard.vue | 价格显示"起价 ¥XXX"（取最低档） |
| stores/cart.ts | addToCart 传 sku_id（不再固定 default sku） |

## 切换条件

1. 浏览器：商品详情页能选 SKU 规格（如厚度 3MM/5MM）+ 改数量时价格按阶梯切档
2. 加购物车后金额按阶梯价计算
3. AI 报价单价格随数量分档（"500kg 报价"和"100kg 报价"出来的单价不同）
4. PHPUnit 新增 ≥ 5 PASS
5. pytest 新增 ≥ 2 PASS

## 不在范围

- ❌ SKU 库存按规格分维度（暂用单值，每 SKU 一个 stock）
- ❌ 复杂 SKU 组合矩阵（如 厚度×长度×颜色 3 维度自动组合）
- ❌ 已下订单 unit_price 历史价回溯
