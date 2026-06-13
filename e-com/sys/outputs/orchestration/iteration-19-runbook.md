# iteration-19-runbook.md · 优惠券 / 促销（业务扩展开篇）

## 一、文件清单（共 14 文件，5 Wave）

### Wave 1 · 数据层 + OMS 优惠券模板 CRUD（5 文件）
1. `apps/oms-backend/database/migrations/20260529000001_create_coupons.php` — 优惠券模板表
2. `apps/oms-backend/database/migrations/20260529000002_create_user_coupons.php` — 用户已领券表
3. `apps/oms-backend/app/service/CouponService.php` — 模板 CRUD + 校验/核销纯函数
4. `apps/oms-backend/app/controller/Coupon.php` — admin 后台 CRUD
5. `apps/oms-backend/route/app.php` — 加 `admin/coupon/*` 路由（AdminAuth 'super_admin', 'sales_ops'）

### Wave 2 · shop-backend 用户领券（3 文件）
6. `apps/shop-backend/app/service/UserCouponService.php` — 领券 / 列表 / 核销前校验
7. `apps/shop-backend/app/controller/Coupon.php` — shop 用户接口
8. `apps/shop-backend/route/app.php` — 加 `coupon/*` 路由（Auth user middleware）

### Wave 3 · 下单核销集成（2 文件，已存在则改）
9. `apps/oms-backend/app/service/OrderService.php` — `create` 接收 `user_coupon_id` → 校验 + 算 discount + 标记 used（tx 内）
10. `apps/shop-backend/app/controller/Order.php` — `submit` 把 `user_coupon_id` 透传给 OMS

### Wave 4 · Vue 后台优惠券管理（4 文件，已存在则改）
11. `apps/shop-admin/src/apis/oms.ts` — 加 couponList/Create/Update/Disable
12. `apps/shop-admin/src/pages/marketing/Coupons.vue` — CRUD 页 + 统计列
13. `apps/shop-admin/src/router/index.ts` — 加 `/marketing/coupons` 路由
14. `apps/shop-admin/src/components/AdminLayout.vue` — 加"营销"菜单（OMS 与 WMS 之间）

### Wave 5 · 小程序领券 + 核销（4 文件，1 改 3 新）
15. `apps/shop-miniprogram/pages/coupon-center/index.{js,wxml,wxss,json}` — 领券中心
16. `apps/shop-miniprogram/pages/my-coupons/index.{js,wxml,wxss,json}` — 我的优惠券
17. `apps/shop-miniprogram/utils/api.js` — 加 couponApi（如已有 api.js）/ 否则用 request.js 内联
18. `apps/shop-miniprogram/pages/cart/index.{js,wxml}` — 结算栏加"使用优惠券"入口 + 把 user_coupon_id 传 /order/submit

> 计件以"逻辑模块"算 14，文件层面 ~22 个（含小程序 4 件套）。

## 二、表结构

### coupons（优惠券模板）
```sql
CREATE TABLE coupons (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  type ENUM('threshold','percent') NOT NULL,  -- 满减 / 折扣
  discount_value DECIMAL(10,2) NOT NULL,       -- 满减:减¥;折扣:小数(0.85=8.5折)
  min_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- 满 X 才能用
  max_discount DECIMAL(10,2) DEFAULT NULL,     -- 折扣券封顶(NULL=不封)
  total_count INT NOT NULL DEFAULT 0,          -- 总发放量(0=不限)
  per_user_limit INT NOT NULL DEFAULT 1,       -- 每人限领
  claimed_count INT NOT NULL DEFAULT 0,
  used_count INT NOT NULL DEFAULT 0,
  valid_from DATETIME NOT NULL,
  valid_to DATETIME NOT NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

### user_coupons（已领券）
```sql
CREATE TABLE user_coupons (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  coupon_id INT UNSIGNED NOT NULL,
  status ENUM('unused','used','expired') NOT NULL DEFAULT 'unused',
  received_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  order_no VARCHAR(32) DEFAULT NULL,
  KEY idx_user_status (user_id, status),
  KEY idx_coupon (coupon_id)
);
```

### orders（已有 `discount` 字段，复用）
不加列。`orders.discount` 存核销金额，券与订单的反向关联通过 `user_coupons.order_no` 查。

## 三、关键设计决策

| 主题 | 决策 |
|---|---|
| 券类型 | 只做 `threshold`（满减）+ `percent`（折扣）。商品券/品类券 M3+ |
| 折扣存储 | percent 用小数（0.85 = 8.5 折），threshold 用元 |
| 满减规则 | goods_amount ≥ min_amount → 减 discount_value（不能减成负） |
| 折扣规则 | discount = goods_amount × (1 - discount_value)；max_discount 封顶 |
| 不含运费 | 折扣只针对 goods_amount；运费照常收 |
| 核销时点 | 订单创建 tx 内：校验 → 算 discount → orders.discount = X → user_coupons.status=used → coupons.used_count++ |
| 库存 vs 券 | 库存先扣（已有逻辑），券再核销，全在同一 tx |
| 取消订单 | 默认**不返券**（业务习惯，M3+ 可选返） |
| 校验链 | 状态 unused + valid_from ≤ now ≤ valid_to + goods_amount ≥ min_amount |
| 领取限流 | per_user_limit + total_count 双检查（领取 SELECT ... FOR UPDATE coupons 行锁） |
| 失效处理 | 不跑 cron 主动失效；查询时按 valid_to 过滤展示，核销时严格校验 |
| Admin 权限 | 营销属业务运营，开放 `super_admin` + `sales_ops`；不给 warehouse |
| Vue 菜单 | 新增"营销"父级，super_admin + sales_ops 可见 |
| 小程序入口 | 我的页加"我的优惠券" + 首页可加"领券中心"（本 iter 在我的页放入口） |

## 四、API 设计

### OMS Admin（`/api/oms/admin/coupon/*`，AdminAuth super_admin|sales_ops）
| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/coupon/list` | 列表（带 claimed/used 统计） |
| POST | `/coupon` | 创建模板 |
| PUT | `/coupon/:id` | 改 name / valid_to / total_count |
| POST | `/coupon/:id/disable` | 停用（不可恢复） |

### shop-backend（`/api/shop/coupon/*`，Auth user middleware）
| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/coupon/available` | 可领券列表（未过期 + 没领满） |
| POST | `/coupon/:id/claim` | 领券 |
| GET | `/coupon/my` | 我的优惠券（?status=unused/used/expired/all） |
| POST | `/coupon/check` | 结算预检（body: user_coupon_id, goods_amount） |

### shop-backend Order/submit 变动
- body 多收 `user_coupon_id`（可选）
- 透传给 OMS `/api/v1/order/create`

### OMS OrderService::create 变动
- body 多收 `user_coupon_id`（可选）
- tx 内：查券（lock）→ 校验 → 算 discount → 写 orders.discount → update user_coupons → coupons.used_count++

## 五、避坑清单

| 风险 | 规避 |
|---|---|
| 同一用户并发领多张超限 | 领券事务内 `lock(true)` user_coupons.coupon_id COUNT 后再 insert |
| 同一券并发领超总量 | coupons SELECT ... FOR UPDATE + claimed_count 再 +1 |
| 折扣减成负 | `discount = min(discount, goods_amount)` |
| valid_to 时区 | 全 PHP `date('Y-m-d H:i:s')`，DB datetime，不存时间戳 |
| 取消订单返券 | **不返**（业务侧决定），文档明示 |
| 订单创建失败后券已扣 | 全在同一 tx，rollback 一起回 |
| Excel 导出含优惠券 | 本 iter 不改 export（M3+） |
| Admin 把过期券改回有效期 | 允许（运营场景） |
| 折扣值范围 | percent 校验 0 < v < 1，threshold 校验 v > 0 |

## 六、待用户运行（3 步）

1. **跑 migrations**：
   ```bash
   docker-compose exec oms-backend php vendor/bin/phinx migrate -e production
   ```
2. **重启 shop-backend / oms-backend / shop-admin**（如有代码改动需重建）：
   ```bash
   docker-compose restart shop-backend oms-backend
   ```
3. **小程序刷新**：开发者工具点编译

> auto-test 我跑（curl）→ `iteration-19-auto-test.md`
> manual-test 用户跑（UI）→ `iteration-19-manual-test.md`

## 七、剩余非阻塞（M3+）
- Q19-01：商品券 / 品类券
- Q19-02：新人券 / 自动发券
- Q19-03：多券叠加
- Q19-04：退款时返券
- Q19-05：优惠券分享 / 推荐人券
- Q19-06：CSV 导出加优惠券列
- Q19-07：Dashboard 加"券核销率"图
