# iteration-18-auto-test.md · 自动测试报告

> 主控用 curl 跑，**所有"实际"栏含真实 HTTP 输出**。遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §能做边界。
> 跑测时间：2026-05-29

## 测试环境
- 4 后端 Up，OMS + PIM 已重启加载新 controller
- echarts 已 npm install（前端验证留 manual-test）

## 测试用例（共 14 项 + 1 bug 修复）

### B. 导出 CSV

| # | 接口 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| 1 | `GET /admin/order/export` | HTTP 200 + Content-Type `text/csv; charset=UTF-8` + 内容首字节 UTF-8 BOM `\xEF\xBB\xBF` | HTTP=200 Content-Type=text/csv; charset=UTF-8 Size=3949；首行含 `﻿订单号,用户ID,...`（BOM 完整）| ✅ |
| 2 | `GET /admin/refund/export` | HTTP 200 + CSV | HTTP=200 Size=773；含真实退款单数据 | ✅ |
| 3 | `GET /admin/inventory/export` | HTTP 200 + CSV | HTTP=200 Size=302；SKU 列表 | ✅ |

### C. 模糊搜索

| # | 接口 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| 4 | `GET /admin/order/list?keyword=13800138000` | 匹配地址含手机号的订单 | count=26（多条命中）| ✅ |
| 5 | `GET /admin/refund/list?keyword=SO20260528` | 匹配 order_no 前缀的退款 | count=3，含 RF202605281450502352 等 | ✅ |
| 6 | `GET /pim:admin/spu/list?keyword=SPU0` | 匹配 SPU code | count=3，SPU001/002/003 | ✅ |

### A. Dashboard stats 扩展

| # | 接口 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| 7 | `GET /admin/stats?days=7` | time_series 7 行 + top_skus 数组 + refund_series 7 行 | days=7，time_series_count=7，top_skus_count=5，refund_series_count=7；含真实日期/订单数/金额/退款率（69.24%） | ✅ |
| 8 | `GET /admin/stats?days=30` | time_series 30 行（含补 0） | time_series_count=30 ✅ | ✅ |

### D. 批量操作

| # | 接口 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| 9 | `POST /admin/order/batch-cancel` body `{order_nos:[]}` | 400 + `order_nos 不能为空` | `{"code":400,"msg":"order_nos 不能为空","data":null}` | ✅ |
| 10 | 同上 51 个元素 | 400 + `单次最多 50 个` | `{"code":400,"msg":"单次最多 50 个","data":null}` | ✅ |
| 11 | 混合 paid + cancelled + 不存在订单 | 1 ok + 2 failed 且 failed[] 含详情 | （**修 bug 后**）ok_count=1，failed_count=2，明细：cancelled 不支持取消 + 不存在 | ✅ |
| 12 | `POST /admin/refund/batch-approve` body `{refund_nos:[]}` | 400 | `{"code":400,"msg":"refund_nos 不能为空","data":null}` | ✅ |
| 13 | `POST /admin/refund/batch-reject` 缺 reason | 400 | `{"code":400,"msg":"reason 必传","data":null}` | ✅ |
| 14 | `POST /admin/refund/batch-approve` 含 refunded 状态单 + 不存在单 | 0 ok + 2 failed | ok=0，failed=2：状态非法转移 + 不存在 | ✅ |

### E. enforcement 验证（确保新接口仍在 middleware 内）

| # | 接口 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| 15 | `GET /admin/order/export` 无 token | HTTP 401 | HTTP=401 | ✅ |
| 16 | `POST /admin/order/batch-cancel` sales token | HTTP 200（OMS 任意 admin 允许）| HTTP=200 | ✅ |

## 🐛 测试中发现的 1 个 bug（pre-existing，本轮抓到 + 修复）

**iter18-fix-1**（OrderStateMachine 状态机 bug）

- **触发**：批量取消 paid 订单 → 报 `状态非法转移: paid → cancelled`
- **根因**：`OrderStateMachine::TRANSITIONS['paid']` 只允许 `['picking', 'exception']`，不含 'cancelled'。但 `Admin::cancelOrder` controller 注释和校验都声明支持 `pending_pay/paid`
- **影响**：iter-10 后所有 paid 订单的 admin 强制取消（单个 + 批量）实际全部失败 500。但 iter-10 P10-RUN-005 测试时可能只测了 pending_pay
- **修复**：`'paid' => ['picking', 'cancelled', 'exception']`，加入 cancelled
- **diff**：`oms-backend/app/service/OrderStateMachine.php:18`

> 这是 iter-17 起测试拆分流程的第二次"自动测试抓 pre-existing bug"，证明 curl 自动测试不仅覆盖新功能，也能回归发现历史漏网。

## 总结

- 16/16 用例 PASS ✅
- 抓到 + 当场修了 1 个 pre-existing bug ✅
- 跨服务 JWT enforcement（iter-17 引入）依然生效 ✅
- 时间序列补 0 + UTF-8 BOM + 批量失败明细 + 多字段 LIKE OR 全部实测正常 ✅

## 留 manual-test 给用户（详见 iteration-18-manual-test.md）

只能 UI 手动验证的：
- 导出 CSV 双击 Excel 不乱码
- ECharts 4 图表渲染正确（折线/柱状/横条 + tooltip + 时间筛选切换 1/7/30/90 天）
- 多选 checkbox 在不符合状态时禁用
- 批量操作前的 confirm 弹窗

## skill check

按 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §能做边界生产：
- ✅ curl 测 API 响应 + 状态码 + body
- ✅ "实际结果"栏含真实输出
- ✅ 抓到 pre-existing bug 当场修，不让用户去发现
