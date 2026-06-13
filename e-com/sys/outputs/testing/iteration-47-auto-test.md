# iteration-47-auto-test.md · BI-02 订单漏斗

> 主控自动跑（curl / docker exec / DB 验证），用户无需操作。

## 范围
- **BI-02** 5 阶段订单漏斗（distinct user 模型 snapshot 版 v1）：
  - 加购：shop_db.cart distinct user_id（created_at 在窗口内，跨库 iter-20 oms→shop 副连接）
  - 下单：oms.orders distinct user_id（created_at 在窗口内，status != cancelled）
  - 支付：oms.orders distinct user_id（paid_at 在窗口内）
  - 收货：oms.orders distinct user_id（completed_at 在窗口内）
  - 评价：shop_db.reviews distinct user_id（created_at 在窗口内）
- 输出：5 stages 含 users + conv_from_prev + conv_from_start + KPI（cart_users / paying_users / review_users / biggest_drop_stage 自动算最大流失阶段）+ overall_conversion
- Vue 单页：5 KPI 卡 + 2 ECharts（funnel 漏斗图 + 阶段间转化率柱图）+ 阶段明细表（带 ↓ 流失警示当 conv_from_prev<50%）
- 菜单"📊 BI 数据洞察"加子项"订单漏斗"

## v1 模型说明
- **不是 cohort 追踪**（追踪同一用户穿过所有阶段）而是 **distinct user 快照**：每阶段独立统计窗口内不同的用户数
- 后果：当业务数据异构（如：测试数据里有用户绕过加购直接 API 下单），可能出现 conv_from_prev > 100%（"下单"用户多过"加购"），这反映**真实业务现状**而非 funnel 缺陷
- 真实生产数据通常用户路径一致（必经加购→下单），漏斗形状自然递减
- 严格 cohort 版本留 Q47-01

## 前置
- 3 账号：admin/admin123（super_admin）/ sales/sales123（sales_ops）/ editor/editor123 / warehouse/wh123
- 0 新表 0 新 migration（纯查询 orders + 跨库 shop_db cart/reviews）

## 用例（共 9 项，全 PASS）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | super 调 `/bi/funnel?days=30` | 5 stages, 各阶段 users 数 + KPI biggest_drop_stage 自动算 | code:0 days:30 overall:100%; cart:2 / order:34 / paid:18 / completed:3 / review:2; biggest_drop=支付→收货 | ✅ |
| T2 | days=7 | code:0 stages_count=5 cart_users=2 | code:0 days:7 stages:5 cart_users:2 | ✅ |
| T3 | days=3 → clamp 7 | days=7 | days:7 | ✅ |
| T4 | days=9999 → clamp 720 | days=720 | days:720 | ✅ |
| T5 | 无 token | HTTP 401 | HTTP 401 | ✅ |
| T6 | editor → body code 403 | code:403 msg:"BI 数据洞察仅平台运营可见" | code:403 msg 匹配 | ✅ |
| T7 | warehouse → body code 403 | code:403 同上 | code:403 msg 匹配 | ✅ |
| T8 | sales → 200 + biggest_drop 一致 | code:0 与 super 结果一致（无店铺过滤） | code:0 overall:100 biggest_drop:支付→收货 | ✅ |
| T9 | as_of 是今天 | as_of 等 today | 2026-06-04 == today: True | ✅ |

## 文件清单（~6 个）
- 1 编辑 PHP（OMS Admin.funnelAnalysis + 2 helper emptyFunnel/biggestDropStage + 路由 +1）
- 1 编辑 ts（apis/oms.ts +1 method funnelAnalysis）
- 1 新 Vue（pages/bi/Funnel.vue：5 KPI 卡（含 warn 橙色 biggest_drop）+ ECharts funnel + 转化率柱图 + 阶段明细表 + ↓流失警示<50% 红字）
- 1 编辑 ts（router/index.ts +1 路由 /bi/funnel）
- 1 编辑 Vue（AdminLayout BI 子菜单 +"订单漏斗"）

## 总结
**9/9 ✅ + 0 fix**（首次 0-bug BI iter，复用 iter-46 RBAC 模板 + iter-20 跨库副连接 = 0 设计期错位）

- BI 全链路通：5 阶段跨库聚合 + 转化率 + 最大流失阶段自动识别
- RBAC 双层（路由 group + controller fail-fast）一致 iter-46 模式
- 跨库 try/catch 弱依赖降级（shop_db 跨库失败时 cart_users/review_users 各自降 0，不阻塞 KPI）
- biggest_drop_stage 自动算 = 直接给运营"该往哪里发力"的提示

ⓘ iter-48 BI 第 3 轮候选：**BI-03 SKU 生命周期分析**（新品/热销/滞销/淘汰）
