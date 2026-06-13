# iteration-45-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-45-auto-test.md](iteration-45-auto-test.md) 已 PASS（9/9 ✅，2 fix 当场修完）。

## 前置
- Vue dev server 跑（HMR 接管）
- 在**手机浏览器**或 Chrome devtools mobile 模式（iPhone 12 / Pixel 5 视口）打开
- 直接访问 `http://localhost:5173/pda/login`（不进 admin layout）
- 测试账号：warehouse / wh123

## 用例（共 8 项）

### A · 登录 + 首页（2 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | 访问 `/pda/login` | 红色 brand "📦 WMS PDA" + 2 输入框 + 大红按钮，无 admin 左侧菜单 | 实测填写 | ☐ |
| M2 | warehouse / wh123 登录 | 跳 `/pda`，header 显 "WMS PDA"，看到 2 张大卡片（📦 拣货任务 / 📥 入库扫码），右上角"退出" | 实测填写 | ☐ |

### B · 拣货流（3 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M3 | 点"拣货任务"卡片 → 默认 tab "我的任务" → 切到 "待领取" 看 pending 任务 | 列表卡片显示 SKU code 大字、出库单号、`X/Y` 进度、状态 tag；待领取项有"领取此任务"按钮 | 实测填写 | ☐ |
| M4 | 领取一个任务（status assigned → 自动回到列表） → 切回"我的任务" → 点开始扫码 | 进入详情页：大数字进度 `0/1` + 红色进度条 + 扫码输入框自动 focus | 实测填写 | ☐ |
| M5 | 在扫码框**输入正确 SKU code** 按 Enter；再输错 SKU 按 Enter | 正确：+1 toast 绿色，1/1 后变 "已完成 ✅" 1s 后跳回列表；错码：toast 红色"SKU 不匹配"，picked 不动 | 实测填写 | ☐ |

### C · 入库流（2 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M6 | 回 `/pda` 点"入库扫码"卡片 → 列表 | 卡片列表显示入库单号 + 仓库 + 时间 + 状态 tag | 实测填写 | ☐ |
| M7 | 点开一张 pending 入库单 → ⚡ 一键完成 | 顶部入库单号 + 物品清单（× N）；按按钮 1s 后 toast"✅ 入库完成"，跳回列表，该单消失 | 实测填写 | ☐ |

### D · 边界（1 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M8 | 退出登录 → 直接访问 `/pda/picking` | 自动跳 `/pda/login`（不是 `/login`） | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
