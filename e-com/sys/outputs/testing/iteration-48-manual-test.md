# iteration-48-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-48-auto-test.md](iteration-48-auto-test.md) 已 PASS（10/10 ✅，1 fix 当场修完）。

## 前置
- Vue dev server 跑（HMR 接管）
- admin/admin123 或 sales/sales123 登录
- 当前 DB 8 个 SPU 均上架 ≤ 30 天，所以全显"新品"分类 — 真实场景 SPU 久了会出现热销/滞销分布更丰富

## 用例（共 5 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | super 登录 → "📊 BI 数据洞察" 子菜 → "SKU 生命周期" | 菜单可见；editor/warehouse 不可见此项 | 实测填写 | ☐ |
| M2 | 进页面 days=30 默认 | 6 KPI 卡 + 阶段过滤 tag + 饼图（新品 8）+ 散点（销量×库存）+ SPU 明细表（按销量降序）全渲染 | 实测填写 | ☐ |
| M3 | 切 days=7 / 90 / 180 | 数据重新载入，KPI 更新 | 实测填写 | ☐ |
| M4 | 点击 tag "新品" → 表筛选；再点取消 → 全表回来 | tag 变深色筛选；清除按钮显隐 | 实测填写 | ☐ |
| M5 | hover 散点任一气泡 | tooltip 显"商品名 / 销量 / 在库 / 上架 N 天" | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
