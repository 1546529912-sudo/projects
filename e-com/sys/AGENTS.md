# AGENTS.md · 角色清单与调度规则

## 角色清单

| 角色 | 目录 | 启动条件 | 关键产物 |
|---|---|---|---|
| 主控 (orchestrator) | [.agents/orchestrator/](/.agents/orchestrator/) | 项目启动即在岗 | progress.md / runbook / reconcile-report |
| 产品 (product) | [.agents/product/](/.agents/product/) | Phase -1 启动 | 5 份产物（见 SKILL.md） |
| 设计 (design) | [.agents/design/](/.agents/design/) | design-brief 已确认 + Phase 0 | 原型图 / design-system / airbnb-components-map |
| 架构 (architecture) | [.agents/architecture/](/.agents/architecture/) | Phase 0 | tech-stack / data-schema / api-list / module-deps / data-flow |
| 开发 (development) | [.agents/development/](/.agents/development/) | Phase 1+ | 代码 + 产物清单 |
| 测试 (testing) | [.agents/testing/](/.agents/testing/) | 每个 Phase 末尾 | phase-N-auto-test / phase-N-manual-test |

## 调度顺序

```
Phase -1: 产品（5 份产物） → 用户确认
   ↓
Phase  0: 设计 + 架构并行
   ↓
Phase  1: 工程骨架（4 PHP + 小程序 + Vue 后台 + docker-compose）
   ↓
Phase  2: 单系统 MVP 开发（商城 → PIM → OMS → WMS）
   ↓
Phase  3: 跨系统联调（下单→履约）
   ↓
Phase  4: 测试 + 文档 + 上线准备
```

## 跨角色硬约束

- 产品未交 5 份产物：设计/架构/开发**禁止启动**
- design-brief 未确认：设计 Agent 必须主动向用户索要，禁止自行出图
- 开发未交"产物清单"：progress.md 不得标完成
- 测试 Agent 提交"全是【待填写】"的报告：视为未提交

## 调度通信约定

- 所有 Agent 通过 progress.md 同步状态（只读）
- 阻塞/升级写入 progress.md 的【当前问题】区
- 不允许 Agent 之间直接通信，必须走主控转发
- 主控每次 Phase 切换前生成 reconcile-report-iteration-N.md
