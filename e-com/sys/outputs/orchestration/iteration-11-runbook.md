# iteration-11-runbook.md · WMS 仓库/库位 CRUD + 入库一键完成

## 【当前焦点】
WMS 后台从只读升级到可写：运营在浏览器里能增删改仓库 / 库位（含批量生成）/ 入库单（含一键完成 +N 实物库存 + 推 wms.inventory.changed 事件）。

## 不在范围（M3+）
- PDA 扫码逐条收货 / 差异审批 / 上架推荐
- 实时盘点 / 库存调拨 / 移库
- WMS products 表（SKU 主数据）的 CRUD —— 应通过 `pim.sku.changed` Stream 自动同步（schema 已定义，事件订阅 M3）
- OMS 消费 `wms.inventory.changed` 后增加 available —— 事件已推，但 OMS consumer 暂未订阅（M3）

## Wave 拆分（共 13 文件）

### Wave A · WMS 后端写 API（6 文件）

| 文件 | 变更 |
|---|---|
| `wms-backend/database/migrations/20260528000001_create_inbound_orders.php` | 新建：入库单主表 |
| `wms-backend/database/migrations/20260528000002_create_inbound_items.php` | 新建：入库单明细 |
| `wms-backend/app/controller/Warehouse.php` | + detail/create/update/delete（含 location/outbound/inbound 引用保护）|
| `wms-backend/app/controller/Location.php` | + detail/create/update/delete/batch（批量按 zone-rack-level 笛卡尔积，≤500 个）|
| `wms-backend/app/controller/Inbound.php` | 新建：list/detail/create/autoComplete/cancel — autoComplete 写 inventory +N + XADD wms.inventory.changed |
| `wms-backend/route/app.php` | 注册 12 个新路由（参数路由放 plain 之前防错位）|

### Wave B · Vue WMS 写页面（5 文件 + 1 layout 改）

| 文件 | 变更 |
|---|---|
| `shop-admin/src/apis/wms.ts` | + 14 个写接口 |
| `shop-admin/src/pages/wms/Warehouses.vue` | 重写：新增/编辑 dialog + 删除按钮 |
| `shop-admin/src/pages/wms/Locations.vue` | 重写：CRUD dialog + 仓库筛选 + 批量生成 dialog（rack/level 范围）|
| `shop-admin/src/pages/wms/Inbound.vue` | 新建：列表 + 筛选 + 分页 + 创建 dialog（动态明细行）+ 一键完成 + 详情 dialog |
| `shop-admin/src/router/index.ts` | + /wms/inbound 路由 |
| `shop-admin/src/components/AdminLayout.vue` | WMS 菜单加"入库管理" |

### Wave C · 文档（3 文件）

- `outputs/orchestration/iteration-11-runbook.md`（本文件）
- `outputs/orchestration/reconcile-report-iteration-11.md`
- `progress.md`

## 关键技术决策

| 项 | 选择 | 理由 |
|---|---|---|
| 入库流程简化 | 跳过 PDA 扫码/差异/上架，一键完成 → status=received + inventory +N | MVP 不上 PDA 设备；M3 加完整流程 |
| 库位批量生成 | 按 `zone-rack-level` 笛卡尔积，单次 ≤500 | 防误操作；超过的分批 |
| 入库后库位 | 找该仓库 `staging` 类型可用库位作为默认入库目的地 | seed 已有 STAGING-01，避免要求用户先建库位 |
| 入库批次 | 默认 `BATCH-yyyymmdd`，用户可指定 | 同 SKU 不同批次走不同 inventory 行 |
| 库存合并逻辑 | 按 `sku+location+batch` 唯一，已有 quantity+N，无则 INSERT | 保留批次粒度，便于先入先出 |
| OMS available 同步 | 推 `wms.inventory.changed` 事件，OMS 消费后增加 available | 事件已推但 OMS consumer 未订阅 → M3 补 |
| 引用保护 | 删仓库查 location/outbound/inbound；删库位查 inventory(qty>0) | 防孤儿 |
| Warehouse/Location/Inbound 软删 vs 物理删 | 物理删（与 PIM 不同）+ 引用保护 | WMS schema 没 deleted_at；运营误删可重建 |
| 入库幂等 | Idempotency-Key 写 inbound_orders.idempotency_key 唯一索引 | 防重复提交 |

## 验收

后端 curl：
```bash
# 仓库 CRUD
curl -X POST http://localhost:8004/api/v1/warehouse \
  -H 'Content-Type: application/json' \
  -d '{"warehouse_code":"WH-TEST","warehouse_name":"测试仓"}'

# 库位批量
curl -X POST http://localhost:8004/api/v1/location/batch \
  -H 'Content-Type: application/json' \
  -d '{"warehouse_code":"WH-DEFAULT","zone":"B","rack_from":1,"rack_to":3,"level_from":1,"level_to":2}'
# 期望: {"created": 6, "skipped": 0, "total": 6}

# 入库单创建 + 一键完成
curl -X POST http://localhost:8004/api/v1/inbound \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: ib-test-1' \
  -d '{"warehouse_code":"WH-DEFAULT","source_type":"purchase","items":[{"sku_code":"SPU001-001","expected_qty":50}]}'

# 拿到 inbound_no 后
curl -X POST http://localhost:8004/api/v1/inbound/IB.../auto-complete
# 期望: status=received, event_published=true

# 查 inventory
curl http://localhost:8004/api/v1/inventory/list?sku_code=SPU001-001
# 期望: quantity 比之前多 50
```

Vue 后台：
1. WMS/仓库管理 → 新增 WH-TEST → 列表出现 → 编辑改 contact → 删除（无引用）
2. WMS/库位管理 → 批量生成 5×4=20 个 → 列表多 20 行
3. WMS/入库管理 → 新建 → 选 WH-DEFAULT + SKU 加 100 → 提交
4. 列表点"一键完成" → 状态 received → toast 显示 event_published ✓
5. WMS/实物库存 → 该 SKU quantity +100
6. （选做）OMS/库存四态 → 该 SKU available 是否 +100 — 当前 **不会自动**（OMS consumer 未订阅 wms.inventory.changed，M3 补）

## 用户运行验证步骤

```bash
cd apps/

# 1. 跑新 migration（2 个 inbound 表）
docker-compose exec wms-backend php think migrate:run

# 2. WMS 改了 controller + route，restart 生效（不需 build）
docker-compose restart wms-backend

# 3. Vue dev 重启
cd shop-admin && npm run dev
```

浏览器 http://localhost:5173 跑上面 6 步。
