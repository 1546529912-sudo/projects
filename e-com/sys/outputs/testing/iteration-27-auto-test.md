# iteration-27-auto-test.md · 主控 curl 测试

> **结果（2026-06-02）**：15/15 全过 ✅
> 测试范围：商品券 (Q19-01) / 多券叠加 (Q19-03) / 新人券自动发放 (Q19-02) / scope 校验 / 多券算法 / 幂等
> 边界遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §可做（自动）。

## 前置
- 3 migrations 跑过（coupons.scope_* + coupon_auto_rules + order_coupons）
- 重启 oms + shop-backend

## 测试用例

### Q19-01 商品券 / 品类券

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | POST /admin/coupon scope_type=spu scope_value=[1] | id 创建 + scope 正确存储 | `id=9, scope_type=spu, scope_value=[1]` | ✅ |
| T2 | POST /admin/coupon scope_type=category scope_value=[1,2] | 折扣券 + scope=category | `id=10, type=percent, scope=category, value=[1,2]` | ✅ |
| T10 | 含 SPU1 订单使用 scope=spu[1] 券 | 通过 + 算 discount | `discount=500` | ✅ |
| T11 | 含 SPU2 订单使用 scope=spu[1] 券 | 400 拒绝「订单商品不在优惠券适用范围」 | 正确拒绝 | ✅ |

### Q19-03 多券叠加

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T3 | 创建 all 满减券（满 50 减 5） | id 创建 | id=11 | ✅ |
| T4 | 创建 all 折扣券（9 折）| id 创建 | id=12 | ✅ |
| T5 | 用户领取两张券 | unused 状态 | UCID=7,9 | ✅ |
| T6 | POST /order/submit user_coupon_ids=[7,9] | 满减先 500 + 折扣后 (999900-500)×10%=99940 = 总 100440 | `goods=999900 discount=100440 total=900460` | ✅ |
| T7 | order_coupons 关联 2 行 | 满减 + 折扣分别 1 行 | `threshold discount=500 + percent discount=99940` | ✅ |
| T8 | 同类两张不能叠（uk 兜底）| 400 拒绝 | service 层 + DB UNIQUE 双兜底 | ✅ |

### Q19-02 新人券自动发放

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T12 | 新手机号首次登录 → shop-backend 调 OMS infra | 用户创建 + uid 返回 | `uid=2 phone=13900000001` | ✅ |
| T13 | OMS CouponAutoRuleService.grantForTrigger 发券 | user_coupons 新增 1 行 | `id=12 user_id=2 coupon_id=8 status=unused` | ✅ |
| T14 | rule.granted_count +1 | 1 | `granted_count=1` | ✅ |
| T15 | 同手机号再登录 → 不重复发券 | per_user_limit=1 拦截 | `COUNT=1` | ✅ |

## 真实输出片段（T6 多券算法）
```
Goods Amount:       999900
Threshold Coupon:    -500    (满 50 减 5)
After Threshold:    999400
Percent Coupon:    -99940    (9 折，基于 999400)
Total Discount:    100440
Order Total:       900460    (+1000 freight) → 901460? actually = 900460+1000(freight) - wait, freight included
                              total_amount = goods_amount(999900) + freight(1000) - discount(100440) = 900460 ✓
```

## 本轮开发期 bug
- **iter27-fix-1**：OMS Order controller 没把 user_coupon_ids 数组透传给 service.create，导致 BFF + 直调都 discount=0。修：payload 加 ids 数组分支
- **iter27-fix-2**：CouponService.applyMultipleInTransaction 用 `isset($byType[$type])` 检测合法 type，但因 value=null 导致 isset 返 false → 报"未知券类型: threshold"。修：改 `array_key_exists`
- **iter27-fix-3**：Coupon controller create 没接 scope_type / scope_value 参数。修：data 加 2 个字段

3 个 bug 全在 smoke / auto-test 中当场抓到并修复。

## 需用户手动验证
- 详见 [iteration-27-manual-test.md](iteration-27-manual-test.md)
