# iteration-28-auto-test.md · 主控 curl 测试

> **结果（2026-06-03）**：13/13 全过 ✅
> 测试范围：Dashboard 财务维度 / Webhook CRUD / 真实事件触发推送 / 失败重试 + dead_letter / Refund Model 渐进封装 / RBAC
> 边界遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §可做（自动）。

## 前置
- 1 migration（webhook_subscriptions）+ 2 Model 类（Refund / RefundItem）
- 重启 oms-backend

## 测试用例

### A. Dashboard 财务维度（A2）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | GET /admin/stats?days=7 | 含 finance_metrics + finance_series + coupon_usage_metrics 3 个新字段 | `missing=NONE; finance_metrics={总营收 ¥7009, 退款 ¥1000, 净 ¥6009, settled 1, unsettled 1}; coupon_usage={4 订单中 1 多券 占比 25%}; finance_series len=7` | ✅ |

### B. Webhook（A1）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T2 | GET /webhook/list | 空 | `list=[]` | ✅ |
| T3 | POST /webhook + httpbin.org/post | 自动生成 32 字节 secret | `id=1, secret_length=32, events=[order.completed, refund.refunded]` | ✅ |
| T6 | order cancel → 推送 httpbin | total_fired+1 success+1 last_status=200 | `fired=1 success=1 last_status=200` | ✅ |
| T7 | 不可达 url + retry_max=2 + cancel → 3 次失败 + dead_letter | failed+1 + dead_letter 含 webhook.order.cancelled 条目 | `BAD: fired=1 failed=1 last_status=0; dead_letter: stream=webhook.order.cancelled retry_count=2 error="cURL error 6: Could not resolve host"` | ✅ |
| T11 | enabled=0 + 再 cancel → 不投递 | total_fired 不变 | `before=after=5` | ✅ |
| T12 | update events 加 refund.refunded | 写入成功 | OK | ✅ |
| T13 | DELETE /webhook/2 | 剩 1 条 | OK | ✅ |

### C. Refund Model 渐进封装（A3）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T8 | `\app\model\Refund::where('status', 'refunded')->find()` | 查询正常 + items() hasMany 关联可用 + canTransit 状态机辅助 | `refund_no=RF...269168 status=refunded; items count=1; canTransit(pending_approve,approved)=1; canTransit(refunded,approved)=0` | ✅ |

### D. RBAC

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T4 | webhook test endpoint（test event 不在订阅列表）| msg ok 但 total_fired=0 | 正确：测试 event 不投递 | ✅ |
| T9 | sales_ops 调 webhook list | 403 super_admin 独占 | `权限不足，需要角色: super_admin` | ✅ |
| T10 | warehouse 调 webhook list | 403 | `权限不足，需要角色: super_admin` | ✅ |

## 真实输出片段（T1 Dashboard 财务）
```
finance_metrics: {
  'total_revenue_cents': 700900,   # ¥7009 营收
  'total_refund_cents': 100000,    # ¥1000 退款（绝对值）
  'net_cents': 600900,             # ¥6009 净
  'settled_count': 1, 'unsettled_count': 1
}
coupon_usage_metrics: {
  'orders_with_coupon': 4,
  'orders_with_multi_coupon': 1,    # iter-27 多券订单
  'multi_coupon_rate_pct': 25
}
finance_series 7 天序列 OK
```

**T6 完整 webhook 链路**：cancel 订单 → OrderService 触发 WebhookService.fire → POST httpbin.org/post → HMAC-SHA256 签名 → HTTP 200 → total_success +1

## 本轮开发期 bug
- **iter28-fix-1**：dead_letter 表字段是 `retry_count` 不是 `delivery_count`。WebhookService 写错被 try/catch silent 吞掉，T7 测试中 dead_letter 表查不到时发现。修：改字段名。**经验：dead_letter 写入失败应该至少记 STDOUT log，不是完全 silent**

1 个 bug 在 auto-test 当场抓到并修复。

## 需用户手动验证
- 详见 [iteration-28-manual-test.md](iteration-28-manual-test.md)
