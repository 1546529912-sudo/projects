# API List · 接口清单（架构 Agent 产物 3/6）

> 所有 HTTP API 路径 / 方法 / 入参 / 出参 / 鉴权约定。
> 开发 Agent 必须严格按此实现 Controller / Route。
> AI 服务接口独立列出。

## 【当前焦点】

- 协议：HTTPS / RESTful JSON
- 鉴权：Laravel Sanctum（Bearer Token）
- 版本：所有路径以 `/api/v1` 开头
- AI 服务：`/ai/v1`（FastAPI 端，Laravel 内部转发）

## 1. 通用约定

### 响应格式

```json
{
  "code": 0,
  "message": "ok",
  "data": { ... }
}
```

- `code = 0` 成功；非 0 错误
- HTTP 状态码与 `code` 双重表达：200/400/401/403/404/422/500

### 鉴权 Header

```
Authorization: Bearer {access_token}
```

### 分页参数（统一）

```
?page=1&per_page=20&sort=created_at&order=desc
```

### 错误码段位

| 段 | 含义 |
|----|------|
| 1xxx | 用户/认证 |
| 2xxx | 商品 |
| 3xxx | 购物车/订单 |
| 4xxx | 支付 |
| 5xxx | AI |
| 9xxx | 系统/通用 |

---

## 2. 用户与认证（/api/v1/auth）

| 方法 | 路径 | 鉴权 | 简述 | 对应任务 |
|------|------|------|------|---------|
| POST | `/auth/sms/send` | 否 | 发送验证码 | TRADE-001-01 |
| POST | `/auth/register` | 否 | 手机号注册 | TRADE-001-01 |
| POST | `/auth/login` | 否 | 密码或验证码登录 | TRADE-001-03 |
| POST | `/auth/wechat/callback` | 否 | 微信授权回调 | TRADE-001-02 |
| POST | `/auth/logout` | 是 | 登出 | - |
| POST | `/auth/password/reset` | 否 | 重置密码 | TRADE-001-03 |
| POST | `/auth/refresh` | 是 | 刷新 token | - |
| GET  | `/users/me` | 是 | 当前用户信息 | - |
| PUT  | `/users/me` | 是 | 更新个人资料 | - |
| POST | `/users/role/switch` | 是 | 切换个人/企业角色 | TRADE-001-06 |
| POST | `/companies` | 是 | 提交企业认证 | TRADE-001-04 |
| GET  | `/companies/me` | 是 | 查看认证状态 | TRADE-001-04 |
| GET  | `/addresses` | 是 | 收货地址列表 | TRADE-004-01 |
| POST | `/addresses` | 是 | 新增地址 | TRADE-004-01 |
| PUT  | `/addresses/{id}` | 是 | 编辑地址 | TRADE-004-01 |
| DELETE | `/addresses/{id}` | 是 | 删除地址 | TRADE-004-01 |
| GET  | `/invoices` | 是 | 发票列表 | TRADE-004-04 |
| POST | `/invoices` | 是 | 新增发票抬头 | TRADE-004-04 |

### 示例：POST /auth/register

入参：

```json
{
  "phone": "13800138000",
  "code": "123456",
  "password": "optional_password"
}
```

出参：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": { "id": 1, "phone": "138****8000", "role": "individual" },
    "access_token": "eyJ...",
    "expires_in": 7200
  }
}
```

错误码：
- 1001 手机号格式错误
- 1002 验证码错误或过期
- 1003 该号码已注册
- 1004 验证码错误次数过多，请稍后再试

---

## 3. 商品（/api/v1/products）

| 方法 | 路径 | 鉴权 | 简述 | 对应任务 |
|------|------|------|------|---------|
| GET | `/categories` | 否 | 分类树 | TRADE-002-02 |
| GET | `/products` | 否 | 商品列表（搜索/筛选/排序/分页） | TRADE-002-03,04 |
| GET | `/products/{id}` | 否 | 商品详情 | TRADE-002-05 |
| GET | `/products/recommended` | 否 | 首页推荐 | TRADE-002-01 |
| GET | `/products/{id}/skus` | 否 | SKU 列表 | - |
| GET | `/skus/{id}` | 否 | SKU 详情（含阶梯价） | - |
| GET | `/skus/{id}/stock` | 否 | 当前库存 | AI-002-04 |
| POST | `/products/{id}/reviews` | 是 | 评价商品 | TRADE-006-06 |
| GET | `/products/{id}/reviews` | 否 | 评价列表 | TRADE-006-06 |

### 示例：GET /products

Query：

```
?keyword=T700&category_id=1&min_price=100&max_price=2000&sort=price&order=asc&page=1&per_page=20
```

出参：

```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": 1, "name": "T700 碳纤维板", "model": "CF-T700-3MM",
        "main_image_url": "https://...", "price_min": 1080, "price_max": 1280,
        "stock_status": "in_stock"
      }
    ],
    "total": 50, "page": 1, "per_page": 20
  }
}
```

---

## 4. 购物车（/api/v1/cart）

| 方法 | 路径 | 鉴权 | 简述 |
|------|------|------|------|
| GET | `/cart` | 是 | 获取购物车 |
| POST | `/cart/items` | 是 | 加入商品 |
| PUT | `/cart/items/{id}` | 是 | 修改数量 / 勾选状态 |
| DELETE | `/cart/items/{id}` | 是 | 删除单项 |
| POST | `/cart/items/select-all` | 是 | 全选/反选 |
| DELETE | `/cart/items/invalid` | 是 | 清空失效商品 |
| GET | `/cart/calculate` | 是 | 计算总价（含运费预估） |

---

## 5. 订单与支付（/api/v1/orders, /api/v1/payments）

| 方法 | 路径 | 鉴权 | 简述 |
|------|------|------|------|
| POST | `/orders` | 是 | 创建订单（结算→下单） |
| GET | `/orders` | 是 | 订单列表（按状态 tab） |
| GET | `/orders/{id}` | 是 | 订单详情 |
| POST | `/orders/{id}/cancel` | 是 | 取消订单/申请取消 |
| POST | `/orders/{id}/confirm-receipt` | 是 | 确认收货 |
| GET | `/orders/{id}/tracking` | 是 | 物流跟踪 |
| POST | `/orders/{id}/refund` | 是 | 申请退款 |
| POST | `/payments` | 是 | 发起支付 |
| GET | `/payments/{id}` | 是 | 查询支付状态 |
| POST | `/payments/{id}/voucher` | 是 | 上传对公转账凭证 |
| POST | `/payments/callback/wechat` | 否 | 微信回调（验签） |
| POST | `/payments/callback/alipay` | 否 | 支付宝回调 |

---

## 6. AI 接口（/api/v1/ai）

> 前端调 Laravel `/api/v1/ai/*`，Laravel 校验鉴权后转发到 FastAPI `/ai/v1/*`。

| 方法 | 路径 | 鉴权 | 简述 | 对应任务 |
|------|------|------|------|---------|
| POST | `/ai/conversations` | 是 | 创建对话 | AI-001-01 |
| GET | `/ai/conversations/{id}` | 是 | 获取对话上下文 | AI-002-07 |
| POST | `/ai/conversations/{id}/messages` | 是 | 发送消息（流式响应 SSE） | AI-002-01 |
| GET | `/ai/conversations/{id}/messages` | 是 | 历史消息 | - |
| POST | `/ai/conversations/{id}/transfer` | 是 | 转人工 | AI-003-01 |
| POST | `/ai/quotations` | 是 | 提交报价表单（同步生成） | AI-001-02 |
| GET | `/ai/quotations/{id}` | 是 | 查看报价单 | AI-001-05 |
| GET | `/ai/quotations/{id}/pdf` | 是 | 下载报价 PDF | AI-001-05 |
| POST | `/ai/quotations/{id}/place-order` | 是 | 一键转下单 | AI-001-06 |

### FastAPI 端点（内部，仅 Laravel 调用）

| 方法 | 路径 | 简述 |
|------|------|------|
| POST | `/ai/v1/intent/classify` | 意图识别 |
| POST | `/ai/v1/rag/query` | RAG 检索 |
| POST | `/ai/v1/chat/stream` | LLM 对话（流式） |
| POST | `/ai/v1/quotation/generate` | 报价计算 |
| POST | `/ai/v1/embedding/encode` | 文本转向量 |
| POST | `/ai/v1/kb/upsert` | 知识库 upsert（写 pgvector）|
| GET | `/ai/v1/health` | 健康检查 |

---

## 7. 管理后台（/api/v1/admin）

| 方法 | 路径 | 鉴权 | 简述 | 对应任务 |
|------|------|------|------|---------|
| GET | `/admin/companies/pending` | admin | 待审核企业列表 | TRADE-001-05 |
| POST | `/admin/companies/{id}/review` | admin | 审批企业认证 | TRADE-001-05 |
| POST | `/admin/products` | admin | 新建商品 | TRADE-007-01 |
| PUT | `/admin/products/{id}` | admin | 编辑商品 | TRADE-007-01 |
| POST | `/admin/products/batch-import` | admin | 批量导入 Excel | TRADE-007-02 |
| POST | `/admin/products/{id}/toggle` | admin | 上下架 | TRADE-007-03 |
| PUT | `/admin/skus/{id}/stock` | admin | 调整库存 | TRADE-007-04 |
| PUT | `/admin/skus/{id}/price-tiers` | admin | 设置阶梯价 | TRADE-007-05 |
| GET | `/admin/orders` | admin | 订单列表 | TRADE-008-01 |
| POST | `/admin/orders/{id}/ship` | admin | 发货 | TRADE-008-02 |
| POST | `/admin/payments/{id}/review` | admin | 审核对公转账凭证 | TRADE-008-04 |
| POST | `/admin/refunds/{id}/review` | admin | 退款审批 | TRADE-008-03 |
| GET | `/admin/kb` | admin | 知识库列表 | AI-004-01 |
| POST | `/admin/kb` | admin | 新建知识条目 | AI-004-01 |
| PUT | `/admin/kb/{id}` | admin | 编辑 | AI-004-01 |
| DELETE | `/admin/kb/{id}` | admin | 删除 | AI-004-01 |
| POST | `/admin/kb/{id}/review` | admin | 审核知识条目 | AI-004-03 |
| POST | `/admin/kb/rebuild-index` | admin | 重建向量索引 | AI-004-04 |
| GET | `/admin/bad-cases` | admin | Bad Case 列表 | AI-004-05 |

---

## 8. 系统（/api/v1/system）

| 方法 | 路径 | 鉴权 | 简述 |
|------|------|------|------|
| GET | `/health` | 否 | 健康检查（DB / Redis / FastAPI 联通性） |
| GET | `/notifications` | 是 | 站内信列表 |
| POST | `/notifications/{id}/read` | 是 | 标记已读 |
| POST | `/upload` | 是 | 通用文件上传（OSS） |

---

## 9. WebSocket / SSE

| 通道 | 用途 |
|------|------|
| SSE `/api/v1/ai/conversations/{id}/messages` (POST 转流式) | AI 回答流式输出 |
| WS `/api/v1/notifications/ws` | 实时通知（订单状态变更、企业认证审批） |

---

## 10. 限流规则

| 接口 | 限流 |
|------|------|
| `/auth/sms/send` | 同手机号 1 分钟 1 次，1 天 10 次 |
| `/auth/login` | 同 IP 1 分钟 5 次 |
| `/ai/conversations/{id}/messages` | 同用户 1 分钟 30 条 |
| 其余写接口 | 同 IP 1 秒 10 次（防爬虫） |

---

## 11. 接口契约约束

- 所有列表接口必须支持分页（默认 page=1, per_page=20）
- 所有详情接口返回结构与列表接口字段一致（避免前端二次映射）
- 时间字段统一 ISO 8601（如 `"2026-05-22T14:30:00+08:00"`）
- 金额字段统一 decimal 字符串（避免 float 精度问题）：`"1280.00"`
- 错误响应必须含 `code` + `message` + 可选 `errors` 字段（表单逐字段错误）
