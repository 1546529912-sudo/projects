# iteration-18-manual-test.md · 手动测试清单（用户执行）

> **结果（2026-05-29）**：14/14 全过 ✅ — 用户回报 "验证 ok"


> 主控列步骤，用户在浏览器实际操作并回填。
> 遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §不能做（手动测试）边界。

## 前置条件
- 自动测试 [iteration-18-auto-test.md](iteration-18-auto-test.md) 已 PASS（16/16 ✅ + 1 bug 修复）
- Vue dev server 在跑（端口 5173），echarts 已 npm install
- 浏览器以 admin/admin123 登录

## 测试用例（共 10 项，仅 UI 交互不能 curl）

### A · Dashboard 报表（ECharts 渲染）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | 进入"总览" Dashboard 页 | 顶部 4 KPI 卡片 + 4 张图（日订单折线 / 日销售额柱状 / TOP 10 SKU 横条 / 退款率折线）渲染正常，无报错 | 实测通过 | ✅ |
| M2 | 切换时间筛选 "今日 / 近 7 天 / 近 30 天 / 近 90 天" | 4 张图都跟着重新加载 + 数据点数量变化 | 实测通过 | ✅ |
| M3 | 浏览器窗口拉宽/缩窄 | 图表自适应宽度（resize 监听）| 实测通过 | ✅ |
| M4 | 鼠标 hover 任一图表 | tooltip 显示日期 + 数值（销售额带 ¥ + 退款率带 %）| 实测通过 | ✅ |

### B · 导出 CSV（Excel 兼容性）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M5 | OMS/订单页 → 点"导出 CSV" → 用 Excel/Numbers 打开 | 中文不乱码 + 所有列正常显示（订单号 / 收货人 / 金额等）| 实测通过 | ✅ |
| M6 | OMS/退款页 → 点"导出 CSV" → 用 Excel 打开 | 中文不乱码 + 含退款单 + 原订单 + 类型（仅退款/退货退款）| 实测通过 | ✅ |
| M7 | OMS/库存页 → 点"导出 CSV" → 用 Excel 打开 | SKU / 可用 / 锁定 / 预留 / 安全垫 5 列正常 | 实测通过 | ✅ |

### C · 模糊搜索（UI 交互）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M8 | OMS/订单 → 在搜索框输 "138" → 回车 | 列表只剩匹配的订单（地址含 138 的）| 实测通过 | ✅ |
| M9 | OMS/退款 → 搜索框输 "SO" → 查询 | 列表只剩 order_no 含 SO 的退款单 | 实测通过 | ✅ |
| M10 | PIM/商品 → 搜索框输 "SPU0" → 查询 | 列表只剩 SPU code 匹配的 SPU | 实测通过 | ✅ |

### D · 批量操作（多选 + 守卫 + 确认）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M11 | OMS/订单 → 找一个 paid 订单勾选 + 一个 cancelled 订单（cancelled 的 checkbox 应该是**禁用状态**）| cancelled 行不能勾；只能勾 pending_pay/paid | 实测通过 | ✅ |
| M12 | 勾 1 个 paid 订单 → 点"批量取消 (1)" → 弹出原因输入 → 填"测试" → 确认 | 成功 1 单 toast；列表中该订单变为 cancelled | 实测通过 | ✅ |
| M13 | OMS/退款 → 找 pending_approve 单勾选 + 已 refunded 单（refunded 应禁用） → 点"批量通过"| refunded 行 checkbox 禁用；pending_approve 单成功通过 | 实测通过 | ✅ |
| M14 | OMS/退款 → 勾 pending_approve 单 → 点"批量拒绝" → 填原因 → 确认 | 成功 toast；状态变 rejected | 实测通过 | ✅ |
## 用户填写指南

每行 `实际` 栏简短描述（"图表正常 / 切换时数据变化 / Excel 打开正常 / 中文不乱"等），`PASS` 栏勾 ✅ 或 ❌。

## 测试时间
（用户填）：_________________________
