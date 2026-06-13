# iteration-36-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-36-auto-test.md](iteration-36-auto-test.md) 已 PASS（13/13 ✅）。

## 前置
- Vue dev server 跑（HMR 已接管）
- 已有店铺 #1 platform / #2 shop-iphone（status=approved）
- 已有测试账号 `shopowner1 / shop123`（绑定 store#2，role=store_owner）

## 用例（共 7 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 登录 → PIM / 商品 (SPU) | 列表顶部有"店铺"下拉（含"全部店铺"+ 平台自营 + shop-iphone）+ 表格首列含"店铺"tag 列 | 实测填写 | ☐ |
| M2 | 选 "苹果手机专卖（id=2）" → 查询 | 列表只显示 store_id=2 的 SPU（应有 2 条：iter-36 test + shopowner1 自建的） | 实测填写 | ☐ |
| M3 | 不选店铺 / "全部" → 查询 | 列表所有 SPU 都显示，每行显示对应店铺 tag | 实测填写 | ☐ |
| M4 | 退出 → shopowner1/shop123 登录 → PIM / 商品 (SPU) | **店铺下拉不显示**（store_owner 不能选）；列表只有 store#2 的 SPU；表格也**无店铺列**（仅 1 个店没必要显示） | 实测填写 | ☐ |
| M5 | shopowner1 → 编辑某个非自己店的 SPU URL 直输（如 /pim/products/edit/1） | 提示"无权访问此店铺数据"或 spuDetail 接口 403 | 实测填写 | ☐ |
| M6 | shopowner1 → 新建 SPU → 填基本信息保存 | 自动归 store#2，列表出现新行；不需要选店铺 | 实测填写 | ☐ |
| M7 | shopowner1 看左侧菜单 | PIM 菜单可见；WMS 菜单不可见（store_owner 不见 WMS）；系统管理子菜单不可见 | 实测填写 | ☐ |

## 用户填写指南
每行 `实际` 栏简短描述（"下拉对 / 隔离对 / 自动归店对"等），`PASS` 栏勾 ✅ 或 ❌。

## 测试时间
（用户填）：_________________________
