# reconcile-report-iteration-22.md · WMS 智能化

## 【当前焦点】
WMS 三件套：
- 实时盘点（M3-05）：draft → 起盘 snapshot → 录入 → 完成 tx 内调差
- 调拨（M3-05）：单 SKU 简化版，draft → ship(from locked++) → receive(双库位增减)
- 上架推荐 Top3（M3-04）：算法权重 = 已有库位聚集 + 黄金库位 + 同区空位 + 剩余容量

## 一、文件清单（详见 [runbook §一](iteration-22-runbook.md#一文件清单共-18-文件6-wave)）
~18 个文件：3 migrations + 5 wms-backend + 5 Vue + 3 测试/文档 + 2 reconcile/runbook 自身。

## 二、关键设计决策（详 [runbook §三](iteration-22-runbook.md#三关键设计决策)）

| 主题 | 决策 |
|---|---|
| 盘点 scope | 4 种粒度 |
| 调拨粒度 | 单 SKU 单批次（M3+ 加多 SKU 批量） |
| 推荐权重 | 已有(40) + 黄金(30) + 同区(20) + 容量(10) |
| RBAC | warehouse + super_admin |
| 不引入事件 | WMS 内闭环，inventory_log 追溯 |

## 三、避坑（详 [runbook §五](iteration-22-runbook.md#五避坑)）
9 项：snapshot 隔离 / inventory 并发 lock / from 不足 / 重复 ship / 同库位调拨 / 推荐 N+1 / 状态过滤 / 空推荐兜底 / 空 scope 兜底。

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-6 | WMS 入库/出库基线，本 iter 加智能化 |
| iter-11 | 仓库/库位 CRUD，本 iter 在 locations 上做推荐 |
| iter-12 | 入库事件，本 iter 不引入新事件 |
| iter-17 | RBAC，新接口走 warehouse + super_admin |
| **iter-22** | **WMS 智能化三件套** |

## 五、剩余非阻塞（M3+）
详 [runbook §七](iteration-22-runbook.md#七剩余非阻塞m3)：Q22-01 ~ Q22-06。

## 六、待用户运行验证
- auto-test 我跑（curl）→ `outputs/testing/iteration-22-auto-test.md`
- manual-test 用户跑（Vue UI）→ `outputs/testing/iteration-22-manual-test.md`

## 七、对账结论
✅ runbook 定稿，进入 6 Wave 落地。

## 八、对账时间
2026-06-01

## 九、本对账使用的 skill
- `karpathy-guidelines`（调拨单 SKU 简化不引入复杂模型 / 推荐权重写死不抽配置 / 不引入跨服务事件）
- `.agents/testing/SKILL.md`（auto + manual 拆分硬约束延续）
