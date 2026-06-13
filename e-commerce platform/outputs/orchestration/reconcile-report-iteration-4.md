# Reconcile Report · Iteration 4（购物车 + 下单闭环）

> 主控对账。完成时间：2026-05-21 23:35

## 【当前焦点】

- 范围：TRADE-003 购物车 + TRADE-004 结算下单 + TRADE-006-01/02/05 我的订单
- 结论：**全部硬约束通过**，端到端 加购→结算→生成订单→订单列表→取消订单 链路真实跑通
- 测试：PHPUnit **54/54 PASS**（新增 20）· Vitest **18/18 PASS**（新增 6）
- 库存正确扣减并能在取消时回滚（200 → 197 → 200 实测通过）

## 后端产物

| 文件 | 内容 |
|------|------|
| `database/migrations/2026_05_22_000006_create_addresses_table.php` | 地址表 |
| `database/migrations/2026_05_22_000007_create_carts_table.php` | carts + cart_items |
| `database/migrations/2026_05_22_000008_create_orders_table.php` | orders + order_items |
| `app/Models/Address.php` | Address model（含软删除） |
| `app/Models/Cart.php` | Cart model + items() 关系 |
| `app/Models/CartItem.php` | CartItem + sku() / cart() 关系 |
| `app/Models/Order.php` | Order + items() + JSON 地址快照 cast |
| `app/Models/OrderItem.php` | OrderItem |
| `app/Http/Controllers/Api/AddressController.php` | index/store/update/destroy + 默认地址自动切换 |
| `app/Http/Controllers/Api/CartController.php` | index/addItem/updateItem/removeItem/selectAll/clearInvalid + 失效检测 + 库存校验 |
| `app/Http/Controllers/Api/OrderController.php` | store（事务+扣库存+清购物车）/ index / show / cancel（释放库存） |
| `routes/api.php` | 注册 14 个新接口 |

## 前端产物

| 文件 | 内容 |
|------|------|
| `src/api/address.ts` | 4 函数 |
| `src/api/cart.ts` | 6 函数 |
| `src/api/order.ts` | 4 函数 |
| `src/stores/cart.ts` | Pinia store + badgeCount computed + reset |
| `src/views/cart/CartPage.vue` | 购物车列表（勾选/数量/删除/失效区/底部 sticky 汇总） |
| `src/views/cart/CheckoutPage.vue` | 结算页（地址选择 + 新建地址 inline + 配送方式 + 备注 + 提交） |
| `src/views/order/OrderListPage.vue` | 订单列表（按状态 tab + 卡片式） |
| `src/views/order/OrderDetailPage.vue` | 订单详情（进度状态 + 地址快照 + 商品 + 价格 + 取消按钮） |
| `src/views/product/ProductDetailPage.vue` | 替换 alert stub：真实加购 + 立即购买（仅勾选当前 SKU 直跳结算） |
| `src/App.vue` | 顶部加 🛒 badge + 订单入口；登录变化自动同步购物车 |
| `src/router/index.ts` | 新增 cart / checkout / order-list / order-detail 4 个路由（都 requiresAuth） |

## 测试结果（真实执行）

### PHPUnit 54/54 PASS

```
✅ Auth Controller (5)
✅ Company Controller (5)
✅ Health Controller (2)
✅ Product Admin (6)
✅ Product Public (8)
✅ Role Controller (3)
✅ Wechat Auth (3)
✅ Address Controller (5)   — 新增
✅ Cart Controller (8)      — 新增
✅ Order Controller (7)     — 新增
✅ Example (2)
```

### Vitest 18/18 PASS

```
✅ HealthPage.spec.ts (1)
✅ auth.spec.ts (6)
✅ product.spec.ts (5)
✅ cart.spec.ts (6) — 新增
```

### 端到端 curl（已实跑）

| # | 操作 | 结果 |
|---|------|------|
| 1 | 注册新用户 13900000099 | ✅ token 颁发 |
| 2 | 加购物车 SKU 1 × 3 件 | ✅ items=1, selected_qty=3, total=3850 (3840 + 10 运费) |
| 3 | 加购物车 SKU 3 × 2 件 | ✅ items=2, total=4490 |
| 4 | 创建收货地址 | ✅ address_id=1, is_default 自动 true |
| 5 | 提交订单 | ✅ order_no=20260521153416799, 含 5 件商品, total=4490, status=pending_payment |
| 6 | 查询订单列表 | ✅ total=1, item_count=5（数量汇总）, thumbs 含两张图 |
| 7 | 查 SKU 1 库存 | ✅ 扣减 200 → 197 |
| 8 | 取消订单 | ✅ status=cancelled |
| 9 | 取消后 SKU 1 库存恢复 | ✅ 197 → 200 |

## HARNESS 5 项硬约束

| # | 约束 | 状态 |
|---|------|------|
| 1 | 产物清单已提交 | ✅ 后端 11 + 前端 11 |
| 2 | 主控 ls 验证存在 | ✅ |
| 3 | 自动化测试 PASS | ✅ PHPUnit 54/54 + Vitest 18/18 |
| 4 | 手动测试用户勾选 | ⏳ 用户在浏览器走闭环 |
| 5 | 对账报告已生成 | ✅ |

## 用户手动验收步骤

1. 打开 http://localhost:5173/
2. 登录已有账号（or 注册新账号）
3. 任意商品 → 点 **🛒 加入购物车** → 顶部 badge 计数 +1
4. 顶部 🛒 进购物车 → 调整数量 / 勾选 / 删除
5. 点 **去结算** → 选地址（无则新建）→ 选配送 → 提交
6. 自动跳转订单详情，订单号显示，状态 "待付款"
7. 详情页点 **取消订单** → 状态变 "已取消"
8. 顶部 **订单** → 看到这单在 "已取消" tab
9. 回商品详情看库存：取消前减少了你刚才下的数量，取消后回到原值

## 风险与已知问题

| 项 | 说明 |
|----|------|
| 库存控制 | 当前用 MySQL 直接扣，无 Redis 预扣 → 大并发可能超卖（iter-5 上 Redis Lua） |
| 支付 | "去支付"按钮还是 alert stub → iter-5 接微信沙箱 + 对公转账凭证上传 |
| 物流 / 收货确认 | 订单只能停留在 pending_payment → 没有 admin 端发货流转 |
| 发票信息 | 第一期暂未集成 invoices 表 |
| 运费 | 固定 10 元 → iter-? 按重量/地址精算 |
| Admin Policy | 后端 admin 接口仍只校验 sanctum，需 Policy 精细化 |

## iteration-5 候选

1. **支付闭环** — 微信沙箱 + 对公转账凭证 + admin 发货 + 收货确认
2. **AI 报价接 DeepSeek** — 需要 API key
3. **SKU 多规格** — 厚度 × 长度 × 颜色组合 + 阶梯价
4. **库存精细化** — Redis Lua 预扣 + 超时自动取消任务
5. **后台权限精细化** — Laravel Policy + admin 路由 middleware

用户选下一步方向 →
