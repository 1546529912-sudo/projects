# reconcile-report-iteration-19.md · 优惠券 / 促销

## 【当前焦点】
业务扩展开篇：满减券 + 折扣券全链路。
后端 + Vue 后台 + 小程序三端齐改，下单 tx 内核销。

## 一、文件清单（详见 [runbook §一](iteration-19-runbook.md#一文件清单共-14-文件5-wave)）
14 个逻辑模块，~22 个文件层面（小程序四件套展开）。
代码量预估：~700 PHP + ~500 Vue/TS + ~400 小程序。

## 二、关键设计决策（详 [runbook §三](iteration-19-runbook.md#三关键设计决策)）

| 主题 | 决策 |
|---|---|
| 券类型 | threshold 满减 + percent 折扣两种 |
| 不含运费 | 折扣只针对 goods_amount |
| 核销时点 | 订单创建 tx 内一并完成 |
| 取消不返券 | 业务习惯，M3+ 可选 |
| 领取并发 | coupons + user_coupons 双 FOR UPDATE 锁 |
| Vue 菜单 | 新增"营销"父级 |

## 三、本轮主动避坑（详 [runbook §五](iteration-19-runbook.md#五避坑清单)）
9 项：并发超领 / 折扣减成负 / 时区 / 退订返券 / tx 一致性 / 过期改有效期 / 数值范围 / 不影响 export / 小数精度。

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-4 | 订单基线，本 iter 在 create 内插核销 |
| iter-7 | Vue 后台模式，本 iter 加"营销"父级 |
| iter-17 | RBAC，券管理走 super_admin + sales_ops 双角色 |
| iter-18 | 运营三件套，本 iter 开始业务扩展（运营 → 营销） |
| **iter-19** | **优惠券 / 促销** |

## 五、剩余非阻塞（M3+）
详 [runbook §七](iteration-19-runbook.md#七剩余非阻塞m3)：Q19-01 ~ Q19-07。

## 六、待用户运行验证
详 [runbook §六](iteration-19-runbook.md#六待用户运行3-步)。
- auto-test 我跑（curl）→ `outputs/testing/iteration-19-auto-test.md`
- manual-test 用户跑（小程序 + Vue）→ `outputs/testing/iteration-19-manual-test.md`

## 七、对账结论
✅ runbook 已定稿，立即进入 5 Wave 落地。

## 八、对账时间
2026-05-29

## 九、本对账使用的 skill
- `karpathy-guidelines`（券只做必需 2 种类型；不引入新依赖；折扣计算就地写在 OrderService 里，不抽 PromotionEngine）
- `.agents/testing/SKILL.md`（auto + manual 拆分硬约束延续）
