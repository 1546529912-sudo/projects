# reconcile-report-iteration-21.md · 运营 Dashboard 增强四件套

## 【当前焦点】
四件套（B 导出加券列 / 评价统计 / 用户留存复购 / 券核销率图）全 Dashboard 端 — 后端 stats 大响应模式延续 iter-18。

## 一、文件清单（详见 [runbook §一](iteration-21-runbook.md#一文件清单共-5-文件3-wave)）
**实际修改代码文件只 2 个**（Admin.php + Dashboard.vue）+ 4 文档/测试。

## 二、关键设计决策（详 [runbook §三](iteration-21-runbook.md#三关键设计决策)）

| 主题 | 决策 |
|---|---|
| 单接口 | `/admin/stats` 继续大响应 |
| 跨库 | 复用 OMS shop 副连接（iter-20 加） |
| 复购定义 | ≥2 单（排 pending_pay） |
| 评价均分 | 仅 active |
| 周月 | 复用 days 参数，不引入"维度"切换 |

## 三、避坑（详 [runbook §四](iteration-21-runbook.md#四避坑)）
5 项：跨库 count / used_count vs user_coupons.used_at 权威性 / 隐藏评价不计入均分 / CSV LEFT JOIN GROUP BY 兜底 / 时间序列补 0。

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-18 | Dashboard ECharts + stats 大响应模式 — 本 iter 直接延续 |
| iter-19 | 优惠券 — 本 iter 给券加核销率图 |
| iter-20 | 评价 + shop 副连接 — 本 iter 复用副连接读评价/用户统计 |
| **iter-21** | **运营 Dashboard 增强四件套** |

## 五、剩余非阻塞（M3+）
详 [runbook §六](iteration-21-runbook.md#六剩余非阻塞m3)：Q21-01 ~ Q21-05。

## 六、待用户运行验证
- auto-test 我跑（curl）→ `outputs/testing/iteration-21-auto-test.md`
- manual-test 用户跑（Vue Dashboard）→ `outputs/testing/iteration-21-manual-test.md`

## 七、对账结论
✅ runbook 定稿，进入 3 Wave 落地。本 iter 是"无新表 + 无新页 + 无新菜单"的纯加强 iter。

## 八、对账时间
2026-06-01

## 九、本对账使用的 skill
- `karpathy-guidelines`（无新依赖；不引入"周/月"维度切换；不细分时间窗留存；不抽 MetricsService）
- `.agents/testing/SKILL.md`（auto + manual 拆分硬约束延续）
