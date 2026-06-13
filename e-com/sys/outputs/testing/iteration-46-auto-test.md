# iteration-46-auto-test.md · BI-01 用户 RFM 分层

> 主控自动跑（curl / docker exec / DB 验证），用户无需操作。

## 范围
- **BI-01** 开启"四、数据洞察"系列第 1 件：用户 RFM 分层
- 新 endpoint OMS `GET /admin/bi/rfm?days=&segment=&page=&size=`
- 算法：R 最近购买距今天数 / F 周期内订单数 / M 周期内累计消费（分）→ **绝对阈值 5 分制**（非分位法，因为业务直观且不依赖样本规模）
- **8 分群规则**（参考 Kotler RFM）：重要价值 / 重要保持 / 不能失去 / 重要发展 / 新客户 / 流失风险 / 休眠 / 流失 / 一般客户
- Vue 单页：6 KPI 卡 + 分群快捷过滤 tag + ECharts 饼图（分群占比）+ R-F 散点图（M 用气泡大小）+ 用户明细表
- 菜单 + 1 父级"📊 BI 数据洞察" + 子项"用户 RFM 分层"（仅 super_admin / sales_ops 可见）

## 评分阈值

| 维度 | 5 | 4 | 3 | 2 | 1 |
|---|---|---|---|---|---|
| R 距今天数 | ≤7 | ≤14 | ≤30 | ≤60 | >60 |
| F 订单数 | ≥10 | ≥5 | ≥3 | ≥2 | 1 |
| M 累计（元）| ≥10000 | ≥3000 | ≥1000 | ≥300 | <300 |

## 前置
- 3 账号：admin/admin123（super_admin）/ sales/sales123（sales_ops）/ editor/editor123 / warehouse/wh123
- 0 新表 0 新 migration（纯查询既有 orders）
- 当前生产数据：user_id=1 17 单 ¥111,730 r_days=0 → R5/F5/M5 → "重要价值"

## 用例（共 11 项，全 PASS）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | super 调 `/bi/rfm?days=90` | code:0 total_users:1 segments:{重要价值:1} | code:0 days:90 total_users:1 segments:{重要价值:1} | ✅ |
| T2 | super 调 days=7 | code:0 days=7 仍能返单 | code:0 days:7 total_users:1 | ✅ |
| T3 | days=3 → clamp 到 7 | days=7 | days:7 | ✅ |
| T4 | days=9999 → clamp 到 720 | days=720 | days:720 | ✅ |
| T5 | segment=重要价值 过滤 | users 命中 1 | filtered_users:1 total_after_filter:1 | ✅ |
| T6 | segment=流失（无命中）过滤 | users=0 | filtered_users:0 total_after_filter:0 | ✅ |
| T7 | 无 token 访问 | HTTP 401 | HTTP 401 | ✅ |
| T8 | editor 角色调用 → 403 body | code:403 msg:"BI 数据洞察仅平台运营可见" | HTTP 200 code:403 msg:BI 数据洞察仅平台运营可见 | ✅ |
| T9 | warehouse 角色调用 → 403 body | code:403 | HTTP 200 code:403 msg:BI 数据洞察仅平台运营可见 | ✅ |
| T10 | sales 角色调用 → 通过 | code:0 total_users>=0 | code:0 total_users:1 segments:{重要价值:1} | ✅ |
| T11 | super 角色 + as_of 字段 | as_of 是今天日期 | total_users:1 as_of:2026-06-04 | ✅ |

## 实施修复

| # | 问题 | 修复 |
|---|---|---|
| fix-1 | 初版用 quintile（五分位）— 当 n=1（单用户）时 user 反而被打 R1/F1/M1 → 休眠分群（语义错）| 改绝对阈值打分（R 按距今天数 / F 按订单数 / M 按消费元数）。**经验：分位法依赖样本规模 ≥ 20，业务系统通常用绝对阈值（业务方更易理解）；分位法更适合大数据集** |
| fix-2 | editor / warehouse 角色未拒绝 BI endpoint（OMS admin group 默认 middleware 不限角色）| controller 顶 `if !in_array(role, ['super_admin','sales_ops']) return 403`。**经验：iter-44 Q44-05 留的"全后端 editor 横切审视"在 BI 系列首次实践 — 新业务接口要显式守允许角色而非依赖默认 group** |

## 文件清单（~6 个）
- 1 编辑 PHP（OMS Admin.rfmAnalysis + 2 私有 helper `emptyKpi` / `rfmSegment` + 路由 +1）
- 1 编辑 ts（apis/oms.ts +1 method）
- 1 新 Vue（pages/bi/Rfm.vue — 6 KPI 卡 + 分群 tag bar 可点过滤 + 2 ECharts（饼图 + 散点）+ 用户表 + R/F/M 三色分数 tag + 分群色映射）
- 1 编辑 ts（router/index.ts +1 路由 /bi/rfm）
- 1 编辑 ts（stores/auth.ts +canSeeBi computed）
- 1 编辑 Vue（AdminLayout.vue +"📊 BI 数据洞察"子菜单 v-if=canSeeBi）

## 总结
**11/11 ✅ + 2 fix**（fix 都在 auto 阶段捕获修完）

- BI 全链路通：endpoint + 6 KPI + 饼图 + 散点 + 表 + 3 维度 days/segment/page 过滤
- RBAC 双层：路由 group 默认 + controller 内 role guard 显式守
- 绝对阈值法避免分位法在小样本下的语义错乱
- 0 新表 0 新 migration（纯查询 orders）

ⓘ iter-47 BI 第 2 轮候选：**BI-02 订单漏斗**（加购→下单→支付→收货→评价）或 **BI-03 SKU 生命周期**
