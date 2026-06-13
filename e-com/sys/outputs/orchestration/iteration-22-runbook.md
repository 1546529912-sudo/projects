# iteration-22-runbook.md · WMS 智能化（实时盘点 + 调拨 + 上架推荐）

## 一、文件清单（共 ~18 文件，6 Wave）

### Wave 1 · 数据层（3 文件）
1. `apps/wms-backend/database/migrations/20260601000001_create_stock_takes.php` — 盘点单主表
2. `apps/wms-backend/database/migrations/20260601000002_create_stock_take_items.php` — 盘点明细
3. `apps/wms-backend/database/migrations/20260601000003_create_transfers.php` — 调拨单（单 SKU 简化版）

### Wave 2 · 实时盘点（3 文件）
4. `apps/wms-backend/app/service/StockTakeService.php` — 创建/起盘 snapshot/录入/完成自动调差
5. `apps/wms-backend/app/controller/StockTake.php` — admin CRUD
6. `apps/wms-backend/route/app.php` 改 — 加 admin/stock-take/* 路由

### Wave 3 · 调拨（2 文件）
7. `apps/wms-backend/app/service/TransferService.php` — draft → ship → receive → completed
8. `apps/wms-backend/app/controller/Transfer.php` — admin CRUD

### Wave 4 · 上架推荐（1 文件 + route）
9. `apps/wms-backend/app/service/LocationRecommendService.php` — Top3 推荐算法
   - 入口可在 `Inbound::recommend()` 或独立 controller；为最小变动，加进 `Inbound.php`

### Wave 5 · Vue 后台（5 文件，3 新 2 改）
10. `apps/shop-admin/src/apis/wms.ts` 改 — 加 stock-take + transfer + recommend 接口
11. `apps/shop-admin/src/pages/wms/StockTakes.vue` 新 — 盘点单列表 + 详情 + 录入
12. `apps/shop-admin/src/pages/wms/Transfers.vue` 新 — 调拨单列表 + 流转操作
13. `apps/shop-admin/src/router/index.ts` 改 — 加 2 个路由
14. `apps/shop-admin/src/components/AdminLayout.vue` 改 — WMS 菜单加 2 个入口
15. `apps/shop-admin/src/pages/wms/Inbound.vue` 改 — 入库创建对话框加"智能推荐"按钮

### Wave 6 · 测试 + 文档（4 文件）
16. `outputs/orchestration/reconcile-report-iteration-22.md`
17. `outputs/testing/iteration-22-auto-test.md`
18. `outputs/testing/iteration-22-manual-test.md`

## 二、表结构

### stock_takes（盘点单）
```sql
CREATE TABLE stock_takes (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  take_no VARCHAR(32) NOT NULL UNIQUE,
  warehouse_code VARCHAR(32) NOT NULL,
  scope_type VARCHAR(20) NOT NULL DEFAULT 'all',  -- all/zone/location/sku
  scope_value VARCHAR(64) DEFAULT NULL,            -- zone code 或 location code 或 sku_code（看 scope_type）
  status VARCHAR(20) NOT NULL DEFAULT 'draft',    -- draft / in_progress / completed / cancelled
  created_by VARCHAR(64) NOT NULL,
  remark VARCHAR(255) DEFAULT '',
  created_at DATETIME,
  started_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  KEY idx_warehouse_status (warehouse_code, status)
);
```

### stock_take_items（盘点明细 = 起盘时 snapshot 当前库存）
```sql
CREATE TABLE stock_take_items (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  take_no VARCHAR(32) NOT NULL,
  sku_code VARCHAR(64) NOT NULL,
  location_code VARCHAR(32) NOT NULL,
  batch_no VARCHAR(64) DEFAULT 'INIT',
  system_qty INT NOT NULL,           -- snapshot 当前 inventory.quantity
  actual_qty INT DEFAULT NULL,       -- 仓管员录入；NULL 表未录
  diff INT DEFAULT NULL,             -- actual - system，complete 时算
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / counted
  KEY idx_take_no (take_no)
);
```

### transfers（调拨单 · 单 SKU 简化）
```sql
CREATE TABLE transfers (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  transfer_no VARCHAR(32) NOT NULL UNIQUE,
  from_warehouse VARCHAR(32) NOT NULL,
  to_warehouse VARCHAR(32) NOT NULL,
  from_location VARCHAR(32) NOT NULL,
  to_location VARCHAR(32) NOT NULL,
  sku_code VARCHAR(64) NOT NULL,
  batch_no VARCHAR(64) NOT NULL DEFAULT 'INIT',
  qty INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',    -- draft / in_transit / completed / cancelled
  created_by VARCHAR(64) NOT NULL,
  remark VARCHAR(255) DEFAULT '',
  created_at DATETIME,
  shipped_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  KEY idx_warehouses (from_warehouse, to_warehouse, status)
);
```

## 三、关键设计决策

| 主题 | 决策 |
|---|---|
| 盘点 scope | 4 种（all 全仓 / zone 分区 / location 单库位 / sku 单 SKU）。起盘瞬间 snapshot 当时的 inventory.quantity 为 system_qty |
| 录入逻辑 | actual_qty 可任意修改（仓管员二次确认），complete 时按"录入 ≠ NULL"才算入差异 |
| 完成自动调差 | tx 内：对每条 actual ≠ system 的明细，inventory.quantity += diff；写 inventory_log change_type='stock_take_adjust' |
| 未录条目处理 | complete 时默认按 actual = system 处理（无差），不阻塞 |
| 调拨单粒度 | 单 SKU 单批次（M3+ 可加多 SKU 批量调拨） |
| 调拨同仓库 vs 跨仓库 | 同表，from/to 仓库可同可不同；同仓库就是移库 |
| 调拨锁库存 | ship 时 from 库位 locked++（quantity 不动）；receive 时 from quantity-- + locked-- + to quantity++ |
| 推荐算法权重 | 已有库位(40) > 黄金库位(30) > 同分区空库位(20) > 剩余容量(10)。Top3 返回 |
| 推荐响应 | 返回 location_code + score + reasons[] 三字段供前端展示推荐理由 |
| RBAC | 盘点/调拨/推荐 仅 super_admin + warehouse（生产作业） |
| 路由顺序 | TP8 规范：参数路由在前，plain 在后 |
| 不引入 stream | 盘点完成不发事件（WMS 内部完成 → inventory_log 即追溯）；调拨完成同样只调本地表 |

## 四、API 设计

### 实时盘点（`/api/v1/admin/stock-take/*`，warehouse + super_admin）
| 方法 | 路径 | 用途 |
|---|---|---|
| POST   | `/stock-take` | 创建 draft（带 scope）|
| GET    | `/stock-take/list` | 列表 + 状态筛选 |
| GET    | `/stock-take/:no` | 详情含明细 |
| POST   | `/stock-take/:no/start` | 起盘 snapshot |
| PUT    | `/stock-take/:no/items/:itemId` | 录入 actual_qty |
| POST   | `/stock-take/:no/complete` | 完成 + tx 自动调差 |
| POST   | `/stock-take/:no/cancel` | 取消（仅 draft/in_progress） |

### 调拨（`/api/v1/admin/transfer/*`）
| 方法 | 路径 | 用途 |
|---|---|---|
| POST   | `/transfer` | 创建 draft |
| GET    | `/transfer/list` | 列表 |
| GET    | `/transfer/:no` | 详情 |
| POST   | `/transfer/:no/ship` | 起运（from locked++） |
| POST   | `/transfer/:no/receive` | 接收（from quantity-- + to quantity++） |
| POST   | `/transfer/:no/cancel` | 取消（视状态释放 locked） |

### 上架推荐
| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/inbound/recommend-locations` body: {sku_code, qty, warehouse_code} | 返 Top3 |

## 五、避坑

| 风险 | 规避 |
|---|---|
| 起盘后库存变更影响 snapshot | snapshot 在 tx 内一次性写入 stock_take_items；后续作业不影响 system_qty 字段 |
| 盘点完成时 inventory 行被并发改 | tx 内对每条 inventory 行 lock(true) 后再调差 |
| 调拨 from 库存不足 | ship 前 precheck inventory.quantity - locked >= qty |
| 调拨重复 ship | status 必须 = draft 才能 ship；in_transit 不可重复 ship |
| 同库位调拨（from=to）| 报 400 |
| 推荐算法 N+1 | 单次 SQL 拿 locations + inventory join 然后内存排序 |
| 推荐返回库位状态非 available | WHERE status='available' 过滤 |
| 推荐空结果 | 即使无任何推荐，至少返 1 个默认（任意 available 库位） |
| 盘点 scope=sku 但 sku 不存在 | 不报错，起盘明细为空 → complete 直接 success |

## 六、待用户运行验证（2 步）
1. **migrations**：
   ```bash
   docker-compose exec wms-backend php think migrate:run
   ```
2. **重启 wms-backend + Vue 热更自动**：
   ```bash
   docker-compose restart wms-backend
   ```

> auto-test 我跑（curl）→ `iteration-22-auto-test.md`
> manual-test 用户跑（Vue UI）→ `iteration-22-manual-test.md`

## 七、剩余非阻塞（M3+）
- Q22-01：多 SKU 批量调拨单
- Q22-02：盘点单导出 CSV
- Q22-03：盘点 / 调拨 移动端 H5（手持扫码场景）
- Q22-04：推荐算法可配置权重
- Q22-05：调拨完成事件推 OMS（如果跨仓库变化影响销售可用，但目前 OMS 看的是 inventory_status 不是 wms.inventory）
- Q22-06：盘点定期任务（按周/月自动建单）
