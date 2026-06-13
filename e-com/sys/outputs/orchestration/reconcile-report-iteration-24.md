# reconcile-report-iteration-24.md · WMS 完整化 + OMS 对接补齐

## 【当前焦点】
P0+P1 五件套：
- P0-1 WMS inventory_log（库存变动全表日志）
- P0-2 调拨同步 OMS（事件扩展不新增 stream）
- P0-3 盘点同步 OMS（事件扩展）
- P1-1 拣货任务独立 API（list/assign/scan/complete）
- P1-2 WMS-OMS 库存对账工具（admin 接口 + Vue 页 + 对账日志表）

## 一、文件清单（详见 [runbook §一](iteration-24-runbook.md#一文件清单共-20-文件6-wave)）
~20 个：2 migrations + 9 wms-backend（3 service + 4 controller/route + ...）+ 1 oms-backend handler + 5 Vue + 2 测试/文档。

## 二、关键设计决策（详 [runbook §三](iteration-24-runbook.md#三关键设计决策)）

| 主题 | 决策 |
|---|---|
| log 粒度 | 每次 quantity/locked 改动都写，含 before/after |
| 事件扩展 | 延续 iter-14 经验：扩 `wms.inventory.changed` 不新增 stream |
| OMS handler 分支 | refund_no / transfer_no（仅审计）/ take_no（available +/- delta）/ default inbound |
| 对账算法 | 单次扫描 + diff 记录；不自动修复 |
| RBAC | 全部 warehouse + super_admin |

## 三、避坑（详 [runbook §五](iteration-24-runbook.md#五避坑)）
8 项：日志写失败回滚 / log 体量 / 事件 schema 兼容 / 调拨 delta 计算 / 短时不一致 / 拣货并发扫描 / 对账并发 / 负 delta 兜底。

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-9 | 异步事件总线，本 iter 沿用 + 字段扩展 |
| iter-12 | wms.inventory.changed 入库链路，本 iter 加调拨/盘点分支 |
| iter-14 | 字段扩展模式（refund_no），本 iter 完全照搬到 transfer_no/take_no |
| iter-22 | 盘点 + 调拨 业务实现，本 iter 给它们加 log + OMS 同步 |
| iter-23 | 多 SKU 调拨，本 iter 加 inventory_log + OMS 同步 |
| **iter-24** | **WMS 完整化 + OMS 对接补齐** |

## 五、剩余非阻塞（M3+）
详 [runbook §七](iteration-24-runbook.md#七剩余非阻塞m3)：Q24-01 ~ Q24-07。

## 六、待用户运行验证
- auto-test 我跑（curl + DB 验证）→ `outputs/testing/iteration-24-auto-test.md`
- manual-test 用户跑（Vue UI）→ `outputs/testing/iteration-24-manual-test.md`

## 七、对账结论
✅ runbook 定稿，进入 6 Wave 落地。

## 八、对账时间
2026-06-02

## 九、本对账使用的 skill
- `karpathy-guidelines`（字段扩展不新增 stream / log 不抽 ORM Model / 对账不自动修复）
- `.agents/testing/SKILL.md`（auto + manual 拆分硬约束延续）
