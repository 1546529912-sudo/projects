# iteration-17-manual-test.md · 手动测试清单（用户执行）

> **结果（2026-05-28）**：9/9 全过 ✅ — 用户回报 "pass"


> 由主控 Agent 列步骤，用户在 Vue 后台 + curl 实际操作并回填。
> 遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §不能做（手动测试）边界。

## 前置条件
- 自动测试 [iteration-17-auto-test.md](iteration-17-auto-test.md) 已 PASS（12/12 ✅ + 1 bug 修复）
- Vue dev server 在跑（`npm run dev` 后端口 5173）
- 浏览器已清 localStorage（或主动退出登录）

## 测试用例（共 6 项，仅 UI 交互不能 curl）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 登录 | 顶栏显示"超级管理员"tag，左侧菜单看到：总览 / PIM / OMS / WMS / **系统管理** | 实测通过 | ✅ |
| M2 | 点"系统管理" → "管理员用户" → 看到列表 3 行（admin / warehouse / sales）| 列表正常加载 | 实测通过 | ✅ |
| M3 | 点"新增管理员" → 填 `tester / pass123 / 测试 / sales_ops` → 提交 | 列表 +1 行；用 tester/pass123 退出 + 登录验证可登录 | 实测通过 | ✅ |
| M4 | 找到 tester → 点"改密" → 输 `newpass1` → 用 tester/newpass1 登录 | 登录成功；旧密码失效 | 实测通过 | ✅ |
| M5 | 退出 admin → warehouse/wh123 登录 | 顶栏"仓管"tag，左侧菜单**只有**：总览 + WMS（无 PIM / OMS / 系统管理）| 实测通过 | ✅ |
| M6 | warehouse 登录态下，地址栏直接输 `http://localhost:5173/oms/admin-users` 回车 | 页面打开（路由没拦），但 API 返 403，Element Plus toast "加载失败"，列表为空 | 实测通过 | ✅ |
| M7 | 退出 → sales/sales123 登录 | 顶栏"销售运营"tag，左侧菜单**只有**：总览 + PIM + OMS（无 WMS / 系统管理）| 实测通过 | ✅ |
| M8 | sales 登录态下，地址栏直接输 `http://localhost:5173/wms/inbound` 回车 | 同 M6 行为（页面打开但 API 403）| 实测通过 | ✅ |
| M9 | 清理：admin 登录回来 → 删 tester | 列表回到 3 行 | 实测通过 | ✅ |

## 用户填写指南

每行 `实际` 栏请填:
- 简短描述实际看到的现象（"顶栏看到超级管理员 tag" 这种）
- 截图非必需，但可贴

`PASS` 栏勾上 ✅ 或 ❌。

## 在哪报告问题
- 任何步骤实际 ≠ 期望：回贴现象给主控 Agent，主控会修
- 跑完所有 9 项后回报 "manual-test 全过" 或 "X/Y 通过"

## 测试时间
（用户填）：_________________________
