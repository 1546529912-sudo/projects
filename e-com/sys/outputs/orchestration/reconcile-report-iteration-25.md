# reconcile-report-iteration-25.md · WMS 增强四件套

## 【当前焦点】
四件套：
- WMS Dashboard（仓库利用率 / 入出库趋势 / 拣货效率 + KPI）
- 低库存预警（规则配置 + 实时告警）
- 入库流程整合上架推荐（autoComplete 默认用 recommend Top1）
- 出库 FIFO 分配（findAvailable 按 batch_no ASC）

## 一、文件清单（详见 [runbook §一](iteration-25-runbook.md#一文件清单共-16-文件5-wave)）
~16 个：1 migration + 5 wms-backend + 2 Vue + 测试/文档。

## 二、关键设计决策（详 [runbook §三](iteration-25-runbook.md#三关键设计决策)）

| 主题 | 决策 |
|---|---|
| Dashboard 单接口 | 沿用 iter-18/21 模式 |
| 阈值定义 | SUM(quantity - locked) < threshold |
| 入库推荐集成 | 缺 location_code 才用 recommend |
| FIFO | batch_no ASC + locked ASC |

## 三、避坑（详 [runbook §五](iteration-25-runbook.md#五避坑)）
6 项：大数据慢 / 分母 0 / 规则重复 / 推荐空 / FIFO 漂移 / 告警全表扫。

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-18/21 | OMS Dashboard 模式，本 iter 给 WMS 加 Dashboard |
| iter-22 | 上架推荐 LocationRecommendService，本 iter 集成到 autoComplete |
| iter-24 | inventory_log + 拣货任务，本 iter 给 Dashboard 提供数据源（拣货效率） |
| **iter-25** | **WMS 增强四件套** |

## 五、剩余非阻塞（M3+）
详 [runbook §七](iteration-25-runbook.md#七剩余非阻塞m3)：Q25-01 ~ Q25-04。

## 六、待用户运行验证
- auto-test 我跑（curl）→ `outputs/testing/iteration-25-auto-test.md`
- manual-test 用户跑（Vue UI）→ `outputs/testing/iteration-25-manual-test.md`

## 七、对账结论
✅ runbook 定稿，进入 5 Wave 落地。

## 八、对账时间
2026-06-02

## 九、本对账使用的 skill
- `karpathy-guidelines`（Dashboard 单接口大响应不拆 / 预警直接 SUM 不缓存 / 入库 recommend 不强制 / FIFO 改 ORDER 不引入策略类）
- `.agents/testing/SKILL.md`（auto + manual 拆分硬约束延续）
