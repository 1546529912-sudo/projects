# iteration-10-runbook.md · 后台 CRUD 写操作

## 【当前焦点】
让 Vue 后台从只读升级到可写：运营在浏览器里能增删改 PIM 类目/品牌/SPU/SKU、上传图片、调整 OMS 库存、强制取消订单、恢复异常订单。

## 不在范围（M3+）
- WMS 仓库/库位/入库 CRUD（先用 seed 数据 + DB 直改）
- shop 用户管理（低频）
- 富文本编辑器 wangeditor（用 `<textarea>` 填 HTML 占位）
- 多角色 admin 鉴权 middleware（暂用现有 JWT，任何登录用户都是 admin）
- 软删恢复 / 操作日志审计（M3）

## Wave 拆分（共 19 文件，含 1 个 d.ts 修复）

### Wave A · PIM 后端写 API（5 文件）

| 文件 | 变更 |
|---|---|
| `apps/pim-backend/app/controller/Category.php` | + detail / create / update / softDelete / reorder（含子类目和 SPU 引用保护） |
| `apps/pim-backend/app/controller/Brand.php` | + detail / create / update / softDelete（SPU 引用保护） |
| `apps/pim-backend/app/controller/Product.php` | + adminList / spuDetail / create / update / softDelete / publish / offline |
| `apps/pim-backend/app/controller/Sku.php` | + create / update / softDelete |
| `apps/pim-backend/app/controller/Upload.php` | 新建：POST /admin/upload/image，落盘到 runtime/uploads/{ymd}/{uuid}.{ext}，≤5MB，只允许 jpg/png/gif/webp |
| `apps/pim-backend/route/app.php` | 注册全部 admin/* 写路由 + admin/upload/image |
| `apps/nginx.conf` | + `location /uploads/` alias 到 `/var/www/html/runtime/uploads/`（7d 缓存）|

### Wave B · OMS Admin 写 API（2 文件）

| 文件 | 变更 |
|---|---|
| `apps/oms-backend/app/controller/Admin.php` | + cancelOrder（管理员强制取消，paid 也行；解锁库存）+ recoverOrder（exception 转目标状态）+ adjustInventory（手改 available/buffer_qty + 写 inventory_log adjust） |
| `apps/oms-backend/route/app.php` | + 3 个写路由 |

### Wave C · Vue 后台 PIM 写页面（6 文件）

| 文件 | 变更 |
|---|---|
| `apps/shop-admin/src/apis/http.ts` | + put / del / upload(multipart) 工具 |
| `apps/shop-admin/src/apis/pim.ts` | + 全部 admin 写接口 + uploadImage |
| `apps/shop-admin/src/components/ImageUpload.vue` | 新建：单图 / 多图（带最大数限制）+ 缩略图 + 删除 |
| `apps/shop-admin/src/pages/pim/Categories.vue` | 重写：新增/编辑 dialog + 删除按钮 + 状态切换 |
| `apps/shop-admin/src/pages/pim/Brands.vue` | 重写：表单 dialog 含 logo 上传 + 描述 textarea + 删除 |
| `apps/shop-admin/src/pages/pim/Products.vue` | 重写：admin 列表（status/category/brand/keyword 筛选）+ 编辑/发布/下架/删除按钮 + 分页 |
| `apps/shop-admin/src/pages/pim/ProductEdit.vue` | 新建：SPU 编辑页（主图多图 + 卖点 + textarea 详情）+ SKU 子列表 + 增删改 dialog |
| `apps/shop-admin/src/router/index.ts` | + /pim/products/new + /pim/products/edit/:id 路由 |
| `apps/shop-admin/vite.config.ts` | + /uploads proxy 到 pim-backend，让 dev 浏览器能访问上传图片 |
| `apps/shop-admin/src/shims-vue.d.ts` | 修复：补 *.vue 模块声明（解决 IDE 飘红） |

### Wave D · Vue 后台 OMS 写功能（3 文件）

| 文件 | 变更 |
|---|---|
| `apps/shop-admin/src/apis/oms.ts` | + cancelOrder / recoverOrder / adjustInventory + deadLetter |
| `apps/shop-admin/src/pages/oms/OrderDetail.vue` | + 管理员取消按钮（prompt 填理由）+ 异常恢复 dialog |
| `apps/shop-admin/src/pages/oms/Inventory.vue` | + 调整按钮 + dialog（改 available + buffer_qty + 理由必填）|

### Wave E · 文档（3 文件）
- `outputs/orchestration/iteration-10-runbook.md`（本文件）
- `outputs/orchestration/reconcile-report-iteration-10.md`（对账）
- `progress.md`（更新焦点）

## 关键技术决策

| 项 | 选择 | 理由 |
|---|---|---|
| 软删 vs 物理删 | 软删（deleted_at） | 防订单引用挂掉；list 自动 `whereNull('deleted_at')` |
| 图片存储 | 本地 `runtime/uploads/{ymd}/{uuid}.{ext}` | 项目默认值"图片：本地存储"；nginx alias 直出，避开 PHP serve |
| 图片返回路径 | 相对路径 `/uploads/...` | vite proxy + nginx 都吃；prod 时同样 nginx 直出 |
| 图片访问权限 | 全公开 | MVP 不做鉴权图片下载 |
| 富文本 | `<el-input type="textarea">` 让用户填 HTML | M3 接 wangeditor 不需改后端 |
| 排序 | sort 字段 + 编辑表单手动改 | drag-and-drop 留 M3 |
| Admin 鉴权 | 暂不加 admin middleware | 当前 JWT 登录态即可；M3 加 user/admin 区分 |
| 类目层级 | create 时根据 parent_id 自动算 level；≤ 5 级 | 与 schema 约定一致 |
| 引用保护 | 删类目查子类目+SPU；删品牌查 SPU；删 SPU 级联软删 SKU | 防孤儿；订单仍能用 sku_snapshot 显示 |
| ImageUpload 组件 | v-model 双向绑定 url / urls[]；max 控制多图上限 | 复用：Brand logo + SPU 主图 |
| Vue *.vue 类型 | shims-vue.d.ts 补声明 | IDE 飘红 16 个，1 行修复 |

## 验收

后端 curl（OMS_TOKEN 是后台登录后拿到的；如果 admin 路由没 auth middleware 可空）：
```bash
# 类目
curl -X POST http://localhost:8002/api/v1/admin/category \
  -H 'Content-Type: application/json' \
  -d '{"code":"C-TEST","name":"测试类目","parent_id":0,"sort":99}'

# 上传图片
curl -X POST http://localhost:8002/api/v1/admin/upload/image \
  -F 'file=@/path/to/test.jpg'
# 期望返回 {"code":0,"data":{"url":"/uploads/260527/xxx.jpg","size":...}}

# 强制取消订单
curl -X POST http://localhost:8003/api/v1/admin/order/SO.../cancel \
  -H 'Content-Type: application/json' \
  -d '{"reason":"测试"}'

# 调整库存
curl -X PUT http://localhost:8003/api/v1/admin/inventory/SPU001-001 \
  -H 'Content-Type: application/json' \
  -d '{"available":200,"reason":"补货"}'
```

Vue 后台（http://localhost:5173）：
1. PIM/类目管理 → 点"新增类目"→ 填 code+name → 提交 → 列表出现
2. PIM/类目管理 → 行"编辑"→ 改 name+sort → 提交 → 列表更新
3. PIM/品牌管理 → 新增 → 上传 logo → 列表显示缩略图
4. PIM/SPU 商品管理 → "新建 SPU" → 填 code/name/类目/价 + 上传 3 张主图 + 添加 2 个卖点 + 填 detail_html → 提交
5. 新建后跳到编辑页 → "新增 SKU" → 填 sku_code/price → 提交 → SKU 列表出现
6. 回到 SPU 列表 → "发布"按钮 → 状态变 published
7. OMS/订单详情 → "管理员取消" → 弹框填理由 → 订单变 cancelled + 时间线显示
8. OMS/库存四态 → 行"调整" → 改 available 到 200 + 填理由 → 库存更新
