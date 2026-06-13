# iteration-35-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-35-auto-test.md](iteration-35-auto-test.md) 已 PASS（12/12 ✅）。

## 前置
- Vue dev server 跑（HMR 已接管）
- OMS 系统管理子菜单加 1 项：**店铺管理**（super_admin 独占）

## 用例（共 6 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 → 系统管理 → 店铺管理 | 列表显示 1 条"平台自营"（id=1，红字加粗，approved）；列含 ID/code/名称/状态 tag/抽佣率/联系信息 | 实测填写 | ☐ |
| M2 | 点"新建店铺" → 填 code=shop-test / 名称=测试店 / 抽佣 0.06 → 保存 | 列表新增 1 行，status=pending（黄 tag） | 实测填写 | ☐ |
| M3 | 点该行"通过" → 确认 | status 变 approved，按钮变成"暂停 / 改抽佣" | 实测填写 | ☐ |
| M4 | 点"详情" → 看店铺信息 + 管理员列表（默认空）→ 点"添加管理员" → 输入 admin_user_id=2 → role=store_owner → 保存 | 详情对话框管理员列表新增 1 行 warehouse / store_owner | 实测填写 | ☐ |
| M5 | 点"暂停" → 输入原因"测试" → 列表 status 变 suspended（红 tag），按钮变"恢复" | 实测填写 | ☐ |
| M6 | sales/sales123 登录 → 系统管理子菜单**不该出现**（仅 super_admin 可见） | 实测填写 | ☐ |

## 用户填写指南
每行 `实际` 栏简短描述（"平台店红字 / 新建对 / 审批 OK / RBAC 对"等），`PASS` 栏勾 ✅ 或 ❌。

## 测试时间
（用户填）：_________________________
