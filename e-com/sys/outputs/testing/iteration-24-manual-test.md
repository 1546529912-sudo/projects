# iteration-24-manual-test.md · 手动测试清单（用户执行）

> 主控列步骤，用户在 Vue 后台实际操作并回填。
> 遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §不能做（手动测试）边界。

## 前置条件
- auto-test [iteration-24-auto-test.md](iteration-24-auto-test.md) 已 PASS（12/12 ✅）
- Vue 前端跑（vite 已热更）
- WMS 菜单下新增 3 个入口：拣货任务 / 库存日志 / OMS 对账

## 测试用例（共 9 项，仅 UI 交互不能 curl）

### A · 库存日志页

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | 进入 WMS / 库存日志 | 列表显示历史变动；含 8 种 change_type（入库/出库/锁定/解锁/盘盈/盘亏/调出/调入）带不同颜色 tag；delta 正绿负红 | 实测填写 | ☐ |
| M2 | 在筛选区输 ref_no（任意 TR/ST/PK 单号）查询 | 列表过滤为该单号关联的所有 log 条目；before/after 字段展示量变 | 实测填写 | ☐ |

### B · 拣货任务页

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M3 | 进入 WMS / 拣货任务 | 列表 13+ 条；含状态 tag / picked/expected 进度 | 实测填写 | ☐ |
| M4 | 选一个 pending → 点"分配" → 输 warehouse 提交 | 状态变 assigned + operator + assigned_at | 实测填写 | ☐ |
| M5 | 同一任务点"扫描" → 输增量（小于 expected）| picked_qty 增加；如等于 expected 自动 picked | 实测填写 | ☐ |
| M6 | 点已完成任务的"完成"按钮 | 按钮不应显示（已完成不可再操作）| 实测填写 | ☐ |

### C · OMS 对账页

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M7 | 进入 WMS / OMS 对账 | 历史对账列表（auto-test 留下 2 条）+ 触发新对账卡片 | 实测填写 | ☐ |
| M8 | 触发"全量对账" → 等几秒 → 自动弹明细 | 显示 SKU 总数 + 差异数；明细表对差异行高亮粉底；WMS available / OMS available 并列显示；diff 列正负颜色区分 | 实测填写 | ☐ |
| M9 | 点"触发对账"选 SKU 范围 + 输 SKU 编号 → 触发 | 只对账单 SKU；详情仅 1 行 | 实测填写 | ☐ |

## 用户填写指南
每行 `实际` 栏简短描述（"列表正常 / 按钮跟随状态 / 差异高亮对"等），`PASS` 栏勾 ✅ 或 ❌。

## 测试时间
（用户填）：_________________________
