# iteration-25-runbook.md · WMS 增强四件套

## 一、文件清单（共 ~16 文件，5 Wave）

### Wave 1 · 数据层（1 文件）
1. `apps/wms-backend/database/migrations/20260602000005_create_stock_alert_rules.php` — 低库存预警规则表

### Wave 2 · WMS Dashboard（3 文件）
2. `apps/wms-backend/app/service/WmsStatsService.php` — Dashboard 数据聚合（仓库利用率/入出库趋势/拣货效率）
3. `apps/wms-backend/app/controller/Stats.php` — `/admin/wms-stats` 接口
4. `apps/shop-admin/src/pages/wms/Dashboard.vue` — Vue 页 + ECharts

### Wave 3 · 低库存预警（4 文件）
5. `apps/wms-backend/app/service/StockAlertService.php` — 规则 CRUD + 实时告警计算
6. `apps/wms-backend/app/controller/StockAlert.php` — 规则 + 告警接口
7. `apps/shop-admin/src/pages/wms/StockAlerts.vue` — 告警列表 + 规则配置 dialog
8. `apps/wms-backend/route/app.php` 改 — 加 stats / stock-alert 路由

### Wave 4 · 入库整合上架推荐（1 文件改）
9. `apps/wms-backend/app/service/InboundService.php` 改 — `autoComplete` 中每个 item 调 LocationRecommendService 取 Top1 库位
   * 如果用户在创建时已指定 location，按用户指定；否则用推荐

### Wave 5 · 出库 FIFO 分配（1 文件改）
10. `apps/wms-backend/app/service/InventoryService.php` 改 — `findAvailable` 改为按 batch_no/created_at 升序（FIFO）+ tiebreaker locked_quantity asc

### Wave 6 · 集成（3 文件改）
11. `apps/shop-admin/src/apis/wms.ts` 改 — 加 wmsStats / stockAlert*
12. `apps/shop-admin/src/router/index.ts` 改 — 加 2 个路由
13. `apps/shop-admin/src/components/AdminLayout.vue` 改 — WMS 菜单加 2 项（WMS 总览 / 低库存预警）

### Wave 7 · 文档 + 测试（3 文件）
14. `outputs/orchestration/reconcile-report-iteration-25.md`
15. `outputs/testing/iteration-25-auto-test.md`
16. `outputs/testing/iteration-25-manual-test.md`

## 二、表结构

### stock_alert_rules
```sql
CREATE TABLE stock_alert_rules (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sku_code VARCHAR(64) NOT NULL UNIQUE,
  threshold INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  remark VARCHAR(255) DEFAULT '',
  created_by VARCHAR(64) NOT NULL,
  created_at DATETIME,
  updated_at DATETIME
);
```

## 三、关键设计决策

| 主题 | 决策 |
|---|---|
| Dashboard 单接口 | 沿用 iter-18/21 风格，`/admin/wms-stats?days=N` 一次返回所有维度 |
| 仓库利用率定义 | 每仓库的"已用 locations 数 / 总 locations 数 + 总 quantity 占用"|
| 入出库趋势 | 按 created_at 日聚合，days 参数控制时序长度，PHP 补 0 |
| 拣货效率 | avg(picked_at - assigned_at) 秒；分母为已完成且有 assigned_at 的任务 |
| 阈值定义 | 当前 WMS 总可用 (SUM(quantity - locked_quantity)) < threshold 即预警 |
| 阈值规则归属 | 每 SKU 一行（UNIQUE），enabled=0 临时禁用而非删 |
| 入库推荐集成 | autoComplete 时若 item 缺 location_code，调 recommend Top1 + 自动填入；用户已指定则尊重 |
| FIFO 实现 | findAvailable 改为 ORDER BY batch_no ASC, locked_quantity ASC（batch_no 通常含日期，BATCH-20260528 自然递增）|
| RBAC | 全部 warehouse + super_admin |

## 四、API 设计

### WMS Dashboard
| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/admin/wms-stats?days=N` | 全维度统计（KPI + 仓库利用率 + 入出库时序 + 拣货效率）|

### 低库存预警
| 方法 | 路径 | 用途 |
|---|---|---|
| GET   | `/admin/stock-alert/list`         | 当前告警列表（实时计算）|
| GET   | `/admin/stock-alert/rules`        | 规则列表 |
| POST  | `/admin/stock-alert/rules`        | 新增/更新规则（按 sku_code UPSERT）|
| DELETE| `/admin/stock-alert/rules/:sku`   | 删除规则 |

## 五、避坑

| 风险 | 规避 |
|---|---|
| Dashboard 大数据慢 | 入出库 limit 30 天；拣货效率单 SQL 算 |
| 仓库利用率分母 0 | 没库位时返 0% |
| 阈值规则重复 | DB UNIQUE 兜底 + service 层 UPSERT |
| 入库 recommend 空结果 | fallback 到 STAGING-01（保留兜底逻辑）|
| FIFO 数据漂移 | batch_no 格式 BATCH-yyyymmdd 自然排序；旧数据 INIT 排首位 |
| 告警查询全表扫 | SUM(quantity - locked) GROUP BY sku 单次扫描；分页可选 |

## 六、待用户运行验证（2 步）
1. **migration**：
   ```bash
   docker-compose exec wms-backend php think migrate:run
   ```
2. **重启 wms-backend + Vue 热更**

## 七、剩余非阻塞（M3+）
- Q25-01：预警邮件 / 企业微信通知（接外部 API）
- Q25-02：仓库容量 / 库位容量精确管理（不再靠 occupancy 阈值）
- Q25-03：拣货效率按 operator 维度分析
- Q25-04：入库推荐"批量分配多库位"（多批次 / 多 SKU 自动分散）
