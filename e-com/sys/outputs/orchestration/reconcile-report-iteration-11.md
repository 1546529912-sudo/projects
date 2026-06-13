# reconcile-report-iteration-11.md · WMS 后台 CRUD 写操作

## 【当前焦点】
代码全量交付：WMS 仓库 / 库位 / 入库的 13 个写 API + 3 个 Vue 页面（其中 2 个重写、1 个新建）+ 1 个 layout 菜单项。等用户跑迁移 + 重启容器 + Vue 验证。

## 一、文件清单（共 13 个新增/修改 + 2 个改 layout/router）

### Wave A · WMS 后端写（6 文件）
| 类型 | 文件 |
|---|---|
| migration 新 | `wms-backend/database/migrations/20260528000001_create_inbound_orders.php` |
| migration 新 | `wms-backend/database/migrations/20260528000002_create_inbound_items.php` |
| controller 改 | `wms-backend/app/controller/Warehouse.php`（+ 4 方法 + ok/err 私有）|
| controller 改 | `wms-backend/app/controller/Location.php`（+ 5 方法含批量）|
| controller 新 | `wms-backend/app/controller/Inbound.php`（5 方法 + 推 wms.inventory.changed 事件）|
| route 改 | `wms-backend/route/app.php`（+12 路由，参数路由放 plain 之前防 iter-10 路由错位重演）|

### Wave B · Vue WMS 写（5 + 2 文件）
| 类型 | 文件 |
|---|---|
| api 改 | `shop-admin/src/apis/wms.ts`（+14 接口）|
| page 改 | `shop-admin/src/pages/wms/Warehouses.vue`（CRUD dialog）|
| page 改 | `shop-admin/src/pages/wms/Locations.vue`（CRUD + 仓库筛选 + 批量生成 dialog）|
| page 新 | `shop-admin/src/pages/wms/Inbound.vue`（列表 + 筛选 + 分页 + 创建/详情 dialog + 一键完成/取消按钮）|
| router 改 | `shop-admin/src/router/index.ts`（+ /wms/inbound）|
| layout 改 | `shop-admin/src/components/AdminLayout.vue`（菜单加"入库管理"）|

### Wave C · 文档（3）
- iteration-11-runbook.md
- reconcile-report-iteration-11.md（本文件）
- progress.md（更新）

合计代码量：~1000 行（PHP +500 / Vue +400 / TS +50 / config +50）。

## 二、本轮主动避坑（吸取 iter-3/5/9/10 经验）

| 风险 | 提前规避 |
|---|---|
| TP8 路由顺序：plain POST 吃掉 :id 路由（iter-10 fix-2） | route 文件全部参数路由放 plain 之前 |
| 类型 :id pattern 需 `[\w\-\.]+` 允许连字符（iter-3 fix） | `<code>` / `<inboundNo>` 全用 `[\w\-\.]+` 或 `[\w\-]+` |
| Idempotency-Key 不从 header 读到 nginx 透传（iter-5 fix） | Inbound::create 从 header 读取 + fallback `$_SERVER['HTTP_IDEMPOTENCY_KEY']` |
| 一键完成事件失败影响主流程 | 事件 publish try/catch 包；失败仅记录 event_error 字段不回滚 |
| WMS 入库的 staging 库位不存在 | seed 已建 STAGING-01；create 时 controller 主动检查并报清晰错误 |
| 删除仓库导致出库/入库挂掉 | delete 前查 location/outbound/inbound count 3 类引用 |
| 库位批量生成失控 | 单次 ≤ 500 + 笛卡尔积公式 |
| 入库后 OMS available 没同步 | 推了事件但 OMS consumer 未订阅 — runbook 明确说明 M3 补 |

## 三、剩余非阻塞事项（M3+）

| 编号 | 事项 | 处理 |
|---|---|---|
| Q11-01 | OMS 订阅 `wms.inventory.changed` 后增加 available | M3：新增 OMS handler + consumer:wms-inv |
| Q11-02 | PDA 扫码逐条收货 + 差异审批 | M3+ |
| Q11-03 | WMS products 表 CRUD（通过 pim.sku.changed 同步）| M3：PIM 推 + WMS 订阅 |
| Q11-04 | 上架推荐 Top3 + 移库 | M3 |
| Q11-05 | 实时盘点 / 调拨 | M3 |
| Q11-06 | 仓库/库位多角色权限（仓管/管理员）| M3 |

## 四、待用户运行验证

### 命令
```bash
cd apps/

# 1. WMS 跑新 migration
docker-compose exec wms-backend php think migrate:run
# 期望: 2 行 migrated（CreateInboundOrders + CreateInboundItems）

# 2. WMS 重启（controller + route 改了）
docker-compose restart wms-backend

# 3. Vue dev 重启（router/layout 改了）
cd shop-admin && npm run dev
```

### 验证清单（6 步）
| # | 操作 | 期望 |
|---|---|---|
| 1 | curl 创建 WH-TEST 仓库 + 列表显示 | code=0 |
| 2 | Vue 后台 WMS/仓库管理 → 新增/编辑/删除 | 列表实时更新 |
| 3 | WMS/库位管理 → 批量生成 5×4=20 个 → 列表 +20 行 | created=20 |
| 4 | WMS/入库管理 → 新建入库单 SPU001-001 +100 → 点"一键完成" | 状态 received + toast event_published ✓ |
| 5 | WMS/实物库存 → SPU001-001 quantity +100 | qty 比之前多 100 |
| 6 | （观察）OMS/库存四态 → 该 SKU available 不会自动 +100 | M3 待补 OMS consumer |

## 五、对账结论

✅ **代码全量交付**：13 个文件，3 个 Wave 全部按 iteration-11-runbook 完成。
⏳ **运行时验证**：等待用户执行 migrate + restart + 浏览器跑 6 步清单。
🔄 **预期返工**：可能 1-2 项小修，常见的是 nginx mount /tmp upload 类边缘问题；本轮已主动规避 iter-10 路由顺序问题。

## 六、对账时间
2026-05-28

## 七、本对账使用的 skill
- `karpathy-guidelines`（不引入 PDA 扫码框架；一键完成替代多步流程；ImageUpload 在 iter-10 已抽象，本轮无新组件需求）
