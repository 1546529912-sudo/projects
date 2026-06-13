# iteration-26-runbook.md · OMS 完整化（跟 WMS iter-24 对称）

## 一、文件清单（共 ~20 文件，5 Wave）

### Wave 1 · 数据层（3 文件）
1. `apps/oms-backend/database/migrations/20260602000001_create_oms_inventory_reconcile_log.php` — OMS 视角对账日志
2. `apps/oms-backend/database/migrations/20260602000002_create_settlement_orders.php` — 财务结算单
3. `apps/wms-backend/database/migrations/20260602000006_create_oms_event_audit_log.php` — WMS 端记录 OMS 推过来的事件

### Wave 2 · OMS 推 3 个新事件（P0-1，4 文件 1 新 3 改）
4. `apps/oms-backend/app/service/OrderService.php` 改 — `cancel`/`markCancelledByAdmin` 完成后推 `oms.order.cancelled`
5. `apps/oms-backend/app/service/RefundService.php` 改 — `approve` 推 `oms.refund.approved`；`markRefunded` 推 `oms.refund.refunded`
6. `apps/wms-backend/app/service/handler/OmsOrderCancelledHandler.php` — WMS 端 audit
7. `apps/wms-backend/app/service/handler/OmsRefundApprovedHandler.php` + `OmsRefundRefundedHandler.php` — WMS 端 audit

### Wave 3 · WMS consumer 注册 3 个新 handler（3 文件 1 改 2 新）
8. `apps/wms-backend/app/command/ConsumeOmsRefund.php` 新 — supervisord 进程
9. `apps/wms-backend/supervisor/conf.d/consumers.conf` 改 — 加新进程
10. `apps/wms-backend/console.php` 改 — 注册新 command

### Wave 4 · OMS 视角对账（P0-2，4 文件）
11. `apps/oms-backend/config/database.php` 改 — 加 wms 副连接
12. `apps/oms-backend/app/service/OmsInventoryReconcileService.php` 新 — 拉 WMS.inventory 比较
13. `apps/oms-backend/app/controller/Reconcile.php` 新 — 4 接口（create/list/detail/confirm）
14. `apps/oms-backend/route/app.php` 改 — 加 admin/reconcile/* 路由

### Wave 5 · 财务结算单（P0-3，5 文件）
15. `apps/oms-backend/app/service/SettlementService.php` 新 — order completed / refund refunded 时落单 + list + 导出
16. `apps/oms-backend/app/service/OrderService.php` 改 — `confirm` 完成后调 SettlementService.recordOrderSettlement
17. `apps/oms-backend/app/service/RefundService.php` 改 — `markRefunded` 后调 SettlementService.recordRefundSettlement
18. `apps/oms-backend/app/controller/Settlement.php` 新 — 4 接口
19. `apps/oms-backend/route/app.php` 改 — 加 admin/settlement/* 路由

### Wave 6 · Vue 集成（4 文件 3 新 1 改）
20. `apps/shop-admin/src/apis/oms.ts` 改 — 加 reconcile* / settlement*
21. `apps/shop-admin/src/pages/oms/Reconcile.vue` 新 — OMS 端对账页
22. `apps/shop-admin/src/pages/oms/Settlement.vue` 新 — 财务结算单页（列表 + 导出 CSV）
23. `apps/shop-admin/src/router/index.ts` + `AdminLayout.vue` 改 — 加 2 项

### Wave 7 · 测试 + 文档（3 文件）
24. `outputs/orchestration/reconcile-report-iteration-26.md`
25. `outputs/testing/iteration-26-auto-test.md`
26. `outputs/testing/iteration-26-manual-test.md`

> 计件 23 个，实际文件层面 ~26。

## 二、表结构

### oms_db.inventory_reconcile_log（对偶 wms_db.inventory_reconcile_log）
```sql
CREATE TABLE inventory_reconcile_log (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  reconcile_no VARCHAR(32) UNIQUE,
  scope_type VARCHAR(16) DEFAULT 'all',
  scope_value VARCHAR(64) NULL,
  total_skus INT DEFAULT 0,
  diff_count INT DEFAULT 0,
  status VARCHAR(16) DEFAULT 'pending',  -- pending/confirmed
  details JSON,
  created_by VARCHAR(64),
  created_at DATETIME,
  confirmed_at DATETIME NULL
);
```

### oms_db.settlement_orders
```sql
CREATE TABLE settlement_orders (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  settlement_no VARCHAR(32) UNIQUE,
  type VARCHAR(16) NOT NULL,             -- order / refund
  ref_no VARCHAR(32) NOT NULL,            -- order_no / refund_no
  user_id INT UNSIGNED NOT NULL,
  amount BIGINT NOT NULL,                 -- 分；refund 为负
  goods_amount BIGINT NOT NULL,
  freight BIGINT DEFAULT 0,
  discount BIGINT DEFAULT 0,
  status VARCHAR(16) DEFAULT 'unsettled', -- unsettled / settled
  remark VARCHAR(255) DEFAULT '',
  created_at DATETIME,
  settled_at DATETIME NULL,
  KEY idx_type_status (type, status),
  KEY idx_ref_no (ref_no),
  KEY idx_created (created_at)
);
```

### wms_db.oms_event_audit_log（WMS 收到 OMS 事件的审计）
```sql
CREATE TABLE oms_event_audit_log (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(32) NOT NULL,        -- oms.order.cancelled / oms.refund.approved / oms.refund.refunded
  ref_no VARCHAR(32) NOT NULL,            -- order_no / refund_no
  payload JSON,
  received_at DATETIME,
  KEY idx_event_type (event_type),
  KEY idx_ref_no (ref_no)
);
```

## 三、关键设计决策

| 主题 | 决策 |
|---|---|
| 事件新增 vs 字段扩展 | iter-26 是**全新业务事件**（取消/退款），不是已有事件的衍生 → 必须新增 stream（与 iter-14/24 的"字段扩展"对照） |
| 新增几个 stream | 3 个独立（cancelled / refund.approved / refund.refunded）vs 合并 oms.refund.* — 选独立，handler 清晰 + 后续易扩 |
| WMS 接收逻辑 | 仅写 oms_event_audit_log（保留可对接 hook，不做实际业务动作）。**经验：被动感知能力先建立链路，业务联动按需追加** |
| OMS 视角对账 | 与 WMS iter-24 P1-2 完全对称（OMS 加 wms 副连接，拉 WMS.inventory GROUP BY sku → SUM(quantity-locked) vs 本地 available） |
| 对账冗余 | 双侧对账意义：WMS 视角看 OMS 是否丢消息；OMS 视角看 WMS 是否漏推。双方独立触发 |
| 财务结算单 触发 | order confirm 完成时调 recordOrderSettlement；refund markRefunded 时调 recordRefundSettlement |
| settled / unsettled | 创建时 unsettled，留出"财务确认入账"流程 hook（未来对接真财务系统） |
| 财务金额 | 全分（bigint），refund 用负数 amount，方便统计 net = SUM(amount) |
| Vue 菜单 | OMS 父级加"OMS 对账" + 财务"结算单"（运营 + 超管可见） |
| 财务 RBAC | super_admin + sales_ops 都可看（运营关心营收） |
| 不引入财务专属角色 | 维持 3 角色简洁，super_admin 可以做"假装财务"决策 |

## 四、API 设计

### OMS 端对账（`/api/v1/admin/reconcile/*`）
对偶 WMS 端，全套 4 接口（create/list/detail/confirm）。

### 财务结算单（`/api/v1/admin/settlement/*`）
| 方法 | 路径 | 用途 |
|---|---|---|
| GET   | `/settlement/list`      | 列表（按 type / status 筛选 + 分页）|
| GET   | `/settlement/:no`       | 详情 |
| POST  | `/settlement/:no/settle`| 标记 settled（手动确认入账）|
| GET   | `/settlement/export`    | CSV 导出（按 type / 日期范围）|

### OMS 推 3 事件
- `oms.order.cancelled`: payload `{ order_no, user_id, reason, cancelled_at }`
- `oms.refund.approved`: payload `{ refund_no, order_no, type, amount, approved_at }`
- `oms.refund.refunded`: payload `{ refund_no, order_no, amount, refunded_at }`

## 五、避坑

| 风险 | 规避 |
|---|---|
| 新增 stream 后旧版 WMS 不消费 | iter-26 同步部署 WMS handler，没旧版兼容问题 |
| consumer group 命名冲突 | wms-oms-cancel-group / wms-oms-refund-approved-group / wms-oms-refund-refunded-group 独立 |
| 财务双写灾难 | order confirm tx 内 + try/catch 兜底；refund markRefunded 同理 |
| 重复触发 settlement | (type, ref_no) UNIQUE 兜底 + 业务层先查再插 |
| 对账跨库慢 | inventory 表数据量小，单次 GROUP BY ~10ms |
| OMS 推事件失败拖垮主流程 | EventBus.publish 内已有 try/catch，业务侧也加 try 不阻塞 |
| WMS audit log 体量 | 当前事件量 / 日 < 100，不分表 |

## 六、待用户运行验证（3 步）
1. **migrations**：
   ```bash
   docker-compose exec oms-backend php think migrate:run
   docker-compose exec wms-backend php think migrate:run
   ```
2. **重启 oms + wms**：
   ```bash
   docker-compose restart oms-backend wms-backend
   ```
3. **Vue 自动热更**

## 七、剩余非阻塞（M3+）
- Q26-01：webhook 推送给小程序 / 第三方
- Q26-02：财务结算单加退款审批流（"财务复核"按钮）
- Q26-03：对账自动修复（双侧确认后）
- Q26-04：settlement 加多币种 / 多支付方式
- Q26-05：OMS 推事件加签名（HMAC）+ TLS（生产环境）
