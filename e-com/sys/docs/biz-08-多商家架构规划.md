# BIZ-08 多商家入驻（B2B2C）架构规划

> **目的**：在 iter-35 ~ iter-39 这 5 轮把单店电商改造为多商家平台，提前对齐所有架构决策、迁移路径、跨店边界，避免方向性错误返工。
>
> **写作时间**：2026-06-03（iter-34 收口后）
>
> **状态**：草稿 v1，待用户审批后进入 iter-35。

## 一、业务范围与定位

### 1.1 在范围内（本期要做）

- **平台 / 店铺 / 商品三级模型**：平台 → N 个店铺 → 各自的 SPU/SKU
- **数据隔离**：店铺管理员只能看自己店铺的商品 / 订单 / 库存
- **入驻流程**：自助申请 → 平台审核 → 开店 → 上架
- **平台抽佣**：订单完成时按比例自动计算（无需先做提现流程）
- **多店订单**：用户购物车混搭多店商品时，按店铺自动拆单（每店一单，对齐淘宝/京东行为）

### 1.2 不在范围内（v1 留位）

- 店铺装修（自定义首页/Banner）— 留 Q35-01
- 店铺评分体系 — 留 Q35-02
- 商家结算 / 提现 — 留 Q35-03（先记账，提现 M3）
- 店铺间发优惠券 — 留 Q35-04
- 店铺申请 - 资质材料完整审核流（v1 仅基础信息）

### 1.3 关键定义

| 术语 | 含义 |
|---|---|
| 平台（Platform） | 当前系统运营方，super_admin 角色管理 |
| 店铺（Store） | 入驻商家，有自己的 SPU/SKU/订单/库存视图 |
| 平台店（Platform Store） | id=1 的默认店，存量数据迁移目标；自营业务用 |
| 店主（store_owner） | 新角色，对自己店铺有完整权限 |
| 店员（store_staff） | 新角色，对自己店铺有限权限（不能改店铺设置） |

## 二、数据模型变更

### 2.1 新增表（iter-35 地基）

```sql
-- 1. 店铺主表（oms_db，平台侧持有）
CREATE TABLE stores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) UNIQUE,         -- 店铺唯一标识（slug）
  name VARCHAR(100),
  logo_url VARCHAR(500) NULL,
  description TEXT,
  status ENUM('pending', 'approved', 'suspended', 'closed') DEFAULT 'pending',
  -- 入驻人信息（v1 简化）
  contact_name VARCHAR(50),
  contact_phone VARCHAR(20),
  business_license VARCHAR(100),   -- 营业执照号
  -- 抽佣
  commission_rate DECIMAL(5,4) DEFAULT 0.0500,  -- 5%
  -- 审核
  approved_at DATETIME NULL,
  approved_by VARCHAR(64) NULL,
  suspended_reason VARCHAR(200) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX(status)
);

-- 默认数据：id=1 平台店
INSERT INTO stores VALUES (1, 'platform', '平台自营', NULL, '默认店铺，存量数据归属', 'approved', '平台', '', '', 0, NOW(), 'system', NULL, NOW());

-- 2. 店铺 ↔ admin_user 关联表（多对多，一人可管多店）
CREATE TABLE store_admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT,
  admin_user_id INT,
  role ENUM('store_owner', 'store_staff') DEFAULT 'store_owner',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, admin_user_id),
  INDEX(admin_user_id)
);

-- 3. 平台订单 - 店铺订单拆分关联（OMS 现有 orders 加 store_id 后，需要 parent_order_no 关联）
ALTER TABLE orders ADD COLUMN store_id INT DEFAULT 1 AFTER user_id;
ALTER TABLE orders ADD COLUMN parent_order_no VARCHAR(32) NULL AFTER order_no;
ALTER TABLE orders ADD INDEX idx_store(store_id, status);
ALTER TABLE orders ADD INDEX idx_parent(parent_order_no);
```

### 2.2 现有表加 store_id（核心改动）

| 表 | 所在库 | store_id 含义 | iter |
|---|---|---|---|
| `spus` | pim_db | 该 SPU 属于哪家店 | iter-36 |
| `skus` | pim_db | 继承 spu.store_id（冗余便利查询） | iter-36 |
| `categories` | pim_db | NULL=平台公共类目 / 非 NULL=店铺自定义类目 | iter-36 |
| `brands` | pim_db | NULL=平台公共品牌 / 非 NULL=店铺自有品牌 | iter-36 |
| `orders` | oms_db | 该订单属于哪家店（拆单后） | iter-37 |
| `refund_orders` | oms_db | 跟 orders 一致 | iter-37 |
| `exchange_orders` | oms_db | 跟 orders 一致 | iter-37 |
| `settlement_orders` | oms_db | 按店统计 | iter-37 |
| `coupons` | oms_db | NULL=平台券 / 非 NULL=店铺券 | iter-37 |
| `inventory_status` | oms_db | 跟 SKU 走，store_id 冗余 | iter-37 |
| `warehouses` | wms_db | 仓库属于哪家店（自营 vs 商家仓） | iter-38 |
| `inventory` | wms_db | 实物库存归属店 | iter-38 |
| `pim_admin_audit_log` | pim_db | 操作所属店（NULL=平台操作） | iter-36 |
| `admin_audit_log` | oms_db | 操作所属店 | iter-37 |
| `webhook_subscriptions` | oms_db | 各店配各自 webhook | iter-37 |

**不加 store_id 的**：
- `users` - 用户是平台层概念，所有店铺共享
- `addresses / favorites / reviews` - 用户行为，跨店通用
- `dead_letter / inventory_log` - 基础设施
- `stock_alert_rules / stock_take_schedules / wms_configs` - WMS 各店一份还是平台统一管？v1 平台统一管（不加 store_id），v2 可拆

### 2.3 admin_users 加 store_id（关键改动）

```sql
-- 现状：admin_users 只有 super_admin/warehouse/sales_ops 三种 role
-- 新增：role=store_owner / store_staff 时，必须通过 store_admins 表关联店铺
ALTER TABLE admin_users MODIFY COLUMN role
  ENUM('super_admin', 'warehouse', 'sales_ops', 'store_owner', 'store_staff');
```

- **super_admin / warehouse / sales_ops**：平台员工，跨店访问（无 store_id 限制）
- **store_owner / store_staff**：店铺员工，store_admins 关联，只看绑定的店铺

## 三、权限模型

### 3.1 AdminAuth middleware 增强（iter-35）

```php
// 现状：从 JWT 取 role，路由 group 限 role
// 增强：role=store_owner/store_staff 时，request->store_ids = [关联店铺 IDs]
// service 层用 request->store_ids 做查询过滤

// 例：PIM Product.adminList 加：
if (in_array($admin['role'], ['store_owner', 'store_staff'])) {
    $storeIds = $request->store_ids;
    $query->whereIn('store_id', $storeIds);
}
```

### 3.2 角色 × 能力矩阵

| 能力 | super_admin | sales_ops | warehouse | store_owner | store_staff |
|---|---|---|---|---|---|
| 跨店看所有数据 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 审批入驻申请 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 改店铺抽佣 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 暂停店铺 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 管自己店商品 | ✅ | ✅ | ❌ | ✅ | ✅ |
| 改店铺设置 | ✅ | ❌ | ❌ | ✅ | ❌ |
| 看自己店订单 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 审批自己店退款 | ✅ | ✅ | ❌ | ✅ | ❌ |
| 看自己店财务 | ✅ | ✅ | ❌ | ✅ | ❌ |
| WMS 仓储操作（自营仓） | ✅ | ❌ | ✅ | ❌ | ❌ |
| WMS 仓储（商家仓） | ✅ | ❌ | ❌ | ✅ | ✅ |

## 四、5 轮迭代拆分

### iter-35 · 架构地基（最关键）

**核心：建店铺表 + 改 admin_users + 数据迁移脚本**

- 新增 stores + store_admins 表（oms_db，作为权威 store 列表）
- shop_db / pim_db / wms_db 加 stores 副连接（OMS→PIM/WMS 已有，反向需要）
- admin_users 加 role enum + store_admins 关联
- AdminAuth middleware 增强：注入 request.store_ids
- 数据迁移：所有现有 admin_user 的 store_admins 不动（super/sales/warehouse 跨店）
- Vue 加"店铺管理"菜单（super_admin 独占）：列表 / 审批 / 暂停 / 抽佣调整
- **不动业务表**：所有业务表的 store_id 留到后续 iter-36~38 各自加

**风险**：JWT payload 不存 store_ids（避免膨胀），每次请求查 store_admins。要加 Redis 缓存。

**~ 14 文件**

### iter-36 · PIM 多店化

**核心：spus/skus/categories/brands 加 store_id + UI 按店过滤**

- 4 张表 ALTER 加 store_id（默认 1=平台店）
- Product/Sku/Category/Brand controller 加 store 过滤
- Vue PIM 页面：super_admin 看到"店铺"筛选下拉（默认全部）；store_owner 看不到下拉，自动锁住自己店
- PIM Dashboard `/admin/stats` 加店过滤
- pim_admin_audit_log 加 store_id 字段（NULL=平台操作）
- 类目/品牌特殊处理：store_id=NULL 是平台公共，店铺创建的自己用 + 平台公共共用
- 数据迁移：现有 spus/skus 全 store_id=1

**~ 12 文件**

### iter-37 · OMS 多店化（含订单拆单）

**核心：订单按 store_id 拆 + 退款/换货/财务结算/优惠券按店**

- orders + refund_orders + exchange_orders + settlement_orders + admin_audit_log + webhook_subscriptions ALTER 加 store_id
- **关键：下单拆单逻辑**：购物车含多店商品 → OrderService.create 自动按 store_id 分组 → 创建 N 个 orders，加 parent_order_no 关联
- 支付：父订单整体支付，回调后给所有子订单标 paid
- coupons 加 store_id（NULL=平台券通用 / 非 NULL=店铺券限本店）
- coupon 校验时按订单 store_id 过滤
- 财务结算：按店分桶 + 平台抽佣 row 单独记录
- Vue OMS Orders 加店过滤 + Settlement 加店维度
- shop-backend BFF 订单详情接口要能返回"父单 + 多个子单"

**~ 20 文件**（最大的一轮）

### iter-38 · WMS 多店化

**核心：仓库归属店 + 商家仓 vs 自营仓**

- warehouses 加 store_id + warehouse_type ENUM('self', 'merchant')
- inventory 加 store_id（冗余便利查询，主要按 warehouse_code 关联店）
- store_owner 只看自己仓 + 操作自己仓库存
- 平台仓（store_id=1）的 SKU 进出库不受店铺限制
- 跨店调拨：v1 不支持（store_owner 只能本店内调拨），v2 可由平台代理跨店
- inventory_log 已有 change_type 8 种，多店化只是按 store_id 过滤

**~ 10 文件**

### iter-39 · 入驻流程 + 抽佣 + 后台店铺管理

**核心：自助入驻 + 自动抽佣**

- 入驻流程：
  - 用户在小程序"我的"→"申请开店"→ 填基础信息 + 营业执照号 → 提交
  - 平台 super_admin 审批：通过 → status=approved + 自动创建 admin_user(store_owner) + store_admins 关联
- 抽佣自动计算：
  - OrderService.confirm 落 settlement_orders 时按 stores.commission_rate 算
  - 平台抽佣作为一条独立 settlement row（type='platform_commission', store_id=1）
- 店铺自管：
  - 店铺信息修改（logo/简介，但不能改抽佣/状态）
  - 店员管理（store_owner 可邀请 store_staff 加入）
- 小程序店铺页：商品列表加店铺信息 + 店铺主页

**~ 14 文件**

## 五、数据迁移策略

### 5.1 store_id 默认值

所有 ALTER 加 store_id 时：

```sql
ALTER TABLE spus ADD COLUMN store_id INT DEFAULT 1 NOT NULL AFTER deleted_at;
ALTER TABLE spus ADD INDEX idx_store(store_id);
```

存量数据自动归 store_id=1（平台店）。**默认值必须设 NOT NULL DEFAULT 1**，否则可能 NULL 进生产。

### 5.2 迁移顺序（关键）

```
iter-35 stores 表先建 + 平台店 id=1 落地  ←  没有这步后续 ALTER 加 store_id 会失去引用
   ↓
iter-36 PIM 4 表 ALTER
   ↓
iter-37 OMS 6 表 ALTER（注意 orders 拆单逻辑改动最大，可能要 down migration）
   ↓
iter-38 WMS 2 表 ALTER
   ↓
iter-39 业务流程切换
```

### 5.3 回滚策略

每个 ALTER 都写对应 down() 方法（drop column + drop index）。
**OrderService.create 拆单逻辑改动**最危险，建议加 feature flag：
- `OMS_MULTI_STORE_SPLIT=false` 默认走旧逻辑
- 灰度阶段开 `true` 在 staging 验证
- 全量 `true` 后下一 iter 删 flag

## 六、跨店场景边界

| 场景 | v1 行为 | v2 / 未来 |
|---|---|---|
| 用户购物车多店商品 | 自动拆 N 单，各自支付/物流 | — |
| 用户搜索商品 | 跨店搜，结果带店铺标识 | 加店铺筛选 |
| 收藏 / 评价 | 跨店通用，绑 SKU 不绑店 | — |
| 优惠券 | NULL=平台券所有店通用 / 店铺券限本店 | 跨店满减券（M3） |
| 退款 | 单内退（一子单为单位） | 父单整退（M3） |
| 换货 | 仅同店内换 | 跨店换不支持（永远） |
| 跨店调拨 | 不支持（store_owner 限本店） | 平台代理（M3） |
| WMS 库存预警 webhook | 各店配各自 | — |
| 财务结算 | 按店分桶 + 平台抽佣单独 | 商家自动提现（M3）|

## 七、风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| iter-37 拆单逻辑复杂，破坏 33 轮订单链路 | ⭐⭐⭐⭐⭐ 致命 | feature flag + staging 反复跑现有 manual-test |
| store_admins 关联表每请求都查 | ⭐⭐⭐ 性能 | Redis 缓存 admin_user_id → [store_ids]，TTL 1h |
| 跨库副连接已有 6 方向，多店再多 4 方向 | ⭐⭐ 复杂度 | 提炼 StoreContext service 集中管 store_id 查询 |
| 现有 manual-test 全部失效（多了 store 维度） | ⭐⭐⭐ 工作量 | 5 轮各自更新 manual-test；积压先跑一遍当基线 |
| store_id=1 在生产 dump 时漏掉默认值 | ⭐⭐⭐⭐ 数据损坏 | ALTER 强制 NOT NULL DEFAULT 1，每轮 migration up()/down() 完整 |

## 八、未涉及但需思考

- **API 兼容**：现有 `GET /api/v1/admin/spu/list` 是否要加 `?store_id=` 参数？建议加可选，super_admin 不传=全部
- **小程序老版本**：当前小程序不知道 store 概念。订单详情接口要兼容返回旧 schema（无 store_id 字段时不渲染店铺名）
- **性能**：跨店 Dashboard 聚合在数据量上来后会慢，留 Q39-01 加分库分表
- **多语言**：店铺名 / 描述要支持中英文？v1 不做

## 九、决策需要用户拍板

1. **拆单时机**：用户下单时立即拆 N 个 orders，还是先 1 个 order 多 items 后续拆？
   - **推荐**：立即拆（同淘宝），简化后续退款/退货/换货逻辑
2. **店铺自营仓 vs 平台仓**：商家可以用平台仓代发吗？
   - **推荐**：v1 商家必须自有仓（简化）；v2 加平台代发服务
3. **支付**：父单整付还是子单分付？
   - **推荐**：父单整付（用户体验好），回调后所有子单 paid
4. **平台公共类目/品牌**：商家可以"用"，但不能"改"
   - **推荐**：是，简化合规
5. **抽佣时机**：订单 confirm 时算（同 settlement）还是 paid 时算（更早入账）？
   - **推荐**：confirm 时（符合"完成实物交易"语义）

## 十、下一步

- 用户审完此文档后回复 OK
- 主控开 iter-35（架构地基），按本文 §4 拆分推进
- 每轮收口都对照本文检查是否偏离规划
- 5 轮做完后，本文档归档到 `outputs/architecture/multi-store-final.md`
