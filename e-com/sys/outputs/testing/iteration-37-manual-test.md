# iteration-37-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-37-auto-test.md](iteration-37-auto-test.md) 已 PASS（10/10 ✅，1 fix-1）。

## 前置
- Vue dev server 跑（HMR 已接管）
- `OMS_MULTI_STORE_SPLIT` 默认 false（多店拆单未启用 — 这是有意的，待 iter-38/39 灰度）

## 用例（共 5 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 → OMS / 订单 | 列表顶部加"店铺"下拉（含全部 + 平台 + shop-iphone）；表格首列加"店铺" tag 列 | 实测填写 | ☐ |
| M2 | 选 "苹果手机专卖" → 查询 | 列表只显示 store_id=2 的订单（auto-test 拆单造的 SO20260603152034... 应有 1 条）| 实测填写 | ☐ |
| M3 | shopowner1/shop123 登录 → OMS / 订单 | 店铺下拉**不显示**（store_owner 不可选店）；列表只看 store#2 自己店；表格也无店铺列 | 实测填写 | ☐ |
| M4 | shopowner1 → 详情看自己店子单 → 操作正常（取消/恢复等）| 操作不受影响（store#2 权限内）| 实测填写 | ☐ |
| M5 | admin → 财务结算单 → 找 SO202606031520348483（store#2 子单）的 settlement | 应有 2 行：1 order +800900 + 1 platform_commission -79990 | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
