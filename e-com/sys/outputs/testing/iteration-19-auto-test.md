# iteration-19-auto-test.md · 自动测试（主控跑 curl）

> **结果（2026-05-30）**：16/16 PASS ✅ + 3 个 bug 修复（iter19-fix-1/2/3）
> 遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §能做（自动测试）边界。

## 准备

```bash
# 跑迁移
docker-compose exec -T oms-backend php think migrate:run
# 重启 shop-backend / oms-backend 加载新代码（bind mount + opcache flush）
docker-compose restart shop-backend oms-backend
```

迁移产出：
```
== 20260529000001 CreateCoupons: migrated 0.0191s
== 20260529000002 CreateUserCoupons: migrated 0.0132s
All Done. Took 0.0412s
```

种子券核对（满 99 减 10 + 全场 8.5 折封顶 30）：
```
id  name           type       discount_value  min_amount  max_discount  total  status
1   满 99 减 10    threshold  1000           9900        NULL          1000   active
2   8.5 折 封顶30  percent    15             5000        3000          500    active
```

## 一、Admin 模板 CRUD

| # | 用例 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | sales_ops 登录后 GET /admin/coupon/list | code=0, list 含 2 条 seed | seed 2 条返回 ✓ | ✅ |
| T2 | warehouse 登录后 GET /admin/coupon/list | 403 权限不足 | `403 权限不足，需要角色: super_admin/sales_ops` | ✅ |
| T3 | 无 token GET | 401 缺少 Bearer | `401 缺少 Bearer token` | ✅ |
| T4 | sales_ops POST /admin/coupon 创建满 100 减 20 | code=0 返回新券 id | id=3, discount_value=2000 ✓ | ✅ |
| T5a | type=percent discount_value=150（>99）| 400 验证失败 | `折扣 discount_value 必须 1-99` | ✅ |
| T5b | type=threshold discount_value=0 | 400 验证失败 | `满减 discount_value 必须 > 0` | ✅ |
| T5c | valid_from > valid_to | 400 验证失败 | `valid_from 必须早于 valid_to` | ✅ |
| T6a | PUT /admin/coupon/3 改名+total_count | code=0 | 名/总量已更新 ✓ | ✅ |
| T6b | POST /admin/coupon/3/disable | code=0, status=disabled | status=disabled ✓ | ✅ |

**🐛 iter19-fix-1（发现并修复）**：T6b 第一次跑 POST `/admin/coupon/3/disable` 错误命中 `Coupon::create`（"name 必传"）。
- 根因：路由顺序错误。`Route::post('admin/coupon', 'Coupon/create')` 注册在 `Route::post('admin/coupon/<id>/disable', ...)` 之前，TP8 在某些情况下按前缀优先匹配 plain POST。
- 修复：把参数路由放到 plain POST 之前（与 iter-17 `admin/user` 模式一致），见 `apps/oms-backend/route/app.php` 注释。
- 验证：修复后 T6b 通过。

## 二、Shop 用户领券

| # | 用例 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T7 | GET /coupon/available（用户 1） | 返回 2 张 active 券 + my_claimed=0 + claimable=true | 2 张返回 + 标记正确 ✓ | ✅ |
| T8a | POST /coupon/1/claim | code=0, 新 user_coupon id=1 unused | id=1 unused ✓ | ✅ |
| T8b | 再领 id=1（per_user_limit=1） | 400 已达每人限领 | `已达每人限领次数` ✓ | ✅ |
| T8c | POST /coupon/2/claim | code=0 | id=2 unused ✓ | ✅ |
| T9 | GET /coupon/my?status=unused | 返回 2 张 + 含模板字段 | 2 张含 name/type/min_amount ✓ | ✅ |

## 三、预检算 discount

| # | 用例 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T10a | check 满99减10 @ ¥120 (12000 分) | discount=1000, final=11000 | discount=1000, final=11000 ✓ | ✅ |
| T10b | check 满99减10 @ ¥80 (8000 分) | 400 未满 99 | `商品金额未满 ¥99.00` ✓ | ✅ |
| T10c | check 8.5折 @ ¥100 (10000 分) | discount=1500 (15%), final=8500 | discount=1500, final=8500 ✓ | ✅ |
| T10d | check 8.5折 @ ¥500 (50000 分) | discount=min(7500,3000)=3000（封顶）| discount=3000, final=47000 ✓ | ✅ |

**🐛 iter19-fix-2（发现并修复）**：T10a 第一次报 `Argument #3 ($goodsAmountCents) must be of type int, float given`。
- 根因：`Coupon::check` controller `(float)$request->param('goods_amount')`，但 service 签名 `int`。
- 修复：改为 `(int)`，见 `apps/shop-backend/app/controller/Coupon.php:55`。
- 验证：修复后 T10a-d 全过。

## 四、下单核销端到端

| # | 用例 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T11 | 直接 OMS POST /order/create 带 user_coupon_id=1 | order.discount=1000, total=goods+freight-1000 | discount=1000, total=699900 ✓ | ✅ |
| T12 | 通过 shop BFF POST /order/submit 带 user_coupon_id=2 | order.discount=3000（封顶）| discount=3000, total=697900 ✓ | ✅ |
| T13 | DB 检查核销后状态 | user_coupons.status=used + used_at + order_no；coupons.used_count++ | 全部更新正确 ✓ | ✅ |
| T14 | 用已 used 的 user_coupon_id=1 再下单 | 拦截"已使用或已失效" | OMS 返回 500 `优惠券已使用或已失效`，BFF 504 透传 ✓ | ✅ |
| T15 | 用满 500 减 20 的券 @ ¥100 | 400 未满 ¥500 | `商品金额未满 ¥500.00` ✓ | ✅ |
| T16 | 5 并发领 total_count=2 的券 | 2 成功 + 3 失败，claimed_count=2 | 2 成功 3 "已领完"，claimed_count=2 ✓ | ✅ |

**🐛 iter19-fix-3（发现并修复）**：T11 第一次跑 discount=0（券未被消费）。
- 根因：`apps/oms-backend/app/controller/Order::create` 把请求数据组装成给 `OrderService::create` 的数组，但漏掉 `user_coupon_id` 字段。即便 shop-backend 已正确传，OMS 控制器把它扔了。
- 修复：在 controller 数组里加 `'user_coupon_id' => (int)$request->param('user_coupon_id', 0)`。
- 验证：T11 重跑 discount=1000，T12 8.5折封顶 discount=3000。

## 五、设计层挖出的额外问题（运行中发现 + 修复）

**🐛 iter19-fix-4（架构性）**：T7 第一次 500 `Table 'shop_db.coupons' doesn't exist`。
- 根因：coupons / user_coupons 表通过 OMS migration 建在 `oms_db`，但 shop-backend 默认连接 `shop_db`，`Db::name('coupons')` 找不到表。
- 修复：在 `apps/shop-backend/config/database.php` 加 `'oms'` 副连接指向 `oms_db`；`UserCouponService` 全部改为 `Db::connect('oms')->name(...)`。
- 验证：T7~T10、T12、T14、T16 全过。

## 六、不能自动测的（交手动 - manual-test）
- 小程序领券中心 / 我的优惠券 UI（4 页面 + 2 跳转）
- checkout 页"使用优惠券"入口、应付重算、提交时透传
- Vue 后台 `/marketing/coupons` 页 CRUD + 输入校验 + 单位显示（元 ↔ 分）
- 营销菜单仅 super_admin + sales_ops 可见、warehouse 不可见
- 用 my-coupons 选择券回到 checkout 自动 recompute payTotal

## 七、测试时间
2026-05-30
