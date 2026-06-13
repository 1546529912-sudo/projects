# iteration-22-auto-test.md · 主控 curl 测试

> **结果（2026-06-01）**：17/17 全过 ✅
> 测试范围：盘点（创建/起盘/录入/完成自动调差/取消）+ 调拨（创建/起运/接收/取消释放）+ 上架推荐（聚集/黄金/同区/容量 评分）+ RBAC
> 边界遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §可做（自动）。

## 前置
- iter-22 migrations 跑过（stock_takes / stock_take_items / transfers 全建好）
- 现有 WMS 数据：8 条 inventory 行，SPU001-001 主要在 A-01-01-01（99 件）和 STAGING-01（51 件）

## 一、实时盘点（A）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | POST /stock-take（scope=all） | take_no 生成，status=draft | `ST20260601...4525, status=draft` | ✅ |
| T2 | POST /stock-take/:no/start | snapshot 当前 inventory 写入 items；status=in_progress | `count=8, first item system_qty=99` | ✅ |
| T3 | POST items/:id actual_qty=110 (system=99) | diff=+11, status=counted | `diff=11 status=counted` | ✅ |
| T4 | POST items/:id actual_qty=90 (system=99) | diff=-9 | `diff=-9` | ✅ |
| T5 | POST /complete → DB 验证 | inventory.quantity 应跟随 actual 调差 | A-01-01-01: 99→110；A-01-01-02: 99→90 | ✅ |
| T15 | scope=zone 缺 scope_value | 400 | `scope_type=zone 需带 scope_value` | ✅ |
| T16 | cancel draft 状态 | status=cancelled | `cancelled` | ✅ |
| T17 | list 过滤 status=completed | count 含 T5 | `completed count=1` | ✅ |

## 二、调拨（B）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T6 | POST /transfer | draft 创建 | `TR20260601...6853, status=draft` | ✅ |
| T7 | ship → from locked++ | from locked: 1→6（+5）；status=in_transit | `locked=6` | ✅ |
| T8 | receive → from -- + to ++ | A-01-01-01: 110→105；to 新建一行（不同 batch）qty=5；status=completed | 全对 | ✅ |
| T9 | from_location = to_location | 400 拒绝 | `源库位与目标库位不能相同` | ✅ |
| T10 | qty 超过可用 | ship 时报错 | `源库位可用不足：可用 104，需要 99999` | ✅ |
| T11 | cancel in_transit | locked 释放（4→1，释放 3） | `before=4 after=1` | ✅ |

## 三、上架推荐（C）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T12 | recommend SPU001-001 | 已有库位排首（聚集 40 + 黄金 30）；返 Top3 | `A-01-01-01 score=70 [已有 105 件该 SKU（聚集）, 黄金库位]` | ✅ |
| T13 | recommend 新 SKU（无聚集） | 黄金优先；其他按容量 | `A-01-01-01 score=30 [黄金库位]` | ✅ |
| T14 | sales_ops 调推荐 | 403 | `权限不足，需要角色: warehouse/super_admin` | ✅ |

## 四、本轮开发期 bug
- 无（盘点 / 调拨 / 推荐 三组功能 17 项 curl 一次跑通）
- 一个**疑似 bug 实为正常**：调拨 receive 时 to 库位若已存在但 batch_no 不同，会新建一行 — 这是设计预期（批次隔离）

## 四-bis、manual-test 抓到的 UX 问题
- **iter22-fix-1**：Transfers.vue 创建对话框源/目标库位用 text input + placeholder "B-02-01-01"（不存在的示例），用户照填导致后端 400「目标库位不存在」。修复：把源/目标 仓库 + 库位 全部改为 dropdown，按 warehouse 联动 fetch locations。从根上杜绝输入错误。
- **iter22-fix-2**：Transfers.vue 的 SKU 字段也是裸 text input，与 Inbound.vue 不一致。修复：照搬 Inbound 的 SKU 搜索下拉模式（filterable + remote 搜索 `wmsApi.productList`），打开 dialog 时预拉 30 条。
- **iter22-fix-3**：用户进一步要求三方智能联动。修复：dialog 打开时拉全量 inventory 建 invByLocation / locationsBySku / occupancyByLocation 三映射；
  - 源库位：未选 SKU 时显示"X SKU / 可用 N"；已选 SKU 时只可点含该 SKU 的库位（其他灰显"无该 SKU"）；空库位灰显"无商品"
  - 目标库位：显示"当前 X 件"；占用 ≥500 灰显"已满 (X)"；等于源时灰显"不能与源相同"
  - SKU：已选源库位时只列该库位的 SKU（聚合可用数）；未选时走 PIM 搜索，灰显当前无库存的 SKU
  - 联动：切换源库位时若新位无已选 SKU 自动清 SKU；切换 SKU 时若已选源库位无该 SKU 自动清源库位

## 五、需用户手动验证
- 详见 [iteration-22-manual-test.md](iteration-22-manual-test.md)
