# reconcile-report-iteration-28.md · OMS 增强四件套（A）

## 【当前焦点】
四件套（之前 OMS audit P1）：
1. 订单完成 webhook 推送（被动感知能力对外）
2. OMS Dashboard 加财务维度（用 settlement 数据）
3. Refund Model 类封装（裸 Db::name → ORM）
4. 订单导出增强（format + 异步占位）

## 一、文件清单（详见 [runbook §一](iteration-28-runbook.md#一文件清单共-16-文件5-wave)）
~18 个：1 migration + WebhookService + Webhook controller + Dashboard 后端改 + Vue Dashboard 改 + 2 Model + RefundService 部分改 + OrderExport + Vue Webhooks + 文档。

## 二、关键设计决策（详 [runbook §三](iteration-28-runbook.md#三关键设计决策)）

| 主题 | 决策 |
|---|---|
| webhook 同步 | 5s timeout + 3 retry，规模大切异步留 M3+ |
| 签名 | HMAC-SHA256 |
| Refund Model 渐进 | 仅 list/detail/markRefunded 试用，其他保留 |
| xlsx 不引入依赖 | csv 保留默认；xlsx 留 M3+ |
| RBAC | webhook super 独占 / 财务 sales+super |

## 三、避坑（详 [runbook §五](iteration-28-runbook.md#五避坑)）
8 项：同步阻塞 / events 不一致 / 签名密钥 / 数据慢 / Model 双写 / 字段一致 / xlsx 依赖 / 异步占位。

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-9 | EventBus 模式，本 iter webhook 不复用 stream（外部 URL） |
| iter-21 | Dashboard 模式，本 iter 扩 4 字段 |
| iter-26 | settlement_orders 表，本 iter Dashboard 用其数据 |
| **iter-28** | **OMS 增强四件套** |

## 五、剩余非阻塞（M3+）
详 [runbook §七](iteration-28-runbook.md#七剩余非阻塞m3)：Q28-01 ~ Q28-05。

## 六、待用户运行验证
- auto-test 我跑（curl）→ `outputs/testing/iteration-28-auto-test.md`
- manual-test 用户跑（Vue UI）→ `outputs/testing/iteration-28-manual-test.md`

## 七、对账结论
✅ runbook 定稿，进入 5 Wave 落地。本 iter 谨慎避坑：Refund Model 不全替换 / xlsx 不引入依赖 / 异步导出仅占位。

## 八、对账时间
2026-06-02

## 九、本对账使用的 skill
- `karpathy-guidelines`（Model 渐进迁移 / 不引入 PhpSpreadsheet / 异步占位不接 supervisord）
- `.agents/testing/SKILL.md`（auto + manual 拆分硬约束延续）
