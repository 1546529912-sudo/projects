# 电商商城 v1 · 多 Agent 项目

## 【当前焦点】
**iter-22~72 已交付（2026-06-05）**：路线图全部收口 ✅ + 提现 ✅ + 小程序跳转 ✅ + **批次一~五 全部中/低优清完**（iter-52~59 中优 / iter-60~65 中低优 / iter-66 时间统一 / iter-67~71 低优 39 项 / iter-72 真中优 4 项收尾）— 51 轮 ~475 文件。iter-22/23 已用户验证；iter-24~72 auto 全过，待 manual-test ~41 份。

📦 **72 轮迭代全景归档**：[outputs/PROJECT_SUMMARY.md](outputs/PROJECT_SUMMARY.md)
🔌 **事件总线架构**：[outputs/architecture/event-bus.md](outputs/architecture/event-bus.md)
📘 **Webhook 接入指南**：[docs/webhook-接入指南.md](docs/webhook-接入指南.md)
📐 **BIZ-08 多商家架构规划**（iter-35~39 路线图）：[docs/biz-08-多商家架构规划.md](docs/biz-08-多商家架构规划.md)
🧪 **测试报告**（iter-17 起强制双产物，已跑 43 轮）：[outputs/testing/](outputs/testing/)

**当前能力清单**
- 商城（小程序 **20 页**）：登录 / 加购 / 下单（多券叠加 + 地址簿）/ 模拟支付 / 订单 / 申请退款 / 我的退款 / **申请换货（iter-34）/ 我的换货（iter-34）** / 领券中心 / 我的优惠券 / 地址簿 / 我的收藏 / 评价提交 / 我的评价 / 详情页含心标 + 评价区
- OMS：订单状态机 + 库存四态 + 退款 6 态 + **换货 7 态（iter-34）** + admin_users + admin_audit_log + 死信表 + 8 后台进程 + 优惠券 + 自动发券 + 评价审核 + Dashboard 8 维度 + inventory_log + 财务结算单 + WMS 对账 + Webhook 异步推送（iter-33 fireAsync ~1ms + HMAC + 接入指南）
- WMS（iter-22~25 完整化 + **iter-32 自动化**）：仓库/库位 CRUD + 入库（autoComplete 用推荐 Top1）/ 出库（FIFO 优先）+ 实物库存 + wms_products + 拣货任务独立 API + 实时盘点 + 多 SKU 批量调拨 + 上架推荐 Top3（**iter-32 权重可配**）+ inventory_log 8 种 change_type + WMS↔OMS 对账 + WMS Dashboard + 低库存预警（**iter-32 webhook 外推 HMAC-SHA256 + 冷却 + supervisord loop**）+ **盘点定时调度（daily/weekly/monthly + supervisord 自动建单）** + **WMS 配置 KV（推荐权重可在线调整）**
- PIM（**iter-29 完整化 + iter-30 增强 + iter-31 精修**）：SPU/SKU/Brand/Category CRUD + 图片上传 + 推送 pim.sku.changed + spu/batch 批量接口 + pim_admin_audit_log（14 处写操作自动审计）+ spu_status_log + PIM Dashboard（6 KPI + 跨库 OMS/WMS）+ SPU CSV 批量导出/导入 + 属性模板 + 图片库 + **SPU 列表内联跨库聚合可用库存+近30天销量（iter-31，3 次查询无 N+1）** + **ImagePicker 弹框（主图既可上传又可从图片库选 + 多选去重）** + **图片库 used_count 实时算 + delete 引用阻断**
- 后台 Vue：5 大模块 CRUD + 系统管理 + 营销 3 项 + PIM 7 页（**总览 / 商品 / 类目 / 品牌 / 属性模板 iter-30 / 图片库 iter-30 / 操作日志**）+ 总览 8 KPI + 6 ECharts + WMS 总览 6 KPI + 3 ECharts + PIM 总览 6 KPI + 3 ECharts + 真实 JWT + RBAC
- 事件总线：Redis Stream **7 流**（4 老 + iter-26 新增 `oms.order.cancelled` / `oms.refund.approved` / `oms.refund.refunded`）+ 死信兜底 + supervisord 定时 `refund-close-overdue`
- 跨库副连接：shop↔oms / wms↔oms + oms→shop / oms→wms / PIM→OMS+WMS / **iter-34 OMS→PIM（换货拉新 SKU 快照）** — **6 个方向**全靠副连接 0 RPC
- 边界防护：超卖 / 并发 / 幂等 / 状态机非法 / JWT / 上游不可达 / 券并发超领 / 评价唯一性 / 地址默认唯一性 / 跨库读 try-catch 兜底 / 调拨多行同时 ship 失败全单 rollback / 盘点 tx 内自动调差 / 多券叠加同类 DB UNIQUE 兜底 / 新人券 per_user_limit 双校验 / **audit 写入失败不阻塞业务（try/catch + error_log）** 全过

**RBAC（iter-16/17/19/20/26/43）**：
| 账号 | 密码 | 角色 | 可见菜单 / API |
|---|---|---|---|
| admin | admin123 | super_admin | 全菜单 + 系统管理 + 营销 + WMS / 全 API（含 **WMS 对账独占** iter-26 + **退款/换货二审独占** iter-43）|
| warehouse | wh123 | warehouse | WMS 12 项 / OMS 读 |
| sales | sales123 | sales_ops | 总览 + PIM + OMS + 营销 3 项 + **财务结算单（iter-26）**；退款 ≥¥1000 / 换货 sum(qty)≥3 自动转 super 二审（iter-43）|
| editor | editor123 | editor（iter-43）| 仅 PIM CRUD 草稿；**publish/offline 路由层 403** |
> URL 直访被后端 middleware 拦截 403（不仅是 UI 菜单隐藏）

**下一步候选**（按用户规划顺序推进）：
1. ~~BIZ-07 换货流程~~ ✅ iter-34 完成
2. ~~BIZ-08 多店铺 / 多商家入驻（B2B2C）~~ ✅ iter-35~39 完成
3. ~~BIZ-09 内容运营（Banner / 推荐位 / 专题 / 营销日历）~~ ✅ iter-40~41 完成
4. ~~**运营效率（EFF 系列）**~~ ✅ iter-42~45 全交付
5. ~~**数据洞察（BI 系列）**~~ ✅ iter-46~49 全交付

**🎉 用户规划 1234 全部收口 + Q35-03/Q39-03 高优 Q 回填完成**：
- ~~回填高优 **Q35-03/Q39-03 商家自助提现**~~ ✅ iter-50 完成
- **Q40-01 / Q41-01 小程序跳转修复**（banner / topic 链接真实 SKU）
- **M3-02 真实微信支付 v3 + SMS** / M3-08 性能压测
- **Q50-05 真实银行/支付宝/微信打款 API 集成**（当前商家提现是人工标记）
- **跑积压 20 个 manual-test**：iter-24~34 + iter-42~50

## 【必须遵守】
- 业务范围 & 技术栈固化：见 [项目初始化-prompt-v2.md](../项目初始化-prompt-v2.md) §零
- PRD 已就绪，**禁止重新创作**，所有 Agent 基于 [../商城页面/商城页面-PRD.md](../商城页面/商城页面-PRD.md) / [../PIM/PIM-PRD.md](../PIM/PIM-PRD.md) / [../OMS/OMS-PRD.md](../OMS/OMS-PRD.md) / [../wms/WMS_PRD_v2.md](../wms/WMS_PRD_v2.md) / [../电商系统整体架构.md](../电商系统整体架构.md) 工作
- 只有主控 Agent 可回写 [progress.md](progress.md)
- 任务"完成"必须有产物清单 + 真实文件存在 + 测试结果

## 角色导航
- 主控：[.agents/orchestrator/SKILL.md](.agents/orchestrator/SKILL.md)
- 产品：[.agents/product/SKILL.md](.agents/product/SKILL.md)
- 设计：[.agents/design/SKILL.md](.agents/design/SKILL.md)
- 架构：[.agents/architecture/SKILL.md](.agents/architecture/SKILL.md)
- 开发：[.agents/development/SKILL.md](.agents/development/SKILL.md)
- 测试：[.agents/testing/SKILL.md](.agents/testing/SKILL.md)

## 关键文件索引
- 调度规则：[AGENTS.md](AGENTS.md)
- 防错机制：[HARNESS.md](HARNESS.md)
- 返工升级：[EXECUTION_POLICY.md](EXECUTION_POLICY.md)
- 任务进度：[progress.md](progress.md)
- Phase -1 产物：[outputs/product/](outputs/product/)
- 主控对账：[outputs/orchestration/](outputs/orchestration/)

## 已装 skill 速览（PM 相关）
`prd-development` `user-story` `user-story-splitting` `jobs-to-be-done` `problem-statement` `epic-breakdown-advisor` `epic-hypothesis` `user-story-mapping` `prioritization-advisor` `web-design-guidelines` `karpathy-guidelines`

## 当前阻塞
（无）

## 已确认的项目默认值（2026-05-24）
端口：shop=8001 / pim=8002 / oms=8003 / wms=8004 / vue=5173 / mysql=3306 / redis=6379 ｜ MySQL：root/root ｜ 品牌色：#FF385C / #222 / #717171 / #DDD ｜ API 前缀：/api/v1/ ｜ 架构：4 个独立 ThinkPHP 工程 ｜ 跨系统：HTTP + Redis Stream ｜ 小程序/支付：占位符 ｜ 登录：手机号+验证码 ｜ 图片：本地存储 ｜ 后台角色：超级管理员单角色 ｜ 库存安全垫：0（保留配置）｜ MVP：按 prompt 附录 A ｜ 幂等：Idempotency-Key header
