# Data Schema · 数据结构（架构 Agent 产物 2/6）

> 17 张表 + 索引设计 + 关系图。开发 Agent 严格按此生成 migration。

## 【当前焦点】

- 数据库：MySQL 8.0
- 字符集：utf8mb4 / utf8mb4_unicode_ci
- 引擎：InnoDB（事务支持）
- 命名规范：表名复数 + snake_case；字段 snake_case；主键 `id` bigint unsigned auto_increment
- 通用字段：`created_at`、`updated_at`、`deleted_at`（软删除）TIMESTAMP NULL

## 表清单

| # | 表名 | 模块 | 行数预估（1 年） |
|---|------|------|---------------|
| 1 | users | 用户 | 50k |
| 2 | companies | 用户 | 5k |
| 3 | addresses | 用户 | 30k |
| 4 | categories | 商品 | 100 |
| 5 | products | 商品 | 5k |
| 6 | skus | 商品 | 20k |
| 7 | sku_specs | 商品 | 100k |
| 8 | price_tiers | 商品 | 60k |
| 9 | carts | 交易 | 30k |
| 10 | cart_items | 交易 | 150k |
| 11 | orders | 交易 | 100k |
| 12 | order_items | 交易 | 500k |
| 13 | payments | 交易 | 120k |
| 14 | invoices | 交易 | 100k |
| 15 | ai_conversations | AI | 200k |
| 16 | ai_messages | AI | 2M |
| 17 | ai_quotations | AI | 50k |
| 18 | knowledge_base | AI（存 MySQL；embedding 存 pgvector） | 10k |
| 19 | refunds | 交易 | 5k |
| 20 | stock_logs | 商品 | 200k |
| 21 | order_logs | 交易 | 500k |
| 22 | sms_logs | 系统 | 200k |
| 23 | notifications | 系统 | 500k |
| 24 | service_tickets | AI | 5k |

总计：**24 表**（PRD 补充包给的 17 张为业务核心，本表加入了系统日志类）

---

## 1. 用户模块

### users（用户主表）

```sql
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NULL COMMENT '手机号',
  password VARCHAR(255) NULL COMMENT 'bcrypt 加密',
  wechat_openid VARCHAR(64) NULL COMMENT '微信 OpenID',
  wechat_unionid VARCHAR(64) NULL,
  name VARCHAR(64) NULL,
  email VARCHAR(128) NULL,
  avatar_url VARCHAR(512) NULL,
  role ENUM('individual','enterprise','admin') DEFAULT 'individual',
  active_role ENUM('individual','enterprise') DEFAULT 'individual' COMMENT '当前激活角色',
  company_id BIGINT UNSIGNED NULL,
  status ENUM('active','locked','disabled') DEFAULT 'active',
  last_login_at TIMESTAMP NULL,
  last_login_ip VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uniq_phone (phone),
  UNIQUE KEY uniq_wechat_openid (wechat_openid),
  KEY idx_company_id (company_id),
  KEY idx_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户主表';
```

### companies（企业认证）

```sql
CREATE TABLE companies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL COMMENT '认证发起人',
  name VARCHAR(128) NOT NULL,
  credit_code VARCHAR(20) NOT NULL COMMENT '统一社会信用代码',
  license_url VARCHAR(512) NOT NULL COMMENT '营业执照 OSS URL',
  contact_name VARCHAR(64) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reject_reason VARCHAR(512) NULL,
  reviewer_id BIGINT UNSIGNED NULL COMMENT '审核管理员 user_id',
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_credit_code (credit_code),
  KEY idx_user_id (user_id),
  KEY idx_status (status)
) ENGINE=InnoDB COMMENT='企业认证';
```

### addresses（收货地址）

```sql
CREATE TABLE addresses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  receiver_name VARCHAR(64) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  province VARCHAR(32) NOT NULL,
  city VARCHAR(32) NOT NULL,
  district VARCHAR(32) NOT NULL,
  detail VARCHAR(255) NOT NULL,
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  KEY idx_user_id (user_id),
  KEY idx_user_default (user_id, is_default)
) ENGINE=InnoDB COMMENT='收货地址';
```

## 2. 商品模块

### categories（分类）

```sql
CREATE TABLE categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT UNSIGNED NULL,
  name VARCHAR(64) NOT NULL,
  slug VARCHAR(64) NOT NULL,
  icon_url VARCHAR(512) NULL,
  sort_order INT DEFAULT 0,
  param_template JSON NULL COMMENT '参数模板（如密度/抗伸强度）',
  status ENUM('active','disabled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_slug (slug),
  KEY idx_parent_id (parent_id)
) ENGINE=InnoDB COMMENT='商品分类';
```

### products（商品主表）

```sql
CREATE TABLE products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(128) NOT NULL COMMENT '型号',
  keywords VARCHAR(512) NULL COMMENT '搜索关键词，逗号分隔',
  main_image_url VARCHAR(512) NULL,
  detail_images JSON NULL COMMENT '详情图数组',
  description TEXT NULL,
  spec_pdf_url VARCHAR(512) NULL COMMENT '规格书 PDF',
  status ENUM('draft','active','inactive') DEFAULT 'draft',
  view_count BIGINT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  KEY idx_category_id (category_id),
  KEY idx_status (status),
  FULLTEXT KEY ft_search (name, model, keywords) /* MySQL 8 InnoDB 全文索引 */
) ENGINE=InnoDB COMMENT='商品主表';
```

### skus（SKU）

```sql
CREATE TABLE skus (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  sku_code VARCHAR(64) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL COMMENT '基础单价',
  stock INT UNSIGNED DEFAULT 0,
  stock_threshold INT UNSIGNED DEFAULT 10 COMMENT '低库存预警阈值',
  status ENUM('active','disabled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_sku_code (sku_code),
  KEY idx_product_id (product_id),
  KEY idx_stock (stock)
) ENGINE=InnoDB COMMENT='SKU';
```

### sku_specs（SKU 参数属性）

```sql
CREATE TABLE sku_specs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku_id BIGINT UNSIGNED NOT NULL,
  spec_key VARCHAR(64) NOT NULL COMMENT '参数键如 thickness/density',
  spec_value VARCHAR(128) NOT NULL,
  spec_unit VARCHAR(16) NULL COMMENT '单位如 mm/g/cm³',
  KEY idx_sku_id (sku_id),
  KEY idx_key (spec_key)
) ENGINE=InnoDB COMMENT='SKU 参数';
```

### price_tiers（阶梯价）

```sql
CREATE TABLE price_tiers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku_id BIGINT UNSIGNED NOT NULL,
  min_qty INT UNSIGNED NOT NULL,
  max_qty INT UNSIGNED NULL COMMENT 'NULL 表示无上限',
  unit_price DECIMAL(10,2) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sku_qty (sku_id, min_qty)
) ENGINE=InnoDB COMMENT='阶梯价';
```

## 3. 交易模块

### carts / cart_items

```sql
CREATE TABLE carts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  active_role ENUM('individual','enterprise') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_role (user_id, active_role)
) ENGINE=InnoDB;

CREATE TABLE cart_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cart_id BIGINT UNSIGNED NOT NULL,
  sku_id BIGINT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL,
  selected TINYINT(1) DEFAULT 1,
  snapshot_price DECIMAL(10,2) NULL COMMENT '加入时的单价',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cart_id (cart_id),
  KEY idx_sku_id (sku_id)
) ENGINE=InnoDB;
```

### orders / order_items

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(32) NOT NULL COMMENT '订单号 yyyymmddNNNNN',
  user_id BIGINT UNSIGNED NOT NULL,
  active_role ENUM('individual','enterprise') NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  product_amount DECIMAL(10,2) NOT NULL,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  status ENUM(
    'pending_payment','pending_review','pending_shipment','shipped',
    'received','completed','cancelled','refunding','refunded'
  ) DEFAULT 'pending_payment',
  shipping_method ENUM('standard','express') DEFAULT 'standard',
  shipping_address JSON NOT NULL COMMENT '冗余存地址（避免后续修改影响）',
  invoice_id BIGINT UNSIGNED NULL,
  remark VARCHAR(512) NULL,
  cancel_reason VARCHAR(255) NULL,
  cancelled_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,
  shipped_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_order_no (order_no),
  KEY idx_user_status (user_id, status),
  KEY idx_status_created (status, created_at)
) ENGINE=InnoDB COMMENT='订单';

CREATE TABLE order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  sku_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(255) NOT NULL COMMENT '冗余存',
  sku_code VARCHAR(64) NOT NULL COMMENT '冗余存',
  product_image VARCHAR(512) NULL,
  qty INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  tracking_no VARCHAR(64) NULL COMMENT '物流单号（部分发货按行）',
  tracking_company VARCHAR(64) NULL,
  shipped_at TIMESTAMP NULL,
  KEY idx_order_id (order_id),
  KEY idx_sku_id (sku_id)
) ENGINE=InnoDB;
```

### payments / refunds / invoices

```sql
CREATE TABLE payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  payment_no VARCHAR(64) NOT NULL,
  method ENUM('wechat','alipay','bank_transfer') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','success','failed','refunded') DEFAULT 'pending',
  transaction_id VARCHAR(128) NULL COMMENT '第三方流水号',
  voucher_url VARCHAR(512) NULL COMMENT '对公转账凭证',
  paid_at TIMESTAMP NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_payment_no (payment_no),
  UNIQUE KEY uniq_transaction_id (transaction_id),
  KEY idx_order_status (order_id, status)
) ENGINE=InnoDB;

CREATE TABLE refunds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  refund_no VARCHAR(64) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(512) NOT NULL,
  status ENUM('pending','approved','rejected','refunding','refunded') DEFAULT 'pending',
  reject_reason VARCHAR(512) NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  refunded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_refund_no (refund_no),
  KEY idx_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(128) NOT NULL,
  type ENUM('personal','vat_normal','vat_special') NOT NULL,
  tax_no VARCHAR(20) NULL,
  bank VARCHAR(64) NULL,
  bank_account VARCHAR(32) NULL,
  contact_phone VARCHAR(20) NULL,
  contact_address VARCHAR(255) NULL,
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user (user_id)
) ENGINE=InnoDB;
```

## 4. AI 模块

### ai_conversations / ai_messages

```sql
CREATE TABLE ai_conversations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL COMMENT '未登录用户可为 null',
  session_id VARCHAR(64) NOT NULL COMMENT '匿名会话标识',
  source ENUM('detail_page','global_chat','inquiry_form','floating') NOT NULL,
  intent ENUM('quotation','presale','order','aftersale','chitchat','other') NULL,
  context_json JSON NULL COMMENT '上下文（已采集参数等）',
  transferred TINYINT(1) DEFAULT 0 COMMENT '是否已转人工',
  transferred_at TIMESTAMP NULL,
  is_business TINYINT(1) DEFAULT 1 COMMENT '0 表示闲聊',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  KEY idx_session (session_id),
  KEY idx_source (source)
) ENGINE=InnoDB;

CREATE TABLE ai_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_type ENUM('user','ai','human') NOT NULL,
  content TEXT NOT NULL,
  confidence DECIMAL(5,2) NULL COMMENT 'AI 置信度 0-1',
  meta JSON NULL COMMENT '附加（如召回的 knowledge_ids）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_conversation_created (conversation_id, created_at)
) ENGINE=InnoDB;
```

### ai_quotations（AI 报价单）

```sql
CREATE TABLE ai_quotations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quotation_no VARCHAR(32) NOT NULL,
  conversation_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  items JSON NOT NULL COMMENT '报价单明细数组',
  total_amount DECIMAL(10,2) NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  status ENUM('active','used','expired','cancelled') DEFAULT 'active',
  pdf_url VARCHAR(512) NULL,
  order_id BIGINT UNSIGNED NULL COMMENT '转下单后的订单',
  remark VARCHAR(512) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_quotation_no (quotation_no),
  KEY idx_user_status (user_id, status)
) ENGINE=InnoDB;
```

### knowledge_base（知识库 - MySQL 存内容）

```sql
CREATE TABLE knowledge_base (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(64) NOT NULL,
  keywords VARCHAR(512) NULL,
  scenes JSON NULL,
  status ENUM('draft','pending_review','active','disabled') DEFAULT 'draft',
  reviewer_id BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  embedding_version INT UNSIGNED DEFAULT 0 COMMENT 'pgvector 端版本号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  KEY idx_category (category),
  KEY idx_status (status),
  FULLTEXT KEY ft_kb (title, content, keywords)
) ENGINE=InnoDB;
```

### service_tickets（AI 转人工工单）

```sql
CREATE TABLE service_tickets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_no VARCHAR(32) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  conversation_id BIGINT UNSIGNED NULL,
  type ENUM('aftersale','presale','other') NOT NULL,
  priority ENUM('normal','high','urgent') DEFAULT 'normal',
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('open','assigned','processing','closed') DEFAULT 'open',
  assignee_id BIGINT UNSIGNED NULL,
  closed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ticket_no (ticket_no),
  KEY idx_status_priority (status, priority)
) ENGINE=InnoDB;
```

## 5. 系统日志

```sql
CREATE TABLE stock_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku_id BIGINT UNSIGNED NOT NULL,
  delta INT NOT NULL COMMENT '正为入库负为出库',
  stock_after INT NOT NULL,
  reason ENUM('purchase','order','manual','refund','correction') NOT NULL,
  related_order_id BIGINT UNSIGNED NULL,
  operator_id BIGINT UNSIGNED NULL,
  remark VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sku_created (sku_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE order_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  operator_id BIGINT UNSIGNED NULL,
  operator_type ENUM('user','admin','system') NOT NULL,
  remark VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_order_created (order_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE sms_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  template VARCHAR(64) NOT NULL,
  content VARCHAR(255) NOT NULL,
  status ENUM('sent','failed','received') DEFAULT 'sent',
  vendor VARCHAR(32) NOT NULL,
  vendor_response JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_phone_created (phone, created_at)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  data JSON NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_read (user_id, read_at)
) ENGINE=InnoDB;
```

## 6. PostgreSQL（向量库 · pgvector）

```sql
-- 在独立 PostgreSQL 实例
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE kb_embeddings (
  id BIGSERIAL PRIMARY KEY,
  kb_id BIGINT NOT NULL COMMENT '对应 MySQL knowledge_base.id',
  embedding vector(768) NOT NULL,
  text TEXT NOT NULL,
  category VARCHAR(64) NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (kb_id, version)
);

CREATE INDEX idx_kb_embedding ON kb_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_kb_category ON kb_embeddings (category);
```

## 7. 关系图（文字版）

```
users 1—N addresses
users 1—1 companies (企业认证后)
users 1—N carts (按 active_role 区分)
carts 1—N cart_items
cart_items N—1 skus
products 1—N skus
products N—1 categories
categories 1—N categories (二级分类)
skus 1—N sku_specs
skus 1—N price_tiers
users 1—N orders
orders 1—N order_items
order_items N—1 skus
orders 1—N payments
orders 1—N refunds
orders N—1 invoices (可选)
users 1—N ai_conversations
ai_conversations 1—N ai_messages
ai_conversations 1—1 ai_quotations (可选)
ai_quotations N—1 orders (转下单)
knowledge_base 1—N kb_embeddings (pgvector)
skus 1—N stock_logs
orders 1—N order_logs
users 1—N notifications
```

## 8. 索引设计原则

- 高频查询字段必建索引（如 `orders.user_id`、`orders.status`、`ai_conversations.session_id`）
- 多列复合索引按选择性排列（如 `(status, created_at)` 用于状态+时间倒序）
- 不在低基数字段（如 `status`）单独建索引，必须组合高基数列
- 全文索引使用 InnoDB FULLTEXT（products / knowledge_base）

## 9. 字符集与时区

- 字符集：utf8mb4 / utf8mb4_unicode_ci
- 时区：MySQL 设 `+08:00`，应用层用 Carbon 处理
