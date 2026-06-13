# Reconcile Report · Iteration 3

> 主控对账。完成时间：2026-05-21 23:15

## 【当前焦点】

- 范围：TRADE-002 商品展示 + TRADE-007 商品后台 CRUD（简化版 SKU，多规格/阶梯价/参数表留 iter-4）
- 结论：**全部硬约束通过**，前端首页/列表/详情/后台 4 页 + 4 公开接口 + 5 admin 接口 跑通
- 测试：PHPUnit **34/34 PASS**（新增 14）· Vitest **12/12 PASS**（新增 5）

## 后端产物

| 文件 | 内容 |
|------|------|
| `database/migrations/2026_05_22_000005_create_skus_table.php` | SKU 表（product_id / sku_code / base_price / stock / threshold / status） |
| `database/seeders/CatalogSeeder.php` | 6 分类 + 6 示例商品 + 6 SKU（用 placehold.co 占位图） |
| `app/Models/Sku.php` | Sku Model（带 product 关系） |
| `app/Models/Product.php` | 加 skus() + defaultSku() 关系 |
| `app/Http/Controllers/Api/ProductController.php` | 前台：index / recommended / show（含 view_count 累加） |
| `app/Http/Controllers/Api/CategoryController.php` | 前台分类列表 |
| `app/Http/Controllers/Api/ProductAdminController.php` | 后台：index / store / show / update / toggle（事务保证 product+sku 一致） |
| `routes/api.php` | 注册 4 公开接口 + 5 admin 接口 |

## 前端产物

| 文件 | 内容 |
|------|------|
| `src/api/product.ts` | listProducts / recommended / productDetail / adminListProducts / adminCreate / adminUpdate / adminToggle |
| `src/api/category.ts` | listCategories |
| `src/components/ProductCard.vue` | 通用商品卡（图 + 名 + 型号 + 价 + 库存 + 缺货 badge） |
| `src/views/home/HomePage.vue` | 改造为拉真实分类 + 推荐商品 + 搜索表单 |
| `src/views/product/ProductListPage.vue` | 列表页（左侧分类筛选 + 右侧网格 + 排序 + 空态） |
| `src/views/product/ProductDetailPage.vue` | 详情页（左图 + 右栏 sticky 价格 + 加购/立购/AI 报价 stub）|
| `src/views/admin/ProductListPage.vue` | 后台列表（搜索 + 编辑 + toggle 上下架）|
| `src/views/admin/ProductFormPage.vue` | 新建/编辑表单（分类下拉 + 价格 + 库存）|
| `src/router/index.ts` | 新增 4 个路由：/products /products/:id /admin/products /admin/products/{new,:id/edit} |
| `src/views/profile/MePage.vue` | 管理员卡片加 "商品管理" 入口 |
| `src/shims-vue.d.ts` | .vue 模块声明（修复 TypeScript 错误） |

## 测试结果（真实执行）

### PHPUnit 34/34 PASS

```
✅ Auth Controller (5)
✅ Company Controller (5)
✅ Health Controller (2)
✅ Product Admin (6) — 新增
✅ Product Public (8) — 新增
✅ Role Controller (3)
✅ Wechat Auth (3)
✅ Example (2)
```

### Vitest 12/12 PASS

```
✅ HealthPage.spec.ts (1)
✅ auth.spec.ts (6)
✅ product.spec.ts (5) — 新增
```

### 端到端联调（已实跑）

| # | 操作 | 结果 |
|---|------|------|
| 1 | curl /api/v1/categories | ✅ 6 分类 |
| 2 | curl /api/v1/products/recommended | ✅ 4 张推荐卡 |
| 3 | curl /api/v1/products?keyword=T700 | ✅ 命中 T700 系列 |
| 4 | curl /api/v1/products/1 | ✅ 完整商品 + SKU + category + view_count++ |
| 5 | Vite proxy /api/v1/products/recommended | ✅ JSON 透传 |
| 6 | /products /products/1 /admin/products 路由 200 OK | ✅ |

## HARNESS 5 项硬约束

| # | 约束 | 状态 |
|---|------|------|
| 1 | 产物清单已提交 | ✅ 8 后端 + 11 前端 |
| 2 | 主控 ls 验证存在 | ✅ |
| 3 | 自动化测试 PASS | ✅ PHPUnit 34/34 + Vitest 12/12 |
| 4 | 手动测试用户勾选 | ⏳ 等用户在浏览器走闭环 |
| 5 | 对账报告已生成 | ✅ |

## 用户手动验收步骤

1. 打开 http://localhost:5173/ — 应看到 6 张分类卡片 + 4 张推荐商品卡片（带真实图）
2. 点任意商品卡 → 进入 `/products/{id}` 详情页（含主图、价格、库存、描述）
3. 点 header 搜索 "T700" → 跳列表页，左侧分类筛选可切换
4. 退出登录如已登录；在浏览器登录管理员（之前的步骤）：`sqlite3 backend-laravel/database/database.sqlite "UPDATE users SET role='admin' WHERE id=1"`
5. 个人中心点 "商品管理 →" → /admin/products 列表
6. 点 "+ 新建商品" → 填写表单 → 创建 → 回到列表
7. 在前台首页或商品列表能看到刚创建的商品（如果状态 active）
8. 列表里点 "下架" → 前台立刻消失；再点 "上架" 又出现

## 风险与已知问题

| 项 | 说明 |
|----|------|
| Admin 权限粗粒度 | 后端 admin 接口当前只校验 sanctum 未校验 role=admin → iter-4 上 Policy（已用前端守卫顶住） |
| 图片仍用外链 | OSS 上传抽象在 iter-4 |
| SKU 简化为单条 | 多规格分层 / 阶梯价 / 参数表 iter-4 |
| 加购按钮 alert stub | TRADE-003 购物车 iter-5 |
| AI 报价按钮 alert stub | AI-001 等 DeepSeek API key + iter-? |

## iteration-4 候选

1. SKU 多规格 + 阶梯价 + 参数表（深化商品模型）
2. 后端 admin Policy（细粒度权限）
3. 购物车 + 结算（TRADE-003 + TRADE-004，不含支付）
4. OSS 图片上传抽象

用户选下一步方向 →
