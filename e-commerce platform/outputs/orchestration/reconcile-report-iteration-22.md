# Reconcile Report · Iteration 22（后台面包屑）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：iter-20 / iter-21 后台 layout 已完整；最后一笔加面包屑，让深层页面（如商品编辑）知道自己在哪
- 结论：AdminLayout 内 `CRUMB_MAP`（路由名 → label + parent）；computed `breadcrumb` 反向走 parent；渲染在 content 顶部 sticky-style 横条
- 测试：Vitest 18/18 + vue-tsc 清

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 配置位置 | **AdminLayout 内 CRUMB_MAP** | 路由就 10 个，集中维护比每个路由 meta 散落更好读 |
| trail 算法 | **从当前节点反向走 parent 链** | O(深度)，最多 3 跳；linked-list 模式简单 |
| 末项可点 | **否，仅当前页文字** | 已在当前页，再点击是空跳 |
| 单层时显示 | **只 1 项（如总览）就不渲染** | 减噪 |
| 商品编辑 #N | **动态拼 id** | 一眼看出在编辑哪个 |
| 视觉 | **content 顶部白色横条 + `›` 分隔 + 灰链/黑当前** | 不抢主内容；信息密度低 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/layouts/AdminLayout.vue` | +`CRUMB_MAP` 10 个路由；+`breadcrumb` computed 反向走 parent；+`<nav class="crumbs">` 在 content 顶；末项纯文字其余 RouterLink；商品编辑动态注入 `#${id}` |

后端 0 改动。

## 面包屑示例

| 路径 | 渲染 |
|------|------|
| /admin | （单项，不渲染） |
| /admin/products | 总览 › **商品管理** |
| /admin/products/new | 总览 › 商品管理 › **新建商品** |
| /admin/products/12/edit | 总览 › 商品管理 › **编辑商品 #12** |
| /admin/stock-alerts | 总览 › **库存预警** |
| /admin/bad-cases | 总览 › **AI Bad Case** |
| /admin/failed-jobs | 总览 › **死信队列** |

灰色项可点；加粗黑色项为当前。

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 1 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ Vitest 18/18 + vue-tsc 清；PHPUnit/pytest 不受影响 |
| 手动验收 | ⏳ 浏览器进 /admin/products/12/edit 看 |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. /admin → 单项，不显示面包屑
2. /admin/products → "总览 › **商品管理**"
3. 编辑某商品 → "总览 › 商品管理 › **编辑商品 #N**"
4. 点"总览"或"商品管理" → 跳回；当前页（黑色加粗）不可点

## 风险与已知问题

| 项 | 说明 |
|----|------|
| 新加 admin 路由没在 CRUMB_MAP | 会不渲染（trail 长度 0）→ 视为单项，不显示；不会崩，但要记得加 |
| i18n | 当前硬编码中文；如多语言要把 label 抽到 i18n 文件 |
| 编辑页 id 不存在 | 退化为"编辑商品"（无 #N）；不会崩 |

## iteration-23 候选

| 方向 | 简述 |
|------|------|
| 移动端覆盖式抽屉 sidebar | iter-21 真·移动版 |
| label 协作冲突保护（updated_at 乐观锁） | iter-15 尾巴 |
| 主动登出所有设备 / 设备管理 | iter-18 延伸 |
| 失败作业按时间窗 / 类型 搜索 + 翻页 | iter-19 自身扩展 |
| pgvector / 真实快递鸟 | 阻塞，需用户提供 key |
