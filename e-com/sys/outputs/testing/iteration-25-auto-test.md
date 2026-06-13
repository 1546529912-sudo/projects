# iteration-25-auto-test.md · 主控 curl 测试

> **结果（2026-06-02）**：10/10 全过 ✅
> 测试范围：WMS Dashboard 全维度 / 低库存预警 CRUD / 入库自动用上架推荐 Top1 / 入库走 InventoryService 写日志 / FIFO 出库分配（INIT 优先）/ RBAC
> 边界遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §可做（自动）。

## 前置
- iter-25 migration 跑过：stock_alert_rules
- 重启 wms-backend

## 测试用例

### WMS Dashboard

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | GET /wms-stats?days=7 | 含 6 个 key：kpi / warehouse_utilization / inbound_series / outbound_series / picking_efficiency / top_skus | 全部 missing=NONE，KPI 6 子键 / wh 数=1 / 序列各 7 / top_skus 7 | ✅ |
| T2 | GET /wms-stats?days=30 | 序列长度 30 | inbound/outbound 各 30 | ✅ |
| T3 | sales_ops 调 wms-stats | 403 | `权限不足，需要角色: warehouse/super_admin` | ✅ |

### 低库存预警

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T4 | POST rules SPU001-001 阈值 200 | 成功创建 enabled=1 | `threshold=200 enabled=1` | ✅ |
| T5 | GET /list（当前 avail 172 < 200） | 含 SPU001-001 告警 + gap=28 | 1 告警 | ✅ |
| T6 | UPSERT 同 SKU 阈值改 100（< 172）| 阈值更新 + 告警消失 | `threshold=100, 告警数=0` | ✅ |
| T7 | DELETE rules/:sku | rules 列表为空 | rule count=0 | ✅ |

### 入库整合上架推荐 + 走 InventoryService

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T8 | 创建入库单（不指定 location）→ autoComplete | location_code = recommend Top1（A-01-01-01 含聚集+黄金），**不再硬塞 staging** | `location_code=A-01-01-01, shelved_qty=3` | ✅ |
| T9 | 看入库 inventory_log | 新增 1 条 change_type=inbound, ref_no=IB...（iter-24 P0-1 联动） | `inbound SPU001-001@A-01-01-01 delta=3 ref=IB202606021240333260` | ✅ |

### FIFO 出库分配

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T10 | findAvailable('SPU001-001', 1) | INIT（种子）优先（CASE WHEN）→ 同 INIT 内 locked 最少的 STAGING-01 | `location=STAGING-01, batch=INIT, available=10` | ✅ |

## 真实输出片段

**T8 入库推荐集成**：之前默认填 STAGING-01；iter-25 后调 LocationRecommendService.recommend Top1 = A-01-01-01（score 80：已有 99 件聚集 + 黄金库位 + 容量充足）

**T9 日志联动**：autoComplete 走 InventoryService.inbound() → WmsInventoryLogService.write → inventory_log 写入 1 条

**T10 FIFO**：ORDER BY CASE WHEN batch_no='INIT' THEN 0 ELSE 1, batch_no ASC, locked_quantity ASC

## 本轮开发期 bug
- 无（10 项一次跑通；含一个 batch_no FIFO 排序细节修正：INIT 按 ASCII 排在 BATCH 后面，需要 CASE WHEN 强制前置，已修）

## 需用户手动验证
- 详见 [iteration-25-manual-test.md](iteration-25-manual-test.md)
