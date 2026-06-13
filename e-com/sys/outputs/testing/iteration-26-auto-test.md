# iteration-26-auto-test.md · 主控 curl 测试

> **结果（2026-06-02）**：14/14 全过 ✅
> 测试范围：OMS 推 3 个新事件 + WMS consumer 接收 + WMS audit log 写入 + OMS 视角对账 + 财务结算单（落单/列表/入账/导出）+ RBAC + 幂等
> 边界遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §可做（自动）。

## 前置
- 3 migrations 跑过：OMS reconcile log / OMS settlement_orders / WMS oms_event_audit_log
- WMS supervisord 加载 3 个新 consumer（consume-oms-cancel / consume-oms-refund-approved / consume-oms-refund-refunded）
- OMS config 加 wms 副连接（与 iter-24 WMS 加 oms 副连接对偶）

## 测试用例

### P0-1: OMS 推 3 事件 → WMS audit log 全链路

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | POST /order/:no/cancel | order 状态 cancelled + 推 oms.order.cancelled | `status=cancelled` | ✅ |
| T2 | sleep 3s → WMS audit log | event_type=oms.order.cancelled + ref_no=order_no | `event_type=oms.order.cancelled ref_no=SO202605260911162166` | ✅ |
| T3 | POST /admin/refund/:rf/approve（refund_only）| 状态 refunded（自动推进）+ 推 2 事件 | `status=refunded` | ✅ |
| T4 | sleep 4s → WMS audit log | 2 条：oms.refund.approved + oms.refund.refunded | 都收到 | ✅ |

### P0-3: 财务结算单

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T5 | refund refunded → settlement | type=refund amount=负数 | `type=refund amount=-100000 status=unsettled` | ✅ |
| T6 | order confirm → settlement | type=order amount=正数 | `type=order amount=700900 status=unsettled` | ✅ |
| T7 | settlement/list 含 net 计算 | net_amount_yuan = 7009 - 1000 = 6009 | `net=6009.00` | ✅ |
| T8 | settlement/:no/settle | status pending→settled + settled_at | `settled, settled_at=2026-06-02 14:53:30` | ✅ |
| T9 | settlement/export CSV | UTF-8 BOM + header 12 列 + 数据行 | header OK 数据 3 行 | ✅ |
| T13 | 同 order 重复 confirm 不重复落单 | UNIQUE(type, ref_no) 兜底 | count=1 | ✅ |
| T14 | 同 RF 重复事件不重复 audit | handler 幂等 | each event type count=1 | ✅ |

### P0-2: OMS 视角对账 + RBAC

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T10 | super_admin POST /admin/reconcile | 跨库读 wms_db.inventory 成功 | `total_skus=7 diff_count=5`（与 WMS 视角对偶，diff 符号相反）| ✅ |
| T11 | sales_ops 调对账 | 403 super_admin 独占 | `权限不足，需要角色: super_admin` | ✅ |
| T12 | warehouse 调 settlement | 403 财务给 super_admin + sales_ops | `权限不足，需要角色: super_admin/sales_ops` | ✅ |

## 真实输出片段

**T4 全链路（OMS→Redis Stream→WMS consumer→audit log）**：
```
oms.refund.approved   RF202606021450374067   2026-06-02 14:52:37
oms.refund.refunded   RF202606021450374067   2026-06-02 14:52:37
```

**T5 settlement_orders 反映 refund 负数 + 订单正数（net=+6009）**：
```
ST202606021452599695 type=order  amount=700900 status=unsettled
ST202606021452379427 type=refund amount=-100000 status=unsettled
```

**T9 CSV export header**：
```
﻿结算单号,类型,关联单号,用户ID,金额(元),商品金额(元),运费(元),优惠(元),状态,备注,创建时间,入账时间
```

## 本轮开发期 bug
- 无（14 项一次跑通；3 新事件流 + 3 新 WMS consumer + OMS 副连接 + 财务双触发点 全部一遍过）

## 需用户手动验证
- 详见 [iteration-26-manual-test.md](iteration-26-manual-test.md)
