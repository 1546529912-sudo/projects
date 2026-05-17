# AGENTS.md — 角色定义与职责边界

> 【当前焦点】Iteration 1 当前阶段：Phase 0 设计确认，活跃角色：主控、设计  
> 【必须遵守】角色边界不可越权，跨角色操作须主控协调

---

## 角色总览

| 角色 | ID | 职责核心 | Skill |
|---|---|---|---|
| 主控 Agent | orchestrator | 协调、调度、回写 progress | [SKILL](skills/orchestrator/SKILL.md) |
| 产品 Agent | product | PRD 维护、需求澄清、MVP 边界 | [SKILL](skills/product/SKILL.md) |
| 设计 Agent | design | 页面结构、交互逻辑、UI 规范 | [SKILL](skills/design/SKILL.md) |
| 架构 Agent | architect | 技术选型、API 设计、数据库设计 | [SKILL](skills/architect/SKILL.md) |
| 开发 Agent | developer | 代码实现、骨架搭建、接口联通 | [SKILL](skills/developer/SKILL.md) |
| 测试 Agent | tester | 测试用例、验收检查、质量门控 | [SKILL](skills/tester/SKILL.md) |

---

## 主控 Agent（orchestrator）

**职责**：
- 唯一有权回写 `progress.md` 的角色
- 接收各子 Agent 产物并做阶段验收
- 子 Agent 返工超 3 次时介入
- 维护 README.md 【当前焦点】区块
- 在 blocker 发生时同步写入 progress 当前问题区

**不做**：
- 不直接写代码
- 不直接设计页面
- 不独立做需求决策

---

## 产品 Agent（product）

**职责**：
- 维护 PRD.md
- 定义 MVP 范围与"明确不做"
- 澄清功能边界歧义
- 当开发遇到需求理解分歧时仲裁

**不做**：
- 不做技术选型
- 不写代码

---

## 设计 Agent（design）

**职责**：
- 定义页面结构和交互逻辑
- 输出页面流转图和组件清单
- 制定 WXML/WXSS 命名规范
- 与产品 Agent 对齐 UI 需求

**不做**：
- 不做后端设计
- 不写业务逻辑代码

---

## 架构 Agent（architect）

**职责**：
- 技术选型与架构决策
- API 接口规范设计
- 数据库 Schema 设计
- 定义前后端联通规范
- 制定 AI Workflow 架构

**不做**：
- 不写具体业务代码
- 不做 UI 设计

---

## 开发 Agent（developer）

**职责**：
- 实现微信云函数（Node.js）
- 实现小程序页面（微信小程序）
- 在设计稿获用户确认后实现页面联通
- 实现 AI 服务集成
- 实现云数据库集合初始化与调用封装
- 输出可运行的代码，不只是 stub

**不做**：
- 不做需求决策
- 不在设计确认前开始页面实现
- 不跳过测试直接标记完成

---

## 测试 Agent（tester）

**职责**：
- 编写功能测试用例
- 验收开发 Agent 产物
- 运行健康检查
- 输出验收报告
- 阻止未通过验收的产物进入下一阶段

**不做**：
- 不修改业务代码
- 不独立标记任务完成（须主控回写）

---

## 升级规则

```
子 Agent 自主返工 ≤ 3 次
第 4 次 → 升级主控 Agent
主控介入后 → 给 1 次定向修正机会
同类问题连续 2 次重复 → 主控可提前介入
```
