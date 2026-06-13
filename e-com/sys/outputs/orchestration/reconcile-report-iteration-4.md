# reconcile-report-iteration-4.md · 主控对账（Phase 2 P0+P1 购买闭环）

## 【当前焦点】
Phase 2 商城端到端购买闭环（P0+P1）代码全量交付完成。等待用户跑通验证脚本后回填运行时证据。

## 对账原则
本轮**代码完成度对账**，运行时验证由用户执行后回写。已尽力按 iteration-3 的经验避坑（log/cache 配置、named volume、TP8 路由前缀、SKU 价格快照等），但仍可能在用户实测中发现新问题——按 [reconcile-report-iteration-3.md](reconcile-report-iteration-3.md) 模式处理。

---

## 一、文件交付清单（共 76 个文件新增/修改）

### Wave A · OMS-backend（19 文件）

| 类型 | 文件 |
|---|---|
| migration | `database/migrations/20260525000001_create_order_items.php` |
| migration | `database/migrations/20260525000002_create_order_status_log.php` |
| migration | `database/migrations/20260525000003_create_inventory_status.php` |
| migration | `database/migrations/20260525000004_create_inventory_log.php` |
| migration | `database/migrations/20260525000005_create_picking_orders.php` |
| seed | `database/seeds/SeedInventory.php` |
| model | `app/model/Order.php` |
| model | `app/model/OrderItem.php` |
| model | `app/model/OrderStatusLog.php` |
| model | `app/model/InventoryStatus.php` |
| model | `app/model/InventoryLog.php` |
| model | `app/model/PickingOrder.php` |
| service | `app/service/InventoryService.php` |
| service | `app/service/OrderStateMachine.php` |
| service | `app/service/OrderService.php` |
| controller | `app/controller/Order.php` |
| controller | `app/controller/Inventory.php` |
| controller | `app/controller/Payment.php` |
| route | `route/app.php` |

### Wave B · PIM-backend（2 文件）

| 类型 | 文件 |
|---|---|
| controller | `app/controller/Sku.php`（GET /sku/:code + POST /sku/batch）|
| route | `route/app.php`（注册 2 新接口）|

### Wave C · shop-backend BFF（13 文件）

| 类型 | 文件 |
|---|---|
| migration | `database/migrations/20260525000001_create_cart.php` |
| migration | `database/migrations/20260525000002_create_sms_log.php` |
| model | `app/model/User.php` |
| model | `app/model/Cart.php` |
| model | `app/model/SmsLog.php` |
| service | `app/service/JwtService.php` |
| service | `app/service/SmsService.php` |
| middleware | `app/middleware/Auth.php` |
| controller | `app/controller/User.php` |
| controller | `app/controller/Cart.php` |
| controller | `app/controller/Product.php`（补 detail + OMS 库存聚合）|
| controller | `app/controller/Order.php`（BFF 代理 OMS）|
| controller | `app/controller/Payment.php`（wxpay mock + callback mock 转发）|
| route | `route/app.php`（公开组 + 鉴权组）|

### Wave D · shop-miniprogram（41 文件）

| 类型 | 文件 |
|---|---|
| api 封装 | `apis/index.js`（全量重写：user / cart / order / payment 12 接口）|
| 工具 | `utils/auth.js`（isLogin / requireLogin / saveLogin / clearLogin）|
| 全局 | `app.json`（注册 9 页面 + tabBar 4 项）|
| 页 1 home | 复用 + `pages/home/index.js` 改 onProductTap 跳详情 |
| 页 2 login | `pages/login/{index.js,index.wxml,index.wxss,index.json}` |
| 页 3 detail | `pages/detail/{4 文件}` |
| 页 4 cart | `pages/cart/{4 文件}` |
| 页 5 checkout | `pages/checkout/{4 文件}` |
| 页 6 pay | `pages/pay/{4 文件}` |
| 页 7 pay-result | `pages/pay-result/{4 文件}` |
| 页 8 order-list | `pages/order-list/{4 文件}` |
| 页 9 order-detail | `pages/order-detail/{4 文件}` |
| 页 10 me | `pages/me/{4 文件}` |

合计代码量：~3500 行（PHP ~1500 / JS ~900 / WXML ~600 / WXSS ~500）。

---

## 二、与 api-list.md §八 优先级对账

| 优先级 | 范围 | 状态 |
|---|---|---|
| P0 | 4 健康检查 / 4 后端骨架 | ✅（iteration-3 已通过）|
| P0 | shop 登录鉴权（手机号+验证码+JWT）| ✅（dev 模式固定 123456）|
| P1 | 首页 + 商品详情链路（shop + pim + oms 库存）| ✅（详情聚合 OMS available）|
| P2 | 下单 + 模拟支付（shop + oms）| ✅（mock callback 闭环）|
| P3 | OMS 下发 WMS 拣货单 | 🟡（仅 OMS 写表 picking_orders；不真调 WMS）|
| P4 | 周边（购物车增强、订单详情、运维接口）| ✅ 购物车 / 订单详情；运维 M2 |

---

## 三、库存四态实现验证

| 操作 | OMS API | 行为 | 流水 change_type |
|---|---|---|---|
| 下单 | POST /order → InventoryService::lockBatch | available -qty / locked +qty | lock |
| 取消 | POST /order/:no/cancel → unlockBatch | available +qty / locked -qty | unlock |
| 出库 | (M2 由 WMS 回传触发) outboundBatch | locked -qty | outbound |

事务级别：`Db::startTrans` + `lock(true)` 行锁 + commit/rollback。
约束：CHECK(available>=0 AND locked>=0 AND reserved>=0)（schema 定义；migration 中 phinx 无 CHECK 支持，用应用层校验代替）。

## 四、订单状态机

```
pending_pay ──pay──> paid ──pick──> picking ──ship──> shipped ──confirm──> completed
       │
       └──cancel──> cancelled
       │
       └──error──> exception ─(admin recover)──> 任意状态
```

实现：`OrderStateMachine::can() / ::transit()`，每次转换写 `order_status_log`。
非法转移：抛 `RuntimeException`，外层 catch 返回 409。

## 五、本轮主动避坑（吸取 iteration-3 经验）

| 风险点 | 提前规避 |
|---|---|
| TP8 路由 `s=$uri` | 复用 iteration-3 已修的 nginx.conf，新接口直接生效 |
| Cache/Log 缺 default driver | 不引入新 cache/log 用法，纯 Db 即可 |
| 跨服务 Guzzle timeout | 统一 3-5s timeout + try/catch 504 |
| Idempotency-Key | 写接口（订单/取消/确认/支付）均强制；DB 唯一索引兜底 |
| 价格篡改 | OMS 创建订单时**重新从 PIM 拉价**，不信任客户端传入 |
| 库存超卖 | 行锁 + UPDATE 后 CHECK；同事务原子操作 |
| 小程序 wxml mustache 限制 | 价格在 JS 预格式化为 `*Yuan` 字段，wxml 只 `{{ }}` |
| dev 验证码 | 固定 123456 + sendCode 直接返回明文，便于联调 |
| 容器内 URL | `PIM_BACKEND_URL=http://pim-backend` 用 Docker DNS |

## 六、待用户运行验证（本轮无法在主控完成的部分）

| 验证项 | 命令/操作 | 期望 |
|---|---|---|
| migrate 新增表 | `docker-compose exec shop-backend php think migrate:run`（同 oms-backend）| 2 表 + 5 表新增 |
| seed inventory | `docker-compose exec oms-backend php think seed:run --seeder=SeedInventory` | 5 SKU available=100 |
| 重启 PHP 容器 | `docker-compose restart shop-backend pim-backend oms-backend` | route 变更生效 |
| 短信发送 | `curl -XPOST :8001/api/v1/sms/code -d '{"phone":"13800138000"}'` | 返回 code=123456 |
| 登录得 token | `curl -XPOST :8001/api/v1/user/login -d '{"phone":..,"code":"123456"}'` | data.token |
| 加购 | `curl -H "Authorization: Bearer $T" -XPOST :8001/api/v1/cart/add -d '...'` | code=0 |
| 下单 | `curl -H "...Bearer..." -H "Idempotency-Key:x" -XPOST :8001/api/v1/order/submit` | order_no |
| 支付 | `curl -XPOST :8001/api/v1/payment/callback/mock -d '{"order_no":"SO..."}'` | status=paid |
| 查订单 | `curl -H "...Bearer..." :8001/api/v1/order/SO...` | status=paid + 库存 -1 |
| 小程序闭环 | 微信开发者工具：登录→首页→详情→购物车→结算→支付→订单详情 | 7 页面顺次跳转 |

详细见 [iteration-4-runbook.md](iteration-4-runbook.md) §"用户运行验证脚本"。

## 七、已知非阻塞事项（推迟到 M2）

| 编号 | 事项 | 处理 |
|---|---|---|
| Q4-01 | 真实微信支付签名 | M3 |
| Q4-02 | OMS → WMS 真实下发拣货单 | M2 |
| Q4-03 | 短信真实下发（阿里云/腾讯云） | M3 |
| Q4-04 | 地址簿 CRUD（多地址） | M2，先用 `users.last_address_snapshot` 单地址 |
| Q4-05 | Redis Stream 事件总线 | M2（M1 同步 HTTP 已够证明）|
| Q4-06 | 订单超时自动取消（30 分钟） | M2 添加 schedule worker |
| Q4-07 | refresh token | M2 |
| Q4-08 | 库存对账定时任务 | M2 |

## 八、本轮带来的工程改进

| 改进 | 长期价值 |
|---|---|
| `JwtService` 抽象 | shop/wms 后续可共享同一密钥/算法 |
| `OrderStateMachine` 显式枚举转移 | 防止后续业务任意改单状态，每次转换强制写日志 |
| `InventoryService` 单点事务封装 | 库存安全的唯一入口，未来 Redis Stream 接入只需替换 |
| BFF 模式（shop → oms/pim）| 小程序只对接 shop，跨服务对小程序透明 |

## 九、对账结论

✅ **代码全量交付**：76 个文件，4 个 Wave，全部按 [iteration-4-runbook.md](iteration-4-runbook.md) 范围完成。
⏳ **运行时验证**：等待用户执行验证脚本后回填到 [progress.md](../../progress.md)。
🔄 **预期返工**：参考 iteration-3 经验，可能仍需 5-10 项小修，将在 iteration-5 集中处理。

## 十、对账时间
2026-05-25

## 十一、本对账使用的 skill
- `karpathy-guidelines`（保持简单：状态机用 const 数组而非状态模式；库存服务直接 facade Db 不引入 Repository 层；小程序原生 page 不封 component）
