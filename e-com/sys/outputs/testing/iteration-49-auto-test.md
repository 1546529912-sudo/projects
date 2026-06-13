# iteration-49-auto-test.md · BI-04 异常预警面板（**BI 系列收口**）

> 主控自动跑（curl / docker exec / DB 验证），用户无需操作。

## 范围
- **BI-04** 4 类异常预警实时聚合，每个返 level（ok/warn/critical）+ 推荐操作
- 输出统一 schema：`{ key, name, level, current, baseline, ratio, items[], action_hint }`
- summary 顶层 `{ critical, warn, total_checks }` 用于 UI 角标 + auto refresh 30s
- 单 endpoint `/admin/bi/alerts`（不分 4 个 endpoint，节省 4x 网络）

## 4 类预警判定

| key | 算法 | warn 阈值 | critical 阈值 |
|---|---|---|---|
| order_surge | 今日订单 / 7d 均 ratio | 1.5x ≤ ratio < 2.0x 或 ≤ 0.3x | ratio ≥ 2.0x |
| stock_low | WMS 跨库 SKU 低于 stock_alert_rules.threshold（默认 30）SKU 数 | count ≥ 1 | count ≥ 5 |
| refund_rate_spike | 今日退款率 / 7d 均退款率 ratio | 1.2x ≤ ratio < 1.5x | ratio ≥ 1.5x |
| dead_letter_backlog | dead_letter 中 error NOT LIKE '%replayed at%' 的条数 | count ≥ 3 | count ≥ 10 |

冷启动保护：order_surge 当 7d 均 < 3 单 / refund 当今日订单 < 3 单 时降为 ok（避免小样本噪音）

## 前置
- 4 账号：admin/admin123 / sales/sales123 / editor/editor123 / warehouse/wh123
- 0 新表 0 新 migration（复用 dead_letter / refund_orders / orders / stock_alert_rules 跨库）

## 用例（共 10 项，全 PASS）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | super 调 `/bi/alerts` | code:0 含 alerts[] + summary + as_of | code:0 as_of:2026-06-04 summary critical:0 warn:1 total:4 | ✅ |
| T2 | 必有 4 类 key | order_surge / stock_low / refund_rate_spike / dead_letter_backlog | keys 4 个齐 | ✅ |
| T3 | 无 token | HTTP 401 | HTTP 401 | ✅ |
| T4 | editor → body 403 | code:403 msg:"BI 数据洞察仅平台运营可见" | code:403 匹配 | ✅ |
| T5 | warehouse → body 403 | code:403 同上 | code:403 匹配 | ✅ |
| T6 | sales → 200 同 super | code:0 summary 一致 | code:0 summary {critical:0,warn:1} 一致 | ✅ |
| T7 | dead_letter 排除已 replayed | DB 中 2 条，1 backlog + 1 replayed，BI 应识别为 1 backlog | DB 验证 id=1 backlog id=2 replayed；alert dead.current=1 ✅ | ✅ |
| T8 | stock_low items 含 SKU 明细（top 5）| 含 sku_code/avail/threshold/gap | items 含 SPU001-001 avail 177 threshold 999999 gap 999822 | ✅ |
| T9 | 每个 alert 含非空 action_hint | 4 alert 各有具体文案 | ok/warn/critical 各文案均有 | ✅ |
| T10 | summary.warn = level=warn 的 alert 数 | 一致 | warn=['stock_low'] vs summary.warn=1 match True | ✅ |

## 文件清单（~5 个）
- 1 编辑 PHP（OMS Admin.alertSummary + 路由 +1）
- 1 编辑 ts（apis/oms.ts +1 alertSummary）
- 1 新 Vue（pages/bi/Alerts.vue：4 大彩色卡片 grid + level 边框 + emoji icon + current/baseline/ratio + items list（库存掉底 + 死信积压 各显 top 5）+ 顶部 summary tag + 30s 自动刷新 switch + 点卡跳关联页）
- 1 编辑 ts（router/index.ts +1 路由 /bi/alerts）
- 1 编辑 Vue（AdminLayout BI 子菜 +"🚨 异常预警"）

## 总结
**10/10 ✅ + 0 fix（项目第 3 个 0-bug iter）**

- BI-04 全链路通：4 类预警 + level 三态 + items top 5 + auto refresh + 跳关联页
- 冷启动保护（小样本 < 3 时降级 ok）避免开发期假告警
- 单 endpoint 聚合 4 类预警节省 4x 网络（vs 拆 4 endpoint）
- replayed 死信用 error 字段字符串协议识别（沿 iter-42 EFF-08 append-only 模式）
- 0 新表（复用 stock_alert_rules / dead_letter / refund_orders / orders）

## 🎉 BI 系列收口

| 编号 | iter | 状态 |
|---|---|---|
| BI-01 用户 RFM 分层 | iter-46 | ✅ |
| BI-02 5 阶段订单漏斗 | iter-47 | ✅ |
| BI-03 SKU 5 阶段生命周期 | iter-48 | ✅ |
| **BI-04 异常预警面板** | **iter-49** | ✅ |

**整个用户规划路线图（一、二、三、四）全部收口 🎉**

ⓘ iter-50+ 候选：① 回填高优 Q35-03/Q39-03 商家自助提现 / Q40-01 banner 跳转真实 SKU ② 跑积压 manual-test ③ M3+ 生产化（真实支付 / OSS / 性能压测）④ 开 Q-followups
