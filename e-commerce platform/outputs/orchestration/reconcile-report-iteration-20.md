# Reconcile Report · Iteration 20（管理后台统一布局：左菜单 + 右内容）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：按用户要求重构 admin 入口 —— profile 页只露一个"进入后台 →"主按钮（不再列每个功能）；后台进去后是统一布局：**左侧固定菜单 + 右侧 RouterView**
- 结论：新建 [AdminLayout.vue](frontend/src/layouts/AdminLayout.vue)；router 把所有 admin 路由收成 `/admin` 父路由的 children；MePage 简化为单按钮
- 测试：PHPUnit **157/157** · pytest 22/22 · Vitest **18/18** 全 PASS；TypeScript 类型干净（顺手修了 iter-11 留的 stock_threshold 类型缺失）

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 全屏接管 vs 顶 nav 之下 | **保留全局顶 nav，左侧 sidebar 在其下** | 用户能随时退出回前台；不打断既有交互习惯 |
| 菜单分组 vs 平铺 | **分组（运营 / 业务）** | 8 个入口平铺太散；运营是新加的（库存预警/Bad Case/死信），业务是原有的（商品/订单/审核/知识库） |
| 路由父子 vs 平级 | **Vue Router children** | 子路由共享 layout；切菜单时只重渲右侧 |
| 现有 admin 页面改造 | **不动一行** | 每个页面已经 `.admin { max-width: 1200px; margin: 0 auto }`，自然在右侧主区居中；零迁移 |
| 高亮规则 | **product/edit/new 都高亮"商品管理"** | 进编辑页时菜单上下文不丢 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/layouts/AdminLayout.vue` | flex 布局：左 220px sidebar（品牌 + 分组菜单 + 返回个人中心）+ 右 `<RouterView>` |
| `src/router/index.ts` | 10 个 admin 路由全部收成 `/admin` 父的 children；名字 / 路径都不变（既有 RouterLink 不破坏） |
| `src/views/profile/MePage.vue` | admin 卡片：从 8 个 `→` 链改成 1 个 `.link-cta.primary` "进入后台 →" 蓝底按钮 + 一句功能概述 |
| `src/api/product.ts` | AdminProduct / AdminProductPayload 加 `stock_threshold?`（iter-11 留的类型缺失） |

后端无改动。所有 admin API + 中间件 + 鉴权与 iter-12 起一致。

## 路由结构变化

```
之前（平级）                            现在（嵌套）
/admin       → DashboardPage           /admin  ━━ component: AdminLayout
/admin/products → ProductListPage              ├─ '' (index)     → DashboardPage
/admin/orders   → OrderListPage                ├─ products/      → ProductListPage
/admin/...                                     ├─ orders/        → OrderListPage
                                               ├─ stock-alerts/  → StockAlertsPage
                                               ├─ bad-cases/     → BadCasesPage
                                               ├─ failed-jobs/   → FailedJobsPage
                                               ├─ companies/     → CompanyReviewPage
                                               ├─ knowledge/     → KnowledgePage
                                               └─ products/{id}/edit
```

## 菜单分组

```
运营
  ◫  总览
  ⚠  库存预警
  💬 AI Bad Case
  ⊘  死信队列

业务
  ✓  企业认证审核
  ▤  商品管理
  ◰  订单管理
  ☰  知识库

← 返回个人中心
```

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 4 前端 + 0 后端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 157/157 · pytest 22/22 · Vitest 18/18 · vue-tsc 清 |
| 手动验收 | ⏳ 浏览器打开看：profile 单按钮 → 后台 sidebar 切换菜单 |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. admin 登录（13800000001/admin123）
2. /profile 页 → "管理员后台"卡片只有**一个蓝底"进入后台 →"按钮**
3. 点击 → 进 /admin → 左侧 220px sidebar（运营 / 业务 两分组 + 返回个人中心）+ 右侧 Dashboard
4. 点菜单任一项 → 只换右侧内容；当前项左侧蓝色高亮
5. 进商品编辑页 → 菜单"商品管理"仍高亮（子页面也算同组）
6. 点"← 返回个人中心" → 回 /profile

## 风险与已知问题

| 项 | 说明 |
|----|------|
| 旧链接散落 | 之前哪儿写过 `/admin/xxx` 链接的页面（比如 cart 内的 admin 跳转）继续工作，路由名不变 |
| 移动端 | sidebar 固定 220px 在窄屏会被挤；目前 demo 桌面优先，未做响应式 collapse |
| 顶部全局 nav 仍显示 | 后台是"二级 shell"不是接管全屏；用户能随时点顶 logo 回首页 |
| Vitest 不覆盖布局 | 没加 AdminLayout.spec.ts；视觉变化通过浏览器验收 |

## iteration-21 候选

| 方向 | 简述 |
|------|------|
| 响应式 sidebar collapse | 移动端体验 |
| 后台面包屑 | 深层页面定位（admin > 商品管理 > 编辑 #12） |
| label 协作冲突保护（updated_at 乐观锁） | iter-15 尾巴 |
| 主动登出所有设备 / 设备管理 | iter-18 延伸 |
| 失败作业按时间窗 / 类型 搜索 + 翻页 | iter-19 自身扩展 |
| pgvector / 真实快递鸟 | 阻塞，需用户提供 key |
