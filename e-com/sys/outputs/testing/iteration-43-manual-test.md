# iteration-43-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-43-auto-test.md](iteration-43-auto-test.md) 已 PASS（13/13 ✅，2 fix 当场修完）。

## 前置
- Vue dev server 跑（HMR 接管）
- ENV `OMS_REFUND_REVIEW_THRESHOLD_CENTS=100000` + `OMS_EXCHANGE_REVIEW_THRESHOLD_QTY=3` 已写入 .env，OMS 容器已 force-recreate
- 3 测试账号：admin/admin123 / sales/sales123 / **editor/editor123（新加）**

## 用例（共 7 项）

### A · 退款二审 UI（EFF-03，3 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | sales 登录 → OMS / 退款审批 → 找一笔 amount ≥ ¥1000 的 pending_approve → 点"通过" | 状态列除原 tag 外多一个橙色"⚑ 待 super 二审"badge；status 仍 pending_approve | 实测填写 | ☐ |
| M2 | 用同一个 sales 账号再点"通过" | ElMessage 失败 toast "该退款单需 super_admin 二审通过" | 实测填写 | ☐ |
| M3 | 切到 admin 账号 → 同一笔退款单 → 点"通过" | 二审通过；status 跳 approved（refund_only 类型自动 → refunded）；badge 消失 | 实测填写 | ☐ |

### B · 换货二审 UI（EFF-03，2 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M4 | sales 登录 → OMS / 换货审批 → 找一笔 sum(qty) ≥ 3 的 pending_approve → 点"通过" | 状态列加 "⚑ 待 super 二审" badge；status 仍 pending_approve | 实测填写 | ☐ |
| M5 | admin 二审通过 | status → approved；badge 消失 | 实测填写 | ☐ |

### C · PIM editor 角色 UI（EFF-04，2 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M6 | editor/editor123 登录 → 顶部菜单可见 PIM 商品中心 / 不可见 OMS / WMS / 营销 / 系统管理 → 进商品列表新建一个 SPU (含主图) | 列表里有这个 SPU；右上角角色标签显示"商品编辑" | 实测填写 | ☐ |
| M7 | editor 进 SPU 编辑页 → 操作列**不应该看到"发布"和"下架"按钮**（仅"编辑"+"删除"）；切到 admin 同 SPU → 看到"发布" | editor 无发布按钮 / admin 有 | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
