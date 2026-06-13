# iteration-21-auto-test.md · 主控 curl 测试

> **结果（2026-06-01）**：8/8 全过 ✅
> 测试范围：stats 4 个新维度（券核销率/评价/留存/复购）+ exportOrders 加优惠券两列
> 边界遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §可做（自动）。

## 前置
- iter-20 收口（reviews / addresses / favorites 全在 shop_db）
- iter-19 收口（coupons / user_coupons 全在 oms_db）
- 现有数据：6 已领券 / 3 已用券 / 2 active 评价 / 1 用户 / 33 订单

## 测试用例

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | GET /admin/stats?days=7 | 含 coupon_metrics + coupon_series + review_metrics + review_series + retention_metrics 5 个新 key | `missing: NONE`；keys 完整 | ✅ |
| T2 | GET /admin/stats?days=30 | coupon_series / review_series 长度 = 30 | `len=30` | ✅ |
| T3 | 数学正确性 | coupon use rate / buyer rate / repeat rate 计算正确 | 全部 OK | ✅ |
| T4 | hide review id=1 → stats | total_reviews 减 1，hidden 不计 | `before=2 → after=1 → restore=2` | ✅ |
| T5 | GET /admin/order/export | header 15 列含「优惠券」+「优惠金额(元)」；用券订单显示 `两件8折,200.00` / `满 99 减 10,10.00` 等 | 3 行实际数据均含正确券名和金额 | ✅ |
| T6 | warehouse 角色调 stats | 200（任意 admin 都能查）| `HTTP=200` | ✅ |
| T7 | 无 token | 401 | `HTTP=401` 缺少 Bearer token | ✅ |
| T8 | days=1 时序长度 | 只 1 天 | `coupon_series` 与 `review_series` 各 1 项 | ✅ |

## 真实输出片段

**T1 response（trimmed）**：
```
coupon_metrics: {'total_claimed': 6, 'total_used': 3, 'overall_use_rate_pct': 50}
review_metrics: {'total_reviews': 2, 'avg_rating': 5, 'recent_reviews': 2, 'recent_avg_rating': 5}
retention_metrics: {'total_users': 1, 'total_buyers': 1, 'repeat_buyers': 1, 'buyer_rate_pct': 100, 'repeat_rate_pct': 100}
coupon_series (last 2): [{'date':'2026-05-31','claimed':0,'used':0,'use_rate_pct':0}, {'date':'2026-06-01','claimed':1,'used':1,'use_rate_pct':100}]
```

**T5 CSV 真实输出**：
```
订单号,用户ID,状态,总金额(元),商品金额(元),运费(元),优惠券,优惠金额(元),收货人,手机号,地址,支付时间,...
SO202606011112244441,1,paid,6809.00,6999.00,10.00,两件8折,200.00,...
SO202605301450349245,1,pending_pay,6979.00,6999.00,10.00,"全场 8.5 折（最高减 30）",30.00,...
SO202605301450092894,1,pending_pay,6999.00,6999.00,10.00,"满 99 减 10",10.00,...
```

## 本轮开发期 bug
- 无（一次跑通；跨库读 shop_db + LEFT JOIN user_coupons + 时序补 0 + try/catch 兜底全部一遍过）

## 需用户手动验证
- 详见 [iteration-21-manual-test.md](iteration-21-manual-test.md)
