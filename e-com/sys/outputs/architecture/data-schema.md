# data-schema.md · 4 库数据模型与建表 SQL

## 【当前焦点】
按 4 个独立 database（shop_db / pim_db / oms_db / wms_db）给出 MVP 范围内的核心表 + CREATE TABLE 完整 SQL。
所有表使用 InnoDB + utf8mb4_unicode_ci。所有金额以"分"为单位的 BIGINT 存储。

## 本任务匹配到的 skill 清单
- 架构 Agent 当前无强匹配 skill

## 命名约定
- 表名：snake_case 单数（users / orders）
- 主键：`id BIGINT UNSIGNED AUTO_INCREMENT`
- 软删除：`deleted_at DATETIME NULL`（统一约定）
- 时间戳：`created_at` / `updated_at` 默认 CURRENT_TIMESTAMP
- 唯一编码：`code` / `*_no` / `*_code`
- 状态：枚举 ENUM 或 VARCHAR(20)
- 金额：BIGINT，单位"分"
- 引用外键：本期**不建外键约束**（跨工程不靠 DB 维护，靠业务层保证）

---

## 一、shop_db（商城后端）

### 1.1 users 用户表
```sql
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `nickname` VARCHAR(50) DEFAULT NULL,
  `avatar_url` VARCHAR(500) DEFAULT NULL,
  `last_address_snapshot` JSON DEFAULT NULL COMMENT '最近一次下单地址快照',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active/blocked',
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城用户';
```

### 1.2 cart 购物车
```sql
CREATE TABLE `cart` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `qty` INT UNSIGNED NOT NULL,
  `selected` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_sku` (`user_id`, `sku_code`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车';
```

### 1.3 sms_log 验证码日志（开发用，生产可不存）
```sql
CREATE TABLE `sms_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone` VARCHAR(20) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `purpose` VARCHAR(20) NOT NULL COMMENT 'login/register/reset',
  `success` TINYINT(1) NOT NULL DEFAULT 0,
  `ip` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone_time` (`phone`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='验证码下发日志';
```

### 1.4 dead_letter 死信队列（本工程消费失败的 Stream 事件）
```sql
CREATE TABLE `dead_letter` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stream` VARCHAR(100) NOT NULL,
  `event_id` VARCHAR(100) NOT NULL,
  `payload` JSON NOT NULL,
  `error` TEXT,
  `retry_count` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stream` (`stream`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='死信队列';
```

---

## 二、pim_db（PIM 后端）

### 2.1 categories 类目
```sql
CREATE TABLE `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `parent_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 表示根',
  `level` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1-5',
  `sort` INT NOT NULL DEFAULT 0,
  `attr_template_id` BIGINT UNSIGNED DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'enabled',
  `icon_url` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='类目';
```

### 2.2 attributes 属性
```sql
CREATE TABLE `attributes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('text','number','single_select','multi_select','date','image') NOT NULL,
  `group_name` VARCHAR(50) NOT NULL DEFAULT '基础信息',
  `required` TINYINT(1) NOT NULL DEFAULT 0,
  `searchable` TINYINT(1) NOT NULL DEFAULT 0,
  `filterable` TINYINT(1) NOT NULL DEFAULT 0,
  `is_sales_attr` TINYINT(1) NOT NULL DEFAULT 0,
  `options` JSON DEFAULT NULL COMMENT '单选/多选时的可选值',
  `min` INT DEFAULT NULL,
  `max` INT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'enabled',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='属性';
```

### 2.3 attr_templates 属性模板
```sql
CREATE TABLE `attr_templates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `attr_ids` JSON NOT NULL COMMENT 'attributes.id 数组',
  `status` VARCHAR(20) NOT NULL DEFAULT 'enabled',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='属性模板';
```

### 2.4 brands 品牌
```sql
CREATE TABLE `brands` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `desc` VARCHAR(500) DEFAULT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'enabled',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品牌';
```

### 2.5 spus SPU 商品
```sql
CREATE TABLE `spus` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `brand_id` BIGINT UNSIGNED DEFAULT NULL,
  `selling_points` JSON DEFAULT NULL COMMENT '卖点数组 ≤ 5',
  `main_images` JSON NOT NULL COMMENT '主图 url 数组 1-5',
  `detail_html` MEDIUMTEXT COMMENT '富文本详情',
  `base_price` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '基础价（分）',
  `attrs` JSON DEFAULT NULL COMMENT '关键属性值',
  `status` ENUM('draft','published','offline') NOT NULL DEFAULT 'draft',
  `published_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_category` (`category_id`),
  KEY `idx_brand` (`brand_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SPU';
```

### 2.6 skus SKU
```sql
CREATE TABLE `skus` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku_code` VARCHAR(64) NOT NULL,
  `spu_id` BIGINT UNSIGNED NOT NULL,
  `sales_attrs` JSON NOT NULL COMMENT '销售属性值 如 {"color":"黑","size":"256G"}',
  `price` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '售价（分）',
  `image_url` VARCHAR(500) DEFAULT NULL COMMENT '为空时用 SPU 主图',
  `barcode` VARCHAR(64) DEFAULT NULL,
  `weight` DECIMAL(10,3) DEFAULT NULL COMMENT '单位 kg',
  `volume` DECIMAL(10,3) DEFAULT NULL COMMENT '单位 m³',
  `status` ENUM('enabled','disabled') NOT NULL DEFAULT 'enabled',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku_code` (`sku_code`),
  UNIQUE KEY `uk_barcode` (`barcode`),
  KEY `idx_spu` (`spu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SKU';
```

### 2.7 dead_letter（同 shop_db）
```sql
CREATE TABLE `dead_letter` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stream` VARCHAR(100) NOT NULL,
  `event_id` VARCHAR(100) NOT NULL,
  `payload` JSON NOT NULL,
  `error` TEXT,
  `retry_count` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stream` (`stream`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='死信队列';
```

---

## 三、oms_db（OMS 后端）

### 3.1 orders 订单
```sql
CREATE TABLE `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('pending_pay','paid','picking','shipped','completed','cancelled','exception') NOT NULL DEFAULT 'pending_pay',
  `total_amount` BIGINT UNSIGNED NOT NULL COMMENT '应付总额（分）',
  `goods_amount` BIGINT UNSIGNED NOT NULL,
  `freight` BIGINT UNSIGNED NOT NULL DEFAULT 1000 COMMENT '运费 默认 ¥10 = 1000 分',
  `discount` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `address` JSON NOT NULL COMMENT '收货地址快照',
  `remark` VARCHAR(500) DEFAULT NULL,
  `idempotency_key` VARCHAR(64) DEFAULT NULL,
  `paid_at` DATETIME DEFAULT NULL,
  `shipped_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `cancelled_at` DATETIME DEFAULT NULL,
  `cancel_reason` VARCHAR(50) DEFAULT NULL,
  `express_no` VARCHAR(64) DEFAULT NULL,
  `trace_id` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  UNIQUE KEY `uk_idempotency` (`idempotency_key`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_status_created` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单主表';
```

### 3.2 order_items 订单明细
```sql
CREATE TABLE `order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `sku_snapshot` JSON NOT NULL COMMENT '下单时 SKU 快照（名称/图/规格/价格）',
  `qty` INT UNSIGNED NOT NULL,
  `unit_price` BIGINT UNSIGNED NOT NULL,
  `subtotal` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_sku` (`sku_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细';
```

### 3.3 order_status_log 状态变更日志
```sql
CREATE TABLE `order_status_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL,
  `from_status` VARCHAR(20) NOT NULL,
  `to_status` VARCHAR(20) NOT NULL,
  `operator` VARCHAR(64) DEFAULT NULL COMMENT 'user_id/system/wms/payment',
  `source` VARCHAR(50) DEFAULT NULL,
  `remark` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_no`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单状态日志';
```

### 3.4 inventory_status 四态库存
```sql
CREATE TABLE `inventory_status` (
  `sku_code` VARCHAR(64) NOT NULL,
  `available` INT NOT NULL DEFAULT 0 COMMENT '可用 = 实物 - locked - reserved',
  `locked` INT NOT NULL DEFAULT 0 COMMENT '下单锁定',
  `reserved` INT NOT NULL DEFAULT 0 COMMENT '换货预留（M1 固定 0）',
  `buffer_qty` INT NOT NULL DEFAULT 0 COMMENT '大促安全垫（M1 默认 0）',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sku_code`),
  CHECK (`available` >= 0 AND `locked` >= 0 AND `reserved` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OMS 库存四态';
```

### 3.5 inventory_log 库存流水
```sql
CREATE TABLE `inventory_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku_code` VARCHAR(64) NOT NULL,
  `change_type` ENUM('lock','unlock','reserve','release_reserve','outbound','adjust') NOT NULL,
  `change_qty` INT NOT NULL COMMENT '正负',
  `before_available` INT NOT NULL,
  `after_available` INT NOT NULL,
  `before_locked` INT NOT NULL,
  `after_locked` INT NOT NULL,
  `related_order` VARCHAR(32) DEFAULT NULL,
  `operator` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sku_time` (`sku_code`, `created_at`),
  KEY `idx_related` (`related_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OMS 库存流水（append-only）';
```

### 3.6 picking_orders 拣货单（OMS 视角）
```sql
CREATE TABLE `picking_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `picking_no` VARCHAR(32) NOT NULL,
  `order_no` VARCHAR(32) NOT NULL,
  `warehouse_code` VARCHAR(32) NOT NULL,
  `status` ENUM('sent','accepted','shipped','failed') NOT NULL DEFAULT 'sent',
  `retry_count` INT NOT NULL DEFAULT 0,
  `last_error` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_picking_no` (`picking_no`),
  KEY `idx_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OMS 拣货单（下发 WMS）';
```

### 3.7 finance_log 财务日志（本地不外推）
```sql
CREATE TABLE `finance_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL,
  `event` VARCHAR(50) NOT NULL COMMENT 'order_completed / refund',
  `amount` BIGINT NOT NULL,
  `payload` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='财务日志';
```

### 3.8 inventory_reconcile_log 对账差异日志
```sql
CREATE TABLE `inventory_reconcile_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku_code` VARCHAR(64) NOT NULL,
  `oms_available` INT NOT NULL,
  `oms_locked` INT NOT NULL,
  `wms_quantity` INT NOT NULL,
  `wms_locked` INT NOT NULL,
  `diff` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sku_time` (`sku_code`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存对账差异';
```

### 3.9 dead_letter（同上）
（结构同 shop_db.dead_letter）

---

## 四、wms_db（WMS 后端）

### 4.1 users 用户（WMS 独立账号体系）
```sql
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(50) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='WMS 用户';
```

### 4.2 roles 角色
```sql
CREATE TABLE `roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `permissions` JSON NOT NULL COMMENT '权限码数组',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='WMS 角色';

-- 种子数据（init）
INSERT INTO roles (code, name, permissions) VALUES
('admin', '管理员', '["*"]'),
('supervisor', '主管', '["inbound.*","outbound.*","inventory.read","approval.*","report.*"]'),
('receiver', '收货员', '["inbound.receive","inbound.shelf"]'),
('picker', '拣货员', '["picking.*"]'),
('reviewer', '复核员', '["outbound.review","outbound.ship"]'),
('operator', '运营', '["inventory.read","report.*"]');
```

### 4.3 user_warehouse 用户-仓库关联（数据权限）
```sql
CREATE TABLE `user_warehouse` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `warehouse_code` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`user_id`, `warehouse_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户可访问仓库';
```

### 4.4 products SKU 主数据
```sql
CREATE TABLE `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku_code` VARCHAR(64) NOT NULL,
  `sku_name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `unit` VARCHAR(20) NOT NULL DEFAULT '件',
  `spec` VARCHAR(200) DEFAULT NULL,
  `weight` DECIMAL(10,3) NOT NULL,
  `volume` DECIMAL(10,3) DEFAULT NULL,
  `price` BIGINT UNSIGNED DEFAULT NULL,
  `shelf_life_days` INT DEFAULT 0,
  `abc_level` ENUM('A','B','C') DEFAULT 'B',
  `safety_stock` INT NOT NULL DEFAULT 0,
  `golden_location_priority` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('enabled','disabled') NOT NULL DEFAULT 'enabled',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku_code` (`sku_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='WMS SKU 主数据';
```

### 4.5 warehouses 仓库
```sql
CREATE TABLE `warehouses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `warehouse_code` VARCHAR(32) NOT NULL,
  `warehouse_name` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `contact` VARCHAR(50) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('enabled','disabled') NOT NULL DEFAULT 'enabled',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`warehouse_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='仓库';

-- 种子数据
INSERT INTO warehouses (warehouse_code, warehouse_name, address) VALUES
('W001', '主仓', '深圳市南山区科技园 1 号');
```

### 4.6 locations 库位
```sql
CREATE TABLE `locations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_code` VARCHAR(32) NOT NULL,
  `warehouse_code` VARCHAR(32) NOT NULL,
  `zone` VARCHAR(10) NOT NULL,
  `rack` VARCHAR(10) NOT NULL,
  `level` VARCHAR(10) NOT NULL,
  `location_type` ENUM('storage','picking','staging','return','damaged') NOT NULL DEFAULT 'storage',
  `max_weight` DECIMAL(10,3) NOT NULL,
  `max_volume` DECIMAL(10,3) DEFAULT NULL,
  `is_golden` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('available','occupied','locked','disabled') NOT NULL DEFAULT 'available',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_location_code` (`location_code`),
  KEY `idx_warehouse_zone` (`warehouse_code`, `zone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库位';
```

### 4.7 inbound_orders 入库单
```sql
CREATE TABLE `inbound_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inbound_no` VARCHAR(32) NOT NULL,
  `warehouse_code` VARCHAR(32) NOT NULL,
  `source_type` ENUM('purchase','return','transfer','init') NOT NULL,
  `status` ENUM('pending','receiving','received','shelved','cancelled') NOT NULL DEFAULT 'pending',
  `operator_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inbound_no` (`inbound_no`),
  KEY `idx_warehouse_status` (`warehouse_code`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单';
```

### 4.8 inbound_items 入库明细
```sql
CREATE TABLE `inbound_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inbound_no` VARCHAR(32) NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `expected_qty` INT NOT NULL,
  `actual_qty` INT NOT NULL DEFAULT 0,
  `shelved_qty` INT NOT NULL DEFAULT 0,
  `batch_no` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_inbound` (`inbound_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库明细';
```

### 4.9 difference_reports 差异报告
```sql
CREATE TABLE `difference_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inbound_no` VARCHAR(32) NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `expected_qty` INT NOT NULL,
  `actual_qty` INT NOT NULL,
  `diff` INT NOT NULL,
  `reason` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approver_id` BIGINT UNSIGNED DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inbound_status` (`inbound_no`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收货差异';
```

### 4.10 inventory 库存表（核心）
```sql
CREATE TABLE `inventory` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku_code` VARCHAR(64) NOT NULL,
  `location_code` VARCHAR(32) NOT NULL,
  `batch_no` VARCHAR(64) NOT NULL DEFAULT 'INIT',
  `status` ENUM('normal','frozen','pending','damaged') NOT NULL DEFAULT 'normal',
  `quantity` INT NOT NULL DEFAULT 0,
  `locked_quantity` INT NOT NULL DEFAULT 0,
  `production_date` DATE DEFAULT NULL,
  `inbound_date` DATE DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku_loc_batch_status` (`sku_code`,`location_code`,`batch_no`,`status`),
  KEY `idx_sku` (`sku_code`),
  KEY `idx_location` (`location_code`),
  CHECK (`quantity` >= 0 AND `locked_quantity` >= 0 AND `locked_quantity` <= `quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='WMS 实物库存';
```

### 4.11 inventory_log 库存流水（WMS）
```sql
CREATE TABLE `inventory_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku_code` VARCHAR(64) NOT NULL,
  `location_code` VARCHAR(32) NOT NULL,
  `batch_no` VARCHAR(64) NOT NULL DEFAULT 'INIT',
  `change_type` ENUM('inbound','outbound','move_out','move_in','adjust_in','adjust_out','lock','unlock','freeze','unfreeze') NOT NULL,
  `change_qty` INT NOT NULL,
  `before_qty` INT NOT NULL,
  `after_qty` INT NOT NULL,
  `related_order` VARCHAR(32) DEFAULT NULL,
  `transaction_id` VARCHAR(64) DEFAULT NULL COMMENT '同一动作的多条流水关联',
  `operator_id` BIGINT UNSIGNED DEFAULT NULL,
  `remark` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sku_time` (`sku_code`, `created_at`),
  KEY `idx_related` (`related_order`),
  KEY `idx_transaction` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='WMS 库存流水';
```

### 4.12 outbound_orders 出库单
```sql
CREATE TABLE `outbound_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `outbound_no` VARCHAR(32) NOT NULL COMMENT '即来自 OMS 的 picking_no',
  `oms_order_no` VARCHAR(32) NOT NULL,
  `warehouse_code` VARCHAR(32) NOT NULL,
  `status` ENUM('pending_alloc','allocated','picking','picked','reviewed','packed','shipped','cancelled','shortage') NOT NULL DEFAULT 'pending_alloc',
  `idempotency_key` VARCHAR(64) DEFAULT NULL,
  `express_company` VARCHAR(50) DEFAULT NULL,
  `express_no` VARCHAR(64) DEFAULT NULL,
  `address` JSON NOT NULL,
  `picker_id` BIGINT UNSIGNED DEFAULT NULL,
  `reviewer_id` BIGINT UNSIGNED DEFAULT NULL,
  `picked_at` DATETIME DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `shipped_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_outbound_no` (`outbound_no`),
  UNIQUE KEY `uk_idempotency` (`idempotency_key`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单';
```

### 4.13 outbound_items 出库明细
```sql
CREATE TABLE `outbound_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `outbound_no` VARCHAR(32) NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `qty` INT UNSIGNED NOT NULL,
  `picked_qty` INT NOT NULL DEFAULT 0,
  `location_code` VARCHAR(32) DEFAULT NULL COMMENT '分配的库位',
  `batch_no` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_outbound` (`outbound_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库明细';
```

### 4.14 picking_tasks 拣货任务（给 PDA）
```sql
CREATE TABLE `picking_tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `outbound_no` VARCHAR(32) NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `location_code` VARCHAR(32) NOT NULL,
  `batch_no` VARCHAR(64) DEFAULT NULL,
  `expected_qty` INT NOT NULL,
  `picked_qty` INT NOT NULL DEFAULT 0,
  `status` ENUM('pending','picked','short') NOT NULL DEFAULT 'pending',
  `picker_id` BIGINT UNSIGNED DEFAULT NULL,
  `picked_at` DATETIME DEFAULT NULL,
  `sort` INT NOT NULL DEFAULT 0 COMMENT '推荐路径顺序',
  PRIMARY KEY (`id`),
  KEY `idx_outbound_status` (`outbound_no`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='PDA 拣货任务';
```

### 4.15 operation_log 操作日志
```sql
CREATE TABLE `operation_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `resource` VARCHAR(100) DEFAULT NULL,
  `before` JSON DEFAULT NULL,
  `after` JSON DEFAULT NULL,
  `ip` VARCHAR(64) DEFAULT NULL,
  `trace_id` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `created_at`),
  KEY `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='WMS 操作日志';
```

### 4.16 dead_letter（同上）

---

## 五、索引与性能要点

| 表 | 高频查询 | 索引设计 |
|---|---|---|
| pim_db.skus | by sku_code | `uk_sku_code` PK 索引覆盖 |
| pim_db.spus | by status + category | `idx_category` + `idx_status` |
| oms_db.orders | by user + status, status + created | `idx_user_status` + `idx_status_created` |
| oms_db.inventory_status | by sku_code（高 QPS）| 主键即 sku_code |
| oms_db.inventory_log | by sku + time | `idx_sku_time` |
| wms_db.inventory | by sku_code（高 QPS）| `idx_sku` |
| wms_db.outbound_orders | by status（拣货员查待办）| `idx_status` |

## 六、外键策略（明确不建）
- 所有 FK 关系在业务层校验，DB 不建 FK 约束
- 原因：4 库独立，跨库不能 FK；同库内不建为了与跨库一致

## 七、备份与恢复（MVP 仅本地）
- 开发环境每日 `docker exec mysql mysqldump` 备份到 `runtime/backup/`（可选）
- 生产备份策略推迟到运维阶段

## 八、迁移（migration）实现
- 每个 PHP 工程的 `database/migrations/` 目录存 ThinkPHP migration 文件
- 命令：`php think migrate:run` 执行
- MVP 阶段每个工程一个初始 migration 文件 = 本文 SQL 内容
