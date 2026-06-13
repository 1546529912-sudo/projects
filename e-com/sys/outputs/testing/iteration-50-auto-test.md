# iteration-50-auto-test.md · 商家自助提现（Q35-03 / Q39-03）

> 主控自动跑（curl / docker exec / DB 验证），用户无需操作。

## 范围
- **回填 BIZ-08 多商家最后一公里**：商家自助申请提现 + 平台审批 + 平台标记打款 全链路
- 状态机：`pending → approved → paid / ↘ rejected`
- 余额算法：`balance = SUM(settlement_orders.amount WHERE store_id=X) - SUM(approved 已锁) - SUM(paid 已打)`
  - settlement 含 order(+) / platform_commission(-) / refund(-) 三类
  - pending 状态**不锁定**余额（避免乱占）
  - approved/paid 才锁定
- RBAC：
  - **store_owner / store_staff**：申请 + 查自己店余额 + 看自己提现单
  - **super_admin**：审批 / 打款 / 拒绝
  - **sales_ops**：只读列表
  - warehouse / editor：HTTP 403（不在路由角色组）

## 前置
- 4 账号：admin / sales / shopowner1（store#2 商家）/ warehouse
- store#2 settlement 净额：order 800,900 - commission 79,990 = ¥7,209.10

## 用例（共 15 项，全 PASS）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | super 查 store#2 余额 | balance=720910 settled_net=720910 | balance:720910 settled_net:720910 pending:0 paid:0 ✅ | ✅ |
| T2 | super 查 store#1（平台）| note="平台店不支持提现" | note 匹配 ✅ | ✅ |
| T3 | shopowner1 查自己（不传 store_id 自动） | balance:720910 | balance:720910 store_id:2 ✅ | ✅ |
| T4 | shopowner1 申请 ¥1000 (100000 分) | code:0 status=pending withdrawal_no=WD\* | code:0 no:WD202606041438521923 status:pending amount:100000 ✅ | ✅ |
| T5 | 申请后查余额（pending 不锁） | balance 仍 720910 | balance:720910 pending:0 ✅ | ✅ |
| T6 | shopowner1 列表自动按 store_ids 过滤 | total=1 first=WD\* | total:1 first:WD\* ✅ | ✅ |
| T7 | super 审批通过 | code:0 status=approved approved_by=admin | code:0 status:approved approved_by:admin ✅ | ✅ |
| T8 | 审批后余额锁定 100000 | balance 620910 pending_approved 100000 | balance:620910 pending_approved:100000 ✅ | ✅ |
| T9 | super 标记打款 method=bank ref=ALI20260604001 | code:0 status=paid 方法+流水回写 | code:0 status:paid method:bank ref:ALI20260604001 ✅ | ✅ |
| T10 | 打款后余额（paid 替代 pending） | balance 620910 paid 100000 pending 0 | balance:620910 pending:0 paid:100000 ✅ | ✅ |
| T11 | warehouse 调任意提现接口 | HTTP 403（路由角色不含 warehouse） | HTTP 403 ✅ | ✅ |
| T12 | shopowner 申请超过余额 | 400 "超过可提现余额" | code:400 msg:超过可提现余额（当前 ¥6,209.10）✅ | ✅ |
| T13 | shopowner 申请负数金额 | 400 "金额必须 > 0" | code:400 msg:提现金额必须 > 0 ✅ | ✅ |
| T14 | super 重复 approve 已 paid 单 | 400 状态机拒 | code:400 msg:当前状态 paid 不允许转 approved（需 pending）✅ | ✅ |
| T15 | super 自己调 apply | 403 "仅商家可申请" | code:403 msg:仅商家可申请提现 ✅ | ✅ |

## 实施修复

| # | 问题 | 修复 |
|---|---|---|
| fix-1 | 初版路由 plain `POST admin/withdrawal` 放参数路由前 → approve/reject/pay 被 apply 吃掉返 403"仅商家可申请提现"（同 iter-19 路由顺序坑）| 调整为参数路由在前，plain POST 在后。**经验：TP 路由匹配按声明顺序，参数路由（含 \<no\> 等）必须在 plain 路径前；这是项目第 N 次踩坑（iter-10/19/27 都有过），应当默认形成肌肉记忆** |
| fix-2 | 初版 AuditService::log 调用传 `$requestedBy` 给 reason 参数位（签名是 action, targetType, targetId, before, after, reason, operator 7 参）| 改为 6 参传 null 占 reason、第 7 参传 operator。**经验：静态调用多参签名容易错位，签名含可选 nullable 参时尤其；建议要么用命名参数（PHP 8+）要么 wrapper 函数** |

## 文件清单（~9 个）
- 1 新 migration（store_withdrawals 表，含 withdrawal_no / store_id / amount / balance_at_apply / status / 4 个 operator 时间字段 / paid_method+ref / remark + 3 索引）
- 1 新 service（WithdrawalService：getBalance + apply + approve/reject/markPaid（transitState helper）+ list + detail，全 tx 包裹 + lock(true) 防并发）
- 1 新 controller（Withdrawal：balance/apply/list 按 role 分流 + approve/reject/pay 仅 super_admin + storeId 自动从 store_ids 推导）
- 1 编辑 PHP（OMS route + 6 路由，middleware 限 super+sales+store_owner+store_staff）
- 1 编辑 ts（apis/oms.ts +6 方法）
- 1 编辑 ts（stores/auth.ts +canSeeWithdrawal/canApproveWithdrawal/canApplyWithdrawal 3 computed）
- 1 新 Vue（pages/oms/Withdrawals.vue：4 余额卡（仅商家）+ 状态过滤 + 状态彩色 tag + 申请弹框（元→分换算）+ 审批/拒绝/打款 3 action 按钮 v-if=canApproveWithdrawal）
- 1 编辑 ts（router/index.ts +1 路由 /oms/withdrawals）
- 1 编辑 Vue（AdminLayout OMS 子菜 +"💰 商家提现"v-if=canSeeWithdrawal）

## 总结
**15/15 ✅ + 2 fix**（fix 都在 auto 阶段捕获修完）

- 完整状态机 + 6 endpoint 链路通：余额查询 / 申请 / 列表 / 审批 / 拒绝 / 打款
- 余额算法正确（pending 不锁定 / approved+paid 锁定 / settlement 净额减提现锁定）
- RBAC 4 层守卫：① 路由 middleware 限角色 ② controller role 检查 ③ store_owner 自动按 store_ids 过滤本店 ④ 状态机非法转移拒
- 审计：每次 apply/approve/reject/pay 写 admin_audit_log（沿 iter-15 模式）

## 🎉 BIZ-08 多商家平台 "最后一公里" 收口

完整商家闭环：
1. ✅ iter-35 架构地基（stores / store_admins）
2. ✅ iter-36 PIM 多店化
3. ✅ iter-37 OMS 多店化 + 订单拆单 + 抽佣
4. ✅ iter-38 WMS 多店化
5. ✅ iter-39 入驻流程 + 店铺自管
6. ✅ **iter-50 商家自助提现**（本轮，Q35-03/Q39-03 回填）

ⓘ 下一步候选：① Q40-01/Q41-01 小程序跳转修 ② M3-02 真实微信支付 ③ 跑积压 manual-test ④ M3-08 性能压测
