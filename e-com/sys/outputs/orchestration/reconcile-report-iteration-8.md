# reconcile-report-iteration-8.md · 主控对账（边界场景验证）

## 【当前焦点】
iteration-8 ✅ **10 个边界场景全部用户实测通过（2026-05-26）**。
含 1 项脚本本身的修复（`set -u` 与中文+变量解析互害），**无业务代码 bug**——主线 Phase 2 P0~P4 的所有防护代码均经实战检验。

## 对账原则
本轮**纯测试性质**，不引入新业务功能。代码层面只交付 1 个 shell 脚本。10 PASS 后归档收尾。

---

## 一、文件交付（2 文件）

| 类型 | 文件 |
|---|---|
| 脚本 | `apps/scripts/edge-cases.sh` 可执行，10 个场景 |
| 文档 | `outputs/orchestration/iteration-8-runbook.md` |

## 二、10 个场景汇总

| # | 场景 | 验证手段 | 期望 |
|---|---|---|---|
| 1 | 超卖（qty=999）| 直接调 OMS create | 返回"库存不足" |
| 2 | 并发下单 5 个（同 SKU 各 1 件）| bash `&` 并发 + wait | 成功数 = available 减少数（行锁守护）|
| 3 | 幂等键复用 | 同 Idempotency-Key 调两次 | 返回同一 order_no |
| 4 | SKU 下架 | UPDATE pim_db.skus.status='disabled' | 返回"下架"或"不存在" |
| 5 | 空购物车 submit | 清空 → submit | 返回"请先勾选商品" |
| 6 | 重复支付 | 第二次 callback | 状态机拦截（非法转移）|
| 7 | 取消已支付订单 | 对 #6 paid 单调 cancel | 返回"不可取消" |
| 8 | 非本人取消 | user_id=999 取消他人订单 | 拦截（"非本人"或状态错）|
| 9 | 无效 JWT | 伪 token 调 /user/me | 401 拦截 |
| 10 | WMS 不可达 | docker-compose stop wms-backend | OMS 仍 paid + picking_orders.status=failed |

## 三、预测结果

基于代码审计，预计：
- 场景 1, 3, 5, 7, 8, 9, 10：**已有保护，应 PASS**
- 场景 2：行锁就绪，**应 PASS**（除非有罕见 race）
- 场景 4：依赖 PIM Sku::batch 是否过滤了 status=enabled。**可能 FAIL**——需要看 OMS::fetchSkusFromPim 拿到 status=disabled 后能否拦下
- 场景 6：依赖 OrderStateMachine paid→paid 是否被拒。**应 PASS**

## 四、用户实测结果（10/10 PASS）

| # | 场景 | 实测响应 | 结果 |
|---|---|---|---|
| 1 | 超卖 qty=999 | `{"code":500,"msg":"库存不足: SPU001-001"}` | ✅ |
| 2 | 5 并发下单 | 5 成功，库存 99→94（精准减 5）| ✅ |
| 3 | 幂等键复用 | 两次同一 `SO202605260912377700` | ✅ |
| 4 | SKU 下架 | `"SKU 已下架: SPU001-001"` | ✅ |
| 5 | 空购物车 submit | `"请先勾选商品"` | ✅ |
| 6 | 重复支付 | `"状态非法转移: paid → paid"` | ✅ |
| 7 | 取消已 paid | `"订单当前状态不可取消: paid"` | ✅ |
| 8 | 非本人取消 | `"非本人订单"` | ✅ |
| 9 | 无效 JWT | `"token 无效或过期"` | ✅ |
| 10 | WMS 不可达 | 订单状态 paid + picking_orders.status=failed | ✅ |

## 五、本轮带来的工程检验（不需新代码）

| 检验项 | 落地代码 |
|---|---|
| 行锁防超卖 | `OMS InventoryService::lockBatch` 用 `Db::lock(true)` |
| 幂等通过唯一索引 | `orders.idempotency_key` 唯一索引 + `OrderService::create` 头查 |
| 状态机非法转移拒绝 | `OrderStateMachine::can()` 显式枚举 |
| 跨服务失败不抛 | `OrderService::dispatchToWms` try/catch，仅本地 picking_orders 改 failed |
| JWT 鉴权完整链 | `Auth middleware` 401 + 前端 http 拦截 401 → 跳登录 |
| PIM 校验 SKU 价格/状态 | `OrderService::fetchSkusFromPim` 检查 `status === 'enabled'` |
| 业务方校验非本人 | `OrderService::cancel` 二次校验 user_id |

## 六、本轮发现的脚本本身问题（1 项，非业务 bug）

| # | 问题 | 修复 |
|---|---|---|
| 1 | `set -u` 严格模式 + bash 解析中文 + 变量时偶发 unbound variable 误报 | 去掉 `set -u`，显式初始化所有计数器变量（`PASS=0 FAIL=0 OK_COUNT=0 FAIL_COUNT=0`）|

## 七、剩余可改进项（M2+，非阻塞）

| 编号 | 事项 | 处理 |
|---|---|---|
| Q8-01 | 场景 7/8 输出"被中文截断的订单号"显示问题（不影响功能）| M2 优化脚本 echo 输出 |
| Q8-02 | 真正的并发压测（hey/wrk 100/1000 QPS）| Phase 4 性能压测时做 |
| Q8-03 | 网络分区场景（OMS↔WMS Toxiproxy）| M2 |
| Q8-04 | 订单超时自动取消（30 分钟未支付）| M2 schedule worker |
| Q8-05 | 库存对账定时任务（OMS 与 WMS 偏差告警）| M2 |

## 八、对账结论

✅ **10/10 边界场景实测通过**。Phase 2 主线所有业务防护代码经实战检验合格，可以放心进入 Phase 3 或其他横向扩展。

## 九、对账时间
2026-05-26

## 十、本对账使用的 skill
- `karpathy-guidelines`（用 bash + curl 而不引入 phpunit；并发验证用 bash `&` 而非引入 hey/wrk；脚本本身有问题不画蛇添足，直接去掉过严的 `set -u`）
