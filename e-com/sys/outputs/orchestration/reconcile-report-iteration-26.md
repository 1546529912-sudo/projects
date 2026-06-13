# reconcile-report-iteration-26.md · OMS 完整化（跟 WMS 对称）

## 【当前焦点】
P0 三件套：
- P0-1: OMS 推 3 个新事件（cancelled / refund.approved / refund.refunded）+ WMS 端 audit handler
- P0-2: OMS 视角的库存对账（OMS 加 wms 副连接，跟 WMS iter-24 P1-2 对偶）
- P0-3: 财务结算单（settlement_orders 表 + order confirm/refund refunded 落单 + Vue 财务页 + CSV）

## 一、文件清单（详见 [runbook §一](iteration-26-runbook.md#一文件清单共-20-文件5-wave)）
~23 个：3 migrations + OMS 2 service 改 + 3 OMS 新文件 + WMS 3 handler 新 + 1 command + Vue 2 新页 + apis / router / menu。

## 二、关键设计决策（详 [runbook §三](iteration-26-runbook.md#三关键设计决策)）

| 主题 | 决策 |
|---|---|
| 事件新增 | 3 个独立 stream（区别 iter-14/24 字段扩展模式）|
| WMS 接收 | 仅 audit log（被动感知链路先建，业务联动按需追加）|
| 对账双侧 | OMS+WMS 完全对称（双方独立触发）|
| 财务触发 | order confirm + refund markRefunded 自动落 settlement |
| 财务金额 | bigint 分，refund 用负数 |

## 三、避坑（详 [runbook §五](iteration-26-runbook.md#五避坑)）
7 项：consumer group 命名 / 财务双写 / 重复触发 / 跨库慢 / 推送失败 / log 体量 / 新增 stream 部署一致。

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-9 | EventBus 模式，本 iter 新增 3 stream |
| iter-14 | 字段扩展模式（refund_no），本 iter **反例**：业务事件新增 stream 而非扩展 |
| iter-24 | WMS 完整化（事件接收 + 对账 + log），本 iter 是其**对偶**（OMS 推 + OMS 对账）|
| **iter-26** | **OMS 完整化（跟 WMS 对称）** |

## 五、剩余非阻塞（M3+）
详 [runbook §七](iteration-26-runbook.md#七剩余非阻塞m3)：Q26-01 ~ Q26-05。

## 六、待用户运行验证
- auto-test 我跑（curl + DB 验证）→ `outputs/testing/iteration-26-auto-test.md`
- manual-test 用户跑（Vue UI）→ `outputs/testing/iteration-26-manual-test.md`

## 七、对账结论
✅ runbook 定稿，进入 7 Wave 落地。

## 八、对账时间
2026-06-02

## 九、本对账使用的 skill
- `karpathy-guidelines`（业务事件不复用旧 stream 强行扩字段 / WMS 端 audit 不做业务联动 / 财务表保持简洁不加多币种）
- `.agents/testing/SKILL.md`（auto + manual 拆分硬约束延续）
