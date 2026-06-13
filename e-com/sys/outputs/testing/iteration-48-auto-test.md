# iteration-48-auto-test.md · BI-03 SKU 生命周期分析

> 主控自动跑（curl / docker exec / DB 验证），用户无需操作。

## 范围
- **BI-03** SPU 按 上架天数 / 窗口销量 / 在库 → 5 阶段
- 放 PIM Admin（复用 iter-29 PIM→OMS / PIM→WMS 副连接，0 新基建；OMS Admin 没有 PIM 副连接）
- 跨库聚合：PIM.spus 主表 → 跨库 OMS.order_items（窗口销量）+ 跨库 WMS.inventory（在库可用）
- 输出：5 KPI（total/new/hot/stale/eol + 窗口销量 + 总库存）+ 阶段计数 + SPU 列表分页

## 阶段判定优先级（高到低）

| 阶段 | 规则 |
|---|---|
| 淘汰 | status=offline 或 窗口销量=0 且 在库=0 且 上架>90天 |
| 新品 | 上架 ≤ 30 天（覆盖其他规则） |
| 热销 | 上架 > 30 天 且 窗口销量 ≥ 10 |
| 滞销 | 上架 > 30 天 且 窗口销量 < 5 且 在库 > 0 |
| 一般 | 其他 |

## 前置
- 4 账号：admin/admin123（super）/ sales/sales123 / editor/editor123 / warehouse/wh123
- 0 新表 0 新 migration

## 用例（共 10 项，全 PASS）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | super days=30 | code:0 含 KPI + stages + spus 列表（含跨库销量+库存）| code:0 total_spu:8 / new:8 / 跨库销量 40 / 总库存 637 / 全 8 个 SPU 均"新品"（上架≤30天） | ✅ |
| T2 | days=180 长窗口 | window_total_sales 同或增 | total:8 window_sales:40 | ✅ |
| T3 | days=3 → clamp 7 | days=7 | days:7 | ✅ |
| T4 | days=9999 → clamp 365 | days=365 | days:365 | ✅ |
| T5 | stage=新品 过滤 | filtered_total=8（与 T1 全量一致）| filtered_total:8 spus:8 | ✅ |
| T6 | stage=淘汰（无命中） | filtered_total=0 | filtered_total:0 | ✅ |
| T7 | 无 token | HTTP 401 | HTTP 401 | ✅ |
| T8 | editor → body 403 | code:403 msg:"BI 数据洞察仅平台运营可见" | code:403 匹配 | ✅ |
| T9 | warehouse → body 403（PIM middleware 层 = 不同 msg） | code:403 | code:403 PIM middleware "权限不足，需要角色: ..." | ✅ |
| T10 | sales → 200 同 super | code:0 同 KPI | code:0 total_spu:8 window_sales:40 as_of:今天 | ✅ |

## 实施修复

| # | 问题 | 修复 |
|---|---|---|
| fix-1 | 初版用 `created_at` 字段，spus 表实际是 `create_time`（TP 默认时间戳字段）；spu_status_log 用 `created_at` — 字段名跨表不一致 | 直接读 spus.published_at（spu 自带，更准确）+ create_time fallback；移除 spu_status_log 二次查询。**经验：跨表读 SPU 元数据前先 DESC 表头；同项目内"created_at vs create_time"混用陷阱常见，TP 默认是 create_time** |

## 文件清单（~6 个）
- 1 编辑 PHP（PIM Admin.skuLifecycle + 2 helper lifecycleStage/emptyLifecycle + 路由 +1）
- 1 编辑 ts（apis/pim.ts +1 method skuLifecycle）
- 1 新 Vue（pages/bi/SkuLifecycle.vue：6 KPI 卡 + 阶段 quick filter tag bar + 2 ECharts（阶段分布饼图 + 销量×库存散点）+ SPU 明细表，阶段色映射 5 色）
- 1 编辑 ts（router/index.ts +1 路由 /bi/sku-lifecycle）
- 1 编辑 Vue（AdminLayout BI 子菜单 +"SKU 生命周期"）

## 总结
**10/10 ✅ + 1 fix**（fix 当场抓修）

- BI 全链路通：5 阶段 + 6 KPI + 阶段过滤 + 双图 + 表
- 跨库三方读：PIM 自有 spus/skus + iter-29 PIM→OMS 副连接拿销量 + iter-29 PIM→WMS 副连接拿库存
- RBAC 双层（PIM middleware + controller role guard）
- 0 新表 0 新 migration

ⓘ iter-49 BI 第 4 轮收口候选：**BI-04 异常预警面板**（订单激增 / 库存掉底 / 退款率突升 / 死信积压）
