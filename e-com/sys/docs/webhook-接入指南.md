# Webhook 接入指南（iter-33 Q28-04）

> 面向外部开发者：如何接收 OMS 推送的订单/退款事件、验证签名、正确响应。

## 1. 工作原理

OMS 在订单 / 退款达到关键状态时（如订单完成、订单取消、退款完成），通过 HTTP POST 将事件推送到你预先注册的 URL。

```
[OMS 业务 tx commit]
       │
       ▼
   XADD oms.webhook.outbound   ← iter-33 改异步：业务请求不再被推送阻塞
       │
       ▼
 [consume:webhook 进程]        ← supervisord 拉起，持续 XREADGROUP
       │ 遍历 enabled 订阅匹配 event
       ▼
   HTTP POST 你的 URL           ← 5s timeout · 最多 retry_max 次（默认 3）
       │
       ├─ 2xx → 标记成功
       └─ 非 2xx / 超时 → retry → 全失败入 dead_letter
```

**异步保证**：`OrderService.confirm` / `OrderService.cancel` / `RefundService.refund` 调用 `WebhookService::fireAsync()` 立即返回（XADD 通常 < 1ms），不再被你的 5s 接收方拖住。

## 2. 在 OMS 后台添加订阅

1. 用 `super_admin` 账号登录 Vue 后台（`/oms/webhooks`）
2. 点"新增订阅"，填入：
   - **名称**：方便识别（例如 "财务对接系统"）
   - **URL**：你的接收端点 HTTPS 地址
   - **订阅事件**：勾选感兴趣的 event（多选）
   - **secret**：自动生成 32 hex 位密钥（**只显示一次，请妥善保管**）
   - **retry_max**：失败重试次数（默认 3，最少 1）
3. 保存后可点"测试推送"立即触发一条 test 事件（不进 stream，直接同步 POST）

## 3. 事件清单

| event | 触发时机 | data 字段 |
|---|---|---|
| `order.completed` | 用户/系统确认收货 | `order_no`, `user_id`, `completed_at` |
| `order.cancelled` | 用户取消 / admin 强制取消 | `order_no`, `user_id`, `reason`, `cancelled_at` |
| `refund.refunded` | 退款实际打款完成（admin 标记 refunded）| `refund_no`, `order_no`, `amount`(分), `refunded_at` |
| `refund.approved` | （预留，iter-26 stream 已有 / webhook 暂未启用） | — |

事件清单未来可能扩展。**未在订阅列表中的 event 不会推送给你。**

## 4. 推送的请求格式

### Headers

```
Content-Type: application/json
X-Webhook-Event: order.completed
X-Webhook-Signature: 1f3a... (64 位 hex)
X-Webhook-Delivery: ab12cd34ef56...  (16 位 hex 唯一 ID)
```

### Body（统一信封）

```json
{
  "event": "order.completed",
  "data": {
    "order_no": "SO20260603001",
    "user_id": 12345,
    "completed_at": "2026-06-03 14:25:00"
  },
  "fired_at": "2026-06-03T06:25:00+00:00"
}
```

- `event` 与 `X-Webhook-Event` 头一致
- `data` 字段随 event 不同（见 §3 清单）
- `fired_at` 是 ISO 8601 UTC 时间，**不是入队时间** — 同一 event 重试时不变

## 5. 验证签名（重要）

**任何接收方都必须验签**，否则攻击者可伪造请求。

签名算法：

```
signature = hex( hmac_sha256( raw_body, your_secret ) )
```

注意：签名计算用**原始请求体**，不是反序列化后的对象。请在 framework 拿到字节流时立即算。

### PHP 示例

```php
<?php
function verify(string $rawBody, string $sigHeader, string $secret): bool
{
    $expected = hash_hmac('sha256', $rawBody, $secret);
    return hash_equals($expected, $sigHeader);
}

$body = file_get_contents('php://input');
$sig = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
if (!verify($body, $sig, 'YOUR_SECRET_HEX')) {
    http_response_code(401);
    exit('invalid signature');
}
$payload = json_decode($body, true);
// ... 业务处理 ...
http_response_code(200);
echo 'ok';
```

### Node.js (Express) 示例

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

// 必须用 raw body parser，不能用 express.json()，否则 body 已被反序列化
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const raw = req.body; // Buffer
    const sig = req.header('X-Webhook-Signature') || '';
    const secret = process.env.OMS_WEBHOOK_SECRET;
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return res.status(401).send('invalid signature');
    }
    const payload = JSON.parse(raw.toString('utf8'));
    console.log('event:', payload.event, 'data:', payload.data);
    res.status(200).send('ok');
  }
);
```

### Python (Flask) 示例

```python
import hmac, hashlib
from flask import Flask, request

app = Flask(__name__)
SECRET = b'YOUR_SECRET_HEX'

@app.post('/webhook')
def webhook():
    raw = request.get_data()  # 原始字节
    sig = request.headers.get('X-Webhook-Signature', '')
    expected = hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return 'invalid signature', 401
    payload = request.get_json(force=True)
    # ... 业务处理 ...
    return 'ok', 200
```

## 6. 你应该如何响应

| 你返回的状态码 | OMS 行为 |
|---|---|
| `200`～`299` | 标记成功，不再重试 |
| `4xx`（除 408） | 标记失败 + retry 直到 retry_max |
| `5xx` 或超时 | 标记失败 + retry 直到 retry_max |
| 5s 内无响应 | 视为超时，retry |

**建议接收方**：拿到请求**先验签 → 立即返回 200** → 后台异步消化业务逻辑。这样你的业务慢或异常不会触发 OMS 重试，避免重复消息。

## 7. 重试与去重

- 间隔：500ms 退避（attempt 1 失败 → 等 500ms → attempt 2）
- 上限：订阅的 `retry_max`（默认 3）
- 全部失败后写入 OMS 的 `dead_letter` 表，**不再自动重投** — 需 OMS 运维手工 replay

**去重**：用 `X-Webhook-Delivery` 头（16 位 hex 唯一 ID）。同一事件重试时该 ID 不变，你可以用它做幂等键，避免重复入账。

## 8. 测试推送

OMS 后台"测试推送"按钮会绕过异步队列，**同步**给该订阅发一条：

```json
{
  "event": "webhook.test",
  "data": { "message": "admin 触发的测试推送" },
  "fired_at": "..."
}
```

注意：`webhook.test` 不在 subscription.events 列表内是有意的 — 你需自行处理 / 忽略这种"试探"消息。

## 9. 故障排查

| 现象 | 排查 |
|---|---|
| 没收到推送 | 检查订阅 enabled=1 + event 在列表 + URL 可被 OMS 容器网络访问到 |
| 签名总错 | 用原始 body（字节流）算，不要反序列化后再算 |
| 收到重复 | 用 `X-Webhook-Delivery` 做幂等键去重 |
| 推送间隔过长 | OMS 异步队列消费时机 ≤ 1s，5s timeout 后会 retry。看 OMS supervisord 进程 `consume-webhook` 是否在跑 |

## 10. 联系

- OMS 接入支持：`ops@example.com`
- 测试沙箱：`https://staging-oms.example.com`
- dead_letter 重投：OMS 运维侧（M3 计划支持 admin UI 一键 replay）
