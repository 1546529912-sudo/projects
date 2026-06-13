# Reconcile Report · Iteration 5（支付闭环 + 订单生命周期）

> 主控对账。完成时间：2026-05-21 23:55

## 【当前焦点】

- 范围：TRADE-005 支付（mock 通道 + 对公转账）+ TRADE-006-04 确认收货 + TRADE-008-02/04 后台发货/凭证审核
- 结论：**全部硬约束通过**，订单 5 节点状态机闭环跑通
- 测试：PHPUnit **66/66 PASS**（新增 12）

## 后端产物

| 文件 | 内容 |
|------|------|
| `database/migrations/2026_05_22_000009_create_payments_table.php` | payments 表 + orders 表加 tracking/shipped_at/received_at/completed_at |
| `app/Models/Payment.php` | Payment model + order() 关系 |
| `app/Models/Order.php` | 加 payments() + 4 时间字段 + tracking 字段 |
| `app/Http/Controllers/Api/PaymentController.php` | initiate / mockSuccess / uploadVoucher（含权限和幂等） |
| `app/Http/Controllers/Api/OrderController.php` | 增加 confirmReceipt + orderDetail 含 tracking/payments 时间字段 |
| `app/Http/Controllers/Api/OrderAdminController.php` | adminIndex / ship / reviewVoucher |
| `routes/api.php` | 7 个新接口 |

## 前端产物

| 文件 | 内容 |
|------|------|
| `src/api/payment.ts` | initiatePayment / mockPaymentSuccess / uploadVoucher |
| `src/api/admin-order.ts` | adminListOrders / adminShipOrder / adminReviewVoucher |
| `src/api/order.ts` | 加 confirmReceipt + OrderDetail 类型补字段 |
| `src/views/cart/PaymentPage.vue` | 支付页（方式选 + mock 二维码动效 + 对公账户信息 + 凭证上传） |
| `src/views/order/OrderDetailPage.vue` | 接入"去支付"真实跳转 + 物流信息区 + "确认收货"按钮 |
| `src/views/admin/OrderListPage.vue` | 后台订单管理（状态 tab + 发货 + 凭证审核操作） |
| `src/views/profile/MePage.vue` | 加"订单管理 →"入口 |
| `src/router/index.ts` | 新增 payment + admin-orders 2 个路由 |

## 状态机（已实跑）

```
pending_payment ─── mock 在线支付 ───────┐
                                          ├──> pending_shipment ─ admin 发货 → shipped ─ 用户确认 ─> completed
                上传对公凭证 → pending_review ─ admin 通过 ┘
                                              └── admin 驳回 ──> 退回 pending_payment

旁路: pending_payment → 用户取消 → cancelled（库存释放，iter-4 已实现）
```

## 测试结果

### PHPUnit 66/66 PASS（新增 12）

```
✅ Auth Controller (5)
✅ Company Controller (5)
✅ Health Controller (2)
✅ Product Admin (6)
✅ Product Public (8)
✅ Role Controller (3)
✅ Wechat Auth (3)
✅ Address Controller (5)
✅ Cart Controller (8)
✅ Order Controller (9)     — +2（confirmReceipt 正/反路径）
✅ Order Admin (4)          — 新增
✅ Payment Controller (6)   — 新增
✅ Example (2)
```

### Vitest 18/18 PASS（无新增；UI 页面行为依赖 e2e 手工验证）

### 端到端 curl（已实跑全链路）

| # | 操作 | 结果 |
|---|------|------|
| 1 | 注册 + 加购（SKU 1 × 2 件）+ 创建地址 | ✅ order_id=2, total=2570 |
| 2 | 发起在线支付（method=wechat） | ✅ payment_id=1, mock_endpoint 返回 |
| 3 | mock-success | ✅ payment.status=success, order.status=pending_shipment |
| 4 | admin 发货（顺丰 + SF99999900001） | ✅ order.status=shipped, tracking 写入 |
| 5 | 用户确认收货 | ✅ order.status=completed, completed_at=2026-05-21T15:54:48 |
| 6 | admin 列表查 completed | ✅ total=1, status=completed |

## HARNESS 5 项硬约束

| # | 约束 | 状态 |
|---|------|------|
| 1 | 产物清单已提交 | ✅ 7 后端 + 8 前端 |
| 2 | 主控 ls 验证存在 | ✅ |
| 3 | 自动化测试 PASS | ✅ PHPUnit 66/66（新增 12）+ Vitest 18/18 |
| 4 | 手动测试用户勾选 | ⏳ |
| 5 | 对账报告已生成 | ✅ |

## 用户手动验收步骤

打开 http://localhost:5173/

1. 登录 → 任意商品加购 → 结算 → 提交订单
2. 自动跳转订单详情，状态显示 "待付款"，点 **去支付**
3. 选 **微信支付** → 下一步 → 看到 mock 二维码 + "✓ 模拟扫码成功"按钮
4. 点 "模拟扫码成功" → 跳回订单详情，状态变 **待发货**
5. 切到管理员账号（之前 `UPDATE users SET role='admin'`）
6. 个人中心 → **订单管理 →** → 找到刚才的订单 → 点 **发货** → 填顺丰 + 单号
7. 切回普通用户 → 订单详情看到物流信息 → 点 **确认收货** → 状态变 **已完成**
8. 想测对公转账：再下一单，付款方式选"对公银行转账" → 显示银行账户 + 上传凭证 → 状态 待审凭证 → 切 admin → 在订单管理"查看凭证"+ 通过/驳回

## 风险与已知问题

| 项 | 说明 |
|----|------|
| Mock 通道 ⚠️ | 在线支付走 mock 按钮触发；真实接微信/支付宝需用户提供商户号 + 证书 |
| 库存控制 | 仍是 MySQL 直接扣 + 取消增回 → 高并发可能超卖（iter-? 上 Redis Lua）|
| 物流跟踪明细 | admin 填的单号写入订单，但前端没接快递鸟 API 拉真实路径 → 详情页只展示单号 |
| 超时自动取消 | 30 分钟未支付自动取消的定时任务未做 → iter-? 加 Laravel Schedule |
| 退款 / 售后 | 不在第一期 |
| Admin 权限 | 仍只 sanctum 校验未细化 Policy |

## iteration-6 候选

| 方向 | 简述 |
|------|------|
| **AI 报价（接 DeepSeek） ⭐** | 你贴 API key 后立即可做（AI-001 + AI-002-02） |
| **SKU 多规格 + 阶梯价** | 厚度×长度组合 + 100kg/500kg 分档（深化商品） |
| **库存精细化 + 超时取消** | Redis Lua 预扣 + Schedule 任务 |
| **物流跟踪接快递鸟** | 拉真实轨迹（用户已确认快递鸟选型） |
| **真实微信沙箱** | 用户提供商户号后接入 |

用户选下一步方向 →
