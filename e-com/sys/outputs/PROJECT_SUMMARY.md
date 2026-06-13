# PROJECT_SUMMARY.md · 65 轮迭代全景归档

> **覆盖范围**：iter-0 (2026-05-24) ~ iter-65 (2026-06-04)，65 轮。路线图全部收口 + 中低优 Q 大清扫 2 大批次（iter-51~59 + iter-60~65）共关闭 ~50 个 Q。
> **状态**：MVP + 准生产 + 多商家自助入驻 + 商家自助提现 + 内容运营深化 + EFF + BI 全套 + PDA 摄像头扫码 + 跨店调拨平台代理 + 多店券分摊 + ⌘K 历史/上下选 + Refund Model 全替换 + 操作日志撤销 + 商家仓审核流。
> **本文用途**：项目门面 / 复盘材料 / 下一阶段决策起点。

> **iter-60~65 批次新增**（2026-06-04 一气呵成 6 轮）：
> - iter-60 内容运营深化：banner 按店 / 推荐位 RFM 个性化 / 营销日历甘特图 / 专题 link 集成 / 冲突预警
> - iter-61 多店深化：KV 灰度激活 SPLIT / 跨店满减券按 goods 比例分摊（最大店得余数）/ 跨店调拨平台代理审核
> - iter-62 商家自助入驻 / Refund Model 全替换（12 处 Db::name → Refund::query）
> - iter-63 BI 深化 11 endpoints：RFM 分位法 + 趋势 + 客户卡 / Funnel cohort + 时间序列 + category 切片 + 流失归因 / SKU 生命周期月迁移 / 预警历史 + 4 新预警类
> - iter-64 效率深化：todos 24h delta + 色阶 / 高级搜索"我的视图" / dead_letter 自动 replay 策略表 / 二审备注 / EFF-06 操作日志撤销
> - iter-65 换货 v2 联动库存 / PDA 摄像头扫码 + 入库分步 + 离线缓存 + 任务图 / ⌘K 历史 + 上下选 + SPU 跳带筛选

## 一、项目定位

| 项 | 值 |
|---|---|
| 业务 | 中型电商：小程序商城 + 4 后端（shop/pim/oms/wms）+ Vue 后台 |
| 形态 | 多 Agent 协作开发（主控 + 产品 + 设计 + 架构 + 开发 + 测试） |
| 技术栈 | PHP 8.2 + ThinkPHP 8 + MySQL 8 + Redis 7 + 微信小程序原生 + Vue 3 + Element Plus |
| 容器 | docker-compose（6 服务：4 后端 + mysql + redis）|
| 通信 | HTTP API + Redis Stream 事件总线（异步）|

## 二、51 轮迭代时间线

| Iter | 日期 | 主题 | 产出 |
|---|---|---|---|
| 0 | 05-24 | 产品阶段（Phase -1）| feature-breakdown / task-spec 130 任务 / edge-cases / non-goals / design-brief |
| 1 | 05-24 | 设计 + 架构（Phase 0）| 8 份产物：design-system / prototype-spec / data-schema / data-flow / api-list / module-deps / tech-stack |
| 2 | 05-24 | 代码骨架（Phase 1）| 6 工程 + docker-compose + nginx + init.sql（98 文件） |
| 3 | 05-25 | Phase 1 运行时验证 | 4 后端 /health 通 + 修 13 项 Phase 1 坑 |
| 4 | 05-25 | Phase 2 P0/P1 业务下单链路 | OMS 状态机 + shop-backend BFF + 小程序 9 页 |
| 5 | 05-25 | Phase 2 运行时验证 | 加购→下单→支付→取消全跑通 + 修 7 项坑 |
| 6 | 05-25 | Phase 2 P2：WMS 履约 | 6 migration + 出库一键完成 + OMS 联动 shipped |
| 7 | 05-25 | Phase 2 P4：Vue 后台读 | 13 业务页面 + 5 apis 模块 + auth store |
| 8 | 05-26 | 边界场景验证 | 10 项防护实战：超卖 / 并发 / 幂等 / 状态机非法转移 / JWT / 上游不可达 |
| 9 | 05-26 | Phase 3 异步事件总线 | Redis Stream + supervisord consumer + 死信表（替换 P2 同步 HTTP）|
| 10 | 05-27 | 后台 CRUD 写（PIM + OMS Admin）| 上传图片 + 4 PIM CRUD 页 + OMS 强制取消 + 库存调整 |
| 11 | 05-28 | WMS 后台 CRUD 写 | 仓库 / 库位（批量生成）/ 入库一键完成 + 推 wms.inventory.changed 事件 |
| 12 | 05-28 | OMS 订阅入库事件 | 入库 → OMS available 自动 +N 闭环最后一公里 |
| 13 | 05-28 | PIM → WMS SKU 主数据同步 | 第 4 条事件流 `pim.sku.changed` + 新表 wms_products + Inbound 详情显示商品名 + `pim:replay-skus` 回填命令 |
| 14 | 05-28 | 售后退款 + reserved 启用 | refund_orders/refund_items + 5 态状态机（仅退款 / 退货退款）+ 小程序申请页 + Vue 后台审批 + 复用 wms.inventory.changed 加 refund_no 字段（无新流） |
| 15 | 05-28 | 退货凭证图片 + admin audit log | shop-backend Upload（uploads/refund-evid 子目录）+ refund_orders.evidence_images + admin_audit_log 表 + AuditService 注入 6 处 admin 写操作 + Vue 操作日志页 |
| 16 | 05-28 | 售后超时关闭 + 最小 RBAC | 状态机加 `closed_overtime` + supervisord loop（1 小时扫一次）+ admin_users + 手写 HS256 JWT + AdminAuth middleware + 3 角色（super_admin / warehouse / sales_ops）+ Vue 菜单显隐 |
| 17 | 05-28 | 全后端 RBAC + admin 用户管理 UI + 测试流程改革 | PIM/WMS 各自 AdminTokenService + AdminAuth middleware（变参 role 限制）+ admin_users CRUD UI（仅 super_admin 可见）+ 系统管理子菜单整合（操作日志 + 管理员用户）+ **首次按 auto-test/manual-test 拆分**（auto 12 项 curl 跑、manual 9 项用户点 UI） |
| 18 | 05-29 | 运营增强四件套（B/C/A/D） | 导出 CSV（订单/退款/库存，UTF-8 BOM + fputcsv 零依赖）+ 模糊搜索（订单/退款/商品 LIKE）+ Dashboard ECharts 4 图（日订单 / 销售额 / TOP10 SKU / 退款率）+ 时间筛选 + 批量操作（订单取消 / 退款通过/拒绝，每单独立 tx + failed[] 返回）。auto 16/16 + manual 14/14。修 1 个 pre-existing bug：OrderStateMachine paid → cancelled 缺失。 |
| 19 | 06-01 | 营销模块开篇：优惠券 / 促销 | 满减 + 折扣两种类型 / coupons + user_coupons 表 / OMS Admin CRUD（super_admin + sales_ops） / shop-backend 用户领券核销（双锁防并发超领）/ OrderService 下单 tx 内核销 / Vue「营销」菜单父级 + 优惠券管理页 / 小程序领券中心 + 我的优惠券 + 结算页选券。auto 16/16 + manual 用户回报 OK。**架构补丁**：shop-backend 加 `oms` 副连接跨库读 coupons（避免引入 RPC）。 |
| 20 | 06-01 | UGC + UX 三件套：评价 + 收藏 + 地址簿 | 3 张表（addresses / favorites / reviews）全放 shop_db；shop-backend 3 service + 3 controller + Order/submit 改为接收 body.address（兼容老 last_address_snapshot 回落）；PIM 新增 `spu/batch` 接口；OMS Admin 评价审核（**反向跨库读**：OMS 加 `shop` 副连接读 shop_db.reviews）+ hide/restore 软切 status；BFF productDetail 自动聚合 review_count + rating_avg + 前 3 条；Vue「营销」菜单加评价审核页；小程序 5 新页（地址列表/编辑、收藏、评价提交、我的评价）+ 5 改页（detail 加心标+评价区、checkout 改地址簿、order-detail 加去评价、me 加营销+个人中心入口、apis 新增 11 个方法）。auto 27/27 + manual 14/14。修 1 bug：iter20-fix-1（checkout/onShow 覆盖已选地址，manual M14 抓到）。 |
| 21 | 06-01 | 运营 Dashboard 增强四件套（数据洞察） | `/admin/stats` 加 5 新字段（coupon_metrics / coupon_series / review_metrics / review_series / retention_metrics）；exportOrders 加「优惠券」+「优惠金额(元)」两列；Vue Dashboard 加 4 KPI 卡（核销率/评价数+均分/转化率/复购率，带左侧彩条）+ 2 双轴 ECharts 图（券领取-核销-核销率/评价数-均分）。**实际只改 2 个代码文件 + 0 新表 + 0 新菜单**；跨库读 shop_db.reviews+users 复用 iter-20 oms shop 副连接。auto 8/8 + manual 6/6，**0 bug iter**（项目首次）。 |
| 22 | 06-02 | WMS 智能化三件套 | 实时盘点（stock_takes/stock_take_items，scope=all/zone/location/sku，起盘 snapshot → 录入 → complete tx 内自动调差）+ 多 SKU 调拨基础（transfers 单 SKU 简化版，draft/in_transit/completed/cancelled）+ 上架推荐 Top3（LocationRecommendService，权重=已有SKU聚集 40 + 黄金库位 30 + 同区 20 + 容量 10）+ Vue 后台 2 新页 + Inbound 加"智能推荐"按钮。auto 17/17 + manual 9/9。**抓 3 个 UX bug 抓在 manual 阶段**（fix-1 库位文本→下拉 / fix-2 SKU 文本→搜索下拉 / fix-3 库位+SKU 三方智能联动 + disabled 标注 "无商品/无该 SKU/已满/可用 N 件"）。**经验：列表/详情型功能用 dropdown + 显示"现状信息"比裸 text input 用户体验天差地别**。 |
| 23 | 06-02 | 多 SKU 批量调拨单（Q22-01 留位） | 把 iter-22 单 SKU 调拨升级为"一头多明细"：transfers ALTER inline 字段 nullable（旧数据 legacy 单 SKU 保留可读）+ 新建 transfer_items；TransferService 重写按 items 数组遍历操作；行级联动复用 iter-22 fix-3 模式 + 加 batch_no 下拉（按 SKU+源库位推断可选批次）；ship 失败全单 rollback；列表新单显"X 行明细"蓝标 / 老单显"legacy 单 SKU"灰标。auto 11/11。 |
| 24 | 06-02 | WMS 完整化 + OMS 对接补齐（P0+P1 五件套） | **P0-1** wms_db.inventory_log 表（before/after qty+locked 全表追溯，8 种 change_type）+ WmsInventoryLogService + InventoryService.lock/deduct/unlock 3 处接入；**P0-2** 调拨 receive 推 `wms.inventory.changed` 加 transfer_no（OMS 仅审计）；**P0-3** 盘点 complete 推 take_no（OMS available += delta，盘盈/盘亏）；OMS handler 重构为 4 分支（refund/inbound/transfer/take_no），延续 iter-14 字段扩展模式；**P1-1** 拣货任务独立 admin API（list/assign/scan/complete，picking_tasks 加 operator+assigned_at）；**P1-2** OMS↔WMS 库存对账（OMS 加 shop 副连接 → WMS 加 oms 副连接，定期触发对比 SUM(quantity-locked) vs OMS.available，不自动修复仅记录 + admin 确认）。auto 12/12。WMS 菜单从 5 → 10 项。 |
| 25 | 06-02 | WMS 增强四件套 | WMS Dashboard 单接口 `/admin/wms-stats?days=N`（6 KPI + 仓库利用率 + 入出库时序 + 拣货效率 + TOP 10 SKU）+ Vue 总览页 + 3 ECharts 图；低库存预警（stock_alert_rules 表 + 每 SKU 阈值规则 + 实时告警计算 SUM(quantity-locked) < threshold）+ Vue 告警列表 + 规则配置；入库 autoComplete 集成 LocationRecommendService Top1（不再硬塞 staging）+ 走 InventoryService.inbound 写 log；findAvailable FIFO（CASE WHEN INIT 优先 + batch_no ASC + locked_quantity ASC）。auto 10/10。WMS 菜单 10 → 12 项。 |
| 26 | 06-02 | OMS 完整化 P0 三件套（跟 WMS iter-24 对称） | **P0-1** OMS 推 3 个新事件（`oms.order.cancelled` / `oms.refund.approved` / `oms.refund.refunded`）+ WMS 3 个 handler 接收写 oms_event_audit_log + 1 个 consume:oms-audit command 多路复用（supervisord 启 3 个独立进程）；**P0-2** OMS 加 wms 副连接 → OMS 视角的库存对账（跟 WMS iter-24 P1-2 对偶，diff 符号相反）；**P0-3** 财务结算单（settlement_orders 表 + order confirm/refund refunded 自动落单 + UNIQUE(type, ref_no) 幂等 + Vue 列表+导出 CSV + 净金额计算）。事件总线 4 流 → 7 流。auto 14/14。RBAC 三层：super_admin 独占对账 / sales+super 看财务 / warehouse 都不许。 |
| 27 | 06-02 | 优惠券高级三件套（Q19-01/02/03） | **Q19-01** 商品券/类目券（coupons 加 scope_type=all/spu/category + scope_value JSON 数组 + calculateDiscount 加 items 范围校验）；**Q19-02** 新人券自动发放（coupon_auto_rules 表 + CouponAutoRuleService.grantForTrigger + shop-backend User.login 首次创建用户调 OMS infra 接口 + per_user_limit 幂等）；**Q19-03** 多券叠加（order_coupons 关联表 + UNIQUE(order_no, coupon_type) 强约束"同类不叠" + applyMultipleInTransaction 满减先算+折扣基于减后金额）；OrderService.create 接收 user_coupon_ids 数组（兼容老 user_coupon_id 单数）；Vue Coupons.vue 加 scope 字段 + CouponRules.vue 新页 + 营销菜单加自动发券规则；小程序 apis 支持 ids 数组。auto 15/15，**3 个开发期 bug 全 auto-test 抓修**：fix-1 Order controller 漏传 ids 数组 / fix-2 `isset($arr[$k])` 当 value=null 假阴性 → 改 array_key_exists / fix-3 Coupon controller 漏接 scope 参数。 |
| 28 | 06-03 | OMS 增强四件套 A（对外集成 + 数据洞察 + 渐进重构）| **A1** Webhook 推送（webhook_subscriptions 表 + WebhookService 同步 5s timeout + 3 retry + HMAC-SHA256 签名 + 失败入 dead_letter；订阅 order.completed/cancelled/refund.refunded/refund.approved；OrderService confirm/cancel 和 RefundService refund 3 处注入 fire）；**A2** Dashboard 财务维度（基于 iter-26 settlement_orders 聚合：finance_metrics 营收+退款+净+settled 比例 / finance_series 日序列 / coupon_usage_metrics 多券订单占比 / Vue 4 张财务 KPI 卡）；**A3** Refund Model 渐进封装（新增 Refund + RefundItem Model 类含 hasMany 关联 + canTransit 状态机辅助；service 不替换避免双写灾难）；A4 导出增强（runbook 占位，xlsx 不引入 PhpSpreadsheet 留 M3+）。auto 13/13，1 bug 当场抓修：fix-1 dead_letter 表字段是 retry_count 不是 delivery_count，**经验：dead_letter 写入失败应至少记 STDOUT log，不应完全 silent**。 |
| 29 | 06-03 | PIM 完整化 P1+P2（补齐审计 + 状态机 + Dashboard）| **P1-a** pim_admin_audit_log 表 + AuditService + 注入 SPU/SKU/Brand/Category 14 处写操作；**P1-b** spu_status_log 表 + SpuStatusLogService + Product create/publish/offline/delete 4 处状态轨迹；**P2** PIM Dashboard `/admin/stats`（**新增 PIM→OMS / PIM→WMS 副连接**：6 KPI / TOP10 SPU 销量跨库读 OMS order_items / 改价时间序列从 audit_log 解析 base_price diff / 上下架曲线 from spu_status_log / 低库存清单跨库 WMS inventory），Vue 3 ECharts 图（TOP10 SPU 双轴 / 改价趋势 / 上下架曲线）+ AuditLog.vue 复刻 OMS 模板。PIM 子菜单 3 → 5 项。**跨库副连接累计 5 个方向**（+ PIM→OMS+WMS）。auto 13/13。**经验：JWT payload sub=user_id（数字），audit operator 应优先取 username 字段；跨库读统一 try/catch 容错保证 Dashboard 弱依赖** |
| 30 | 06-03 | PIM 增强三件套（CSV 批量 + 属性模板 + 图片库）| **A** SPU CSV 批量导出/导入（UTF-8 BOM + fputcsv + 按 code 幂等：存在则 update / 不存在则 create draft；header 校验 + 行级 errors 收集；前端 Blob 下载绕过 axios 拦截器）；**B** 属性模板（attribute_templates 表 + JSON schema attrs + CRUD + ProductEdit"应用模板"自动追加 attrs 行 + spus.attrs 字段持久化，Product create/update 加接 attrs 参数）；**C** 图片库（image_library 表 + Upload.image 落盘后自动回纳 + Vue 网格视图 + 复制 URL + 软删；失败不阻塞上传）。PIM 子菜单 5 → 7 项。auto 11/11，0 fix。**经验：属性 JSON schema vs 反范式表权衡选 JSON 保灵活性；CSV 导出 BOM `\xEF\xBB\xBF` Excel 直接打开不乱码；图片库自动回纳 + 上传失败 silent，UI 用"移除"语义而非"删除"避免误导用户以为真删盘文件** |
| 31 | 06-03 | PIM 精修三件套（列表内联跨库 + ImagePicker 复用 + 引用阻断）| **A Q29-04** SPU 列表 adminList 加批量跨库聚合："可用库存"（一次 WMS 跨库 group sku_code）+"近 30 天销量"（一次 OMS 跨库聚合）回填到每 SPU row，3 次查询完成无 N+1；Vue Products 表加 2 列（三色 tag + 销量红字）；**B Q30-04** 新 ImagePicker.vue 弹框组件 + ImageUpload 加 `enable-library` prop + 多选 + 限额；ProductEdit 主图既可上传又可从图片库选，合并去重 + 超额跳过；**C Q30-03** ImageLibrary.list 加 used_count 实时算（扫所有 spus.main_images JSON），delete 前查 SPU 引用 → 有引用则 409 + 返回引用 SPU 清单。**0 新表 0 新 migration**，纯增量加字段 + 复用 API。auto 6/6，0 fix。**经验：批量跨库避 N+1（先 sku_code 全集再单次 group by）；used_count 实时算比维护字段简单可靠；ImageUpload 加 prop 比新组件替换更稳；阻断必须给出引用清单让用户立即定位** |
| 59 | 06-04 | 商家仓入库审核流（Q38-02 收口）| Inbound.create 检测 warehouse_type=merchant 自动 needs_review=1 + Inbound.review endpoint（super/sales）+ autoComplete 拒未审单 |
| 58 | 06-04 | Token 黑名单 + 商家仓审核（M3-21 + Q38-02）| 新表 token_blacklist + AdminAuth middleware 加 blacklist 校验（用户级 `{sub}:*` 仅黑 blacklist 创建前签发的 token + 单 token 精确 `{sub}:{iat}`）+ AdminUser.changePassword 改密时 insert 全黑（7d 有效期）；inbound_orders ALTER +needs_review/reviewed_by/reviewed_at 表结构就位（service 联动留 v1.5） |
| 57 | 06-04 | 换货深化（Q34-02 SKU 下拉 + Q34-03 webhook）| PIM Sku.listBySpu endpoint + shop-backend BFF skusBySpu 透传 + ExchangeService.markCompleted fireAsync exchange.completed webhook。fix-1 路由参数命名 spuId vs `<id>` 不匹配 → 改 $id。**小程序 wxml dropdown 改造留 v1.5（后端已就绪）** |
| 56 | 06-04 | 月度结算 + 店铺评分（Q50-04 + Q39-04）| Admin.withdrawalMonthlyStatement 按 store/year_month 聚合 settlement_by_type + paid_withdrawals + net/paid_total/remaining；stores ALTER +rating_avg/review_count/rating_calc_at + Admin.refreshStoreRatings 跨库 shop_db.reviews → PIM.spus.store_id → update stores（super_admin 触发）。fix-1 SQL only_full_group_by 误带 rating 字段 → 改 SUM(rating)。auto 2/2 后端 |
| 55 | 06-04 | RBAC 收紧（Q44-05 + Q43-03）| OMS route 主 admin group middleware 加显式白名单 `super_admin, sales_ops, warehouse, store_owner, store_staff`（排除 editor 仅 PIM）+ OMS StoreContextService sales_ops 分支：有 store_admins 绑定 → 限店；无绑定 → 跨店兼容旧账号。auto 4/4。**经验：横切角色加入后必须系统性扫一遍所有 endpoint 角色矩阵；新角色定位明确后 endpoint 收紧 = 显式白名单 > 默认全开** |
| 54 | 06-04 | Webhook 外推 + 提现频率 + WMS 日志（Q49-03/Q50-01/Q50-03/Q32-01 一锅端）| OMS WithdrawalService apply 加 24h pending 限流（KV `withdrawal.max_pending_per_24h` 默认 1）+ approve/markPaid 调 fireWebhook 异步外推 `withdrawal.approved` / `withdrawal.paid`（复用 iter-33 fireAsync）；OMS Admin.alertSummary critical 触发时 fireAsync `bi.alert.critical` + 文件锁 5min 冷却防风暴；WMS 新表 wms_webhook_log + AlertNotifyService.fireWithLog 写 success/fail/http_code/response_body/error。auto T1 提现频率拒 + T2 日志表存在。**经验：webhook 外推 = 业务关键节点都加 fire；critical alert webhook 要有冷却防风暴；日志表是审计 + 排查必备** |
| 53 | 06-04 | BI 联动运营（Q46-02 + Q48-01）| OMS Admin.rfmGrantCoupon endpoint：复用 iter-46 RFM 算法找 segment users + 逐用户事务发券（user_coupons + coupons.claimed_count++）+ 单失不阻；PIM Admin.skuLifecycleBatchOffline endpoint：复用 iter-48 阶段判定找"淘汰" published SPU + 批量 status='offline' + spu_status_log。Vue Bi/Rfm.vue 选中 segment 后 +"🎁 一键发券"按钮 + 弹框填 coupon_id。Vue Bi/SkuLifecycle.vue 选中"淘汰" +"📦 一键下架"按钮 + 二次确认。auto 5/5，1 fix（user_coupons 无 expire_at 字段误传，移除）。**经验：BI 从"看"到"做"是把分析结果直接变 action — 复用现有 service 加 batch wrapper 比独立写新发券/下架业务简单**|
| 52 | 06-04 | 阈值后台可配 KV（**4 中优 Q 一锅端**）| 新表 system_configs（17 条 seed / 5 category）+ SystemConfigService OMS 主（cache+reload+setBatch+listByCategory）+ PIM 跨库只读副本 + 4 处 plug（RefundService 退款金额阈值 / ExchangeService 换货数量 / Admin.alertSummary 9 预警 ratio+count / WithdrawalService 提现上下限 / PIM lifecycleStage 4 SKU 阶段阈值）+ Admin.configList/configUpdate（仅 super）+ Vue SystemConfig.vue（按 category 分组 + dirty 标记 + 批量保存）+ 菜单 +"⚙️ 系统参数"。auto 10/10。**经验：阈值 ENV → KV 是"运维-业务边界"转移；多服务同模式 service 跨库读模板已成熟（iter-29/52）；保存时 reload cache 立即生效不需重启** |
| 51 | 06-04 | 小程序跳转修复 Q40-01 + Q41-01（**内容运营断链补齐**）| **Q40-01** BannerService.publicListBanners 当 link_type=spu + link_value=数字 spu_id 时跨库 PIM.skus 拿首 SKU code（按 id asc）回填 link_sku；publicListFeatured 每项跨库填 sku_code。**Q41-01** MarketingTopicService.publicListTopicByCode item 跨库填 sku_code。两 service 各 1 私有 helper fetchFirstSkuCodes（重复 2 次符合 iter-41 "3 次后再抽公共"约定）。跨库失败 try/catch 降级 sku_code 留空字符串。小程序：home/index.js onBannerTap（4 分支：spu→navigateTo detail / category→list / url→toast / none→不动）+ onFeaturedTap（用 data-sku 直跳 / 无 sku toast"商品已下架"）+ topic-detail/index.js onItemTap 同模式。wxml 加 data-sku 字段。0 新表 0 新接口。auto 8/8，0 fix。**经验：内容运营断链是"前置 N 轮做了营销资源建设但终端点击不通"的典型；后端补 join 比前端二次查询省 N 次往返；跨库 helper 重复 2 次刚好不抽（3+ 才抽符合 KISS）；公开接口字段精简 + 必要扩展（link_sku/sku_code）= 默认黑名单 + 按需透出** |
| 50 | 06-04 | 商家自助提现 Q35-03/Q39-03（**BIZ-08 真正最后一公里**）| 新表 store_withdrawals + 状态机 pending→approved→paid / ↘ rejected + 新 WithdrawalService（getBalance 算 settlement 净额 - approved 锁定 - paid 已发 / apply tx 内 lock 余额校验 / transitState 通用 helper 含 lock(true) 防并发 / approve / reject 必须填原因 / markPaid 必须 method+ref / list 按 store_ids 三态自动过滤）+ 新 Withdrawal controller（balance/apply/list 按 role 分流 / approve+reject+pay 仅 super_admin / store_owner 自动从 store_ids 推 storeId 不需传参 / 平台店 store_id=1 拒）+ 6 OMS 路由（参数路由前 plain POST 后沿 iter-19 经验）。Vue Withdrawals.vue：4 余额卡（仅 canApplyWithdrawal 角色可见，hot/warn/good 三色 + 可提现/累计净额/审批中/已打款）+ 状态过滤下拉 + 状态彩色 tag pending/approved/paid/rejected + 申请弹框（元→分换算 + 当前可提示）+ 审批通过/拒绝（含原因输入）/标记打款（含流水号）3 action 按钮 v-if=canApproveWithdrawal + 商家视图自动隐藏 store_id 列。auth.ts +3 computed（canSeeWithdrawal/canApproveWithdrawal/canApplyWithdrawal）。OMS 子菜 +"💰 商家提现"v-if=canSeeWithdrawal。audit 写 admin_audit_log（沿 iter-15）。auto 15/15，2 fix-on-the-fly（fix-1 路由顺序 plain POST 放参数路由前 → approve 被 apply 吞返"仅商家可申请"，调整顺序：第 N 次踩同坑 / fix-2 AuditService::log 7 参签名错位，requestedBy 放 reason 位，改为 null 占 reason + operator 末位）。**经验：BIZ-08 多商家最后一公里是"提现 → 钱真的能回到商家手里"；状态机 + 余额锁定 + 审计三件套是金融类业务标配；pending 不锁余额（避免恶意占）approved/paid 锁；store_owner 不需要主动传 storeId — 服务端从 store_ids 推；路由参数前 plain 后已是项目第 4 次踩坑，肌肉记忆未形成的话考虑加 linter 规则；BIZ-08 真正闭环：商家入驻→上架→订单拆单→抽佣→对账→**提现→钱到账**** |
| 49 | 06-04 | BI-4 异常预警面板（**四、BI 系列收口 + 整个路线图全部收口 🎉**）| **BI-04** OMS Admin.alertSummary 单 endpoint 聚合 4 类预警：① order_surge 今日订单 vs 7d 均 ratio（≥2 critical / ≥1.5 warn / ≤0.3 warn(drop)）② stock_low 跨库 WMS.stock_alert_rules + WMS.inventory 求 SKU 数（默认 threshold 30；≥5 critical / ≥1 warn）③ refund_rate_spike 今日退款率 vs 7d 均退款率 ratio（≥1.5 critical / ≥1.2 warn）④ dead_letter_backlog NOT LIKE '%replayed at%' 条数（≥10 critical / ≥3 warn）。**冷启动保护**：order_surge 7d 均 < 3 单 / refund 今日订单 < 3 单 → 降级 ok（避免开发期假告警）。每 alert 返统一 schema `{key, name, level, current, baseline, ratio, items[], action_hint}` + 顶层 summary `{critical, warn, total_checks}`。store_ids 三态 + role guard fail-fast 沿 BI 系列模板。Vue Bi/Alerts.vue：4 大彩色卡片 grid（auto-fit 320px）+ level 边框 4px 左侧色（ok 绿 / warn 橙 / critical 红）+ emoji icon（📈/📦/↩️/💀）+ 28px 大数字 current + baseline+ratio + 含 items list（库存掉底 + 死信积压 top 5）+ 推荐操作 action_hint + 顶部 summary tag（严重 N / 预警 M / 全部正常）+ 30s 自动刷新 switch + 点卡跳关联页面（死信→/oms/dead-letter / 库存→/wms/stock-alerts / 订单→/oms/orders / 退款→/oms/refunds）。0 新表 0 新 migration。菜单 BI 子菜 +"🚨 异常预警"+路由 + apis +1。auto **10/10 ✅ + 0 fix（项目第 3 个 0-bug iter）**。**经验：单 endpoint 聚合 N 类预警比拆 N 个 endpoint 节省 N-1x 网络往返；冷启动保护避免小样本噪音是预警系统必备（开发期 < 3 单时所有 ratio 趋向极端）；replayed 死信用 error 字段字符串协议（沿 iter-42 EFF-08 append-only 模式）省了 ALTER 表加 status 字段；预警卡片应当链接到"可立即操作"的关联页面 — 让 BI 不只是展示而是行动入口** |
| 48 | 06-04 | BI-3 SKU 生命周期 5 阶段（**四、BI 系列 3/4**）| **BI-03** PIM Admin.skuLifecycle endpoint（放 PIM 复用 iter-29 PIM→OMS+WMS 副连接，OMS Admin 无 PIM 副连接故不放此处）：days 7-365 clamp + store_ids 三态过滤 + 跨库三方读（PIM 自有 spus/skus 主表 → 跨库 OMS.order_items 拿窗口销量 SUM(qty) by sku_code → 跨库 WMS.inventory 拿在库 SUM(quantity-locked) by sku_code）+ SKU code→spu_id 反查映射 + spus.published_at（自带字段优先）/ create_time fallback 算 published_days + 5 阶段判定规则（淘汰 status=offline 或 销0库0上架>90 / 新品 ≤30天 / 热销 >30天且销≥10 / 滞销 >30天且销<5且库>0 / 一般 其他）+ controller 顶 role guard。Vue Bi/SkuLifecycle.vue：6 KPI 卡（含 warn 橙滞销 + cold 灰淘汰）+ 阶段 quick filter tag bar（点击过滤 SPU 表）+ 2 ECharts（饼图阶段分布 5 色 + 销量×库存散点 按阶段着色）+ SPU 明细表（销量 ≥10 红字 hot）+ days 切换。0 新表 0 新 migration。菜单 BI 子菜 +"SKU 生命周期"+路由 + apis +1 method。auto 10/10，1 fix-on-the-fly（fix-1 初版用 created_at 字段，spus 表实际是 create_time（TP 默认时间戳字段），spu_status_log 用 created_at — 跨表混淆，改读 spus.published_at + create_time fallback 直接放弃 status_log 二次查询）。**经验：跨表读元数据前必须 DESC 表头确认字段名；TP 默认 create_time/update_time vs 项目约定 created_at/updated_at 混用陷阱常见；阶段判定优先级序很关键（先判终态淘汰 → 再判新品 → 再热销/滞销 → 一般兜底），顺序错会让新品同时满足热销条件却被错分** |
| 47 | 06-04 | BI-2 订单漏斗 5 阶段（**四、BI 系列 2/4**）| **BI-02** OMS Admin.funnelAnalysis endpoint：5 阶段 distinct user 模型（加购 shop_db.cart / 下单 orders.created_at != cancelled / 支付 orders.paid_at / 收货 orders.completed_at / 评价 shop_db.reviews）+ days 7-720 clamp + store_ids 三态 + 跨库 shop_db 弱依赖 try/catch 失败降 0（复用 iter-20 oms→shop 副连接）+ controller 顶 role guard `if !in_array(['super_admin','sales_ops']) return 403`（沿 iter-46 模板）+ 自动算 biggest_drop_stage（找 conv_from_prev 最低的阶段对，KPI 一眼定位流失点）+ overall_conversion=stage5/stage1。**v1 distinct user 模型 vs cohort**：当业务数据异构（如测试用户绕过加购直 API 下单），允许 conv_from_prev > 100%（反映真实业务现状非缺陷）；严格 cohort 留 Q47-01。Vue Bi/Funnel.vue：5 KPI 卡（含 warn 橙色 biggest_drop）+ 2 ECharts（built-in funnel 倒梯形彩色 5 阶段 + 阶段间转化率柱图 axisLabel rotate 30 防重叠）+ 阶段明细表（conv_from_prev < 50% 显红字 ↓ N.N% 流失警示）+ days 切换 7/30/90/180 + onBeforeUnmount dispose 防泄漏。0 新表 0 新 migration。菜单 BI 子菜 +"订单漏斗"。auto 9/9，**0 fix（项目第 2 个 0-bug iter，复用 iter-46 RBAC + iter-20 跨库 = 0 设计期错位）**。**经验：distinct user 模型 vs cohort 是 funnel 设计第一道选择题，v1 业务系统选 distinct（O(N) 即可）大数据集再切 cohort（需 user-stage 临时表）；biggest_drop 自动算让运营无需肉眼扫漏斗 = 高 ROI 自动洞察；built-in echarts funnel 比手画 div 倒梯形快 50 倍；KPI 卡 warn 橙色专门预留给"流失/告警"类指标 — 与 good/hot/cold 视觉分级一致** |
| 46 | 06-04 | BI-1 数据洞察启动 · 用户 RFM 分层（**四、BI 系列开篇**）| **BI-01** OMS Admin.rfmAnalysis endpoint：按 days 窗口（clamp 7-720，默认 90）聚合 orders（paid/picking/shipped/completed + paid_at not null + store_ids 三态过滤）→ 每用户算 r_days（today - max(paid_at)）/ f（count）/ m_yuan（sum total/100）→ **绝对阈值 5 分制**（R:≤7/14/30/60/>60 / F:≥10/5/3/2/1 / M:≥10000/3000/1000/300/<300 元）→ **8 分群规则**（重要价值/重要保持/不能失去/重要发展/新客户/流失风险/休眠/流失/一般客户，参考 Kotler RFM 模型简化）→ 6 KPI（total_users / active_users（R≥4）/ high_value（重要价值/保持/不能失去）/ lost（流失/休眠）/ total_revenue_yuan / avg_orders_per_user）+ segments 计数 + users 分页（按 m_cents desc）+ controller 顶 role guard `if !in_array(['super_admin','sales_ops']) return 403`（iter-44 Q44-05 横切角色实践）。Vue Bi/Rfm.vue：6 KPI 卡（5 边色：good 绿 / hot 红 / cold 灰）+ 分群 quick filter tag bar（点击 segment 过滤用户表）+ 2 ECharts（饼图 segment 占比含 SEGMENT_COLORS 9 色 + R-F 散点 M 用气泡大小 maxM 归一）+ 用户表（user_id / r_days / f / m_yuan / r/f/m 三色 score / segment tag / last_paid_at）+ days 切换（30/90/180/365）+ 分页。0 新表 0 新 migration（纯查询 orders）。菜单 +"📊 BI 数据洞察"父级 + 子项"用户 RFM 分层"（canSeeBi computed = super+sales）+ auth.ts +1 computed + AdminLayout +1 sub-menu。auto 11/11，2 fix-on-the-fly（fix-1 分位法在 n=1 时把单用户打 R1F1M1 → 休眠（语义错），改绝对阈值法 / fix-2 editor/warehouse 未拒，加 role guard）。**经验：分位法依赖样本 ≥ 20，业务系统首选绝对阈值（业务直观且零样本依赖）；KPI 业务概念跟分群规则映射要明确（"高价值"=重要价值/保持/不能失去 3 类）；ECharts 散点 symbolSize 用 sqrt(val/maxM)*40 比线性映射视觉效果好；BI 数据敏感性高于业务数据，role guard 应在 controller 顶部 fail-fast** |
| 45 | 06-04 | EFF-4 运营效率第 4 轮 · WMS PDA H5（**EFF 系列收口**）| **EFF-07** 独立 `/pda/*` 路由组（不走 AdminLayout）+ 新建 PdaLayout（移动 viewport + 56px header + scoped pda-card/pda-input/pda-big-btn 三套共享样式，按钮 ≥ 52px 高 / 输入 44px / 卡片间距 10-12px 适配手指点选）；6 页 Vue：PdaLogin（复用 omsApi.adminLogin + 默认用户名 warehouse + 大红主按钮）+ PdaHome（2 卡片入口拣货/入库 + 实时拉我的拣货数 + 待入库数 + 角色显示）+ PdaPickingList（"我的任务"/"待领取" tab 切换 + 卡片 SKU 大字 + 进度 X/Y + 状态 tag + 一键领取/开始扫码按钮）+ PdaPickingDetail（36px 红色大数字 picked/expected + 渐变红进度条 + 自动聚焦扫码框 + Enter 即提交 incr_qty=1 + SKU mismatch toast 拒 + 完成自动 1s 跳回列表 + ⚡ 一键置完成 兜底）+ PdaInboundList（pending 卡片列表显示仓库/时间/来源/退货号）+ PdaInboundDetail（物品清单 × N + ⚡ autoComplete 按钮 + 提示"完成后自动按推荐 Top1 上架 + PIM 同步 + OMS available+N"）。401 拦截器加 PDA 分流（`pathname.startsWith('/pda')` 走 `/pda/login` 不走 admin `/login`）。**0 后端改动 0 新 endpoint 0 新表**：纯复用 iter-22 PickingTaskService.scan 增量 + iter-25 InboundService.autoComplete 推荐 Top1 上架。auto 9/9，2 fix-on-the-fly（fix-1 inbound detail 返 `{order:{},items:[]}` 嵌套结构，前端读 `detail.status` 拿 None → UI 层扁平化展开 / fix-2 omsApi 方法叫 adminLogin 不是 login + http.ts 401 兜底硬编码 `/login`，PdaLogin 用错方法名 + 401 重定向硬编码 → 改 adminLogin 方法 + 401 按 path 分流）。**经验：复用现有 API 时返结构差异（flat vs nested wrapper）要在 UI 层适配比强求后端改更稳；多入口 SPA 401 重定向必须分别处理；移动端 H5 大字大按钮 + Enter 即扫即提交 + 自动 focus 回扫码框 + toast 即时反馈 = 高频低视线场景核心 UX；扫码 SKU mismatch 校验放前端（即时反馈）+ 后端服务端校验仍存（超量 400）双层兜底** |
| 44 | 06-04 | EFF-3 运营效率第 3 轮（**⌘K 全局快速搜索 + 跨模块统一聚合**）| **EFF-02** OMS Admin.quickSearch 单 endpoint 聚合 3 类业务（订单/退款/换货）按前缀分支（SO* → 订单 LIKE / RF* → 退款 / EX* → 换货 / 11 位数字 → address LIKE / 其他 → 订单号+收货人+快递号通用 LIKE），每类 ≤ 5 + store_ids 三态过滤 + editor 角色显式拒绝；PIM Admin.quickSearch 同模式（spus code/name 模糊 + 软删过滤 + main_images 提取首图）。Vue 新 QuickSearch.vue（全局 keydown 监听 ⌘K/Ctrl+K toggle + Esc 关闭 + 200ms 防抖搜 + 并行 Promise.all 调 OMS+PIM + 4 类结果分组 emoji header 点跳详情 + 输入框自动聚焦）；AdminLayout 顶栏加"🔍 快速搜索"按钮 + isMac 动态显 ⌘K vs Ctrl+K + mount QuickSearch ref。0 新表 0 新 migration 0 新 SQL。auto 13/13，2 fix-on-the-fly（fix-1 11 位手机号 JSON LIKE 严格 `"phone":"` 模式漏匹（address 序列化带空格），改简化 LIKE / fix-2 OMS quickSearch 漏拒 editor 角色泄业务数据，加 `if role==editor return empty`）。**经验：JSON 字段固定 key 模糊匹配 fragile（序列化空格/换行差异），用 LIKE 全字段更稳；OMS admin group 默认不限角色，新业务接口必须显式守"应该看不到的角色"；全局键盘快捷键须用 keydown 而非 keypress，且 metaKey 跨平台双判（Mac ⌘ / Win Ctrl）；防抖在 watch 入口比每 keystroke 调 API 节省 5x 网络** |
| 43 | 06-04 | EFF-2 运营效率第 2 轮（**退款/换货金额/数量阈值二审 + PIM editor 角色细分**）| **EFF-03** refund_orders + exchange_orders 各加 3 字段（needs_second_review TINYINT / first_approved_by VARCHAR(64) / first_approved_at DATETIME）；RefundService.approve 加 role 参数 — amount >= ENV `OMS_REFUND_REVIEW_THRESHOLD_CENTS`（默认 100000=¥1000）且 role!='super_admin' → 标 needs_second_review=1, 记 first_approved_by/at, status 保留 pending_approve; 二审单 sales 投 throw 拒绝, super_admin 投 → 正常 approved → cascade refund_only → refunded；ExchangeService.approve 同机制按 sum(qty) >= ENV `OMS_EXCHANGE_REVIEW_THRESHOLD_QTY`（默认 3）；Refund/Exchange controller 注入 `$request->admin['role']`；Vue Refunds/Exchanges 加 needs_second_review 状态列橙色 "⚑ 待 super 二审" badge。**EFF-04** admin_users role 加 'editor'（不 ALTER 用 VARCHAR）+ migration seed `editor/editor123` 测试账号；PIM route 拆 publish/offline 独立 group（super+sales+store_owner，**editor 不含**），其余 admin CRUD group 加 editor + store_staff；PIM StoreContextService 把 editor 加跨店白名单（同 super/sales/warehouse 返 null）；Vue auth.ts 加 editor 类型 + canPublishSpu computed（super/sales/store_owner）+ Products.vue 加 `v-if="auth.canPublishSpu"` 守卫发布/下架按钮 + AdminLayout role label 表完整化（含 store_owner/store_staff/editor 中文）。0 新表 0 业务 ALTER（纯增列 + 路由分组重构）。auto 13/13，2 fix-on-the-fly（fix-1 PIM StoreContext 漏登 editor 跨店白名单 / fix-2 exchange_items 字段 qty 误写 quantity）。**经验：新增平台级角色必须 PIM+WMS+OMS 三处 StoreContext 同步登记；跨表同义字段命名不一致（refund.amount / exchange.qty）用前必查 schema；feature ENV 加阈值默认值时让代码工作于零配置环境（getenv()?:100000）；route group RBAC 用"上下架专属 group" 而非在 controller 内显式 throw 更内聚** |
| 42 | 06-03 | EFF-1 运营效率第 1 轮（待办中心 + OMS 高级搜索 + 死信中心 + 一键 replay）| 3 件 EFF 套：**EFF-01** Admin.orderList 加 7 字段（phone JSON LIKE / user_id / sku_code 反查走 order_items / amount_min_cents / amount_max_cents / start_date / end_date）+ Vue Orders 加"高级搜索 ▼/▲"折叠面板（5 行：手机/UID/SKU 反查/金额范围/日期范围 + 应用 + 重置）；**EFF-05** Admin.todosCounts 聚合 6 类待办（refund_pending / exchange_pending / orders_pending_pay / orders_to_ship / stores_pending / dead_letter）按 store_ids 三态过滤 + Vue Todos.vue 6 卡片 grid（emoji icon + 颜色 + 数字 + router 跳转 + 0 总数时显示"🎉 太棒了"）+ 顶部菜单 +"📋 待办中心"；**EFF-08** Admin.deadLetterReplay 复用 EventBus.publish 重新 XADD payload 回原 stream + dead_letter.error append "replayed at ... new_id=..."（不删行保留追溯）+ Vue DeadLetter.vue（list + stream 筛选 + payload JSON 弹框 + replay 确认 + 已 replay 行 error 文字变绿）+ 系统管理子菜单 +"死信中心"。0 新表 0 新 migration，纯复用 iter-9 EventBus + iter-28 dead_letter。OMS Admin 路由 +3。auto 7/7，0 fix。**经验：待办聚合用 service 一次返多类比 Vue 多次调健康；JSON 字段模糊匹配用 `LIKE "%\"phone\":\"%xxx%\"%"` 比解 JSON 简单；replay 走 append-only error 列追溯重投历史，不删行** | 2 表 oms_db（marketing_topics + marketing_topic_items UNIQUE(topic_id,spu_id)）+ MarketingTopicService（CRUD + 关联 SPU 增删 + 跨库 PIM 回填 spu 名+主图+价 + **calendar() 聚合 banner+featured+topic+coupon 4 类按 start 升序统一 schema**）+ controller 11 接口（admin CRUD + 关联管理 + 营销日历 + public list/detail）+ shop-backend Cms BFF + 4 公开路由 + Vue Topics（CRUD + 详情弹框管理关联 SPU + 跨库 PIM 信息显示）+ Vue MarketingCalendar（4 类彩色 type tag + 可点筛选 + 时间条 div 可视化 + datetime-range picker）+ 营销菜单 + 2 项 + 小程序 topic-detail 新页（banner+描述+时间+2 列 SPU 网格）+ 首页加 topic 入口拉前 3 个进行中专题。auto 9/9，0 fix。**经验：异构活动聚合用统一 schema 让前端只渲染一种结构；list/detail 守卫策略可不同（展示型 vs 溯源型）；时间段 overlap 必须 start ≤ end_range AND end ≥ start_range 双条件；跨库 PIM 同一回填模式在 iter-40/41 重复 3 次时考虑抽辅助方法；Vue 时间条 div+颜色简单方案省 200KB 第三方 gantt 库** |
| 40 | 06-03 | BIZ-09-1 内容运营第 1 轮（Banner + 推荐位）| 2 表 oms_db（banners: code+position+image+link_type 4 种 spu/category/url/none+sort+status+valid_from/to+store_id NULL=平台 / featured_items: position 4 种 home_hot/home_new/category_top/detail_related+spu_id+sort+有效期）+ BannerService 合并两 entity（公开读时 Featured 跨库 PIM 一次性 join 拿 SPU 名+主图+价格，避免 caller N+1）+ Banner controller 10 接口（admin CRUD + public list）+ shop-backend Cms BFF + 公开路由 + admin 路由 (super+sales) + Vue Banners.vue（含 ImageUpload 复用图片库 + 时间段 picker + link type radio + 条件 link_value）+ Vue Featured.vue（含跨库 SPU 信息展示）+ 营销菜单 + 2 + 小程序 home 加 swiper 轮播 banner + scroll-view 横向滚动热门推荐 + apis 加 2 方法。0 新基建（复用 iter-30 ImageUpload + iter-34 OMS→PIM 副连接）。auto 9/9，0 fix。**经验：模式相似的 2-3 个 entity 合并 1 service 减少 60% 重复代码；公开接口默认黑名单不要白盒返回；跨库 join 在数据层完成不让上游感知；枚举字段 UI 按值切换可见性；业务时间段允许 NULL=不限比强制更灵活** |
| 39 | 06-03 | BIZ-08-5 入驻流程 + 店铺自管（5 轮规划**收口**）| StoreService.approve 增强：自动建 store_owner admin_user(username=shop-{code}) + 绑定 store_admins（幂等：已有 admin 跳过；密码可传 default_password 或自动生成 shopXXXX，只返回一次）+ selfUpdate（店主可改 name/description/logo/contact，不可改 code/status/commission）+ publicDetail（公开店铺信息，支持 code/数字 id 双查）+ shop-backend Store BFF 转发 + 小程序 detail 页拉店铺信息显示 "🏪 由 xxx 提供" + Vue Stores 点"通过"弹账号密码 HTML dialog 警示"只显示一次" + Settlement type 下拉加"平台抽佣"。0 新 migration（纯复用 iter-35~38）。auto 9/9，0 fix。**经验：架构地基铺好后业务流程的"一步到位"是收口标志；临时密码只返回一次同 webhook secret 模式；状态转换接口幂等性能避免 90% 运营误操作；BFF 模式不要为单个公开接口破例** |
| 38 | 06-03 | BIZ-08-4 WMS 多店化（5 轮规划第 4 轮）| 2 ALTER（warehouses + inventory 加 store_id；warehouses 加 warehouse_type ENUM(self/merchant)）+ WMS StoreContextService（跨库 oms.store_admins 复用 iter-24 副连接）+ WMS AdminAuth 注入 store_ids + 路由加 store_owner/store_staff + Warehouse 重写：3 辅助方法 + 5 处过滤注入 + create 接 store_id/warehouse_type + Inventory.list 加店过滤 + InventoryService.inbound 内部自动从 location→warehouse 推 store_id 写入 + Vue Warehouses 加店下拉/列/类型 tag + 创建表单加店铺/类型选择 + Vue Inventory 加店下拉/列。**WMS warehouse 角色仍跨店**（平台仓管原本就管所有仓）；**跨店调拨 v1 不支持**（store_owner 限本店内调拨，平台代理留 v2）；**warehouse_type 字段就位但 v1 无业务差异**（为 iter-39 商家自助提现做准备）。auto 7/7，0 fix。**经验：业务角色边界≠店铺边界；横切字段让 service 内部自动管理不让 controller 关心；架构改造时把字段补齐比留待后续 ALTER 风险低** |
| 37 | 06-03 | BIZ-08-3 OMS 多店化 + 订单拆单（5 轮规划第 3 轮 · **最危险一轮**）| 6 ALTER（orders+refund+exchange+settlement+audit+webhook+coupons + orders parent_order_no）；OrderService.create 加 **feature flag `OMS_MULTI_STORE_SPLIT`**（默认 false 旧链路保留）；跨库 PIM 拿每 sku.store_id；单店分支写 store_id；多店 + flag on 拆 N 单（每店一单 + 共享 PO 父号）；多店 + flag off 拒绝；Payment.callback PO 开头视为父单 → markPaidByParent 标所有子单 paid；多店带券 v1 拒绝（分摊复杂留 v2）；SettlementService 抽佣按 stores.commission_rate 自动落 platform_commission 行（store_id=1 跳过）；Refund/Exchange 创建时继承 order.store_id；Admin.orderList/orderDetail 加店过滤；Vue Orders 加店铺下拉 + 店铺列。auto 10/10，1 fix-1（settlement.type 从 16 改 32 容纳 "platform_commission" 19 字符）。**实证：旧链路完美回归 / 多店 flag off 准确拒绝 / flag on 拆 2 单 / 父单整付标 2 子单 paid / shopowner1 隔离生效 / 抽佣 10% 自动算**。**经验：架构改动用 feature flag 灰度比一次切风险低 100 倍；父单不入 orders 表仅作逻辑号；跨库读必须有 fallback** |
| 36 | 06-03 | BIZ-08-2 PIM 多店化（5 轮规划第 2 轮）| **2 ALTER**：spus + skus 加 store_id DEFAULT 1 NOT NULL（存量自动归平台）+ PIM 版 StoreContextService（跨库 oms.store_admins，Redis 1h，复用 iter-29 副连接）+ PIM AdminAuth 注入 `$request->store_ids` + Product 加 3 辅助方法（applyStoreFilter / resolveCreateStoreId / assertStoreAccess）注入 9 处（adminList/spuDetail/create/update/softDelete/publish/offline/importCsv/exportCsv）+ Sku create/update/softDelete 加店校验 + Admin.storeList 跨库读 oms.stores 给 Vue 下拉用 + PIM 路由 middleware 加 store_owner/store_staff 角色 + Vue auth.canSelectStore + Products 加店铺筛选下拉 + 店铺列（仅 super/sales 可见）。**categories/brands 暂不加 store_id**（平台公共资源 v2 再说）。auto 13/13，0 fix。**经验：store_ids 三态语义（null=跨店 / []=无权 / [int]=限制）；辅助方法集中收口 9 处复用；sed 批改方法签名比逐个 Edit 快 10 倍；跨库读容错降级是必备** |
| 35 | 06-03 | BIZ-08-1 多商家架构地基（5 轮规划第 1 轮）| 用户拍板规划文档 §9 5 决策（**下单立即拆 N 单 / 商家必须自有仓 / 父单整付 / confirm 时抽佣 / 公共类目商家可用不可改**）。本轮：stores 表（含 id=1 平台店 migration 内 INSERT 落地）+ store_admins 多对多关联表 + StoreService 7 动作（CRUD/审批/暂停/恢复/抽佣/加移除管理员）+ StoreContextService（admin → store_ids，Redis 1h 缓存，super/sales/warehouse 返 null 跨店）+ AdminAuth middleware 注入 `$request->store_ids`（仅"提供能力"业务层是否过滤推迟到 iter-36~38）+ Store controller 9 接口 + Vue Stores.vue + 系统管理子菜单加"店铺管理"super_admin 独占。**0 ALTER 业务表**（风险隔离，回滚仅 drop 2 表 + revert middleware）。auto 12/12，0 fix。**经验：默认数据 INSERT 放 migration 比放 seed 可靠；不强 ALTER enum 用 VARCHAR；架构能力 vs 业务约束分两步；平台店 id=1 业务层硬保护（不可暂停/改抽佣/绑解管理员）** |
| 34 | 06-03 | 换货流程 BIZ-07（售后扩展第三类型）| **v1 工作流跟踪版**：exchange_orders + exchange_items 表 + ExchangeStateMachine 7 态（pending_approve → approved → received_old → sent_new → completed + rejected/cancelled）+ ExchangeService（apply/cancel/approve/reject/markReceivedOld/markSentNew/markCompleted + 跨库 PIM 拉新 SKU 快照 + 同 order_item 进行中阻断）+ Exchange controller（user+admin 两套，admin 限 super+sales）+ shop-backend Exchange BFF + Vue Exchanges.vue 7 步操作按钮 + 小程序 exchange-apply / my-exchanges 2 新页 + 订单详情 shipped/completed 加"申请换货" + me 页加"我的换货"入口。**v1 主动放弃自动库存联动**（换货实物状况复杂，运营更习惯看到实物再决定入库）。OMS→PIM 副连接首例，跨库累计 6 方向。auto 14/14，0 fix。**经验：业务流程"灵活性"有时比"自动化"更重要 v1 做工作流跟踪即可；防重复提交在 DB 层 join 校验比业务层判断可靠；新增 admin 接口先想清楚谁能操作再选 route group** |
| 33 | 06-03 | OMS Webhook 异步化 + 接入文档（Q28-03 + Q28-04）| **Q28-03** WebhookService 拆 fireAsync(XADD 到 `oms.webhook.outbound`) + fireSync(原同步)；OrderService confirm/cancel + RefundService refund 3 处 fire → fireAsync；新 `consume:webhook` supervisord 进程订阅 stream → 遍历订阅 → 调原 deliverWithRetry 同步推；EventBus.publish 失败时自动降级 fireSync（保证消息不丢）；**业务请求阻塞 15s+ → 1ms（~14000x 提升）**；**Q28-04** docs/webhook-接入指南.md（10 节：payload schema / headers / HMAC-SHA256 / PHP+Node+Python 三语言验签 / 重试策略 / 幂等 X-Webhook-Delivery / 故障排查）。**0 新表 0 新 migration**，纯复用 iter-9 EventBus + iter-28 dead_letter。OMS supervisord 进程 4 → 5。auto 7/7，0 fix。**经验：业务路径异步化的关键收益是用户感知延迟降到 ~0；降级路径必须留（Redis 宕→同步推不丢消息）；EventBus 抽象到位后新事件流只是 stream/group 配名；fire() 软弃用而非删除，渐进迁移稳；三语言验签示例是接入文档必备 — 用 raw body 算签是最常坑点** |
| 32 | 06-03 | WMS 自动化三件套（低库存外推 + 盘点定时 + 推荐权重可配）| **A Q25-01** ALTER stock_alert_rules 加 notify_webhook_url/cooldown/last_notified_at；新 AlertNotifyService（HMAC-SHA256 + curl POST + 5s timeout）+ `wms:stock-alert-notify` supervisord loop 60s 扫触发；Vue StockAlerts dialog 加 webhook + 冷却 + 列表两列；**B Q22-06** stock_take_schedules 表 daily/weekly/monthly + StockTakeScheduleService（tick + 23h 防重复 + 复用 StockTakeService.create）+ `wms:stock-take-schedule` supervisord loop + CRUD controller + Vue 新页 + 手动触发按钮；**C Q22-04** wms_configs KV 表 + WmsConfigService.getLocationWeights（merge default 兜底）+ LocationRecommendService 改读配 + WmsConfig CRUD + Vue Settings 页（5 权重 + 公式说明，super_admin 独占）。supervisord 进程数 7 → 9。auto 13/13，1 fix（StockTakeService.create 返回 `['take'=>...]` 嵌套结构错读）。**经验：项目已用 supervisord 时定时任务也用 loop；23h 防重复要靠状态字段而非扫表频率；KV 配置必须 merge default 兜底；复用现成 service 先看返回结构** |

## 三、当前能力地图

### 3.1 用户侧（小程序）
18 页闭环：登录（手机号+验证码）/ 首页 / 商品详情（**iter-20 含心标收藏 + 评价区**）/ 购物车 / 结算（**iter-19 选优惠券 / iter-20 选地址簿**）/ 支付（mock）/ 支付成功 / 订单详情（**iter-20 completed 状态加去评价**）/ 我的（**iter-19 营销分组 / iter-20 个人中心分组**）/ 申请退款（含上传凭证图）/ 我的退款 / 领券中心 / 我的优惠券 / **地址列表（iter-20，可选择模式）/ 地址编辑（iter-20）/ 我的收藏（iter-20）/ 评价提交（iter-20，含图片上传）/ 我的评价（iter-20）**。

### 3.2 运营侧（Vue 后台 - shop-admin）
| 模块 | 页面 |
|---|---|
| 总览 | Dashboard 8 KPI 卡（基础 4 + iter-21 营销/UGC/用户 4）+ **ECharts 6 图**（日订单 / 日销售额 / TOP10 SKU / 日退款率，iter-18；**券领-核销-核销率双轴 / 评价数-当日均分双轴，iter-21**）+ 时间筛选 |
| PIM | 商品 SPU（含 SKU 多选 + 模糊搜索 iter-18）/ 类目 / 品牌 |
| OMS | 订单（强制取消 + 时间线 + 模糊搜索 + 批量取消 + 导出 CSV）/ 库存四态（调整 + log + 导出 CSV）/ 退款审批（通过 / 拒绝 / 确认退款 / 凭证预览 + 模糊搜索 + 批量通过/拒绝 + 导出 CSV）/ **财务结算单（订单+退款双触发 + 净金额 + 入账 + CSV 导出，iter-26）** / **WMS 对账（OMS 视角，super_admin 独占，iter-26）** / **Webhook 订阅（iter-28，super_admin 独占；推送 order/refund 事件给外部 URL + HMAC 签名 + 3 retry + dead_letter 兜底）** |
| 营销 | 优惠券（CRUD + 满减/折扣 + 领取/使用统计 + 停用 + **scope=all/spu/category，iter-27**）/ **自动发券规则（新人券 / 触发条件 + 每人上限，iter-27 Q19-02）** / 评价审核（隐藏 ≠ 删除 + 星级可视 + 图片预览 + SPU 筛选）|
| WMS（iter-22~25 大幅完整化，菜单 12 项）| **WMS 总览（iter-25：6 KPI + 仓库利用率 + 入出库时序 + TOP SKU + 拣货效率）** / 入库（iter-25 autoComplete 用推荐 Top1）/ 出库（FIFO INIT 优先） / **拣货任务（iter-24 P1-1：list/assign/scan/complete）** / 实物库存 / **低库存预警（iter-25：规则 + 实时告警）** / **库存日志（iter-24 P0-1：8 种 change_type 全表追溯）** / **实时盘点（iter-22：scope=all/zone/location/sku）** / **多 SKU 批量调拨（iter-22+23：一头多明细 + 行级联动）** / **OMS 对账（iter-24 P1-2：跨库读 + diff 高亮 + 不自动修复）** / 库位（批量生成 ≤500）/ 仓库（含引用保护删除）|
| 系统管理（iter-17 新组）| 管理员用户（CRUD + 改密 + 状态）/ 操作日志（4 维度筛选）|

**RBAC**（iter-16 引入，iter-17 推广到全后端 + UI 用户管理，iter-19 加营销维度，iter-43 加 editor）：
- `super_admin` admin / admin123 — 全菜单 + 系统管理 + 营销 + **退款/换货二审独占**
- `warehouse` warehouse / wh123 — 仅 WMS + 总览
- `sales_ops` sales / sales123 — PIM + OMS + **营销（iter-19）** + 总览（一审 ≥¥1000 退款 / sum(qty)≥3 换货 转 super 二审）
- `editor` editor / editor123（iter-43）— PIM CRUD 草稿允许，**publish/offline 拒绝**；不可见 OMS / WMS / 营销 / 系统
- Vue 顶栏自动渲染当前用户名 + 角色 tag
- **enforcement**：菜单显隐（UI 层）+ OMS/PIM/WMS 三后端 middleware（API 层）双层；URL 直访被后端拦截 403

### 3.3 后端能力
| 服务 | 主要职责 |
|---|---|
| shop-backend | 用户 BFF：登录 / 商品列表（聚合 PIM+OMS）/ 购物车 / 下单 / 支付 mock |
| pim-backend | 商品中心：SPU / SKU / 类目 / 品牌 + Admin CRUD + 图片上传 |
| oms-backend | 订单中心：订单状态机 / 库存四态（全启用）/ 退款状态机（6 态含 closed_overtime）/ admin_audit_log / admin_users(JWT) + 死信表 + 3 后台进程（consume-wms + consume-wms-inventory + refund-close-overdue 定时扫超时）|
| wms-backend | 仓储中心：仓库 / 库位 / 入库（含 refund_no 关联退货）/ 出库 / 实物库存 + wms_products（PIM 同步副本）+ 2 consumer（oms.order.paid + pim.sku.changed）|

### 3.4 事件总线（异步）
详见 [architecture/event-bus.md](architecture/event-bus.md)。

```
oms.order.paid           OMS → WMS（支付 → 建出库单）
wms.outbound.completed   WMS → OMS（发货 → 订单 shipped）
wms.inventory.changed    WMS → OMS（入库 → available +N）
   ├─ 无 refund_no         普通入库（iter-12）
   └─ 有 refund_no         退货回库（iter-14：reserved → available + 退款单 →received_back）
pim.sku.changed          PIM → WMS（SKU 主数据 upsert/delete）
```

主流程零同步 HTTP 跨服务调用，四流均带死信兜底（delivery≥3 入 dead_letter 表）。PIM ↔ OMS ↔ WMS 三模块完全异步通信。**iter-14 演示了字段扩展模式：往现有事件 payload 加可选字段比新增 stream/consumer 更节省运维成本**。

## 四、边界场景验证（iter-8 沉淀）

10 项实战通过：

| 类别 | 场景 | 防护机制 |
|---|---|---|
| 并发 | 同一 SKU 多人同时下单 | inventory_status 行锁 + 批量事务 |
| 超卖 | available < buffer_qty 阈值时下单 | precheck + lockBatch 双检 |
| 幂等 | 客户端重复提交订单 | Idempotency-Key + 唯一索引 |
| 幂等 | WMS consumer 重复处理同一事件 | inventory_log 三元组去重 |
| 状态机 | 非法转移（如 cancelled → paid）| OrderStateMachine::canTransitTo |
| JWT | 过期 / 篡改 / 无 token | 中间件统一拦截 401 |
| 上游不可达 | PIM 挂掉时 shop-backend 下单 | try/catch + 业务错误码 503 |
| 事件 | consumer 进程崩溃后追平 | XREADGROUP PEL 兜底 + supervisord 拉起 |
| 事件 | 毒消息（payload 损坏）| EventBus delivery≥3 入 dead_letter |
| 路由 | TP 8 plain 路由吃掉参数路由 | 参数路由顺序前置（iter-10 fix-2 后规范化）|

## 五、踩坑归档（共 25+ 项）

按 iter 维度：

| Iter | 数量 | 性质 |
|---|---|---|
| iter-3 | 13 | Phase 1 PHP/容器/migrate 基础坑（启动顺序、扩展、字符集等）|
| iter-5 | 7 | 业务运行时（Idempotency-Key nginx 透传、JWT exp 字段、价格小数等）|
| iter-6 | 1 | wms-backend 缺 Guzzle 依赖 |
| iter-7 | 1 | Vue Vite + AxiosInstance 类型导入 |
| iter-8 | 1 | 脚本 `set -u` 与中文混排 |
| iter-9 | 2 | console.php 命令注册 + supervisorctl 段加配置 |
| iter-10 | 5 | supervisor rpcinterface 拒绝 / 路由错位 / runtime 卷 chown / upload_max_filesize / TP file() 二次调用 |
| iter-11 | 1 | inventory 表 inbound_date 字段不存在（data-schema.md 与实际 migration 偏差）|
| iter-12 | 0 | 实测一次通过 |
| iter-13 | 0 | 实测一次通过 |
| iter-14 | 2 | 小程序 onBuyNow 误用 wx.navigateTo 跳 tabBar 页（应 switchTab）；Vue Inbound 创建对话框漏 refund_no 输入框 |
| iter-15 | 3 | shop-backend 容器是 iter-10 之前的旧镜像无 /uploads alias（需 rebuild）；shop-backend runtime/ macOS bind mount chown 失效；小程序 `<image>` 标签不会用 apiBase 作 baseURL（需手动拼前缀）|
| iter-16 | 0 | 实测一次通过 |
| iter-17 | 1 | AdminUser::create 调 audit() 传 int 给 string 参数 → 500（但 service.insert 已落地脏数据）—— auto-test curl 抓到当场修 |
| iter-18 | 1 | OrderStateMachine paid → cancelled 缺失 → admin 强制取消 paid 单全部 500（pre-existing bug，iter-10 起埋的，auto-test batch-cancel 抓到）|
| iter-19 | 3 + 1 架构补丁 | (1) 路由顺序：plain `POST admin/coupon` 必须放参数路由后，否则吃掉 `/disable` 子路径；(2) `goods_amount` 用 (float) 接收但后端类型要求 int → 400；(3) Vue 后台 controller 漏字段校验返回 400 — 三个全靠 auto-test 当场抓修。**架构补丁**：shop-backend 默认连 shop_db，coupons 表在 oms_db → 引入 `Db::connect('oms')` 副连接（config 加 oms 连接配置），避免跨库 join 与新增 RPC|
| iter-20 | 1（manual 抓） | checkout/onShow 无条件调 `loadDefaultAddress()` 把用户从地址簿刚选的地址覆盖回默认 → manual-test M14 抓到当场修。auto 27/27 一次跑通。 |
| iter-21 | 0 | auto 8/8 + manual 6/6 全一次过。**项目首次 0-bug iter**（实际只动 2 个代码文件，无新表无新菜单，全部新功能加在已有 stats 接口与 Dashboard.vue 内）|
| iter-22 | 3（全 UX，manual 抓）| fix-1 库位文本→下拉 / fix-2 SKU 文本→搜索下拉 / fix-3 库位+SKU 三方智能联动 + disabled 标注（"无商品/无该 SKU/已满/可用 N 件"）。auto 17/17 一次过，全部问题在 manual 阶段发现，证明 manual-test 拆分硬约束价值 |
| iter-23 | 0 | 11/11 auto 一次过（多 SKU 同时 ship/receive 三库位 lock+++ 验证 + 失败全单 rollback + legacy 兼容） |
| iter-24 | 0 | 12/12 auto 一次过（含 5 个 SKU 历史漂移如实展示，符合"对账不自动修复"原则） |
| iter-25 | 0+1 微调 | 10/10 auto 一次过；FIFO 排序中 INIT 按 ASCII 排在 BATCH 后面（应是最老），加 CASE WHEN 强制前置 |
| iter-26 | 0 | 14/14 auto 一次过；含 3 新 stream 链路 + 跨库读 wms + 财务双触发点全过 |
| iter-27 | 3（全 auto 抓） | fix-1 Order controller 漏传 user_coupon_ids 数组 / fix-2 `isset($arr[$k])` 当 value=null 假阴性 → 改 array_key_exists / fix-3 Coupon controller 漏接 scope 参数。15/15 auto-test 全捕获并当场修。**经验：PHP `isset()` 检测 key 时遇 null value 假阴性，应用 array_key_exists** |
| iter-28 | 2 | fix-1 dead_letter 表字段是 retry_count 不是 delivery_count，silent 吞掉。fix-2（iter-34 期间手动测试时抓到）Dashboard.vue 财务 KPI 区用 `v-if="(stats as any).finance_metrics"` 绕过 TS 检查，但 stats 初始 null 时运行时崩 → 整个 AdminLayout mount 失败 → 整页空白。**经验：Vue 模板 `v-if="x.y"` 在 x 可能为 null 时必须 `v-if="x && x.y"`；TS as any 是逃避不是修复**。修复方式：`v-if="stats && (stats as any).finance_metrics"` |
| iter-29 | 0 | 13/13 auto 一次过；含 PIM→OMS / PIM→WMS 双向跨库读 + audit 14 处注入 + status_log 4 处注入全过。设计期已矫正 operator 字段从 sub 改 username（避免 audit 表里全是数字）+ 路由顺序问题（status-log 放在 spu/:id 前避免 spuDetail 贪婪匹配）|
| iter-30 | 0 | 11/11 auto 一次过；含 CSV 导入幂等（1 create + 1 update）+ header 校验 400 + 属性模板 409 + 图片库自动回纳 + RBAC 403 全过 |
| iter-31 | 0 | 6/6 auto 一次过；跨库批量聚合 + 引用阻断 409 + used_count 实时算 全过；纯增量 0 新表 |
| iter-32 | 1（auto 抓） | fix-1 StockTakeService.create 返回 `['take' => detail, 'items' => list]` 嵌套结构，误写 $take['take_no'] 拿到 null。改 $take['take']['take_no']。**经验：复用 service 必看返回结构**。13/13 全过 |
| iter-33 | 0 | 7/7 auto 一次过；fireAsync 实测 1.08ms，consumer 自动消费 + 失败入 dead_letter 链路完整 |
| iter-34 | 1（设计期矫正） | exchange admin 路由初放入 group 1（任意 admin）→ warehouse 也能审批换货，不符合业务边界。改放 group 3（super+sales）。**经验：新增 admin 接口先想清楚谁能操作再选 route group，OMS 现有 3 个 group 别盲目放第一个**。14/14 全过 |
| iter-35 | 0 | 12/12 auto 一次过；平台店 id=1 migration INSERT 落地 + AdminAuth 注入 store_ids 但不强过滤 + 0 ALTER 业务表，风险隔离 |
| iter-36 | 0 | 13/13 auto 一次过；PIM 真实店铺隔离：store_owner 仅看自己店 1 条 / 跨店访问 403 / 自动归店 / super_admin 可手动跨店筛选；spus/skus 默认 1 平台店 + 跨库读 oms.stores 容错降级 |
| iter-37 | 1 | fix-1 settlement.type VARCHAR(16) 放不下 "platform_commission" 19 字符 → ALTER 至 32 + 新增 migration 03 记录。**经验：枚举字段宽度留余量**。10/10 全过；feature flag 默认 false 让旧链路 0 行为变化 |
| iter-38 | 0 | 7/7 auto 一次过；WMS warehouse 角色保留跨店访问（不被多店改造限制）+ inbound 自动推 store_id（caller 不感知）+ 跨店调拨 v1 不支持留 v2 |
| iter-39 | 0 | 9/9 auto 一次过；approve 自动建 store_owner 账号+绑定（幂等）+ 临时密码只返回一次 + 店主自管 + 公开店铺 BFF + 小程序店铺 tag。**BIZ-08 5 轮规划全部交付** |
| iter-40 | 0 | 9/9 auto 一次过；Banner + 推荐位 admin CRUD + 公开读 + 跨库读 PIM SPU 信息 + shop-backend BFF + 小程序首页 swiper 轮播 + 横向滚动推荐位 |
| iter-41 | 0 | 9/9 auto 一次过；营销专题 CRUD + 关联 SPU 跨库 PIM 回填 + **营销日历聚合 4 类活动 15 events 统一 schema** + 小程序专题落地页。**BIZ-09 内容运营 2 轮全交付** |
| iter-42 | 0 | 7/7 auto 一次过；EFF 第 1 轮：待办中心 6 卡片（聚合 6 类）+ OMS 高级搜索 7 字段（phone JSON LIKE / SKU 反查 / 金额范围 / 日期范围）+ 死信中心 + 一键 replay（EventBus.publish 重投 + append-only error 追溯）+ 已 replay 行变绿。0 新表 0 新 migration |
| iter-43 | 2（全 auto 抓） | 13/13 auto 全过；fix-1 PIM StoreContextService 漏登 editor 跨店白名单 → editor 建 SPU 报"无关联店铺" / fix-2 ExchangeService.approve `sum('quantity')` 应是 `sum('qty')`（exchange_items 字段名）。**经验：新增平台角色必须三系统 StoreContext 一并加白；service 聚合前必查 schema 字段名** |
| iter-44 | 2（全 auto 抓） | 13/13 auto 全过；fix-1 11 位手机号 JSON LIKE 严格 `"phone":"` 模式漏匹（address 序列化带空格 `"phone": "..."`），改宽松 LIKE / fix-2 OMS Admin.quickSearch 漏拒 editor 角色 → editor 可见 OMS 订单数据，加 `if role==editor return empty`。**经验：JSON 字段固定 key 模糊匹配，宽松 LIKE 比严格 escape 稳；横切角色加入后所有现存 endpoint 都要审视** |
| iter-45 | 2（全 auto 抓） | 9/9 auto 全过；fix-1 Inbound detail 返 `{order:{...}, items:[]}` 嵌套，前端读 `detail.status` 拿 None → InboundDetail.vue 扁平化 / fix-2 omsApi 是 `adminLogin` 不是 `login` + http.ts 401 兜底硬编码 `/login` → 改方法名 + 401 按 path 分流 PDA。**经验：service detail/list 返结构差异常见，UI 层扁平化适配最稳；SPA 多入口必须在拦截器层分流 401**。**0 后端改动**——复用 iter-22/25 WMS API |
| iter-46 | 2（全 auto 抓） | 11/11 auto 全过；fix-1 分位法 quintile 在 n=1 时单用户被打 R1F1M1 → 误判"休眠"，改绝对阈值法（R 按天/F 按单/M 按元区间）/ fix-2 editor/warehouse 调 BI endpoint 未拒（OMS admin group 默认不限），controller 顶加 role guard `if !in_array(['super_admin','sales_ops']) return 403`。**经验：分位法依赖样本规模 ≥ 20，业务 BI 默认绝对阈值；敏感数据 endpoint 必须显式守允许角色（iter-44 Q44-05 横切实践首战）** |
| iter-47 | 0 | **9/9 auto 一次过，0 fix（项目第 2 个 0-bug iter）**；复用 iter-46 RBAC 模板 + iter-20 跨库副连接 + KPI 卡片设计 = 0 设计期错位。包含 5 阶段跨库聚合 + biggest_drop 自动算 + ECharts funnel + 转化率柱图全过 |
| iter-48 | 1（auto 抓）| 10/10 auto 全过；fix-1 初版用 `created_at` 字段，spus 表实际是 `create_time`（TP 默认时间戳字段），跨表字段名混用陷阱 → 改用 spus.published_at + create_time fallback 直接放弃 spu_status_log 二次查询。**经验：跨表读元数据前 DESC 表头是必要步骤；TP 默认时间字段 create_time vs 业务约定 created_at 项目内统一比每次记忆好** |
| iter-49 | 0 | **10/10 auto 一次过，0 fix（项目第 3 个 0-bug iter）**。沿 iter-46~48 RBAC 模板 + iter-25 stock_alert_rules + iter-42 dead_letter append-only 模式 + iter-26 OMS→WMS 副连接 = 0 设计期错位。4 类预警 + 冷启动保护 + 统一 schema + 30s auto refresh + 点跳关联页全过 |
| iter-50 | 2（全 auto 抓）| 15/15 auto 全过；fix-1 路由顺序 plain POST 放参数路由前 → approve 被 apply 吞返 403（**项目第 4 次同坑**：iter-10/19/27/50），改顺序 / fix-2 AuditService::log 7 参签名错位，$requestedBy 放到 reason 位 → operator 写 null。改 6 参 null + 7 参 operator。**经验：路由顺序应形成肌肉记忆或加 lint；7 参静态签名易错位，PHP 8 命名参数 / wrapper 函数能显著降低误用率** |
| iter-51 | 0 | 8/8 auto 一次过，0 fix；纯后端补字段 + 小程序换 sku 跳转 |

详见各 iter 的 reconcile-report-iteration-N.md。

## 六、关键设计决策

### 6.1 单体 vs 微服务
**选**：4 个独立 ThinkPHP 工程 + docker-compose，**不引入服务网格**。
**理由**：中型档位、PRD 已固化、4 模块边界清晰；服务网格运维成本超出 MVP 收益。

### 6.2 同步 HTTP vs 异步事件
**iter-6 时**：OMS↔WMS 走同步 HTTP（OMS callback /api/v1/order/wms-shipped）。
**iter-9 演进**：替换为 Redis Stream。理由：同步链路 P99 受最慢系统拖累 + 失败回滚复杂 + 故障耦合。
**iter-12 闭环**：入库 → OMS available 也用事件，主流程零同步跨服务调用。
**iter-13 扩展**：PIM SKU 主数据通过 `pim.sku.changed` 全量 upsert/delete 同步到 WMS read replica（wms_products）；WMS 不再需要跨服务查 PIM 的 SKU 名/主图。
**iter-14 字段扩展**：退货回库不新增 stream / consumer，而是在 `wms.inventory.changed` payload 加可选 `refund_no`。OMS handler 分叉处理。**经验：当事件含义未变、只是触发场景多了一个，优先字段扩展而非新流**。

### 6.3 后台 CRUD 删除策略
- PIM（SPU / 类目 / 品牌）：**软删除**（deleted_at 字段），允许恢复
- WMS（仓库 / 库位）：**物理删除 + 引用保护**（删前查 3 类引用 count）
**理由**：PIM 是商品主数据，删错代价高；WMS 是组织结构，规则简单更友好。

### 6.4 图片上传
**选**：本地存储 `/var/www/html/runtime/uploads/{ymd}/{uuid}.{ext}` + nginx alias。
**不选**：OSS / CDN（MVP 不需要；架构层留扩展点：UploadService 接口化）。

### 6.5 库存四态（OMS 视角，iter-14 全部启用）
`available` / `locked` / `reserved` / `buffer_qty`（安全垫）四态分离，对应七个原子操作：
- 下单 lock：available ↓ + locked ↑
- 取消 unlock：available ↑ + locked ↓
- 出库 outbound：locked ↓（实物已离开）
- 入库 inbound：available ↑（iter-12）
- 退货审批 reserve：reserved ↑（iter-14：货物运回中标记）
- 退货收到 receive_back：reserved ↓ + available ↑（iter-14：货物到仓）
- 退货超时 unreserve：reserved ↓（iter-16：approved 超 7 天未收到货，释放占用但不加 available）

### 6.6 退款状态机（iter-14 + iter-16）
```
pending_approve → approved → received_back → refunded
                ↘ rejected            ↗
                ↘ closed_overtime (iter-16，return_refund 超 7 天自动)
```
- refund_only：apply → approve → (跳过 received_back) → refunded
- return_refund：apply → approve(reserve) → received_back(receiveBack) → refunded
- closed_overtime: approve 后 7 天用户未发起退货 → 自动关 + unreserve

### 6.7 RBAC（iter-16 + iter-17）
- admin_users 表 + bcrypt 密码
- 手写 HS256 JWT（30 行，零新依赖），ENV `ADMIN_JWT_SECRET`
- 3 角色（super_admin / warehouse / sales_ops）
- **三后端独立 verify**（iter-17）：PIM/WMS 各 30 行 AdminTokenService 抄 OMS 一份，同 secret 同算法。避免每请求跨服务调 OMS `/admin/me` 校验（延迟 + 故障耦合）。
- **middleware 变参 role 限制**（iter-17）：`->middleware(AdminAuth::class, 'super_admin', 'sales_ops')` 路由组维度统一应用
- **enforcement 矩阵**：

  | 接口 | 允许角色 |
  |---|---|
  | OMS admin/login | （无 auth）|
  | OMS admin/order/* | 任意 admin |
  | OMS admin/refund/* | 任意 admin |
  | OMS admin/user/* | **super_admin 独占** |
  | OMS admin/audit-log | 任意 admin（但 UI 仅 super_admin 可见菜单）|
  | PIM admin/* | super_admin / sales_ops |
  | PIM 公开读（product/list 等）| 无 auth（小程序 / shop BFF 用）|
  | WMS picking-order | 无 auth（OMS infra 触发）|
  | WMS 其余全部 | super_admin / warehouse |

### 6.8 admin audit log（iter-15 + iter-17）
- 10 处 admin 写操作自动记录：
  - iter-15：order.force_cancel / order.recover / inventory.adjust / refund.approve / refund.reject / refund.confirm
  - iter-17：admin_user.create / admin_user.update / admin_user.change_password / admin_user.delete
- before/after JSON snapshot + ip/trace_id/operator
- AuditService::log() 静态调用，失败 try/catch 不阻塞主流程
- Vue 操作日志页 4 维度筛选（action / operator / target_type / target_id）

### 6.9 测试流程（iter-17 起严格落地）
- 每 iter 代码交付后**强制拆**两份产物到 `outputs/testing/`：
  - `iteration-N-auto-test.md` — 主控自己跑 curl / phpunit / 文件检查，**实际结果栏含真实 HTTP 输出**
  - `iteration-N-manual-test.md` — 列步骤给用户勾，仅限 UI 点击 / 真机 / 视觉对比类
- 边界遵循 [`.agents/testing/SKILL.md`](.agents/testing/SKILL.md)：能 curl 测的不允许丢给用户
- progress.md 顶部"⚠️ 测试硬约束"块强提醒
- iter-0~16 不回补（成本超过收益），iter-17 起强制
- 实证收益：iter-17 抓 1 bug / iter-18 抓 1 pre-existing bug + 1 dev bug / iter-19 抓 3 dev bug + 1 架构补丁。**总计 5 轮拆分共抓 7 个 bug，全部在交付前修完**。

### 6.10 运营增强四件套（iter-18）
- **导出 CSV**：fputcsv + `\xEF\xBB\xBF` BOM 流式输出（Excel 中文不乱）；单次 limit 5000，零新依赖
- **下载触发**：Vue fetch blob + 程式化 `<a download>`（避免 `<a href>` 加不上 Authorization 头的局限）
- **模糊搜索**：SQL LIKE %%，多字段 OR group（订单号 + 地址 / 退款号 + 原订单号 / SPU 名 + 编码），不引入 ES
- **Dashboard ECharts**：5.6 裸调用（不用 vue-echarts 包装层），onBeforeUnmount dispose + window resize 监听 → 防内存泄漏；时间序列后端补 0 避免前端日期对齐
- **批量操作**：单次 ≤ 50，每单独立 try/catch + 独立 tx，返回 `{ok_count, failed_count, failed[]}`；前端 `:selectable` 函数 + `canBatch` computed 双层守卫禁错状态多选

### 6.11 营销模块开篇 · 优惠券 / 促销（iter-19）
- **券类型**：threshold 满减 + percent 折扣两种；商品券/品类券放 M3+
- **单位一致性**：全 bigint 分（与 orders 一致）；threshold.discount_value = 减分数（1000=¥10），percent.discount_value = 整数 1-99（15=减 15%=8.5 折）
- **不可变字段**：模板创建后 type / discount_value / min_amount 不允许改（避免运行中规则变更）；name / valid_to / max_discount 可改
- **核销时点**：订单创建 tx 内 lock user_coupons + lock coupons → 算 discount → 写 orders.discount → mark user_coupons.used + coupons.used_count++（全 rollback 一致）
- **并发防超领**：领券事务内 coupons FOR UPDATE + user_coupons FOR UPDATE 双锁
- **取消订单**：默认**不返券**（业务习惯，文档明示）
- **跨库读**：shop-backend 默认连 shop_db，coupons 在 oms_db → 加 `Db::connect('oms')` 副连接读 coupon 系表。**经验：跨服务共享只读数据时，副 DB 连接 比 RPC 简单 10 倍**
- **RBAC**：营销属业务运营，开放 `super_admin` + `sales_ops`，不给 warehouse

### 6.40 小程序跳转链路补齐 Q40-01 + Q41-01（iter-51 · 内容运营断链修复）
- **"建好资源 + 终端点击不通" = 内容运营断链典型**：iter-40/41 建好 banner + featured + topic 全套后台，但小程序 onBannerTap 等点击都是 toast 占位，运营摆好货架但买家点不进去。**经验：内容运营功能建设要"建+用"成对推进，避免单边断链；建好后台必须配套对应的小程序端落地**
- **后端补 join vs 前端二次查询**：选后端 join。每 banner 点击若前端再单独查 SPU→SKU 至少 1 次往返，N 个 banner 滚动展示就 N 次。后端 once-and-join 把 sku_code 写入响应字段，前端零增量请求。**经验：小程序场景每次少 1 次网络比"前端简洁"更划算（小程序网络贵）**
- **跨库 helper 重复 2 次不抽**：BannerService + MarketingTopicService 各 1 份 fetchFirstSkuCodes，沿 iter-41 "3 次后再抽"约定。**经验：KISS 原则下，重复 2 次容忍 — 抽公共带来的耦合成本 > 几行重复**
- **fetchFirstSkuCodes 用 ORDER BY id ASC 取首 SKU**：业务"首 SKU"语义有多种（首创建 / 默认标记 / 销量最高 / 价格最低），v1 选最简单的 id 升序。**经验：业务规则未定义时选最简单的可解释规则；用户可在 v2 通过 SKU 加 `is_default` 字段精确控制**
- **降级 sku_code 留空字符串 + 前端 toast"商品已下架"**：跨库失败 / SPU 已删 / SKU 全删 → 字段空 → 前端用户友好提示。**经验：BI/Dashboard 类弱依赖降级模式（iter-29）也适用于小程序公开读 — 降级是"不让边缘错误传染主流程"**
- **小程序 link_type 4 分支显式 dispatch**：spu / category / url / none 各自处理（spu→navigateTo / category→list / url→toast / none→不动）。**经验：枚举字段处理要写"枚举 → 行为"显式 dispatch 不要用"else 兜底所有"**
- **wxml data-sku 字段加传**：home + topic-detail 各加一次。**经验：wxml 数据传递是"声明式 dataset"，加字段成本极低；前端组件解耦的关键是 data-* 而非 JS 闭包**

### 6.39 商家自助提现 Q35-03/Q39-03（iter-50 · BIZ-08 真正最后一公里）
- **多商家闭环的"最后一公里"是提现**：iter-37 已把抽佣自动算到 settlement_orders（platform_commission 负行），iter-39 商家可以查结算单，但**钱实际还没回到商家手里**。本轮补齐"商家自助申请提现 + 平台审批 + 标记打款"全流程，才是真正能跑业务的多商家平台。**经验：业务系统的"最后一公里"通常是钱/物的实际转移；前置工作做了 5 轮（iter-35-39）但少了这一步整个 BIZ-08 价值打折**
- **余额算法：pending 不锁 / approved+paid 才锁**：避免恶意申请多笔 pending 占着但实际不审批的情况；同时 approved/paid 必须扣，否则商家可对同一余额申请 N 次都通过。**经验：金融类状态机的"锁定"边界要清晰；锁太早占资源、锁太晚出超支**
- **store_owner 不传 storeId 服务端推**：路由保护 + 服务端从 `$request->store_ids` 推 storeId，前端零传参。同 iter-36 三态过滤设计。**经验：横切字段（store_id / user_id 等）服务端推 > 前端传 — 不给恶意前端伪造的机会**
- **状态机 transitState 通用 helper**：approve / reject / markPaid 都走同一个 `transitState($no, $fromStatus, $toStatus, $operator, callback)` 函数，差异写在 callback 里填额外字段。**经验：状态机操作的 3-5 个 transition 抽 helper 比 3-5 个独立函数省 60% 代码**
- **fix-1 路由顺序坑（第 N 次）**：plain `POST admin/withdrawal` 放参数路由 `POST admin/withdrawal/<no>/approve` 前 → approve 被吞返"仅商家可申请"。iter-10/19/27 都踩过。**经验：TP 路由按声明顺序匹配，参数路由必须前置；建议项目内加 lint 规则 / 代码审查 checklist 强制；这是项目第 4 次同坑，应考虑技术债清理**
- **fix-2 AuditService::log 7 参签名错位**：`action, targetType, targetId, before, after, reason, operator` 7 参，我把 `$requestedBy` 当 reason 传了 → audit_log 里 reason 字段显示操作者名字，operator 字段反而为 null。**经验：静态多参签名（尤其含 nullable）易错位；PHP 8 命名参数 / Service 加 wrapper 函数（applyAudit / approveAudit）能显著降低误用率**
- **平台店 store_id=1 业务硬保护**：getBalance 直接返 `note: "平台店不支持提现"`，apply 入口 throw。同 iter-35 平台店硬保护设计。**经验：默认店是基础设施，不允许任何"商家行为"在其上发生**
- **lock(true) 防并发**：transitState + getBalance 都包 tx + lock(true)，避免商家点连点导致一笔余额申请 2 次 + 平台审批员同时点通过。**经验：金融类业务必加行锁；用户多设备 / 平台多审批员都可能并发**
- **审计落盘**：apply/approve/reject/pay 各落 admin_audit_log，未来追查"为何此单被拒"有据可查。**经验：金融类业务的 audit 不是 nice-to-have 是合规底线**

### 6.38 异常预警面板 BI-04（iter-49 · BI 系列 + 整个路线图收口）
- **单 endpoint 聚合 vs 拆 N**：4 类预警放一个 endpoint，前端调 1 次拿全。比拆 4 个节省 4x 网络 + UI 无需 4 个 Promise.all 等待。**经验：dashboard 类聚合查询单 endpoint 是默认选择，N+1 网络是反模式**
- **统一 schema 让 UI 通用化**：每 alert 都用 `{key, name, level, current, baseline, ratio, items[], action_hint}` — UI 一个模板渲染 4 类卡片。增加第 5 类预警只需后端加 PHP block，UI 0 改动。**经验：统一 schema 比每类 alert 单独 UI 组件可扩展性强 10 倍**
- **冷启动保护避免假告警**：开发期 / 新店 7d 均订单 < 3 单时，ratio 计算趋向极端（如 1/0.4 = 2.5x 看似 critical 实际只是从 0 → 1）。判断 `if avg < 3 || today_order < 3 → 降 ok`。**经验：基于比值的预警必须有"最小样本量"门槛，否则开发期一片红海**
- **replayed 死信用字符串协议识别**：dead_letter 的"是否已 replay" 用 error 字段是否含 "replayed at" 字符串判断（iter-42 EFF-08 append-only 模式）。省了 ALTER 加 status 字段。**经验：低频字段用字符串协议 < ALTER 表 < 新表，按需升级**
- **预警卡片应是行动入口非展示终点**：每卡 click → 跳关联管理页面（死信→死信中心 / 库存→预警规则 / 订单→订单列表 / 退款→退款审批）。用户看到红卡 → 立即点 → 干活。**经验：BI 不是终点是入口；看到问题与处理问题距离 1 次点击之内**
- **30s auto refresh + 手动开关**：默认开 + 用户可关。setInterval 30s（30 < 60 因为预警比 Dashboard 类敏感）。onBeforeUnmount stopTimer 防泄漏。**经验：预警类页面默认 auto refresh 但要给关闭开关 — 用户多窗口工作时频繁刷新会卡**
- **4 色级别调色板**：ok 绿 / warn 橙 / critical 红 + 中性灰背景。每色对应 LEVEL_META 一致 mapping，不要让"成功"出现红色这种语义错乱。**经验：状态色调色板必须项目内统一，跨页面一致 = 用户大脑成本低**
- **0-fix 第 3 个 iter**：第 1 iter-21（运营 Dashboard 增强）/ 第 2 iter-47（BI-02 漏斗）/ 第 3 iter-49（BI-04）。共同点：**复用既有基础设施 + 不动表结构 + 不动菜单父级**。**经验：第 N 个同模式 iter 大概率 0-fix；模板成熟后增量功能可以"无声完成"**

### 6.37 SKU 生命周期分析 BI-03（iter-48 · SPU 5 阶段）
- **放 PIM Admin 而非 OMS**：OMS 无 PIM 副连接（OMS→PIM 仅 iter-34 换货时建过，但走的是不同方向；PIM→OMS+WMS 在 iter-29 已建好）。**经验：BI 跨库分析放"最易拿到所有数据源"那侧，不强求所有 BI 都在 OMS**
- **3 数据源跨库读模式**：本库 PIM.spus → 跨库 OMS.order_items → 跨库 WMS.inventory，三步聚合到 SPU 维度。每步独立 try/catch 降级。**经验：3 数据源跨库分析时建立 SKU code→spu_id 反查映射 1 次即可，避免循环里重复查找**
- **阶段判定优先级序**：v1 把 5 条规则按"先判终态→再新→再热销/滞销→兜底"排序。这避免"新品 + 销量 >10"被错分（先 hit 新品就 return）。**经验：多规则分类时优先级必须显式定义，否则规则间互相覆盖；规则文档要写"序号 1 优先于 2"明确语义**
- **published_at 字段 vs spu_status_log 计算 vs spus.create_time**：3 种方式选 1。published_at 自带最准（PIM 维护），status_log 第一次 publish 也对但需子查询，create_time 兜底（草稿期算上架日）。v1 优先 published_at + fallback create_time。**经验：能用字段就别算 — published_at 是 PIM 设计时已留好的字段**
- **跨表字段名混用 created_at vs create_time（fix-1 实证）**：TP 8 默认时间戳字段是 create_time/update_time（命名约定），但项目其他表用 created_at/updated_at（iter-3 时已踩过类似坑 #data-schema 偏差）。**经验：跨表读元数据前必须 DESC 表头确认；最好统一项目内时间字段命名**
- **6 KPI 卡片调色板 5 色化**：good 绿（新品有潜力）/ hot 红（热销）/ warn 橙（滞销，需要清库存）/ cold 灰（淘汰）/ 中性灰（统计）。**经验：BI KPI 卡片色彩要映射"语义类别"而非任意配色 — 让用户瞥一眼即知好坏**
- **散点图按阶段着色 + 销量×库存 2 维**：x=销量 y=库存，颜色=阶段。一眼看出"高销量低库存=要补货"、"低销量高库存=滞销积压"、"低销量低库存=冷门 SKU 适合淘汰评估"。**经验：散点图的颜色编码 ≥ 形状编码 ≥ 大小编码（人眼对颜色最敏感）**

### 6.36 数据洞察续推 BI-02（iter-47 · 订单漏斗 5 阶段）
- **distinct user vs cohort 是 funnel 第一道选择题**：distinct user 模型 SQL 简单（每阶段一个 COUNT(DISTINCT user_id)），但允许 conv_from_prev > 100%（业务数据异构时）。cohort 严格但需 user-stage 临时表 + 多 JOIN（O(N²)）。v1 业务系统 distinct 即可，大数据集（>10w 用户/日）才切 cohort。**经验：业务 BI 默认选最简单的模型，扩展到 cohort 是 M3+ 优化项**
- **跨库弱依赖降级**：shop_db.cart + shop_db.reviews 跨库读各自 try/catch 失败降 0，**OMS 自有 orders 3 阶段不受影响**。Dashboard 类弱依赖型场景必须降级（同 iter-29 PIM Dashboard 跨库读 OMS+WMS 失败容错）。**经验：BI 跨库读必降级，主数据失败时辅助数据降 0 而非整页 500**
- **biggest_drop_stage 自动算 = 高 ROI 自动洞察**：找 conv_from_prev 最低的相邻阶段对，直接给运营"该往哪里发力"的提示。手算找最低值人眼扫漏斗几秒，但自动算给 KPI 卡视觉锚点。**经验：BI 不只展示数据，要"自动推荐下一步"**
- **0 fix 第 2 个 iter**：项目首个 0-fix iter 是 iter-21（运营 Dashboard 增强），iter-47 是第 2 个。共同特征：**复用模板**（RBAC 复用 iter-46 / 跨库副连接复用 iter-20 / KPI 卡设计复用 RFM）+ **不动表结构**+ **不动菜单父级**（只加子项）。**经验：第 N 个同模式 iter 大概率 0-fix，因为踩坑都踩在第 1 个；模板化收益巨大**
- **ECharts built-in funnel 形态**：echarts 自带 type:'funnel'，sort:'descending' 自动按值降序排倒梯形 + label position:'inside' 直接标在梯形内。比手画 div 5 个倒梯形 + 计算宽度比例快 50 倍。**经验：echarts 内置类型能用就用，自己实现唯一理由是真的有自定义需求**
- **KPI 卡 warn 橙色专预留"流失/告警"类**：原 good 绿 / hot 红 / cold 灰三色已用完，BI-02 加 warn 橙色专给 biggest_drop / lost 类指标。视觉分级一致性 = 4 色调色板。**经验：UI 颜色不要随意加，每色都映射"语义类别"**
- **conv_from_prev < 50% 红字 ↓ N.N% 警示**：列表里仅在低于 50% 时显流失警示（默认运营期望 ≥ 50%）；> 50% 不显（避免视觉噪音）。**经验：UI 警示要"按需出现"不要常驻**

### 6.35 数据洞察起步 BI-01（iter-46 · 用户 RFM 分层）
- **绝对阈值 vs 分位法选择**：分位法（NTILE / 五分位）业界经典但依赖样本规模（推荐 N ≥ 20）；小样本（< 10 用户）下分位法把单用户也分到底分位，语义错乱（fix-1 实证 n=1 → R1F1M1 → 休眠）。改绝对阈值（R 按天/F 按单/M 按元区间）业务方一眼看懂且零样本依赖。**经验：业务 BI 默认绝对阈值；分位法留给大数据场景或前端可调阈值**
- **8 分群规则的可读性**：直接给"重要价值/重要保持/不能失去/流失"等中文 segment 名比裸 R/F/M 5x5x5=125 组合可读 10 倍。Kotler RFM 模型简化版即可。**经验：BI 数据呈现层要做"翻译"——把分数翻译成业务可决策的标签**
- **6 KPI 的分类逻辑**：total / active（R 近）/ high_value（业务定义的 3 大类）/ lost / revenue / avg_orders。每个 KPI 都能直接驱动一个运营动作（活跃推券 / 高价值挽留 / 流失召回）。**经验：KPI 卡片不只是数字，应映射到具体可操作的运营动作**
- **clamp ENV 参数**：days `max(7, min(720, ...))`，前端传非法值也不崩。**经验：所有数值 query 参数必须 clamp，前端永远不可信**
- **role guard 在 controller 顶 fail-fast**：BI 数据比业务数据更敏感（含金额聚合），不能依赖 OMS admin group 默认 middleware（任何 admin 都通过）。**经验：iter-44 Q44-05 横切角色审视在 BI 系列首次实践——新业务/敏感接口必须显式守允许角色**
- **ECharts 散点 symbolSize 用 sqrt 非线性**：`8 + sqrt(val/maxM) * 40` 让金额差距大时气泡不至于过大盖住其他点。**经验：scatter 用气泡大小编码第 3 维时，sqrt/log 非线性映射 > 线性映射，视觉均衡**
- **0 新表 0 新 migration**：纯 SQL aggregate 既有 orders；BI 系列大概率都能 0 新表起步，复杂查询用 service 层即可（M3+ 数据量大才考虑物化视图 / 离线 ETL）
- **新菜单父级用 emoji 头**：`📊 BI 数据洞察` 与 `📋 待办中心` 一致风格——视觉上提示用户这是新功能区。**经验：菜单 emoji 不夸张时增强识别度**

### 6.34 运营效率收口 EFF-4（iter-45 · WMS PDA H5 移动端）
- **PDA 是独立路由组比塞 admin layout 更对**：手机用户不需要左侧菜单 / 健康监控条 / 顶部健康 tag。独立 `/pda/*` 路由 + 独立 PdaLayout 比"AdminLayout 加 mobile 适配"清晰 10 倍。**经验：移动 vs 桌面 UX 差异大时，独立 layout > 响应式 patch**
- **viewport meta 已 OK**：项目 index.html 早有 `width=device-width, initial-scale=1` 默认（基建保留）；移动端只需关心字号/按钮尺寸
- **0 后端改动证明 API 设计良好**：iter-22 设计 PickingTaskService.scan 增量上报模式 + iter-25 InboundService.autoComplete 推荐 Top1 上架，本轮 0 endpoint 增量即支撑 PDA 全流。**经验：好的 service API 设计（接受 incr 增量、自动状态流转）天然适配多端**
- **401 拦截器多入口分流**：location.pathname 判 `startsWith('/pda')` 决定跳 `/pda/login` 还是 `/login`。**经验：SPA 多登录入口必须在拦截器层分流，否则 PDA 用户 401 被甩去 admin login 体验崩**
- **扫码 UX 三件套**：（1）Enter 即提交（不要"提交"按钮）（2）成功后 nextTick + focus 回扫码框（不让用户去点）（3）SKU mismatch toast 1.5s 红色拒绝（不写盘）。**经验：扫码场景"零点击"是核心目标，输入框始终聚焦 + Enter 接收**
- **完成自动跳回 1s 缓冲**：picked 完成时 toast"已完成 ✅" 1s 后跳回列表，让用户看到反馈。**经验：异步成功反馈太快跳页用户会困惑，1-1.5s 是黄金平衡**
- **fix-1 教训：nested wrapper detail vs flat list 不一致**：Inbound list 返 flat row `{status, ...}`；detail 返 `{order: {status}, items: []}` wrapper。前端用 list 形态读 detail 直接拿不到。**经验：复用 API 必看返回结构，TP detail() 喜欢 wrap，list 不 wrap，UI 层扁平化适配**
- **大字大按钮的力学**：按钮 ≥ 52px 高（手指可靠点击）/ 输入 44px / 卡片间距 10-12px（不误触相邻卡）/ 字号 16-20px（户外可读）/ 主色 #FF385C 高对比。**经验：移动 UI 不是"缩小桌面"是不同设计语言**

### 6.33 运营效率第 3 轮 EFF-3（iter-44 · ⌘K 全局快速搜索）
- **跨模块统一 endpoint vs 拆 4 endpoint**：`/admin/quick-search?q=` 一个接口聚合 3 类 OMS 业务 + 1 类 PIM。前端只调 OMS+PIM 两次（Promise.all），不再为每张表单独发请求。**经验：聚合查询接口比"按 entity 拆分"在搜索场景节省 70% 网络往返**
- **前缀策略路由**：`SO*` 走订单分支 / `RF*` 走退款 / `EX*` 走换货 / 11 位数字 → 手机号 / 其他 → 全字段 LIKE。**经验：约束 ID 前缀让 SQL planner 更高效（精确 LIKE 前缀走索引），多分支 dispatch 也让结果更准**
- **JSON LIKE 严格 vs 宽松**：iter-42 EFF-01 phone 用 `"%\"phone\":\"%xxx%\"%"` 严格闭合双引号，address 序列化带空格时 0 匹配（fragile）；iter-44 改 `"%xxx%"` 宽松 LIKE，11 位纯数字撞其他字段概率极低，业务可接受。**经验：JSON 字段固定 key 模糊匹配，宽松 LIKE > 严格 escape；MySQL JSON_EXTRACT 才是稳的但需要 5.7+**
- **OMS admin group 默认无角色限制**：editor 角色（iter-43 加）持有合法 admin JWT，可调用 OMS 任何 admin endpoint。新业务接口必须显式守 editor（在 controller 内 `if role==editor return empty` 或路由层移到 super+sales group）。**经验：横切角色加入后系统所有现存 endpoint 都要审视一遍 — 不要假设默认 group 守得住**（fix-2 实证）
- **全局键盘快捷键设计**：用 `keydown` 而非 keypress（keypress 不支持 meta 修饰）；`metaKey || ctrlKey` 跨平台双判；`e.preventDefault()` 阻止浏览器默认行为（Chrome ⌘K 是 omnibox 聚焦）；isMac 检测 `/Mac/.test(navigator.platform)` 显示对应快捷键提示。**经验：跨平台快捷键提示要显式区分 ⌘ vs Ctrl，让用户立即知道按啥**
- **200ms 防抖在 watch 入口**：用户每敲键不立即查 DB，停顿 200ms 才发请求，节省 5x 网络。clearTimeout + setTimeout 简单实现，不引 lodash。**经验：搜索框必须防抖；超过 100ms 用户感受不到延迟，节省网络/CPU 显著**
- **结果分组 emoji header 提升识别度**：📦 订单 / ↩️ 退款 / 🔄 换货 / 🛍 SPU 比纯文字"订单（5）"更易扫读。**经验：搜索结果列表用 icon + 计数比纯文字更适合快速识别（搜索是高频低耐心操作）**
- **空查询 < 2 字符直接返空**：避免单字符触发全表扫描。**经验：搜索接口必须有最小长度门槛，否则 1 字符查询拖垮 DB**

### 6.32 运营效率第 2 轮 EFF-2（iter-43 · 退款/换货金额阈值二审 + PIM editor 角色）
- **审批流用阈值 + 角色判断比新增状态简单**：原本可以新加 status='pending_super_review'，但会扰动状态机 + 现有 Refunds.vue 状态过滤逻辑。改用 needs_second_review 旗标 + status 保留 pending_approve，UI 加 badge 即可。**经验：能用旗标表达的"分支"不要新增状态**
- **first_approved_by/at 保留追溯**：sales 一审记录入审批链；super 二审通过后 approved_by 写 super 自己。Audit log 同时记录 before/after 含 needs_second_review，留两步签字踪迹
- **role 参数从 middleware 注入到 controller 再传 service**：`$request->admin['role']` 一路向下。**经验：业务 service 层接收 role 比从全局 session 拿更可测**（test 时可任意构造）
- **ENV 默认值不为 0**：`(int)(getenv() ?: 100000)`。如果默认 0 一旦运维忘配 ENV 所有退款进二审，体验灾难。**经验：feature ENV 默认值要让"零配置"也工作良好**
- **PIM editor 路由分组拆出 publish/offline**：不在 controller 内 `if role==editor throw`，而是路由层 group 不包含 editor。**经验：RBAC 用路由分组比 controller 内显式 throw 内聚 — 改 group 不改逻辑代码**
- **新增平台级角色必须三系统 StoreContext 同步**：editor 加白后 PIM 直通；但若以后 editor 进 OMS/WMS，必须把 editor 加到那俩 StoreContextService 白名单。**经验：新平台角色像加 super_admin 一样要"全系统巡检"**（fix-1 实证）
- **跨表同名字段不同名**：refund_items 用 qty，exchange_items 也用 qty，但 service 内若误写 `quantity` 不会编译错。**经验：service 改字段聚合前必查 schema**（fix-2 实证）
- **0 新表 0 业务 ALTER**：纯增 3 字段到两表 + 1 seed 账号 + 1 ENV。**经验：审批流 v1 用增量补字段比"建审批引擎表"快 10 倍且零迁移风险**

### 6.31 运营效率第 1 轮 EFF-1（iter-42 · 待办中心 + 高级搜索 + 死信中心）
- **0 新基建 0 新表 0 新 migration**：纯复用 iter-9 EventBus + iter-28 dead_letter + iter-26 settlement + iter-35 stores（pending 店铺）+ iter-14 refund + iter-34 exchange。**经验：运营效率类需求往往是"已有能力的聚合呈现"，不需要新表**
- **待办中心模式**：用单 service 接口（Admin.todosCounts）一次聚合 6 类待办计数并返回 `{counts: {...}, total_count: N}`，前端按 KEY_META 字典 map 成 6 张卡片。比让前端调 6 个独立接口节省 5 次往返。**经验：6+ 个 KPI 单条聚合 endpoint 强于 N 次小请求**
- **三态 store_ids 复用 iter-36**：todosCounts 同样按 `null=跨店 / []=无权 / [int]=限制` 三态过滤。**经验：横切过滤逻辑（applyStore closure）建一次到处用**
- **JSON 字段 LIKE 模糊匹配**：phone 在 address JSON 内（`{"phone":"13800138000",...}`），用 `LIKE "%\"phone\":\"%xxx%\"%"` 比 JSON_EXTRACT 兼容性好（MySQL 5.7+ 才有 JSON 函数）。**经验：列存 JSON 时，固定 key 模糊匹配用字符串 LIKE 比 JSON 函数简单可靠**
- **SKU 反查走中间表**：sku_code 不在 orders 表，先查 order_items 拿 order_no 数组再 whereIn。limit 1000 防过大；空集时 `where('1=0')` 强制返空（避免 whereIn([]) 在不同 SQL 方言下行为差异）
- **金额范围用分**：前端输入元 → 后端 ×100 转分（与 orders.total_amount 单位一致）；start_date/end_date 按 created_at 范围。**经验：金额边界永远在 controller 层转一次单位（元→分），service 内只用分**
- **死信 replay append-only**：deadLetterReplay 走 EventBus.publish 重新 XADD 回原 stream，让原 consumer group 再消费一次。**dead_letter 行不删**，只在 error 字段追加 "replayed at YYYY-mm-dd HH:ii:ss new_id=xxx-xx"。**经验：append-only 追溯比删除/标志位"已重试"更直观；同行可重投 N 次**
- **Vue 已 replay 视觉反馈**：`isReplayed(row)` 检测 error 包含 "replayed at" 字符串 → 颜色从红改绿。**简单字符串协议比新加 status 字段省 1 个 ALTER**
- **payload 兼容多 schema**：dead_letter.payload 可能是 `{payload: {...}}`（fire 时）或 `{fields: {payload: ...}}`（consumer 解析后）或直接 payload — replay 时三层 fallback 取值，然后 json_encode 再发。**经验：消息格式演进时入口层兼容 N 形比强制规范化更稳**

### 6.30 营销专题 + 营销日历 BIZ-09-2（iter-41 · BIZ-09 收口）
- **异构活动统一 schema**：calendar() 把 banner/featured/topic/coupon 4 类各查后 map 成 `{type, id, name, start, end, status}`，前端只渲染一种结构。**经验：异构数据聚合时把"差异性"挡在 service 层让前端只关心"统一表征"**
- **list vs detail 守时间段不同**：list 仅返当前有效（业务严格），detail 不限（让复盘+直链分享可访问）。**经验：同一 entity 的 list/detail 守卫策略可以不同 — 展示型 vs 溯源型**
- **time-range overlap 双条件**：`start ≤ range_end AND end ≥ range_start`，BETWEEN 单字段会漏跨边界事件。**经验：时间段交集判断不能图省事用 BETWEEN**
- **跨库 PIM 回填模式重复 3 次**：iter-40 Featured + iter-41 Topic + 之前 iter-29 Dashboard。**经验：3 次重复后考虑抽辅助方法 / trait / Service base**
- **UNIQUE(topic_id, spu_id) + try/catch 计数**：addItems 批量插入用 try/catch 统计 added/skipped，重复行不阻塞整体。**经验：批量操作的部分失败容错策略要 explicit**
- **Vue 时间条 div+bgcolor**：不引 gantt 库省 200KB 包体。**经验：可视化简单需求慎用第三方组件，原生 CSS 能解决就不引专门库**

### 6.29 内容运营 Banner + 推荐位 BIZ-09-1（iter-40）
- **2 entity 合并 1 service**：Banner 和 Featured 都是 CRUD + 公开读 + 位置筛选 + 时间段守卫的相似模式。合并 BannerService 减少 60% 重复代码。**经验：模式相似的 2-3 个 entity 合并 1 service 合理；超过 3 个开始要拆**
- **公开字段精简**：admin 返回完整 row（含 store_id/created_by/created_at 等 25+ 字段），公开读用 `->field()` 只取 6-8 必要字段。**经验：公开接口默认黑名单不要白盒返回**
- **跨库 PIM 一次性 join**：publicListFeatured 拿 spu_id 数组后跨库一次查 PIM.spus 拉名+主图+价格，返回拼好。**经验：跨库 join 在数据层完成不让上游 caller 二次查询**
- **time-range NULL=不限**：`whereNull('valid_from')->whereOr('valid_from','<=',now)` 双条件。**经验：业务时间段字段允许 NULL 比强制有值更灵活**
- **小程序 swiper 原生组件**：indicator-dots/autoplay/circular 三 attr 即可，0 第三方依赖
- **link_type 4 种枚举 + 条件 link_value**：UI radio 切换 + `v-if="form.link_type !== 'none'"` 控制输入框可见。**经验：枚举字段做 UI 时按值切换可见性减少混乱**

### 6.28 入驻流程 + 店铺自管 BIZ-08-5（iter-39 · 收口）
- **approve 自动建账号是 BIZ-08 收口关键**：iter-35 建店表 + iter-36/37/38 各模块多店化都已就位，但**手动建店主账号 → 手动绑 store_admins** 流程繁琐。iter-39 改成"通过 + 自动建账号"一步完成，运营体验巨大提升。**经验：架构地基铺好后业务流程的"一步到位"是收口标志**
- **临时密码只返回一次的安全模式**：approve 返回 `auto_account.password` 只在创建时给一次。同 webhook secret / API token / OTP 模式。**经验：密码不持久化在响应里反复出现 — 让运营立即记下来**
- **幂等 approve**：若该店已有 admin（之前手动绑过）则跳过自动建。**经验：状态转换接口的幂等性能避免 90% 的运营误操作**
- **publicDetail code/id 双查**：小程序按 spu.store_id（数字）方便直接调；运营测试用 code 方便。`ctype_digit` 一行判断。**经验：路由参数允许多形式时按数据特征 dispatch 比强制规范化简单**
- **shop-backend BFF 公开 store**：小程序统一走 shop-backend BFF。**经验：BFF 模式不要为单个公开接口破例**

### 6.27 WMS 多店化 BIZ-08-4（iter-38）
- **业务角色边界≠店铺边界**：iter-35 架构地基时 super/sales/warehouse 都注入 null（跨店）。WMS warehouse 角色不该被多店改造限制 — 平台仓管原本就管所有仓库。**经验：架构改造时区分"职能边界"和"数据边界"**
- **横切字段让 service 内部管理**：InventoryService.inbound 自动从 location → warehouse 推 store_id，caller 不感知。同 iter-36 SKU 跟 SPU.store_id 模式。**经验：横切字段在数据层自动同步比让上游传值可靠 10 倍**
- **warehouse_type 字段就位但 v1 无业务差异**：self/merchant 为 iter-39 入驻流程 + 商家自助提现做准备；当前字段就位但暂无差异化逻辑。**经验：架构改造时把字段补齐比留待后续 ALTER 风险低**
- **跨店调拨 v1 不做**：TransferService 复杂规则（平台代理 vs 商家自营 vs 商家间），v1 store_owner 限本店内调拨。**经验：复杂业务规则延后比草率实现好**
- **复用 iter-24 WMS→OMS 副连接**：WMS StoreContextService 跨库读 oms.store_admins 用现成连接，0 新基建

### 6.26 OMS 多店化 + 订单拆单 BIZ-08-3（iter-37 · 最危险一轮）
- **feature flag 是最危险一轮的命脉**：iter-37 改了 OrderService.create + Payment.callback + SettlementService 多处，但 `OMS_MULTI_STORE_SPLIT=false` 默认让所有现有流量走单店分支，0 行为变化。**经验：架构改动通过 flag 灰度比一次性切风险低 100 倍**
- **父单不入 orders 表**：PO 前缀号仅作"逻辑容器"在子单 parent_order_no 字段引用。避免改 orders 状态机 + 复用现有 detail/list/cancel 等所有接口。**经验：能用关联表达的关系不要新建实体**
- **跨库 PIM 拿 store_id 容错降级**：跨库读失败时全归 store#1 平台店（兼容旧逻辑）。**经验：跨库读必须有 fallback，架构改造不能让业务挂**
- **多店带券 v1 拒绝**：跨店分摊算法复杂（按店比例 / 按单店全摊？），v1 拒绝 + 友好引导分批下单。留 v2 (Q37-01)
- **抽佣自动按 stores.commission_rate**：confirm 时落 settlement 时自动算独立 platform_commission 行（负数从商家扣）；store_id=1 跳过（自营无需抽佣）。复用 iter-26 settlement_orders 表
- **multi-ALTER migration 容错教训**：一个 ALTER 链中后面失败时前面 ALTER 已落地无法 down 回滚。修复：手动 ALTER 剩余表 + INSERT migrations 表标记 + 写补丁 migration。**经验：ALTER 多表写一个 migration 有风险，按表拆分更安全；或者用 hasColumn 防御**
- **markPaidByParent 部分失败容错**：foreach 子单 markPaid 单个失败仅 error_log，整体仍返回成功子单。**经验：批量操作的容错策略必须明确**

### 6.25 PIM 多店化 BIZ-08-2（iter-36）
- **store_ids 三态语义（null/[]/[int]）**：null = 跨店访问（平台员工） / [] = 无关联店铺（数据隔离返回空集） / [int] = 限制到这些店。**经验：用 null 表示无过滤比 [] 更安全 — `whereIn('store_id', [])` 在 SQL 不同方言下行为不一致**
- **辅助方法集中收口**：Product controller 加 3 辅助 (applyStoreFilter / resolveCreateStoreId / assertStoreAccess)，9 处过滤点复用。**经验：横切关注点抽函数比每处复制 if 条件可靠 10 倍**
- **sed 批改方法签名**：`spuDetail($id)` → `spuDetail($request, $id)` 一次 sed 改 4 处 caller，几秒完成。**经验：签名变化用 sed 比逐个 Edit 快**
- **importCsv 单批单店**：导入开始就用 resolveCreateStoreId 锁定 store_id，全批落同一店；csv 内已存在 SPU 必须在本批 store 范围内才允许 update（防越权改他人店）
- **categories/brands 暂不加 store_id**：v1 平台公共资源，避免一次改太多；商家自定义类目留 v2 / iter-39 入驻流程时再考虑
- **跨库读容错降级**：Admin.storeList 读 oms.stores 失败时返回平台店占位 `[{id:1, code:platform}]`，保证 Vue 下拉仍可用
- **PIM 路由 middleware 加角色**：原 `super_admin/sales_ops` → 加 `store_owner/store_staff`。**经验：地基（middleware 注入 store_ids）和角色放行（route allowedRoles）是两件独立事，都要做**

### 6.24 多商家架构地基 BIZ-08-1（iter-35）
- **5 轮规划文档先行**：BIZ-08 是 5+ 轮架构改造，先写 [docs/biz-08-多商家架构规划.md](../docs/biz-08-多商家架构规划.md) 10 节（业务范围 / 数据模型 / 权限 / 5 轮拆分 / 迁移策略 / 跨店边界 / 风险 / 决策清单）让用户拍板才动工。**经验：5+ 轮的大事必须文档先行，避免方向错了返工**
- **平台店 id=1 在 migration INSERT 落地**：不依赖 seed，跑完 migration 立刻可用。所有存量数据（spu/sku/order/inventory 等）未来 ALTER 加 store_id 时默认 1=平台店
- **不 ALTER admin_users.role enum**：原 VARCHAR(32)，新角色 `store_owner` / `store_staff` 直接存。enum 改 ALTER 复杂且兼容性差。**经验：能用字符串就别强制 enum**
- **AdminAuth 注入 store_ids 但不强过滤**：iter-35 仅"提供能力"。super_admin/sales_ops/warehouse 注入 null = 跨店访问；store_owner/store_staff 注入实际 store_ids 数组。业务 service 是否用是 iter-36~38 各自的事。**经验：架构能力 vs 业务约束分两步，地基轻量纯增量**
- **Redis 缓存 store_ids 1h**：高频读 + 低频写场景，store.admin_add/remove 时主动 flush。**经验：每请求 join store_admins 性能差，缓存是必须**
- **0 ALTER 业务表**：iter-35 失败回滚仅 drop 2 张新表 + revert middleware change。**风险隔离的核心：地基与业务表解耦**
- **平台店 id=1 业务层硬保护**：不可暂停/不可改抽佣/不可绑解管理员（UI 隐藏按钮 + service 层 throw）。**经验：默认店是基础设施，靠业务约束保住，不依赖 admin 自觉**

### 6.23 换货流程 BIZ-07 v1（iter-34）
- **v1 主动放弃自动库存联动**：换货实物状况复杂（旧货可能损坏/磨损/缺件），自动联动僵化。运营更习惯"看到实物再决定入不入库"。v1 = 工作流跟踪 + 状态机 + 时间戳 + 凭证图，v2 留位库存联动。**经验：业务流程的"灵活性"有时比"自动化"更重要**
- **同 order_item 进行中阻断**：用 join exchange_orders + exchange_items 一次查询过滤 `status NOT IN (rejected/cancelled/completed)`。**经验：防重复提交在数据库层校验比业务层判断更可靠**
- **OMS→PIM 副连接首例**：iter-29 是 PIM→OMS+WMS，iter-34 反向。换货创建时跨库读 PIM 拉新 SKU 快照存到 exchange_items（同 order_items.sku_snapshot 模式），避免 PIM 改 SKU 影响已申请换货。跨库累计 6 个方向
- **route group RBAC 选择**：OMS 现有 3 个 group（任意 admin / super only / super+sales）。换货初版我误放 group 1 → warehouse 也能审批；改放 group 3。**经验：新增 admin 接口先想清楚谁能操作再选 group**
- **同模式复用 refund**：refund 是 6 态机+评价 evidence+按钮按状态显示，换货是 7 态机+evidence+按钮按状态显示，UI/API 模式高度相似 → 抄过来改字段名快很多。**经验：当模式相同时复制粘贴是更快也更稳的，强行复用基类反而僵化**

### 6.22 OMS Webhook 异步化 + 接入文档（iter-33）
- **业务路径异步化收益**：fireAsync 实测 1.08ms（仅 XADD），对比 iter-28 同步最坏 5s × 3 retry + 500ms × 2 = 15.5s+。用户感知订单确认从"可能卡 1-15s"变成"不可见的瞬时"。**经验：业务路径耗时占大头来自外部依赖时，异步化是单次最大 ROI 改造**
- **降级路径必须留**：fireAsync 内 try/catch EventBus.publish；Redis 宕 → 自动 fireSync。**不要把消息可靠性强绑定到队列可用性**
- **EventBus 复用 0 新基础设施**：iter-9 写好的 publish/consume 已含 dead_letter + 3 retry + 自动重连，直接复用，新事件流类型只是 stream/group 名。**经验：基础设施抽象到位后，相同 pattern 的新需求只是配置**
- **fire() 软弃用而非删除**：保留 fire() 默认路由到 fireAsync，老调用方编译通过同时获得新行为。**经验：渐进迁移比一刀切替换稳，尤其在多 service 依赖时**
- **接入文档三语言验签示例**：单语言 sample 不够。生产中外部对接方可能用 PHP/Node/Python/Go，至少给 3 种。**最常被坑的点：用 raw body 算签名，不能反序列化后再算** — 文档要标红
- **iter-28 dead_letter 字段坑（retry_count 不是 delivery_count）本轮 0 复刻**：复用 deliverWithRetry 直接拿到正确字段。**经验：被踩过坑的代码路径复用比重写更稳**

### 6.21 WMS 自动化三件套（iter-32）
- **WMS 第一次 webhook 外推**：iter-28 OMS 是 admin 配订阅表 + 同步 fire；WMS 这里在规则上加 webhook URL（每 SKU 一行配置）。不复用 OMS webhook_subscriptions 是因业务语义不同 — OMS"订阅多种事件"，WMS"为这个 SKU 设个钉钉 URL"。**经验：webhook 模式按业务语义选 — 多事件多订阅 vs 单事件单 URL 不能强统一**
- **supervisord loop 取代 cron**：项目已有 supervisord（OMS consume:* + WMS consume:*），加 loop 是最小增量。cron 还要装 crond + 配 docker，复杂度多一倍。WMS 现有 9 个 supervisord 进程（4 业务消费者 + 3 OMS audit + 2 新 loop）
- **23h 防重复触发**：定时调度 loop 每 60s 扫，可能同 hour:minute 多次匹配。用 `last_triggered_at + 23h` 阻断，保证每天最多 1 单。**关键：不靠扫表频率控触发数，要靠状态字段**
- **service 返回结构嵌套陷阱**：StockTakeService.create 实际返回 `['take' => $detail, 'items' => $list]`，误以为顶层就是 take row → $take['take_no'] = null。**经验：复用 service 前先看返回，TP detail() 模式喜欢嵌套 wrap**
- **WmsConfig 默认值合并**：getLocationWeights 用 `array_merge(DEFAULT, db)` — 数据库只覆盖被改的 key，没改的回落默认值。**经验：KV 配置必须 merge default 兜底**
- **weekly day_of_month 限 1-28**：避免月底差异（2月只到28/29），强校验。**经验：日期类配置默认拒绝边缘 case 比让用户自己想清楚更安全**

### 6.20 PIM 精修三件套（iter-31）
- **批量跨库避 N+1 设计**：列表 20 SPU 若每 SPU 单独跨库查就是 40 次连接。正确做法：先一次查所有当前页 SPU 的 SKU 表拿 sku_code 全集，再各跨库一次 `group by sku_code`，最后程序聚合到 SPU。**3 次查询**完成，无论 page_size 多大。延续 iter-29 PIM→OMS/WMS 副连接基础
- **used_count 实时算 vs 维护字段**：选实时算。理由：维护字段需在 5 处入口（spu create/update/delete/import + 软删）都加 hook，复杂易漏；实时每 list 多扫一次 spus.main_images JSON（PHP 聚合，无 SQL JOIN），数据 < 10k SPU 时延迟可忽略。**数据量上来后再切维护字段（Q31-01）**
- **删除阻断给"哪些 SPU 引用"清单**：不能只说"被引用"，必须返回前 3 名 + 总数让运营立即定位去清理。`using_spus[]` 数组让前端展示
- **ImageUpload 加 prop 而非新组件**：原本想做 PickerOrUpload 复合组件，但 ImageUpload 已被多处复用（refund 凭证图）。改在原组件加 `enableLibrary` prop（默认 false 不影响老用法），PIM 主图打开。**经验：小 prop 渐进 比 新组件 + 替换 更稳妥**
- **限额必须在选择时阻断而非确认时**：ImagePicker 内部用 `selected.size >= max` 阻断继续选，并 ElMessage 提示。让用户立即看到边界，比"确认时报错重选"体验好

### 6.19 PIM 增强三件套（iter-30）
- **CSV 导入幂等策略**：按 code 区分 — 已存在 → update 部分字段（name/base_price/main_images/selling_points），不存在 → create draft。**status / category_id / brand_id 不在 update 范围内**（怕运营误改导致大批商品异常发布/下架）。create 永远落 draft，让用户走专门 publish 通道
- **CSV 导出 BOM**：`fwrite($fh, "\xEF\xBB\xBF")` 必须在 fputcsv 之前。`php://temp` 流式 + stream_get_contents 一次拿走，不写盘
- **属性 JSON schema vs 反范式表**：v1 选 JSON schema（attribute_templates.attrs JSON + spus.attrs JSON），不建 spu_attributes 强约束表。理由：属性维度变化频繁，JSON 改 schema 不需要 migrate；强约束等运营稳定后 M3 再切（Q30-01）
- **应用模板的合并语义**：按 code 去重 — 已存在 code 跳过（不覆盖用户已填的 value），新 code 追加。ElMessage 必须告知"新增 N 项 + 跳过 M 项"才不让用户困惑
- **图片库自动回纳模式**：Upload.image 在 move_uploaded_file 成功后 insert image_library。**失败不阻塞上传**（try/catch + error_log）。盘文件不真删，软删后 UI 用"移除"语义
- **Vue Blob 下载绕拦截器**：http.ts axios 拦截器统一拆 `res.data` 把 CSV 字符串当 JSON 解失败 → 改用 fetch + Authorization header 手动发，拿 Blob 创 download link。**经验：统一拦截器有用，但下载/上传/二进制场景必须单点绕过**

### 6.18 PIM 完整化（iter-29，对齐 WMS iter-24 / OMS iter-26）
- **审计第三案**：iter-15 OMS / iter-24 WMS 早已有 admin_audit_log，PIM 一直裸跑。iter-29 把 AuditService 复刻一份接到 14 个写入点（spu.create/update/publish/offline/delete + sku.create/update/delete + brand.create/update/delete + category.create/update/delete/reorder）— **三模块审计能力对齐**
- **状态机日志 vs 审计日志区别**：audit_log 是"所有写操作流水"，spu_status_log 是"状态轨迹"专用。前者查"谁改了什么"，后者查"商品生命周期 + 上下架曲线聚合"。两表互补不重复
- **PIM 副连接首例**：iter-19~28 跨库都集中在 shop/oms/wms 三角，PIM 一直独立。iter-29 PIM Dashboard 需要"销售热度 × 库存覆盖"双视角 → 加 `Db::connect('oms')` + `Db::connect('wms')`。**跨库副连接累计 5 个方向**（shop→oms / oms→shop / wms→oms / oms→wms / **PIM→OMS+WMS**）
- **跨库读容错**：Admin.stats 中两个跨库 query 都套 try/catch + error_log。Dashboard 是弱依赖型场景，任一副库宕也要让本库 KPI 仍可见
- **operator 取字段优先级**：JWT payload `sub`=user_id（数字），audit operator 若用 sub 表里全是数字难辨。改 `username ?? sub`，operator 显示 admin（iter-29 fix）
- **路由顺序避歧义**：`admin/spu/<id>/status-log` 必须在 `admin/spu/<id>` 之前注册，否则 spuDetail 会贪婪匹配。和 publish/offline 一起放前面

### 6.17 OMS 增强 / 对外集成（iter-28）
- **Webhook 同步 vs 异步**：选**同步**（OrderService.confirm 之后立即调），5s timeout + 3 retry + 500ms 退避。理由：iter-28 规模订单量小（< 100/天）+ 财务对接需要立即知道结果。规模大切异步队列留 M3+
- **签名机制**：HMAC-SHA256(payload, secret)，secret 创建时自动生成 32 字节 hex（admin 可手填）。请求 header 含 X-Webhook-Event / X-Webhook-Signature / X-Webhook-Delivery
- **失败兜底复用 dead_letter**：OMS 已有 dead_letter（iter-9 EventBus 死信），webhook 失败 retry_max 用完即入 dead_letter，stream 字段用 `webhook.<event>` 区分
- **dead_letter 表字段陷阱**：字段名是 `retry_count` 不是 `delivery_count`（**iter-28 fix-1 实证**）。**经验：dead_letter 写入失败应至少记 STDOUT log，不应完全 silent**
- **Dashboard 财务复用 settlement**：iter-26 设的 settlement_orders 现在有用户了 — Dashboard 直接 GROUP BY type + DATE() 算营收/退款/净，refund 自然存为负数让 SUM(amount) 即净
- **Refund Model 渐进迁移**：仅引入 Model 类，service 不替换。**经验：双轨过渡 1-2 个 iter 后再全替换比一次性全替换风险低很多**

### 6.16 优惠券高级三件套（iter-27）
- **scope JSON 数组**：coupons.scope_value 存 `[id1, id2]`，calculateDiscount 接收 items 参数，items 至少 1 个 SKU 在 scope 内即视为命中。**未来折扣仅对范围内 SKU 留 Q27-01**
- **多券叠加算法**：满减先算 → 折扣基于(goods - threshold) — `order_coupons` UNIQUE(order_no, coupon_type) DB 层强约束"同类不叠"
- **OrderService API 双兼容**：优先 `user_coupon_ids` 数组，缺时回落老 `user_coupon_id` 单数 — 前端逐步迁移
- **自动发券触发模式**：shop-backend User.login 检测首次创建用户即调 OMS infra 接口 `/api/v1/coupon/auto-grant`（无 admin 鉴权，infra 层），失败 silent 不阻塞登录
- **自动发券幂等**：rule.per_user_limit + user_coupons 表已发数双校验防超发
- **`isset(null)` 陷阱**：PHP `isset($arr[$key])` 当 value=null 时返 false。检测 key 存在应用 `array_key_exists` — **iter-27 fix-2 实证**

### 6.15 OMS 完整化 P0 三件套（iter-26，跟 WMS iter-24 对称）
- **业务事件新增 stream**（区别于 iter-14/24 字段扩展模式）：iter-14 退货扩 `wms.inventory.changed.refund_no`，iter-24 扩 transfer_no/take_no — 这些都是"同类业务上叠场景"；iter-26 推 cancel/refund.approved/refund.refunded 是**新业务事件**，必须新增独立 stream + consumer group
- **WMS 接收先建链路不做业务**：3 个 handler 都只写 oms_event_audit_log，保留后续 hook 入口（"被动感知能力先建立，业务联动按需追加"）
- **跨库副连接四向呼应**：iter-19 shop→oms / iter-20 oms→shop / iter-24 wms→oms + oms→shop / iter-26 oms→wms — **4 个方向的 inventory 对账 + reviews + users + coupons + reconcile 全靠副连接，0 RPC**
- **财务双触发点**：order confirm + refund markRefunded 两处调 SettlementService（仅最终态触发，避免中间状态频繁落单）
- **财务金额 net 计算**：refund amount 用负数存，SUM(amount) 即净金额，前端简单清晰
- **事件总线 4→7 流**：oms.order.paid / wms.outbound.completed / wms.inventory.changed / pim.sku.changed（4 老）+ **oms.order.cancelled / oms.refund.approved / oms.refund.refunded**（3 新）

### 6.14 WMS 完整化 + OMS 对接（iter-22~25）
- **事件扩展不新增 stream**（延续 iter-14 经验）：iter-24 把 `wms.inventory.changed` 扩展加 transfer_no / take_no 字段，OMS handler 加 4 个分支（refund / inbound / transfer / take_no），不引入新 consumer
- **跨库副连接双向呼应**：iter-19 shop→oms（coupons）/ iter-20 oms→shop（reviews）/ iter-24 oms→shop（users 对账）+ wms→oms（inventory 对账）。**经验：跨服务共享只读数据时，副 DB 连接 比 RPC 简单 10 倍，对账场景甚至 GROUP BY 单 SQL 搞定**
- **inventory_log 双侧对偶**：OMS 有 inventory_log（iter-10）/ WMS 有 inventory_log（iter-24 P0-1，8 种 change_type 全表追溯 before/after qty+locked），通过 ref_no 关联同一业务单（inbound_no/outbound_no/transfer_no/take_no），对账场景可双侧 join 追溯
- **对账不自动修复**：双写灾难风险高，仅记录差异 + admin 确认（status pending→confirmed），让运营人工核对处理。**经验：跨系统对账工具只做"显示差异"，绝不"自动同步"**
- **行级联动复用模式**（iter-22/23）：fix-3 三方智能联动（库位+SKU+目标 disabled 标注 "无商品/无该 SKU/已满/可用 N 件"）→ iter-23 多行 dropdown 直接复用同一套 buildXxxOptions 函数（row 上下文版本），无重写
- **状态机一头多明细模式**（iter-23）：transfers 头 + transfer_items 明细，状态在头级别（draft/in_transit/completed/cancelled），ship/receive 遍历 items 全单事务一致；旧数据 inline 字段改 nullable 兼容
- **FIFO 排序细节**（iter-25）：CASE WHEN batch_no='INIT' THEN 0 ELSE 1 让种子数据 INIT 排首位；后续 BATCH-yyyymmdd 按字典序自然 FIFO。**经验：默认值 / 种子值 在排序时容易跟正常业务值"位置错位"，需要特殊处理**
- **入库整合上架推荐**（iter-25）：autoComplete 不再硬塞 staging，调 LocationRecommendService.recommend Top1（聚集 40 + 黄金 30 + 同区 20 + 容量 10）；用户已指定 location 时尊重用户指定
- **manual-test 抓 UX bug 价值**（iter-22 fix 1/2/3）：后端逻辑 auto 全过，但用户体验差异要靠真人点才能发现。**列表/详情型功能用 dropdown + 显示"现状信息" >> 裸 text input**

### 6.13 数据洞察（iter-21）
- **单接口大响应**：沿用 iter-18 模式，所有维度合并到 `/admin/stats`；前端一次加载、按 days 切换 → 不引入按维度拆 endpoint 的运维负担
- **跨库读复用**：iter-20 加的 OMS shop 副连接直接给 stats 用，count users + sum/avg reviews 一连接搞定
- **try/catch 兜底**：评价/留存跨库失败时返 0 + 不阻塞主响应（订单基础 KPI 总能返回）
- **指标定义就 4 件**：核销率（用/领）、买家比（买家/用户）、复购率（≥2 单/买家）、当日均分。**不引入维度切换**（周/月/自定义日期、N 天注册留存窗口 等放 M3+）
- **隐藏评价不算分**：reviews.status='active' 才进 aggregate，与详情页评价区一致
- **双轴 ECharts**：券图 = 柱(数量) + 折线(率%) ；评价图 = 柱(数量) + 折线(均分) — 两图同模式可复用 onBeforeUnmount dispose 模式
- **0-bug iter 经验**：只动既有文件、复用既有连接、不动表结构、不动菜单 = 风险最小化

### 6.12 UGC + UX 三件套（iter-20）
- **三表归属**：addresses / favorites / reviews 全放 shop_db（用户态资源就近）；admin 反向跨库读 → OMS 加 `shop` 副连接
- **跨库连接模式**：iter-19 shop→oms 读 coupons / iter-20 oms→shop 读 reviews——同一套模式正反向各跑一遍。**经验：跨库副连接 + 写在主连接 是当前架构最便宜的跨域读方案；不引入服务网格 / GraphQL / 异步 read replica 的中间形态**
- **评价唯一性**：DB UNIQUE(order_no, sku_code) 兜底；service 层抓 Duplicate 转友好错误
- **评价校验链**：order 存在 + user 一致 + status='completed' + sku 在 order_items 内 + rating 1-5 + content ≤1000 字 + images ≤9 张
- **spu_id 取法**：评价提交时不再让前端传 spu_id，从 `order_items.sku_snapshot.spu_id` 自动读取（避免前端伪造）
- **评价软删**：admin hide 切 `status='hidden'`，**保留数据 + 实时影响 SPU 详情聚合**；restore 反操作
- **地址默认唯一性**：set_default 在 tx 内先 UPDATE 全 0 再单条置 1；删除默认地址自动挑下一条置默认
- **下单地址兼容老字段**：shop-backend Order/submit 优先收 `request.address`（地址簿选的），地址簿为空时回落 `users.last_address_snapshot`
- **收藏粒度 SPU**：详情页心标 toggle；不收藏 SKU（SKU 变体太多用户难管理）
- **SPU 详情聚合**：BFF productDetail 自动加 review_count + rating_avg + reviews（前 3 条）；评价系统失败不阻塞详情
- **图片复用**：评价图片复用 iter-15 `/uploads/refund-evid/` 上传 endpoint + 路径格式，不新建
- **小程序回填模式**：address-list 和 my-coupons 都用 `?select=1` 进入选择模式 + `prev.applyXxx(data)` 回填，**统一 UX**
- **manual-test 抓 bug**：checkout/onShow 无条件覆盖刚选地址 → 改为 `if (!this.data.address)` 防覆盖。**经验：onShow 自动加载默认值类逻辑必须配条件，否则破坏从子页带回的状态**

## 七、文件清单（核心）

### 后端（每个工程结构一致）
```
apps/{shop|pim|oms|wms}-backend/
├── app/
│   ├── controller/        业务接口
│   ├── service/           业务逻辑（含 EventBus + handler/）
│   ├── command/           consumer 命令（oms/wms 有）
│   ├── model/             ORM
│   └── middleware/        JWT / Idempotency
├── config/
├── database/migrations/   迁移脚本
├── route/app.php          路由（参数路由必须前置）
└── supervisor/consumer.conf  (oms/wms only, 通过 docker-compose mount)
```

### 前端
```
apps/shop-admin/src/
├── apis/                  shop / pim / oms / wms 5 个模块
├── components/            AdminLayout / StatusTag / ImageUpload
├── pages/                 按模块组织
├── router/index.ts        嵌套路由
└── stores/auth.ts         pinia
```

### 设计 / 架构产物
```
outputs/
├── architecture/          tech-stack / data-schema / data-flow / api-list / module-deps / event-bus
├── design/                design-system / prototype-spec / airbnb-components-map
├── product/               feature-breakdown / task-spec / edge-cases / non-goals / design-brief
└── orchestration/         12 套 runbook + 12 套 reconcile-report
```

## 八、已知缺口（M3+）

| 编号 | 事项 | 优先级 |
|---|---|---|
| ~~M3-01~~ | ~~PIM products → WMS products 同步~~ | ✅ iter-13 完成 |
| M3-02 | 真实微信支付 v3 + 阿里云 SMS | 中 |
| M3-03 | PDA 扫码逐条收货 + 差异审批 | 中 |
| M3-04 | 上架推荐 Top3 + 移库 | 低 |
| M3-05 | 实时盘点 / 调拨 | 低 |
| ~~M3-06~~ | ~~仓库/库位多角色权限~~ | ✅ iter-16 + iter-17 完成（全后端 enforcement + Vue 菜单显隐）|
| M3-07 | OSS / CDN 图片存储 | 低 |
| M3-08 | 性能压测 hey/wrk | 中 |
| ~~M3-09~~ | ~~售后退款流程 + reserved 库存态~~ | ✅ iter-14 完成 |
| ~~M3-10~~ | ~~入库/出库创建时 SKU 下拉~~ | ✅ F 完成（iter-13 之后小补丁）|
| M3-11 | 真实微信退款 v3（refund 时调真实 API + 异步回调）| 中 |
| ~~M3-12~~ | ~~用户上传退货凭证图片~~ | ✅ iter-15 完成 |
| ~~M3-13~~ | ~~客服 / 运营备注 audit log~~ | ✅ iter-15 完成 |
| ~~M3-14~~ | ~~售后超时自动关闭~~ | ✅ iter-16 完成 |
| ~~M3-15~~ | ~~PIM/WMS endpoint 级 admin enforcement~~ | ✅ iter-17 完成 |
| ~~M3-16~~ | ~~admin 用户管理 UI~~ | ✅ iter-17 完成 |
| M3-17 | 登录审计（admin login/logout 写 audit_log）| 低 |
| M3-18 | 凭证图 OCR / AI 风控 | 低 |
| M3-19 | 退款超时阈值可配置 | 低 |
| M3-20 | 关闭超时单后用户通知（微信 / SMS） | 低 |
| M3-21 | Token blacklist（角色 / 状态变更后撤销已签 token）| 中 |
| M3-22 | 登录尝试限流（防暴力破解）| 低 |
| M3-23 | 密码复杂度策略 | 低 |
| M3-24 | 用户自助改密 / 找回 | 低 |
| Q18-01~07 | 导出/搜索/Dashboard/批量四件套的延伸（分批导出 / 高亮搜索词 / 周月统计 / 批量审批阈值等）| 低 |
| Q19-01 | 商品券 / 品类券 | 中 |
| Q19-02 | 新人券 / 自动发券 | 中 |
| Q19-03 | 多券叠加（满减 + 折扣同单可用）| 中 |
| Q19-04 | 退款时返券 | 低 |
| Q19-05 | 优惠券分享 / 推荐人券 | 低 |
| Q19-06 | CSV 导出加优惠券列 | 低 |
| Q19-07 | Dashboard 加「券核销率」图 | 低 |
| Q20-01 | 评价多维度（物流/服务/质量分项打分）| 低 |
| Q20-02 | 评价 emoji / 富文本 | 低 |
| Q20-03 | 评价点赞 / 回复 / 商家回复 | 中 |
| Q20-04 | 地址 LBS 定位选址 | 低 |
| Q20-05 | 收藏分组 / 价格降时通知 | 低 |
| Q20-06 | 评价审核加 audit_log（已用 AuditService）| ✅ iter-20 已带（hide/restore 都写）|
| Q20-07 | 评价图片走 OSS / CDN | 低 |
| Q20-08 | rating_avg 加 Redis 缓存（高 QPS 后再说）| 低 |
| Q21-01 | 留存按时间窗细分（7/30/90 天注册-下单转化）| 低 |
| Q21-02 | 复购按时间段（最近 30 天 ≥2 单）| 低 |
| Q21-03 | 评价周/月切换（取代纯 days 维度）| 低 |
| Q21-04 | 券核销漏斗（领取→使用 + 时长分布）| 低 |
| Q21-05 | Dashboard 时间筛选加自定义日期范围 | 低 |
| Q22-02 | 盘点单导出 CSV | 低 |
| Q22-03 | 盘点 / 调拨 移动端 H5（PDA 真机场景）| 低 |
| ~~Q22-04~~ | ~~推荐算法可配置权重~~ | ✅ iter-32 完成 |
| ~~Q22-06~~ | ~~盘点定期任务（按周/月自动建单）~~ | ✅ iter-32 完成 |
| Q23-01 | 调拨部分接收（明细级状态） | 低 |
| Q23-02 | 调拨行级取消 | 低 |
| Q23-03 | 调拨单导出 CSV（含明细展开） | 低 |
| Q24-01 | inventory_log 分表 / 归档 | 低 |
| Q24-02 | 对账自动修复 | 故意不做（双写灾难风险）|
| Q24-03 | 拣货任务 PDA 批量条码扫描 | 低 |
| ~~Q25-01~~ | ~~预警 webhook 通知（外部 API）~~ | ✅ iter-32 完成 |
| Q25-02 | 库位精确容量管理（max_quantity） | 低 |
| Q25-03 | 拣货效率按 operator 维度分析 | 低 |
| ~~OMS 完整化~~ | ~~推 3 事件 + OMS↔WMS 对账对偶 + 财务结算单~~ | ✅ iter-26 完成 |
| ~~Q19-01~~ | ~~商品券/品类券~~ | ✅ iter-27 完成 |
| ~~Q19-02~~ | ~~新人券 / 自动发券~~ | ✅ iter-27 完成 |
| ~~Q19-03~~ | ~~多券叠加~~ | ✅ iter-27 完成 |
| Q26-01 | webhook 推送给小程序 / 第三方 | 低 |
| Q26-02 | 财务结算单加退款审批流 | 低 |
| Q26-03 | 对账自动修复（双侧确认后） | 故意不做 |
| Q27-01 | 折扣仅对范围内 SKU | 低 |
| Q27-02 | 多券叠加加"满减+满减" | 低 |
| Q27-03 | 自动规则加"已下单 N 单后赠"条件 | 低 |
| Q28-01 | xlsx 多 sheet 导出（接 PhpSpreadsheet） | 低 |
| Q28-02 | 异步导出真实接入 supervisord + 任务表 | 低 |
| ~~Q28-03~~ | ~~webhook 异步队列（Redis Stream + retry queue）~~ | ✅ iter-33 完成 |
| ~~Q28-04~~ | ~~webhook 签名校验文档（用户接入指南）~~ | ✅ iter-33 完成 |
| Q28-05 | Refund Model 全替换（移除裸 Db 调用） | 低 |
| ~~PIM 完整化~~ | ~~admin_audit_log + 状态机 + Dashboard~~ | ✅ iter-29 完成 |
| ~~Q29-01~~ | ~~PIM 批量导入/导出 SPU（CSV）~~ | ✅ iter-30 完成 |
| ~~Q29-02~~ | ~~PIM 属性 & 属性模板~~ | ✅ iter-30 完成 |
| ~~Q29-03~~ | ~~PIM 图片库 & 复用~~ | ✅ iter-30 完成 |
| ~~Q29-04~~ | ~~PIM 列表内联库存+月销~~ | ✅ iter-31 完成 |
| ~~Q30-03~~ | ~~图片库引用计数 + 删除阻断~~ | ✅ iter-31 完成 |
| ~~Q30-04~~ | ~~ImagePicker 弹窗复用~~ | ✅ iter-31 完成 |
| Q30-01 | 属性 JSON 切反范式 spu_attributes 表（强约束 + 索引筛选） | 低 |
| Q30-02 | CSV 导入异步化（百万行 + 进度条 + 任务表） | 低 |
| Q31-01 | image_library.used_count 切维护字段（数据量 >10k SPU 后） | 低 |
| Q32-01 | WMS webhook 推送日志表 + retry 入死信（当前 silent log） | 中 |
| Q32-02 | 盘点调度加 cron 表达式（支持复杂频率，如每月最后工作日） | 低 |
| Q32-03 | wms_configs 支持更多 key（FIFO 优先级 / 上架阈值等）| 中 |
| Q33-01 | dead_letter admin UI 一键 replay（当前需运维侧手动） | 中 |
| Q33-02 | webhook 推送日志独立表（当前只统计 total_*，无逐条投递记录） | 低 |
| Q33-03 | 多 consumer 实例（webhook-consumer 现仅 1 实例，可横向扩展） | 低 |
| Q34-01 | 换货 v2 自动联动库存（approved 锁旧 SKU reserved；received_old reserved→available；sent_new available→deducted）| 中 |
| Q34-02 | 换货明细加"展开 SPU 选 SKU"下拉（当前用户需手填 new_sku_code）| 中 |
| Q34-03 | 换货 webhook 推送（同退款 refund.refunded 模式：exchange.completed）| 低 |
| Q35-01 | 店铺装修（自定义首页/Banner）| 中 |
| Q35-02 | 店铺评分体系（用户评店铺 + 平台排名）| 中 |
| Q35-03 | 商家自助提现（当前抽佣后只记账，提现 M3+）| 高 |
| Q35-04 | 跨店满减券（v2，当前 v1 仅店内券）| 低 |
| Q36-01 | categories/brands 加 store_id（店铺自定义类目）| 中 |
| Q36-02 | super_admin Products 列表加批量改 store_id（迁移历史数据）| 低 |
| ~~iter-36~~ | ~~PIM 多店化：spus/skus 加 store_id~~ | ✅ 完成（categories/brands 留 v2） |
| ~~iter-37~~ | ~~OMS 多店化 + 订单拆单（最危险一轮过）~~ | ✅ 完成 |
| ~~iter-38~~ | ~~WMS 多店化：warehouses 加 store_id + 商家仓 vs 自营仓~~ | ✅ 完成 |
| ~~iter-39~~ | ~~入驻流程 + 抽佣自动计算 + 店铺自管~~ | ✅ **BIZ-08 5 轮全部完成** |
| Q38-01 | 跨店调拨（平台代理模式）| 中 |
| Q38-02 | 商家仓上架审核流（自营 vs 商家走不同审核）| 中 |
| Q39-01 | 商家自助入驻（小程序"我的"→"申请开店"）| 中 |
| Q39-02 | 店铺装修（自定义首页/Banner）| 中 |
| Q39-03 | 商家自助提现 / 月度结算流程 | 高 |
| Q39-04 | 店铺评分体系 + 平台搜索结果排序 | 中 |
| Q40-01 | 小程序 banner.link_value 跳转真实 SKU/类目（当前 SPU 类型仅 toast 占位）| 高 |
| Q40-02 | Banner 按店铺定制（store_id 不为 NULL 时仅该店用户首页显示）| 中 |
| Q40-03 | 推荐位个性化（基于用户 RFM 推不同 SPU）| 中 |
| Q41-01 | 小程序 topic-detail 点商品跳真详情（当前仅 toast；需后端返默认 SKU）| 高 |
| Q41-02 | 营销日历真甘特图（横向时间轴 + 拖拽改时间段）| 中 |
| Q41-03 | 专题 link 集成 Banner（banner.link_type 加 topic 选项）| 中 |
| Q41-04 | 营销日历事件冲突预警（如 2 个首页 banner 同时段触发）| 中 |
| Q37-01 | 多店订单优惠券分摊算法（按店比例 / 单店全摊？）| 中 |
| Q37-02 | 真正激活 OMS_MULTI_STORE_SPLIT=true 灰度（待 store#2 真有用户下单时）| 中 |
| ~~iter-42 EFF-01~~ | ~~OMS 高级搜索（phone / user_id / sku 反查 / 金额段 / 日期段）~~ | ✅ 完成 |
| ~~iter-42 EFF-05~~ | ~~待办中心（聚合 6 类待办 + Vue 卡片）~~ | ✅ 完成 |
| ~~iter-42 EFF-08~~ | ~~死信 admin UI + 一键 replay（同 Q33-01）~~ | ✅ 完成（替代 Q33-01）|
| ~~iter-43 EFF-03~~ | ~~退款/换货金额/数量阈值 sales 一审 + super 二审~~ | ✅ 完成 |
| ~~iter-43 EFF-04~~ | ~~PIM editor 角色（CRUD 草稿允许，publish/offline 拒绝）~~ | ✅ 完成（v1：只做 PIM editor；OMS sales 按店细分留 v2）|
| ~~iter-44 EFF-02~~ | ~~⌘K / Ctrl+K 全局快速搜索（订单/退款/换货/SPU 统一）~~ | ✅ 完成 |
| ~~iter-45 EFF-07~~ | ~~WMS PDA H5 移动端拣货 + 入库扫码~~ | ✅ 完成 — **三、EFF 系列 5/7 收口**（剩 EFF-06 低优；可推 BI）|
| ~~iter-46 BI-01~~ | ~~用户 RFM 分层 8 分群~~ | ✅ 完成（绝对阈值 v1；分位法 Q46-01 留）|
| Q46-01 | RFM 分位法 mode 切换（大数据集场景）| 低 |
| Q46-02 | 分群行为推荐自动联动（如选中"流失风险" → 一键给所有人发挽留券）| 中 |
| Q46-03 | RFM 历史趋势（按月对比同分群人数变化）| 低 |
| Q46-04 | 客户级 RFM 卡片（点击 user_id 看历史订单 + 单 SKU 偏好）| 中 |
| ~~iter-47 BI-02~~ | ~~5 阶段订单漏斗 + biggest_drop 自动算~~ | ✅ 完成（distinct user 模型 v1；cohort 严格版 Q47-01）|
| Q47-01 | Funnel cohort 模型（同一用户穿过 5 阶段追踪，需 user-stage 临时表）| 中 |
| Q47-02 | Funnel 阶段时间序列（每日转化率折线，看趋势）| 中 |
| Q47-03 | Funnel 按 SPU/类目 维度切片（哪个品类转化最差）| 中 |
| Q47-04 | Funnel 流失原因归因（结合 cart_abandon / failed_payment 事件）| 低 |
| ~~iter-48 BI-03~~ | ~~SKU 5 阶段生命周期（新品/热销/一般/滞销/淘汰）~~ | ✅ 完成 |
| Q48-01 | SKU 生命周期联动运营动作（"滞销"一键发清仓券；"淘汰"一键下架）| 中 |
| Q48-02 | 生命周期趋势（按月看 SKU 在阶段间迁移）| 低 |
| Q48-03 | 阶段判定规则在管理后台可配（当前硬编码阈值 10/5/30/90）| 中 |
| Q48-04 | 项目内 created_at vs create_time 时间字段命名统一（去除混用，避免再踩）| 低 |
| ~~iter-49 BI-04~~ | ~~异常预警面板（4 类聚合 + 冷启动保护 + 30s auto + 跳关联页）~~ | ✅ 完成 — **整个路线图收口 🎉** |
| Q49-01 | 预警阈值在管理后台可配（当前硬编码 ratio 1.5/2.0/threshold 10）| 中 |
| Q49-02 | 预警历史时序（按 5min 粒度回看 24h 内 ratio 变化）| 低 |
| Q49-03 | 预警 webhook 外推（critical 触发时推钉钉/飞书）| 中 |
| Q49-04 | 加更多预警类（如：刷单异常 / 单 SKU 销量突变 / 优惠券异常核销）| 低 |
| ~~Q35-03 / Q39-03~~ | ~~商家自助提现（申请 + 审批 + 打款 + 余额）~~ | ✅ iter-50 完成 — **BIZ-08 真正最后一公里收口** |
| Q50-01 | 提现 webhook 外推（approved/paid 时推商家接口）| 中 |
| Q50-02 | 提现金额下限 / 上限可配（当前无限制）| 低 |
| Q50-03 | 提现申请频率限制（如每周最多 1 单 / 24h 内只能 1 笔 pending）| 中 |
| Q50-04 | 月度结算单（按月汇总打款明细 + 发票/账单导出）| 中 |
| Q50-05 | 真实银行/支付宝/微信打款 API 集成（当前 mark 是人工模式）| 高 |
| ~~Q40-01~~ | ~~小程序 banner.link_value=spu 时跳真实详情~~ | ✅ iter-51 |
| ~~Q41-01~~ | ~~小程序 topic-detail 点商品跳真详情~~ | ✅ iter-51 |
| ~~Q43-01~~ | ~~退款/换货阈值改 KV 配置~~ | ✅ iter-52 |
| ~~Q48-03~~ | ~~SKU 阶段判定规则后台可配~~ | ✅ iter-52 |
| ~~Q49-01~~ | ~~预警阈值后台可配~~ | ✅ iter-52 |
| ~~Q50-02~~ | ~~提现金额上下限可配~~ | ✅ iter-52 |
| ~~Q46-02~~ | ~~RFM 分群一键发券联动~~ | ✅ iter-53 |
| ~~Q48-01~~ | ~~SKU 淘汰一键下架联动~~ | ✅ iter-53 |
| ~~Q32-01~~ | ~~WMS webhook 推送日志表~~ | ✅ iter-54 |
| ~~Q49-03~~ | ~~预警 critical webhook 外推~~ | ✅ iter-54 |
| ~~Q50-01~~ | ~~提现 webhook 外推~~ | ✅ iter-54 |
| ~~Q50-03~~ | ~~提现申请频率限制~~ | ✅ iter-54 |
| ~~Q44-05~~ | ~~全后端 admin endpoint editor 横切审视~~ | ✅ iter-55 |
| ~~Q43-03~~ | ~~OMS sales_ops 按店细分~~ | ✅ iter-55 |
| ~~Q50-04~~ | ~~月度结算单~~ | ✅ iter-56（含 net/paid/remaining 三关键值 + paid_withdrawals 列表）|
| ~~Q39-04~~ | ~~店铺评分体系~~ | ✅ iter-56（简化版：rating_avg + review_count + 手动 refresh）|
| ~~Q34-02~~ | ~~换货明细 SKU 下拉（后端 endpoint）~~ | ✅ iter-57（小程序 picker 留 v1.5）|
| ~~Q34-03~~ | ~~换货 webhook 推送~~ | ✅ iter-57 |
| ~~M3-21~~ | ~~Token blacklist（改密失效旧 token）~~ | ✅ iter-58 |
| ~~Q38-02~~ | ~~商家仓上架审核流~~ | ✅ iter-58+59 |
| Q45-01 | PDA 扫码加摄像头条码扫（getUserMedia + jsQR）当前仅文本/PDA 枪扫 | 中 |
| Q45-02 | PDA 入库扫品 + 数量分步（当前一键完成）| 中 |
| Q45-03 | PDA 离线缓存 + 网络断开重发 | 低 |
| Q45-04 | PDA 任务卡片加产品图（来自 wms_products）| 低 |
| Q44-01 | iter-42 EFF-01 高级搜索 phone JSON LIKE 用同 fragile 模式，跟进改宽松 LIKE | 低 |
| Q44-02 | ⌘K 搜结果点击 SPU 时带筛选参数跳商品列表（当前到列表无定位）| 低 |
| Q44-03 | ⌘K 搜历史记录持久化（localStorage 存最近 10 个）| 低 |
| Q44-04 | ⌘K 加快捷键提示 ↑↓ 上下选 + Enter 确认 | 低 |
| Q44-05 | 全后端 admin endpoint editor 横切角色审视（OMS / WMS / 营销 / 系统 各处）| 中 |
| Q42-01 | 待办中心加最近 24h 增量趋势 + 颜色告警阈值（如待付款 >100 高亮） | 中 |
| Q42-02 | 高级搜索条件保存为"我的视图"（用户级 favorites） | 低 |
| Q42-03 | dead_letter 自动 replay 策略（按 stream 配自动 retry 次数）| 中 |
| Q43-01 | 审批阈值改后台 KV 配置（当前 ENV，改后需重启容器）| 中 |
| Q43-02 | 二审通过加备注字段（super_admin 输入二审意见）| 低 |
| Q43-03 | OMS sales_ops 按店细分（仅看自己负责的店；当前仍 null 跨店）| 中 |
| Q43-04 | editor 角色 OMS/WMS 隔离（当前仅 PIM 测试通过；进入 OMS 需补 StoreContext 白名单 + 路由角色）| 低 |
| EFF-02 | 全局快捷操作菜单（快捷键 +"⌘K"搜任意单号跳详情）| 低 |
| EFF-06 | 操作日志可"撤销"（如订单强制取消可一键反向）| 低 |
| EFF-07 | WMS PDA H5（移动端拣货扫码 + 入库扫码）| 中 |
| BI-01 | 用户 RFM 分层（最近购买 / 频次 / 金额）| 中 |
| BI-02 | 订单漏斗（加购→下单→支付→收货→评价）| 中 |
| BI-03 | SKU 生命周期分析（新品/热销/滞销/淘汰）| 中 |
| BI-04 | 异常预警面板（订单激增 / 库存掉底 / 退款率突升）| 中 |

## 九、归档时间
2026-06-04（iter-51 收口；**小程序内容运营真链路通**：Q40-01 + Q41-01 高优断链补齐）

## 十、本归档使用的 skill
- `karpathy-guidelines`（不引入用不到的抽象 / 不引入新框架 / 沉淀复盘材料）
