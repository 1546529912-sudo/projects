# api-list.md · 4 后端 API 清单（含跨系统调用）

## 【当前焦点】
列出 4 个 PHP 后端的 MVP API 接口 + 跨系统调用关系。
所有接口：JSON in/out，统一响应 `{code, msg, data}`，前缀 `/api/v1/`，写接口必须 `Idempotency-Key` header。

## 本任务匹配到的 skill 清单
- 架构 Agent 当前无强匹配 skill

## 接口标记规则
- 🟢 = 提供方（本工程实现）
- 🔵 = 消费方（本工程调用其他工程）
- 🟣 = 跨系统事件（Redis Stream）

## 通用响应格式
```json
{ "code": 0, "msg": "ok", "data": { ... } }
{ "code": 400, "msg": "phone format invalid", "data": null }
```

错误码段位：
- 0：成功
- 4xx：客户端错（400 校验 / 401 未登录 / 403 无权限 / 404 不存在 / 409 冲突 / 423 锁定 / 429 频率限流）
- 5xx：服务端错（500 内部 / 503 不可用 / 504 上游超时）

---

# 一、shop-backend（端口 8001）

## 1.1 用户与登录

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| 🟢 POST | `/api/v1/sms/code` | 发送验证码 | 公开 |
| 🟢 POST | `/api/v1/user/login` | 手机号+验证码登录 | 公开 |
| 🟢 POST | `/api/v1/user/logout` | 退出登录 | token |
| 🟢 GET  | `/api/v1/user/me` | 当前用户信息 | token |

## 1.2 首页与类目

| 方法 | 路径 | 说明 | 内部依赖 |
|---|---|---|---|
| 🟢 GET | `/api/v1/home/banners` | 首页轮播 | 本地 |
| 🟢 GET | `/api/v1/home/categories` | 首页一级类目 | 🔵 PIM `/category/tree` |
| 🟢 GET | `/api/v1/home/recommend` | 推荐商品 | 🔵 PIM `/spu/list` |
| 🟢 GET | `/api/v1/category/{parent_id}/children` | 子类目 | 🔵 PIM `/category/tree` |

## 1.3 商品

| 方法 | 路径 | 说明 | 内部依赖 |
|---|---|---|---|
| 🟢 GET | `/api/v1/product/list` | 商品列表（分页+筛选+排序）| 🔵 PIM `/spu/list` + 🔵 OMS `/inventory/batch` |
| 🟢 GET | `/api/v1/product/{sku}` | 商品详情 | 🔵 PIM `/sku/{code}` + 🔵 OMS `/inventory/{sku}` |
| 🟢 POST | `/api/v1/upload/image` | 上传图片（用户头像）| 本地 |

## 1.4 购物车

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| 🟢 GET | `/api/v1/cart/list` | 列表 | token |
| 🟢 POST | `/api/v1/cart/add` | 加购 | token |
| 🟢 PUT | `/api/v1/cart/{id}` | 改数量/选中 | token |
| 🟢 DELETE | `/api/v1/cart/{id}` | 删除 | token |
| 🟢 POST | `/api/v1/cart/clear-invalid` | 清空失效 | token |

## 1.5 订单（代理转发 OMS）

| 方法 | 路径 | 说明 | 内部依赖 |
|---|---|---|---|
| 🟢 POST | `/api/v1/order/submit` | 提交订单 | 🔵 OMS `POST /order` + Idempotency-Key |
| 🟢 GET | `/api/v1/order/list` | 订单列表 | 🔵 OMS `/order/list` |
| 🟢 GET | `/api/v1/order/{id}` | 订单详情 | 🔵 OMS `/order/{id}` |
| 🟢 POST | `/api/v1/order/{id}/cancel` | 取消订单 | 🔵 OMS `POST /order/{id}/cancel` |
| 🟢 POST | `/api/v1/order/{id}/confirm` | 确认收货 | 🔵 OMS `POST /order/{id}/confirm` |

## 1.6 支付

| 方法 | 路径 | 说明 | 内部依赖 |
|---|---|---|---|
| 🟢 POST | `/api/v1/payment/wxpay` | 拉起微信支付参数 | mock 返回 |
| 🟢 POST | `/api/v1/payment/callback/mock` | mock 支付回调 | 🔵 OMS `POST /payment/callback` |

## 1.7 事件订阅（无对外 API）

| 🟣 Stream | 方向 | 用途 |
|---|---|---|
| `oms.order.status.changed` | 订阅 OMS | 通知前端订单状态变化（MVP 可省，前端轮询代替）|

---

# 二、pim-backend（端口 8002）

## 2.1 类目

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 POST | `/api/v1/category` | 新建 |
| 🟢 PUT | `/api/v1/category/{id}` | 编辑 |
| 🟢 DELETE | `/api/v1/category/{id}` | 软删 |
| 🟢 GET | `/api/v1/category/{id}` | 详情 |
| 🟢 GET | `/api/v1/category/tree` | 全树 |
| 🟢 POST | `/api/v1/category/reorder` | 拖拽排序 |

## 2.2 属性 & 模板

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 POST | `/api/v1/attribute` | 新建属性 |
| 🟢 PUT | `/api/v1/attribute/{id}` | 编辑 |
| 🟢 DELETE | `/api/v1/attribute/{id}` | 删除 |
| 🟢 GET | `/api/v1/attribute/list` | 分页 |
| 🟢 POST | `/api/v1/attr-template` | 新建模板 |
| 🟢 PUT | `/api/v1/attr-template/{id}` | 编辑 |
| 🟢 DELETE | `/api/v1/attr-template/{id}` | 删除 |
| 🟢 GET | `/api/v1/attr-template/{id}` | 详情 |
| 🟢 GET | `/api/v1/attr-template/list` | 分页 |

## 2.3 品牌

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 POST | `/api/v1/brand` | 新建 |
| 🟢 PUT | `/api/v1/brand/{id}` | 编辑 |
| 🟢 DELETE | `/api/v1/brand/{id}` | 软删 |
| 🟢 GET | `/api/v1/brand/{id}` | 详情 |
| 🟢 GET | `/api/v1/brand/list` | 分页 |
| 🟢 GET | `/api/v1/brand/{id}/products` | 品牌下 SPU |

## 2.4 SPU / SKU

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 POST | `/api/v1/spu` | 新建 SPU |
| 🟢 PUT | `/api/v1/spu/{id}` | 编辑 |
| 🟢 DELETE | `/api/v1/spu/{id}` | 软删 |
| 🟢 GET | `/api/v1/spu/{id}` | 详情（含 SKU）|
| 🟢 GET | `/api/v1/spu/list` | 分页（含筛选）|
| 🟢 POST | `/api/v1/spu/{id}/publish` | 发布 |
| 🟢 POST | `/api/v1/spu/{id}/offline` | 下架 |
| 🟢 POST | `/api/v1/spu/{id}/sku/generate` | 批量生成 SKU |
| 🟢 GET | `/api/v1/spu/{id}/sku/list` | SPU 下 SKU |
| 🟢 PUT | `/api/v1/sku/{id}` | 编辑单 SKU |
| 🟢 GET | `/api/v1/sku/{code}` | SKU 详情 |
| 🟢 POST | `/api/v1/sku/batch` | 批量查询 SKU |

## 2.5 上传

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 POST | `/api/v1/upload/image` | 图片上传（品牌 logo / SPU 主图 / 富文本图片）|

## 2.6 事件推送

| 🟣 Stream | 方向 | payload | 触发 |
|---|---|---|---|
| `pim.category.changed` | 推送 | `{id, code, status}` | 类目 CRUD |
| `pim.brand.changed` | 推送 | `{id, code, status}` | 品牌 CRUD |
| `pim.spu.changed` | 推送 | `{id, code, status}` | SPU 状态变化 |
| `pim.sku.changed` | 推送 | `{sku_code, spu_id, price, status, weight, ...}` | SKU CRUD |

---

# 三、oms-backend（端口 8003）

## 3.1 订单

| 方法 | 路径 | 说明 | 调用方 |
|---|---|---|---|
| 🟢 POST | `/api/v1/order` | 创建订单（需 Idempotency-Key）| shop-backend |
| 🟢 GET | `/api/v1/order/{id_or_no}` | 订单详情 | shop-backend |
| 🟢 GET | `/api/v1/order/list` | 用户订单列表 | shop-backend |
| 🟢 POST | `/api/v1/order/{id}/cancel` | 取消（仅待支付）| shop-backend |
| 🟢 POST | `/api/v1/order/{id}/confirm` | 确认收货 | shop-backend |
| 🟢 POST | `/api/v1/order/{id}/recover` | 异常恢复（admin）| 内部 |

## 3.2 库存

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 GET | `/api/v1/inventory/{sku}` | 可用库存查询 |
| 🟢 POST | `/api/v1/inventory/batch` | 批量库存查询 |
| 🟢 POST | `/api/v1/inventory/precheck` | 多 SKU 库存预校验 |
| 🟢 PUT | `/api/v1/admin/inventory/{sku}` | 手动设置可用（dev）|
| 🟢 PUT | `/api/v1/admin/inventory/{sku}/buffer` | 设置安全垫 |

## 3.3 支付回调（mock）

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 POST | `/api/v1/payment/callback` | 接收支付成功回调（mock 模式跳过签名）|

## 3.4 对账与监控

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 GET | `/api/v1/admin/inventory/reconcile-report` | 库存对账结果 |
| 🟢 GET | `/api/v1/admin/dead-letter` | 死信队列 |

## 3.5 跨系统调用（消费方）

| 🔵 调 | 接口 | 用途 |
|---|---|---|
| pim-backend | `GET /api/v1/sku/{code}` | 下单时校验 SKU 价格/状态 |
| pim-backend | `POST /api/v1/sku/batch` | 批量校验 |
| wms-backend | `POST /api/v1/picking-order` | 下发拣货单 |

## 3.6 事件

| 🟣 Stream | 方向 | payload | 触发 |
|---|---|---|---|
| `oms.order.created` | 推送 | `{order_no, user_id, total}` | 订单创建 |
| `oms.order.paid` | 推送 | `{order_no}` | 支付成功 |
| `oms.order.cancelled` | 推送 | `{order_no, reason}` | 订单取消 |
| `oms.order.shipped` | 推送 | `{order_no, express_no}` | 出库回传消费后 |
| `oms.order.completed` | 推送 | `{order_no}` | 用户确认收货 |
| `oms.inventory.changed` | 推送 | `{sku_code, available}` | 库存四态变化 |
| `pim.sku.changed` | 订阅 | — | 同步 SKU 元数据缓存 |
| `wms.outbound.completed` | 订阅 | `{outbound_no, express_no}` | 处理出库回传 |
| `wms.picking.shortage` | 订阅 | `{outbound_no, sku, requested, actual}` | 处理短拣异常 |
| `wms.inventory.changed` | 订阅 | `{sku_code, quantity, locked_quantity}` | 同步实物库存 |

---

# 四、wms-backend（端口 8004）

## 4.1 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 POST | `/api/v1/auth/login` | 账密登录 |
| 🟢 POST | `/api/v1/auth/logout` | 退出 |
| 🟢 GET | `/api/v1/auth/me` | 当前用户 |

## 4.2 基础数据

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 POST | `/api/v1/product` | 新建 SKU 主数据 |
| 🟢 PUT | `/api/v1/product/{sku_code}` | 编辑 |
| 🟢 GET | `/api/v1/product/{sku_code}` | 详情 |
| 🟢 GET | `/api/v1/product/list` | 分页 |
| 🟢 POST | `/api/v1/warehouse` | 新建仓库 |
| 🟢 GET | `/api/v1/warehouse/list` | 列表 |
| 🟢 POST | `/api/v1/location` | 新建库位 |
| 🟢 POST | `/api/v1/location/batch` | 批量生成 |
| 🟢 GET | `/api/v1/location/{location_code}` | 详情 |
| 🟢 GET | `/api/v1/location/list` | 分页 |

## 4.3 入库

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 POST | `/api/v1/inbound` | 创建入库单 |
| 🟢 GET | `/api/v1/inbound/{inbound_no}` | 详情 |
| 🟢 GET | `/api/v1/inbound/list` | 列表 |
| 🟢 POST | `/api/v1/inbound/{inbound_no}/receive` | PDA 扫码收货 |
| 🟢 GET | `/api/v1/inbound/{inbound_no}/difference` | 查差异 |
| 🟢 POST | `/api/v1/inbound/{inbound_no}/difference/{id}/approve` | 审批 |
| 🟢 GET | `/api/v1/inbound/recommend-location` | 推荐库位 Top3 |
| 🟢 POST | `/api/v1/inbound/{inbound_no}/shelf` | 上架 |

## 4.4 库存

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 GET | `/api/v1/inventory` | 按 SKU 查询库位明细 |
| 🟢 GET | `/api/v1/inventory/aggregate` | 按 SKU 聚合（总数/可用/锁定）|
| 🟢 POST | `/api/v1/inventory/move` | 移库 |

## 4.5 出库

| 方法 | 路径 | 说明 | 调用方 |
|---|---|---|---|
| 🟢 POST | `/api/v1/picking-order` | 接 OMS 拣货单 | oms-backend |
| 🟢 GET | `/api/v1/outbound/{outbound_no}` | 出库单详情 |  |
| 🟢 GET | `/api/v1/outbound/list` | 列表 |  |
| 🟢 GET | `/api/v1/picking-task/{outbound_no}` | PDA 拉任务 |  |
| 🟢 POST | `/api/v1/picking-task/{id}/pick` | 提交单条拣货 |  |
| 🟢 POST | `/api/v1/picking-task/{id}/short` | 短拣上报 |  |
| 🟢 POST | `/api/v1/outbound/{outbound_no}/review` | 复核扫码 |  |
| 🟢 POST | `/api/v1/outbound/{outbound_no}/ship` | 快递取件扫码 |  |

## 4.6 运维

| 方法 | 路径 | 说明 |
|---|---|---|
| 🟢 GET | `/api/v1/operation-log` | 操作日志（admin）|
| 🟢 GET | `/api/v1/admin/dead-letter` | 死信队列 |

## 4.7 事件

| 🟣 Stream | 方向 | payload | 触发 |
|---|---|---|---|
| `wms.outbound.completed` | 推送 | `{outbound_no, express_no, completed_at}` | 出库扫码 |
| `wms.picking.shortage` | 推送 | `{outbound_no, sku_code, requested, actual, reason}` | 短拣异常 |
| `wms.inventory.changed` | 推送 | `{sku_code, quantity, locked_quantity, transaction_id}` | 库存变动 |
| `pim.sku.changed` | 订阅 | — | 同步 SKU 主数据（products 表）|

---

# 五、健康检查（4 工程统一）

| 方法 | 路径 | 期望响应 |
|---|---|---|
| 🟢 GET | `/health` | `{"code":0, "data":{"service":"shop-backend","ts":...,"db":"ok","redis":"ok"}}` |

---

# 六、通用 Header 约定

| Header | 必传 | 用途 |
|---|---|---|
| `Authorization: Bearer <jwt>` | 多数写接口 | 鉴权 |
| `Idempotency-Key: <uuid>` | 所有写接口 | 幂等 |
| `X-Trace-Id: <uuid>` | 跨服务调用 | 链路追踪 |
| `Content-Type: application/json` | POST/PUT | 必传 |
| `X-User-Agent: <client>/version` | 推荐 | 区分小程序/后台/PDA |

---

# 七、接口总数统计

| 工程 | API 接口数 | Stream 推送 | Stream 订阅 |
|---|---|---|---|
| shop-backend | 19 | 0 | 1（M1 可省）|
| pim-backend | 24 | 4 | 0 |
| oms-backend | 13 | 6 | 4 |
| wms-backend | 23 | 3 | 1 |
| **合计** | **79** | **13** | **6** |

加上 4 个 `/health` 共 **83 个 HTTP API + 13 个 Stream 主题**。

## 八、Phase 1 实现优先级（建议）

| 优先级 | 范围 | 理由 |
|---|---|---|
| P0 | 4 个 `/health`、登录鉴权（shop + wms）、SKU CRUD（pim） | 骨架打通 |
| P1 | 首页+商品详情链路（shop + pim + oms 库存查询）| MVP 第一条端到端 |
| P2 | 下单+支付（shop + oms + 模拟支付）| 闭环 |
| P3 | OMS 下发 WMS 拣货单 + 出库回传 | 履约打通 |
| P4 | 其他周边（购物车增强、订单详情、运维接口）| 完善 |
