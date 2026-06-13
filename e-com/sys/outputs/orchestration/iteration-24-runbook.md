# iteration-24-runbook.md · WMS 完整化 + OMS 对接补齐（P0+P1 五件套）

## 一、文件清单（共 ~20 文件，6 Wave）

### Wave 1 · 数据层（2 文件）
1. `apps/wms-backend/database/migrations/20260602000002_create_inventory_log.php` — WMS 库存变动日志
2. `apps/wms-backend/database/migrations/20260602000003_create_inventory_reconcile_log.php` — WMS-OMS 对账日志

### Wave 2 · WMS 库存日志服务（4 文件，1 新 3 改）
3. `apps/wms-backend/app/service/WmsInventoryLogService.php` — 统一写日志 helper
4. `apps/wms-backend/app/service/InventoryService.php` 改 — lock/deduct/unlock 加日志
5. `apps/wms-backend/app/service/StockTakeService.php` 改 — complete 调差时按行写日志
6. `apps/wms-backend/app/service/TransferService.php` 改 — ship(lock)/receive(out+in)/cancel(unlock) 全部写日志
   * 入库/出库已通过 InventoryService 间接走，盘点和调拨需要服务级写点

### Wave 3 · 事件扩展（3 文件，1 新 2 改）
7. `apps/wms-backend/app/service/TransferService.php` 改（接事件推送）— receive 完成后推 `wms.inventory.changed`（payload 加 `transfer_no` + items[delta]）
8. `apps/wms-backend/app/service/StockTakeService.php` 改 — complete 后推 `wms.inventory.changed`（payload 加 `take_no` + items[delta，可正可负]）
9. `apps/oms-backend/app/service/handler/WmsInventoryChangedHandler.php` 改 — 增加 transfer_no / take_no 分支，分别处理跨仓调拨（仅审计）和盘点调差（available +/- delta）

### Wave 4 · 拣货任务独立 API（5 文件，2 新 3 改）
10. `apps/wms-backend/app/service/PickingTaskService.php` — list/detail/assign/scan/complete 业务
11. `apps/wms-backend/app/controller/Picking.php` 改 — 加 5 个 admin 接口（adminList/detail/assign/scan/complete）
12. `apps/wms-backend/route/app.php` 改 — 加 admin/picking-task/* 路由
13. `apps/shop-admin/src/apis/wms.ts` 改 — 加 pickingTask*  方法
14. `apps/shop-admin/src/pages/wms/PickingTasks.vue` — 新页（列表 + 详情 + 分配 + 扫描上报）
   + AdminLayout 加菜单 / router 加路由

### Wave 5 · 对账工具（4 文件，3 新 1 改）
15. `apps/wms-backend/app/service/InventoryReconcileService.php` — 拉 WMS inventory + 查 OMS inventory_status 比较
16. `apps/wms-backend/app/controller/Reconcile.php` — admin 接口
17. `apps/wms-backend/route/app.php` 已改 — 加 admin/reconcile/* 路由
18. `apps/shop-admin/src/pages/wms/Reconcile.vue` — 新页（触发对账 + 看差异 + 确认）
   + apis / router / menu

### Wave 6 · 文档 + 测试（3 文件）
19. `outputs/orchestration/reconcile-report-iteration-24.md`
20. `outputs/testing/iteration-24-auto-test.md`
21. `outputs/testing/iteration-24-manual-test.md`

> 计件 20，实际文件层面 ~22（路由/menu/router 算到既有改动）

## 二、表结构

### wms_db.inventory_log
```sql
CREATE TABLE inventory_log (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sku_code VARCHAR(64) NOT NULL,
  location_code VARCHAR(32) NOT NULL,
  batch_no VARCHAR(64) NOT NULL DEFAULT 'INIT',
  change_type VARCHAR(32) NOT NULL,
    -- inbound / outbound / stock_take_in / stock_take_out / transfer_out / transfer_in / lock / unlock
  delta INT NOT NULL,
  before_quantity INT NOT NULL,
  after_quantity INT NOT NULL,
  before_locked INT NOT NULL,
  after_locked INT NOT NULL,
  ref_no VARCHAR(64) DEFAULT NULL,
  operator VARCHAR(64) NOT NULL DEFAULT 'system',
  remark VARCHAR(255) DEFAULT '',
  created_at DATETIME NOT NULL,
  KEY idx_sku (sku_code),
  KEY idx_location (location_code),
  KEY idx_ref (ref_no),
  KEY idx_change_type_time (change_type, created_at)
);
```

### wms_db.inventory_reconcile_log
```sql
CREATE TABLE inventory_reconcile_log (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  reconcile_no VARCHAR(32) NOT NULL UNIQUE,
  scope_type VARCHAR(16) NOT NULL DEFAULT 'all',
  scope_value VARCHAR(64) DEFAULT NULL,
  total_skus INT NOT NULL DEFAULT 0,
  diff_count INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  details JSON DEFAULT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  confirmed_at DATETIME DEFAULT NULL
);
```

## 三、关键设计决策

| 主题 | 决策 |
|---|---|
| inventory_log 粒度 | 每次 quantity 或 locked_quantity 任一改动都写 1 条（before/after 都存，方便审计）|
| change_type 命名 | 与流程语义一致：inbound / outbound / stock_take_in/out / transfer_out/in / lock / unlock |
| ref_no 兜底 | 入库 = inbound_no；出库 = outbound_no；盘点 = take_no；调拨 = transfer_no；lock = order_no |
| 事件扩展 vs 新流 | **延续 iter-14 经验**：扩展 `wms.inventory.changed` 加 transfer_no / take_no，不新增 stream |
| 调拨同步 OMS | receive 完成时推单条事件，payload `items[]` 包含 from/to 的 delta（同仓库 net 0，跨仓库 from 负 to 正）|
| 盘点同步 OMS | complete 时推单条事件，items[].delta 可正可负（盘盈/盘亏）|
| OMS handler 分支 | 优先 refund_no（已有）→ transfer_no（新增审计写日志，**available 不变**）→ take_no（新增 available += delta）→ 默认 inbound（已有）|
| 拣货 API 兼容 | 保留现有 outbound 一键完成；新 API 是补充，PDA 真机场景用 |
| 对账算法 | 单次扫描 wms.inventory GROUP BY sku → 算 sum(quantity - locked) 作为 WMS 视角 available；查 oms.inventory_status.available；diff = WMS - OMS。差异 ≠ 0 入 details |
| 对账修复 | 仅记录 + 提示，不自动修复（避免数据双写灾难）|
| RBAC | 全部 warehouse + super_admin |

## 四、API 设计

### 拣货任务（`/api/v1/admin/picking-task/*`，warehouse + super_admin）
| 方法 | 路径 | 用途 |
|---|---|---|
| GET   | `/picking-task/list`              | 列表（status / outbound_no 筛选） |
| GET   | `/picking-task/:id`               | 详情 |
| POST  | `/picking-task/:id/assign`        | 分配给 operator（写 operator 字段） |
| POST  | `/picking-task/:id/scan`          | 逐 SKU 上报扫描 picked_qty（增量）|
| POST  | `/picking-task/:id/complete`      | 完成 + 触发出库 autoComplete（如果全扫完）|

### 对账（`/api/v1/admin/reconcile/*`）
| 方法 | 路径 | 用途 |
|---|---|---|
| POST  | `/reconcile`                     | 触发新对账（scope=all 或 sku） |
| GET   | `/reconcile/list`                | 历史对账记录 |
| GET   | `/reconcile/:no`                 | 详情含 details JSON |
| POST  | `/reconcile/:no/confirm`         | 标记 confirmed（仅状态，不改库存） |

## 五、避坑

| 风险 | 规避 |
|---|---|
| inventory_log 写失败拖垮主流程 | 写日志在主事务内（一致性高）；如失败整体回滚 |
| log 体量爆炸 | DB 分表 / 归档放 M3+；当前每日预计千条以内 |
| 事件 schema 不兼容 | OMS handler 按字段存在性分支；老消息走旧路径（refund_no 优先）|
| 调拨同仓库 delta 计算 | from -qty / to +qty，OMS 仅写 inventory_log（available 不变） |
| 盘点 sync 时 OMS 与 WMS 短时不一致 | tx 完成后才推事件（已成事实），OMS 异步消费偏差几秒可接受 |
| picking_tasks 并发扫描 | items 表加 picked_qty 字段；scan 时按 (task_id, sku_code) 行锁更新 |
| 对账时 OMS 写入并发 | 单次对账接口跑 5-10 秒，期间不强一致；用户理解为"快照对比" |
| 数字 OMS 不接受负 delta | OMS handler 收到 take_no 时按 max(0, available + delta) 兜底 |

## 六、待用户运行验证（3 步）

1. **migrations**：
   ```bash
   docker-compose exec wms-backend php think migrate:run
   ```
2. **重启 wms-backend + oms-backend**（handler 改动需重启 consumer）：
   ```bash
   docker-compose restart wms-backend oms-backend
   ```
3. **Vue 自动热更**

## 七、剩余非阻塞（M3+）
- Q24-01：log 分表 / 归档（按月分区）
- Q24-02：自动修复对账（双写灾难风险高，需要业务确认机制）
- Q24-03：picking_tasks 批量条码扫描（PDA 优化）
- Q24-04：WMS Dashboard（仓库利用率 + 拣货效率）
- Q24-05：入库自动上架（用 LocationRecommendService 默认填库位）
- Q24-06：出库分配策略（FIFO 批次 / 就近库位）
- Q24-07：低库存预警（阈值 + 通知）
