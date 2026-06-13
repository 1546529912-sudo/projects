# iteration-29-manual-test.md · 手动测试清单（用户执行）

> 主控列步骤，用户在 Vue 后台实际操作并回填。
> 遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §不能做（手动测试）边界。

## 前置条件
- auto-test [iteration-29-auto-test.md](iteration-29-auto-test.md) 已 PASS（13/13 ✅）
- Vue dev server 跑（vite 已热更，无需重启）
- PIM 子菜单加 2 项：**PIM 总览** / **操作日志**

## 测试用例（共 7 项）

### A · PIM Dashboard（/pim/dashboard）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 登录 → 左侧菜单"PIM 商品中心" → "PIM 总览" | 6 张 KPI 卡（SPU 总数 / 在售 / 草稿+下架 / SKU / 改价次数 / 低库存）显示；3 张 ECharts 渲染（TOP10 SPU 双轴 / 改价趋势 / 上下架曲线） | 实测填写 | ☐ |
| M2 | 切换"近 7 天 / 近 30 天" radio | 3 张 chart 数据随之变化（loading 一下再渲染） | 实测填写 | ☐ |
| M3 | 滚到页面底部 → 低库存 SPU 表 | 列表按 avail 升序，0 件标红色 tag | 实测填写 | ☐ |

### B · 操作日志（/pim/audit-log）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M4 | 点"PIM 商品中心 / 操作日志" | 表格显示 auto-test 留下的记录（含 brand.update / spu.publish / spu.offline 等）| 实测填写 | ☐ |
| M5 | 在 "动作" 下拉里选 `spu.publish` → 查询 | 列表过滤到 spu.publish 行；before.status / after.status 正确显示 | 实测填写 | ☐ |
| M6 | 真去 "商品 (SPU)" 改任意 SPU 的 base_price → 保存 → 回操作日志刷新 | 顶部新增一行 `spu.update`，before/after 含 base_price 变化 | 实测填写 | ☐ |

### C · RBAC 隔离

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M7 | 退出 → warehouse/wh123 登录 | 左侧没有 "PIM 商品中心" 子菜单（warehouse 角色不可见 PIM）| 实测填写 | ☐ |

## 用户填写指南
每行 `实际` 栏简短描述（"6 KPI 显示对 / 3 图渲染对 / 过滤工作"等），`PASS` 栏勾 ✅ 或 ❌。

## 测试时间
（用户填）：_________________________
