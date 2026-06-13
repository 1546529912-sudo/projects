# iteration-46-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-46-auto-test.md](iteration-46-auto-test.md) 已 PASS（11/11 ✅，2 fix 当场修完）。

## 前置
- Vue dev server 跑（HMR 接管）
- admin/admin123 或 sales/sales123 登录
- 当前 DB 仅 user_id=1 一个购买用户（17 单 ¥111,730），所以分群只会显示"重要价值"一类 — 真实多用户场景效果会更直观

## 用例（共 6 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | super 登录 → 左侧菜单出现"📊 BI 数据洞察 > 用户 RFM 分层" | 菜单可见，editor/warehouse 不可见此菜单 | 实测填写 | ☐ |
| M2 | 点击进入 RFM 页面 | 6 张 KPI 卡 + 分群 tag bar + 饼图 + R-F 散点图 + 用户表全部渲染 | 实测填写 | ☐ |
| M3 | 切换 days 下拉到"最近 30 天" / "最近 365 天" | 表格 + 图重新加载，days 标签更新 | 实测填写 | ☐ |
| M4 | 点击 "重要价值" tag | tag 变深色，用户表筛选到该分群；再点击取消，全表回来 | 实测填写 | ☐ |
| M5 | 散点图 hover 任一气泡 | tooltip 显示"用户 X / 距今 N 天 / N 单 / ¥N"；气泡大小随金额变化 | 实测填写 | ☐ |
| M6 | sales 账号登录 → 同 BI 菜单 → 同样可访问；editor/warehouse 直接 URL `/bi/rfm` 触底 → 弹 403 提示 | sales 可见，editor/warehouse 后端拒 403 | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
