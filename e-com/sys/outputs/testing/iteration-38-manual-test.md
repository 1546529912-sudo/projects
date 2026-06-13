# iteration-38-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-38-auto-test.md](iteration-38-auto-test.md) 已 PASS（7/7 ✅）。

## 前置
- Vue dev server 跑（HMR 接管）
- store#2 商家仓 WH-IPHONE 已建（auto-test 留下）

## 用例（共 5 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 → WMS / 仓库 | 列表 2 行：WH-DEFAULT (平台/自营) + WH-IPHONE (苹果店/商家仓)；顶部加店铺下拉 | 实测填写 | ☐ |
| M2 | 选 "苹果手机专卖" → 仅显示 WH-IPHONE | ✅ | 实测填写 | ☐ |
| M3 | 新增仓库 → 看见"所属店铺"+ "仓库类型"两个新字段 | 字段就位且默认 store#1=平台/self | 实测填写 | ☐ |
| M4 | shopowner1/shop123 登录 → WMS / 仓库 | 仅 WH-IPHONE（store_owner 隔离）；店铺下拉**不显示** | 实测填写 | ☐ |
| M5 | shopowner1 → 实物库存 → 看到自己店的库存（当前为空，因 WH-IPHONE 还没入库） | total=0 显示"暂无数据" | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
