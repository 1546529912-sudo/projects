# reconcile-report-iteration-23.md · 多 SKU 批量调拨单（Q22-01）

## 【当前焦点】
把 iter-22 的"单 SKU 一头一明细"调拨模式升级为"一头多明细"，支持单次调拨多个 SKU + 各自独立 from→to 库位。

## 一、文件清单（详见 [runbook §一](iteration-23-runbook.md#一文件清单共-7-文件3-wave)）
~7 个：1 migration + 2 后端 + 2 Vue + 2 测试。

## 二、关键设计决策（详 [runbook §三](iteration-23-runbook.md#三关键设计决策)）

| 主题 | 决策 |
|---|---|
| 头/明细 | transfers 头 + transfer_items 明细 |
| 异构方向 | 同单内每明细自带 from/to 库位 |
| 状态机 | 全单维度，不下沉到行 |
| 旧数据 | inline 字段改 nullable，老 4 条 legacy 单 SKU 保留 |

## 三、避坑（详 [runbook §五](iteration-23-runbook.md#五避坑)）
7 项：items 空 / 同行 from=to / ship rollback / batch 默认 / 不支持部分接收 / legacy 展示 / Vue 行级联动。

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-22 | 单 SKU 调拨 + UX 联动 fix-3，本 iter 把联动套用到行级别 |
| iter-15 | 退货凭证多文件模式（一头多附件）参考 |
| **iter-23** | **多 SKU 批量调拨** |

## 五、剩余非阻塞（M3+）
详 [runbook §七](iteration-23-runbook.md#七剩余非阻塞m3)：Q23-01 ~ Q23-03。

## 六、待用户运行验证
- auto-test 我跑（curl）→ `outputs/testing/iteration-23-auto-test.md`
- manual-test 用户跑（Vue UI）→ `outputs/testing/iteration-23-manual-test.md`

## 七、对账结论
✅ runbook 定稿，进入 3 Wave 落地。

## 八、对账时间
2026-06-02

## 九、本对账使用的 skill
- `karpathy-guidelines`（不引入"行级状态机"复杂度 / 不引入"行级取消" / Vue 行级联动直接 copy iter-22 fix-3）
- `.agents/testing/SKILL.md`（auto + manual 拆分硬约束延续）
