# Iteration 4 · Runbook（购物车 + 下单闭环，不含支付）

## 【当前焦点】

- 范围：TRADE-003 购物车 + TRADE-004 结算下单 + TRADE-004-01 地址 + TRADE-006-01/02 订单列表/详情
- 目标：浏览 → 加购物车 → 调整 → 结算 → 生成订单 → 我的订单列表/详情 完整闭环
- 不含：支付（TRADE-005）/ 物流跟踪 / 退款 / 评价 → iter-5 起
- 简化版：单 SKU 商品（继承 iter-3 简化），运费先固定 10 元 / 单 / 单条 SKU 上限 99

## Backend 任务

| Task | 简述 |
|------|------|
| Migration: addresses | 地址表（receiver / phone / 省市区 / detail / is_default） |
| Migration: carts + cart_items | 购物车（按 user_id + active_role 唯一） |
| Migration: orders + order_items | 订单（含 order_no / status / 金额冗余 / 收货地址 snapshot） |
| Models: Address, Cart, CartItem, Order, OrderItem | Eloquent + 关系 |
| AddressController | CRUD + 设默认 |
| CartController | get / add / updateQty / remove / toggleSelected / clearInvalid |
| OrderController | create（结算→生成订单 + 扣库存）/ index / show / cancel（仅 pending_payment）|

## Frontend 任务

| Task | 简述 |
|------|------|
| api/cart.ts / address.ts / order.ts | RESTful 封装 |
| stores/cart.ts | Pinia store（badge count + 全量列表） |
| CartPage.vue | 购物车列表（勾选/调数量/删除/总价/去结算）|
| CheckoutPage.vue | 结算（默认地址 + 商品明细 + 价格汇总 + 提交订单）|
| AddressManagePage.vue | 地址 CRUD |
| OrderListPage.vue | 我的订单列表（按状态 tab） |
| OrderDetailPage.vue | 订单详情 |
| ProductDetailPage.vue | 加购按钮接入真实接口 |
| App.vue 顶部 | 加购物车 badge（已登录时） |

## 切换条件

1. 浏览器走通：加购→购物车→结算→生成订单→订单详情
2. PHPUnit 新增 ≥ 10 PASS
3. Vitest 新增 ≥ 3 PASS
4. 库存正确扣减（订单创建时 SKU.stock 减）

## 不在 iter-4 范围

- ❌ 真实支付（微信/支付宝/对公转账上传凭证）
- ❌ Redis 预扣库存的精细化（本期 MySQL 乐观锁 + 事务即可）
- ❌ 运费按重量/地址精算（先固定 10 元）
- ❌ 优惠券/活动
- ❌ 物流跟踪
- ❌ 退款/取消审批流（仅简单 pending_payment 状态可取消）
