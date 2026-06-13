# iteration-26-manual-test.md · 手动测试清单（用户执行）

> 主控列步骤，用户在 Vue 后台实际操作并回填。
> 遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §不能做（手动测试）边界。

## 前置条件
- auto-test [iteration-26-auto-test.md](iteration-26-auto-test.md) 已 PASS（14/14 ✅）
- Vue 前端跑（vite 已热更）
- OMS 菜单加 2 新项：财务结算单 / WMS 对账（后者仅 super_admin 可见）

## 测试用例（共 8 项，仅 UI 交互不能 curl）

### A · 财务结算单

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | sales/sales123 登录 → OMS / 财务结算单 | 顶部"净金额"卡（绿色边）+ 筛选区 + 列表（订单 + 退款 各至少 1 条）；amount 正绿负红 | 实测填写 | ☐ |
| M2 | 筛选 type=订单 | 仅显示订单结算（绿色金额）；net_amount 跟着变化 | 实测填写 | ☐ |
| M3 | 点未入账行的"入账" → 确认 | 状态变"已入账"+ 入账时间填上 | 实测填写 | ☐ |
| M4 | 点"导出 CSV" → Excel 打开 | 中文不乱码；含订单 + 退款（退款金额带负号）；净金额可以 SUM | 实测填写 | ☐ |
| M5 | warehouse/wh123 登录 → 没有"财务结算单"菜单 | RBAC 隔离 | 实测填写 | ☐ |

### B · WMS 对账（OMS 视角）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M6 | admin/admin123 登录 → OMS / WMS 对账 | 显示 auto-test 留下的对账记录 + 触发新对账卡 | 实测填写 | ☐ |
| M7 | 触发"全量对账" → 弹明细 | 表格列 OMS available / OMS locked / OMS reserved / WMS quantity / WMS locked / WMS available / 差异；差异行高亮粉底 | 实测填写 | ☐ |
| M8 | sales/sales123 登录 → 没有"WMS 对账"菜单 | super_admin 独占 | 实测填写 | ☐ |

## 用户填写指南
每行 `实际` 栏简短描述（"列表正常 / 入账成功 / 中文不乱 / 菜单隐藏"等），`PASS` 栏勾 ✅ 或 ❌。

## 测试时间
（用户填）：_________________________
