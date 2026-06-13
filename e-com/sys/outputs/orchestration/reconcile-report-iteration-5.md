# reconcile-report-iteration-5.md · 主控对账（Phase 2 运行时）

## 【当前焦点】
Phase 2 商城购买闭环（P0+P1）用户实测通过：curl 19 步 + 小程序 9 页全部走通。

## 对账原则
本轮**运行时对账**，证据来自用户本机真实命令输出与小程序操作。

---

## 一、19 步 curl 链路验证（用户实测全过）

| # | 验证项 | 期望 | 实测结果 |
|---|---|---|---|
| 1 | 6 容器 Up | 全部 Up | ✅ |
| 2 | OMS migrate 5 表 | 全部 up | ✅ |
| 3 | OMS seed 5 SKU available=100 | seed 输出 | ✅ |
| 4 | shop-backend migrate 2 表 | 全部 up | ✅ |
| 5 | restart 3 容器 | 全部 Restarted | ✅ |
| 6 | 4 后端 /health | 4× db=ok redis=ok | ✅ |
| 7 | PIM `GET /sku/:code` + `POST /sku/batch` | iPhone 详情 + 批量 | ✅ |
| 8 | OMS `GET /inventory/:sku` | available=100 | ✅ |
| 9 | shop `POST /sms/code` | dev 模式 code=123456 | ✅ |
| 10 | shop `POST /user/login` | 返回 JWT token | ✅ |
| 11 | `GET /user/me` Bearer 鉴权 | 返回用户 + 默认地址 | ✅ |
| 12 | `POST /cart/add` | id=1 | ✅ |
| 13 | `GET /cart/list` | 1 条 iPhone | ✅（隐式通过下单使用购物车）|
| 14 | `POST /order/submit` 含 Idempotency-Key | order_no=SO... pending_pay | ✅ |
| 15 | 库存被锁 | 100/0 → 98/2 | ✅ |
| 16 | `POST /payment/callback/mock` | status=paid + paid_at | ✅ |
| 17 | `GET /order/{no}` | status=paid | ✅ |
| 18 | `GET /order/list` | total=1 | ✅ |
| 19 | 取消 + 库存回滚 | cancelled + 100/0 | ✅（99/1 → 100/0）|

订单实测：
- SO202605251902125045（2 件 iPhone）→ paid，¥20,008.00
- SO202605251905361562（1 件 T 恤）→ cancelled，库存回滚

## 二、小程序闭环（9 页）

用户实测全过：登录 → 首页 → 详情 → 加购 → 购物车 → 结算 → 支付 → 支付成功 → 订单详情 → 我的 → 全部订单。

## 三、本轮发现并修复的 7 项运行时问题

| # | 问题 | 根因 | 修复 | 影响文件 |
|---|---|---|---|---|
| 1 | `inventory_status` migration 报 `All parts of a PRIMARY KEY must be NOT NULL` | phinx string 列默认 nullable，作为 PK 不允许 | 显式 `null => false` | oms 20260525000003 migration |
| 2 | PIM `/sku/SPU001-001` 返回 404 | TP8 路由 `:param` 默认正则 `\w+` 不含 `-`，SKU code 截断成 `SPU001` | 全部 SKU/orderNo 路由加 `->pattern(['xxx' => '[\w\-\.]+'])` | pim/oms/shop 三处 route/app.php |
| 3 | 登录返回"验证码错误或过期" | PHP 容器时区 Asia/Shanghai vs MySQL 容器 UTC 差 8 小时，`created_at >= PHP date()` 永不命中 | SmsService::verifyCode 改用 `whereRaw("created_at >= NOW() - INTERVAL N SECOND")` | shop SmsService.php |
| 4 | 登录 500 `DomainException: Provided key is too short` | firebase/php-jwt 7.x 要求 HS256 密钥 ≥ 32 字节，旧 secret 仅 30 字节 | JWT_SECRET 改为 48 字节 | apps/.env + .env.example |
| 5 | `/user/me` 带 Bearer 返回 "未登录" | nginx 默认不透传 HTTP_AUTHORIZATION 给 fastcgi | 加 `fastcgi_param HTTP_AUTHORIZATION $http_authorization;` | apps/nginx.conf（需 rebuild）|
| 6 | `/order/submit` 返回 "Idempotency-Key 必传"（已传） | TP8 中间件/控制器阶段 `$request->header('Custom-Header')` 不稳，自定义头读不到 | 所有自定义头读取统一 fallback 到 `$_SERVER['HTTP_*']` | shop Auth/Order/Payment + oms Order |
| 7 | `/order/{no}/cancel` 返回 "items 不能为空" | OMS `Route::post('order', 'Order/create')` 与 `Route::post('order/:no/cancel')` 在 TP8 group 内匹配冲突，POST 都落到 create | 把 `order` 改为 `order/create` 精确路由；shop-backend 转发 URL 同步更新；`<orderNo>` 占位符替代 `:orderNo` | oms route + shop Order controller |

## 四、本轮带来的工程改进（沉淀到主干代码）

| 改进 | 长期价值 |
|---|---|
| `Auth::getHeader()` + `Order::getHeader()` helper | 之后所有 controller 读 header 都通过这两个方法，自定义头不再丢 |
| `OrderStateMachine` 显式 transition log | 取消订单时自动写 status_log；库存解锁同事务 |
| `InventoryService::lockBatch/unlockBatch` 通过实测 | 真实事务 + 行锁验证可用；下次 WMS outbound 复用 outboundBatch |
| 路由 `pattern` 模板 | SKU/orderNo 都用 `[\w\-\.]+`；后续新接口直接复用 |
| JWT_SECRET ≥ 32 字节硬性要求 | 写到 .env.example 注释（M2 加 doc）|

## 五、与 v2 prompt §九 / api-list §八 优先级对账

| 优先级 | 范围 | 状态 |
|---|---|---|
| P0 | 4 健康检查 + 登录鉴权 + SKU CRUD（pim 只用到 read）| ✅ |
| P1 | 首页 + 商品详情 + 库存查询 | ✅（小程序 + curl 双通）|
| P2 | 下单 + mock 支付 + 状态机 | ✅（pending_pay→paid 通过；cancel→库存回滚通过）|
| P3 | OMS → WMS 拣货单 | 🟡（OMS 写表，不真调 WMS）— M2 |
| P4 | 购物车 + 订单详情 + 我的 | ✅ |

## 六、剩余非阻塞事项（M2+）

| 编号 | 事项 | 处理 |
|---|---|---|
| Q5-01 | 时区不一致（PHP CST vs MySQL UTC）| M2 统一容器 TZ 为 Asia/Shanghai；当前仅 SmsService 已处理 |
| Q5-02 | OMS → WMS 真实下发拣货单 | M2（picking_orders 表已建好）|
| Q5-03 | 真实微信支付签名 | M3 |
| Q5-04 | 短信真实下发 | M3 |
| Q5-05 | 地址簿多地址 CRUD | M2 |
| Q5-06 | refresh token + token 黑名单 | M2 |
| Q5-07 | 订单超时自动取消（30min schedule worker）| M2 |
| Q5-08 | 库存对账定时任务 | M2 |
| Q5-09 | TP8 `$request->header()` 自定义头不稳的根因（M2 调研）| M2 |

## 七、对账结论

✅ **Phase 2 P0+P1 端到端真实可运行**。从 iteration-4 代码交付（76 文件）到 iteration-5 修 7 项坑（~10 文件改动），最终：
- 19 步 curl 链路全过
- 小程序 9 页 + 4 tab 全过
- 库存四态 lock/unlock 双向验证
- 状态机 pending_pay→paid + pending_pay→cancelled 双路径验证
- JWT 鉴权链路通

Phase 2 主线就绪。下一步由用户决定何时启动：
- **Phase 2 P2**：OMS → WMS 真实拣货 + 出库回传（picking_orders 已表，WMS 需补 controller）
- **Phase 2 P4**：PIM 后台 CRUD 全量界面（admin Vue 后台扩展）
- **Phase 3**：真实微信支付 + 短信网关

## 八、对账时间
2026-05-25

## 九、本对账使用的 skill
- `karpathy-guidelines`（修复迭代保持小步、surgical 改动、不引入过度抽象；header fallback 直接 `$_SERVER` 而非自造 HTTP 抽象层）
