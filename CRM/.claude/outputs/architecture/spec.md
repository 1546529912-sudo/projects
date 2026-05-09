# CRM 完整架构规范
## Architecture Spec — 登录权限 + 模块一客户管理 P0

> 产出日期：2026-05-05
> 阶段：架构 Agent 第二轮（ARCH_SPEC_READY）
> 状态：用户已确认
> 技术选型：Node 全栈（React + NestJS + Prisma + PostgreSQL + Redis）
> 设计规范：方向 1 Linear Pro

---

## 一、本轮架构范围

本轮只覆盖：

- 用户登录 / 登出
- 基础权限（销售员 / 销售主管 / 管理员）
- 线索录入
- 新建客户
- 编辑客户与高频字段内联编辑
- 客户查重规则
- 疑似重复提交策略
- 查重结果展示
- 线索转化客户
- 客户列表
- 客户详情页
- 客户级别标记
- 客户状态流转与流转规则
- 联系人模块

本轮明确不覆盖：

- P1/P2 的客户分配、归档恢复、重复合并、退款触发等完整流程
- 跟进记录模块的完整 AI/语音链路
- 销售管理模块的完整商机/合同/回款流程
- 数据报表模块
- 系统设置后台的可配置 RBAC、字段配置、工作流配置

---

## 二、总体架构

### 2.1 前端

- `React 18 + TypeScript + Vite`
- `TailwindCSS + shadcn/ui`
- `TanStack Query` 管理服务端状态
- `Zustand` 管理轻量全局状态
- `React Hook Form + Zod` 管理表单与校验
- `TanStack Table` 支撑客户列表、查重列表

### 2.2 后端

- `NestJS + TypeScript`
- `Prisma` 访问 PostgreSQL
- `Passport + JWT` 鉴权
- `Guard + Decorator` 做角色与数据权限控制
- REST API，统一前缀 `/api/v1`

### 2.3 数据与异步任务

- 主库：`PostgreSQL 15`
- 缓存与队列：`Redis 7 + BullMQ`
- 文件：`阿里云 OSS`
- 搜索：首版使用 PostgreSQL `pg_trgm` 模糊搜索

---

## 三、权限模型

### 3.1 角色枚举

首版角色硬编码，不做角色配置后台。

```ts
enum UserRole {
  SALES = "sales",
  MANAGER = "manager",
  ADMIN = "admin",
}
```

### 3.2 数据范围

| 角色 | 客户列表 | 客户详情 | 新建 | 编辑 | 删除 | 转移 |
|---|---|---|---|---|---|---|
| 销售员 | 仅自己负责 | 仅自己负责 | 允许 | 仅自己负责 | 禁止 | 禁止 |
| 销售主管 | 本部门成员 | 本部门成员 | 允许 | 本部门成员 | 禁止 | 允许 |
| 管理员 | 全部 | 全部 | 允许 | 全部 | 允许 | 允许 |

### 3.3 权限落点

- 后端所有客户查询必须经过 `CustomerScopeService`
- 前端隐藏按钮不算权限控制，后端必须二次校验
- 所有写操作记录 `audit_logs`
- 所有客户业务变化记录 `business_events`

---

## 四、数据库设计

字段约定：

- 所有表使用 `id BIGSERIAL PRIMARY KEY`
- 所有业务表包含 `created_at`、`updated_at`
- 软删除表包含 `deleted_at`
- 外键字段使用 `_id` 后缀
- 枚举值使用 snake_case 字符串

### 4.1 users 用户表

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  email VARCHAR(128) UNIQUE,
  phone VARCHAR(32) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('sales', 'manager', 'admin')),
  department_id BIGINT,
  manager_id BIGINT REFERENCES users(id),
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked', 'disabled')),
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_manager_id ON users(manager_id);
```

### 4.2 departments 部门表

```sql
CREATE TABLE departments (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  parent_id BIGINT REFERENCES departments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.3 leads 线索表

```sql
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128),
  company_name VARCHAR(255),
  contact_name VARCHAR(128),
  phone VARCHAR(32),
  email VARCHAR(128),
  source_category VARCHAR(64),
  source_detail VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'converted', 'duplicate_suspected', 'invalid')),
  owner_id BIGINT NOT NULL REFERENCES users(id),
  converted_customer_id BIGINT,
  converted_contact_id BIGINT,
  converted_at TIMESTAMPTZ,
  extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_company_contact ON leads(company_name, contact_name);
```

### 4.4 customers 客户表

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(128),
  company_name VARCHAR(255),
  primary_contact_name VARCHAR(128),
  primary_phone VARCHAR(32),
  primary_email VARCHAR(128),
  level VARCHAR(8) NOT NULL DEFAULT 'C' CHECK (level IN ('A', 'B', 'C', 'D')),
  status VARCHAR(32) NOT NULL DEFAULT 'following' CHECK (status IN ('following', 'interested', 'negotiating', 'won', 'lost')),
  owner_id BIGINT NOT NULL REFERENCES users(id),
  source_lead_id BIGINT REFERENCES leads(id),
  source_category VARCHAR(64),
  source_detail VARCHAR(128),
  duplicate_status VARCHAR(32) NOT NULL DEFAULT 'none' CHECK (duplicate_status IN ('none', 'suspected', 'confirmed', 'ignored')),
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_follow_up_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_customers_owner_id ON customers(owner_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_level ON customers(level);
CREATE INDEX idx_customers_duplicate_status ON customers(duplicate_status);
CREATE INDEX idx_customers_source_lead_id ON customers(source_lead_id);
CREATE INDEX idx_customers_primary_phone ON customers(primary_phone);
CREATE INDEX idx_customers_primary_email ON customers(primary_email);
CREATE INDEX idx_customers_company_contact ON customers(company_name, primary_contact_name);
CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
```

### 4.5 contacts 联系人表

```sql
CREATE TABLE contacts (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  name VARCHAR(128) NOT NULL,
  phone VARCHAR(32),
  email VARCHAR(128),
  position VARCHAR(128),
  decision_role VARCHAR(64) CHECK (decision_role IN ('decision_maker', 'influencer', 'user', 'finance', 'unknown')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_email ON contacts(email);
```

### 4.6 duplicate_candidates 疑似重复表

```sql
CREATE TABLE duplicate_candidates (
  id BIGSERIAL PRIMARY KEY,
  object_type VARCHAR(32) NOT NULL CHECK (object_type IN ('lead', 'customer')),
  object_id BIGINT NOT NULL,
  matched_object_type VARCHAR(32) NOT NULL CHECK (matched_object_type IN ('lead', 'customer')),
  matched_object_id BIGINT NOT NULL,
  match_type VARCHAR(32) NOT NULL CHECK (match_type IN ('phone', 'email', 'company_contact')),
  match_value VARCHAR(255) NOT NULL,
  confidence INT NOT NULL DEFAULT 80,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ignored', 'merged')),
  created_by BIGINT REFERENCES users(id),
  resolved_by BIGINT REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_duplicate_object ON duplicate_candidates(object_type, object_id);
CREATE INDEX idx_duplicate_status ON duplicate_candidates(status);
```

### 4.7 customer_status_histories 客户状态历史

```sql
CREATE TABLE customer_status_histories (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  from_status VARCHAR(32),
  to_status VARCHAR(32) NOT NULL,
  trigger_type VARCHAR(32) NOT NULL CHECK (trigger_type IN ('manual', 'opportunity', 'payment', 'system')),
  reason TEXT,
  changed_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_status_histories_customer_id ON customer_status_histories(customer_id);
```

### 4.8 opportunities 商机表（客户详情关联所需最小模型）

```sql
CREATE TABLE opportunities (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  title VARCHAR(255) NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  stage VARCHAR(32) NOT NULL DEFAULT 'initial_contact',
  owner_id BIGINT NOT NULL REFERENCES users(id),
  expected_close_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX idx_opportunities_owner_id ON opportunities(owner_id);
```

### 4.9 follow_up_records 跟进记录表（客户详情只读关联所需最小模型）

```sql
CREATE TABLE follow_up_records (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  contact_id BIGINT REFERENCES contacts(id),
  content TEXT NOT NULL,
  follow_up_time TIMESTAMPTZ NOT NULL,
  next_follow_up_time TIMESTAMPTZ,
  owner_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_follow_up_customer_id ON follow_up_records(customer_id);
CREATE INDEX idx_follow_up_owner_id ON follow_up_records(owner_id);
CREATE INDEX idx_follow_up_next_time ON follow_up_records(next_follow_up_time);
```

### 4.10 orders 订单表（客户详情关联所需最小模型）

```sql
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  opportunity_id BIGINT REFERENCES opportunities(id),
  order_no VARCHAR(64) UNIQUE NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending_payment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_opportunity_id ON orders(opportunity_id);
```

### 4.11 business_events 业务操作记录

```sql
CREATE TABLE business_events (
  id BIGSERIAL PRIMARY KEY,
  object_type VARCHAR(64) NOT NULL,
  object_id BIGINT NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_events_object ON business_events(object_type, object_id);
```

### 4.12 audit_logs 系统审计日志

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users(id),
  action VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id BIGINT,
  before_data JSONB,
  after_data JSONB,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

---

## 五、核心业务规则

### 5.1 登录规则

- 登录失败统一提示：`账号或密码不正确`
- 连续失败 5 次锁定账号
- 锁定后仅管理员可重置
- 登出后当前 token 进入 Redis blacklist，直到 token 过期
- 默认会话有效期 8 小时

### 5.2 客户状态机

```txt
following -> interested -> negotiating -> won
following -> lost
interested -> lost
negotiating -> lost
```

允许跳级：

- `following -> negotiating`
- `following -> won`
- `interested -> won`

限制回退：

- `won` 不允许手动回退，后续由退款/财务流程处理
- `lost` 不允许普通销售恢复，后续 P1 通过主管审批恢复

状态触发来源：

- `manual`：销售或主管手动调整
- `opportunity`：商机阶段变化触发
- `payment`：回款到账触发
- `system`：系统规则触发

### 5.3 查重规则

查重字段：

1. 手机号
2. 邮箱
3. 公司名称 + 联系人姓名

提交策略：

- 命中强重复也允许提交
- 但必须标记 `duplicate_status = suspected`
- 同时写入 `duplicate_candidates`
- 前端区分“自己的线索/客户”和“他人的线索/客户”
- 销售员不能查看他人完整客户详情，只能看到脱敏提示

### 5.4 客户详情聚合

客户详情接口必须聚合：

- 客户核心信息
- 联系人
- 跟进记录最近 10 条
- 相关商机
- 相关订单
- 自定义字段
- 来源线索
- 状态历史
- 业务操作记录

---

## 六、API 设计

统一响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 6.1 Auth

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/auth/login` | 登录 |
| POST | `/api/v1/auth/logout` | 登出 |
| GET | `/api/v1/auth/me` | 当前用户信息 |

`POST /api/v1/auth/login`

```json
{
  "account": "13800138000",
  "password": "password"
}
```

### 6.2 Leads

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/leads` | 创建线索 |
| GET | `/api/v1/leads/:id/duplicates` | 查看线索疑似重复 |
| POST | `/api/v1/leads/:id/convert` | 线索转化客户 |

线索转化请求：

```json
{
  "createOpportunity": false,
  "customerPatch": {
    "level": "B",
    "ownerId": 1
  }
}
```

### 6.3 Customers

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/customers` | 新建客户 |
| GET | `/api/v1/customers` | 客户列表 |
| GET | `/api/v1/customers/:id` | 客户详情 |
| PATCH | `/api/v1/customers/:id` | 编辑客户 |
| PATCH | `/api/v1/customers/:id/inline-fields` | 高频字段内联编辑 |
| GET | `/api/v1/customers/duplicates/check` | 实时查重 |
| GET | `/api/v1/customers/:id/duplicates` | 查看客户疑似重复 |
| POST | `/api/v1/customers/:id/status` | 客户状态流转 |

客户列表查询参数：

```txt
page
pageSize
keyword
status
level
ownerId
duplicateStatus
sourceCategory
sortBy
sortOrder
```

实时查重查询参数：

```txt
phone
email
companyName
contactName
excludeCustomerId
```

客户状态流转请求：

```json
{
  "toStatus": "negotiating",
  "triggerType": "manual",
  "reason": "客户明确进入报价谈判"
}
```

### 6.4 Contacts

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/customers/:customerId/contacts` | 新建联系人 |
| GET | `/api/v1/customers/:customerId/contacts` | 联系人列表 |
| PATCH | `/api/v1/contacts/:id` | 编辑联系人 |
| DELETE | `/api/v1/contacts/:id` | 删除联系人（软删） |

---

## 七、错误码

| code | HTTP | 含义 |
|---|---|---|
| 0 | 200 | 成功 |
| 10001 | 401 | 未登录或 token 过期 |
| 10002 | 403 | 无权限 |
| 10003 | 423 | 账号已锁定 |
| 20001 | 400 | 参数校验失败 |
| 20002 | 409 | 疑似重复 |
| 20003 | 400 | 状态流转不允许 |
| 20004 | 404 | 资源不存在 |
| 30001 | 502 | 第三方服务不可用 |
| 50001 | 500 | 系统内部错误 |

注意：疑似重复不阻断提交时，接口仍返回 `code = 0`，并在 `data.duplicateWarnings` 中返回提示。

---

## 八、后端模块结构

```txt
apps/api/src/
  main.ts
  app.module.ts
  common/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
    types/
  config/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      jwt.strategy.ts
    users/
      users.service.ts
      users.repository.ts
    permissions/
      permissions.guard.ts
      customer-scope.service.ts
    leads/
      leads.controller.ts
      leads.service.ts
      lead-conversion.service.ts
    customers/
      customers.controller.ts
      customers.service.ts
      customer-status.service.ts
      customer-duplicate.service.ts
      customer-detail.service.ts
    contacts/
      contacts.controller.ts
      contacts.service.ts
    business-events/
    audit-logs/
    integrations/
      qichacha.provider.ts
      tianyancha.provider.ts
  prisma/
    prisma.service.ts
```

## 九、前端模块结构

```txt
apps/web/src/
  app/
    router.tsx
    providers.tsx
  shared/
    api/
    components/
    hooks/
    lib/
    styles/
  features/
    auth/
      pages/LoginPage.tsx
      api/auth.api.ts
    customers/
      pages/CustomerListPage.tsx
      pages/CustomerDetailPage.tsx
      components/CustomerForm.tsx
      components/CustomerTable.tsx
      components/DuplicateWarning.tsx
      components/InlineFieldEditor.tsx
      api/customers.api.ts
      schemas/customer.schema.ts
    contacts/
      components/ContactList.tsx
      components/ContactForm.tsx
```

---

## 十、进度项映射

| progress.md 功能项 | 架构覆盖 |
|---|---|
| 用户登录 / 登出 | `users` 表、Auth API、JWT、锁定规则 |
| 线索录入 | `leads` 表、创建线索 API |
| 新建客户 | `customers` 表、新建客户 API、查重策略 |
| 编辑客户与高频字段内联编辑 | `PATCH /customers/:id`、`inline-fields` API |
| 手机号实时查重 | `customer-duplicate.service`、查重 API |
| 客户查重规则补全 | 手机号、邮箱、公司名 + 联系人组合查重 |
| 疑似重复提交策略 | `duplicate_candidates` 表、允许提交但标记 |
| 查重结果展示 | 重复结果接口、权限脱敏策略 |
| 线索转化客户 | `lead-conversion.service`、事务创建客户与联系人 |
| 客户列表 | 查询 API、权限范围、搜索与筛选索引 |
| 客户详情页 | `customer-detail.service` 聚合详情 |
| 客户详情页完整信息区 | 联系人、跟进、商机、订单、来源线索、自定义字段 |
| 客户级别标记 | `level` 字段、排序筛选 |
| 基础权限 | RBAC + Owner + 部门层级 |
| 客户状态流转 | `customer-status.service`、状态历史 |
| 客户状态流转规则 | 状态机、允许跳级、限制回退 |
| 联系人模块 | `contacts` 表与联系人 API |

---

## 十一、架构风险与待确认

1. P0 暂不做完整 RBAC 配置后台，角色权限硬编码；模块五再做可配置化。
2. 客户详情页关联的跟进、商机、订单本轮只定义最小表结构，完整业务规则分别归属后续模块。
3. 第三方工商数据从 P0 调整到 P1 后，本轮只保留 Provider 目录和接口占位，不实现真实调用。
4. 删除客户首版建议只允许管理员软删，销售侧使用归档流程留到 P1。

---

## 十二、建议回写 progress.md

如果用户确认本架构规范，建议由总负责人将模块一 P0 下列项勾选“架构完成”：

- 用户登录 / 登出
- 线索录入
- 新建客户
- 编辑客户与高频字段内联编辑
- 手机号实时查重
- 客户查重规则补全
- 疑似重复提交策略
- 查重结果展示
- 线索转化客户
- 客户列表
- 客户详情页
- 客户详情页完整信息区
- 客户级别标记
- 基础权限
- 客户状态流转
- 客户状态流转规则
- 联系人模块

---

## 完成信号

ARCH_SPEC_READY
