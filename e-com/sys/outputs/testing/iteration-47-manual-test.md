# iteration-47-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-47-auto-test.md](iteration-47-auto-test.md) 已 PASS（9/9 ✅，0 fix）。

## 前置
- Vue dev server 跑（HMR 接管）
- admin/admin123 或 sales/sales123 登录

## 用例（共 5 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | super 登录 → "📊 BI 数据洞察" 子菜单 → "订单漏斗" | 菜单可见，editor/warehouse 不可见 | 实测填写 | ☐ |
| M2 | 进页面（默认 30 天） | 5 KPI 卡 + 漏斗图（5 阶段倒梯形彩色）+ 转化率柱图 + 阶段明细表 全部渲染 | 实测填写 | ☐ |
| M3 | 切 days 下拉到 7 / 90 / 180 | 数据 + 图重新载入，days 标签同步 | 实测填写 | ☐ |
| M4 | hover 漏斗任一阶段 | tooltip 显"阶段名 / 用户数 / 累计转化%" | 实测填写 | ☐ |
| M5 | 在明细表里看到 "支付→收货" conv_from_prev < 50% 时是否红字 ↓ N.N% | <50% 才显流失警示；上图最大流失阶段 = KPI"最大流失环节" | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
