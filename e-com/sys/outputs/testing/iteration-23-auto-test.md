# iteration-23-auto-test.md · 主控 curl 测试

> **结果（2026-06-02）**：11/11 全过 ✅
> 测试范围：多 SKU 调拨创建 / list 含 item_count / detail head+items / 多行同时 ship/receive / 验证错误带行号 / ship 失败全单 rollback / cancel 全行释放 / legacy 单 SKU 兼容
> 边界遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §可做（自动）。

## 前置
- iter-23 migration 跑过（transfer_items 新建 + transfers 头改 nullable）
- 现有 WMS：iter-22 留下 4 个 legacy 单 SKU 调拨单（item_count=0）

## 测试用例

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | GET /transfer/list | 每行带 item_count + is_legacy_single 标记 | 新单 items=2 legacy=False；老单 items=0 legacy=True | ✅ |
| T2 | GET /transfer/:no | 响应 {head, items[]}；head 含 item_count | head + 2 行 items 全字段返回 | ✅ |
| T3 | POST 3 SKU + ship 全单 | 3 行 from 库位同时 locked++ | A-01-01-01 1→4 (+3) / A-01-01-02 1→3 (+2) / A-01-02-01 1→2 (+1) | ✅ |
| T4 | receive 3 SKU | from quantity-- + locked-- + to quantity++（含新建行） | 全 3 行验证：103→100、90→88、99→98；STAGING-01 SPU001-001 5→8 + 新建 SPU001-002 2 + SPU002-001 1 | ✅ |
| T5 | items=[] 拒绝 | 400 items 不能为空 | 正确 | ✅ |
| T6 | 行 2 from=to | 400 带行号 | `行 2 源库位与目标库位不能相同` | ✅ |
| T7 | 行 1 qty=0 | 400 带行号 | `行 1 qty 必须 > 0` | ✅ |
| T8 | 行 1 目标库位不存在 | 400 带行号 + 库位名 | `行 1 目标库位不存在: FAKE-LOC` | ✅ |
| T9 | ship 中行 2 不足 → 全单 rollback | 行 1 已 lock 应回退 | 错误 + locked 没变（1→1）证明 rollback | ✅ |
| T10 | legacy 单 SKU 行通过 service 读 | head.sku_code 还在 + items=[] | `inline sku=SPU001-001 qty=10, items array=[]` | ✅ |
| T11 | cancel in_transit 多 SKU | 全行 locked 释放 | A-01-01-01: 3→1 / A-01-02-01: 4→1 | ✅ |

## 本轮开发期 bug
- 无（11 项一次跑通；多 SKU rollback / legacy 兼容 / 行号错误消息全部一遍过）

## 真实输出片段（T4 receive 多 SKU）
```
before receive:
A-01-01-01 SPU001-001 INIT  103 / 4
STAGING-01 SPU001-001 INIT  5 / 0
A-01-01-02 SPU001-002 INIT  90 / 3
A-01-02-01 SPU002-001 INIT  99 / 2

after receive:
A-01-01-01 SPU001-001 INIT  100 / 1   ← -3 + locked 释放
A-01-01-02 SPU001-002 INIT  88 / 1    ← -2 + locked 释放
A-01-02-01 SPU002-001 INIT  98 / 1    ← -1 + locked 释放
STAGING-01 SPU001-001 INIT  8 / 0     ← +3（已有行）
STAGING-01 SPU001-002 INIT  2 / 0     ← +2（新建）
STAGING-01 SPU002-001 INIT  1 / 0     ← +1（新建）
```

## 需用户手动验证
- 详见 [iteration-23-manual-test.md](iteration-23-manual-test.md)
