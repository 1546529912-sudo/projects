# Iteration 3 · Runbook（商品展示闭环）

## 【当前焦点】

- 范围：TRADE-002 商品展示 + TRADE-007 商品后台 CRUD（不含 SKU 多规格/阶梯价/参数表的高级特性 → iter-4）
- 目标：用户在浏览器：管理员后台新建一个商品 → 前台首页看到推荐 → 点进详情页看到完整信息
- 关键约束：所有接口必须有 PHPUnit 测试；前端组件用 design-system token；不动认证模块

## 任务清单

### Backend

| Task | 简述 |
|------|------|
| Sku/SkuSpec/PriceTier Migration | 已在 iter-1 schema 写过，本期跑（第一版只 SKU 主表+单价，spec/tier iter-4） |
| Category Seeder | 6 个一级分类（碳纤维板/管/布/玻纤/芳纶/预浸料） |
| Product Seeder | 4-6 个示例商品（带图占位） |
| Admin\ProductController | store/update/index/show/destroy/toggleStatus |
| Public\ProductController | 前台列表（按分类/关键词/分页）/ 详情 / 推荐 |
| Public\CategoryController | 分类树 |

### Frontend

| Task | 简述 |
|------|------|
| api/product.ts + api/category.ts | RESTful 封装 |
| HomePage.vue | 真实拉分类入口 + 推荐商品（替换占位） |
| ProductListPage.vue | 商品列表页 / 搜索 / 分类筛选 / 分页 |
| ProductDetailPage.vue | 商品详情（含主图、价格、参数） |
| admin/ProductListPage.vue | 后台列表（搜索 / 上下架 / 编辑） |
| admin/ProductFormPage.vue | 新建/编辑表单 |
| 路由更新 | /products /products/:id /admin/products /admin/products/new + /:id/edit |

### 测试

| Task | 简述 |
|------|------|
| PHPUnit ProductControllerTest | 列表/详情/搜索/筛选/空态 |
| PHPUnit AdminProductControllerTest | 创建/编辑/上下架/权限 |
| Vitest 商品 store 测试 | 简化版 |

## 切换条件

1. 后台能新建商品（带主图 URL、分类、价格、描述）
2. 前台首页展示推荐商品（真实拉接口）
3. 点商品卡片进详情页
4. PHPUnit 新增 ≥ 8 PASS
5. 用户手动验收：管理员后台建一个商品 → 前台看到

## 不在 iter-3 范围（推迟 iter-4 或更后）

- ❌ SKU 多规格分层（厚度 × 长度 × 颜色等组合）
- ❌ 阶梯价（数量分档计算）
- ❌ 参数表（密度/抗伸强度/纤维方向等技术规格表）
- ❌ 图片上传（统一用 URL 字段，本期沿用 license 上传逻辑后续抽象 OssUpload）
- ❌ 评价
- ❌ 加入购物车（TRADE-003 iter-4 或 iter-5）
