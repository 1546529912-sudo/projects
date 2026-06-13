# iteration-27-runbook.md · 优惠券高级三件套（Q19-01/02/03）

## 一、文件清单（共 ~25 文件，7 Wave）

### Wave 1 · 数据层（3 文件）
1. `apps/oms-backend/database/migrations/20260602000003_add_scope_to_coupons.php` — coupons 加 scope_type + scope_value（Q19-01）
2. `apps/oms-backend/database/migrations/20260602000004_create_coupon_auto_rules.php` — 自动发券规则表（Q19-02）
3. `apps/oms-backend/database/migrations/20260602000005_create_order_coupons.php` — 多券叠加关联表（Q19-03）

### Wave 2 · 商品券（Q19-01，4 文件改）
4. `apps/oms-backend/app/service/CouponService.php` — `calculateDiscount` 加 sku 范围校验；`create` 接受 scope_*
5. `apps/oms-backend/app/controller/Coupon.php` — admin 接受 scope 字段
6. `apps/shop-backend/app/service/UserCouponService.php` — `available` 加范围标注；`check` 加 SKU 校验
7. `apps/shop-backend/app/controller/Coupon.php` — `check` body 多收 items 用于范围校验

### Wave 3 · 多券叠加（Q19-03，3 文件改）
8. `apps/oms-backend/app/service/CouponService.php` — 加 `applyMultipleInTransaction`（满减先算 + 折扣后算）
9. `apps/oms-backend/app/service/OrderService.php` — `create` 接收 `user_coupon_ids` 数组（兼容旧 `user_coupon_id` 单数）+ 写 order_coupons
10. `apps/shop-backend/app/controller/Order.php` — `submit` 透传 user_coupon_ids 数组

### Wave 4 · 新人券 / 自动发券（Q19-02，5 文件 1 新 4 改）
11. `apps/oms-backend/app/service/CouponAutoRuleService.php` — 规则 CRUD + 触发评估
12. `apps/oms-backend/app/controller/CouponRule.php` — admin 接口
13. `apps/oms-backend/route/app.php` — 路由
14. `apps/shop-backend/app/controller/User.php` — `login` 首次创建用户时触发"注册赠券"
15. `apps/shop-backend/app/service/CouponAutoGrantService.php` — 自动发券调度（按 trigger_type 处理）

### Wave 5 · Vue 后台（3 文件，2 改 1 新）
16. `apps/shop-admin/src/pages/marketing/Coupons.vue` — 加 scope 字段配置 + 显示
17. `apps/shop-admin/src/pages/marketing/CouponRules.vue` — 自动规则管理新页
18. `apps/shop-admin/src/apis/oms.ts` + `router/index.ts` + `AdminLayout.vue` — 加路由 + 菜单

### Wave 6 · 小程序（4 文件改）
19. `apps/shop-miniprogram/pages/checkout/index.{js,wxml}` — 多券显示 + 累加金额展示
20. `apps/shop-miniprogram/pages/my-coupons/index.{js,wxml}` — 多选模式（满减 1 张 + 折扣 1 张）
21. `apps/shop-miniprogram/apis/index.js` — orderSubmit 改 user_coupon_ids 数组

### Wave 7 · 测试 + 文档（3 文件）
22. `outputs/orchestration/reconcile-report-iteration-27.md`
23. `outputs/testing/iteration-27-auto-test.md`
24. `outputs/testing/iteration-27-manual-test.md`

> 计件 24，实际文件层面 ~28（含小程序四件套展开）。

## 二、表结构

### coupons (ALTER)
```sql
ALTER TABLE coupons
  ADD COLUMN scope_type VARCHAR(16) NOT NULL DEFAULT 'all' AFTER type, -- all/spu/category
  ADD COLUMN scope_value JSON DEFAULT NULL                              -- [1,2,3] 形式的 id 数组
;
```

### coupon_auto_rules（Q19-02）
```sql
CREATE TABLE coupon_auto_rules (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  trigger_type VARCHAR(32) NOT NULL,         -- user_register / order_completed
  coupon_id INT UNSIGNED NOT NULL,
  per_user_limit INT NOT NULL DEFAULT 1,     -- 每用户最多触发几次
  granted_count INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  remark VARCHAR(255) DEFAULT '',
  created_by VARCHAR(64) NOT NULL,
  created_at DATETIME,
  updated_at DATETIME
);
```

### order_coupons（Q19-03 多券叠加关联）
```sql
CREATE TABLE order_coupons (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(32) NOT NULL,
  user_coupon_id INT UNSIGNED NOT NULL,
  coupon_id INT UNSIGNED NOT NULL,
  coupon_type VARCHAR(16) NOT NULL,           -- threshold/percent，方便算法分类
  discount BIGINT NOT NULL,                   -- 此券实际抵扣（分）
  created_at DATETIME,
  KEY idx_order_no (order_no),
  UNIQUE KEY uk_order_type (order_no, coupon_type)  -- 同类型只能挂 1 张（强约束）
);
```

## 三、关键设计决策

| 主题 | 决策 |
|---|---|
| 范围粒度 | scope_type=all/spu/category；spu 用 id 数组，category 用 id 数组（嵌套不展开）|
| 范围算法 | check 时遍历订单 items，至少 1 个 SKU 在范围内才能用；discount 仍按 goods_amount 全额（M3+ 可改"仅范围内 SKU 折扣"）|
| 多券叠加规则 | 同订单最多 1 张满减 + 1 张折扣；满减先算，折扣后算（折扣基数 = goods - 满减）|
| 多券叠加 vs 兼容旧 API | OrderService 接收 `user_coupon_ids` 数组优先；缺时回落老 `user_coupon_id` 单数；前端逐步迁移 |
| 自动发券触发 | shop-backend User::login 首次创建用户时调 CouponAutoGrantService->grantForUser；trigger_type=user_register |
| 自动发券幂等 | rule.per_user_limit + 查 user_coupons 表已发数（按 coupon_id + user_id）双校验 |
| Rule schema | 不引入"条件 DSL"，硬编码 trigger_type 枚举；M3+ 加 条件 / 周期 |
| 多券强约束 | order_coupons UNIQUE(order_no, coupon_type) 数据库层兜底"同类不叠" |
| 商品券缺货回滚 | check / apply 时校验 scope；订单含范围内 SKU 即通过 |
| Vue 后台 SCOPE 输入 | 多选下拉 SPU（搜索）或 多选类目（树） |
| 小程序多选 UX | my-coupons 选择模式下：1 满减区 + 1 折扣区 独立单选 |

## 四、API 设计

### admin 优惠券（改）
- POST `/admin/coupon` body 多收 `scope_type` + `scope_value`
- 其余不变

### admin 自动规则（新）
| 方法 | 路径 | 用途 |
|---|---|---|
| GET   | `/admin/coupon-rule/list`         | 列表 |
| POST  | `/admin/coupon-rule`              | 新增/UPSERT |
| PUT   | `/admin/coupon-rule/:id`          | 改启用 / 改 limit |
| DELETE| `/admin/coupon-rule/:id`          | 删 |

### shop check（多收）
- POST `/coupon/check` body 加 `items: [{sku_code, qty, ...}]` 用于范围校验

### shop 下单（多券）
- POST `/order/submit` body 改为 `user_coupon_ids: [int, int]`（兼容老 `user_coupon_id` 单数）

## 五、避坑

| 风险 | 规避 |
|---|---|
| 多券超叠（破规则）| order_coupons UNIQUE 兜底 + service 层 array_unique by coupon_type 预检 |
| 商品券范围内 SKU 为 0 | 提交时 400 拒绝；check 时显示"不可用"|
| 自动发券死循环 | per_user_limit 强校验 + 创建用户后单次同步调 grant |
| scope_value 为 NULL（all 模式） | SQL 处理：scope_type='all' 跳过 JSON 解析 |
| 旧用户重复触发新人券 | trigger_type='user_register' 触发依赖"创建用户那一瞬间"；老用户不会触发 |
| 算法顺序错误 | 显式：foreach 满减券 → 累加 discount → goods -= discount → 再 foreach 折扣券 |
| OrderService 兼容 | ids 数组优先；空时回落单数；空集都算"未用券" |

## 六、待用户运行验证（3 步）
1. **migrations**：
   ```bash
   docker-compose exec oms-backend php think migrate:run
   ```
2. **重启 oms-backend + shop-backend**
3. **Vue 自动热更 + 小程序刷编译**

## 七、剩余非阻塞（M3+）
- Q27-01：折扣仅对范围内 SKU（当前是全单折扣）
- Q27-02：多券叠加加"满减+满减"（多类型扩展）
- Q27-03：自动规则加"已下单 N 单后赠"条件
- Q27-04：定时调度（每日凌晨触发某些规则）
- Q27-05：自动发券失败重试（异步队列）
