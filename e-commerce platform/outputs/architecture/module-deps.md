# Module Dependencies · 模块依赖关系（架构 Agent 产物 4/6）

> 中型 SaaS 档位必出。前端 / Laravel / Python / 基础设施分层 + 业务模块依赖。

## 【当前焦点】

- 范围：4 层架构（接入层 / 业务层 / AI 层 / 基础设施层）
- 约束：业务模块尽量松耦合，通过事件 / 队列异步通信

## 1. 整体分层图

```
┌─────────────────────────────────────────────────────────┐
│  接入层 · Frontend                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ 买家 PC  │  │ 后台管理 │  │ AI 抽屉  │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
└────────┼────────────┼─────────────┼────────────────────┘
         │            │             │
         ▼            ▼             ▼
┌─────────────────────────────────────────────────────────┐
│  网关 · Nginx + Sanctum 鉴权                             │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  业务层 · Laravel 11                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │ Auth   │ │Product │ │ Cart   │ │ Order  │ │Payment │ │
│  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ │
│      │         │           │          │         │       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │ Admin  │ │AI Proxy│ │Notify  │ │ Upload │           │
│  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘           │
└──────┼─────────┼───────────┼──────────┼─────────────────┘
       │         │           │          │
       │         ▼           │          │
       │  ┌─────────────────────────────┐│
       │  │  AI 层 · Python FastAPI      ││
       │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐││
       │  │  │意图│ │ RAG│ │报价│ │嵌入│││
       │  │  └────┘ └────┘ └────┘ └────┘││
       │  └─────────────────────────────┘│
       │              │                  │
       ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│  基础设施层                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │ MySQL  │ │ Redis  │ │pgvector│ │ OSS    │ │短信/支付│ │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 2. Laravel 业务模块（命名空间 App\Modules）

### 模块清单

| 模块 | 命名空间 | 依赖 | 对外提供 |
|------|---------|------|---------|
| Auth | `App\Modules\Auth` | Notify, Sms | login / register / wechat |
| User | `App\Modules\User` | Auth | profile / address / invoice |
| Company | `App\Modules\Company` | User, Notify | 企业认证 |
| Catalog | `App\Modules\Catalog` | - | category / product / sku |
| Inventory | `App\Modules\Inventory` | Catalog | stock 读写 + 预扣 |
| Pricing | `App\Modules\Pricing` | Catalog | 阶梯价计算 |
| Cart | `App\Modules\Cart` | Catalog, Pricing | 购物车 |
| Order | `App\Modules\Order` | Cart, Inventory, Pricing, User | 订单 |
| Payment | `App\Modules\Payment` | Order, Notify | 支付、退款 |
| Logistics | `App\Modules\Logistics` | Order | 物流跟踪（快递鸟） |
| AiProxy | `App\Modules\AiProxy` | Catalog, Pricing, Order | 调 FastAPI 转发 |
| Admin | `App\Modules\Admin` | 所有 | 后台 |
| Notify | `App\Modules\Notify` | - | 站内信、短信、邮件 |
| Sms | `App\Modules\Sms` | - | 短信发送 |
| Upload | `App\Modules\Upload` | - | OSS 上传 |

### 依赖图（业务层）

```
Auth → Sms, Notify
User → Auth
Company → User, Notify
Catalog → (root)
Inventory → Catalog
Pricing → Catalog
Cart → Catalog, Pricing
Order → Cart, Inventory, Pricing, User
Payment → Order, Notify
Logistics → Order
AiProxy → Catalog, Pricing, Order
Admin → 所有业务模块
```

### 禁止反向依赖

- ❌ Catalog 不可依赖 Order
- ❌ Inventory 不可依赖 Cart
- ❌ Pricing 不可依赖 Order
- ❌ Notify 不可依赖任何业务模块

如需反向调用 → 通过事件总线（Laravel Events / Listeners）

## 3. Python AI 服务模块

```
ai-service/
├── app/
│   ├── api/                  # FastAPI 路由
│   │   ├── intent.py
│   │   ├── rag.py
│   │   ├── chat.py
│   │   ├── quotation.py
│   │   └── embedding.py
│   ├── services/             # 业务逻辑
│   │   ├── intent_classifier.py
│   │   ├── rag_engine.py
│   │   ├── llm_client.py
│   │   ├── quotation_engine.py
│   │   └── kb_manager.py
│   ├── infra/                # 基础设施适配
│   │   ├── pgvector_client.py
│   │   ├── mysql_client.py
│   │   ├── redis_client.py
│   │   └── llm_provider.py
│   └── main.py
```

### 模块依赖

```
api/* → services/*
services/intent_classifier → infra/llm_provider
services/rag_engine → services/llm_client, infra/pgvector_client
services/quotation_engine → infra/mysql_client (Catalog / SKU)
```

### Python ↔ Laravel 边界

- Python 不直接处理鉴权（由 Laravel 校验后转发）
- Python 调 MySQL 只读 catalog / sku 数据（写操作走 Laravel）
- Python 写 ai_conversations / ai_messages（这是 AI 自己的数据）
- Python 写 pgvector（kb_embeddings）

## 4. 事件总线（异步解耦）

### Laravel Events

| 事件 | 触发点 | 监听者 | 动作 |
|------|--------|--------|------|
| `OrderCreated` | Order::create | Notify, Inventory | 发通知 + 预扣库存 |
| `OrderPaid` | Payment::success | Notify, Inventory, Logistics | 通知用户 + 正式扣库 + 触发发货 |
| `OrderCancelled` | Order::cancel | Inventory, Notify | 释放库存 + 通知 |
| `OrderShipped` | Admin::ship | Notify | 发送物流号 |
| `CompanyApproved` | Admin::companyReview | Notify | 通知用户 |
| `CompanyRejected` | 同上 | Notify | 同上 |
| `RefundApproved` | Admin::refundReview | Payment | 调三方退款 |
| `StockLow` | Inventory（每次扣减后检查） | Notify | 钉钉/邮件通知运营 |
| `KbUpserted` | Admin::kbReview | AiProxy | 异步触发 pgvector 重建 |
| `BadCaseRecorded` | AiProxy | KB | 加入 bad_cases 池 |

### Redis Queue（Laravel Horizon）

| 队列 | 用途 |
|------|------|
| `sms` | 异步发短信 |
| `notify` | 站内信/邮件 |
| `payment-check` | 支付状态主动查询 |
| `order-cancel` | 超时订单取消 |
| `ai-embedding` | 知识库重建 |
| `logistics-sync` | 物流跟踪刷新 |

## 5. 第三方依赖映射

| 依赖 | Laravel 适配层 | Python 适配层 | 接口 |
|------|--------------|--------------|------|
| 微信支付 | `Payment\Drivers\WechatDriver` | - | SDK |
| 支付宝 | `Payment\Drivers\AlipayDriver` | - | SDK |
| 快递鸟 | `Logistics\Drivers\KdNiaoDriver` | - | HTTPS API |
| 阿里云 OSS | `Upload\Drivers\OssDriver` | - | SDK |
| 阿里云短信 | `Sms\Drivers\AliyunDriver` | - | SDK |
| LLM（通义千问） | - | `infra/llm_provider/dashscope.py` | OpenAI-compat HTTPS |
| Embedding 模型 | - | `infra/embedding/local_model.py` | 本地 / HF |

### 适配层约束

- 所有第三方调用必须经过适配层（不允许业务代码直接 `new WechatSdk()`）
- 适配层可切换实现（如更换 LLM 提供商时只改 `llm_provider`）

## 6. 前端模块

```
frontend/src/
├── api/                    # axios 接口封装（一类一个文件）
│   ├── auth.ts
│   ├── product.ts
│   ├── cart.ts
│   ├── order.ts
│   ├── payment.ts
│   ├── ai.ts
│   └── admin.ts
├── stores/                 # Pinia stores
│   ├── auth.ts
│   ├── cart.ts
│   ├── ai-conversation.ts
│   └── system.ts
├── views/                  # 路由级组件
│   ├── home/
│   ├── product/
│   ├── cart/
│   ├── order/
│   ├── ai/
│   ├── auth/
│   └── admin/
├── components/             # 通用组件
│   ├── product-card/
│   ├── price-tag/
│   ├── search-bar/
│   ├── ai-drawer/         # 全局 AI 抽屉（用户已确认）
│   └── ...
├── styles/
│   ├── tokens.css         # design-system.md 的 CSS variables
│   └── reset.css
└── router/
```

### 前端模块依赖

- `views/* → components/*, stores/*, api/*`
- `stores/* → api/*`
- `components/* → stores/*`（避免组件直接调 api）

## 7. 部署拓扑

### 第一期推荐拓扑（中型档不引入 K8s）

```
              ┌────────────────────────┐
              │   阿里云 SLB (LB)       │
              └────────┬───────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                              ▼
┌──────────────────┐         ┌──────────────────┐
│ Nginx + PHP-FPM  │         │ FastAPI (uvicorn)│
│ (Laravel 业务)   │         │ (Python AI 服务) │
│ 2 实例           │         │ 2 实例           │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         ▼                            ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ MySQL 主从│  │ Redis 主从│  │PostgreSQL│
   └──────────┘  └──────────┘  └──────────┘
```

- Laravel + FastAPI 内网通信
- 队列 worker 独立部署（Supervisor + Horizon）
- 文件走 OSS（不落本地）
