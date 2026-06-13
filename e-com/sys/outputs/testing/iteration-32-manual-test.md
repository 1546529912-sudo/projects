# iteration-32-manual-test.md · 手动测试清单（用户执行）

> 主控列步骤，用户在 Vue 后台实际操作并回填。

## 前置条件
- auto-test [iteration-32-auto-test.md](iteration-32-auto-test.md) 已 PASS（13/13 ✅）
- Vue dev server 跑（vite 热更已接管）
- WMS 菜单 12 → 14 项（加：**盘点定时** / **WMS 配置** 仅 super_admin）

## 测试用例（共 8 项）

### A · 低库存 Webhook 通知

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 → WMS / 低库存预警 | 表格新增 2 列：Webhook 通知（绿 tag "已配 · 冷却 N分" 或 "未配"）+ 最近推送时间 | 实测填写 | ☐ |
| M2 | 编辑任意规则 → dialog 底部"外部通知（iter-32 A）"区域 | 看见 Webhook URL 输入框 + 冷却分钟数字框；签名提示文案在下方 | 实测填写 | ☐ |
| M3 | 填 URL = https://httpbin.org/post，冷却 1 分钟，阈值改大让触发 → 保存 → 等 1-2 分钟刷新 | 列"最近推送"显示具体时间戳（说明 supervisord loop 推送成功）| 实测填写 | ☐ |

### B · 盘点定时调度

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M4 | WMS / 盘点定时 → 看见 auto-test 留的 1 条 daily 调度 | 列表渲染 + 频率列显示"每日 02:00" + 范围列"全仓" | 实测填写 | ☐ |
| M5 | 新建调度 → 切到 weekly → 勾选 一/三/五 → 时间 09:30 → 保存 | 列表新增 1 行 + 频率列显示"每周 一、三、五 09:30" | 实测填写 | ☐ |
| M6 | 点该行"手动触发" → 1 秒后 toast "已建盘点单 ST..." → 实时盘点页应能看到该单 | 真盘点单建出 + 该调度行"最近触发"显示时间戳 | 实测填写 | ☐ |

### C · 推荐权重配置

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M7 | admin 登录 → WMS / WMS 配置 | 表单展示 5 项权重（existing/golden/sameZone/capacity/capacityThreshold）+ 每项下方写默认值；底部 Alert 显示打分公式 | 实测填写 | ☐ |
| M8 | sales/sales123 登录 → WMS 菜单 | 完全无 WMS 子菜单（sales 角色不可见 WMS） | 实测填写 | ☐ |

## 用户填写指南
每行 `实际` 栏简短描述（"webhook 列对 / 触发后建单对 / 公式显示对"等），`PASS` 栏勾 ✅ 或 ❌。

## 测试时间
（用户填）：_________________________
