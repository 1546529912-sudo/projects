# iteration-22-manual-test.md · 手动测试清单（用户执行）

> **结果（2026-06-02）**：9/9 全过 ✅ — 用户回报"测试验证 ok"
> 含 3 个 manual-test 抓到的 UX 修复：iter22-fix-1（库位文本→下拉）/ iter22-fix-2（SKU 文本→搜索下拉）/ iter22-fix-3（库位+SKU 三方智能联动 + disabled 标注）→ 详 [auto-test §四-bis](iteration-22-auto-test.md#四-bismanual-test-抓到的-ux-问题)

> 主控列步骤，用户在 Vue 后台实际操作并回填。
> 遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §不能做（手动测试）边界。

## 前置条件
- 自动测试 [iteration-22-auto-test.md](iteration-22-auto-test.md) 已 PASS（17/17 ✅）
- Vue 前端 5173 端口跑，登录 warehouse/wh123 或 admin/admin123
- WMS 菜单可见

## 测试用例（共 9 项，仅 UI 交互不能 curl）

### A · 实时盘点（Vue WMS/实时盘点）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | 进入 WMS / 实时盘点 | 看到 auto-test 留下的 1 个 completed 盘点单 + 1 个 cancelled | 实测通过 | ✅ |
| M2 | 点"新建盘点单" → scope_type=zone scope_value=A → 提交 | 列表新增 draft 单 | 实测通过 | ✅ |
| M3 | 点新单"详情" → 起盘 → 录入若干行实际数量 → 完成 | 起盘后明细列出系统数；录入后差异列变色（绿/红）；完成后状态变 completed | 实测通过 | ✅ |
| M4 | 完成的盘点单看明细 | 已录入的有 actual_qty + diff；未录入的保持 - | 实测通过 | ✅ |

### B · 调拨（Vue WMS/调拨）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M5 | 进入 WMS / 调拨 | 列表显示 auto-test 留下的几条调拨单（completed + cancelled） | 实测通过 | ✅ |
| M6 | 新建调拨单 → 同仓库不同库位（如 A-01-01-01 → STAGING-01）→ 提交 → 起运 → 接收 | draft → in_transit → completed；状态标签颜色对应；按钮跟随状态切换 | 实测通过 | ✅ |
| M7 | 新建一单 → 起运 → 取消 | 取消提示包含"释放源库位锁定"；状态变 cancelled | 实测通过 | ✅ |

### C · 上架推荐（Vue WMS/入库管理 顶部按钮）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M8 | 进入 WMS / 入库管理 → 点"智能推荐库位" | 弹出对话框含仓库下拉 + SKU 输入框 + 数量；表格区空 | 实测通过 | ✅ |
| M9 | 输入 SKU=SPU001-001 数量=10 → 点"推荐" | 表格出 Top3：A-01-01-01 score=70 含"已有 105 件该 SKU（聚集）"+"黄金库位"两条理由 | 实测通过 | ✅ |

## 用户填写指南
每行 `实际` 栏简短描述（"列表正常 / 起盘 8 条 / 推荐 Top3 显示对"等），`PASS` 栏勾 ✅ 或 ❌。

## 测试时间
（用户填）：_________________________
