# iteration-44-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-44-auto-test.md](iteration-44-auto-test.md) 已 PASS（13/13 ✅，2 fix 当场修完）。

## 前置
- Vue dev server 跑（HMR 接管，AdminLayout 已重载）
- 任一账号登录 admin/admin123 或 sales/sales123 或 editor/editor123

## 用例（共 6 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin 登录 → 顶栏右侧有「🔍 快速搜索 ⌘K」按钮（Mac 显 ⌘K，Win/Linux 显 Ctrl+K） | 按钮可见，显示对应快捷键提示 | 实测填写 | ☐ |
| M2 | Mac 按 **⌘+K**（或 Win/Linux 按 **Ctrl+K**） | 弹出 dialog，输入框自动聚焦 | 实测填写 | ☐ |
| M3 | 输入 `SO`（200ms 防抖后） | 显示 4 个结果分组（📦 订单 / ↩️ 退款 / 🔄 换货 / 🛍 SPU），订单分组 ≥ 1 条 | 实测填写 | ☐ |
| M4 | 点击订单结果第一条 | 关闭 dialog，跳转 `/oms/orders/SO*` 详情页 | 实测填写 | ☐ |
| M5 | 再 ⌘K 唤起 → 输入 `iPhone` → 看 SPU 分组 → 点击 | 跳转 PIM 商品列表（暂未带筛选参数，到列表）| 实测填写 | ☐ |
| M6 | 按 **Esc** 关 dialog；用 editor 账号登录后 ⌘K 输入 SO* | dialog 仍可呼出但 OMS 三组为空（仅 SPU 分组有内容） | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
