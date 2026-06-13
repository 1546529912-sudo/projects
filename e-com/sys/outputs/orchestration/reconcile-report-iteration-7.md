# reconcile-report-iteration-7.md · 主控对账（Phase 2 P4 Vue 后台管理界面）

## 【当前焦点】
Phase 2 P4 Vue 后台管理界面 ✅ **代码全量交付 + 用户实测通过（2026-05-26）**。
13 个业务页面 + 顶栏 4 后端 tag + OMS 订单状态机时间线 + WMS 一键完成发货 全部跑通。修了 1 项前端运行时坑（详见 §九）。

## 对账原则
本轮代码完成度对账（前端不可像 PHP 那样独立 curl 验证，需要浏览器打开 Element Plus UI 实地点）。运行时由用户跑通后回填到 progress.md。

---

## 一、文件交付清单（28 文件）

### Wave A · 后端补读接口（8 文件）

| 类型 | 文件 |
|---|---|
| pim controller | `app/controller/Category.php` GET /category/list |
| pim controller | `app/controller/Brand.php` GET /brand/list |
| pim route | `route/app.php`（+2 端点）|
| oms controller | `app/controller/Admin.php` orderList / orderDetail / stats / inventoryList |
| oms route | `route/app.php`（+4 端点）|
| wms controller | `app/controller/Warehouse.php` |
| wms controller | `app/controller/Location.php`（含 warehouse_code 过滤）|
| wms controller | `app/controller/Inventory.php`（含 sku_code 过滤）|
| wms route | `route/app.php`（+3 端点）|

### Wave B · Vue 架构改造（6 文件）

| 类型 | 文件 |
|---|---|
| 配置 | `vite.config.ts`：proxy 改 `/api/{shop\|pim\|oms\|wms}` 分流 + `/health/*` |
| API 层 | `src/apis/http.ts` axios 实例 + 拦截 |
| API 层 | `src/apis/shop.ts` |
| API 层 | `src/apis/pim.ts` |
| API 层 | `src/apis/oms.ts` |
| API 层 | `src/apis/wms.ts` |
| API 层 | `src/apis/index.ts` 改为聚合 re-export |
| store | `src/stores/auth.ts` Pinia 用户态 |
| 布局 | `src/components/AdminLayout.vue` 顶栏 4 后端 tag + 侧栏菜单 + el-container |
| 组件 | `src/components/StatusTag.vue` 状态枚举映射（OMS/WMS/通用）|
| 路由 | `src/router/index.ts` 嵌套 + beforeEach 鉴权 |

### Wave C · 业务页面（14 文件）

| 模块 | 文件 |
|---|---|
| 共用 | `src/pages/Dashboard.vue` KPI + 状态分布 |
| 共用 | `src/pages/Login.vue` 更新 → push /dashboard |
| PIM | `src/pages/pim/Products.vue` |
| PIM | `src/pages/pim/ProductDetail.vue` SPU+SKU+卖点+富文本 |
| PIM | `src/pages/pim/Categories.vue` |
| PIM | `src/pages/pim/Brands.vue` |
| OMS | `src/pages/oms/Orders.vue` 含状态过滤+分页 |
| OMS | `src/pages/oms/OrderDetail.vue` 含状态机时间线 + status_log 表 |
| OMS | `src/pages/oms/Inventory.vue` 含有效可售计算 + 低库存高亮 |
| WMS | `src/pages/wms/Outbound.vue` |
| WMS | `src/pages/wms/OutboundDetail.vue` 含一键完成按钮（状态=allocated 才显示）|
| WMS | `src/pages/wms/Inventory.vue` 含 sku 过滤 |
| WMS | `src/pages/wms/Locations.vue` |
| WMS | `src/pages/wms/Warehouses.vue` |
| 清理 | 删除旧 `src/pages/products/Index.vue`（被 Products.vue 取代）|

合计**新增 25 + 修改 3 = 28 个文件**。

---

## 二、菜单结构

```
总览 (/dashboard)
├─ PIM 商品中心
│  ├─ 商品 (SPU)        → /pim/products
│  │  └─ 商品详情      → /pim/products/:sku
│  ├─ 类目              → /pim/categories
│  └─ 品牌              → /pim/brands
├─ OMS 订单中心
│  ├─ 订单              → /oms/orders
│  │  └─ 订单详情      → /oms/orders/:no
│  └─ 库存四态          → /oms/inventory
└─ WMS 仓储中心
   ├─ 出库单            → /wms/outbound
   │  └─ 出库详情      → /wms/outbound/:no  （一键完成按钮）
   ├─ 实物库存          → /wms/inventory
   ├─ 库位              → /wms/locations
   └─ 仓库              → /wms/warehouses
```

## 三、关键交互能力

| 能力 | 实现位置 |
|---|---|
| 4 后端健康实时显示 | AdminLayout.vue 顶栏 4 个 el-tag + 刷新按钮 |
| 订单状态机可视化 | OrderDetail.vue el-timeline + status_log 表 |
| WMS 一键完成发货 | OutboundDetail.vue 状态=allocated 时显示按钮 → 调 wmsApi.autoComplete → 自动刷新 |
| 跨服务 KPI | Dashboard.vue 调 OMS stats（订单+销售额+SKU+锁定）|
| 按状态过滤订单 | Orders.vue el-select + 分页 |
| 自动跳登录页 | router beforeEach + http 拦截 401 |

## 四、关键技术决策（按 runbook §"关键技术决策" 落地）

| 决策 | 落地 |
|---|---|
| 登录保持 mock admin/admin123 | Login.vue 不变；仅修复 redirect 到 /dashboard |
| 本轮只读 | 没有任何 POST/PUT/DELETE 接口（除 WMS auto-complete 已是动作类）|
| 跨后端 proxy 分流 | `/api/shop`→8001 / `/api/pim`→8002 / `/api/oms`→8003 / `/api/wms`→8004 |
| 路由守卫 | beforeEach 仅查 localStorage.admin_token |
| 状态机展示 | el-timeline 节点用条件渲染（created_at / paid_at / shipped_at / completed_at / cancelled_at）|
| 数据刷新 | 列表页"刷新"按钮 + onMounted；不做 polling |

## 五、用户运行验证

```bash
# 1. 重启 3 个 PHP 后端（route 加了 8 个新端点）
cd apps/
docker-compose restart pim-backend oms-backend wms-backend

# 2. 后端接口快速验证（8 条）
curl -s http://localhost:8002/api/v1/category/list  | python3 -m json.tool | head
curl -s http://localhost:8002/api/v1/brand/list     | python3 -m json.tool | head
curl -s http://localhost:8003/api/v1/admin/stats    | python3 -m json.tool
curl -s http://localhost:8003/api/v1/admin/order/list  | python3 -m json.tool | head -20
curl -s http://localhost:8003/api/v1/admin/inventory/list | python3 -m json.tool | head
curl -s http://localhost:8004/api/v1/warehouse/list | python3 -m json.tool | head
curl -s http://localhost:8004/api/v1/location/list  | python3 -m json.tool | head
curl -s http://localhost:8004/api/v1/inventory/list | python3 -m json.tool | head

# 3. 启动前端（如果之前没起过先 npm install）
cd shop-admin/
npm install   # 无新增依赖，应该秒过
npm run dev   # 监听 5173

# 4. 浏览器访问 http://localhost:5173
#    登录：admin / admin123
#    走过 13 个页面 + 顶栏 4 后端 tag + 一键完成发货按钮（找一条 status=allocated 的）
```

## 六、可能的运行时坑预判

| 风险点 | 预防 |
|---|---|
| vite proxy rewrite 不命中 → 后端 404 | 用 `path: '/api/v1/...'` 标准形式，前端不在 path 中传 v1 |
| TS verbatimModuleSyntax 报错 import type | router 已用 `import type` |
| Element Plus 自动导入丢失 | unplugin-vue-components 已配置，但若有报错把 auto-imports.d.ts 删了重启 dev |
| Element Plus el-sub-menu 默认折叠 | 浏览器测试时要展开才能看到 PIM/OMS/WMS 子菜单 |
| 旧 admin_token mock JWT 长度不足 32 字节 → 后端 JWT 解析失败 | 后台目前不调任何需鉴权后端接口（admin/order/list 等都未加 Auth 中间件）→ 不会触发 |
| iteration-6 的数据：当前 OMS 已有 6+ 单（test/cancel/shipped/completed 各种状态）| Dashboard / Orders 页应该能直接看到 |
| auto-complete 按钮：之前的订单都是 shipped/completed 了 | 用户如果想试，需要新下一单 + 走 mock 支付 → outbound 进入 allocated 状态 |

## 七、剩余非阻塞事项（M2+）

| 编号 | 事项 | 处理 |
|---|---|---|
| Q7-01 | PIM CRUD 写操作（类目/品牌/SPU/SKU 编辑+发布+下架）| M2 后端补 controller + 前端表单 |
| Q7-02 | 后台用户体系（取代 admin/admin123 mock）| M2 设计独立 admin_users 表 |
| Q7-03 | 数据导出 / 报表 / 图表（ECharts）| M2 |
| Q7-04 | 入库流程界面 | M2 |
| Q7-05 | 401 拦截后想跳回上一页 | M2 加 redirect query |
| Q7-06 | 商品图片上传 | M3 |
| Q7-07 | 多角色权限（数据权限按仓 / 按品牌）| M3 |

## 八、对账结论

✅ **代码全量交付 + 用户实测通过**：28 文件，3 个 Wave。
- 后端 8 个新读接口正常返回
- 前端 13 个业务页面 + Layout + 4 后端 tag 全过
- WMS 一键完成发货按钮端到端测试通过：新订单 → mock 支付 → WMS 出库单进 allocated → 后台点按钮 → 状态推进到 shipped + OMS 订单同步 shipped + 时间线更新

## 九、本轮运行时坑（1 项，与 router 同类型）

| # | 问题 | 根因 | 修复 |
|---|---|---|---|
| 1 | 登录后页面不跳转，DevTools Console 报 `does not provide an export named 'AxiosInstance'` | TypeScript `verbatimModuleSyntax` 启用时，类型导入必须用 `import type`。`src/apis/http.ts` 用 `import axios, { AxiosInstance, AxiosRequestConfig }` 把 type 当 value 导出，Vite 拒绝 | 拆成 `import axios from 'axios'` + `import type { AxiosInstance, AxiosRequestConfig } from 'axios'`（同 iteration-7 内部修过 router 的 `RouteRecordRaw`）|

## 十、用户实测证据

| Task ID | 验证项 | 实测结果 |
|---|---|---|
| P2-ADM-001 | 后端 8 个新读接口正常返回 | ✅ |
| P2-ADM-002 | npm run dev 启动 + 浏览器登录 admin/admin123 | ✅（修 AxiosInstance 类型导入后通过）|
| P2-ADM-003 | 顶栏 4 后端 tag 全部 ok | ✅ |
| P2-ADM-004 | Dashboard 显示订单 KPI | ✅ |
| P2-ADM-005 | PIM/OMS/WMS 12 个二级页面都能加载数据 | ✅ |
| P2-ADM-006 | 新订单 → WMS 出库单 allocated → "一键完成"按钮 → 状态推进 + OMS 同步 | ✅ |

## 十一、对账时间
2026-05-26

## 十二、本对账使用的 skill
- `karpathy-guidelines`（StatusTag 用 const 映射表而不是状态模式；OMS Admin 单 controller 多方法而非按 resource 拆 4 个 controller；不做无效抽象层）
- `web-design-guidelines`（顶栏 + 侧栏 + 主区 = 标准 Element Plus 三件套；信息密度优先，运营查看可用）
