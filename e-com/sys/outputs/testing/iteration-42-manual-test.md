# iteration-42-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-42-auto-test.md](iteration-42-auto-test.md) 已 PASS（7/7 ✅）。

## 前置
- Vue dev server 跑（HMR 接管）
- 顶部菜单 + 1 项：**📋 待办中心**
- 系统管理子菜单 + 1 项：**死信中心**

## 用例（共 7 项）

### A · 待办中心（EFF-05）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 → 顶部菜单"📋 待办中心" | 6 张卡片网格，每卡显示 icon/标签/数字/箭头；底部信息条显示 total | 实测填写 | ☐ |
| M2 | 点击"待付款订单" 卡片 | 跳转到 OMS 订单列表（路由 /oms/orders）| 实测填写 | ☐ |

### B · OMS 高级搜索（EFF-01）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M3 | OMS / 订单 → 顶栏点 "高级搜索 ▼" | 展开折叠 card，含手机号/用户 ID/SKU 反查/金额范围/时间范围 5 行 | 实测填写 | ☐ |
| M4 | SKU 反查 输入 `SPU001-001` → 应用 | 列表筛选成含该 SKU 的订单 | 实测填写 | ☐ |
| M5 | 重置 → 收起 | filter 清空，列表全部显示 | 实测填写 | ☐ |

### C · 死信中心 + replay（EFF-08）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M6 | 系统管理 / 死信中心 | 列表 ≥ 1 条；列含 stream/error/retry_count | 实测填写 | ☐ |
| M7 | 点 payload → 看 JSON 弹框；点 replay → 确认 → toast "已 replay · 新 message_id=..." → 刷新看 error 文本变绿（含 "replayed at"）| 全流程通 | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
