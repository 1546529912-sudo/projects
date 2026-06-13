# Data Flow · 关键数据流（架构 Agent 产物 5/6）

> 4 条核心数据流时序图。开发 Agent 必须按此实现关键路径。

## 【当前焦点】

- 核心流程：注册 / 下单+支付 / AI 报价 / RAG 检索
- 强约束：所有跨服务调用必须经过显式适配层（不内嵌 SDK）

## 1. 用户注册流程

```
[前端]                [Laravel]            [Redis]           [短信平台]       [MySQL]
  │                       │                  │                   │             │
  │─POST /auth/sms/send──>│                  │                   │             │
  │                       │─limit:phone?────>│                   │             │
  │                       │<──ok──           │                   │             │
  │                       │─store code(5min)>│                   │             │
  │                       │                  │                   │             │
  │                       │──send(phone,code)──────────────────>│             │
  │                       │<───sms_id──────────────────────────│             │
  │                       │─log to sms_logs──────────────────────────────────>│
  │<───{code:0}──────────│                  │                   │             │
  │                       │                  │                   │             │
  │─POST /auth/register──>│                  │                   │             │
  │ {phone, code, pwd}   │                  │                   │             │
  │                       │─verify code─────>│                   │             │
  │                       │<──ok or fail──   │                   │             │
  │                       │                  │                   │             │
  │                       │─check duplicate──────────────────────────────────>│
  │                       │<──no exists──────────────────────────────────────│
  │                       │                  │                   │             │
  │                       │─insert user──────────────────────────────────────>│
  │                       │<──user_id──                                       │
  │                       │                  │                   │             │
  │                       │─issue sanctum token                                │
  │<───{token, user}─────│                                                    │
```

### 关键约束

- 验证码限流：同手机号 60 秒内 1 次（Redis SETNX TTL 60）
- 验证码错误锁定：3 次错误后锁手机号 5 分钟（Redis 计数器 + TTL）
- 验证码 5 分钟过期（Redis TTL）
- 注册成功立即颁发 token（Sanctum），过期 2 小时

## 2. 下单+支付流程

```
[前端]            [Laravel]         [Redis]          [MySQL]         [微信支付]
  │                  │                 │                │                 │
  │─POST /orders───>│                 │                │                 │
  │                  │─begin tx       │                │                 │
  │                  │─lock cart_items────────────────>│                 │
  │                  │─pre-decr stock>│ (Lua 原子)     │                 │
  │                  │<─ok or fail──  │                │                 │
  │                  │ if fail: rollback + return 库存不足                │
  │                  │                 │                │                 │
  │                  │─insert order───────────────────>│                 │
  │                  │─insert order_items─────────────>│                 │
  │                  │─clear cart_items selected──────>│                 │
  │                  │─commit                                            │
  │                  │                                                   │
  │                  │─dispatch OrderCreated event                       │
  │                  │   ├─ notify queue (发站内信)                       │
  │                  │   └─ schedule cancel_check (30min)                │
  │                  │                                                   │
  │<──{order_no}────│                                                   │
  │                                                                       │
  │─POST /payments─>│                                                   │
  │                  │─call WechatDriver.unifiedOrder────────────────>│
  │                  │<───{code_url}───────────────────────────────────│
  │                  │─insert payments(pending)───────────────────────>│
  │<──{qrcode}──────│                                                   │
  │                                                                       │
  │  [用户扫码]                                                            │
  │                                                                       │
  │                  │<───callback (异步)────────────────────────────────│
  │                  │─verify sign                                       │
  │                  │─check idempotent (transaction_id 唯一)            │
  │                  │─update payment.status=success                     │
  │                  │─update order.status=pending_shipment              │
  │                  │─decr stock 正式扣减+log───────────────────────────>│
  │                  │─dispatch OrderPaid event                          │
  │                  │   └─ notify (订单已支付)                           │
  │                  │──response success──────────────────────────────>│
```

### 关键约束

- Redis 预扣库存使用 Lua 脚本（原子操作）：
  ```lua
  local stock = tonumber(redis.call('GET', KEYS[1]))
  if stock and stock >= tonumber(ARGV[1]) then
    redis.call('DECRBY', KEYS[1], ARGV[1])
    return 1
  else
    return 0
  end
  ```
- 订单创建后 Redis 预扣 30 分钟过期；支付成功正式扣 MySQL
- 支付回调幂等：以 `transaction_id` UNIQUE，重复回调直接返回 success
- 30 分钟未支付定时任务取消 + 释放 Redis 预扣
- 全程 MySQL 事务（购物车清空 / 库存预扣失败要回滚）

## 3. AI 报价流程

```
[前端]          [Laravel]      [Redis]        [FastAPI]     [LLM]     [MySQL]   [pgvector]
  │               │             │               │            │          │           │
  │─POST /ai/conversations─>│   │              │            │          │           │
  │               │─insert conversation────────────────────────────────>│           │
  │<──{conv_id}──│             │               │            │          │           │
  │                                                                                  │
  │─POST /messages (SSE)─>│   │               │            │          │           │
  │               │             │               │            │          │           │
  │               │ 转发到 FastAPI:                                                  │
  │               │─POST /ai/v1/chat/stream─────>│            │          │           │
  │               │ {conv_id, user_msg, context}│            │          │           │
  │               │             │               │            │          │           │
  │               │             │               │─load context (MySQL)─>│           │
  │               │             │               │<──last 20 msgs────────│           │
  │               │             │               │            │          │           │
  │               │             │               │─intent classify (LLM)>│           │
  │               │             │               │<──intent=quotation────│           │
  │               │             │               │            │          │           │
  │               │             │               │  [if 缺参数 → 追问 → 返回]         │
  │               │             │               │            │          │           │
  │               │             │               │ [if 参数全] match SKU───────────>│
  │               │             │               │<──skus, prices────────│           │
  │               │             │               │            │          │           │
  │               │             │               │─compute price tier────│           │
  │               │             │               │─insert ai_quotation──>│           │
  │               │             │               │            │          │           │
  │               │             │               │ stream tokens         │          │
  │               │<──SSE chunks─────────────────│            │          │           │
  │<──SSE chunks─│             │               │            │          │           │
  │               │             │               │─persist ai_messages──>│           │
  │               │             │               │─update context json──>│           │
```

### 关键约束

- 多轮上下文：最近 20 条消息 + context_json（已采集参数）
- SSE 流式：FastAPI 边接 LLM 边吐字给前端
- 兜底转人工：连续 3 轮追问无效 / 置信度 <70% / 大批量 → 立即返回 transfer 指令
- 报价单价格快照：生成时锁定，不随后续价格波动

## 4. RAG 检索流程（售前问答）

```
[前端]      [Laravel]    [FastAPI]      [Embedding 模型]   [pgvector]    [LLM]    [MySQL]
  │           │             │                 │                │           │         │
  │─用户问题──>│             │                 │                │           │         │
  │           │─转发─>      │                 │                │           │         │
  │           │             │                 │                │           │         │
  │           │             │─encode query──>│                │           │         │
  │           │             │<──vector───────│                │           │         │
  │           │             │                 │                │           │         │
  │           │             │─cosine search──────────────────>│           │         │
  │           │             │<──top 3 kb_ids (score >0.6)─────│           │         │
  │           │             │                                              │         │
  │           │             │─load kb content──────────────────────────────────────>│
  │           │             │<──contents──────────────────────────────────────────│
  │           │             │                                  │           │         │
  │           │             │─build prompt + context           │           │         │
  │           │             │  "基于以下知识回答问题..."         │           │         │
  │           │             │  + 用户问题 + 召回的 top 3        │           │         │
  │           │             │                                              │         │
  │           │             │─stream LLM────────────────────────────────────>│         │
  │           │             │<──tokens stream────────────────────────────────│         │
  │<──SSE 流──│<──proxy────│                                                          │
  │           │             │                                                          │
  │           │             │─persist messages (含 source kb_ids)─────────────────>│
```

### 关键约束

- 召回阈值：cosine similarity >= 0.6（低于视为无匹配 → 转人工）
- Top K = 3（更多易引入噪声）
- Embedding 缓存：相同 query 5 分钟内复用结果（Redis）
- 知识来源标注：回答末尾附 "来源：[标题]" 给前端展示
- 知识库为空（kb_embeddings 行数 = 0）→ AI 直接返回"暂无信息" + 转人工

## 5. 库存预扣异常处理（红线）

### 场景 A：用户加购物车

- 不扣库存，只校验 `stock > 0`

### 场景 B：用户提交订单（POST /orders）

- Redis Lua 预扣：成功 → 入库；失败 → 返回库存不足
- 预扣 TTL = 30 分钟（同订单超时取消时间）

### 场景 C：支付成功

- MySQL 真正扣减 + 写 stock_logs
- Redis 预扣不再回滚（已变成正式扣减）

### 场景 D：订单取消（超时或用户主动）

- Redis 预扣释放（DECRBY 反向）
- 写 stock_logs 取消事件

### 场景 E：分布式风险

- 不同节点同时预扣 → Lua 原子保证；多商品订单走事务（同一 Redis key 锁）

## 6. 文件上传流程

```
[前端]                [Laravel]              [OSS]
  │                       │                    │
  │─POST /upload (file)──>│                    │
  │                       │─generate token────>│
  │                       │<──signed url─────  │
  │                       │─return signed url to client
  │<───{url, headers}────│                    │
  │                                              │
  │─PUT file (signed)─────────────────────────>│
  │<──200 OK─────────────────────────────────│
```

- 大文件直传 OSS（避免经过 Laravel 占用带宽）
- Laravel 只负责签名 + 校验
- 上传完成后前端把 OSS URL 传回业务接口

## 7. 通知与异步链路

- 短信/邮件/站内信全部异步走 Redis Queue
- Horizon 监控队列健康，失败重试 3 次
- 关键消息（如订单状态变更）双通道（站内信 + 短信）
