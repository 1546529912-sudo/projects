# iteration-29-auto-test.md · PIM 完整化 P1+P2 自动测试

> 主控跑 curl，手动测试见 [iteration-29-manual-test.md](iteration-29-manual-test.md)。
> 遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §拆 auto / manual 边界。

## 前置
- `docker compose ps` 4 后端全 Up
- `docker exec ecom-pim-backend php think migrate:run` → 2 migration 成功
- 端口：PIM=8002 · OMS=8003（登录借 OMS 颁 JWT）

## 范围
- **P1-a** Admin Audit Log（pim_admin_audit_log）：SPU/SKU/Brand/Category 14 个 action 自动写入
- **P1-b** SPU 状态机轨迹（spu_status_log）：create/publish/offline/delete 4 个状态变化
- **P2** PIM Dashboard（/admin/stats）：6 KPI + TOP10 SPU 销量（跨库 OMS） + 改价时间序列 + 上下架曲线 + 低库存清单（跨库 WMS）

## 用例（共 13 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | `GET /admin/stats?days=7` （admin token） | code=0；kpi 6 字段齐；top_spus 跨库读 OMS order_items | `total_spu=5 published_spu=5 ... top_spus=3 条（含 iPhone 销售额 19998 元）` | ✅ |
| T2 | `PUT /admin/brand/1 {"name":"Apple Inc."}` | code=0；audit-log 应记 1 条 brand.update | name 由"苹果"改为"Apple Inc." | ✅ |
| T3 | `GET /admin/audit-log?action=brand.update&size=3` | total≥1；before.name=苹果 / after.name=Apple Inc. | total=1 + before/after 正确 | ✅ |
| T4 | `POST /admin/spu/1/offline` | code=0；状态切到 offline | spuDetail 返回 status=offline | ✅ |
| T5 | `GET /admin/spu/1/status-log` | list 含 1 条 published→offline | from=published to=offline operator=admin | ✅ |
| T6 | `POST /admin/spu/1/publish` | 重新发布 | status=published | ✅ |
| T7 | 再查 status-log | 2 条轨迹（最新 offline→published） | total=2，倒序排列 | ✅ |
| T8 | sales/sales123 → `GET /admin/audit-log` | code=0（PIM 都开给 super+sales） | 正常返回 | ✅ |
| T9 | warehouse/wh123 → `GET /admin/audit-log` | 403 | "权限不足，需要角色: super_admin/sales_ops" | ✅ |
| T10 | 无 token → `GET /admin/stats` | 401 | "缺少 Bearer token" | ✅ |
| T11 | `GET /admin/audit-log?target_type=brand` | 只回 brand 相关记录 | 1 条 brand.update | ✅ |
| T12 | `GET /admin/audit-log?operator=admin` | 只回 admin 操作 | total=2（含 spu.offline / spu.publish） | ✅ |
| T13 | `GET /admin/stats?days=30` | low_stock 列表非空（跨库 WMS） | `[{"spu_id":4,"name":"test","avail":0}]` | ✅ |

## 结论
**13/13 ✅** — PIM iter-29 后端三件套（Audit Log + SPU 状态机 + Dashboard 跨库聚合）全通过。

## 关键产物
**新增 PHP（5）**
- `apps/pim-backend/database/migrations/20260603000001_create_pim_admin_audit_log.php`
- `apps/pim-backend/database/migrations/20260603000002_create_spu_status_log.php`
- `apps/pim-backend/app/service/AuditService.php`
- `apps/pim-backend/app/service/SpuStatusLogService.php`
- `apps/pim-backend/app/controller/Admin.php`（auditLog / spuStatusLog / stats 三接口）

**编辑 PHP（6）**
- `apps/pim-backend/config/database.php`（+ oms / wms 副连接）
- `apps/pim-backend/route/app.php`（+ 3 路由）
- `apps/pim-backend/app/controller/Product.php`（注入 5 处 audit + 3 处 statusLog）
- `apps/pim-backend/app/controller/Sku.php`（注入 3 处 audit）
- `apps/pim-backend/app/controller/Brand.php`（注入 3 处 audit）
- `apps/pim-backend/app/controller/Category.php`（注入 4 处 audit）

**新增 Vue（2）**
- `apps/shop-admin/src/pages/pim/Dashboard.vue`
- `apps/shop-admin/src/pages/pim/AuditLog.vue`

**编辑 Vue（3）**
- `apps/shop-admin/src/apis/pim.ts`（+ adminStats / auditLogList / spuStatusLog）
- `apps/shop-admin/src/router/index.ts`（+ 2 路由）
- `apps/shop-admin/src/components/AdminLayout.vue`（PIM 子菜单 + 2 项）

**架构演进**
- 副连接方向 +1：**PIM→OMS / PIM→WMS**（PIM 视角销售热度 + 库存覆盖）
- 跨库副连接累计 **5 个方向**：shop→oms / oms→shop / wms→oms / oms→wms / **PIM→OMS+WMS**

## 经验记录
1. **PIM 副连接首例**：iter-19~26 跨库都是 shop/oms/wms 三方互连，PIM 一直独立。iter-29 PIM Dashboard 需要"销售热度 × 库存覆盖"双视角，必须跨库读 OMS / WMS。沿用 `Db::connect('oms')->name('order_items')` 模式，0 RPC。
2. **JWT payload 字段差**：AuditService 第一版用 `$req->admin['sub']` 拿到的是 user_id（数字），写入 audit-log 里 operator="1" 难辨。改成 `$req->admin['username'] ?? $req->admin['sub']`，operator 显示 admin。
3. **路由顺序冲突**：`admin/spu/<id>/status-log` 必须放在 `admin/spu/<id>` 之前，否则 spuDetail 会贪婪匹配。已和 publish/offline 一起放在 `spu/<id>` 前。
4. **审计不阻塞业务**：AuditService 全包 try/catch + error_log，确保 audit 表故障不影响业务写。对齐 OMS iter-15 设计。
5. **跨库读容错**：Admin.stats() 中 OMS / WMS 副连接读取都套 try/catch，断库时返回空数组而非 500，保证 Dashboard 仍可用。
