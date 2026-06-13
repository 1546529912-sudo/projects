# Progress · 任务进度（唯一真相源）

## 【当前焦点】

- **迭代：** iteration-26（label 协作乐观锁 ✅）· 全栈在线
- **测试：** PHPUnit **179/179**（+5）· pytest **22/22** · Vitest **18/18** 全 PASS · vue-tsc 清
- **下一步：** 浏览器验收 → iter-27（URL query 同步 / 移动端覆盖抽屉 / 通知开关 / 其他端点扩展乐观锁）

## 当前问题区

- ⏳ 用户在浏览器走 iter-3 闭环（前台浏览商品 + 后台 CRUD）

## 返工记录区

| 时间 | Task | 问题 | 修复 |
|------|------|------|------|
| 2026-05-21 22:20 | AuthControllerTest | SMS cooldown redis key 残留 → 429 | setUp() flushdb |
| 2026-05-21 22:25 | 未登录 API 返 500 | Laravel 11 默认走 web 异常处理 | bootstrap render 401 JSON |
| 2026-05-21 22:00 | 目录命名 | iCloud Drive 把 mv backend 2 → backend 还原 | 改名 backend-laravel |
| 2026-05-21 23:10 | TypeScript .vue 模块未声明 | 缺 shim | 加 shims-vue.d.ts |
| 2026-05-21 23:11 | Vitest vi.mock factory 引用外部变量 | hoist 时变量未初始化 | 用 vi.hoisted() |

## 已完成迭代

### Iteration 1 · 项目初始化 ✅
（见 [reconcile-report-iteration-1.md](outputs/orchestration/reconcile-report-iteration-1.md)）

### Iteration 2 · TRADE-001 用户认证闭环 ✅
（见 [reconcile-report-iteration-2.md](outputs/orchestration/reconcile-report-iteration-2.md)）
- TRADE-001-01..06 全 6 子功能 PHPUnit + Vitest 通过
- 端到端 curl 8 步链路全跑

### Iteration 3 · 商品展示闭环 ✅
（见 [reconcile-report-iteration-3.md](outputs/orchestration/reconcile-report-iteration-3.md)）

### Iteration 4 · 购物车 + 下单闭环 ✅
（见 [reconcile-report-iteration-4.md](outputs/orchestration/reconcile-report-iteration-4.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| TRADE-003-01..04 | development | ✅ | CartControllerTest 8/8 + 失效检测 |
| TRADE-004-01..03 | development | ✅ | AddressControllerTest 5/5 + OrderControllerTest 7/7 |
| TRADE-006-01/02/05 | development | ✅ | 订单列表/详情/取消 |
| CART-FE | frontend | ✅ | CartPage/CheckoutPage/OrderListPage/OrderDetailPage + cart store + badge |
| 端到端 | testing | ✅ | 注册→加购→地址→提交→取消，库存 200→197→200 实测 |
| CART-TESTS | testing | ✅ | Vitest cart store 6/6

### Iteration 5 · 支付闭环 + 订单生命周期 ✅
（见 [reconcile-report-iteration-5.md](outputs/orchestration/reconcile-report-iteration-5.md)）

### Iteration 6 · AI 报价 + 智能客服 ✅（mock LLM 模式 + 视觉切换）
（见 [reconcile-report-iteration-6.md](outputs/orchestration/reconcile-report-iteration-6.md)）

### Iteration 7 · SKU 多规格 + 阶梯价 ✅
（见 [reconcile-report-iteration-7.md](outputs/orchestration/reconcile-report-iteration-7.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| TRADE-007-05 | development | ✅ | PriceTierTest 6/6 + resolvePrice 区间匹配 + snapshot_price 写入 |
| SKU-SPECS | development | ✅ | sku_specs 表 + 13 条参数（T700 板 thickness/density 等） |
| MULTI-SKU | development | ✅ | ProductController.show 返 skus[] + price_range + sku_count |
| ORDER-TIER | development | ✅ | OrderController 用 snapshot_price 写 order_items.unit_price |
| AI-TIER | development | ✅ | catalog_repo.resolve_price + quotation_engine 阶梯价 + 节省提示 |
| FE-DETAIL-V2 | frontend | ✅ | ProductDetailPage 重写：SKU chips + 阶梯价表（命中档蓝高亮）+ 动态价 + 规格表 |
| 真实 DeepSeek | infra | ✅ | python-dotenv 自动加载 .env，llm_provider 实接 deepseek-v4-flash |
| 端到端 | testing | ✅ | T700 1/100/500/1500kg 四档实测：¥1380/¥1280/¥1180/转销售

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| AI-001-01..05 | development | ✅ | AiController 7/7 + chat/turn 端到端：意图识别+参数采集+报价单生成+一键加购 |
| AI-002-01/02/07/08 | development | ✅ | intent_classifier 5 大意图 + 上下文持久化 + 闲聊兜底 |
| AI-003-01 | development | ✅ | 关键词触发转人工 + transferred 状态机锁 |
| AI-LLM-PROVIDER | development | ✅ | provider 抽象 mock/deepseek/dashscope 三选一，业务侧无感切换 |
| AI-CATALOG | development | ✅ | catalog_repo 直连 SQLite 真实查 SKU + 价格 |
| AI-FE-DRAWER | frontend | ✅ | AiDrawer 全局抽屉 + 参数 chips + 报价单卡 + 浮按钮 |
| AI-FE-DETAIL | frontend | ✅ | 详情页"AI 报价"接通，预填商品上下文 |
| VISUAL-IKB | design | ✅ | 主色换 #002fa7 (Klein Blue) + 商品图换 picsum 稳定 seed |
| BE-TESTS | testing | ✅ | PHPUnit AiController 7/7 |
| AI-TESTS | testing | ✅ | pytest chat/turn 8/8（闲聊/参数全/不全/大批量/转人工/售前/售后/兼容） |
| 端到端 | testing | ✅ | "我要碳纤维板"→追问→"100kg"→报价单 Q2026052123290103→加购 100 件 ¥128010 真实跑通

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| TRADE-005-01 | development | ✅ | PaymentControllerTest mock 通道 + 幂等 |
| TRADE-005-02 | development | ✅ | 对公转账上传凭证 + admin 审核 |
| TRADE-006-04 | development | ✅ | OrderControllerTest confirmReceipt 正/反路径 |
| TRADE-008-02 | development | ✅ | OrderAdminTest 发货 + 物流写入 |
| TRADE-008-04 | development | ✅ | OrderAdminTest 凭证通过/驳回流转 |
| PAY-FE | frontend | ✅ | PaymentPage（方式选+mock二维码+对公）+ admin OrderListPage |
| 端到端 | testing | ✅ | pending_payment→shipped→completed 全状态机实测 |
| BE-TESTS | testing | ✅ | PHPUnit 新增 12（Payment 6 + Admin 4 + Receipt 2）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| TRADE-002-01..05 | development | ✅ | ProductPublicTest 8/8 + HomePage 真实拉数据 |
| TRADE-007-01 | development | ✅ | ProductAdminTest 6/6 + 表单页 |
| TRADE-007-03 | development | ✅ | toggle 接口 + 列表内按钮 |
| TRADE-007-04 | development | ✅ | stock 字段 + 编辑入口 |
| CATALOG-SEED | development | ✅ | 6 分类 + 6 商品 + 6 SKU |
| FE-PRODUCT-UX | frontend | ✅ | ProductCard / HomePage / ListPage / DetailPage / 后台 List + Form |
| FE-API-TESTS | testing | ✅ | product.spec.ts 5/5 |
| BE-PRODUCT-TESTS | testing | ✅ | PHPUnit 新增 14 全 PASS |

### Iteration 9 · 物流跟踪 + 30 分钟超时自动取消 ✅
（见 [reconcile-report-iteration-9.md](outputs/orchestration/reconcile-report-iteration-9.md)）

### Iteration 10 · Redis Lua 原子预扣库存 ✅
（见 [reconcile-report-iteration-10.md](outputs/orchestration/reconcile-report-iteration-10.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| STOCK-IFACE | development | ✅ | StockManager 接口 + Base 抽象（自动 warmup）+ Redis/InMemory 双实现 |
| STOCK-WIRE | development | ✅ | OrderController.store Lua 预扣 + try/catch 回滚；cancel + CancelStaleOrders DB+Redis 双写 |
| STOCK-CMD | development | ✅ | `php artisan sku:warmup-redis` 全量同步 DB → Redis |
| STOCK-TESTS | testing | ✅ | PHPUnit 新增 12（StockManagerTest 7 + OrderStockRedisTest 5）→ 102/102 |
| 端到端 | testing | ✅ | tinker 实测 RedisStockManager：2000 库存 5×800 并发预扣 → succ=2 fail=3，超卖防护成功 |

### Iteration 11 · 库存预警 + Webhook + 后台 Dashboard ✅
（见 [reconcile-report-iteration-11.md](outputs/orchestration/reconcile-report-iteration-11.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| ALERT-SCHEMA | development | ✅ | stock_alerts 表（sku/threshold/status/webhook_status/triggered_at/resolved_at） |
| ALERT-SVC | development | ✅ | StockAlertService.check 触发/防重/自动 resolve + WebhookDispatcher mock/real |
| ALERT-WIRE | development | ✅ | 4 触发点：OrderController.store + cancel / CancelStaleOrders / ProductAdminController create+update |
| ALERT-ADMIN-API | development | ✅ | AdminStockAlertController list/resolve + 路由 |
| ALERT-FE | frontend | ✅ | DashboardPage（红卡片）+ StockAlertsPage（tabs + Webhook 徽章 + 一键 resolve）+ ProductForm 阈值字段 |
| BE-TESTS | testing | ✅ | PHPUnit 新增 11（StockAlertServiceTest 6 + AdminStockAlertTest 5）→ 113/113 |
| 端到端 | testing | ✅ | tinker 实测：stock=5≤threshold=10 → triggered；恢复 100 → resolved；mock_only 模式正确 |

### Iteration 12 · Admin 后端权限兜底 ✅
（见 [reconcile-report-iteration-12.md](outputs/orchestration/reconcile-report-iteration-12.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| POLICY-MW | development | ✅ | EnsureAdmin 中间件 + bootstrap alias `role.admin` + routes/api.php admin 组套用 |
| BE-TESTS | testing | ✅ | AdminPolicyTest 5（未登录 401 / individual 403 / enterprise 403 / admin 200 / 写接口 403）→ 118/118 |
| 端到端 | testing | ✅ | 真实 curl 三态（401/403/200）实测通过 |

### Iteration 13 · AI Bad Case 收集 + 标注后台 ✅
（见 [reconcile-report-iteration-13.md](outputs/orchestration/reconcile-report-iteration-13.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| FB-SCHEMA | development | ✅ | ai_feedbacks 表（message/conversation/user/rating/source/tags/labeled）+ AiFeedback 模型（手指 $table） |
| FB-USER-API | development | ✅ | POST /ai/feedbacks（updateOrCreate 覆盖）+ 转人工自动 source=auto_transfer |
| FB-ADMIN-API | development | ✅ | AdminAiFeedbackController list/label/stats + 路由 |
| FB-FE | frontend | ✅ | AiDrawer 👍/👎 + 差评理由输入；BadCasesPage 聚类+tabs+标签弹窗；Dashboard 黄色卡片 |
| BE-TESTS | testing | ✅ | AiFeedbackTest 7（提交/覆盖/跨用户/非AI/管理列表/标注/聚类）→ 125/125 |
| 端到端 | testing | ✅ | curl admin/stats 与 buyer 403 实测；iter-12 中间件继续护住 |

### Iteration 14 · Bad Case CSV / JSONL 导出 ✅
（见 [reconcile-report-iteration-14.md](outputs/orchestration/reconcile-report-iteration-14.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| EXPORT-BE | development | ✅ | exportCsv（BOM + 分号 tags + chunk(200) 流式）+ exportJsonl（OpenAI-like messages + correct_answer:null） |
| EXPORT-FE | frontend | ✅ | adminExportBadCases fetch+blob+Content-Disposition 取名；BadCasesPage 顶部按钮 |
| BE-TESTS | testing | ✅ | AiFeedbackExportTest 4（CSV/JSONL/403/filter）→ 129/129 |
| 端到端 | testing | ✅ | curl 两端点真实输出；CSV 中文不乱码，JSONL 每行 valid json_decode |

### Iteration 15 · correct_answer 字段 · 标注→修复→训练样本闭环 ✅
（见 [reconcile-report-iteration-15.md](outputs/orchestration/reconcile-report-iteration-15.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| FB-CORRECT-COL | development | ✅ | migrate `ai_feedbacks.correct_answer text nullable` |
| FB-LABEL | development | ✅ | AdminAiFeedbackController.label 接受 correct_answer；exportCsv 加列；exportJsonl 用 correct 作 assistant 内容 + is_training_ready 标志 + bad_reply 保留 |
| FB-STATS | development | ✅ | stats 加 training_ready 计数 |
| FB-FE | frontend | ✅ | label modal 宽 640px + 红底显示 AI 错误回复 + correct_answer textarea；列表 "✓ 已修复" / "+ 写正确答案" 二次入口；Dashboard / 头部加 "训练就绪 N" |
| BE-TESTS | testing | ✅ | +4 测试（label 持久化 / stats 计数 / JSONL 用 correct / CSV 含列）→ 133/133 |
| 端到端 | testing | ✅ | curl stats `training_ready:1` + JSONL assistant=correct + is_training_ready:true 实测 |

### Iteration 16 · auto_lowconf 自动入库 ✅
（见 [reconcile-report-iteration-16.md](outputs/orchestration/reconcile-report-iteration-16.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| LOWCONF-WIRE | development | ✅ | AiController.sendMessage 在 transfer 检测后加 lowconf 块；transferred 互斥；reason 含 conf+threshold |
| LOWCONF-CONFIG | development | ✅ | config/services.php +`ai.lowconf_threshold` 默认 0.6；0=禁用 |
| FE-BADGE | frontend | ✅ | BadCasesPage `.src-auto_lowconf` 蓝色徽章 |
| BE-TESTS | testing | ✅ | AiAutoLowConfTest 4（低→触发 / 高→不触发 / threshold=0 禁用 / transfer 优先）→ 137/137 |
| 端到端 | testing | ✅ | tinker：threshold=0.6 + conf=0.25 → fb 入库 source=auto_lowconf |

### Iteration 17 · Webhook 队列化 + 重试 ✅
（见 [reconcile-report-iteration-17.md](outputs/orchestration/reconcile-report-iteration-17.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| WH-JOB | development | ✅ | DispatchWebhookJob ShouldQueue + tries=3 + backoff=[10,30,60] + handle/failed 双兜底 |
| WH-WIRE | development | ✅ | StockAlertService.trigger 改 dispatch；webhook_attempts 列；toJson 输出 |
| FE-ATTEMPTS | frontend | ✅ | StockAlertsPage 徽章 attempts>1 显示 ×N + title 含响应 |
| BE-TESTS | testing | ✅ | WebhookJobTest 6（Bus 拦截 / 成功 / 抛重试 / failed 兜底 / mock_only / retry 配置）→ 143/143 |
| 端到端 | testing | ✅ | QUEUE_CONNECTION=sync 实测；触发 → mock_only + attempts=1 |

### Iteration 18 · Sanctum token 过期 + 滑动续期 ✅
（见 [reconcile-report-iteration-18.md](outputs/orchestration/reconcile-report-iteration-18.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| TOKEN-EXPIRE | development | ✅ | sanctum.expiration = env('SANCTUM_TOKEN_EXPIRATION', 120) |
| TOKEN-ROTATE | development | ✅ | RotateTokenIfNearExpiry 中间件，临期 30 分钟自动签新 + 设 X-Refresh-Token 头；alias `rotate.token` |
| TOKEN-REFRESH | development | ✅ | POST /auth/refresh 显式换新 |
| FE-INTERCEPTOR | frontend | ✅ | http.ts response 拦截器读 x-refresh-token 写入 localStorage |
| BE-TESTS | testing | ✅ | SanctumExpirationTest 6（过期 401 / 新 token 无续 / 临期续 / refresh / DB 验证老删 / null 禁用）→ 149/149 |
| 端到端 | testing | ✅ | 真实 curl：100min 旧 → 200 + X-Refresh-Token，130min 旧 → 401 |

### Iteration 19 · 死信队列后台 UI ✅
（见 [reconcile-report-iteration-19.md](outputs/orchestration/reconcile-report-iteration-19.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| FJ-API | development | ✅ | AdminFailedJobController list/retry/destroy/clear/stats；retry 用 Artisan::call('queue:retry') |
| FJ-FE | frontend | ✅ | FailedJobsPage（表格+UUID 展开异常+重试/删除/清空）+ Dashboard 红卡片 + MePage 入口 |
| BE-TESTS | testing | ✅ | AdminFailedJobTest 8（list 解码 / delete / 404 / clear / stats / retry / retry 404 / 非 admin 403）→ 157/157 |
| 端到端 | testing | ✅ | 真实 curl tinker 造一条 → stats count=1 + list 解码正常 |

### Iteration 20 · 管理后台统一布局：左菜单 + 右内容 ✅
（见 [reconcile-report-iteration-20.md](outputs/orchestration/reconcile-report-iteration-20.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| ADMIN-LAYOUT | frontend | ✅ | AdminLayout.vue：左 220px sidebar（运营/业务两分组 + 返回个人中心）+ 右 RouterView |
| ADMIN-ROUTER | frontend | ✅ | 10 个 admin 路由收成 /admin 父的 children；既有 RouterLink 全兼容 |
| PROFILE-CTA | frontend | ✅ | MePage admin 卡片：8 个 → 链改成单蓝底"进入后台 →"按钮 |
| TYPE-FIX | frontend | ✅ | AdminProduct(Payload) 补 stock_threshold（iter-11 留的类型缺失） |
| 测试 | testing | ✅ | Vitest 18/18 + vue-tsc 干净 + PHPUnit 157/157 + pytest 22/22 都不变 |

### Iteration 21 · Admin sidebar 折叠 · 响应式 + 持久化 ✅
（见 [reconcile-report-iteration-21.md](outputs/orchestration/reconcile-report-iteration-21.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| SIDEBAR-COLLAPSE | frontend | ✅ | AdminLayout 加 collapsed state；折叠态 220→56px，仅图标+原生 tooltip |
| AUTO-COLLAPSE | frontend | ✅ | window resize listener，< 1024px 自动折叠（用户手动 toggle 一次后 override） |
| PERSIST | frontend | ✅ | localStorage `admin.sidebar.collapsed`；user 偏好跨会话保留 |
| TOGGLE-UI | frontend | ✅ | brand 右边缘圆形 ‹/› 按钮 + width 0.2s ease 过渡 |
| 测试 | testing | ✅ | Vitest 18/18 + vue-tsc 清 + PHPUnit/pytest 不变 |

### Iteration 22 · 后台面包屑 ✅
（见 [reconcile-report-iteration-22.md](outputs/orchestration/reconcile-report-iteration-22.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| BREADCRUMB | frontend | ✅ | AdminLayout CRUMB_MAP 10 路由 + computed 反向走 parent；编辑页动态 #id；末项不可点 |
| 视觉 | frontend | ✅ | content 顶白色横条 + `›` 分隔 + 灰链 / 黑当前 |
| 测试 | testing | ✅ | Vitest 18/18 + vue-tsc 清 |

### Iteration 23 · 设备管理 · 多端登录列表 + 远程撤销 ✅
（见 [reconcile-report-iteration-23.md](outputs/orchestration/reconcile-report-iteration-23.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| DEVICE-LABEL | development | ✅ | AuthController.deviceLabel：detectBrowser + detectOS + IP；login/register/wechat 4 处 createToken 改用 |
| DEVICE-API | development | ✅ | GET /auth/devices · DELETE /auth/devices/{id} · POST /auth/logout-others |
| REFRESH-NAME | development | ✅ | refresh 保留旧 token name（同设备身份不丢） |
| FE-CARD | frontend | ✅ | MePage 加"登录设备"卡片：列表 + 当前蓝标 + 撤销 + 登出其他设备红链 |
| BE-TESTS | testing | ✅ | DeviceManagementTest 7（UA 标签 / list current / revoke / 越权 404 / logout-others / 401 / refresh 保留 name）→ 164/164 |
| 端到端 | testing | ✅ | 真实 curl：Chrome 登 → "Chrome · macOS · 127.0.0.1"；Firefox 第二次登 → 列表多 1；logout-others 撤 17 留 current |

### Iteration 24 · 新设备登录 Webhook 提醒 ✅
（见 [reconcile-report-iteration-24.md](outputs/orchestration/reconcile-report-iteration-24.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| WH-ROUTE | development | ✅ | WebhookDispatcher.resolveUrl 按 event 前缀路由 `stock.*` / `auth.*`；config services.webhook.auth_new_device_url |
| AUTH-NOTIFY | development | ✅ | AuthController.notifyIfNewDevice 异步 dispatch；login/wechat/register 三处 createToken 前判定新设备 |
| BE-TESTS | testing | ✅ | NewDeviceWebhookTest 6（首登触发 / 同 UA 不触 / 异 UA 重触 / 注册触发 / URL 路由 / 未知前缀 mock）→ 170/170 |
| 端到端 | testing | ✅ | Bus::fake 断言；Http::fake 两 URL 正确命中；payload 含 user_id/device_label/ip/UA/时间 |

### Iteration 25 · 死信队列搜索 + 翻页 ✅
（见 [reconcile-report-iteration-25.md](outputs/orchestration/reconcile-report-iteration-25.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| FJ-PAGINATE | development | ✅ | AdminFailedJobController.index +keyword(LIKE payload/exception/queue) + paginate(page/per_page/last_page)；per_page 上限 200 |
| FE-PAGER | frontend | ✅ | FailedJobsPage 加搜索框（debounce 300ms）+ 前/后翻页 + 当前页/总页 |
| BE-TESTS | testing | ✅ | +4（pagination meta / keyword payload+exception / keyword queue / per_page cap）→ 174/174 |
| 端到端 | testing | ✅ | seed 25 → per_page=10 last=3；keyword=Webhook 命中 9 |

### Iteration 26 · label 协作乐观锁 ✅
（见 [reconcile-report-iteration-26.md](outputs/orchestration/reconcile-report-iteration-26.md)）

| Task ID | 角色 | 状态 | 证据 |
|---------|------|------|------|
| LOCK-BE | development | ✅ | label 加 if_match 校验；不匹配 409 + data.current；AiFeedback dateFormat 升微秒避免同秒撞死锁 |
| LOCK-FE | frontend | ✅ | adminLabelBadCase 加 ifMatch 参数；submitLabel 409 → confirm 弹窗 → 选覆盖则不带 if_match 再提 |
| BE-TESTS | testing | ✅ | LabelOptimisticLockTest 5（匹配 / 过期 409 / 无 if_match bypass / 双 admin 竞争第二个 409 / list 暴露 updated_at）→ 179/179 |

## 后续 iteration-4 候选

| 候选 | 简述 | 复杂度 |
|------|------|-------|
| **SKU 多规格 + 阶梯价 + 参数表** | 深化商品数据模型，价格按数量分档 | 中 |
| **购物车 + 结算（不含支付）** | TRADE-003 + TRADE-004 | 中 |
| **AI 报价闭环（接 DeepSeek）** | AI-001 + AI-002 + RAG | 中-高（需 API key） |
| **OSS 图片上传抽象** | 替换外链字段 + 加上传组件 | 小 |
| **Admin Policy 精细化** | 后端权限校验补齐 | 小 |
