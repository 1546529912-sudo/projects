# iteration-4-runbook.md · Phase 2 商城端到端购买闭环（P0+P1）

## 【当前焦点】
基于 Phase 1 已跑通的 4 后端骨架与端到端 BFF，按 [api-list.md](../architecture/api-list.md) §八优先级 P0+P1，把"用户从首页 → 商品详情 → 加购 → 结算 → 模拟支付 → 看到订单"这条主链路真实跑通。

不在本轮范围（M2 处理）：
- PIM 后台 CRUD 全量界面（仅 GET /sku/{code} 与 /sku/batch 在 PIM 侧补足，已有 list/health 直接复用）
- WMS 出库回传（OMS 侧仍写库存 outbound，但不真实推 WMS 拣货单消费）
- Redis Stream 事件总线（M1 用同步 HTTP + DB 状态机即可证明闭环）
- 短信真实下发（dev 模式：sms_code 固定 `123456`，写 sms_log 表）
- 微信支付真实签名（mock callback：直接 POST 即视为已支付）

## 本轮范围（按 Wave 推进）

### Wave A · OMS（订单管理 + 库存四态 + 状态机 + 支付回调）
任务 ID 取自 [task-spec.md](../product/task-spec.md) §3 OMS 部分（OMS-001 … OMS-040）。

| 任务 | 内容 | 输出 |
|---|---|---|
| OMS-DB-001 | migrations 新增：order_items / order_status_log / inventory_status / inventory_log / picking_orders | 5 migration 文件 |
| OMS-DB-002 | seed 写入 5 条 inventory_status（与 PIM 5 SKU 对齐，初始 available=100） | SeedInventory.php |
| OMS-MOD-001 | Model：Order / OrderItem / OrderStatusLog / InventoryStatus / InventoryLog / PickingOrder | 6 model |
| OMS-SVC-001 | InventoryService：lock / unlock / outbound 三个原子方法，事务 + 行锁 + 写流水 | InventoryService.php |
| OMS-SVC-002 | OrderService：create（含库存预校验 + 锁定 + 幂等键 + 状态机 init） | OrderService.php |
| OMS-SVC-003 | OrderStateMachine：pending_pay→paid→picking→shipped→completed + cancel/exception | OrderStateMachine.php |
| OMS-CTL-001 | OrderController：POST /order / GET /order/{no} / GET /order/list / POST /order/{id}/cancel / POST /order/{id}/confirm | Order.php |
| OMS-CTL-002 | InventoryController：GET /inventory/{sku} / POST /inventory/batch / POST /inventory/precheck | Inventory.php |
| OMS-CTL-003 | PaymentController：POST /payment/callback（mock，直接置 paid） | Payment.php |
| OMS-RT-001 | route/app.php 注册全部 API | route/app.php 更新 |

### Wave B · shop-backend BFF（登录 + 购物车 + 详情 + 订单代理 + 支付）
任务 ID 取自 [task-spec.md](../product/task-spec.md) §1 商城后端。

| 任务 | 内容 | 输出 |
|---|---|---|
| SHOP-DB-001 | migrations 新增：cart / sms_log（users 已建） | 2 migration |
| SHOP-MOD-001 | Model：User / Cart / SmsLog | 3 model |
| SHOP-SVC-001 | JwtService：sign / verify（HS256，密钥来自 env JWT_SECRET） | JwtService.php |
| SHOP-SVC-002 | SmsService：sendCode（dev：固定 123456，写 sms_log） / verifyCode | SmsService.php |
| SHOP-MID-001 | AuthMiddleware：从 Authorization 取 JWT，注入 user_id 到 request | Auth.php |
| SHOP-CTL-001 | UserController：POST /sms/code / POST /user/login / POST /user/logout / GET /user/me | User.php |
| SHOP-CTL-002 | CartController：GET /cart/list / POST /cart/add / PUT /cart/{id} / DELETE /cart/{id} / POST /cart/clear-invalid | Cart.php |
| SHOP-CTL-003 | ProductController 补：GET /product/{sku}（PIM 详情 + OMS 库存） | Product.php 增 |
| SHOP-CTL-004 | OrderController：proxy → OMS（5 接口） | Order.php |
| SHOP-CTL-005 | PaymentController：POST /payment/wxpay（mock 返回 prepay_id） / POST /payment/callback/mock → OMS | Payment.php |
| SHOP-RT-001 | route/app.php 注册：分公开组 / 鉴权组 | route/app.php 重写 |

### Wave C · 小程序（8 页：登录 / 首页升级 / 详情 / 购物车 / 结算 / 支付 / 结果 / 订单列表 / 订单详情）

| 任务 | 内容 | 输出 |
|---|---|---|
| MP-API-001 | apis/index.js 补全：user / cart / order / payment 全部接口封装 | apis/index.js |
| MP-UTIL-001 | utils/auth.js：存/取/清 token；isLogin() | auth.js |
| MP-PAGE-001 | pages/login：手机号 + 验证码（dev 模式 toast 提示固定 123456） | login.{js,wxml,wxss,json} |
| MP-PAGE-002 | pages/home：升级—点商品卡片跳详情 | home/index.js 增 onTapItem |
| MP-PAGE-003 | pages/detail：商品详情（PIM 数据 + OMS 库存），加购按钮 | detail/* 4 文件 |
| MP-PAGE-004 | pages/cart：购物车列表 + 选中/改数量/删除 + 结算 | cart/* 4 文件 |
| MP-PAGE-005 | pages/checkout：结算确认（地址 mock + 商品 + 应付） | checkout/* 4 文件 |
| MP-PAGE-006 | pages/pay：mock 支付按钮 + 调 /payment/callback/mock | pay/* 4 文件 |
| MP-PAGE-007 | pages/order-list：订单列表（5 状态 tab） | order-list/* 4 文件 |
| MP-PAGE-008 | pages/order-detail：订单详情 + 取消/确认收货 | order-detail/* 4 文件 |
| MP-CFG-001 | app.json 注册新页面 + tabBar 加"我的"占位 | app.json |

## 文件清单预估
- OMS：~22 文件（5 migration + 1 seed + 6 model + 3 service + 3 controller + 1 route + 3 杂项）
- shop-backend：~20 文件
- 小程序：~32 文件（8 页 × 4 + 1 api + 1 util + 2 配置）

合计 **~74 个新增/修改文件**。

## 关键技术决策

| 决策 | 选择 | 理由 |
|---|---|---|
| Token | JWT HS256（firebase/php-jwt 已装） | 7 天过期；refresh 暂不做 |
| Idempotency-Key | 写入 orders.idempotency_key 唯一索引 | 已在 schema 中 |
| 库存锁定时机 | OrderService::create 内同事务锁库存 | 减少超卖窗口；行锁 + UPDATE check |
| 支付回调 | mock：小程序点击"已支付" → shop /payment/callback/mock → OMS /payment/callback | 不走签名；M3 接真实微信支付 |
| WMS 拣货 | OMS 写 picking_orders 表 + 改单状态为 picking；不真调 WMS | M2 处理 |
| 收货地址 | hard-code 一条默认地址写在 users.last_address_snapshot；下单时回填 | 地址簿 M2 做 |
| 验证码 | dev：返回固定 `123456`，写 sms_log；前端 toast 提示 | 真实短信 M3 |
| 库存初始化 | seed 5 个 SKU available=100 | 配合 PIM seed |

## 跨工程调用关系
```
小程序
  ↓ POST /sms/code, /user/login          shop-backend Auth
  ↓ GET  /home/recommend                 shop-backend → PIM /spu/list
  ↓ GET  /product/{sku}                  shop-backend → PIM /sku/{code} + OMS /inventory/{sku}
  ↓ POST /cart/add                       shop-backend Cart（DB）
  ↓ GET  /cart/list                      shop-backend Cart + PIM /sku/batch（拿名/图/价）
  ↓ POST /order/submit                   shop-backend → OMS POST /order
                                              OMS → PIM /sku/batch 校验价格
                                              OMS InventoryService.lock
  ↓ POST /payment/wxpay                  shop-backend mock 返回
  ↓ POST /payment/callback/mock          shop-backend → OMS /payment/callback
                                              OMS 改 orders.status=paid + 写 picking_orders
  ↓ GET  /order/list, /order/{no}        shop-backend → OMS /order/list, /order/{no}
```

## PIM 侧本轮新增（最小）
为了让 OMS 校验下单 SKU 价格、shop-backend 拉详情，需要补 2 个 PIM 接口：

| 任务 | 内容 |
|---|---|
| PIM-CTL-001 | GET /api/v1/sku/{code} 返回单个 SKU 详情（已有 SPU list 已写 mock，但 SKU 详情未写） |
| PIM-CTL-002 | POST /api/v1/sku/batch 批量返回 |

## 用户运行验证脚本（本轮交付后）
```bash
cd apps && docker-compose up -d --build
docker-compose exec shop-backend php think migrate:run
docker-compose exec oms-backend php think migrate:run
docker-compose exec oms-backend php think seed:run

# 短信
curl -X POST http://localhost:8001/api/v1/sms/code -H 'Content-Type: application/json' -d '{"phone":"13800138000"}'
# → {"code":0,"data":{"code":"123456"}}（dev 返回明文）

# 登录
TOKEN=$(curl -sX POST http://localhost:8001/api/v1/user/login -H 'Content-Type: application/json' -d '{"phone":"13800138000","code":"123456"}' | jq -r .data.token)

# 加购
curl -X POST http://localhost:8001/api/v1/cart/add -H "Authorization: Bearer $TOKEN" -H 'Idempotency-Key: u1' -d '{"sku_code":"SPU001-001","qty":1}'

# 下单
ORDER_NO=$(curl -sX POST http://localhost:8001/api/v1/order/submit -H "Authorization: Bearer $TOKEN" -H 'Idempotency-Key: o1' | jq -r .data.order_no)

# 模拟支付
curl -X POST http://localhost:8001/api/v1/payment/callback/mock -d "{\"order_no\":\"$ORDER_NO\"}"

# 查订单
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/order/$ORDER_NO
# 期望 status=paid，库存 -1
```

小程序：登录 → 首页点商品 → 详情加购 → 购物车结算 → 模拟支付 → 看到"支付成功"页 → 跳订单详情 status=已支付。

## 升级与阻塞
（本轮无升级到用户决策的事项；所有决策已在 v2 prompt §零默认值 + iteration-3 验收清单中预设）

## 对账触发
本 runbook 完成 + 三个 Wave 全部代码就绪后，生成 [reconcile-report-iteration-4.md](reconcile-report-iteration-4.md)。
