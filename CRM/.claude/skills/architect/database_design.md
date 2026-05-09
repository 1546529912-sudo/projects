# 数据库设计方法 — CRM项目

## 适用场景
架构Agent设计CRM数据库表结构时使用。

---

## 设计原则

1. **从业务出发，不从技术出发**：先搞清楚业务流程，再画ER图，再建表
2. **够用不过度**：不为未来"可能的需求"提前设计复杂结构
3. **命名统一**：表名复数下划线、字段名下划线，全小写
4. **基础字段统一**：所有业务表必须有公共字段

---

## 公共字段规范

所有业务表必须包含以下字段：

```sql
id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY  -- 主键
created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP  -- 创建时间
updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
created_by  BIGINT UNSIGNED NOT NULL   -- 创建人（关联users.id）
updated_by  BIGINT UNSIGNED NOT NULL   -- 最后修改人
is_deleted  TINYINT(1) NOT NULL DEFAULT 0  -- 软删除标志
```

---

## CRM核心表设计参考

### 用户与权限

```sql
-- 用户表
users (
  id, username, email, password_hash,
  full_name, phone, avatar_url,
  role_id, status,  -- status: active/inactive
  last_login_at,
  公共字段...
)

-- 角色表
roles (
  id, name, code,  -- code: admin/manager/sales
  description,
  公共字段...
)

-- 权限表（角色-资源-操作）
permissions (
  id, role_id, resource, action  -- action: view/create/edit/delete
)
```

### 客户管理

```sql
-- 客户表
customers (
  id, name, company, industry,
  phone, email, address, website,
  source,          -- 来源：官网/推荐/展会/电销
  level,           -- 客户等级：A/B/C/D
  status,          -- 状态：潜在/跟进中/已成交/已流失
  owner_id,        -- 负责销售（关联users.id）
  last_contact_at, -- 最后联系时间
  公共字段...
)

-- 客户联系人表（一个客户可有多个联系人）
customer_contacts (
  id, customer_id,
  name, title, phone, email, wechat,
  is_primary,  -- 是否主要联系人
  note,
  公共字段...
)

-- 客户自定义字段值表（支持扩展字段）
customer_field_values (
  id, customer_id, field_key, field_value,
  公共字段...
)
```

### 跟进记录

```sql
-- 跟进记录表
follow_up_records (
  id, customer_id,
  type,         -- 方式：电话/拜访/邮件/微信/会议
  content,      -- 跟进内容（TEXT）
  result,       -- 跟进结果
  next_follow_at,  -- 下次跟进时间
  sales_id,     -- 跟进销售
  公共字段...
)

-- 跟进提醒表
follow_up_reminders (
  id, customer_id, follow_up_record_id,
  remind_at, status,  -- status: pending/done/cancelled
  sales_id,
  公共字段...
)
```

### 销售管理

```sql
-- 商机表
opportunities (
  id, title, customer_id,
  stage,         -- 阶段：初步接触/需求确认/方案报价/谈判中/已成交/已失单
  amount,        -- 金额（DECIMAL 12,2）
  currency,      -- 币种，默认CNY
  probability,   -- 成交概率（0-100）
  expected_close_date,
  lost_reason,   -- 失单原因
  owner_id,
  公共字段...
)

-- 商机阶段变更记录
opportunity_stage_logs (
  id, opportunity_id,
  from_stage, to_stage,
  changed_by, changed_at,
  note
)
```

### 系统设置

```sql
-- 自定义字段定义表
custom_field_definitions (
  id, entity_type,  -- entity_type: customer/opportunity
  field_key, field_label,
  field_type,  -- text/number/date/select/multi_select
  options,     -- JSON，用于select类型的选项
  is_required, sort_order, is_active,
  公共字段...
)

-- 操作日志表
operation_logs (
  id, user_id, entity_type, entity_id,
  action,      -- create/update/delete
  changes,     -- JSON，记录变更前后的值
  ip_address, user_agent,
  created_at
)
```

---

## 索引设计规则

### 必须建索引的场景：
- 外键字段（customer_id、owner_id、user_id 等）
- 状态字段（status、stage、is_deleted）
- 时间字段（created_at、next_follow_at）
- 频繁搜索字段（customers.name、customers.phone）

### 复合索引规则：
- 高频组合查询建复合索引，如：`(owner_id, status, is_deleted)`
- 复合索引字段顺序：区分度高的字段放左边

### 禁止事项：
- 不对TEXT类型字段建索引
- 不为"以后可能用到"的字段提前建索引
- 单表索引数量不超过8个

---

## 数据类型选择规范

| 数据类型 | 选用规则 |
|---|---|
| 主键ID | BIGINT UNSIGNED AUTO_INCREMENT |
| 名称/标题 | VARCHAR(100) |
| 描述/内容 | VARCHAR(500) 或 TEXT |
| 金额 | DECIMAL(12, 2) |
| 状态枚举 | VARCHAR(20)（存英文code） |
| 时间 | DATETIME（存UTC+8，不存时间戳） |
| 布尔值 | TINYINT(1) |
| JSON数据 | JSON 类型（MySQL 5.7+） |
| 手机号 | VARCHAR(20) |
| 邮箱 | VARCHAR(100) |

---

## 输出格式要求

架构Agent输出数据库设计时，必须包含：

```
表名：
用途：（一句话说明这张表是干什么的）
字段列表：（字段名 / 类型 / 约束 / 说明）
索引列表：（索引名 / 字段 / 类型 / 原因）
关联关系：（与哪些表关联，关联关系类型）
```

---

## 输出检查清单
- [ ] 所有业务表包含公共字段
- [ ] 所有外键字段已说明关联关系
- [ ] 金额字段使用DECIMAL
- [ ] 状态枚举已列出所有取值
- [ ] 索引设计已说明原因
- [ ] 未出现"以后再加"的模糊设计
