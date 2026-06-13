# iteration-14-runbook.md · 售后退款 + reserved 库存态启用

## 【目标】
- 用户可申请退款（仅退款 / 退货退款）
- 运营审批 → 通过 / 拒绝
- 退货退款打通 reserved 中间态：approve 时 reserve+N，WMS 收到退货 inbound 时 reserved→available
- 主流程零同步跨服务调用（复用 iter-12 的 wms.inventory.changed 事件链，payload 加 refund_no 字段）

## 【非目标】
- 真实微信退款 API 接入（仅 OMS 内部状态置位）
- 退款金额后端重算（前端传入 + 简单校验 ≤ 订单金额）
- 售后客服 IM
- 全自动退货物流追踪

## 一、文件清单（共 16 文件，5 Wave）

### Wave A · OMS 后端（7）
| 类型 | 文件 |
|---|---|
| migration 新 | `oms-backend/database/migrations/20260528000004_create_refund_orders.php` |
| migration 新 | `oms-backend/database/migrations/20260528000005_create_refund_items.php` |
| service 改 | `oms-backend/app/service/InventoryService.php`（+ reserveBatch / receiveBackBatch / unreserveBatch 三方法）|
| service 新 | `oms-backend/app/service/RefundStateMachine.php` |
| service 新 | `oms-backend/app/service/RefundService.php`（apply / approve / reject / markReceivedBack / refund + 数量配额校验）|
| controller 新 | `oms-backend/app/controller/Refund.php`（user + admin 双角色）|
| route 改 | `oms-backend/route/app.php`（+3 user + 5 admin 路由）|

### Wave B · WMS-OMS 退货联动（4）
| 类型 | 文件 |
|---|---|
| migration 新 | `wms-backend/database/migrations/20260528000004_add_refund_no_to_inbound_orders.php`（ALTER 加 refund_no 列）|
| controller 改 | `wms-backend/app/controller/Inbound.php`（create 接 refund_no，autoComplete 推事件 payload 加 refund_no）|
| handler 改 | `oms-backend/app/service/handler/WmsInventoryChangedHandler.php`（识别 refund_no → 走 RefundService::markReceivedBack）|

复用 iter-12 的 `wms.inventory.changed` 流：payload 多一个可选 `refund_no` 字段。OMS 端在原 handler 内分叉处理，不需要新的 stream / consumer。

### Wave C · 小程序（8 个新增 / 修改）
| 类型 | 文件 |
|---|---|
| api 改 | `shop-miniprogram/apis/index.js`（+ refundApply / refundList / refundDetail）|
| page 改 | `shop-miniprogram/pages/order-detail/index.wxml + .js`（加申请退款按钮 + onRefund 跳转）|
| page 新 | `shop-miniprogram/pages/refund-apply/{index.js, index.wxml, index.wxss, index.json}` |
| page 新 | `shop-miniprogram/pages/my-refunds/{index.js, index.wxml, index.wxss, index.json}` |
| 入口改 | `shop-miniprogram/pages/me/index.wxml + .js`（加"我的退款"tab）|
| 注册改 | `shop-miniprogram/app.json`（+2 页）|
| bff 新 | `shop-backend/app/controller/Refund.php`（透传 OMS，附 user_id from JWT）|
| route 改 | `shop-backend/route/app.php`（+3 路由）|

### Wave D · Vue admin（4）
| 类型 | 文件 |
|---|---|
| api 改 | `shop-admin/src/apis/oms.ts`（+5 接口）|
| page 新 | `shop-admin/src/pages/oms/Refunds.vue`（列表 + 筛选 + 详情 dialog + 通过/拒绝/确认退款）|
| router 改 | `shop-admin/src/router/index.ts`（+ /oms/refunds）|
| layout 改 | `shop-admin/src/components/AdminLayout.vue`（OMS 子菜单加"退款审批"）|

### Wave E · 文档（3）
- iteration-14-runbook.md（本文件）
- reconcile-report-iteration-15.md
- progress.md 追加 iter-14 块

合计代码量：~1200 行 PHP / ~500 行 Vue/Mini-program。

## 二、状态机

```
pending_approve → approved → received_back → refunded
                ↘ rejected

refund_only:    pending_approve → approved → refunded（无 received_back）
return_refund:  pending_approve → approved → received_back → refunded
```

## 三、库存动作矩阵

| 操作 | refund_only | return_refund |
|---|---|---|
| apply | – | – |
| approve | – | reserve(+N) |
| markReceivedBack | – | receiveBack(reserved-N, available+N) |
| refund | unlock(locked-N, available+N) | – |
| reject | – | – |

设计要点：
- refund_only：货物未离开仓库（订单 paid/picking 状态下申请），refund 时 unlock 让出 locked
- return_refund：货物已发货，approve 阶段先 reserve 标记"运回中"，WMS 收到货后 reserved→available

## 四、payload 扩展（wms.inventory.changed）

iter-12 原 payload：
```json
{
  "inbound_no": "IB...",
  "warehouse_code": "...",
  "items": [{"sku_code": "...", "delta": 100}]
}
```

iter-14 加可选字段：
```json
{
  ...,
  "refund_no": "RF20260528..."   // 仅退货入库 (source_type=return) 时存在
}
```

OMS WmsInventoryChangedHandler 分叉：
```php
if ($refundNo) {
    (new RefundService())->markReceivedBack($refundNo);  // 内部 receiveBackBatch
    return;
}
// 否则走 iter-12 原 available+N 路径
```

## 五、待用户运行（5 步）

```bash
cd /Users/linfeng/Desktop/project/e-com/sys/apps

# 1. OMS migrate（refund_orders + refund_items）
docker-compose exec oms-backend php think migrate:run
# 期望: 2 行 migrated

# 2. WMS migrate（inbound_orders 加 refund_no 列）
docker-compose exec wms-backend php think migrate:run
# 期望: 1 行 migrated

# 3. 4 后端重启加载新代码
docker-compose restart shop-backend pim-backend oms-backend wms-backend

# 4. shop-admin 端：HMR 已自动加载（如果需要）
# cd shop-admin && npm run dev（已运行的话不需要）

# 5. 微信开发者工具：重启项目加载小程序两个新页 + me 入口
```

## 六、验证清单（8 步）

### A. 仅退款（refund_only）
| # | 操作 | 期望 |
|---|---|---|
| 1 | 小程序下单 → mock 支付 → 订单 paid（locked +N）| OMS inventory_status locked +N |
| 2 | 订单详情 → 申请退款 → 选 SKU/数量/原因/金额 → 提交 | 跳到我的退款，状态 pending_approve |
| 3 | Vue OMS/退款审批 → 找到该单 → 通过 | 退款状态直接到 refunded；OMS inventory_status locked -N + available +N |

### B. 退货退款（return_refund）
| # | 操作 | 期望 |
|---|---|---|
| 4 | 已 shipped/completed 订单 → 小程序申请退货退款 | 退款 pending_approve |
| 5 | Vue OMS/退款审批 → 通过 | refund.status=approved；inventory_status reserved +N |
| 6 | Vue WMS/入库管理 → 新建入库单（source_type=return + refund_no）→ 一键完成 | wms.inventory.changed 事件含 refund_no |
| 7 | 自动触发 OMS 处理 → refund.status=received_back；inventory_status reserved -N, available +N | OMS 日志见 [handler] inbound_no=... → refund_no=... markReceivedBack |
| 8 | Vue OMS/退款审批 → 该单"确认退款" | refund.status=refunded |

## 七、本轮主动避坑

| 风险 | 规避 |
|---|---|
| inventory_log.related_order 限长 32 → INBOUND/REFUND 组合键超限 | 用 refund_no 直接做 related_order，配合 sku_code + change_type 三元组幂等 |
| OMS 不存在的 SKU（refund 申请的 SKU 历史从未入库到 OMS）| reserveBatch 时 inventory_status 不存在则 INSERT 0+reserved |
| 退款数量超出可退配额（已有 pending/approved/refunded 占用）| RefundService::validateItemsQty 综合 order_items - 历史 refund_items |
| markReceivedBack 重复投递 | 状态机 + 早期返回（received_back/refunded 跳过）|
| 路由顺序 | 参数路由 `/refund/<no>` 必须放 `/refund` plain 之前（iter-10 fix-2 教训）|
| WMS Inbound 创建 return 但忘传 refund_no | controller 强校验：source_type=return 必须 refund_no |
| 旧 inbound_orders 行无 refund_no 列报错 | migration 加 nullable，旧行 SELECT 出来为 null，不影响 iter-12 流 |

## 八、与历史 iter 对账

| iter | 主题 | 事件流变化 |
|---|---|---|
| iter-12 | 入库 → OMS available +N | 新建 wms.inventory.changed |
| **iter-14** | **退货 → OMS available +N (经 reserved)** | **复用 wms.inventory.changed，加可选 refund_no 字段** |

iter-14 不增加新事件流 / 新 consumer，纯字段扩展。

## 九、剩余非阻塞（M3+）

| 编号 | 事项 |
|---|---|
| Q14-01 | 真实微信退款 v3 接入（refund 时调真实 API + 异步回调）|
| Q14-02 | 用户上传退货凭证图片 |
| Q14-03 | 客服 / 运营备注 audit log |
| Q14-04 | 多 SKU 部分退款金额按比例自动计算 |
| Q14-05 | 退款超时（X 天未发起退货物流自动关闭）|

## 十、时间
2026-05-28
