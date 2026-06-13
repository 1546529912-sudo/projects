# Iteration 5 · Runbook（支付闭环 + 订单生命周期）

## 【当前焦点】

- 范围：TRADE-005 支付 + TRADE-006-03/04 物流跟踪/确认收货 + TRADE-008-02/04 后台发货/凭证审核
- 目标：订单从 pending_payment 走完 → 已完成 完整状态机
- 简化：在线支付走 **mock 通道**（点按钮模拟扫码成功；真实接微信/支付宝沙箱需用户提供商户号）
- 对公转账：用户上传凭证（沿用 license 上传接口）→ admin 审核

## 状态机

```
pending_payment ──支付成功──> pending_shipment ──admin发货──> shipped ──用户确认收货──> completed
       │                              │                                                      
       │                              └──admin驳回凭证──> pending_payment (退回付款)
       │
       └──用户取消──> cancelled                          
       
（对公转账分支）
pending_payment ──上传凭证──> pending_review ──admin通过──> pending_shipment
                                              └──admin驳回──> pending_payment
```

## Backend 任务

| Task | 简述 |
|------|------|
| Migration: payments | 支付记录表（订单/方式/金额/transaction_id/凭证 URL/状态） |
| Model: Payment | belongsTo Order |
| PaymentController | initiate（发起）/ mockSuccess（mock 在线支付回调）/ uploadVoucher（对公转账凭证）|
| OrderController | 加 confirmReceipt（pending_shipment 不行，应该是 shipped → received → completed） |
| Admin OrderController | adminIndex / adminShip（填物流号）/ adminReviewVoucher（通过/驳回） |
| 路由 | 新增 ~10 个 |

## Frontend 任务

| Task | 简述 |
|------|------|
| api/payment.ts | initiate / mockSuccess / uploadVoucher |
| api/admin-order.ts | 后台订单接口封装 |
| PaymentPage.vue | 支付页：方式选 + 在线 mock 按钮 + 对公转账上传凭证 |
| OrderDetailPage.vue | "去支付" 接真实路由；shipped 状态显示"确认收货"按钮 |
| views/admin/OrderListPage.vue | 后台订单列表 + 发货 + 凭证审核 |
| 路由 | /payments/:orderId + /admin/orders |
| 个人中心 | 加"订单管理"入口 |

## 切换条件

1. 用户能：加购 → 下单 → 走到支付页 → 模拟支付成功 → 看到 pending_shipment
2. admin 能：进 /admin/orders → 给上面订单填物流号发货 → 状态变 shipped
3. 用户能：在订单详情点"确认收货" → 状态走 received → completed（简化：直接 completed）
4. 用户能：对公转账上传凭证 → 状态 pending_review → admin 通过 → pending_shipment
5. PHPUnit 新增 ≥ 8 PASS
6. Vitest 至少 1 个新测试

## 不在 iter-5 范围

- ❌ 真实微信/支付宝 SDK 接入（需要商户号 + 证书）
- ❌ 真实退款走第三方原路返回
- ❌ 物流接口对接（快递鸟）→ 只填单号，不拉真实物流跟踪
- ❌ 评价 / 售后工单
