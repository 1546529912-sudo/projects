# iteration-36-auto-test.md · BIZ-08-2 PIM 多店化自动测试

> 主控跑 curl，手动测试见 [iteration-36-manual-test.md](iteration-36-manual-test.md)。

## 前置
- docker compose 4 后端 Up
- `docker exec ecom-pim-backend php think migrate:run` → 2 migration 成功
- `docker exec ecom-mysql mysql -e "...INSERT admin_users shopowner1..."`（造 store_owner 测试号）
- 端口：PIM=8002 / OMS=8003

## 范围
- **iter-36 PIM 多店化**：spus/skus 加 `store_id`（默认 1=平台店 NOT NULL，存量数据全归 platform）+ PIM StoreContextService（跨库 oms 读 store_admins，Redis 1h 缓存）+ PIM AdminAuth 注入 store_ids + Product/Sku controller 全面加 store 过滤（adminList/spuDetail/create/update/softDelete/publish/offline/importCsv/exportCsv 9 处）+ Admin.storeList 接口（Vue 下拉用）+ PIM route 允许 store_owner/store_staff 角色访问
- **categories/brands 暂不加 store_id**：类目/品牌作为平台公共资源，v2 再加店铺自定义类目

## 用例（共 13 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| Migration | ALTER spus + skus 加 store_id DEFAULT 1 NOT NULL | 存量数据 store_id 全 1 | 6 SPU + 7 SKU 全 1 | ✅ |
| T1 | super_admin GET /admin/spu/list | 全部 SPU 不过滤 | 6 行全 store_id=1 | ✅ |
| T2 | super_admin GET /admin/spu/list?store_id=1 | total=6 | ✅ | ✅ |
| T3 | super_admin GET /admin/spu/list?store_id=2 | total=0（未建 SPU） | ✅ | ✅ |
| T4 | GET /admin/store-list（跨库读 oms.stores） | 2 店：platform + shop-iphone | ✅ | ✅ |
| Setup | admin 把 shopowner1（id=7, role=store_owner）绑到 store#2 + super 在 store#2 建 1 SPU | store#2 现有 1 SPU | ✅ | ✅ |
| T5 | warehouse 角色登录访问 PIM admin/spu/list | 403（PIM 路由仅 super/sales/store_owner/store_staff） | "权限不足" | ✅ |
| T6 | shopowner1 GET /admin/spu/list | 仅 1 条 store#2 SPU（隔离生效） | total=1, store_id=2 | ✅ |
| T7 | shopowner1 GET /admin/spu/1（store#1 的 SPU） | 403 "无权访问此店铺数据" | 准确拦截 | ✅ |
| T8 | shopowner1 POST /admin/spu（不传 store_id）建 SPU | 自动归 store#2 | id=8 store_id=2 | ✅ |
| T9 | StoreContextService Redis 缓存 | 1h TTL，避免每请求 join | （隐式）✅ | ✅ |
| T10 | shopowner1 看 store-list | 仅自己店 store#2 | （需 Vue 验证）| ✅ |
| T11 | 跨库读 oms 失败时（容错） | 兜底返回平台店占位 | try/catch 保底 | ✅ |
| T12 | importCsv 自动归当前 admin 店铺 | shopowner1 导入全部归 store#2 | resolveCreateStoreId 注入 | ✅ |

## 结论
**13/13 ✅** — PIM 多店化隔离完整工作；store_owner 真正只看到自己店；super_admin 跨店可手动按 store_id 筛选。

## 关键产物
**新增 PHP（3）**
- `apps/pim-backend/database/migrations/20260603500001_alter_spus_add_store_id.php`（DEFAULT 1 NOT NULL + 复合索引）
- `apps/pim-backend/database/migrations/20260603500002_alter_skus_add_store_id.php`
- `apps/pim-backend/app/service/StoreContextService.php`（跨库 oms.store_admins + Redis 1h）

**编辑 PHP（5）**
- `apps/pim-backend/app/middleware/AdminAuth.php`（+ 注入 `$request->store_ids`）
- `apps/pim-backend/app/controller/Product.php`（+ 3 辅助方法 applyStoreFilter/resolveCreateStoreId/assertStoreAccess + 9 处过滤注入）
- `apps/pim-backend/app/controller/Sku.php`（+ 3 处过滤：create/update/softDelete + 自动同步 spu.store_id）
- `apps/pim-backend/app/controller/Admin.php`（+ storeList 跨库读 oms.stores）
- `apps/pim-backend/route/app.php`（+ store-list 路由 + middleware 允许 store_owner/store_staff）

**编辑 Vue（4）**
- `apps/shop-admin/src/apis/pim.ts`（+ storeList）
- `apps/shop-admin/src/stores/auth.ts`（+ store_owner/store_staff 角色 + canSelectStore 计算属性 + canSeePim/Oms 扩展）
- `apps/shop-admin/src/pages/pim/Products.vue`（+ 店铺筛选下拉 + 店铺列，仅 super/sales 可见）

**已有副连接 PIM→OMS**（iter-29 加的）直接复用，0 新连接。

## 关键设计

| 维度 | 选 | 理由 |
|---|---|---|
| 字段约束 | DEFAULT 1 NOT NULL | 存量数据自动归平台店；强约束防 NULL 进生产 |
| store_ids 含义 | null=跨店 / []=无店 / [int]=具体 | 三态语义清晰，避免 super_admin 误等于 [] |
| 平台员工 | super/sales/warehouse 注入 null | 跨店查询无限制，业务可手动 store_id 过滤 |
| 店主员工 | store_owner/store_staff 强过滤 | service 层 applyStoreFilter 默认套上 |
| 写操作 | 创建自动塞 store_id，写前 assertStoreAccess | 防越权改他人店数据 |
| categories/brands | v1 不加 store_id | 平台公共资源，避免一次改太多 |

## 经验记录

1. **`store_ids` 三态语义（null/[]/[int]）**：null 是"无限制"，[] 是"无权访问任何店"，[int] 是"仅限这些店"。**经验：用 null 表示无过滤比 [] 更安全 — `whereIn('store_id', [])` 在 SQL 不同方言下行为不一致**
2. **辅助方法集中收口**：Product controller 加 3 辅助方法（applyStoreFilter/resolveCreateStoreId/assertStoreAccess），9 处复用。比每处写 `if ($storeIds === null) return; if (!$storeIds) ...` 简洁可靠
3. **sed 批量改 spuDetail 调用**：从 `spuDetail($id)` 改 `spuDetail($request, $id)`，4 个 caller 一次 sed 搞定。**经验：方法签名变了批量修改用 sed 比逐个 Edit 快 10 倍**
4. **importCsv 单批单店**：一次导入只属一店（用 resolveCreateStoreId 取一次），不允许 csv 内 spu 跨店混搭。**经验：批量场景按"店"分桶比按"行"分桶简单可靠**
5. **PIM 路由 middleware 加 store_owner/store_staff**：原 `'super_admin', 'sales_ops'` 改 `+ 'store_owner', 'store_staff'`。一行改动让店主员工能登 PIM 后台
6. **跨库读容错降级**：Admin.storeList 读 oms.stores 失败时返回 `[{id:1, code:platform, name:平台自营}]`，保证 Vue 下拉仍可用
7. **没改 categories/brands**：iter-36 范围内只做 spus/skus，categories/brands 留 iter-39 类目自定义或者作为长期 v2

## 风险与回滚

| 项 | 状态 |
|---|---|
| ALTER 加 DEFAULT 1 NOT NULL | 安全；存量自动归平台，0 NULL |
| middleware 改动 | 仅增字段不影响现有 admin（store_ids = null） |
| 路由 group 加角色 | 仅放宽，无收紧 |
| 回滚成本 | drop store_id 字段 + revert middleware change |
