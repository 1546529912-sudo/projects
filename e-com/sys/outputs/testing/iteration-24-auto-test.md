# iteration-24-auto-test.md · 主控 curl 测试

> **结果（2026-06-02）**：12/12 全过 ✅
> 测试范围：WMS inventory_log 写入 / 调拨同步 OMS（事件）/ 盘点同步 OMS / 拣货任务独立 API / 对账工具 / 跨库读 / RBAC
> 边界遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §可做（自动）。

## 前置
- iter-24 migrations 跑过：inventory_log + inventory_reconcile_log + picking_tasks.operator/assigned_at
- WMS config 加 oms 副连接
- 重启 wms-backend + oms-backend（consumer + handler 改动）

## 测试用例

### P0-1 / P0-2: WMS inventory_log + 调拨同步

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | 创建调拨 + ship + receive | WMS inventory_log 写入 3 条（lock + transfer_out + transfer_in），各自 before/after qty + locked 正确 | 3 条全对 | ✅ |
| T2 | 等 3s → OMS inventory_log 含 transfer 审计条目 | related_order = transfer_no, available 不变 0 delta | `change_type=transfer, change_qty=0, before=156 after=156, related_order=TR202606020931253359, operator=wms` | ✅ |

### P0-3: 盘点同步

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T3 | 盘点 actual=system+5 → complete → 等 3s | WMS inventory.quantity +5；WMS log stock_take_in；OMS available +5；OMS log change_type=stock_take 含 delta=5 + related_order=take_no | OMS 156→161；OMS log change_qty=5；WMS log delta=5 | ✅ |

### P1-2: 对账工具

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T4 | 触发全量对账 | 返 reconcile_no + total_skus + diff_count + details[]；标记 wms_avail vs oms_avail 差异 | 7 SKU 中 5 项 diff（历史 iter-22/23 漂移）| ✅ |
| T12 | 对账 confirm | 状态 pending→confirmed + confirmed_at | 正确 | ✅ |

### P1-1: 拣货任务独立 API

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T5 | GET /picking-task/list | 含 outbound_no/sku/location/picked_qty/expected/status/operator | 13 条返回 | ✅ |
| T6 | POST /:id/assign warehouse | status pending→assigned + operator + assigned_at | 正确 | ✅ |
| T7 | POST /:id/scan +1（expected=1）| picked_qty +1 → 自动 picked + picked_at | `status=picked picked=1/1` | ✅ |
| T8 | scan 超量 | 拒绝 | `任务已结束` | ✅ |
| T9 | complete idempotent | 已 picked 重复 complete 不报错 | 正确 | ✅ |

### 库存日志查询 + RBAC

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T10 | by change_type=transfer_out | 只 1 条对应 T1 调拨 | `#2 SPU001-001 delta=-2 ref=TR...` | ✅ |
| T11 | sales_ops 访问 picking-task | 403 | `权限不足，需要角色: warehouse/super_admin` | ✅ |

## 真实输出片段（T3 盘点同步闭环）
```
before OMS available: SPU001-001 → 156
WMS take_no=ST202606020932192273, item system=98, actual=103 (delta +5)
after OMS available: SPU001-001 → 161
OMS log: stock_take, change_qty=5, before=156 after=161, related_order=ST20...2273, op=wms
WMS log: stock_take_in, SPU001-001, delta=5, qty:98→103
```

## 本轮开发期 bug
- 无（12 项一次跑通）
- 历史 iter-22/23 调拨/盘点没同步留下的 5 SKU 差异，对账工具如实展示（正确行为，不应自动修复）

## 需用户手动验证
- 详见 [iteration-24-manual-test.md](iteration-24-manual-test.md)
