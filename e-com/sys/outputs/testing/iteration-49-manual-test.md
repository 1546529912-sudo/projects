# iteration-49-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-49-auto-test.md](iteration-49-auto-test.md) 已 PASS（10/10 ✅，0 fix）。**BI 系列收口轮**。

## 前置
- Vue dev server 跑（HMR 接管）
- admin/admin123 或 sales/sales123 登录

## 用例（共 5 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | super 登录 → "📊 BI 数据洞察 > 🚨 异常预警" | 菜单可见；editor/warehouse 不可见 | 实测填写 | ☐ |
| M2 | 进页面 | 4 张大彩色卡片：📈 订单激增 / 📦 库存掉底 / ↩️ 退款率突升 / 💀 死信积压；每卡显当前值+基线+ratio+提示文案 | 实测填写 | ☐ |
| M3 | 顶部 summary tag 区 | 严重 N / 预警 M / 全部正常 视情况显 | 实测填写 | ☐ |
| M4 | 点击 "💀 死信积压" 卡 | 跳 `/oms/dead-letter` 页面（已 iter-42 建好）| 实测填写 | ☐ |
| M5 | 切换 "30s 自动刷新" 开关 | 开时每 30s 静默刷新；关时停 | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
