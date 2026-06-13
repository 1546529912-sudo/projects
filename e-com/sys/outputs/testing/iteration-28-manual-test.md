# iteration-28-manual-test.md · 手动测试清单（用户执行）

> 主控列步骤，用户在 Vue 后台实际操作并回填。
> 遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §不能做（手动测试）边界。

## 前置条件
- auto-test [iteration-28-auto-test.md](iteration-28-auto-test.md) 已 PASS（13/13 ✅）
- Vue dev server 跑（vite 已热更）
- OMS 菜单加 1 新项：**Webhook 订阅**（仅 super_admin 可见）
- Dashboard 加 4 张新财务 KPI 卡（绿/橙/绿/粉）

## 测试用例（共 6 项）

### A · Dashboard 财务维度

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 登录 → 总览 Dashboard | 第三排 4 张新卡片：营收（绿）/ 退款（橙）/ 净金额（绿）/ 多券订单占比（粉）| 实测填写 | ☐ |
| M2 | 切换"近 7 天 / 近 30 天" | 4 张财务卡数据随之变化 | 实测填写 | ☐ |

### B · Webhook 订阅（super_admin 独占）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M3 | admin 登录 → OMS / Webhook 订阅 | 列表显示 auto-test 留下的订阅；含累计推送 / 成功率 / 最近状态列 | 实测填写 | ☐ |
| M4 | 新增订阅 → 填名称 / url（如 https://httpbin.org/post）→ 勾选事件 → 保存 | 列表新增；secret 自动生成显示 32 位 hex | 实测填写 | ☐ |
| M5 | 点"测试推送"按钮 → 1-2 秒后刷新 | 提示"已发起测试推送"；列表 last_fired_at 更新（但 total_fired 不变，因 test 事件不在订阅 events 内）| 实测填写 | ☐ |
| M6 | sales/sales123 登录 → 没有"Webhook 订阅"菜单 | RBAC 隔离 | 实测填写 | ☐ |

## 用户填写指南
每行 `实际` 栏简短描述（"4 张卡显示对 / 列表正常 / 菜单隐藏对"等），`PASS` 栏勾 ✅ 或 ❌。

## 测试时间
（用户填）：_________________________
