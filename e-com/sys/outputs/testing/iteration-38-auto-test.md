# iteration-38-auto-test.md · BIZ-08-4 WMS 多店化自动测试

> auto-test，manual-test 见 [iteration-38-manual-test.md](iteration-38-manual-test.md)。

## 前置
- docker compose 4 后端 Up
- 2 migration 跑过（warehouses + inventory 加 store_id）
- 端口：WMS=8004 / OMS=8003

## 范围（BIZ-08 5 轮规划之第 4 轮）
- **iter-38 WMS 多店化**：
  - 2 ALTER：warehouses + inventory 加 store_id（DEFAULT 1 NOT NULL）+ warehouses 加 warehouse_type ENUM(self/merchant)
  - WMS 版 StoreContextService（跨库 oms.store_admins + Redis 1h，复用 iter-24 WMS→OMS 副连接）
  - WMS AdminAuth 注入 `$request->store_ids`
  - WMS route 加 store_owner/store_staff 角色允许（原 warehouse+super_admin）
  - Warehouse controller 加 3 辅助方法（applyStoreFilter / resolveCreateStoreId / assertStoreAccess）注入 5 处（list/detail/create/update/delete）
  - InventoryService.inbound 自动从 location → warehouse 推断 store_id 写入
  - Inventory.list 加店过滤
  - 存量数据回填：inventory.store_id 从 warehouse 推断（实测当前全归 store#1 平台店）
  - Vue Warehouses 加店铺下拉 + 店铺列 + 类型列 + 创建对话框加店铺/类型选择
  - Vue Inventory 加店铺下拉 + 列

## 用例（共 6 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| Migration | ALTER warehouses + inventory | warehouses 1 行 store_id=1 type=self；inventory 14 行 store_id=1 | ✅ | ✅ |
| T1 | super_admin 看 warehouse 列表（无 filter） | 1 行 WH-DEFAULT store_id=1 warehouse_type=self | ✅ | ✅ |
| T2 | super_admin 建 store#2 的商家仓 WH-IPHONE | 成功 + store_id=2 + warehouse_type=merchant | ✅ | ✅ |
| T3 | super_admin 按 store_id=2 筛 | 仅 WH-IPHONE | ✅ | ✅ |
| T4 | shopowner1 看 warehouse 列表 | 仅 WH-IPHONE（store#2 隔离生效） | total=1 store_id=2 | ✅ |
| T5 | shopowner1 看 WH-DEFAULT 详情（平台仓） | 403 "无权访问此店铺数据" | 准确拦截 | ✅ |
| T6 | shopowner1 看 inventory | 仅 store#2（当前为空，因尚未入库到 WH-IPHONE） | total=0 | ✅ |

## 结论
**7/7 ✅** — 0 fix。WMS 多店化完整工作；商家仓 vs 自营仓字段就位；store_owner 真实隔离。

## 关键产物

**新增 PHP（3）**
- `20260603700001_alter_warehouses_add_store_id.php`（+ warehouse_type）
- `20260603700002_alter_inventory_add_store_id.php`
- `apps/wms-backend/app/service/StoreContextService.php`（同 iter-36 PIM 版模式）

**编辑 PHP（4）**
- `apps/wms-backend/app/middleware/AdminAuth.php`（注入 store_ids）
- `apps/wms-backend/route/app.php`（路由 group 加 store_owner/store_staff）
- `apps/wms-backend/app/controller/Warehouse.php`（重写：3 辅助方法 + 5 处注入；create 接 store_id + warehouse_type）
- `apps/wms-backend/app/controller/Inventory.php`（list 加店过滤）
- `apps/wms-backend/app/service/InventoryService.php`（inbound 自动推断 store_id）

**编辑 Vue（4）**
- `apps/shop-admin/src/apis/wms.ts`（warehouseList 接 params + inventoryList 兼容 string|object）
- `apps/shop-admin/src/pages/wms/Warehouses.vue`（店铺下拉 + 列 + 类型列 + 创建表单加店铺/类型选择）
- `apps/shop-admin/src/pages/wms/Inventory.vue`（重写：店铺下拉 + 列）

## 关键设计

| 维度 | 选 | 理由 |
|---|---|---|
| warehouse_type | ENUM self/merchant | 平台自营 vs 商家自建；后续按类型做不同结算 |
| inventory.store_id | 冗余字段（理论上可从 location → warehouse 推） | 按店统计实物量快很多 |
| **warehouse 角色仍跨店** | StoreContextService 返 null | 平台仓管原本就管所有仓库；store_owner 才限制 |
| inbound 自动推 store_id | 从 location → warehouse 取 | service 内部完成；caller 不感知 |
| 跨店调拨 v1 不支持 | TransferService 未改 | store_owner 只能本店内调拨；平台代理跨店留 v2 |
| WMS Dashboard / 低库存预警 v1 不改 | 平台员工统一看 | iter-32 配置归平台管 |

## 经验记录

1. **WMS warehouse 角色保留跨店访问**：iter-35 设计时 super/sales/warehouse 都注入 null（跨店）。WMS 仓管原本就管所有仓库，不应被多店改造限制。**经验：业务角色边界 ≠ 店铺边界，不要混淆**
2. **inbound 自动推 store_id**：InventoryService.inbound 内部从 location_code → warehouse → store_id 推断，caller 不感知。同 iter-36 SKU 跟随 SPU.store_id 模式。**经验：横切字段（store_id）让 service 内部自动管理，不让上游 controller 关心**
3. **warehouse_type 字段就位但 v1 无业务差异**：self/merchant 是为 iter-39 入驻流程 + 商家自助提现做准备；当前 v1 字段就位但无差异化逻辑。**经验：架构改造时把字段补齐比留待后续 ALTER 风险低**
4. **TransferService v1 不动**：跨店调拨复杂（平台代理 vs 商家自营 vs 商家间），v1 不动让 store_owner 只能本店内调拨。**经验：复杂业务规则有时延后比草率实现好**
5. **回填存量 inventory.store_id**：当前 14 行全 store_id=1（所有仓都是 platform），SQL 一次 UPDATE 即可。**经验：ALTER + 回填 = 一次 migration 完成**

## 路线图进度

- ✅ iter-35 架构地基
- ✅ iter-36 PIM 多店化
- ✅ iter-37 OMS 多店化 + 订单拆单（最危险一轮）
- ✅ **iter-38 WMS 多店化** ← 你在这里
- ⏳ iter-39 入驻流程 + 店铺自管 + 抽佣自动算（5 轮规划收口）
