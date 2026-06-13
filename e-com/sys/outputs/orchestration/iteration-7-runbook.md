# iteration-7-runbook.md · Phase 2 P4 Vue 后台管理界面

## 【当前焦点】
基于 iteration-6 已跑通的完整业务链路，把 shop-admin 从单页（商品列表 mock）扩展成"运营可用"的多模块后台：
- **Dashboard**：4 后端健康 + 订单 KPI
- **PIM**：商品/类目/品牌列表 + 详情查看（只读）
- **OMS**：订单管理（列表+详情+状态机展示）+ 库存四态查看
- **WMS**：出库单列表+详情（含 auto-complete 按钮）+ 实物库存

## 不在本轮范围（M2+）
- PIM CRUD 写操作（类目/品牌/SPU/SKU 编辑/上下架）→ 后台读已足够运营查看
- 入库流程界面
- WMS 用户/角色/权限
- 数据导出 / 报表 / 图表
- 商品图片上传
- 多语言

## 本轮范围

### Wave A · 后端补读接口（约 6 文件）

| 任务 | 内容 | 输出 |
|---|---|---|
| BE-PIM-001 | PIM 加 `GET /api/v1/category/list` `GET /api/v1/brand/list` | pim Category.php + Brand.php controller + route |
| BE-OMS-001 | OMS 加 `GET /api/v1/admin/order/list`（不限 user_id）+ 简单 KPI `GET /api/v1/admin/stats` | oms Admin.php controller + route |
| BE-WMS-001 | WMS 加 `GET /api/v1/warehouse/list` `GET /api/v1/location/list` `GET /api/v1/inventory/list`（含 sku 筛选）| wms Warehouse.php + Location.php + Inventory.php controller + route |

### Wave B · Vue 架构改造（共 6 文件）

| 任务 | 内容 | 输出 |
|---|---|---|
| FE-CFG-001 | vite.config.ts: proxy 改 `/api/shop`→8001, `/api/pim`→8002, `/api/oms`→8003, `/api/wms`→8004 + `/health/*` | vite.config.ts |
| FE-API-001 | apis 拆模块：apis/shop.ts / pim.ts / oms.ts / wms.ts + apis/http.ts（共用 axios 实例 + 拦截）| 5 文件 |
| FE-STORE-001 | pinia store：auth.ts（token / user / logout）| stores/auth.ts |
| FE-LAYOUT-001 | AdminLayout.vue（顶栏：品牌 + 4 后端健康 tag + 退出；侧栏：5 大类菜单；主区：router-view）| components/AdminLayout.vue |
| FE-ROUTER-001 | router/index.ts：login 独立路由 + 主路由用 AdminLayout 嵌套 | router/index.ts |
| FE-COMMON-001 | components/StatusTag.vue 复用订单/出库状态 tag | components/StatusTag.vue |

### Wave C · 业务页面（约 14 文件）

| 任务 | 页面 | 路由 | 说明 |
|---|---|---|---|
| FE-DASH-001 | Dashboard | `/dashboard` | 4 后端 health + 总订单数 + 总销售额 + 各状态分布 |
| FE-PIM-001 | 商品列表 | `/pim/products` | 已有 Index.vue 升级到新 layout |
| FE-PIM-002 | 商品详情 | `/pim/products/:sku` | SPU 详情 + SKU 列表 + 富文本 |
| FE-PIM-003 | 类目 | `/pim/categories` | 类目树/列表 |
| FE-PIM-004 | 品牌 | `/pim/brands` | 品牌列表 |
| FE-OMS-001 | 订单列表 | `/oms/orders` | 按状态过滤 + 分页 + 跳详情 |
| FE-OMS-002 | 订单详情 | `/oms/orders/:no` | 订单 + items + status_log 时间线 + 取消按钮 |
| FE-OMS-003 | 库存四态 | `/oms/inventory` | 5 SKU 当前 available/locked |
| FE-WMS-001 | 出库单列表 | `/wms/outbound` | 状态 + 关联订单号 + 跳详情 |
| FE-WMS-002 | 出库单详情 | `/wms/outbound/:no` | 出库单 + items + tasks + auto-complete 按钮 |
| FE-WMS-003 | 实物库存 | `/wms/inventory` | 按 SKU+库位查看实物 |
| FE-WMS-004 | 库位列表 | `/wms/locations` | 1 仓 5 库位 |
| FE-WMS-005 | 仓库列表 | `/wms/warehouses` | 1 仓信息 |
| FE-LOGIN-001 | 登录页升级 | `/login` | 接 shop-backend `/api/v1/user/login`（复用商城手机号+验证码）or 保持 mock |

约 **26 个新增/修改文件**。

## 关键技术决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 登录方式 | 暂保持 mock `admin/admin123`（M2 改正式后台用户表）| 不阻塞主线；后台账号体系需要独立设计 |
| 数据写入 | 本轮**只读** | 后端 CRUD 接口未全建；后台只读已满足"运营看链路"用途 |
| 跨后端调用 | 前端通过 vite proxy 区分（`/api/oms/*` 等）| Element Plus 后端无差异，前端按 base 区分 |
| 路由守卫 | 仅校验 localStorage 有 token | M2 加 401 401 自动跳登录 |
| layout | Element Plus el-container + el-aside + el-main | 标准模板 |
| 数据刷新 | 列表页加"刷新"按钮 + 自动加载；详情页 onMounted | 不做 polling |
| 状态机展示 | 显式状态时间线（created_at→paid_at→shipped_at→completed_at）| 一目了然 |

## 用户运行验证

```bash
# 1. 重启 PHP 后端（route 新接口）
cd apps/
docker-compose restart pim-backend oms-backend wms-backend

# 2. 后端补充接口验证（4 条）
curl -s http://localhost:8002/api/v1/category/list | python3 -m json.tool
curl -s http://localhost:8002/api/v1/brand/list | python3 -m json.tool
curl -s http://localhost:8003/api/v1/admin/order/list | python3 -m json.tool
curl -s http://localhost:8004/api/v1/inventory/list | python3 -m json.tool

# 3. 启动前端
cd shop-admin/
npm install  # 如有新依赖
npm run dev

# 4. 浏览器访问 http://localhost:5173
# 5. 登录（admin / admin123）
# 6. 走过这些菜单：
#    - Dashboard：看 4 后端 tag + KPI
#    - PIM > 商品 / 类目 / 品牌（看 seed 数据）
#    - OMS > 订单（看 iteration-6 留下的 6 单：3 paid + 1 cancelled + 1 shipped + 1 completed）
#    - OMS > 库存四态（看 5 SKU available/locked）
#    - WMS > 出库单（看几条 outbound）+ 点 auto-complete 按钮（实际功能：对状态=allocated 的单可触发）
#    - WMS > 实物库存（看 5 SKU 实物分布）
```

## 升级与阻塞
（本轮无升级到用户决策的事项）

## 对账触发
本 runbook + 3 个 Wave 全部代码就绪后，生成 [reconcile-report-iteration-7.md](reconcile-report-iteration-7.md)。运行时验证由用户在浏览器跑完 6 个菜单后回填到 progress.md。
