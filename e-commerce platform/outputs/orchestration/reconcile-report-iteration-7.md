# Reconcile Report · Iteration 7（SKU 多规格 + 阶梯价）

> 主控对账。完成时间：2026-05-22 23:50

## 【当前焦点】

- 范围：TRADE-007-05 阶梯价 + sku_specs 规格参数 + 多 SKU 选择
- 结论：**全部硬约束通过**，B2B 工业品三大核心数据（多规格 SKU / 阶梯价 / 技术规格）全链路打通
- 测试：PHPUnit **79/79 PASS**（新增 6 + 修 2）· pytest **16/16 PASS**（新增 2）

## 端到端实测

| qty | 单价 | 命中档 | 总价 | 节省 |
|-----|------|--------|------|------|
| 1 kg | ¥1380.00 | 1-99（零售档） | ¥1,380 | — |
| 100 kg | ¥1280.00 | 100-499 | ¥128,000 | **¥10,000** |
| 500 kg | ¥1180.00 | 500-999 | ¥590,000 | **¥100,000** |
| 1500 kg | — | 大批量 | — | 自动转销售经理 |

## 后端产物（Laravel）

| 文件 | 说明 |
|------|------|
| `database/migrations/2026_05_22_000011_create_price_tiers_and_sku_specs.php` | price_tiers + sku_specs 两表 |
| `app/Models/PriceTier.php` | 阶梯价 model |
| `app/Models/SkuSpec.php` | SKU 规格属性 |
| `app/Models/Sku.php` 升级 | + priceTiers() + specs() + **resolvePrice(qty)** + priceRange() |
| `database/seeders/CatalogSeeder.php` 重写 | 5 商品 / 7 SKU / 21 阶梯价 / 13 规格；T700 板拆 3MM/5MM 两 SKU + 4 档阶梯价 |
| `app/Http/Controllers/Api/ProductController.php` | show() 返 skus[] + price_tiers[] + specs[] + price_range；卡片显示"起价" |
| `app/Http/Controllers/Api/CartController.php` | addItem/updateItem 用 `sku->resolvePrice(qty)` 写 snapshot_price；列表用 snapshot_price 显示 |
| `app/Http/Controllers/Api/OrderController.php` | 下单 unit_price 用阶梯价快照 |

## AI Service 产物

| 文件 | 说明 |
|------|------|
| `app/infra/catalog_repo.py` | + `get_price_tiers(sku_id)` + `resolve_price(sku_id, qty, base)` + 库存优先排序 |
| `app/services/quotation_engine.py` | 应用阶梯价 + 节省金额提示 + 多 SKU 时跨规格匹配库存足够的 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/api/product.ts` | + SkuSpec / PriceTier / SkuDetail 类型；ProductDetail.skus[] 数组 |
| `src/views/product/ProductDetailPage.vue` 重写 | SKU 选择器 chips + 阶梯价表（命中档高亮） + 动态单价 + 小计 + 技术规格表 |
| `src/components/ProductCard.vue` | 价格前加"起" 小字 |

## 测试结果

### PHPUnit 79/79 PASS

```
✅ PriceTier (6)           — 新增（resolvePrice / 详情多 SKU / 加购阶梯价快照 / 修改数量刷新 / 下单 unit_price / fallback）
✅ ProductPublic (8)       — 修 2 个旧测试适配 data.skus.0.xxx
✅ + 之前所有 65 全部通过
```

### pytest 16/16 PASS

```
✅ test_price_tiers (2)    — 新增（命中 100kg 档 / 小数量回退）
✅ test_chat_turn (8)      — 之前
✅ test_health (6)         — 之前
```

### 端到端 curl（实跑）

| # | 操作 | 结果 |
|---|------|------|
| 1 | GET /products/{T700} | ✅ 2 SKU + 4 阶梯档 + specs + price_range[1080,1980] |
| 2 | T700 list 卡片 | ✅ "起¥1080.00" sku_count=2 |
| 3 | AI: "碳纤维板 1kg" | ✅ ¥1380（档 1-99）|
| 4 | AI: "碳纤维板 100kg" | ✅ ¥1280（档 100-499，节省 ¥10000）|
| 5 | AI: "碳纤维板 500kg" | ✅ ¥1180（档 500-999，节省 ¥10万）|
| 6 | AI: "碳纤维板 1500kg" | ✅ 转销售经理（大客户兜底）|

## HARNESS 5 项硬约束

| # | 约束 | 状态 |
|---|------|------|
| 1 | 产物清单已提交 | ✅ 7 后端 + 2 AI + 3 前端 |
| 2 | 主控 ls 验证存在 | ✅ |
| 3 | 自动化测试 PASS | ✅ PHPUnit 79/79 + pytest 16/16 + Vitest 18/18 |
| 4 | 手动测试用户勾选 | ⏳ |
| 5 | 对账报告已生成 | ✅ |

## 用户手动验收步骤

http://localhost:5173/

1. 用 buyer 账号登录（`13900000000 / buyer123`）
2. 进 "T700 标准型碳纤维板" 详情页 → 应看到：
   - 规格选择 chips：[3 mm / 1.78 g/cm³] [5 mm / 1.78 g/cm³]
   - 阶梯价表：4 档（1-99/100-499/500-999/1000+），当前命中档高亮品牌蓝
   - 数量改 100 → 单价自动变 ¥1280；改 500 → ¥1180；小计实时变
   - 价格旁出现 "阶梯价省 ¥100/件" 徽章
   - 底部"技术规格"表展示 thickness/density
3. 加购物车 100 件 → 进购物车看到单价是 ¥1280（不是 base 价 1380）
4. AI 抽屉问"碳纤维板 500kg" → 报价单单价 ¥1180，备注"已应用 500 kg 阶梯价"

## 风险与已知问题

| 项 | 说明 |
|----|------|
| 价格快照 vs 现价 | snapshot_price 在加购/改数量时刷新，但若管理员后台调阶梯价，已在购物车的不会自动同步（OK，符合预期） |
| 多 SKU 库存独立 | 每 SKU 一个 stock；跨规格库存独立 |
| 规格选择 UX | 当前 chip 显示"3mm / 1.78 g/cm³"，规格维度多时（如厚度×长度）需做组合矩阵 → iter-? |
| AI 报价默认选最低价 SKU | catalog_repo 当前优先库存足够的，再按价格升序；用户没指定厚度时按 3MM 报 |

## iteration-8 候选

| 方向 | 简述 |
|------|------|
| **物流接快递鸟** | 真实物流轨迹（用户已确认选型） |
| **库存精细化** | Redis Lua 预扣 + 30 分钟超时取消任务 |
| **RAG + pgvector** | 售前问答匹配规格书（让 DeepSeek 答的是"我们公司"的数据） |
| **多 SKU 组合矩阵** | 厚度×长度×颜色自动组合 + 价格矩阵 |
| **Admin Policy** | 后端 admin 接口精细化权限 |
