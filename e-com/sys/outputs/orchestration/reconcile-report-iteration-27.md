# reconcile-report-iteration-27.md · 优惠券高级三件套

## 【当前焦点】
- Q19-01 商品券 / 品类券（coupons.scope_type/value）
- Q19-02 新人券 / 自动发券（coupon_auto_rules + 注册触发）
- Q19-03 多券叠加（order_coupons + 满减先 / 折扣后）

## 一、文件清单（详见 [runbook §一](iteration-27-runbook.md#一文件清单共-25-文件7-wave)）
~25 个：3 migrations + OMS 3 service 改 + 1 service + 1 controller 新 + shop-backend 3 service/controller 改 + 1 service 新 + Vue 1 改 1 新 + 小程序 4 改。

## 二、关键设计决策（详 [runbook §三](iteration-27-runbook.md#三关键设计决策)）

| 主题 | 决策 |
|---|---|
| 范围粒度 | spu_id / category_id JSON 数组 |
| 多券规则 | 1 满减 + 1 折扣；满减先算 |
| 自动发券触发 | 首次登录创建用户即调 grant |
| OrderService 兼容 | ids 数组优先 + 老单数回落 |
| 数据库强约束 | order_coupons UNIQUE(order_no, coupon_type) |

## 三、避坑（详 [runbook §五](iteration-27-runbook.md#五避坑)）
7 项：多券超叠 / 范围为空 / 自动发券死循环 / NULL 处理 / 老用户重复触发 / 算法顺序 / 旧 API 兼容。

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-19 | 优惠券基础，本 iter 加 scope + 自动发券 + 多券叠加 |
| **iter-27** | **优惠券高级三件套** |

## 五、剩余非阻塞（M3+）
详 [runbook §七](iteration-27-runbook.md#七剩余非阻塞m3)：Q27-01 ~ Q27-05。

## 六、待用户运行验证
- auto-test 我跑（curl）→ `outputs/testing/iteration-27-auto-test.md`
- manual-test 用户跑（小程序 + Vue）→ `outputs/testing/iteration-27-manual-test.md`

## 七、对账结论
✅ runbook 定稿，进入 7 Wave 落地。

## 八、对账时间
2026-06-02

## 九、本对账使用的 skill
- `karpathy-guidelines`（folder 兼容老 API / scope 不引入条件 DSL / 多券强约束让 DB 兜底）
- `.agents/testing/SKILL.md`（auto + manual 拆分硬约束延续）
