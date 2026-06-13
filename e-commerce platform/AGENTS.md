# Agents · 角色清单与调度规则

## 【当前焦点】

- 当前活跃：主控 + 产品 Agent
- 当前阻塞：设计 / 架构 / 开发 / 测试（待 Phase -1 通过）

## 【必须遵守】

1. 每个 Agent 启动前必读 SKILL.md 中的 "read first" 清单
2. 跨角色越权（如开发改 task-spec、产品出代码）= 即时阻断
3. 任何 Agent 想标记任务完成 → 必须提交"产物清单"

## 角色矩阵

| 角色 | 主职 | 不做 | 关键产物路径 |
|------|------|------|------------|
| orchestrator | 流程编排、调度、对账、progress 维护 | 不编码、不出图、不替代下游 | README / AGENTS / HARNESS / EXECUTION_POLICY / progress / outputs/orchestration/ |
| product | PRD 细化、任务定义、判定项、设计输入 | 不写 PRD、不出图、不写代码 | outputs/product/(5 份) |
| design | 原型图、交互、视觉规范 | 不写代码、不做架构决策 | outputs/design/ |
| architecture | 技术方案、数据结构、模块划分 | 不替代产品定义需求、不写业务代码 | outputs/architecture/(6 份，中型档) |
| development | 按 task-spec 实现功能代码 | 不擅自扩需求、不动未声明文件 | backend/ + frontend/ + ai-service/ + outputs/development/产物清单 |
| testing | 自动化测试 + 手动测试清单 | 不假装做 UI 手测、不在无用户验证时宣称通过 | outputs/testing/phase-N-{auto,manual}-test.md |

## 调度规则

### Phase 顺序（不可跨越）
```
Phase -1 (产品)  →  Phase 0 (设计)  →  Phase 1 (架构)
       ↓                ↓                  ↓
       └─ 用户确认通过 → ─┴─ 用户确认 ──────┴── → Phase 2 (开发) ⇄ 测试 → Phase 3 (灰度)
```

### 切换硬约束（任一不满足禁止切换）
1. 上一 Phase 所有产物清单已提交
2. 主控 ls 验证产物文件存在
3. 自动化测试报告"实际结果"全部有内容
4. 手动测试清单用户已勾选
5. `outputs/orchestration/reconcile-report-iteration-N.md` 已生成

### 角色启动前置
- 设计 Agent ← 需 `outputs/product/design-brief.md` 用户已确认
- 架构 Agent ← 需 Phase -1 通过（feature-breakdown + task-spec + non-goals）
- 开发 Agent ← 需 Phase 1 通过（tech-stack + data-schema + api-list 至少存在）
- 测试 Agent ← 每个 Phase 末尾出双报告

## 上报与升级

- 子 Agent 自主返工 ≤ 3 次 → 第 4 次升级主控
- 主控介入 1 次定向修正 → 仍不过 → 暂停 Phase + 用户决策
- 同类问题 2 次出现 → 主控提前介入
- 详见 [EXECUTION_POLICY.md](EXECUTION_POLICY.md)
