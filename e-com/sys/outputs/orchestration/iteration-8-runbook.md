# iteration-8-runbook.md · 边界场景验证

## 【当前焦点】
Phase 2 主线（P0+P1+P2+P4）已跑通。本轮**系统性验证 10 个边界/异常场景**——大多数代码已有保护，本轮目标是用一个集成测试脚本把保护实测一遍，发现真实漏洞补丁。

## 本轮范围

### Wave A · 集成测试脚本（1 文件）

| 任务 | 内容 | 输出 |
|---|---|---|
| EDGE-001 | `apps/scripts/edge-cases.sh`：bash 串行跑 10 个场景，每个场景 PASS/FAIL 输出 + 期望值对比 | scripts/edge-cases.sh |

### Wave B · 代码补丁（根据测试结果按需补）

测试中发现的 bug 才补。预计 0-3 个补丁。

## 测试的 10 个场景

| # | 场景 | 期望行为 | 当前代码保护 |
|---|---|---|---|
| 1 | 超卖（qty > available - buffer）| 返回 4xx "库存不足"，订单不创建 | InventoryService::precheck + lockBatch 行锁 |
| 2 | 同 SKU 并发下单（5 个并发，库存只 3）| 3 成功 + 2 失败，无超卖 | Db::lock(true) 行锁 |
| 3 | 幂等键复用（同 Idempotency-Key 调两次 submit）| 第二次返回首次的 order_no，不重复扣库存 | orders.idempotency_key 唯一索引 + service::create 头查 |
| 4 | SKU 已下架（status='offline'）加购下单 | OMS create 时 PIM 校验失败，返回错误 | PIM Sku::batch 不会返回非 enabled SKU（实际上 batch 没过滤，需补）|
| 5 | 空购物车 submit | shop 返回 400 "请先勾选商品" | shop Order::submit 已校验 |
| 6 | 重复支付同一订单 | 第二次返回 409 状态非法转移 | OrderStateMachine：paid 不能再 paid |
| 7 | 取消非 pending_pay 订单（已 paid）| 返回 409 "订单当前状态不可取消" | OrderService::cancel 已校验 |
| 8 | 非本人取消订单 | 返回 409 "非本人订单" | OrderService::cancel 已校验 user_id |
| 9 | JWT 过期 / 无效 token | 401 "token 无效或过期" | Auth middleware 已校验 |
| 10 | WMS 不可达时下单 + 支付 | OMS 订单仍 paid，picking_orders.status='failed' + last_error | OrderService::dispatchToWms try/catch |

## 关键设计

| 设计点 | 选择 |
|---|---|
| 测试模式 | 集成测试（curl 串行）；不写 phpunit（写起来麻烦且 mock 不真实）|
| 隔离 | 每个场景独立用唯一 Idempotency-Key（基于 `$(date +%s)`）|
| 数据清理 | 不清，每次新 token + 新订单号 + 新 idempotency key |
| 并发场景 #2 | 用 bash `&` 后台跑 + wait + 解析 |
| 期望对比 | 简单 `[[ $output == *"期望片段"* ]]` 字符串包含；不引入 jq 之类外部工具 |
| 失败处理 | 任何场景 FAIL 输出红字 `FAIL`；最后汇总通过/失败数 |

## 已知未保护点（本轮预测会失败的）

| # | 风险 |
|---|---|
| 4 | PIM Sku::batch 没按 status 过滤，下架 SKU 仍返回 enabled。如果 OMS 校验 `status === 'enabled'` 时 PIM 返回的是表里实际值（offline），就能拦住；需测试确认 |

## 用户运行验证

```bash
cd /Users/linfeng/Desktop/project/e-com/sys/apps
chmod +x scripts/edge-cases.sh
./scripts/edge-cases.sh
```

期望最后输出：`10 / 10 PASS`。如有 FAIL，进 iteration-9 补丁。

## 升级与阻塞
（本轮无）

## 对账触发
脚本完成后生成 [reconcile-report-iteration-8.md](reconcile-report-iteration-8.md)。用户跑通后回填 progress.md。
