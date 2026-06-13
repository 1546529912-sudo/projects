# iteration-39-manual-test.md · 手动测试清单 · BIZ-08 5 轮规划收口

> auto-test [iteration-39-auto-test.md](iteration-39-auto-test.md) 已 PASS（9/9 ✅）。

## 前置
- Vue dev server 跑（HMR 接管）
- 已有店铺 shop-mate / shop-pixel（auto-test 留下），账号 shop-shop-mate / shop-shop-pixel 已建

## 用例（共 7 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 → 系统管理 / 店铺管理 → 新建一个店 → 列表点"通过" | 弹出 HTML 对话框显示账号 + 密码 + 红色警告"密码只显示一次"；可复制 | 实测填写 | ☐ |
| M2 | 用 M1 提示的账号登录 → 系统管理子菜单**不显示**（仅 super_admin）；PIM/OMS 菜单显示 | RBAC + 多店生效 | 实测填写 | ☐ |
| M3 | 新店主登录 → OMS / 订单 → 只看到自己店订单 | 隔离 | 实测填写 | ☐ |
| M4 | 新店主登录 → PIM / 商品 → 只看到自己店 SPU | 隔离 | 实测填写 | ☐ |
| M5 | super_admin → OMS / 财务结算单 → 类型下拉新增"平台抽佣" | 选项就位 | 实测填写 | ☐ |
| M6 | 选"平台抽佣"过滤 | 列表显示 ST...platform_commission 行（auto-test iter-37 留的 -79990）| 实测填写 | ☐ |
| M7 | 小程序进入 store#2 SKU 商品详情 | 价格下方显示 "🏪 由 苹果手机专卖 提供" | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
