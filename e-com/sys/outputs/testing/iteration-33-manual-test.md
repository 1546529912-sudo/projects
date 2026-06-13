# iteration-33-manual-test.md · 手动测试清单（用户执行）

> 主控列步骤，用户在 Vue 后台实际操作并回填。

## 前置条件
- auto-test [iteration-33-auto-test.md](iteration-33-auto-test.md) 已 PASS（7/7 ✅）
- Vue dev server 跑（vite 热更已接管）
- **iter-33 0 新 UI**，全部走 iter-28 的 Webhooks 订阅页验证异步链路

## 测试用例（共 4 项）

### Webhook 异步推送（用户感知 = 业务请求不被阻塞）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin → OMS / Webhook 订阅 → 看 iter-28 老订阅 | 列表正常加载 + secret 不暴露明文 | 实测填写 | ☐ |
| M2 | 新增 1 个订阅（URL=https://httpbin.org/post，订阅 order.completed），保存 | 列表新增 1 行 + retry_max 默认 3 | 实测填写 | ☐ |
| M3 | 后台跑一笔订单完成（小程序下单 → admin 后台改状态 → 完成）or 用 admin 强制确认 | 注意"完成"操作**应该立即返回**（不卡顿，对比 iter-28 偶尔卡 1-15s）；2 秒后刷新 Webhook 列表 → 看 last_fired_at 更新且 total_fired +1 | 实测填写 | ☐ |
| M4 | 点该订阅"测试推送"按钮 | 弹"已发起测试推送"toast；该订阅 last_fired_at 立即更新（test 走同步路径，不进队列） | 实测填写 | ☐ |

## 重点观察

**本轮核心是性能**：M3 步骤完成订单时**不应有任何明显延迟**。在 iter-28 同步模式下，外部接收方慢/宕会拖累订单确认 5-15 秒。iter-33 改异步后，无论外部 webhook 多慢，订单确认都是 ~1ms 的 XADD 操作。

**降级路径**（无需主动测试，但要知道有）：如果 Redis 宕了，fireAsync 会自动降级为 iter-28 的同步 fireSync，业务消息不会丢。

## 用户填写指南
每行 `实际` 栏简短描述（"无卡顿 / last_fired_at 对 / 测试推送 OK"等），`PASS` 栏勾 ✅ 或 ❌。

## 测试时间
（用户填）：_________________________
