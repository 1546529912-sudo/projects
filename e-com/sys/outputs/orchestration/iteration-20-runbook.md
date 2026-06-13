# iteration-20-runbook.md · 评价 + 收藏 + 地址簿（用户侧 UGC + UX 增强）

## 一、文件清单（共 ~25 文件，6 Wave）

### Wave 1 · 数据层（3 文件）
1. `apps/shop-backend/database/migrations/20260601000001_create_addresses.php`
2. `apps/shop-backend/database/migrations/20260601000002_create_favorites.php`
3. `apps/shop-backend/database/migrations/20260601000003_create_reviews.php`

> 三表统一放 shop_db（用户态资源），不引入跨 DB 写。后台 review 审核走 shop-backend 副连接（参考 iter-19 oms 副连接模式反过来用）。

### Wave 2 · shop-backend 用户接口（7 文件）
4. `apps/shop-backend/app/service/AddressService.php`
5. `apps/shop-backend/app/service/FavoriteService.php`
6. `apps/shop-backend/app/service/ReviewService.php`
7. `apps/shop-backend/app/controller/Address.php`
8. `apps/shop-backend/app/controller/Favorite.php`
9. `apps/shop-backend/app/controller/Review.php`
10. `apps/shop-backend/route/app.php` — 加 address/favorite/review 路由（Auth user middleware）

### Wave 3 · OMS admin Review 审核（3 文件）
11. `apps/oms-backend/app/controller/Review.php` — 后台查/隐藏（通过 shop 副连接读 shop_db.reviews）
12. `apps/oms-backend/config/database.php` 已配置；这里给 OMS 加 shop 连接（参考 shop-backend.config.database 的 oms 连接）
13. `apps/oms-backend/route/app.php` — admin/review/* 路由（super_admin + sales_ops）

### Wave 4 · BFF 聚合（1 文件）
14. `apps/shop-backend/app/controller/Product.php` — productDetail 加 review_count + rating_avg + reviews 字段（取前 3 条）

### Wave 5 · Vue 后台（4 文件，3 改 1 新）
15. `apps/shop-admin/src/apis/oms.ts` — 加 reviewList/Hide
16. `apps/shop-admin/src/pages/marketing/Reviews.vue` — 评价审核页（列表 + 隐藏）
17. `apps/shop-admin/src/router/index.ts` — 加 /marketing/reviews 路由
18. `apps/shop-admin/src/components/AdminLayout.vue` — 营销菜单下加"评价审核"

### Wave 6 · 小程序（~10 文件，5 新 5 改）
19. `apps/shop-miniprogram/pages/address-list/index.{js,wxml,wxss,json}` — 地址簿列表
20. `apps/shop-miniprogram/pages/address-edit/index.{js,wxml,wxss,json}` — 地址编辑/新增
21. `apps/shop-miniprogram/pages/favorites/index.{js,wxml,wxss,json}` — 我的收藏
22. `apps/shop-miniprogram/pages/review-submit/index.{js,wxml,wxss,json}` — 评价提交
23. `apps/shop-miniprogram/pages/my-reviews/index.{js,wxml,wxss,json}` — 我的评价
24. `apps/shop-miniprogram/apis/index.js` — 加 address/favorite/review 接口
25. `apps/shop-miniprogram/pages/detail/index.{js,wxml}` — 收藏按钮 + 评价区
26. `apps/shop-miniprogram/pages/checkout/index.{js,wxml}` — 改为从地址簿选地址
27. `apps/shop-miniprogram/pages/order-detail/index.{js,wxml}` — completed 状态加"评价"入口
28. `apps/shop-miniprogram/pages/me/index.{js,wxml}` — 加"地址簿/收藏/我的评价"入口
29. `apps/shop-miniprogram/app.json` — 注册 5 新页

## 二、表结构

### addresses（地址簿）
```sql
CREATE TABLE addresses (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  province VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  district VARCHAR(50) NOT NULL,
  detail VARCHAR(255) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME,
  KEY idx_user_default (user_id, is_default)
);
```

### favorites（收藏 SPU）
```sql
CREATE TABLE favorites (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  spu_id INT UNSIGNED NOT NULL,
  created_at DATETIME,
  UNIQUE KEY uniq_user_spu (user_id, spu_id)
);
```

### reviews（评价）
```sql
CREATE TABLE reviews (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  order_no VARCHAR(32) NOT NULL,
  sku_code VARCHAR(64) NOT NULL,
  spu_id INT UNSIGNED NOT NULL,
  rating TINYINT NOT NULL,           -- 1-5
  content VARCHAR(1000) DEFAULT '',
  images JSON DEFAULT NULL,          -- 复用 iter-15 /uploads/refund-evid 的同形态相对路径数组
  status VARCHAR(16) NOT NULL DEFAULT 'active',  -- active / hidden
  created_at DATETIME,
  KEY idx_spu_status (spu_id, status),
  KEY idx_user (user_id),
  KEY idx_order (order_no),
  UNIQUE KEY uniq_order_sku (order_no, sku_code)
);
```

## 三、关键设计决策

| 主题 | 决策 |
|---|---|
| 三表归属 | 全放 shop_db。OMS 后台审核走副连接读，避免跨 DB 写 |
| 评价图片 | 复用 iter-15 `/uploads/` 上传机制，路径存 JSON 数组 |
| 一单一评 | `(order_no, sku_code)` 唯一索引保证 |
| 评价前置条件 | 仅 status='completed' 订单可评，校验 `orders.user_id = current` |
| SPU 详情聚合 | shop-backend 已是 BFF 模式，在 `Product/detail` 多查一次 reviews 聚合即可 |
| 收藏粒度 | SPU（不是 SKU）。详情页心标 toggle 切换 |
| 默认地址 | 单 set_default endpoint，业务层保证全表 UPDATE is_default=0 后再单条置 1 |
| 结算页改造 | 从地址簿选；老的 `users.last_address_snapshot` 仍兼容（无地址簿时回落） |
| 后台菜单 | 评价审核放"营销"父级（与优惠券同组）|
| 后台 RBAC | super_admin + sales_ops（运营审核 UGC） |
| 评价隐藏不是删 | `status='hidden'` 软删；保留数据可恢复 |
| 不引入富文本 | content 纯文本，1000 字限制；emoji 字符级数 |
| 不引入评分细分 | 整体 1-5 星单维度（M3+ 可加多维度：物流/服务/质量）|

## 四、API 设计

### shop-backend 用户接口（Auth user middleware）
| 方法 | 路径 | 用途 |
|---|---|---|
| GET    | `/address/list`         | 地址簿列表 |
| POST   | `/address`              | 新增 |
| PUT    | `/address/:id`          | 更新 |
| DELETE | `/address/:id`          | 删除 |
| POST   | `/address/:id/default`  | 设为默认 |
| GET    | `/favorite/list`        | 我的收藏 |
| POST   | `/favorite/:spuId`      | 加收藏（重复 idempotent） |
| DELETE | `/favorite/:spuId`      | 取消收藏 |
| GET    | `/review/by-spu/:spuId` | SPU 评价列表（公开读，限于已 active）|
| GET    | `/review/my`            | 我的评价 |
| POST   | `/review`               | 提交评价（校验订单 + 唯一） |

### OMS admin 审核（AdminAuth super_admin + sales_ops）
| 方法 | 路径 | 用途 |
|---|---|---|
| GET  | `/admin/review/list`        | 评价列表（含 user/order 关联） |
| POST | `/admin/review/:id/hide`    | 隐藏 |
| POST | `/admin/review/:id/restore` | 恢复 |

### shop-backend BFF productDetail 变动
- 响应多加 `review_count`, `rating_avg`, `reviews`（前 3 条简略形态）

## 五、避坑清单

| 风险 | 规避 |
|---|---|
| 评价唯一性绕过 | DB 层 UNIQUE `(order_no, sku_code)` 兜底 |
| 收藏并发重复 | DB 层 UNIQUE `(user_id, spu_id)` + INSERT IGNORE |
| 地址默认竞态 | set_default 内 tx 先 UPDATE 全 0 再单条置 1，加 user_id 维度行锁 |
| 评价跨用户改 | 写时强校验 reviews.user_id = current；admin 才能 hide |
| 评价依赖订单状态 | POST review 时强查 orders.status = completed |
| 评价图片复用 | 路径相对、images 字段存数组、不引入新 endpoint |
| OMS 跨库读 | 加 shop 副连接（同 iter-19 模式反向） |
| 评价聚合 N+1 | productDetail 一次聚合查 + 一次 limit 3 副查，足够；M3+ 加 Redis 缓存 rating_avg |
| address-list 默认排序 | is_default DESC + id DESC，前端无需排序 |
| 结算页地址兼容老 user 字段 | 地址簿空时回落 last_address_snapshot |
| review_submit 评分边界 | 1-5 整数强校验 |

## 六、待用户运行验证（3 步）
1. **跑 migrations**：
   ```bash
   docker-compose exec shop-backend php think migrate:run
   ```
2. **重启 oms-backend / shop-backend**（加新连接配置 + 路由）：
   ```bash
   docker-compose restart oms-backend shop-backend
   ```
3. **小程序重新编译**

> auto-test 我跑（curl）→ `iteration-20-auto-test.md`
> manual-test 用户跑（UI）→ `iteration-20-manual-test.md`

## 七、剩余非阻塞（M3+）
- Q20-01：评价多维度（物流/服务/质量）
- Q20-02：评价 emoji 表情 / 富文本
- Q20-03：评价点赞 / 回复 / 商家回复
- Q20-04：地址 LBS 定位选址
- Q20-05：收藏分组 / 价格降时通知
- Q20-06：评价审核加 audit_log（admin_audit_log 复用）
- Q20-07：评价图片走 OSS / CDN
- Q20-08：rating_avg 加 Redis 缓存
