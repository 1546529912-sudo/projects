# task-spec.md · 任务定义清单（MVP 范围）

## 【当前焦点】
按 [feature-breakdown.md](feature-breakdown.md) MVP 范围细化的 130 个任务（26 MVP 功能 × 5）。
每任务 ≥ 5 条判定项，覆盖：正常流程 / 异常流程 / 边界情况 / 交互细节 / 数据状态，**每条标注怎么验证**。

## 本任务匹配到的 skill 清单
- `prd-development` / `user-story` / `user-story-splitting` / `epic-breakdown-advisor` / `jobs-to-be-done` / `problem-statement`

## 格式说明
```
### TASK-ID 一句话描述
- ✅ 判定项 → 验证方式（自动化测试名 / 手动验证步骤）
```

非 MVP 任务仅列名见 [feature-breakdown.md](feature-breakdown.md)。

---

# 一、商城系统（SHOP-001 ~ SHOP-055）

## 1.1 登录注册（SHOP-F1）

### SHOP-001 手机号输入与格式校验
- ✅ 输入框只允许数字，最大长度 11 → 验证：单元测试 `tests/LoginTest::testPhoneInputFilter`
- ✅ 失焦时正则校验 `^1[3-9]\d{9}$` → 验证：单元测试覆盖 11 组用例（合法/非法）
- ✅ 校验失败：字段下显示红字"手机号格式错误" → 验证：UI 手动 / 小程序录屏
- ✅ 校验通过：解锁"获取验证码"按钮 → 验证：UI 状态断言
- ✅ 空值：按钮置灰且禁用点击 → 验证：UI 状态断言

### SHOP-002 短信验证码下发与冷却
- ✅ 后端 `POST /api/v1/sms/code` 生成 6 位数字码，写 Redis key `sms:{phone}` TTL 300s → 验证：单元测试 + Redis 中查 key
- ✅ 同一手机号 60s 内重复请求返回 429 + "请稍后" → 验证：`tests/SmsTest::testCooldown`
- ✅ 前端按钮发送后置灰 60s 倒计时（59、58 ... 0）→ 验证：UI 手动
- ✅ 开发环境验证码打印到日志文件 `runtime/sms.log` → 验证：grep 日志
- ✅ 错误手机号格式直接返回 400 不写 Redis → 验证：`tests/SmsTest::testInvalidPhone`

### SHOP-003 登录接口与 token 签发
- ✅ 后端 `POST /api/v1/user/login` 接收 phone + code → 验证：单元测试
- ✅ 验证码错误返回 400 + msg="验证码错误"，错误次数 +1 → 验证：`tests/LoginTest::testInvalidCode`
- ✅ 验证码正确 → 自动注册（若 users 表无该 phone）→ 签发 JWT（24h 有效）→ 验证：`tests/LoginTest::testAutoRegister`
- ✅ 同手机号连续错误 5 次 → 锁定 10 分钟（Redis key `lock:{phone}`）→ 验证：`tests/LoginTest::testRateLimit`
- ✅ 锁定期内尝试登录返回 423 + "账号已锁定" → 验证：`tests/LoginTest::testLocked`

### SHOP-004 登录态持久化与拦截
- ✅ 小程序登录成功后 token 存入 `wx.setStorageSync('token', ...)` → 验证：UI 手动 + wx 存储查看
- ✅ 所有需登录的接口请求自动带 `Authorization: Bearer {token}` 头 → 验证：抓包/单元测试
- ✅ token 过期返回 401，前端清除 token + 跳登录 → 验证：单元测试 + UI 手动
- ✅ 未登录访问加购/结算 → 弹登录浮层，登录后回到原页面 → 验证：UI 手动
- ✅ 退出登录清除 token + Redis 中失效 → 验证：测试调用退出后旧 token 401

### SHOP-005 协议勾选与首次注册引导
- ✅ 登录页默认勾选"已阅读用户协议与隐私政策" → 验证：UI 手动
- ✅ 取消勾选时"登录"按钮置灰 → 验证：UI 状态断言
- ✅ 协议链接打开 webview 嵌入式页面 → 验证：UI 手动
- ✅ 首次登录（注册）后埋点 `event=user_register` → 验证：日志 grep
- ✅ 已注册用户登录埋点 `event=user_login` → 验证：日志 grep

## 1.2 首页（SHOP-F2）

### SHOP-006 首页骨架与下拉刷新
- ✅ 路由 `/pages/home/index` 加载首页 → 验证：UI 手动
- ✅ 顶部固定栏：Logo + 搜索框 + 购物车角标 + 登录入口 → 验证：UI 手动
- ✅ 下拉刷新触发数据重拉，松开后 ≤ 1s 完成 → 验证：UI 手动 + 接口监控
- ✅ 首屏可交互时间 TTI ≤ 2s（小程序开发者工具 Performance 面板）→ 验证：手动
- ✅ 加载失败显示错误态 + 重试按钮 → 验证：mock 接口失败 + UI 手动

### SHOP-007 Banner 轮播
- ✅ 后端 `GET /api/v1/home/banners` 返回 ≤ 5 张轮播图（图片 url + 跳转 link）→ 验证：curl 接口
- ✅ 自动轮播间隔 3s，可手动滑动 → 验证：UI 手动
- ✅ 点击跳转到对应商品/活动/分类页 → 验证：UI 手动
- ✅ 图片懒加载（首张直接加载，其余进入视野再加载）→ 验证：网络面板观察
- ✅ Banner 数据为空时整块隐藏（不留白块）→ 验证：mock 空数据 + UI

### SHOP-008 一级类目导航
- ✅ 后端 `GET /api/v1/home/categories` 返回一级类目（图标 + 文字，≤ 10 个）→ 验证：curl 接口
- ✅ 横向滚动，超出屏宽可左右滑 → 验证：UI 手动
- ✅ 点击跳转到对应分类页，带 category_id 参数 → 验证：UI 手动 + URL 检查
- ✅ 数据来自 PIM 类目表（OMS 不参与）→ 验证：代码 grep `Pim::getRootCategories`
- ✅ 类目禁用的不展示 → 验证：mock 禁用类目 + UI

### SHOP-009 推荐位 + 热销位
- ✅ 后端 `GET /api/v1/home/recommend` 返回推荐商品列表（≤ 20）→ 验证：curl 接口
- ✅ 商品卡片字段：主图、名称、价格、销量 → 验证：UI 手动
- ✅ 卡片点击跳转商品详情页 → 验证：UI 手动
- ✅ 热销位按销量倒序 → 验证：接口返回数据校验
- ✅ 卡片图片加载失败显示占位图 → 验证：mock 失效 url + UI

### SHOP-010 首页搜索框入口
- ✅ 点击搜索框跳转到搜索页（搜索功能 M2 暂不实现）→ 验证：UI 手动
- ✅ MVP 阶段搜索页占位"功能即将上线"，可返回 → 验证：UI 手动
- ✅ 搜索框 placeholder "搜索商品" → 验证：UI 手动
- ✅ 不阻塞其他首页功能（点击购物车等正常工作）→ 验证：UI 手动
- ✅ 埋点 `event=search_entry_click` → 验证：日志 grep

## 1.3 商品分类页（SHOP-F3）

### SHOP-011 分类页布局
- ✅ 左侧一级类目列表（垂直滚动），右侧二/三级卡片区 → 验证：UI 手动
- ✅ 默认选中左侧第一个一级类目 → 验证：UI 手动
- ✅ 切换左侧时右侧内容平滑刷新（≤ 300ms）→ 验证：UI 手动 + 性能监控
- ✅ 当前选中类目在左侧高亮（背景色 + 左侧色条）→ 验证：UI 手动
- ✅ 接口失败显示错误态 + 重试 → 验证：mock + UI

### SHOP-012 二/三级类目数据加载
- ✅ 后端 `GET /api/v1/category/{parent_id}/children` 返回子类目 → 验证：curl
- ✅ 二级类目分组展示，每组下三级类目以卡片形式 → 验证：UI 手动
- ✅ 三级类目卡片 = 图标 + 名称 → 验证：UI 手动
- ✅ 类目数据缓存 5 分钟（Redis）减少 PIM 调用 → 验证：Redis 检查 key + 二次请求耗时 < 50ms
- ✅ 切换一级时旧数据立即清空，避免显示残留 → 验证：UI 手动

### SHOP-013 类目跳转商品列表
- ✅ 点击三级类目跳 `/pages/list/index?category_id=xxx` → 验证：UI 手动 + URL
- ✅ 点击二级类目分组标题不跳转（仅折叠/展开）→ 验证：UI 手动
- ✅ 列表页根据 category_id 加载该类目所有商品 → 验证：列表页接口请求带参
- ✅ 返回分类页时保留之前选中的一级类目 → 验证：UI 手动
- ✅ 类目埋点 `event=category_click, category_id=xxx` → 验证：日志 grep

### SHOP-014 类目空态处理
- ✅ 一级类目无子类目时右侧显示"该类目暂无商品" → 验证：mock + UI
- ✅ 接口返回空数组与接口失败不同处理（空态 vs 错误态）→ 验证：UI 手动两态对比
- ✅ 类目被禁用时不展示，不报错 → 验证：mock 禁用 + UI
- ✅ 缓存的禁用类目要清除（事件订阅或缓存失效）→ 验证：禁用后 5 分钟内不再出现
- ✅ 异常日志写入 `runtime/shop.log` 标签 `category_load_fail` → 验证：grep 日志

### SHOP-015 类目页性能与体验
- ✅ 类目页首次加载 ≤ 1s → 验证：开发者工具 Performance
- ✅ 切换一级类目无明显卡顿（FPS ≥ 50）→ 验证：性能面板
- ✅ 长列表（类目 > 20 个）支持懒加载 → 验证：UI 手动
- ✅ 离线/弱网下显示重试态 + 缓存数据可见 → 验证：模拟弱网 + UI
- ✅ 类目数据变更（PIM 推事件）→ 商城前台 ≤ 30s 可见（受缓存影响）→ 验证：PIM 修改 + 等待 + UI

## 1.4 商品列表页（SHOP-F4）

### SHOP-016 列表加载与分页
- ✅ 后端 `GET /api/v1/product/list?category_id=&page=&size=20` 返回分页数据 → 验证：curl
- ✅ 返回字段含 total / page / list[商品卡片必需字段] → 验证：接口契约测试
- ✅ 小程序无限滚动（触底拉下一页）→ 验证：UI 手动
- ✅ 触底加载时显示 loading；无更多时显示"已加载全部" → 验证：UI 手动
- ✅ 分页参数错误（page < 1 或 size > 100）返回 400 → 验证：单元测试

### SHOP-017 筛选器（价格区间 + 品牌 + 属性）
- ✅ 顶部展开/收起筛选面板 → 验证：UI 手动
- ✅ 价格区间双滑块或输入框（最低/最高），不允许最低 > 最高 → 验证：UI 手动 + 单元测试
- ✅ 品牌多选（来自 PIM 品牌列表）→ 验证：UI 手动
- ✅ 销售属性多选（来自类目属性模板）→ 验证：UI 手动
- ✅ 点击"确认"重置 page=1 + 重新请求 → 验证：接口请求参数检查

### SHOP-018 排序切换
- ✅ 顶部 Tab：综合（默认）/ 销量 / 价格升 / 价格降 / 上新 → 验证：UI 手动
- ✅ 切换排序立即重新请求 page=1 → 验证：接口参数 `sort=sales_desc` 等
- ✅ 当前选中排序高亮 + 价格升降显示箭头 → 验证：UI 手动
- ✅ 综合排序后端实现（销量权重 0.7 + 上新权重 0.3）→ 验证：单元测试
- ✅ 排序埋点 `event=list_sort_change, sort=xxx` → 验证：日志 grep

### SHOP-019 商品卡片
- ✅ 字段：主图（4:5 比例）/ 名称（≤ 2 行省略）/ 价格（红色加粗）/ 销量 / 促销标 → 验证：UI 手动
- ✅ 卡片整体可点击，点击跳详情页 → 验证：UI 手动
- ✅ 主图懒加载 + 失败占位图 → 验证：UI 手动
- ✅ 商品已下架时不在列表中出现 → 验证：mock + 接口测试
- ✅ 卡片在弱网下显示骨架屏 → 验证：mock 慢网络 + UI

### SHOP-020 列表空态与异常态
- ✅ 筛选无结果显示"暂无符合条件的商品" + "清除筛选"按钮 → 验证：UI 手动
- ✅ 类目无商品显示"该类目暂无商品" → 验证：UI 手动
- ✅ 接口失败显示重试按钮 → 验证：UI 手动
- ✅ 弱网超时显示"加载缓慢，请稍候"提示 → 验证：mock 超时 + UI
- ✅ 列表页内存占用稳定（无内存泄漏 1000+ 项）→ 验证：开发者工具内存面板

## 1.5 商品详情页（SHOP-F5）

### SHOP-021 详情页数据加载
- ✅ 后端 `GET /api/v1/product/{sku}` 返回 SPU + 全部 SKU + 库存 → 验证：curl
- ✅ 数据来自 PIM（基础信息）+ OMS（可用库存）合并返回 → 验证：代码 grep + 服务依赖
- ✅ 首次加载 ≤ 1.5s（接口 + 渲染）→ 验证：性能监控
- ✅ 主图轮播 ≥ 3 张，支持手势切换 → 验证：UI 手动
- ✅ 商品不存在或已彻底下架返回 404 → 验证：单元测试

### SHOP-022 SKU 选择联动
- ✅ 销售属性按钮组（颜色 / 尺码等）→ 验证：UI 手动
- ✅ 选中后实时更新价格 / 库存 / 主图（< 100ms）→ 验证：UI 手动
- ✅ 不存在的属性组合按钮置灰不可选 → 验证：单元测试组合矩阵
- ✅ 切换 SKU 不重新请求接口（前端用初始数据计算）→ 验证：抓包确认
- ✅ 切换 SKU 时埋点 `event=sku_switch, from=, to=` → 验证：日志 grep

### SHOP-023 库存与按钮状态
- ✅ 选中 SKU 库存 > 5：按钮"加入购物车" + "立即购买"正常 → 验证：UI 手动
- ✅ 库存 ≤ 5：显示"仅剩 N 件"红字提示 → 验证：UI 手动
- ✅ 库存 = 0：按钮变"无货"置灰 → 验证：UI 手动
- ✅ 商品整体下架（PIM 状态 != 已发布）：底部行动条整体置灰 + 提示"商品已下架" → 验证：UI 手动
- ✅ 库存数据每次进详情页重拉（不缓存）→ 验证：抓包确认

### SHOP-024 加购与立即购买
- ✅ 未登录时点加购 → 弹登录浮层 → 验证：UI 手动
- ✅ 已登录 POST `/api/v1/cart/add` 加入购物车，返回成功 → 验证：单元测试 + UI
- ✅ 加购成功顶部 toast"已加入购物车" 2s 后消失 → 验证：UI 手动
- ✅ "立即购买"跳过购物车，直接到结算页 → 验证：UI 手动 + 路由
- ✅ 同 SKU 重复加购数量累加（不新建）→ 验证：单元测试

### SHOP-025 富文本详情 + 推荐位
- ✅ 详情区加载富文本（PIM 维护的 HTML）→ 验证：UI 手动
- ✅ 富文本图片自适应屏宽，不超出 → 验证：UI 手动
- ✅ 详情区底部"相关推荐"展示同类目商品（≤ 6）→ 验证：UI 手动
- ✅ 推荐商品点击跳转新详情页（页面栈深度 ≤ 5）→ 验证：UI 手动
- ✅ 富文本中的恶意 script 被服务端过滤 → 验证：单元测试输入 `<script>alert(1)</script>` 检查输出

## 1.6 购物车（SHOP-F6）

### SHOP-026 加购与购物车列表
- ✅ 后端 `GET /api/v1/cart/list` 返回当前用户购物车 → 验证：curl
- ✅ 返回字段：sku_id / sku 名 / 主图 / 规格 / 单价 / 数量 / 选中状态 / 库存 / 是否失效 → 验证：接口测试
- ✅ 加购写 `cart` 表（user_id + sku_id 唯一）→ 验证：单元测试 + MySQL 查表
- ✅ 同 SKU 加购数量累加 → 验证：`tests/CartTest::testDuplicateAdd`
- ✅ 跨设备登录后云端数据合并本地未登录数据 → 验证：UI 手动两设备测试

### SHOP-027 数量修改与删除
- ✅ 步进器 +/- 修改数量，触发 PUT `/api/v1/cart/{id}` 防抖 500ms → 验证：UI 手动 + 抓包
- ✅ 数量到 0 自动从购物车删除（带二次确认）→ 验证：UI 手动
- ✅ 数量超过库存时锁定到库存上限 + 红字提示 → 验证：单元测试
- ✅ 数量超过 99 锁定 99 → 验证：单元测试
- ✅ 滑动单条左滑显示"删除"按钮 → 验证：UI 手动

### SHOP-028 选择与全选
- ✅ 每条商品左侧勾选框 → 验证：UI 手动
- ✅ 底部"全选"勾选框联动 → 验证：UI 手动
- ✅ 失效商品不参与全选 → 验证：单元测试
- ✅ 选中状态持久化到数据库（refresh 后保留）→ 验证：UI 手动刷新
- ✅ 仅勾选商品参与结算 → 验证：结算时接口请求体检查

### SHOP-029 失效区与库存校验
- ✅ 商品已下架移入"失效区"独立展示 → 验证：UI 手动
- ✅ 库存为 0 也移入失效区 → 验证：UI 手动
- ✅ 失效区商品不可勾选不可结算 → 验证：UI 状态断言
- ✅ 失效区底部"清空失效商品"按钮 → 验证：UI 手动
- ✅ 失效区数据每次进购物车页重新计算（实时性）→ 验证：mock + UI

### SHOP-030 合计与结算入口
- ✅ 底部合计 = 仅勾选商品总价 → 验证：单元测试金额计算
- ✅ 选中数量变化合计实时更新（不调接口，前端计算）→ 验证：UI 手动
- ✅ 点"去结算"未勾选任何商品时按钮置灰 → 验证：UI 状态断言
- ✅ 已勾选商品超 50 件不允许结算（提示分批购买）→ 验证：单元测试
- ✅ 跳结算前 POST `/api/v1/inventory/precheck` 预校验库存 → 验证：抓包确认

## 1.7 结算页（SHOP-F7）

### SHOP-031 结算页数据组装
- ✅ 从购物车带勾选商品进入，或从详情页"立即购买"带 SKU+数量进入 → 验证：UI 手动
- ✅ 顶部展示地址（默认地址）→ 验证：UI 手动
- ✅ 商品清单逐条展示 → 验证：UI 手动
- ✅ 费用明细：商品总价 / 运费（M1 固定 ¥10）/ 应付金额 → 验证：UI + 单元测试
- ✅ 数据全部前端组装（不存独立结算表）→ 验证：代码 grep

### SHOP-032 地址选择与新增（临时）
- ✅ MVP 阶段地址不做独立管理，结算页表单收集（姓名/手机/省市区/详细地址）→ 验证：UI 手动
- ✅ 默认地址用 user 表上 last_address_snapshot 字段（JSON）→ 验证：DB schema
- ✅ 修改地址后回填 last_address_snapshot → 验证：单元测试
- ✅ 必填字段未填禁止提交 → 验证：UI 状态断言
- ✅ 手机号正则校验 → 验证：单元测试

### SHOP-033 提交订单调用 OMS
- ✅ POST `/api/v1/order/submit` → 商城后端调用 OMS `POST /api/v1/order` → 验证：跨服务集成测试
- ✅ Idempotency-Key header 防重复提交（来自前端生成 UUID）→ 验证：单元测试
- ✅ 成功返回订单号 + 应付金额，跳支付页 → 验证：UI 手动
- ✅ 库存不足返回 409 + 明确商品名，留在结算页 → 验证：mock + UI
- ✅ OMS 接口超时（> 3s）显示"提交失败，请重试" → 验证：mock 超时 + UI

### SHOP-034 价格与库存二次校验
- ✅ 提交前 OMS 二次校验：每个 SKU 当前价 / 库存 / 上架状态 → 验证：跨服务测试
- ✅ 价格变化返回 409 + "价格已变更，请刷新" → 验证：mock + UI
- ✅ SKU 已下架返回 409 + "商品已下架" → 验证：mock + UI
- ✅ 库存不足返回 409 + 剩余数量 → 验证：mock + UI
- ✅ 校验通过即锁库存（OMS 内部）→ 验证：OMS DB 检查锁定数

### SHOP-035 结算页加载与异常
- ✅ 接口失败显示重试 → 验证：mock + UI
- ✅ 购物车空时无法进入结算页（路由拦截 + 提示）→ 验证：UI 手动
- ✅ 加载时按钮置灰防止重复点击 → 验证：UI 状态断言
- ✅ 提交后按钮显示 loading → 验证：UI 手动
- ✅ 提交成功后从购物车删除已结算商品 → 验证：单元测试

## 1.8 支付页 + 微信支付拉起（SHOP-F8）

### SHOP-036 支付页展示
- ✅ 顶部展示订单号 / 应付金额 / 倒计时（30 分钟）→ 验证：UI 手动
- ✅ 倒计时每秒更新，到 0 自动跳支付失败页 → 验证：UI 手动
- ✅ 倒计时 < 5 分钟时红色提醒 → 验证：UI 状态断言
- ✅ 支付方式列表 MVP 仅"微信支付"一项默认选中 → 验证：UI 手动
- ✅ 数据来自 OMS `GET /api/v1/order/{id}` → 验证：抓包

### SHOP-037 拉起微信支付 SDK
- ✅ 点击"立即支付" → 商城后端调 `wx.requestPayment`（占位 AppID）→ 验证：UI 手动
- ✅ 微信支付参数（package, nonceStr, paySign, timeStamp, signType）从后端 `/api/v1/payment/wxpay` 获取 → 验证：单元测试
- ✅ 占位 AppID 环境下 mock 返回成功（开发模式标识 `APP_DEBUG=true`）→ 验证：mock + UI
- ✅ 拉起失败显示"支付环境异常，请重试" → 验证：mock + UI
- ✅ 重复点击按钮防抖 1s → 验证：UI 手动

### SHOP-038 支付结果接收
- ✅ 微信回调成功 → 商城前端通知后端 → 商城后端通知 OMS 状态变更 → 验证：跨服务测试
- ✅ 真实场景由微信支付服务端回调 OMS，MVP mock 模式由商城前端模拟 → 验证：mock + 集成测试
- ✅ 支付成功跳支付结果页（成功态）→ 验证：UI 手动
- ✅ 用户取消支付（微信关闭支付页）跳支付结果页（失败态）→ 验证：UI 手动
- ✅ 网络异常时显示"支付状态查询中"，触发轮询 → 验证：mock + UI

### SHOP-039 取消订单
- ✅ 支付页底部"取消订单"按钮 → 二次确认 → POST `/api/v1/order/{id}/cancel` → 验证：UI 手动 + 单元测试
- ✅ 取消成功 OMS 状态变"已取消" + 释放库存 → 验证：DB 查 OMS 订单状态 + 库存
- ✅ 取消后跳订单列表（待付款 tab）→ 验证：UI 手动
- ✅ 已支付订单不可取消（按钮置灰）→ 验证：UI 状态断言
- ✅ 取消埋点 `event=order_cancel, order_id=xxx, reason=user_cancel` → 验证：日志 grep

### SHOP-040 支付超时处理
- ✅ 30 分钟未支付，OMS 定时任务自动取消订单 → 验证：单元测试 + cron 模拟
- ✅ 商城前端倒计时到 0 自动跳支付失败页（不依赖后端推送）→ 验证：UI 手动
- ✅ 自动取消后 OMS 释放库存 → 验证：DB 查
- ✅ 自动取消时通知商城（事件推送）→ 商城更新订单列表状态 → 验证：UI 手动观察
- ✅ 取消原因记录"timeout" → 验证：DB 字段

## 1.9 支付结果页（SHOP-F9）

### SHOP-041 支付成功态
- ✅ 显示订单号 / 金额 / "查看订单" + "继续购物"按钮 → 验证：UI 手动
- ✅ 顶部绿色对勾图标 + "支付成功" → 验证：UI 手动
- ✅ "查看订单"跳订单详情页 → 验证：UI 手动
- ✅ "继续购物"跳首页 → 验证：UI 手动
- ✅ 埋点 `event=pay_success, order_id=xxx, amount=xxx` → 验证：日志 grep

### SHOP-042 支付失败态
- ✅ 显示失败原因 + "重新支付" + "取消订单" + "联系客服" → 验证：UI 手动
- ✅ 顶部红色感叹号 + "支付失败" → 验证：UI 手动
- ✅ "重新支付"返回支付页 → 验证：UI 手动
- ✅ "取消订单"调取消接口 → 验证：UI 手动
- ✅ 埋点 `event=pay_fail, order_id=xxx, reason=xxx` → 验证：日志 grep

### SHOP-043 处理中态与轮询
- ✅ 默认显示"支付结果确认中..." + loading → 验证：UI 手动
- ✅ 每 5s 轮询 OMS 订单状态，最多 3 次 → 验证：抓包
- ✅ 3 次都"待支付"跳失败页 → 验证：UI 手动
- ✅ 中途变"已支付"立即跳成功页 → 验证：UI 手动
- ✅ 轮询期间禁止用户重复操作 → 验证：UI 状态断言

### SHOP-044 异常态处理
- ✅ 接口连续失败 3 次显示"网络异常，请刷新" → 验证：mock + UI
- ✅ 后端返回不存在订单跳 404 + 引导 → 验证：UI 手动
- ✅ token 失效跳登录页 + 登录后回结果页 → 验证：UI 手动
- ✅ 结果页关闭返回订单列表（不返回支付页）→ 验证：UI 手动
- ✅ 任何状态都可点击"联系客服"（占位，弹出文案）→ 验证：UI 手动

### SHOP-045 结果页可访问性与体验
- ✅ 三态视觉差异显著（颜色 + 图标 + 文字）→ 验证：UI 手动
- ✅ 按钮间距 ≥ 16px 避免误触 → 验证：UI 手动
- ✅ 加载状态有 loading 动画 → 验证：UI 手动
- ✅ 页面字体 ≥ 14sp → 验证：UI 手动
- ✅ 失败原因文案明确（不是"未知错误"）→ 验证：原因码字典

## 1.10 订单列表页（SHOP-F10）

### SHOP-046 订单列表加载
- ✅ 后端 `GET /api/v1/order/list?status=&page=` 返回当前用户订单 → 验证：curl
- ✅ 数据来自 OMS（商城后端代理转发）→ 验证：代码 grep + 调用栈
- ✅ 分页 size=10，无限滚动 → 验证：UI 手动
- ✅ 加载失败显示错误态 + 重试 → 验证：mock + UI
- ✅ 空态显示"暂无订单"+ "去逛逛"按钮 → 验证：UI 手动

### SHOP-047 状态 Tab 切换
- ✅ Tab：全部 / 待付款 / 待发货 / 待收货 / 已完成（M1 不含售后 Tab）→ 验证：UI 手动
- ✅ 切换 Tab 重置 page=1 + 重新请求 → 验证：抓包
- ✅ 当前 Tab 高亮（下划线 + 主色）→ 验证：UI 手动
- ✅ Tab 上显示数量角标（仅"待付款"和"待收货"）→ 验证：UI 手动
- ✅ 切换时旧数据立即清空 → 验证：UI 手动

### SHOP-048 订单卡片字段
- ✅ 字段：商品缩略图 / 名称 / 规格 / 数量 / 实付金额 / 状态 → 验证：UI 手动
- ✅ 多商品时展示前 2 + "共 N 件" → 验证：UI 手动
- ✅ 卡片整体点击跳详情 → 验证：UI 手动
- ✅ 卡片底部根据状态显示操作按钮 → 验证：UI 状态断言
- ✅ 时间戳显示相对时间（"3 分钟前" / "今天 14:30" / "2026-05-23"）→ 验证：单元测试

### SHOP-049 状态对应操作按钮
- ✅ 待付款：去支付 / 取消订单 → 验证：UI 手动 + 状态枚举
- ✅ 待发货：查看详情 → 验证：UI 手动
- ✅ 待收货：查看物流（占位）/ 确认收货 → 验证：UI 手动
- ✅ 已完成：再次购买（占位）→ 验证：UI 手动
- ✅ 已取消：删除订单（占位）/ 再次购买（占位）→ 验证：UI 手动

### SHOP-050 列表性能与刷新
- ✅ 下拉刷新触发 page=1 重拉 → 验证：UI 手动
- ✅ 触底加载下一页 → 验证：UI 手动
- ✅ 列表性能（≥ 100 条）滚动流畅 FPS ≥ 50 → 验证：性能面板
- ✅ 从详情页返回时保留滚动位置 → 验证：UI 手动
- ✅ 订单状态变化（事件订阅）→ 列表实时更新 → 验证：UI 手动

## 1.11 订单详情页（SHOP-F11）

### SHOP-051 订单详情数据加载
- ✅ 后端 `GET /api/v1/order/{id}` 返回完整订单 → 验证：curl
- ✅ 数据：基础信息 / 商品列表 / 收货地址 / 费用明细 / 物流信息（M1 仅单号文本）→ 验证：接口契约
- ✅ 接口失败显示错误态 + 重试 → 验证：mock + UI
- ✅ 不存在订单返回 404 + 引导回列表 → 验证：UI 手动
- ✅ 非本人订单返回 403 → 验证：单元测试

### SHOP-052 状态进度条
- ✅ 顶部进度条：待付款 → 已支付 → 已发货 → 已完成（4 节点）→ 验证：UI 手动
- ✅ 当前状态节点高亮（主色），已过状态灰色对勾，未到节点灰色 → 验证：UI 手动
- ✅ 状态变化（如已发货）进度条平滑过渡 → 验证：UI 手动
- ✅ 进度条下方显示当前状态文字说明 → 验证：UI 手动
- ✅ 已取消订单进度条显示灰色"已取消" → 验证：UI 手动

### SHOP-053 商品与费用明细
- ✅ 商品列表逐条展示（图 + 名 + 规格 + 单价 + 数量 + 小计）→ 验证：UI 手动
- ✅ 费用明细：商品总价 / 运费 / 应付金额 → 验证：UI 手动
- ✅ 金额右对齐，单位 ¥ + 千分位 → 验证：单元测试
- ✅ 商品图片点击放大查看 → 验证：UI 手动
- ✅ 商品名点击跳详情页（已下架商品提示）→ 验证：UI 手动

### SHOP-054 操作按钮区
- ✅ 待付款：底部固定栏"去支付" + "取消订单" → 验证：UI 手动
- ✅ 待发货：底部"查看详情" → 验证：UI 手动
- ✅ 待收货：底部"查看物流" + "确认收货" → 验证：UI 手动
- ✅ 已完成：底部"再次购买"（占位）→ 验证：UI 手动
- ✅ 已取消：无底部操作栏 → 验证：UI 手动

### SHOP-055 物流入口与状态变更同步
- ✅ "查看物流"按钮 MVP 仅展示物流单号文本（不接物流跟踪 API）→ 验证：UI 手动
- ✅ 长按物流单号可复制 → 验证：UI 手动
- ✅ 详情页停留时定时刷新状态（30s）→ 验证：抓包
- ✅ 状态变化时顶部 toast 提示（如"订单已发货"）→ 验证：UI 手动
- ✅ 离开页面停止定时刷新 → 验证：代码 review

---

# 二、PIM 系统（PIM-001 ~ PIM-025）

## 2.1 类目管理（PIM-F1）

### PIM-001 类目 CRUD 接口
- ✅ `POST /api/v1/category` 新建类目（name / code / parent_id / sort）→ 验证：curl + 单元测试
- ✅ `PUT /api/v1/category/{id}` 编辑 → 验证：curl
- ✅ `DELETE /api/v1/category/{id}` 软删除（status=deleted）→ 验证：DB 检查
- ✅ `GET /api/v1/category/tree` 返回整棵树（含 children 嵌套）→ 验证：curl + 结构断言
- ✅ code 全局唯一约束 → 验证：DB unique 索引 + 重复提交测试

### PIM-002 多级类目层级控制
- ✅ 层级 ≤ 5，第 6 级创建返回 400 → 验证：单元测试
- ✅ parent_id 必须存在且未删除 → 验证：单元测试
- ✅ 不允许选自己或自己的子孙作为父类目 → 验证：单元测试递归检查
- ✅ 创建后自动计算 level 字段 → 验证：DB 查询
- ✅ 编辑时变更父类目要同步更新所有子孙的 level → 验证：单元测试

### PIM-003 类目排序
- ✅ sort 字段（int），同级按 sort 升序展示 → 验证：接口返回顺序
- ✅ 拖拽排序接口 `POST /api/v1/category/reorder` 接收 [{id, sort}] → 验证：curl
- ✅ 跨级拖拽不允许 → 验证：单元测试
- ✅ 默认 sort=新建时同级 max+1 → 验证：单元测试
- ✅ 后台 UI 拖拽实时预览 + 确认保存（M2，MVP 用输入框）→ 验证：占位/无需测

### PIM-004 类目启用/禁用
- ✅ status 字段：enabled / disabled → 验证：DB 枚举
- ✅ 禁用类目时检查是否有在售 SPU → 有则阻止 + 提示 → 验证：单元测试
- ✅ 父类目禁用 → 子类目不级联禁用，但前台不展示子类目 → 验证：单元测试 + 前台接口
- ✅ 禁用后该类目下不允许新建 SPU → 验证：单元测试
- ✅ 启用/禁用走 PUT 接口（同一 update 接口）→ 验证：curl

### PIM-005 类目绑定属性模板
- ✅ category 表加 `attr_template_id` 字段 → 验证：DB schema
- ✅ 创建类目时可选已有模板或留空 → 验证：单元测试
- ✅ 解绑模板时检查该类目下 SPU 的属性数据是否丢失（M1 简化：直接解绑，记录警告日志）→ 验证：单元测试
- ✅ 类目下新建 SPU 时自动加载该模板的属性字段 → 验证：跨模块集成测试
- ✅ 模板被多类目绑定时编辑模板影响所有 → 验证：单元测试

## 2.2 属性管理（PIM-F2）

### PIM-006 属性 CRUD
- ✅ `POST /api/v1/attribute` 新建（name / code / type / required / searchable）→ 验证：curl
- ✅ `PUT /api/v1/attribute/{id}` 编辑（code 不可改）→ 验证：单元测试
- ✅ `DELETE` 软删除，被使用的属性禁止删除 → 验证：单元测试
- ✅ `GET /api/v1/attribute/list?page=&size=` 分页查询 → 验证：curl
- ✅ code 全局唯一约束 → 验证：DB unique

### PIM-007 属性类型枚举
- ✅ 支持 6 种类型：text / number / single_select / multi_select / date / image → 验证：枚举校验
- ✅ 富文本（rich_text）M2 不实现 → 验证：枚举只 6 项
- ✅ 数字类型可配 min/max → 验证：单元测试
- ✅ 单选/多选类型必填 options（JSON 数组）→ 验证：单元测试
- ✅ 图片类型在 SPU 录入时上传到本地 storage → 验证：集成测试

### PIM-008 属性配置项
- ✅ required（必填）/ searchable（可搜索）/ filterable（可筛选）/ is_sales_attr（是否销售属性）4 个 bool 字段 → 验证：DB schema
- ✅ 销售属性必须是 single_select 或 multi_select 类型 → 验证：单元测试
- ✅ 销售属性变更时影响下游 SKU 重新生成 → 验证：集成测试
- ✅ 配置项 UI 复选框 → 验证：UI 手动
- ✅ 配置变更立即生效（不需要重启）→ 验证：UI 手动

### PIM-009 属性分组
- ✅ attribute 表加 group_name 字段（如 "基础信息" / "规格参数" / "销售属性"）→ 验证：DB schema
- ✅ 分组不是独立实体，仅做展示分类 → 验证：代码 review
- ✅ 模板内按分组展示属性 → 验证：模板渲染单元测试
- ✅ 同模板内不允许同 group + 同 name → 验证：单元测试
- ✅ 分组名预置 3 个（基础 / 规格 / 销售），可自定义 → 验证：种子数据

### PIM-010 属性模板
- ✅ attr_template 表（id / name / attr_ids: JSON）→ 验证：DB schema
- ✅ 模板新建/编辑/删除 API → 验证：curl
- ✅ 模板被类目使用时不可删除 → 验证：单元测试
- ✅ 模板编辑时增删属性，提示影响的商品数（占位实现）→ 验证：单元测试
- ✅ 模板列表分页查询 → 验证：curl

## 2.3 品牌管理（PIM-F3）

### PIM-011 品牌 CRUD
- ✅ `POST /api/v1/brand` 新建（name / code / logo_url / desc）→ 验证：curl
- ✅ `PUT /api/v1/brand/{id}` 编辑（code 不可改）→ 验证：单元测试
- ✅ `DELETE` 软删除 + 校验是否有 SPU 在用 → 验证：单元测试
- ✅ `GET /api/v1/brand/list?page=&size=&name=` 分页 + 模糊查询 → 验证：curl
- ✅ code 全局唯一 → 验证：DB unique

### PIM-012 品牌 Logo 上传
- ✅ `POST /api/v1/upload/image` 接收图片（≤ 5MB，格式 jpg/png/webp）→ 验证：单元测试
- ✅ 存储到 `public/uploads/brand/{year}/{month}/{uuid}.{ext}` → 验证：FS 检查
- ✅ 返回 url（相对路径 + 域名拼接）→ 验证：接口返回
- ✅ MIME 类型 + 文件头双校验 → 验证：单元测试上传伪装文件
- ✅ Logo 字段保存绝对 url，前端直接使用 → 验证：DB 检查

### PIM-013 品牌关联商品查看
- ✅ `GET /api/v1/brand/{id}/products?page=` 返回该品牌下 SPU 列表 → 验证：curl
- ✅ 字段：SPU id / 名称 / 主图 / 状态 → 验证：接口契约
- ✅ 后台 UI 提供该入口 → 验证：UI 手动
- ✅ 商品数为 0 显示空态 → 验证：mock + UI
- ✅ 分页支持 → 验证：UI 手动

### PIM-014 品牌启用/禁用
- ✅ status 字段：enabled / disabled → 验证：DB
- ✅ 禁用后新建 SPU 不可选该品牌 → 验证：单元测试
- ✅ 已绑商品的展示不受影响 → 验证：前台接口测试
- ✅ 后台列表筛选可按 status → 验证：UI 手动
- ✅ 启用/禁用走 PUT 接口 → 验证：curl

### PIM-015 品牌排序与展示
- ✅ sort 字段控制后台列表展示顺序 → 验证：接口返回顺序
- ✅ 默认 sort=新建时 max+1 → 验证：单元测试
- ✅ 后台列表支持按 name / sort / created_at 排序 → 验证：UI 手动
- ✅ 品牌名超长（> 50）截断 + tooltip → 验证：UI 手动
- ✅ 列表分页 size=20 默认 → 验证：接口默认值

## 2.4 SPU 管理（PIM-F4）

### PIM-016 SPU CRUD
- ✅ `POST /api/v1/spu` 新建（name / code / category_id / brand_id / desc / attrs）→ 验证：curl
- ✅ `PUT /api/v1/spu/{id}` 编辑 → 验证：curl
- ✅ `DELETE` 软删除，有在售 SKU 时禁止 → 验证：单元测试
- ✅ `GET /api/v1/spu/{id}` 详情（含 SKU 列表）→ 验证：curl
- ✅ `GET /api/v1/spu/list?page=&category_id=&brand_id=&status=` 分页 → 验证：curl

### PIM-017 基础信息字段
- ✅ name 必填 ≤ 100，code 全局唯一 → 验证：DB unique + 单元测试
- ✅ category_id 必填且类目状态 enabled → 验证：单元测试
- ✅ brand_id 可选但若填须 enabled → 验证：单元测试
- ✅ desc 可空，≤ 2000 字 → 验证：单元测试
- ✅ 卖点字段 selling_points（JSON 数组，≤ 5 条）→ 验证：DB schema

### PIM-018 富文本详情
- ✅ detail_html 字段（text 类型）存储 PIM 后台编辑的富文本 → 验证：DB schema
- ✅ 写入前 HTMLPurifier 过滤 script/iframe → 验证：单元测试
- ✅ 内嵌图片走统一上传接口（同 brand logo）→ 验证：UI 手动
- ✅ 详情大小 ≤ 100KB → 验证：单元测试
- ✅ 前台读取时按需返回（列表接口不带）→ 验证：接口契约

### PIM-019 图片管理
- ✅ main_images 字段（JSON 数组，1-5 张 url）→ 验证：DB schema
- ✅ 主图至少 1 张，最多 5 张 → 验证：单元测试
- ✅ 上传走统一接口 → 验证：集成测试
- ✅ 列表接口返回第一张主图 → 验证：接口契约
- ✅ 图片顺序可拖拽（M2，MVP 用数组顺序）→ 验证：单元测试

### PIM-020 SPU 状态管理
- ✅ status 枚举：draft / published / offline（M1 不做 audit 状态）→ 验证：DB enum
- ✅ 新建默认 draft → 验证：单元测试
- ✅ `POST /api/v1/spu/{id}/publish` 改为 published（前台可见）→ 验证：curl
- ✅ `POST /api/v1/spu/{id}/offline` 改为 offline（前台不可见，订单已存在的可履约）→ 验证：curl
- ✅ 状态变化推 Redis Stream `pim.product.changed` → 验证：Redis 监控 stream

## 2.5 SKU 管理（PIM-F5）

### PIM-021 SKU 批量生成
- ✅ `POST /api/v1/spu/{id}/sku/generate` 接收销售属性组合 → 笛卡尔积生成 → 验证：单元测试矩阵
- ✅ 单 SPU 下 SKU 数 ≤ 500，超出返回 400 → 验证：单元测试
- ✅ 自动生成 sku_code = `{spu_code}-{seq}` → 验证：单元测试
- ✅ 默认价格 = SPU 基础价（若 SPU 无则 0，需后台再编辑）→ 验证：单元测试
- ✅ 默认启用 status=enabled → 验证：DB

### PIM-022 SKU 单条编辑
- ✅ `PUT /api/v1/sku/{id}` 编辑（price / stock_warn / image_url / sku_code / barcode）→ 验证：curl
- ✅ price 单位"分"int → 验证：DB
- ✅ 编辑后推 Redis Stream `pim.sku.changed` → 验证：监控
- ✅ image_url 为空时前台使用 SPU 主图 → 验证：前台接口测试
- ✅ barcode 全局唯一约束（允许 null）→ 验证：DB

### PIM-023 SKU 启用/禁用
- ✅ status：enabled / disabled → 验证：DB enum
- ✅ 禁用后下游（商城 + OMS）不可下单 → 验证：跨服务测试
- ✅ 禁用时检查是否有"进行中订单"（待支付/已支付/备货中）→ 单元测试警告但不阻塞（M1）
- ✅ 禁用/启用走 PUT 接口 → 验证：curl
- ✅ 状态变化推 Redis Stream → 验证：监控

### PIM-024 SKU 编码规则
- ✅ sku_code 全局唯一约束 → 验证：DB unique
- ✅ 自动生成格式 `{spu_code}-{seq:3}` 如 SPU001-001 → 验证：单元测试
- ✅ 允许手动覆盖 sku_code（编辑时）→ 验证：单元测试
- ✅ 手动覆盖冲突时返回 409 → 验证：单元测试
- ✅ 编码不允许空格和特殊字符（仅字母数字 -）→ 验证：正则校验

### PIM-025 SKU 列表查询
- ✅ `GET /api/v1/spu/{id}/sku/list` 返回该 SPU 下所有 SKU → 验证：curl
- ✅ `GET /api/v1/sku/{code}` 单 SKU 详情（供商城/OMS 调用）→ 验证：curl
- ✅ 字段：code / spu_id / 销售属性值 / 价格 / image_url / status → 验证：接口契约
- ✅ SKU 不存在返回 404 → 验证：单元测试
- ✅ 查询性能 P95 < 100ms → 验证：压测

---

# 三、OMS 系统（OMS-001 ~ OMS-025）

## 3.1 订单接收与标准化（OMS-F1）

### OMS-001 订单接收接口
- ✅ `POST /api/v1/order` 接收商城下单（user_id / sku_list / address / total_amount / Idempotency-Key 头）→ 验证：curl
- ✅ Idempotency-Key 重复请求返回首次结果 → 验证：单元测试 `tests/OrderTest::testIdempotency`
- ✅ 写入 `orders` + `order_items` 表 → 验证：DB schema 检查
- ✅ 接口 P95 < 2s → 验证：压测
- ✅ 同步推 Redis Stream `oms.order.created` → 验证：监控

### OMS-002 订单字段校验
- ✅ user_id 必填且 users 表存在 → 验证：单元测试
- ✅ sku_list 非空，每个 sku 在 PIM 存在且 published → 验证：跨服务集成测试
- ✅ 地址字段（name/phone/province/city/district/detail）必填且 phone 格式正确 → 验证：单元测试
- ✅ 金额必须为正 int，单位"分" → 验证：单元测试
- ✅ 校验失败返回 400 + 字段名 + 原因 → 验证：单元测试

### OMS-003 价格与库存二次校验
- ✅ 调 PIM `GET /api/v1/sku/{code}` 校验当前价格 → 验证：跨服务测试
- ✅ 调本服务库存模块校验可用库存 → 验证：单元测试
- ✅ 价格不一致返回 409 + 当前价格 → 验证：单元测试
- ✅ 库存不足返回 409 + 剩余数量 → 验证：单元测试
- ✅ 校验通过后立即锁库存（事务内）→ 验证：DB 检查 + 单元测试

### OMS-004 订单号生成
- ✅ 订单号格式 `SO{YYYYMMDD}{6 位流水}` 如 SO20260524000123 → 验证：单元测试
- ✅ 流水号每日重置 → 验证：单元测试 + Redis counter
- ✅ 订单号全局唯一约束 → 验证：DB unique
- ✅ 并发生成不冲突（用 Redis incr）→ 验证：并发测试 100+ 请求
- ✅ 订单号写入 orders 表 + 返回给商城 → 验证：单元测试

### OMS-005 订单列表与详情查询
- ✅ `GET /api/v1/order/list?user_id=&status=&page=` 当前用户订单 → 验证：curl
- ✅ `GET /api/v1/order/{id}` 详情（含 items / address / status_log）→ 验证：curl
- ✅ 非本人订单返回 403 → 验证：单元测试
- ✅ 不存在订单返回 404 → 验证：单元测试
- ✅ 接口 P95 < 200ms → 验证：压测

## 3.2 订单状态机（OMS-F2）

### OMS-006 状态枚举与持久化
- ✅ 状态：pending_pay / paid / picking / shipped / completed / cancelled / exception → 验证：DB enum
- ✅ orders 表 status 字段 → 验证：DB schema
- ✅ 默认状态 pending_pay → 验证：单元测试
- ✅ 状态变更写 `order_status_log` 表（订单号 / 旧状态 / 新状态 / 操作人 / 时间 / 来源）→ 验证：DB schema + 单元测试
- ✅ 状态字段加索引（status, user_id）→ 验证：DB 索引检查

### OMS-007 状态机迁移规则
- ✅ 合法迁移：pending_pay→paid / pending_pay→cancelled / paid→picking / picking→shipped / picking→exception / shipped→completed → 验证：单元测试矩阵
- ✅ 非法迁移返回 400 + 拒绝 → 验证：单元测试
- ✅ 迁移在事务内执行 + 写日志 + 触发事件 → 验证：单元测试
- ✅ exception 状态可回到 picking（人工恢复）→ 验证：单元测试
- ✅ completed 状态不可再迁移（终态）→ 验证：单元测试

### OMS-008 支付成功状态变更
- ✅ 接收支付回调（mock）`POST /api/v1/payment/callback` 校验签名（mock 模式跳过）→ 验证：单元测试
- ✅ 订单 status pending_pay → paid → 验证：DB
- ✅ 触发路由（M1 简化：直接 paid → picking）→ 验证：单元测试
- ✅ 下发 WMS 拣货单（异步）→ 验证：Redis Stream 监控
- ✅ 推 Redis Stream `oms.order.paid` → 验证：监控

### OMS-009 支付超时自动取消
- ✅ 定时任务每 5 分钟扫描 pending_pay 超 30 分钟订单 → 验证：cron 配置 + 单元测试
- ✅ 自动 status pending_pay → cancelled → 验证：DB
- ✅ 释放锁定库存（locked -1, available +1）→ 验证：DB + 单元测试
- ✅ 推 Redis Stream `oms.order.cancelled` → 验证：监控
- ✅ 取消原因记录 `timeout` → 验证：DB 字段

### OMS-010 手动取消订单
- ✅ `POST /api/v1/order/{id}/cancel` 仅当 status=pending_pay 时允许 → 验证：单元测试
- ✅ 已支付订单返回 400 + "已支付订单需走售后" → 验证：单元测试
- ✅ 取消时释放库存 → 验证：DB
- ✅ 取消原因 user_cancel / timeout → 验证：DB 枚举
- ✅ 取消后通知商城（事件）→ 验证：监控

## 3.3 库存四态管理（OMS-F3）

### OMS-011 库存表设计与初始化
- ✅ `inventory_status` 表：sku_code / available / locked / reserved（M1 固定 0）/ updated_at → 验证：DB schema
- ✅ PIM 推 sku.changed 事件时自动初始化（available 取自 WMS 实物，MVP 阶段手动初始化）→ 验证：单元测试
- ✅ 唯一约束 sku_code → 验证：DB unique
- ✅ 操作走数据库行锁（FOR UPDATE）防超卖 → 验证：并发测试
- ✅ 提供 admin 接口手动设置 available（仅开发环境）→ 验证：单元测试

### OMS-012 下单锁定库存
- ✅ 下单事务内执行 `UPDATE ... SET available=available-N, locked=locked+N WHERE sku_code=? AND available>=N` → 验证：单元测试
- ✅ 影响行数 = 0 时返回库存不足 + 回滚事务 → 验证：单元测试
- ✅ 同 SKU 并发 200+ 不超卖 → 验证：压测脚本
- ✅ 写流水表 `inventory_log`（type=lock / before / after / order_no / op_user）→ 验证：DB schema + 单元测试
- ✅ 锁定结果同步推 Redis Stream `oms.inventory.changed` → 验证：监控

### OMS-013 取消释放库存
- ✅ 订单取消时事务内 `UPDATE ... SET available=available+N, locked=locked-N` → 验证：单元测试
- ✅ 写流水（type=unlock）→ 验证：DB
- ✅ 不允许 locked 减为负数（增加 CHECK 或代码校验）→ 验证：单元测试
- ✅ 释放后推事件 → 验证：监控
- ✅ 接口幂等（重复取消不重复释放）→ 验证：单元测试

### OMS-014 出库扣实物库存
- ✅ WMS 出库回传后事务内 `UPDATE ... SET locked=locked-N`（available 已减，实物变更由 WMS 触发同步）→ 验证：单元测试
- ✅ 写流水（type=outbound）→ 验证：DB
- ✅ 不允许 locked 减为负数 → 验证：单元测试
- ✅ 出库回传幂等（基于 outbound_no）→ 验证：单元测试
- ✅ 推事件通知商城 → 验证：监控

### OMS-015 可用库存查询 API
- ✅ `GET /api/v1/inventory/{sku}` 返回 available → 验证：curl
- ✅ 批量查询 `POST /api/v1/inventory/batch` 接收 sku 数组 → 验证：curl
- ✅ 接口 P95 < 100ms → 验证：压测
- ✅ Redis 缓存（key `inv:{sku}`，TTL 1s）→ 验证：Redis 检查 + 二次请求耗时 < 10ms
- ✅ 缓存击穿用 mutex 防并发雪崩 → 验证：并发测试

## 3.4 WMS 联动单据（OMS-F4）

### OMS-016 拣货单下发
- ✅ paid 状态触发拣货单生成 → 验证：单元测试
- ✅ `POST {wms_url}/api/v1/picking-order` 推送拣货单（picking_no / order_no / items / address）→ 验证：跨服务集成
- ✅ 失败重试 3 次（指数退避 1s/2s/4s）→ 验证：mock 失败 + 重试日志
- ✅ 3 次失败入死信队列 + 告警 → 验证：DB dead_letter 表 + 日志
- ✅ 推送成功后 status picking → 验证：DB

### OMS-017 拣货单号生成
- ✅ 格式 `PK{YYYYMMDD}{6 流水}` 如 PK20260524000123 → 验证：单元测试
- ✅ 1 个订单对应 1 个拣货单（MVP 不拆单）→ 验证：单元测试
- ✅ 拣货单号全局唯一 → 验证：DB unique
- ✅ 写 `picking_orders` 表（picking_no / order_no / status / created_at）→ 验证：DB schema
- ✅ 与 orders 表 join 查询性能 < 100ms → 验证：EXPLAIN + 压测

### OMS-018 出库完成事件消费
- ✅ 消费 Redis Stream `wms.outbound.completed` → 验证：监控
- ✅ 事件 payload：picking_no / outbound_no / express_no / completed_at → 验证：契约测试
- ✅ 处理事务：order status picking → shipped + 写 status_log + 扣 locked → 验证：单元测试
- ✅ 处理幂等（基于 outbound_no）→ 验证：重复消费测试
- ✅ 处理失败重试 3 次，最终失败入死信队列 → 验证：mock + 日志

### OMS-019 短拣异常事件消费
- ✅ 消费 Redis Stream `wms.picking.shortage` → 验证：监控
- ✅ 事件 payload：picking_no / sku_code / requested / actual / reason → 验证：契约
- ✅ 处理：order status picking → exception + 写 log + 商城前台显示"备货异常" → 验证：DB + UI
- ✅ M1 不做自动处理，仅人工跟进 → 验证：代码 review（不自动取消/补货）
- ✅ exception 状态允许人工通过接口恢复为 picking → 验证：API + 单元测试

### OMS-020 用户签收/超时完成
- ✅ `POST /api/v1/order/{id}/confirm` 用户确认收货 → 验证：curl
- ✅ status shipped → completed → 验证：DB
- ✅ 写 status_log → 验证：DB
- ✅ 完成时同步财务（占位，写本地 `finance_log` 表，不外推）→ 验证：DB 表
- ✅ 推事件 `oms.order.completed` → 验证：监控

## 3.5 可用库存查询 API（OMS-F5）

### OMS-021 商品详情库存接入
- ✅ 商城 GET /product/{sku} 内部调 OMS `GET /inventory/{sku}` → 验证：跨服务调用 trace
- ✅ 商城后端可降级（OMS 超时时返回库存不足）→ 验证：mock 超时 + 行为测试
- ✅ 同 SKU 多页请求走 Redis 缓存 → 验证：QPS 测试
- ✅ 返回字段 available（不暴露 locked/reserved）→ 验证：接口契约
- ✅ available < 0 时强制返回 0 + 告警日志 → 验证：单元测试

### OMS-022 库存预校验
- ✅ `POST /api/v1/inventory/precheck` 商城结算前调用 → 验证：curl
- ✅ 检查多 SKU 库存是否充足 → 验证：单元测试
- ✅ 返回不足列表（sku / requested / available）→ 验证：接口契约
- ✅ 仅检查不锁定（区别于 OMS-003）→ 验证：DB 不变更
- ✅ 接口 P95 < 200ms → 验证：压测

### OMS-023 库存变更事件订阅
- ✅ 消费 PIM `pim.sku.changed` → 同步 SKU 元数据（不影响库存数）→ 验证：监控
- ✅ 消费 WMS `wms.inventory.changed`（实物变更）→ 更新 available（按四态公式重算）→ 验证：单元测试
- ✅ 事件失败重试 3 次 → 验证：mock + 日志
- ✅ 事件迟到时不覆盖更新的状态（按时间戳判断）→ 验证：单元测试
- ✅ 库存变更后推 `oms.inventory.changed` 通知商城 → 验证：监控

### OMS-024 库存安全垫（保留配置）
- ✅ 配置表 `inventory_config`（sku_code / buffer_qty 默认 0）→ 验证：DB schema
- ✅ 对外可用库存 = available - buffer_qty → 验证：单元测试
- ✅ 配置变更立即生效（不需重启）→ 验证：mock 修改 + 接口
- ✅ buffer_qty 不影响实际锁库存逻辑（仅展示侧）→ 验证：单元测试
- ✅ M1 不提供配置 UI，admin 接口手动改 → 验证：代码 review

### OMS-025 库存对账与监控
- ✅ 定时任务每日凌晨对账：OMS available + locked vs WMS 实物 - WMS locked → 验证：cron
- ✅ 不一致写 `inventory_reconcile_log` + 告警日志 → 验证：DB 表 + 日志
- ✅ 监控指标：库存查询 QPS / 缓存命中率 / 失败率 → 验证：日志统计
- ✅ M1 仅本地日志不接监控系统 → 验证：代码 review
- ✅ 提供 admin 接口 `GET /admin/inventory/reconcile-report` 查看对账结果 → 验证：curl

---

# 四、WMS 系统（WMS-001 ~ WMS-025）

## 4.1 基础数据（WMS-F1）

### WMS-001 SKU 主数据 CRUD
- ✅ `POST /api/v1/product` 新建 SKU（sku_code / sku_name / category / unit / weight / safety_stock）→ 验证：curl
- ✅ sku_code 全局唯一约束 → 验证：DB unique
- ✅ weight 必填 > 0 → 验证：单元测试
- ✅ status 字段（enabled / disabled）→ 验证：DB enum
- ✅ MVP 从 PIM 同步（订阅 pim.sku.changed），本接口也保留手动新建 → 验证：双路径测试

### WMS-002 仓库 CRUD
- ✅ `POST /api/v1/warehouse` 新建仓库（warehouse_code / warehouse_name / address / status）→ 验证：curl
- ✅ warehouse_code 全局唯一 → 验证：DB unique
- ✅ MVP 默认创建一个仓库 W001 → 验证：种子数据
- ✅ `GET /api/v1/warehouse/list` 列表 → 验证：curl
- ✅ 删除仓库时检查是否有库位/库存 → 单元测试

### WMS-003 库位 CRUD（格式校验）
- ✅ `POST /api/v1/location` 新建库位（location_code / warehouse_code / zone / rack / level / location_type / max_weight）→ 验证：curl
- ✅ location_code 格式必须为 "区域-货架-层" 如 A-01-03 → 正则校验 → 单元测试
- ✅ location_type 枚举：storage / picking / staging / return / damaged → 验证：DB enum
- ✅ max_weight 必填 > 0 → 验证：单元测试
- ✅ status 字段：available / occupied / locked / disabled → 验证：DB enum

### WMS-004 库位批量生成
- ✅ `POST /api/v1/location/batch` 按规则生成（warehouse / zone / rack_count / level_count）→ 验证：单元测试
- ✅ 自动 location_code = `{zone}-{rack:02}-{level:02}` → 验证：单元测试
- ✅ 已存在的 code 跳过不报错 → 验证：单元测试
- ✅ 一次最多生成 200 个 → 验证：单元测试
- ✅ 返回成功数 / 跳过数 / 详情 → 验证：接口契约

### WMS-005 基础数据查询接口
- ✅ `GET /api/v1/product/{sku_code}` SKU 详情 → 验证：curl
- ✅ `GET /api/v1/location/{location_code}` 库位详情（含当前占用 SKU 数）→ 验证：curl
- ✅ `GET /api/v1/product/list?page=&category=&status=` 分页查询 → 验证：curl
- ✅ `GET /api/v1/location/list?warehouse=&zone=&type=&status=` 分页查询 → 验证：curl
- ✅ 查询性能 P95 < 100ms → 验证：压测

## 4.2 入库（WMS-F2）

### WMS-006 入库单创建
- ✅ `POST /api/v1/inbound` 创建入库单（warehouse_code / source_type / items[sku_code, expected_qty]）→ 验证：curl
- ✅ source_type 枚举：purchase / return / transfer / init → 验证：DB enum
- ✅ inbound_no 自动生成 `IN{YYYYMMDD}{6 流水}` → 验证：单元测试
- ✅ status 默认 pending → 验证：DB
- ✅ 上游 ERP 推送也走此接口 → 验证：集成测试

### WMS-007 PDA 扫码收货
- ✅ `POST /api/v1/inbound/{inbound_no}/receive` 接收（sku_code / actual_qty）→ 验证：curl
- ✅ 实数 > 预收 → 返回 400 + "超出 N 件，需主管审批" → 验证：单元测试
- ✅ 实数 < 预收 → 标记差异，生成 `difference_report` → 验证：DB
- ✅ 扫到非本单 SKU → 返回 400 + "非本单商品" → 验证：单元测试
- ✅ 收货过程 status 变 receiving → 验证：DB

### WMS-008 差异报告与审批
- ✅ `GET /api/v1/inbound/{inbound_no}/difference` 查询差异 → 验证：curl
- ✅ `POST /api/v1/inbound/{inbound_no}/difference/{id}/approve` 主管审批（通过/驳回）→ 验证：curl
- ✅ 通过后入库单按实收数继续上架 → 验证：单元测试
- ✅ 驳回时入库单回到 receiving 状态 → 验证：单元测试
- ✅ 审批记录写 `approval_log` 表（操作人 / 时间 / 结果 / 备注）→ 验证：DB schema

### WMS-009 库位推荐 Top3
- ✅ `GET /api/v1/inbound/recommend-location?sku=&qty=` 返回推荐库位列表 → 验证：curl
- ✅ 推荐算法：已有同 SKU 库位（+40）/ 距打包台近（+30，MVP 仅按 zone 字母判断）/ 黄金层 2-3 层（+20）/ 空间利用率（+10）→ 验证：单元测试
- ✅ 硬筛：库位 enabled + 承重未超 + 类目不冲突 → 验证：单元测试
- ✅ 返回 Top3 + 各维度得分 → 验证：接口契约
- ✅ 推荐失败时返回降级列表（所有可用库位）→ 验证：mock + 单元测试

### WMS-010 上架与库位校验
- ✅ `POST /api/v1/inbound/{inbound_no}/shelf` 上架（sku_code / location_code / qty / batch_no）→ 验证：curl
- ✅ batch_no 自动生成 `B{YYYYMMDD}` 或上游传入 → 验证：单元测试
- ✅ MVP 阶段 batch_no 固定 INIT-YYYYMMDD（不做批次细粒度）→ 验证：单元测试
- ✅ 上架时校验库位承重，超限 400 + "最大可放 N 件"（M1 简化：不返回 N，仅拒绝）→ 验证：单元测试
- ✅ 上架成功 inventory +qty + 写 inventory_log → 验证：DB

## 4.3 库存表 + 库存流水（WMS-F3）

### WMS-011 inventory 表设计
- ✅ 字段：sku_code / location_code / batch_no / status / quantity / locked_quantity / production_date / inbound_date → 验证：DB schema
- ✅ 联合主键 `(sku_code, location_code, batch_no, status)` → 验证：DB unique
- ✅ status 枚举：normal / frozen / pending / damaged → 验证：DB enum
- ✅ quantity 与 locked_quantity 为非负 int → 验证：CHECK 约束
- ✅ 索引：sku_code（高频查询）→ 验证：DB 索引

### WMS-012 inventory_log 表设计（append-only）
- ✅ 字段：id / sku_code / location_code / change_type / change_quantity / before_quantity / after_quantity / related_order / operator / created_at → 验证：DB schema
- ✅ change_type 枚举：inbound / outbound / move_out / move_in / adjust_in / adjust_out / lock / unlock → 验证：DB enum
- ✅ 只 INSERT 不 UPDATE 不 DELETE → 验证：代码 review + 数据库权限
- ✅ 索引：sku_code, created_at → 验证：DB 索引
- ✅ 事务：inventory 变更必须与 log 写入同事务 → 验证：单元测试事务一致性

### WMS-013 库存查询接口
- ✅ `GET /api/v1/inventory?sku_code=` 返回该 SKU 所有库位的库存（含批次明细）→ 验证：curl
- ✅ 字段：库位 / 批次 / 数量 / 锁定 / 状态 → 验证：接口契约
- ✅ `GET /api/v1/inventory/aggregate?sku_code=` 聚合返回（总实物 / 总可用 / 总锁定）→ 验证：curl
- ✅ 查询 P95 < 200ms → 验证：压测
- ✅ 不暴露 frozen/pending/damaged 给 OMS（仅 normal 计入可用）→ 验证：接口逻辑

### WMS-014 移库
- ✅ `POST /api/v1/inventory/move` 移库（sku_code / from_location / to_location / qty / batch_no）→ 验证：curl
- ✅ 校验目标库位 enabled + 承重 + 类目匹配 → 验证：单元测试
- ✅ 事务内：from -qty, to +qty + 写两条 log（move_out + move_in，同 transaction_id）→ 验证：单元测试
- ✅ 失败时事务回滚 → 验证：mock 单元测试
- ✅ from 数量不足时返回 400 → 验证：单元测试

### WMS-015 库存对外推送
- ✅ inventory 变更后异步推 Redis Stream `wms.inventory.changed`（sku / 实物 / 锁定）→ 验证：监控
- ✅ 事件 payload 含 timestamp + transaction_id（用于幂等）→ 验证：契约
- ✅ 推送失败重试 3 次 + 入死信队列 → 验证：mock + 日志
- ✅ 推送频率限制（同 SKU 1s 内合并多次变更，最多 1 次推送）→ 验证：单元测试
- ✅ OMS 订阅消费该事件 → 验证：跨服务集成

## 4.4 出库（摘果式）（WMS-F4）

### WMS-016 接 OMS 拣货单
- ✅ `POST /api/v1/picking-order` 接收 OMS 推送（picking_no / order_no / items / address）→ 验证：curl
- ✅ Idempotency-Key 防重复 → 验证：单元测试
- ✅ 写 `outbound_orders` 表（status=pending_alloc）→ 验证：DB
- ✅ 接收后异步触发库存分配 → 验证：单元测试
- ✅ 接口 P95 < 200ms → 验证：压测

### WMS-017 FIFO 库存锁定
- ✅ 按 inbound_date 升序选批次（MVP 简化，因 batch_no 固定）→ 验证：单元测试
- ✅ 事务内：`UPDATE inventory SET locked_quantity=locked_quantity+N WHERE sku_code=? AND quantity-locked_quantity>=N` → 验证：单元测试
- ✅ 锁定不足时 outbound status=shortage + 推 Redis Stream `wms.picking.shortage` → 验证：DB + 监控
- ✅ 锁定成功 status=allocated → 验证：DB
- ✅ 写 inventory_log（type=lock，related_order=outbound_no）→ 验证：DB

### WMS-018 PDA 摘果式拣货
- ✅ `GET /api/v1/picking-task/{outbound_no}` PDA 拉任务（按推荐路径排序的 items）→ 验证：curl
- ✅ `POST /api/v1/picking-task/{id}/pick` 提交单条拣货（scan_location / scan_sku / actual_qty）→ 验证：curl
- ✅ scan_location 与系统记录不符返回 400 → 验证：单元测试
- ✅ scan_sku 与任务不符返回 400 → 验证：单元测试
- ✅ 所有 items 拣完 status=picked + 自动跳到复核台引导 → 验证：单元测试

### WMS-019 复核与打包
- ✅ `POST /api/v1/outbound/{outbound_no}/review` 复核扫码（逐件 sku_code）→ 验证：curl
- ✅ 多扫/少扫返回 400 + "数量不符" → 验证：单元测试
- ✅ 复核通过 status=reviewed → 验证：DB
- ✅ 复核未通过可退回重拣（status 回 allocated）→ 验证：单元测试
- ✅ 复核通过调快递面单 API（mock 返回 express_no）→ 验证：单元测试

### WMS-020 出库扫码 + 实物扣减 + 回传 OMS
- ✅ `POST /api/v1/outbound/{outbound_no}/ship` 快递取件扫码 → 验证：curl
- ✅ 事务内：inventory.quantity -N + locked_quantity -N + 写 inventory_log(type=outbound) → 验证：单元测试
- ✅ status=shipped + 推 Redis Stream `wms.outbound.completed`（含 express_no）→ 验证：DB + 监控
- ✅ 推 OMS 失败重试 3 次 + 入死信队列 → 验证：mock + 日志
- ✅ 单元测试覆盖：并发出库同 SKU 不超扣 → 压测脚本

## 4.5 RBAC 角色与权限（WMS-F5）

### WMS-021 角色与权限模型
- ✅ `roles` 表（id / name / permissions: JSON 权限码数组）→ 验证：DB schema
- ✅ `users` 表加 role_id 外键 → 验证：DB
- ✅ `user_warehouse` 关联表（user_id / warehouse_id）控制数据权限 → 验证：DB
- ✅ 预置 6 个角色：admin / supervisor / receiver / picker / reviewer / operator → 验证：种子数据
- ✅ 每个 API 接口在路由层声明所需权限码 → 验证：代码 review

### WMS-022 登录与 token
- ✅ `POST /api/v1/auth/login`（username / password）签发 JWT → 验证：curl
- ✅ token 含 user_id / role / warehouse_ids → 验证：JWT decode
- ✅ token 24h 过期 → 验证：单元测试
- ✅ 错误密码返回 401 → 验证：单元测试
- ✅ 锁定逻辑（5 次错误 10 分钟）→ 验证：单元测试

### WMS-023 权限校验中间件
- ✅ ThinkPHP 中间件解析 token + 拉用户权限 → 验证：代码 review
- ✅ 接口声明权限码（如 `picking.create`）→ 中间件比对 → 验证：单元测试
- ✅ 无权限返回 403 + msg="无权限" → 验证：单元测试
- ✅ token 失效返回 401 → 验证：单元测试
- ✅ 公开接口（如 /health）跳过校验 → 验证：路由配置

### WMS-024 数据权限（按仓库）
- ✅ 用户查询 inventory / outbound 等数据时自动限制在自己 warehouse_ids 内 → 验证：单元测试
- ✅ admin 角色不受限制 → 验证：单元测试
- ✅ 跨仓查询返回空 + 不报错 → 验证：单元测试
- ✅ 在 SQL 层（不在应用层）加 WHERE → 验证：SQL log 检查
- ✅ 测试覆盖 6 个角色的数据可见性 → 验证：单元测试矩阵

### WMS-025 操作日志
- ✅ 所有写接口在中间件中写 `operation_log`（user_id / action / resource / before / after / ip / timestamp）→ 验证：DB schema
- ✅ 日志保留 90 天 → 验证：cron 清理脚本
- ✅ admin 接口 `GET /api/v1/operation-log` 查询 → 验证：curl
- ✅ 敏感字段（密码 / token）日志中脱敏 → 验证：单元测试
- ✅ 日志写入失败不影响主流程（异步 + 异常吞噬 + 告警）→ 验证：单元测试

---

## 任务总计
| 系统 | MVP 任务数 | MVP 功能数 × 5 下限 |
|---|---|---|
| 商城 | 55 | 55 ✅ |
| PIM | 25 | 25 ✅ |
| OMS | 25 | 25 ✅ |
| WMS | 25 | 25 ✅ |
| **合计** | **130** | **130 ✅** |

每任务 5 条判定项，**合计 650 条 AC**。每条 AC 标注验证方式（单元测试 / 集成测试 / UI 手动 / DB 检查 / 监控 grep）。

## 与 PRD 的可追溯关系
- 商城：对应 [商城页面-PRD.md](../../../商城页面/商城页面-PRD.md) §5.1-5.12 的 M1 范围
- PIM：对应 [PIM-PRD.md](../../../PIM/PIM-PRD.md) §5.1-5.5 的 M1 范围
- OMS：对应 [OMS-PRD.md](../../../OMS/OMS-PRD.md) §5.1, §5.4, §5.5, §5.7, §5.8 的 M1 范围
- WMS：对应 [WMS_PRD_v2.md](../../../wms/WMS_PRD_v2.md) §6.1-6.4, §7 的一期范围
- 跨系统接口契约：对应 [电商系统整体架构.md](../../../电商系统整体架构.md) §8
