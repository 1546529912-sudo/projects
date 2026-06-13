# progress.md · 任务进度（唯一真相源）

> **写入权限**：只有主控 Agent 可回写本文档。其他 Agent 只读。

> **⚠️ 测试硬约束（2026-05-28 用户加）**：每个 iter 代码交付后必须**强制拆**两份产物到 [outputs/testing/](outputs/testing/)：
> - `iteration-N-auto-test.md` — 主控自己跑 curl / phpunit / 文件检查，**实际结果栏必须填真实输出**
> - `iteration-N-manual-test.md` — 列步骤给用户勾，仅限 UI 点击 / 真机 / 视觉对比类
> 边界遵循 [`.agents/testing/SKILL.md`](.agents/testing/SKILL.md)：能 curl 测的不允许丢给用户。先跑完自动那份再叫用户。

## 【当前焦点】
- **iter-60~65 中低优 Q 大清扫批次二完成（2026-06-04）**：6 轮一气呵成，关闭 ~30 个 medium+low Q
  - iter-60 内容运营深化：Q40-02 / Q40-03 / Q41-02 / Q41-03 / Q41-04（banner 按店 + 推荐位 RFM 个性化 + 营销日历甘特图 + 专题 link + 冲突预警）
  - iter-61 多店深化：Q37-01 + Q37-02 + Q35-04 + Q38-01（KV 灰度 SPLIT + 多店券按 goods 比例分摊 + 跨店调拨平台代理审核）
  - iter-62 商家自助入驻 + Refund Model 全替换：Q39-01 + Q28-05（小程序 merchant-apply 4 文件 + RefundService 12 处 Db::name → Refund::query）
  - iter-63 BI 深化 11 endpoint：Q46-01/03/04 + Q47-01~04 + Q48-02 + Q49-02/04（RFM 分位法/趋势/客户卡 + Funnel cohort/timeseries/category/drop-reasons + lifecycle trend + alerts history + 4 新预警）
  - iter-64 效率深化：Q42-01/02/03 + Q43-02 + EFF-06（todos delta/severity + admin_views 我的视图 + stream_replay_policies + 二审备注 + 操作日志撤销）
  - iter-65 换货 v2 + PDA + ⌘K：Q34-01 + Q45-01~04 + Q44-01~04（v2 联动库存 + 摄像头扫码 + 入库分步 + 离线缓存 + 任务卡图 + ⌘K 历史/上下选/SPU 跳列表带 q）
- **批次一+批次二合计关闭 ~50 个 Q**（51~59 关 20 + 60~65 关 30）

## 🚫 **仍未做的项**（剩余仅外部基础设施 + supervisord 进程）
- **Q42-03 worker** dead_letter 自动 replay 进程（表和策略已加；需 supervisord loop）
- **Q35-03 真实打款 API** — 银行 / 支付宝 / 微信对接（Q50-05）
- **M3-02 真实微信支付 v3 + SMS** — 真生产接入
- **M3-07 OSS / CDN 图片存储** — 真生产化基础设施
- **M3-08 性能压测 hey/wrk** — 需外部工具 + 真实负载脚本

- **iter-72 真中优 4 项完成（2026-06-05）**：Q42-03 worker（dead-letter:auto-replay command + supervisord）+ Q43-04 editor 完整隔离（OMS+WMS StoreContextService 返 []）+ Q35-01/Q39-02 店铺装修（store_pages 表 + StorePageService + 4 endpoint）+ Q26-02 结算单审批流（settlements +4 列 + approve/reject endpoint）

- **iter-70~71 低优 Q 批次四完成（2026-06-05）**：2 轮一气呵成，关闭 10 项（多店/商家 5 + PIM/导出 5）
  - iter-70 多店/商家：店铺平台搜索按评分排序 / categories+brands store_id / SPU 批量改 store / webhook_delivery_log 表+日志 hook + 查询 endpoint / 多 consumer 文档化
  - iter-71 PIM/导出：export_tasks + import_tasks 异步任务表 + ExportTaskService 完整 lifecycle 4 scope / spu_attributes 反范式表 + Product.create/update 同步 / image_library recount endpoint

- **iter-67~69 低优 Q 批次三完成（2026-06-05）**：3 轮一气呵成，关闭 ~29 个 low Q
  - iter-67 优惠券/评价/收藏（14 项）：退款返券 + 分享 share_token + 评价多维 + 点赞 + 商家回复 + 收藏分组 + 地址 LBS + 券核销漏斗 + 自动规则 order_n_threshold
  - iter-68 BI/Dashboard（5 项）：留存时间窗 + 复购 + 评价周/月 + 自定义日期 stats + webhook 试发
  - iter-69 WMS/拣货/调拨（10 项）：盘点 CSV / 调拨部分接收 / 行级取消 / 调拨 CSV / 库位精确容量 max_quantity / 拣货 operator 维度 / wms_configs +4 新 key

- **iter-66 代码全量交付（2026-06-05）· Q48-04 时间字段命名统一**：PIM 4 表 create_time/update_time → created_at/updated_at（ALTER TABLE CHANGE COLUMN 0 数据丢失）+ pim-backend/Admin.php replace_all 7 处
- 0 风险：grep 全 4 工程 0 命中遗留；BFF / Vue / 小程序响应 schema 不变

## 📋 待跑 manual-test：约 34 份（iter-24~34 + iter-42~65）

- iter-65 代码全量交付（2026-06-04）：Q34-01 换货 v2 联动库存 + Q45-01~04 PDA 摄像头扫码/入库分步/离线缓存/任务卡图 + Q44-01~04 ⌘K 微调（手机号 7-11 位/SPU 跳带 q/localStorage 历史/快捷键 ↑↓Enter）
- iter-64 代码全量交付（2026-06-04）：Q42-01 todos 24h delta+color + Q42-02 admin_views 我的视图 + Q42-03 stream_replay_policies + Q43-02 二审备注 + EFF-06 操作日志撤销
- iter-63 代码全量交付（2026-06-04）：BI 11 deepening endpoints — RFM 分位/趋势/客户卡 + Funnel cohort/ts/cat/drop + lifecycle trend + alerts history + 4 新预警
- iter-62 代码全量交付（2026-06-04）：Q39-01 商家自助入驻（小程序 merchant-apply）+ Q28-05 Refund Model 全替换
- iter-61 代码全量交付（2026-06-04）：Q37-01+Q35-04 多店满减券分摊（goods 比例 + 最大子单余数）+ Q37-02 KV 灰度 + Q38-01 跨店调拨平台代理（needs_review/reviewed_at + ship 守）
- iter-60 代码全量交付（2026-06-04）：Q40-02 banner 按店 + Q40-03 推荐位 RFM 个性化 + Q41-02 甘特图视图切换 + Q41-03 banner.link=topic + Q41-04 冲突预警 + 行高亮

- **iter-51 代码全量交付（2026-06-04）**：小程序内容运营断链修复 · **banner/featured/topic 点击直跳详情**（Q40-01 + Q41-01）
- auto-test 8/8 ✅，**0 fix**
- ~6 文件：1 编辑 PHP（BannerService 加 fetchFirstSkuCodes helper + publicListBanners 写 link_sku + publicListFeatured 写 sku_code）+ 1 编辑 PHP（MarketingTopicService 同 helper + publicListTopicByCode 写 sku_code）+ 2 编辑小程序 home（index.js onBannerTap+onFeaturedTap 重写 + index.wxml 加 data-sku）+ 2 编辑小程序 topic-detail（index.js onItemTap 重写 + index.wxml 加 data-sku）
- 0 新表 0 新接口
- 实证：T1 banner.link_sku=SPU001-001 / T2 featured.sku_code 全填 / T3 topic items 各填 sku_code / T4-6 shop-backend BFF 透传 OK / T7 unknown position 返空 list / T8 SKU 真能拉详情
- 待用户跑 manual-test：[outputs/testing/iteration-51-manual-test.md](outputs/testing/iteration-51-manual-test.md)（5 项 UI）
- 下一轮 iter-52 候选（继续中优）：**配置类后台可配 KV**（Q43-01 退款阈值 / Q48-03 SKU 阶段判定 / Q49-01 预警阈值 / Q50-02 提现上下限）

- **iter-50 代码全量交付（2026-06-04）· BIZ-08 真正最后一公里**：**商家自助提现**（Q35-03 / Q39-03）
- auto-test 15/15 ✅（2 fix-on-the-fly：① 路由顺序坑 plain POST 放参数路由前 → 第 4 次同坑 ② AuditService::log 7 参签名错位 requestedBy 占 reason 位）
- ~9 文件：1 新 migration（store_withdrawals 表）+ 1 新 service（WithdrawalService）+ 1 新 controller（Withdrawal 6 接口）+ 1 编辑 PHP（OMS route +6）+ 1 编辑 ts（apis/oms.ts +6 method）+ 1 编辑 ts（stores/auth.ts +3 computed）+ 1 新 Vue（pages/oms/Withdrawals.vue 4 余额卡 + 状态过滤 + 申请弹框 + 审批/拒绝/打款 3 action）+ 1 编辑 ts（router +1 /oms/withdrawals）+ 1 编辑 Vue（AdminLayout OMS 子菜 +"💰 商家提现"）
- **状态机**：pending → approved（锁余额）→ paid（已发）/ ↘ rejected
- **余额算法**：settlement 净额 - approved 锁定 - paid 已发；pending 不锁；平台店 store_id=1 拒
- **RBAC 4 层**：① 路由 middleware 限角色 ② controller role 校验 ③ store_owner 自动 store_ids 推 storeId ④ 状态机非法转移拒
- 实证：T1 super 查 store#2 balance=720910 / T4 shopowner1 申请 100000 / T7 super approve / T9 super pay method=bank ref=ALI20260604001 / T10 余额扣 100000 paid 100000 / T11 warehouse 403 / T12-15 边界 400/403 全过
- 待用户跑 manual-test：[outputs/testing/iteration-50-manual-test.md](outputs/testing/iteration-50-manual-test.md)（7 项 UI）

## 🎉 BIZ-08 多商家平台全闭环

| iter | 内容 | 状态 |
|---|---|---|
| iter-35 | 架构地基（stores / store_admins）| ✅ |
| iter-36 | PIM 多店化 | ✅ |
| iter-37 | OMS 多店化 + 订单拆单 + 抽佣 | ✅ |
| iter-38 | WMS 多店化 | ✅ |
| iter-39 | 入驻流程 + 店铺自管 | ✅ |
| **iter-50** | **商家自助提现** | ✅ |

后续候选：① Q40-01/Q41-01 小程序跳转修 ② Q50-05 真实打款 API 集成 ③ M3-02 真实微信支付 ④ 跑积压 20 个 manual-test

- **iter-49 代码全量交付（2026-06-04）· BI 系列收口 + 整个路线图 1234 全部完成 🎉**：**异常预警面板**（BI-04）
- auto-test 10/10 ✅，**0 fix**（项目第 3 个 0-bug iter；复用 BI-01~03 RBAC 模板 + iter-25 stock_alert_rules + iter-42 dead_letter append-only 协议 + iter-26 OMS→WMS 副连接）
- ~5 文件：1 编辑 PHP（OMS Admin.alertSummary 单 endpoint 聚合 4 类预警 + 路由 +1）+ 1 编辑 ts（apis/oms.ts +1 alertSummary）+ 1 新 Vue（pages/bi/Alerts.vue：4 大彩色卡 + level 边框 + emoji + 28px 大数字 + items list（top 5）+ 推荐操作 + summary tag + 30s auto refresh switch + 点卡跳关联页）+ 1 编辑 ts（router +1）+ 1 编辑 Vue（AdminLayout +"🚨 异常预警"）
- 0 新表 0 新 migration（复用 dead_letter / refund_orders / orders + 跨库 WMS.stock_alert_rules + WMS.inventory）
- 4 类预警：① 订单激增（today vs 7d 均 ratio）② 库存掉底（跨库 WMS）③ 退款率突升 ④ 死信积压（NOT LIKE %replayed at%）
- 冷启动保护：7d 均 < 3 单或今日 < 3 单 → 降级 ok（避免小样本噪音）
- 统一 schema：每 alert `{key,name,level,current,baseline,ratio,items[],action_hint}` + summary `{critical,warn,total_checks}`
- 实证：T1 super 调通 / T2 4 类齐 / T3 401 / T4-5 editor+warehouse 403 / T6 sales 一致 / T7 replayed 死信被排除 / T8 库存 items top 5 / T9 action_hint 文案非空 / T10 summary 计数一致
- 待用户跑 manual-test：[outputs/testing/iteration-49-manual-test.md](outputs/testing/iteration-49-manual-test.md)（5 项 UI）

## 🎉 用户规划路线图全部收口

| 大方向 | iter | 状态 |
|---|---|---|
| 一、BIZ-07 换货 | iter-34 | ✅ |
| 二、BIZ-08 多商家（5轮） | iter-35~39 | ✅ |
| 二、BIZ-09 内容运营（2轮） | iter-40~41 | ✅ |
| 三、EFF 运营效率（4轮） | iter-42~45 | ✅ |
| 四、BI 数据洞察（4轮） | iter-46~49 | ✅ |

后续候选：① Q35-03/Q39-03 商家自助提现 ② Q40-01/Q41-01 小程序跳转修 ③ M3-02 真实微信支付 ④ 跑积压 19 个 manual-test

- **iter-48 代码全量交付（2026-06-04）**：BI 数据洞察 3/4 · **SKU 5 阶段生命周期**（BI-03）
- auto-test 10/10 ✅（1 fix-on-the-fly：spus 表用 `create_time`（TP 默认）非 `created_at`，跨表字段名混用 → 改读 spus.published_at + create_time fallback 直接放弃 spu_status_log 二次查询）
- ~6 文件：1 编辑 PHP（PIM Admin.skuLifecycle + emptyLifecycle/lifecycleStage 2 helper + 路由 +1）+ 1 编辑 ts（apis/pim.ts +1 skuLifecycle）+ 1 新 Vue（pages/bi/SkuLifecycle.vue：6 KPI 卡（含 warn 橙滞销 + cold 灰淘汰）+ 阶段 quick filter + 饼图 + 销量×库存散点 + SPU 明细表）+ 1 编辑 ts（router +1 路由）+ 1 编辑 Vue（AdminLayout BI 子菜 +"SKU 生命周期"）
- 0 新表 0 新 migration（纯 PIM.spus 主 + 跨库 OMS.order_items 销量 + 跨库 WMS.inventory 库存）
- 5 阶段规则按优先级：淘汰（offline 或 长期无销）→ 新品（≤30天）→ 热销（>30天 + 销≥10）→ 滞销（>30天 + 销<5 + 库>0）→ 一般
- 实证：T1 super days=30 total_spu=8 全部新品（≤30天上架）窗口销量 40 总库存 637 / T2 days=180 / T3-4 clamp 7-365 / T5 stage=新品 全 8 / T6 stage=淘汰 0 / T7 401 / T8 editor 403 / T9 warehouse PIM middleware 403 / T10 sales 200 同 super
- 待用户跑 manual-test：[outputs/testing/iteration-48-manual-test.md](outputs/testing/iteration-48-manual-test.md)（5 项 UI）
- **BI 系列 3/4，下轮 iter-49 收口 BI-04 异常预警面板**（订单激增 / 库存掉底 / 退款率突升 / 死信积压）

- **iter-47 代码全量交付（2026-06-04）**：BI 数据洞察 2/4 · **5 阶段订单漏斗**（BI-02）
- auto-test 9/9 ✅，**0 fix**（项目第 2 个 0-bug iter；复用 iter-46 RBAC 模板 + iter-20 跨库副连接 + iter-46 KPI 卡设计）
- ~6 文件：1 编辑 PHP（OMS Admin.funnelAnalysis + emptyFunnel/biggestDropStage 2 helper + 路由 +1）+ 1 编辑 ts（apis/oms.ts +1 funnelAnalysis）+ 1 新 Vue（pages/bi/Funnel.vue：5 KPI 卡含 warn 橙 biggest_drop + 2 ECharts funnel/转化率柱图 + 阶段明细表 ↓警示<50%）+ 1 编辑 ts（router/index.ts +1）+ 1 编辑 Vue（AdminLayout BI 子菜 +"订单漏斗"）
- 0 新表 0 新 migration（纯 OMS 自有 orders + 跨库 shop_db.cart/reviews，复用 iter-20 副连接）
- 5 阶段：加购（shop_db.cart）→ 下单（orders.created_at != cancelled）→ 支付（orders.paid_at）→ 收货（orders.completed_at）→ 评价（shop_db.reviews），distinct user 模型 v1
- biggest_drop_stage 自动算 + overall_conversion = stage5/stage1
- 实证：T1 super days=30 cart:2 / order:34 / paid:18 / completed:3 / review:2 biggest_drop=支付→收货 / T2 days=7 / T3-4 clamp 7-720 / T5 401 / T6-7 editor/warehouse 403 / T8 sales 200 / T9 as_of=今天
- 待用户跑 manual-test：[outputs/testing/iteration-47-manual-test.md](outputs/testing/iteration-47-manual-test.md)（5 项 UI）
- 下一轮 iter-48 候选：**BI-03 SKU 生命周期分析**（新品/热销/滞销/淘汰）

- **iter-46 代码全量交付（2026-06-04）**：**四、BI 数据洞察启动** · 用户 RFM 分层 8 分群（BI-01）
- auto-test 11/11 ✅（2 fix-on-the-fly：① 初版分位法 quintile n=1 把单用户错分"休眠" → 改绝对阈值法 ② editor/warehouse 调 BI 未拒，加 role guard fail-fast）
- ~6 文件：1 编辑 PHP（OMS Admin.rfmAnalysis + emptyKpi/rfmSegment 2 helper + 路由 +1）+ 1 编辑 ts（apis/oms.ts +1 method）+ 1 新 Vue（pages/bi/Rfm.vue：6 KPI + 分群 quick filter + 2 ECharts 饼图/散点 + 用户明细表 + days/segment/page 三维过滤）+ 1 编辑 ts（router/index.ts +1 路由）+ 1 编辑 ts（stores/auth.ts +canSeeBi）+ 1 编辑 Vue（AdminLayout +"📊 BI 数据洞察"子菜单）
- 0 新表 0 新 migration（纯 SQL aggregate orders；仅 super_admin/sales_ops 可见）
- **算法**：R 距今 ≤7/14/30/60/>60 → 5/4/3/2/1 分 · F ≥10/5/3/2/1 → 5/4/3/2/1 分 · M ≥10000/3000/1000/300/<300 元 → 5/4/3/2/1 分 · 8 分群（重要价值/重要保持/不能失去/重要发展/新客户/流失风险/休眠/流失/一般客户，Kotler 简化）
- 实证：T1 super days=90 total_users=1 segments=重要价值 / T2 days=7 仍能 / T3-4 clamp 校验 / T5-6 segment 过滤 / T7 401 / T8-9 editor/warehouse 403 / T10 sales 200 / T11 super 200 含 as_of
- 待用户跑 manual-test：[outputs/testing/iteration-46-manual-test.md](outputs/testing/iteration-46-manual-test.md)（6 项 UI）
- 下一轮 iter-47 候选：**BI-02 订单漏斗**（加购→下单→支付→收货→评价 + 转化率）或 **BI-03 SKU 生命周期**

- **iter-45 代码全量交付（2026-06-04）**：运营效率 EFF 收口 · **WMS PDA H5 移动端**（EFF-07）
- auto-test 9/9 ✅（2 fix-on-the-fly：inbound detail nested 结构 / omsApi.adminLogin 方法名 + 401 兜底分流 PDA）
- ~10 文件：1 新 layout（PdaLayout.vue 移动 header + 3 套共享样式）+ 6 新 Vue 页（pda/Login + Home + PickingList + PickingDetail + InboundList + InboundDetail）+ 1 编辑 router/index.ts（/pda/login + /pda 路由组 6 子路由 + 401 兜底按 path 分流）+ 1 编辑 apis/http.ts（401 跳 `/pda/login` vs `/login`）
- **0 后端改动 0 新 endpoint 0 新表**：复用 iter-22 PickingTaskService.scan 增量上报 + iter-25 InboundService.autoComplete 推荐 Top1 上架
- 实证：T1 拣货 list pending total=6 / T2 入库 list pending total=1 / T3 assign id=14 status=assigned operator=warehouse / T4 scan +1 → picked / T5 我的任务过滤 total=2 / T6 入库 detail nested order.status=received items_count=1 / T7 autoComplete 200 / T8 超量 scan 400 / T9 无 token 401
- 待用户跑 manual-test：[outputs/testing/iteration-45-manual-test.md](outputs/testing/iteration-45-manual-test.md)（8 项 UI，手机/chrome devtools mobile 模式）
- **EFF 系列收口（5/7 + 0 后端，EFF-06 撤销低优可延后）**
- 下一轮 iter-46 候选：**BI-01 用户 RFM 分层**（数据洞察开篇）或 **Q35-03/Q39-03 商家自助提现**（多商家最后一公里）

- **iter-44 代码全量交付（2026-06-04）**：运营效率 EFF 第 3 轮（**EFF-02 ⌘K 全局快速搜索**）
- auto-test 13/13 ✅（2 fix-on-the-fly：手机号 JSON LIKE 严格 fragile → 改宽松 LIKE / OMS quickSearch 漏拒 editor → 加 role guard）
- ~7 文件：1 编辑 PHP（OMS Admin.quickSearch + OMS route +1）+ 1 编辑 PHP（PIM Admin.quickSearch + PIM route +1）+ 2 编辑 ts（apis/oms.ts + apis/pim.ts 各 +1）+ 1 新 Vue（QuickSearch.vue 全局 keydown + dialog + 4 类结果分组）+ 1 编辑 Vue（AdminLayout 加搜索按钮 + mount + isMac 检测）
- 0 新表 0 新 migration
- 实证：T1 SO 前缀 orders=5/refunds=3 / T2 RF 前缀 refunds=2 / T3 EX 前缀 exchanges=3 / T4 11 位手机号 13800138000 orders=5 / T6 SPU code orders=1 / T7 'iPhone' 名模糊 spus=2 / T8 editor PIM 可见 / T11 空查空集 / T12 editor 调 OMS 返空集 / T13 super 对照 5 单
- 待用户跑 manual-test：[outputs/testing/iteration-44-manual-test.md](outputs/testing/iteration-44-manual-test.md)（6 项 UI）
- 下一轮 iter-45 候选：**EFF-07 WMS PDA H5**（移动端拣货扫码 + 入库扫码）或 进入 **BI-01 用户 RFM 分层**

- **iter-43 代码全量交付（2026-06-04）**：运营效率 EFF 第 2 轮（**EFF-03 退款/换货金额阈值二审 + EFF-04 PIM editor 角色细分**）
- auto-test 13/13 ✅（2 fix-on-the-fly：PIM StoreContext 漏登 editor 跨店白名单 + ExchangeService sum 字段名 quantity→qty）
- ~13 文件：2 migration（refund/exchange +3 字段 + seed editor 账号）+ 3 编辑 PHP（OMS RefundService/ExchangeService/Refund+Exchange controller 接 role 参）+ 1 编辑 PHP（PIM StoreContextService editor 加白）+ 1 编辑 PHP（PIM route 拆 publish/offline 独立 group）+ 2 编辑 Vue（Refunds/Exchanges 加 ⚑ 二审 badge）+ 1 编辑 ts（auth.ts 加 editor + canPublishSpu）+ 1 编辑 Vue（Products 加 v-if="auth.canPublishSpu"）+ 1 编辑 Vue（AdminLayout role label）+ 1 编辑 .env（OMS_REFUND_REVIEW_THRESHOLD_CENTS=100000 + OMS_EXCHANGE_REVIEW_THRESHOLD_QTY=3）
- 0 新表 0 业务 ALTER（纯增 3 字段 + seed 账号 + 路由分组重构）
- 实证：T1 sales 一审 ¥1000 退款 → needs_2=1 / T2 sales 再投 409 / T3 super 二审 → refunded / T4 ¥50 小额 sales 直通 / T5 super 直接一步过 / T6 editor 建草稿成功 / T7 editor publish 403 / T8 sales publish 200 / T9 editor delete 200 / T10-T13 换货同链路全 OK
- ENV 须 force-recreate 才生效（restart 不重读 env_file）
- 待用户跑 manual-test：[outputs/testing/iteration-43-manual-test.md](outputs/testing/iteration-43-manual-test.md)（7 项 UI）
- 下一轮 iter-44 候选：**EFF-07 WMS PDA H5**（移动端拣货扫码 + 入库扫码）或 **EFF-02 ⌘K 全局搜索**

- **iter-42 代码全量交付（2026-06-03）**：运营效率 EFF 第 1 轮（**EFF-01 OMS 高级搜索 + EFF-05 待办中心 + EFF-08 死信中心一键 replay**）
- auto-test 7/7 ✅（0 fix）
- ~9 文件：3 编辑 PHP（OMS Admin 加 orderList 7 高级字段 + 新增 todosCounts + deadLetterReplay / OMS route +3）+ 1 编辑 ts apis（orderList 类型扩展 + todosCounts + deadLetterList + deadLetterReplay）+ 2 新 Vue（Todos.vue 6 卡片 + DeadLetter.vue 列表+replay）+ 3 编辑 Vue（Orders.vue 加"高级搜索 ▼/▲"折叠面板 + router 2 路由 + AdminLayout 顶部菜单 +"📋 待办中心"/ 系统管理 +"死信中心"）
- 0 新表 0 新 migration（纯复用 iter-9 EventBus + iter-28 dead_letter + iter-26 settlement + iter-35 stores）
- 实证：phone JSON LIKE total=0 / SKU 反查 total=12 / 金额段 total=26 / todos total=30 (refund1+pending17+toShip10+dead2) / dead_letter id=2 列表 / replay new_message_id=1780494692264-0 全过
- 待用户跑 manual-test：[outputs/testing/iteration-42-manual-test.md](outputs/testing/iteration-42-manual-test.md)（7 项 UI）
- 下一轮 iter-43 候选：**EFF-03 审批流（退款 > 阈值需 super 二审 / 换货同）+ EFF-04 角色细分（OMS sales 看自己负责店 / PIM editor 角色）**
- 再下轮 iter-44：EFF-07 WMS PDA H5（移动端拣货扫码 + 入库扫码）

- **iter-41 代码全量交付（2026-06-03）**：BIZ-09 内容运营第 2 轮 · 营销专题 + 营销日历（**BIZ-09 全部交付 ✅**）
- auto-test 9/9 ✅（0 fix）
- ~16 文件：2 migration + 1 service（含 calendar 聚合 4 类活动统一 schema）+ 1 controller（11 接口）+ 3 编辑 PHP（OMS route / shop Cms BFF / shop route）+ 2 新 Vue（Topics + MarketingCalendar）+ 3 编辑 Vue（apis / router / menu）+ 4 新小程序文件（topic-detail 完整页）+ 3 编辑小程序（apis / app.json / home 加专题入口）
- 实证：建专题 + 关联 2 SPU + 跨库 PIM 回填 + 营销日历聚合 15 events（banner+featured+coupon+topic 4 类按 start 排序）+ shop-backend BFF 透传
- **BIZ-09 内容运营 2 轮规划全部交付 ✅**（iter-40 Banner+推荐位 → iter-41 专题+日历）
- 待用户跑 manual-test：[outputs/testing/iteration-41-manual-test.md](outputs/testing/iteration-41-manual-test.md)（8 项 UI）
- 下一方向（用户原顺序）：**三、运营效率 EFF** 或 **四、数据洞察 BI**

- **iter-40 代码全量交付（2026-06-03）**：BIZ-09 内容运营第 1 轮 · Banner 管理 + 推荐位（首页轮播 + 横向滚动）
- auto-test 9/9 ✅（0 fix）
- ~14 文件：2 migration + 1 service（合并 Banner+Featured）+ 1 controller（10 接口）+ 1 shop-backend BFF + 4 编辑 PHP（OMS route / shop route / apis 等）+ 2 新 Vue + 3 编辑 Vue + 3 编辑小程序（apis + home.js/wxml/wxss）
- 营销菜单 + 2 项：Banner 管理 + 推荐位
- 小程序首页 swiper 轮播 + scroll-view 横向滚动热门推荐
- 实证：admin CRUD Banner + 推荐位 + 公开读跨库 PIM 拿 SPU 名+价 + shop-backend BFF 透传全链路
- 待用户跑 manual-test：[outputs/testing/iteration-40-manual-test.md](outputs/testing/iteration-40-manual-test.md)（8 项 UI）
- 下一轮 iter-41：BIZ-09-2 专题页 + 营销日历（BIZ-09 第 2 轮收口）

- **iter-39 代码全量交付（2026-06-03）**：BIZ-08 多商家入驻 5 轮规划之第 5 轮 · 入驻流程收口（**BIZ-08 全部交付 ✅**）
- auto-test 9/9 ✅（0 fix）
- ~10 文件：4 编辑 PHP（StoreService approve增强+selfUpdate / Store controller selfUpdate+publicDetail+code-id双查 / OMS route / shop-backend route）+ 1 新 PHP（shop-backend Store BFF）+ 2 编辑 Vue（Stores 弹账号密码 / Settlement 加 platform_commission type）+ 3 编辑小程序（apis.storeDetail / detail.js 拉店铺 / detail.wxml 显示"🏪 由 xxx 提供"标签）
- 实证：建店 + approve → 自动建 store_owner 账号（shop-shop-pixel/mypwd123）+ 绑定 + 新店主登录 + 改店铺 + 公开读店铺信息 全链路通
- **BIZ-08 5 轮规划全部交付 ✅**（iter-35 架构地基 → iter-36 PIM → iter-37 OMS 拆单 → iter-38 WMS → iter-39 入驻流程）
- 待用户跑 manual-test：[outputs/testing/iteration-39-manual-test.md](outputs/testing/iteration-39-manual-test.md)（7 项 UI）
- 下一方向候选：BIZ-09 内容运营 / 运营效率 EFF / 数据洞察 BI / M3 安全治理 / 真接微信支付 / 拼团秒杀

- **iter-38 代码全量交付（2026-06-03）**：BIZ-08 多商家入驻 5 轮规划之第 4 轮 · WMS 多店化
- auto-test 7/7 ✅（0 fix）
- ~11 文件：2 migration + 1 新 PHP（WMS StoreContextService）+ 4 编辑 PHP（middleware/route/Warehouse/Inventory/InventoryService）+ 4 编辑 Vue（apis/Warehouses/Inventory）
- warehouses + inventory 加 store_id；warehouses 加 warehouse_type ENUM(self/merchant)
- 实证：商家仓 WH-IPHONE store#2/merchant 建成；shopowner1 只看到自己 1 个仓；访问平台仓 detail 403
- WMS warehouse 角色保留跨店访问（平台仓管原本就管所有仓）
- 跨店调拨 v1 不支持（Q38-01 留 v2 平台代理模式）
- 待用户跑 manual-test：[outputs/testing/iteration-38-manual-test.md](outputs/testing/iteration-38-manual-test.md)（5 项 UI）
- 下一轮 **iter-39（BIZ-08 收口）**：商家入驻流程 + 店铺自管 + 抽佣自动算 + 小程序店铺主页

- **iter-37 代码全量交付（2026-06-03）**：BIZ-08 多商家入驻 5 轮规划之第 3 轮 · OMS 多店化 + 订单拆单（**最危险一轮过 ✅**）
- auto-test 10/10 ✅（1 fix-1：settlement.type VARCHAR(16) 改 32 容纳 "platform_commission" 19 字符）
- ~14 文件：3 migration + 5 编辑 PHP（OrderService 大改 + Payment + Settlement + Refund/Exchange 继承 + Admin 加店过滤）+ 3 编辑 Vue（apis + Orders + auth）
- **feature flag `OMS_MULTI_STORE_SPLIT` 默认 false 旧链路完美回归**；flag on 时拆 N 单 + 父单整付 + 自动抽佣
- 实证：旧链路 100% 不变 / 多店 flag off 准确拒绝 / flag on 拆 2 单（store#1+store#2）/ PO 父单整付 / shopowner1 仅看自己店 / 抽佣 10% 自动算 -79990
- 待用户跑 manual-test：[outputs/testing/iteration-37-manual-test.md](outputs/testing/iteration-37-manual-test.md)（5 项 UI）
- 下一轮 iter-38：WMS 多店化（商家仓 vs 自营仓）

- **iter-36 代码全量交付（2026-06-03）**：BIZ-08 多商家入驻 5 轮规划之第 2 轮 · PIM 多店化（spus/skus 加 store_id）
- auto-test 13/13 ✅（0 fix）
- ~12 文件：2 ALTER migration + 1 PIM StoreContextService + 5 编辑 PHP（middleware/Product/Sku/Admin/route）+ 4 编辑 Vue（apis + auth store + Products + auth role 扩展）
- store_owner/store_staff 角色真正可用：登录后只看到自己店数据；admin_users.role + store_admins 关联同时有效
- 实证：shopowner1 登录只见 store#2 的 1 个 SPU；跨店访问 store#1 SPU → 403；建 SPU 自动归 store#2
- 待用户跑 manual-test：[outputs/testing/iteration-36-manual-test.md](outputs/testing/iteration-36-manual-test.md)（7 项 UI）
- 下一轮 iter-37：OMS 多店化 + 订单拆单（最危险一轮，含 feature flag）

- **iter-35 代码全量交付（2026-06-03）**：BIZ-08 多商家入驻 5 轮规划之第 1 轮 · 架构地基
- 用户拍板 5 决策（下单立即拆 N 单 / 商家自有仓 / 父单整付 / confirm 时抽佣 / 公共类目商家可用不可改）
- auto-test 12/12 ✅（0 fix）
- ~12 文件：2 migration + 3 service（StoreService + StoreContextService）+ 1 controller + 编辑 AdminAuth/route + 1 新 Vue + 编辑 apis/router/menu
- **0 ALTER 业务表**（风险隔离，回滚仅 drop 2 表）；系统管理子菜单加"店铺管理"（super_admin 独占）
- 待用户跑 manual-test：[outputs/testing/iteration-35-manual-test.md](outputs/testing/iteration-35-manual-test.md)（6 项 UI）
- 下一轮 iter-36：PIM 多店化（spus/skus/categories/brands 加 store_id + UI 按店过滤）

- **iter-34 代码全量交付（2026-06-03）**：换货流程 BIZ-07（v1 工作流跟踪版，7 态状态机，不自动联动库存）
- auto-test 14/14 ✅（1 个设计期矫正：exchange admin 路由初放任意 admin group → warehouse 也能审批，改放 super+sales group）
- ~22 文件：5 新 PHP（2 migration + StateMachine + Service + Controller）+ 1 shop BFF + 3 编辑 PHP（database 加 pim 副连接 + 2 route）+ 1 新 Vue + 3 编辑 Vue + 6 新小程序页（exchange-apply + my-exchanges 各 4 文件，重叠算 6）+ 4 编辑小程序（apis + app.json + order-detail + me 页入口）
- OMS 菜单 + 1 项（换货审批，super+sales）；小程序 18 → 20 页
- OMS→PIM 副连接首例，跨库累计 6 方向
- 待用户跑 manual-test：[outputs/testing/iteration-34-manual-test.md](outputs/testing/iteration-34-manual-test.md)（8 项 UI 验证：小程序申请 + admin 审批 + RBAC）

- **iter-33 代码全量交付（2026-06-03）**：OMS Webhook 异步化（Q28-03）+ 接入文档（Q28-04）
- auto-test 7/7 ✅（0 fix）；**核心指标 fireAsync 实测 1.08ms vs iter-28 同步最坏 15s+ → ~14000x 提升**
- ~8 文件：1 新 PHP（ConsumeWebhook command）+ 5 编辑 PHP（WebhookService 拆 sync/async + OrderService/RefundService 3 处调用 + console.php + supervisor.conf）+ 1 新文档（docs/webhook-接入指南.md，PHP/Node/Python 三语言验签 10 节）
- **0 新表 / 0 新 migration / 0 新 UI**，纯复用 iter-9 EventBus + iter-28 dead_letter
- supervisord 进程 4 → 5（OMS 加 consume-webhook）
- 待用户跑 manual-test：[outputs/testing/iteration-33-manual-test.md](outputs/testing/iteration-33-manual-test.md)（4 项 UI 验证，重点观察订单确认无卡顿）

- **iter-32 代码全量交付（2026-06-03）**：WMS 自动化三件套（A 低库存 webhook 外推 + B 盘点定时调度 + C 推荐权重可配）
- auto-test 13/13 ✅（1 fix：StockTakeService.create 返回 `['take' => detail, 'items' => list]` 嵌套结构错读 — 经验：复用 service 必看返回结构）
- ~17 文件：3 migration + 3 service + 2 command + 2 controller（新）+ 5 编辑 PHP（StockAlert/StockAlertService/LocationRecommend/console/route/supervisor）+ 2 新 Vue + 3 编辑 Vue
- WMS 子菜单 12 → 14 项（加：**盘点定时** / **WMS 配置 super_admin 独占**）
- supervisord 进程 7 → 9（+ wms-stock-alert-notify + wms-stock-take-schedule）
- 待用户跑 manual-test：[outputs/testing/iteration-32-manual-test.md](outputs/testing/iteration-32-manual-test.md)（8 项 UI 验证）

- **iter-31 代码全量交付（2026-06-03）**：PIM 精修三件套（A SPU 列表内联跨库 库存+月销 + B ImagePicker 复用 + C 图片库引用计数+删除阻断）
- auto-test 6/6 ✅（一次跑通：批量跨库聚合无 N+1 + used_count 实时算 + 引用阻断 409 返回 SPU 清单，0 fix）
- ~6 文件：2 编辑 PHP（Product.php adminList 加 35 行跨库聚合 + ImageLibrary.php list/delete）+ 1 新 Vue（ImagePicker.vue）+ 3 编辑 Vue（ImageUpload + Products + ProductEdit + ImageLibrary 显示 used）
- **0 新表 / 0 新 migration / 0 新路由**，纯增量
- 待用户跑 manual-test：[outputs/testing/iteration-31-manual-test.md](outputs/testing/iteration-31-manual-test.md)（7 项 UI 验证）

- **iter-30 代码全量交付（2026-06-03）**：PIM 增强三件套（A CSV 批量导出/导入 + B 属性模板 + C 图片库）
- auto-test 11/11 ✅（一次跑通：CSV 幂等 1 create+1 update / header 校验 400 / 属性模板 409 / 图片库自动回纳 / RBAC 403 全过，0 fix）
- ~13 文件：4 新 PHP（2 migration + AttributeTemplate.php + ImageLibrary.php）+ 3 编辑 PHP（Product.php 加 exportCsv/importCsv + create/update 接 attrs；Upload.php 回纳 image_library；route 加 9 路由）+ 2 新 Vue（Templates.vue + ImageLibrary.vue）+ 4 编辑 Vue（apis/pim.ts + Products 加导入导出按钮 + ProductEdit 加应用模板 + router + AdminLayout 加 2 菜单）
- PIM 子菜单 5 → 7 项（加：**属性模板** / **图片库**）
- 待用户跑 manual-test：[outputs/testing/iteration-30-manual-test.md](outputs/testing/iteration-30-manual-test.md)（9 项 UI 验证）

- **iter-29 代码全量交付（2026-06-03）**：PIM 完整化 P1+P2（补齐审计 + 状态机 + 跨库 Dashboard，对齐 OMS iter-15/WMS iter-24）
- auto-test 13/13 ✅（一次跑通：14 处 audit 注入 + 4 处状态机日志 + 跨库 OMS/WMS 双向读 + RBAC 三层 + 路由顺序无冲突）
- ~14 文件：5 新 PHP（2 migration + AuditService + SpuStatusLogService + Admin controller）+ 6 编辑 PHP（database 副连接 + route + Product/Sku/Brand/Category 注入）+ 2 新 Vue（Dashboard.vue + AuditLog.vue）+ 3 编辑 Vue（apis/pim.ts + router + AdminLayout 菜单）
- PIM 子菜单 3 → 5 项（加：**PIM 总览** / **操作日志**）
- 跨库副连接累计 **5 个方向**（+ PIM→OMS + PIM→WMS）
- 待用户跑 manual-test：[outputs/testing/iteration-29-manual-test.md](outputs/testing/iteration-29-manual-test.md)（7 项 UI 验证）

- **iter-28 代码全量交付（2026-06-03）**：OMS 增强四件套 A（webhook 推送 + Dashboard 财务维度 + Refund Model 渐进封装 + 导出增强占位）
- auto-test 13/13 ✅（1 个开发期 bug 当场抓修：fix-1 dead_letter 表字段是 retry_count 不是 delivery_count，WebhookService 写错被 try/catch silent 吞掉 — 经验：dead_letter 写入失败应至少记 STDOUT，不应完全 silent）
- ~16 文件：1 migration + WebhookService + Webhook controller + OrderService/RefundService 3 处注入 webhook fire + Admin.stats 加 finance_metrics/finance_series/coupon_usage_metrics 3 字段 + Vue Webhooks.vue + Dashboard 加 4 张财务卡 + 2 Model 类（Refund/RefundItem 渐进式不替换 service）
- OMS 菜单加 1 项：**Webhook 订阅（super_admin 独占）**
- 待用户跑 manual-test：[outputs/testing/iteration-28-manual-test.md](outputs/testing/iteration-28-manual-test.md)（6 项 UI 验证）

- **iter-27 代码全量交付（2026-06-02）**：优惠券高级三件套（Q19-01 商品券 + Q19-02 新人券自动发放 + Q19-03 多券叠加）
- auto-test 15/15 ✅（含 3 个开发期 bug 当场抓修：fix-1 OMS Order controller 漏传 ids 数组 / fix-2 applyMultipleInTransaction `isset(null)` 假阴性 → 改 array_key_exists / fix-3 Coupon controller 漏接 scope 参数）
- ~22 文件：3 migrations + OMS CouponService 大改（scope 校验 + applyMultipleInTransaction 满减先折扣后）+ CouponAutoRuleService + CouponRule controller + Coupon/Order controller scope/ids 改 + shop-backend User.login 触发 grant + Vue Coupons.vue 加 scope + CouponRules.vue 新页 + 菜单 + 小程序 apis 支持 ids 数组
- 营销菜单 2 → 3 项（加：**自动发券规则**）
- 待用户跑 manual-test：[outputs/testing/iteration-27-manual-test.md](outputs/testing/iteration-27-manual-test.md)（7 项 UI 验证）

- **iter-26 代码全量交付（2026-06-02）**：OMS 完整化 P0 三件套（跟 WMS iter-24 对称）
- auto-test 14/14 ✅（一次跑通：OMS 推 3 事件 + WMS 3 consumer 接收 + audit log + OMS 视角对账跨库读 wms + 财务结算单双触发点 + CSV 导出 + RBAC 三层 + 幂等）
- ~23 文件：3 migrations + OMS 2 service 改 + 3 OMS 新 + WMS 3 handler + 1 command + supervisor 3 进程 + Vue 2 新页
- OMS 菜单加 2 项：**财务结算单（sales+super_admin）+ WMS 对账（super_admin 独占）**
- 事件总线 4 流 → 7 流（新增 oms.order.cancelled / oms.refund.approved / oms.refund.refunded）
- 待用户跑 manual-test：[outputs/testing/iteration-26-manual-test.md](outputs/testing/iteration-26-manual-test.md)（8 项 UI 验证）

- **iter-25 代码全量交付（2026-06-02）**：WMS 增强四件套（Dashboard + 低库存预警 + 入库自动上架 + 出库 FIFO）
- auto-test 10/10 ✅（一次跑通：6 KPI + 仓库利用率 + 入出库时序 + 拣货效率 + TOP SKU / 预警 CRUD + 阈值告警 / 入库 autoComplete 用推荐 Top1 + 走 InventoryService 写 log / FIFO INIT 优先）
- ~16 文件：1 migration + WmsStatsService + StockAlertService + 2 controller + Inbound.autoComplete 改造 + InventoryService.findAvailable FIFO + Vue 2 新页 + apis/router/menu
- WMS 菜单 10 → 12 项（加：**WMS 总览 / 低库存预警**）
- 待用户跑 manual-test：[outputs/testing/iteration-25-manual-test.md](outputs/testing/iteration-25-manual-test.md)（7 项 UI 验证）

- **iter-24 代码全量交付（2026-06-02）**：WMS 完整化 + OMS 对接补齐（P0+P1 五件套）
- auto-test 12/12 ✅；待 manual-test
- 4 migrations + WmsInventoryLogService + 3 处接入 + OMS handler 4 分支（refund/inbound/transfer/take_no）+ Picking 5 admin API + Reconcile 4 API + Vue 3 新页

- **iter-23 已收口（2026-06-02）**：多 SKU 批量调拨单（Q22-01 留位）
- auto-test 11/11 ✅；3 SKU 同时 ship/receive / 失败全单 rollback / legacy 兼容 / 行号错误消息

- **iter-22 已收口（2026-06-02）**：WMS 智能化（实时盘点 + 调拨 + 上架推荐 Top3）
- auto-test 17/17 ✅ + manual-test 9/9 ✅（用户回报"测试验证 ok"）
- 抓 3 个 UX bug：fix-1（库位文本→下拉）/ fix-2（SKU 文本→搜索下拉）/ fix-3（库位+SKU 三方智能联动 + disabled 标注 "无商品/无该 SKU/已满/可用 N 件"）
- 经验：列表/详情型功能用 dropdown + 显示"现状信息"比裸 text input 用户体验天差地别

- **iter-21 已收口（2026-06-01）**：运营 Dashboard 增强四件套 — 0-bug iter（用户验证通过）
- **iter-20 已收口（2026-06-01）**：评价 + 收藏 + 地址簿（用户侧 UGC + UX 三件套）— 用户验证通过

**已完成主线（… + 营销模块开篇：优惠券模板 CRUD + 用户领券核销 + 下单 tx 内核销 + 营销菜单 RBAC）**

**下一步候选**（由用户决定）：
- H. iter-19 沉淀进 PROJECT_SUMMARY / README
- 评价 / 商品评论（业务扩展继续）
- 收藏 + 地址簿（UX 扩展）
- 拼团 / 限时秒杀（营销继续深耕）
- C. 真实接入：微信支付 v3 + 阿里云 SMS
- D. 性能压测（hey/wrk）
- 暂停项目

## 当前问题
（无阻塞）

## 返工记录
- iteration-3 修了 13 项 Phase 1 运行时坑（见 [reconcile-report-iteration-3](outputs/orchestration/reconcile-report-iteration-3.md)）
- iteration-5 修了 7 项 Phase 2 运行时坑（见 [reconcile-report-iteration-5](outputs/orchestration/reconcile-report-iteration-5.md)）
- iteration-6 修了 1 项 Phase 2 P2 运行时坑（wms-backend 缺 Guzzle 依赖；详见 reconcile-report-iteration-6 §九）
- iteration-7 修了 1 项 Phase 2 P4 前端运行时坑（AxiosInstance 类型导入；详见 reconcile-report-iteration-7 §九）
- iteration-8 修了 1 项脚本 bug（`set -u` 与中文混排互害；无业务代码 bug）
- iteration-9 修了 2 项坑（console.php 注册命令；supervisorctl 段加配置）
- iteration-10 修了 5 项坑（详见 §iteration-10 运行时验证）

## 任务进度

### iteration-18 运营增强（导出 / 模糊搜索 / Dashboard 报表 / 批量操作）（2026-05-29）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| B · 导出 CSV | OMS 3 export controller + route + Vue http downloadFile helper + 3 页加导出按钮 | 5 | ✅ |
| C · 模糊搜索 | OMS Admin/Refund LIKE + PIM Product code 扩展 + 3 页 keyword 输入 | 7 | ✅ |
| A · Dashboard 报表 | OMS stats 大幅扩展（time_series/top_skus/refund_series）+ echarts 安装 + Dashboard.vue 重写 4 图表 + 时间筛选 | 4 | ✅ |
| D · 批量操作 | OMS batch controllers + route + Vue 多选/守卫/批量按钮 | 5 | ✅ |
| E · 文档 | runbook + reconcile + progress | 3 | ✅ |

设计要点：
- 导出：UTF-8 BOM + fputcsv 流，零新依赖；单次 limit 5000
- 搜索：SQL LIKE %% 多字段 OR，不引入 ES
- 报表：ECharts 5 裸调用，不用 vue-echarts 包装层；后端补 0 解决时间序列断档
- 批量：单次 ≤ 50，每单独立事务，failed[] 详细返回
- 多选守卫：`:selectable` 函数 + canBatch computed 双层
- 内存：onBeforeUnmount dispose + window resize 监听

### iteration-18 测试执行（2026-05-29 全过）

**自动测试 ✅ 16/16**（详见 [outputs/testing/iteration-18-auto-test.md](outputs/testing/iteration-18-auto-test.md)）：
- B 导出 CSV 3 项（含 UTF-8 BOM）
- C 模糊搜索 3 项（订单/退款/商品）
- A Dashboard stats 2 项（days=7/30 含补 0）
- D 批量操作 6 项（空数组校验 / 50 上限 / failed[] 详情）
- E 权限延续 2 项（401 / sales 通过）

**手动测试 ✅ 14/14**（详见 [outputs/testing/iteration-18-manual-test.md](outputs/testing/iteration-18-manual-test.md)）：
- A Dashboard 4 项（4 图渲染 / 时间筛选 / resize / tooltip）
- B 导出 3 项（Excel 打开中文不乱）
- C 搜索 3 项（订单/退款/商品 keyword 过滤）
- D 批量 4 项（cancelled/refunded 行 checkbox 禁用 + 批量取消/通过/拒绝走通）

实测中暴露 + 修复的 1 项坑：
- iter18-fix-1: OrderStateMachine.TRANSITIONS['paid'] 不含 'cancelled'，导致 iter-10 后 Admin::cancelOrder + batchCancelOrders 对 paid 订单全部 500 — auto-test 抓到当场修，加 'cancelled' 到 paid 允许转移

### iteration-17 PIM/WMS endpoint enforcement + admin 用户管理（2026-05-28）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · PIM/WMS endpoint enforcement | PIM/WMS 各 AdminTokenService + AdminAuth middleware + route 改 | 6 | ✅ |
| B · admin 用户管理 | AdminAuthService 加 CRUD + AdminUser controller + OMS middleware 改变参 + route + Vue apis + store + AdminUsers.vue + router + AdminLayout | 9 | ✅ |
| C · 文档 | runbook + reconcile + progress | 3 | ✅ |

设计要点：
- 各后端独立 verify JWT（同 secret 同算法），不调 OMS /admin/me 跨服务（避免延迟 + 故障耦合）
- middleware 用变参 `...$allowedRoles` 实现路由级角色限制
- iter-16 OMS 旧用法（不传 role）继续兼容
- 删除 super_admin 兜底：至少保留 1 个 enabled + 禁止自删
- adminUser CRUD 自动写 audit_log

### iteration-17 运行时验证（2026-05-28 已完成 — 首次按 auto/manual 拆分）

**自动测试 ✅ 12/12**（详见 [outputs/testing/iteration-17-auto-test.md](outputs/testing/iteration-17-auto-test.md)）：未授权 401 / admin 200 / warehouse 403 / sales 403 / super_admin 专属 403 / 自删 409 / 删最后 super_admin 409 / 清理回归

**手动测试 ✅ 9/9**（详见 [outputs/testing/iteration-17-manual-test.md](outputs/testing/iteration-17-manual-test.md)）：3 角色登录菜单显隐 + admin user CRUD/改密 + 地址栏直访 + 清理

| Task ID | 验证项 | 状态 |
|---|---|---|
| P17-RUN-001 | 3 后端重启 + 系统管理菜单出现 | ✅ |
| P17-RUN-002 | admin 登录正常通过 PIM/WMS 写 | ✅ |
| P17-RUN-003 | curl 不带 token → 401 | ✅ |
| P17-RUN-004 | warehouse 调 PIM → 403 | ✅ |
| P17-RUN-005 | sales 调 WMS → 403 | ✅ |
| P17-RUN-006 | 系统管理 → 管理员用户 CRUD/改密 | ✅ |
| P17-RUN-007 | warehouse/sales 菜单隐藏 + URL 直访 403 | ✅ |
| P17-RUN-008 | 自删 / 删最后 super_admin → 409 | ✅ |

实测中暴露 + 修复的 1 项坑：
- iter17-fix-1: AdminUser::create 调 audit() 时把 int 传给 string $targetId，导致 500 错误但 DB insert 已落地 — `(string)$u['id']` 强制转换

### iteration-16 售后超时关闭 + 最小 RBAC（2026-05-28）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · 售后超时关闭 | RefundStateMachine + RefundService + CloseOvertimeRefunds command + console.php + supervisor + Refunds.vue | 6 | ✅ |
| B · 最小 RBAC | admin_users migration(+seed) + AdminAuthService + AdminAuth controller + middleware + route + auth store + Login.vue + AdminLayout | 8 | ✅ |
| C · 文档 | runbook + reconcile + progress | 3 | ✅ |

设计要点：
- 状态机加 `closed_overtime` 终态：return_refund + approved + approved_at > 7 天 → 自动关闭 + unreserve
- supervisord 拉起 PHP loop：1 小时扫一次，240 次（~10 天）后退出由 supervisord 重拉
- 手写 HS256 JWT（30 行），零新增 composer 依赖
- 3 角色：super_admin（全）/ warehouse（只 WMS）/ sales_ops（只 PIM+OMS）
- RBAC 落点：OMS endpoint middleware + Vue 菜单显隐双层（PIM/WMS endpoint 留 M3）

### iteration-16 运行时验证（2026-05-28 用户实测通过）

| Task ID | 验证项 | 状态 |
|---|---|---|
| P16-RUN-001 | OMS migrate（admin_users + seed 3 账号）| ✅ |
| P16-RUN-002 | OMS 重启拉起 3 consumer（consume-wms + consume-wms-inventory + refund-close-overdue）| ✅ |
| P16-RUN-003 | admin/admin123 登录 → 顶栏管理员 + 三大菜单全显 | ✅ |
| P16-RUN-004 | warehouse/wh123 登录 → 仅 WMS 菜单 | ✅ |
| P16-RUN-005 | sales/sales123 登录 → 仅 PIM/OMS 菜单 | ✅ |
| P16-RUN-006 | 错误密码 / 失效 token → 401 + 跳 /login | ✅ |
| P16-RUN-007 | 改 DB approved_at 模拟超时 → 手动跑 refund:close-overdue → status=closed_overtime + reserved-N | ✅ |

### iteration-15 退货凭证图片 + 后台 audit log（2026-05-28）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · 退货凭证图片 | shop-backend Upload + route + OMS migration + RefundService 改 + 2 BFF / OMS controller 改 + 小程序 utils/request + apis + refund-apply + my-refunds + Vue admin Refunds.vue + vite proxy | 12 | ✅ |
| B · 后台 audit log | OMS migration + AuditService + Admin + Refund 注入 + 新 endpoint + Vue api + 新页 + router + menu | 9 | ✅ |
| C · 文档 | runbook + reconcile + progress | 3 | ✅ |

设计要点：
- `/uploads/refund-evid/{ymd}` 子目录与 PIM uploads 隔离，vite longest-prefix 分流
- 复用 iter-10 原生 $_FILES 上传模式（避开 TP file() bug）
- AuditService static log() 零 DI 噪音，失败 try/catch 不阻塞
- 6 个 admin 写操作注入审计：order.force_cancel / order.recover / inventory.adjust / refund.approve / refund.reject / refund.confirm

### iteration-15 运行时验证（2026-05-28 用户实测通过）

| Task ID | 验证项 | 状态 |
|---|---|---|
| P15-RUN-001 | OMS migrate 2 个（add evidence_images + create admin_audit_log）| ✅ |
| P15-RUN-002 | shop-backend + oms-backend 重启 + vite 重启加载新 proxy | ✅ |
| P15-RUN-003 | 小程序申请退款上传 2 张图 → 缩略图显示 → 提交成功 | ✅ |
| P15-RUN-004 | 小程序"我的退款" + Vue admin 详情都能展示凭证图 | ✅ |
| P15-RUN-005 | 任意 admin 写操作触发 audit_log 写入 | ✅ |
| P15-RUN-006 | Vue admin "操作日志"页 + 4 维度筛选生效 | ✅ |

实测中暴露 + 修复的 3 项坑：
- iter15-fix-1: shop-backend 容器是 iter-10 之前的旧镜像，nginx.conf 无 `/uploads/` alias —— `docker-compose up -d --build shop-backend` 后 200 OK
- iter15-fix-2: shop-backend runtime/ 目录 mkdir 失败（iter-10 fix-3 的 macOS bind mount chown 问题重现）—— 手动 `docker-compose exec shop-backend chown -R www-data:www-data /var/www/html/runtime`
- iter15-fix-3: 小程序 `<image>` 标签不会用 apiBase 作 baseURL，相对路径 `/uploads/...` 加载失败 —— refund-apply 分 evidenceImages (相对) + evidencePreviews (绝对) 两个数组，my-refunds 渲染前用 absUrl() 转完整 URL

### iteration-14 售后退款 + reserved 库存态启用（2026-05-28）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · OMS 后端 | 2 migration + InventoryService + RefundStateMachine + RefundService + Refund controller + route | 7 | ✅ |
| B · WMS-OMS 退货链路 | 1 migration（ALTER inbound_orders）+ WMS Inbound 改 + OMS Handler 改 | 3 | ✅ |
| C · 小程序 + shop-backend BFF | apis + order-detail 改 + 2 新页（refund-apply, my-refunds）+ me 入口 + app.json + BFF Refund controller + route | 8 | ✅ |
| D · Vue admin | omsApi + Refunds.vue + router + AdminLayout | 4 | ✅ |
| E · 文档 | runbook + reconcile + progress | 3 | ✅ |

设计要点：
- 退款状态机 5 态：pending_approve → approved → received_back → refunded ↘ rejected
- refund_only 跳过 received_back，approve 后自动 refund
- return_refund 启用 reserved 中间态：approve→reserve+N，WMS 收货→reserved→available
- 复用 iter-12 wms.inventory.changed 事件流，payload 加可选 refund_no 字段（不增 stream / consumer）
- OMS WmsInventoryChangedHandler 内分叉处理
- 配额校验：order_items - 历史 refund_items 占用，避免超退

### iteration-14 运行时验证（2026-05-28 用户实测通过）

| Task ID | 验证项 | 状态 |
|---|---|---|
| P14-RUN-001 | OMS migrate 2 表（refund_orders + refund_items）| ✅ |
| P14-RUN-002 | WMS migrate（inbound_orders 加 refund_no 列）| ✅ |
| P14-RUN-003 | 4 后端重启 + Vue HMR / 微信开发工具加载新页 | ✅ |
| P14-RUN-004 | 仅退款链路：paid 订单 → 申请 → 审批通过 → status=refunded + locked-N/available+N | ✅ |
| P14-RUN-005 | 退货退款链路 A：completed 订单 → 申请 → 审批通过 → status=approved + reserved +N | ✅ |
| P14-RUN-006 | 退货退款链路 B：WMS 建 source_type=return + refund_no 入库单 → 一键完成 → OMS status=received_back + reserved-N/available+N | ✅ |
| P14-RUN-007 | 退货退款链路 C：Vue admin "确认退款" → status=refunded | ✅ |
| P14-RUN-008 | 拒绝退款 / 重新编译小程序加载新页 | ✅ |

实测中暴露 + 修复的 2 项坑：
- iter14-fix-1: 小程序详情页 onBuyNow 用 `wx.navigateTo` 跳购物车，但购物车是 tabBar 页面，跳转静默失败 — 改成 `wx.switchTab`
- iter14-fix-2: Vue admin Inbound 创建对话框漏了 refund_no 输入框 — 加 `v-if="form.source_type === 'return'"` 条件字段 + 客户端校验

### iteration-13 PIM → WMS SKU 主数据同步（2026-05-28）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · PIM 推送侧 | EventBus + Publisher + 6 publish 挂钩 + Replay command + console.php | 6 | ✅ |
| B · WMS 订阅侧 | migration + handler + consume:pim + console.php + supervisor + Inbound join | 6 | ✅ |
| C · Vue | Inbound.vue 加"商品"列 | 1 | ✅ |
| D · 文档 | runbook + reconcile + progress | 3 | ✅ |

设计要点：
- 第四条事件流 `pim.sku.changed`，方向 PIM → WMS，全量 upsert/delete 语义
- WMS 持有 PIM SKU read replica（wms_products），不允许 WMS 端编辑
- 入库/出库 UI 实时 join 显示商品名（detail 端点）
- 提供 `pim:replay-skus` 命令首次回填
- 6 处 PIM 写挂钩：Sku::create/update/softDelete + Product::update/publish/offline/softDelete
- 所有 publish 包 try/catch，失败仅 error_log，不阻塞主流程

### iteration-13 运行时验证（2026-05-28 用户实测通过）

| Task ID | 验证项 | 状态 |
|---|---|---|
| P13-RUN-001 | WMS migrate wms_products 表 | ✅ |
| P13-RUN-002 | WMS + PIM 重启，consume-pim RUNNING | ✅ |
| P13-RUN-003 | `pim:replay-skus` 回填 wms_products 与 PIM skus 数一致 | ✅ |
| P13-RUN-004 | WMS/入库 详情显示商品名 | ✅ |
| P13-RUN-005 | PIM 编辑 SPU 名 → WMS 详情立即反映 | ✅ |
| P13-RUN-006 | PIM SPU 下架 → wms_products is_active=0 | ✅ |
| P13-RUN-007 | PIM SKU 删除 → wms_products 行被删除 | ✅ |

### iteration-12 OMS 订阅 wms.inventory.changed → available 自动同步（2026-05-28）

| 文件 | 类型 | 状态 |
|---|---|---|
| `oms-backend/app/service/handler/WmsInventoryChangedHandler.php` | 新 handler | ✅ |
| `oms-backend/app/command/ConsumeWmsInventory.php` | 新 consumer command | ✅ |
| `oms-backend/config/console.php` | 注册 consume:wms-inventory | ✅ |
| `oms-backend/supervisor/consumer.conf` | 加 program:consume-wms-inventory | ✅ |

设计要点：
- 独立 stream `wms.inventory.changed` + 独立 group `oms-wms-inventory-group`（与 iter-9 的 outbound 流隔离）
- 幂等：`(inventory_log.related_order=inboundNo, sku_code, change_type=inbound)` 三元组防重放（避开 related_order limit 32 限制）
- 失败重投：复用 EventBus 的 delivery≥3 入死信表机制

| Task ID | 验证项 | 状态 |
|---|---|---|
| P12-RUN-001 | OMS 容器重启后 consume-wms + consume-wms-inventory 双 consumer RUNNING | ✅ |
| P12-RUN-002 | WMS 入库一键完成 → OMS available 自动 +N + WMS quantity +N 数据一致 | ✅ |

### iteration-11 WMS 后台 CRUD 写代码交付（2026-05-28）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · WMS 后端写 | 2 migration + Warehouse/Location CRUD + Inbound 新建 + route | 6 | ✅ |
| B · Vue WMS 写 | wms.ts + Warehouses/Locations 重写 + Inbound 新建 + router + AdminLayout | 7 | ✅ |
| C · 文档 | runbook + 对账 + progress | 3 | ✅ |

### iteration-11 运行时验证（2026-05-28 用户实测通过）

| Task ID | 验证项 | 状态 |
|---|---|---|
| P11-RUN-001 | WMS migrate 2 表（inbound_orders + inbound_items） | ✅ |
| P11-RUN-002 | 仓库 CRUD（含引用保护）| ✅ |
| P11-RUN-003 | 库位 CRUD + 批量生成 5×4=20 | ✅ |
| P11-RUN-004 | 入库单创建 + 一键完成 → status=received + event_published | ✅ |
| P11-RUN-005 | WMS 实物库存 +N | ✅ |
| P11-RUN-006 | OMS available 暂不自动同步（M3 补 OMS consumer 订阅 wms.inventory.changed）| 🟡 已知 |

实测中暴露 + 修复的 1 项坑：
- iter11-fix-1: data-schema.md 提到的 `inbound_date` / `production_date` 字段在 iter-6 inventory migration 中并未落库；Inbound::autoComplete 写入时报 `fields not exists:[inbound_date]` — 移除多余字段，仅写库内真实列

### iteration-10 后台 CRUD 写操作代码交付（2026-05-27）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · PIM 后端写 | Category/Brand/SPU/SKU CRUD + Upload + route + nginx | 7 | ✅ |
| B · OMS Admin 写 | cancelOrder/recoverOrder/adjustInventory + route | 2 | ✅ |
| C · Vue PIM 写 | http put/del/upload + pim apis + ImageUpload + 4 页 + router + vite proxy + d.ts | 10 | ✅ |
| D · Vue OMS 写 | oms apis + OrderDetail + Inventory | 3 | ✅ |
| E · 文档 | runbook + 对账 + progress | 3 | ✅ |

### iteration-10 运行时验证（2026-05-28 用户实测通过）

| Task ID | 验证项 | 状态 |
|---|---|---|
| P10-RUN-001 | curl 上传图片返回 url + 直接访问 200 | ✅ |
| P10-RUN-002 | Vue 后台 PIM 类目/品牌新增编辑删除 | ✅ |
| P10-RUN-003 | SPU 编辑页主图上传 + 卖点 + 详情 + 发布 / 下架 | ✅ |
| P10-RUN-004 | SKU 新增/编辑/删除 dialog | ✅ |
| P10-RUN-005 | OMS admin 强制取消 paid 订单 + 库存解锁 | ✅ |
| P10-RUN-006 | OMS 库存调整 + inventory_log 记录 | ✅ |
| P10-RUN-007 | 删除 SPU 后小程序首页不再展示 | ✅ |

实测中暴露 + 修复的 5 项坑（详见 [reconcile-report-iteration-10 §五](outputs/orchestration/reconcile-report-iteration-10.md)）：
- iter10-fix-1: Dockerfile 加的 supervisorctl rpcinterface section 被 apt 版 supervisor 拒绝，PIM 重 build 后进 restart 循环 — 删除该段
- iter10-fix-2: PIM route `admin/spu` POST 在 `admin/spu/<id>/publish` 之前导致路由错位 — 把所有 `<id>` 参数路由放到 plain create 路由之前
- iter10-fix-3: runtime named volume 默认 root 拥有，php-fpm www-data 无法 mkdir — chown + Dockerfile 加 start.sh 自动 chown
- iter10-fix-4: PHP `upload_max_filesize=2M` 默认太小 — 加 conf.d/uploads.ini 改成 10M
- iter10-fix-5: TP `$request->file()` 在异常路径触发二次调用 + tmp 文件已清，导致 fatal 覆盖原始错误 — Upload controller 改用原生 `$_FILES`

### Phase 3 iteration-9 代码交付（2026-05-26）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · 公共基础 | EventBus（OMS+WMS）+ dead_letter migration 各 1 | 4 | ✅ |
| B · OMS 改造 | markPaid 改 XADD + WmsOutboundCompletedHandler + ConsumeWmsEvents + composer 注册 + admin/dead-letter | 5 + 1 改 + 1 改 | ✅ |
| C · WMS 改造 | autoComplete 改 XADD + OmsOrderPaidHandler + ConsumeOmsEvents + composer 注册 | 4 + 1 改 | ✅ |
| D · 进程管理 | Dockerfile 改 supervisord 主+include + oms/wms supervisor/consumer.conf + docker-compose mount | 4 | ✅ |

### Phase 3 iteration-9 运行时验证（2026-05-26 用户实测）

| Task ID | 验证项 | 状态 | 证据 |
|---|---|---|---|
| P3-RUN-001 | 重建镜像 + 6 容器起 + 2 个 consumer RUNNING | ✅ | supervisord 日志 `consume-wms / consume-oms entered RUNNING` |
| P3-RUN-002 | bash scripts/events-flow.sh 端到端通过 | ✅ | order SO202605262127123960 → outbound PK202605262127122841 → express SF202605262127166941 → OMS status=shipped + 库存扣减 + 死信表空 |
| P3-RUN-003 | mock 支付响应 < 500ms | 🟡 未实测 | macOS date 不支持 %3N，脚本计时挂；功能本身正常 |
| P3-RUN-004 | WMS 故障演练（停 consumer + 积压追平） | 🟡 未实测 | 机制就绪：XREADGROUP PEL 兜底 |
| P3-RUN-005 | 毒消息 dead_letter 兜底 | 🟡 未实测 | 机制就绪：EventBus delivery≥3 入死信表 |
| P3-ORCH-006 | 主控 iteration-9 对账 | ✅ | iteration-9-runbook + reconcile-report + 21/21 代码完成 |

### Phase 2 P4 iteration-7 代码交付（2026-05-25）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · 后端读接口 | PIM Category/Brand + OMS Admin (4 方法) + WMS Warehouse/Location/Inventory + 3 route | 8 | ✅ |
| B · Vue 架构 | vite proxy + 5 apis 模块 + auth store + AdminLayout + StatusTag + router 嵌套 | 11 | ✅ |
| C · 业务页面 | Dashboard + 4 PIM + 3 OMS + 5 WMS + Login 修正 + 旧文件清理 | 14 | ✅ |

### Phase 2 P4 iteration-7 运行时验证（2026-05-26 用户实测通过）

| Task ID | 验证项 | 状态 | 证据 |
|---|---|---|---|
| P2-ADM-001 | 后端 8 个新读接口正常返回 | ✅ | 通过 Vue 后台间接调用全部 ok |
| P2-ADM-002 | npm run dev + 浏览器登录 admin/admin123 | ✅ | 修 AxiosInstance 类型导入后跳转 dashboard 正常 |
| P2-ADM-003 | 顶栏 4 后端 tag 全部 ok | ✅ | shop/pim/oms/wms 都 ok |
| P2-ADM-004 | Dashboard KPI | ✅ | 显示订单数 + 销售额 + SKU + 锁定库存 |
| P2-ADM-005 | PIM/OMS/WMS 12 个二级页面 | ✅ | 全部加载数据 |
| P2-ADM-006 | 新订单 → WMS 一键完成 → 状态推进 + OMS 同步 | ✅ | curl 下单 + mock 支付 → 后台点按钮 → 状态 allocated → shipped → OMS 同步 shipped |

### Phase 2 P2 iteration-6 代码交付（2026-05-25）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · WMS | 6 migration + seed + 6 model + 2 service + 2 controller + route | 18 | ✅ |
| B · OMS 联动 | OrderService 改 + Order::wmsShipped + route 加端点 | 3 | ✅ |

### Phase 2 P2 iteration-6 运行时验证（2026-05-25 用户实测通过）

| Task ID | 验证项 | 状态 | 证据 |
|---|---|---|---|
| P2-WMS-001 | WMS migrate 6 表 + seed 1 仓 + 5 库位 + 5 inventory | ✅ | seed 输出 `1 仓 + 5 库位 + 5 SKU × 100 实物` |
| P2-WMS-002 | mock 支付 → OMS picking_orders.status=sent + WMS outbound_orders.status=allocated | ✅ | PK202605251943407179：oms=sent / wms=allocated；WMS inventory.locked=1 |
| P2-WMS-003 | WMS auto-complete → 实物库存扣减 + OMS 订单 shipped + express_no | ✅ | SO202605251953197964：status=shipped, express_no=SF202605251953477914, oms_callback_ok=true |
| P2-WMS-004 | 用户确认收货 → status=completed | ✅ | completed_at=19:54:38 |

### Phase 2 iteration-5 运行时验证（2026-05-25 用户实测通过）

| Task ID | 验证项 | 状态 | 证据 |
|---|---|---|---|
| P2-RUN-001 | 6 容器 + 7 migration + seed inventory | ✅ | route:list 10 条 + inventory 5 SKU available=100 |
| P2-RUN-002 | 短信发送 + JWT 登录 | ✅ | dev 模式 code=123456，TOKEN length=199 |
| P2-RUN-003 | 加购 → 下单 SO20260525190212... → mock 支付 → status=paid + 库存 100/0→98/2 | ✅ | 单 SO 实测 paid_at=19:03:23 |
| P2-RUN-004 | 加购 → 下单 SO20260525190536... → 取消 → cancelled + 库存 99/1→100/0 | ✅ | cancel_reason=用户取消 + 库存完整回滚 |
| P2-RUN-005 | 小程序 9 页闭环：登录/首页/详情/购物车/结算/支付/支付成功/订单详情/我的 | ✅ | 用户实测全过 |
| P3-ORCH-005 | 主控 iteration-5 对账 | ✅ | 7 坑文档 + 19 步验证表 |

### Phase 2 iteration-4 代码交付（2026-05-25）

| Wave | 范围 | 文件数 | 状态 |
|---|---|---|---|
| A · OMS | 5 migration + 1 seed + 6 model + 3 service + 3 controller + 1 route | 19 | ✅ |
| B · PIM | sku/:code + sku/batch | 2 | ✅ |
| C · shop-backend BFF | 2 migration + 3 model + 2 service + 1 middleware + 5 controller + 1 route | 13 | ✅ |
| D · 小程序 | apis + auth utils + app.json + 9 页面 × 4 文件 | 41 | ✅ |

### Phase 1 运行时验证（2026-05-25 用户实测通过）

| Task ID | 验证项 | 状态 | 证据 |
|---|---|---|---|
| P1-RUN-001 | 4 后端 /health | ✅ | 4 endpoint db=ok redis=ok |
| P1-RUN-002 | pim migrate + seed | ✅ | 4 表 + 3 类目/3 品牌/3 SPU/5 SKU |
| P1-RUN-003 | 端到端 BFF | ✅ | product/list 返回 3 SPU |
| P1-RUN-004 | Vue 后台 | ✅ | 用户截图 |
| P1-RUN-005 | 小程序首页 | ✅ | 用户截图 |
| P1-RUN-006 | vendor named volume 永久稳定 | ✅ | docker-compose |
| P3-ORCH-001 | 主控 iteration-3 对账 | ✅ | 17/17 PASS |

---

## 已完成归档

### Phase 1 代码骨架（iteration-2，2026-05-24）

| Task ID | 工程 | 文件数 |
|---|---|---|
| P1-INFRA-001 | apps/ 顶层 docker/nginx | 6 |
| P1-DEV-001 | shop-backend | 16 |
| P1-DEV-002 | pim-backend | 19 |
| P1-DEV-003 | oms-backend | 14 |
| P1-DEV-004 | wms-backend | 14 |
| P1-DEV-005 | shop-miniprogram | 16 |
| P1-DEV-006 | shop-admin | 13 |
| P2-ORCH-001 | iteration-2 对账 | — |

### Phase 0（2026-05-24）
8 份产物（设计 3 + 架构 5）+ iteration-1 对账。详见 [iteration-1 报告](outputs/orchestration/reconcile-report-iteration-1.md)。

### Phase -1（2026-05-24）
5 份产物（feature-breakdown / task-spec 130 任务 / edge-cases / non-goals / design-brief）+ iteration-0 对账。详见 [iteration-0 报告](outputs/orchestration/reconcile-report-iteration-0.md)。
