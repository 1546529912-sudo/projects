# iteration-18-runbook.md · 运营增强（导出 / 模糊搜索 / Dashboard 报表 / 批量操作）

## 【目标】
按用户给的优先级 **B→C→A→D** 全做：
- **B**：订单 / 退款单 / 库存四态 三处导出 CSV（含 UTF-8 BOM 兼容 Excel）
- **C**：订单（订单号/收货人/手机号）/ 退款单（退款单号/订单号）/ 商品（SPU 名/code）模糊搜索
- **A**：Dashboard 升级——4 张 ECharts 图（日订单 / 日销售额 / TOP 10 SKU / 退款率）+ 时间筛选 1/7/30/90 天
- **D**：订单批量取消 / 退款批量通过 / 退款批量拒绝（单次 ≤ 50 单）

## 【非目标】
- 暗黑模式 / i18n
- Excel xlsx 格式（用 CSV 简化，零依赖）
- ES 全文检索（用 SQL LIKE）
- WMS 模块批量操作（出库/入库单独流程，留 iter-19+）
- PDF 报表

## 一、文件清单（共 17 文件，4+1 Wave）

### Wave B · 导出 CSV（5 文件）
| 类型 | 文件 |
|---|---|
| controller 改 | `oms-backend/app/controller/Admin.php`（+ exportOrders/exportRefunds/exportInventory + 私有 csv() 用 fputcsv 流输出 + UTF-8 BOM）|
| route 改 | `oms-backend/route/app.php`（+ 3 路由 admin/order/export, admin/refund/export, admin/inventory/export）|
| util 改 | `shop-admin/src/apis/http.ts`（+ downloadFile helper：fetch + blob + 触发 `<a download>`）|
| api 改 | `shop-admin/src/apis/oms.ts`（+ exportOrders/exportRefunds/exportInventory）|
| page 改 | `shop-admin/src/pages/oms/Orders.vue` / `Refunds.vue` / `Inventory.vue`（各加"导出 CSV"按钮）|

### Wave C · 模糊搜索（6 文件）
| 类型 | 文件 |
|---|---|
| controller 改 | `oms-backend/app/controller/Admin.php`（orderList 加 keyword LIKE on order_no + address JSON）|
| service 改 | `oms-backend/app/service/RefundService.php`（listForAdmin 加 keyword LIKE on refund_no + order_no）|
| controller 改 | `oms-backend/app/controller/Refund.php`（adminList 传 keyword 到 service）|
| controller 改 | `pim-backend/app/controller/Product.php`（adminList keyword 扩展匹配 code）|
| page 改 | `shop-admin/src/pages/oms/Orders.vue`（+ keyword 输入框）|
| page 改 | `shop-admin/src/pages/oms/Refunds.vue`（替换 order_no 输入为 keyword 输入）|
| page 改 | `shop-admin/src/pages/pim/Products.vue`（keyword placeholder 改为"SPU 名 / 编码"）|

### Wave A · Dashboard 报表升级（4 文件）
| 类型 | 文件 |
|---|---|
| controller 改 | `oms-backend/app/controller/Admin.php`（stats 大幅扩展：days 参数 + time_series 日订单/销售额 + top_skus + refund_series 日退款率）|
| config 改 | `shop-admin/package.json`（+ echarts ^5.5.0，~600KB gzipped）|
| api 改 | `shop-admin/src/apis/oms.ts`（stats 接受 days 参数）|
| page 重写 | `shop-admin/src/pages/Dashboard.vue`（4 个图表 + el-radio-group 时间筛选 + window resize 监听 + onBeforeUnmount dispose 防泄漏）|

### Wave D · 批量操作（5 文件）
| 类型 | 文件 |
|---|---|
| controller 改 | `oms-backend/app/controller/Admin.php`（+ batchCancelOrders：单次 ≤50，每单独立事务，返回 ok_count + failed_count + failed[]）|
| controller 改 | `oms-backend/app/controller/Refund.php`（+ batchApprove / batchReject）|
| route 改 | `oms-backend/route/app.php`（+ 3 batch 路由，plain 放参数前防冲突）|
| api 改 | `shop-admin/src/apis/oms.ts`（+ batchCancelOrders / batchApproveRefunds / batchRejectRefunds）|
| page 改 | `shop-admin/src/pages/oms/Orders.vue`（+ 多选 column + 批量取消按钮 + canBatchCancel 状态守卫）|
| page 改 | `shop-admin/src/pages/oms/Refunds.vue`（+ 多选 column + 批量通过/拒绝按钮）|

### Wave E · 文档（3 文件）
- iteration-18-runbook.md（本文件）
- reconcile-report-iteration-18.md
- progress.md 追加 iter-18 块

合计代码量：~900 行 PHP / ~600 行 Vue/TS。

## 二、关键设计决策

| 主题 | 决策 |
|---|---|
| 导出格式 | CSV + UTF-8 BOM（双击 Excel 不乱码），**不**用 PHPSpreadsheet（避免 ~5MB 依赖）|
| 大数据导出 | 单次 limit 5000，超过需要分批 + 后台任务（留 M3+）|
| 下载触发 | fetch blob + `<a download>`（带 Authorization 头），不能用直接 `<a href>` |
| 搜索方式 | SQL LIKE %% 模糊 + 多字段 OR，**不**引入 ES |
| 图表库 | ECharts 5（业内标配，~600KB gzipped，企业后台 SOTA），用裸 echarts 不用 vue-echarts 包装层（少一层依赖）|
| 时间序列补 0 | 后端 query 不返回的日期，PHP 补 0 行（避免前端日期对齐复杂度）|
| 批量上限 | 单次 ≤ 50 单（防超时 + 防误操作）|
| 批量失败策略 | 每单独立事务 + 失败不阻塞其他单 + 详细返回 failed[] |
| 多选可选条件 | `:selectable` 函数过滤（pending_pay/paid 可批量取消；pending_approve 可批量审批）|

## 三、API 矩阵新增

| 端点 | 方法 | 角色 | 说明 |
|---|---|---|---|
| `/admin/order/export` | GET | 任意 admin | 按 status + keyword 筛选导出 |
| `/admin/refund/export` | GET | 任意 admin | 按 status + type + keyword 筛选导出 |
| `/admin/inventory/export` | GET | 任意 admin | 全表导出 |
| `/admin/order/batch-cancel` | POST | 任意 admin | body `{order_nos[], reason}` |
| `/admin/refund/batch-approve` | POST | 任意 admin | body `{refund_nos[]}` |
| `/admin/refund/batch-reject` | POST | 任意 admin | body `{refund_nos[], reason}` |
| `/admin/stats?days=N` | GET | 任意 admin | days 1/7/30/90 |

## 四、待用户运行（3 步）

```bash
cd /Users/linfeng/Desktop/project/e-com/sys/apps

# 1. OMS 重启（加载导出 + 批量 + stats 扩展 controller）
docker-compose restart oms-backend pim-backend

# 2. Vue dev 自动 HMR 加载（echarts 已 npm install）
# 如果 vite dev 没在跑：
# cd shop-admin && npm run dev

# 无新 migration
```

## 五、本轮主动避坑

| 风险 | 规避 |
|---|---|
| Excel 打开中文 CSV 乱码 | UTF-8 BOM `\xEF\xBB\xBF` 前缀 |
| 导出大数据导致 OOM | 单次 limit 5000；超过留 M3+ 分批 |
| 下载 fetch 没带 token | downloadFile helper 显式加 Authorization header |
| 批量操作部分失败拖整组失败 | 每单独立 try/catch + 事务，失败明细返回不阻塞 |
| TP 路由参数路由先于 plain | batch 路由用 plain `admin/order/batch-cancel`，放参数路由 `admin/order/<orderNo>/cancel` 之前 |
| ECharts dispose 不及时导致内存泄漏 | onBeforeUnmount 显式 dispose + removeEventListener |
| ECharts window resize 不响应 | 监听 resize + 调 chart.resize() |
| 时间序列日期不连续 | 后端 PHP 补 0 行（前端不用处理日期对齐）|
| 退款率分母 0 | `paid > 0 ? round(...) : 0` |
| 多选选了不符合状态的单 | `:selectable` 函数禁用 checkbox |
| 批量操作 50 单超过限制 | controller 显式 count > 50 报 400 |

## 六、与历史 iter 对账

| iter | 主题 | iter-18 关联 |
|---|---|---|
| iter-7 | Vue 后台读 | iter-18 给所有 list 页加搜索 + 导出 + 报表 |
| iter-10 | 后台 PIM CRUD | iter-18 给 PIM 商品页加 SPU code 搜索 |
| iter-15 | audit log | iter-18 批量操作每单都写 audit |
| iter-17 | RBAC enforcement | iter-18 新接口全部在 AdminAuth middleware 内 |
| **iter-18** | **运营增强：导出/搜索/报表/批量** | **本轮** |

## 七、剩余非阻塞（M3+）

| 编号 | 事项 |
|---|---|
| Q18-01 | Excel xlsx 格式导出（含样式 / 合并单元格）|
| Q18-02 | 大数据分批导出（异步任务 + 邮件通知）|
| Q18-03 | 全文搜索（订单 + 商品 + 退款单 → MeiliSearch / OpenSearch）|
| Q18-04 | Dashboard 自定义指标 + 拖拽布局 |
| Q18-05 | 批量操作扩展到 WMS（出库 / 入库批量完成）|
| Q18-06 | 导出 PDF 报表 |
| Q18-07 | 报表订阅（每日 / 每周邮件）|

## 八、时间
2026-05-29
