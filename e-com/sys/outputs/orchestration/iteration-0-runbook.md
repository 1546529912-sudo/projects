# iteration-0-runbook.md · Phase -1 调度记录

## 【当前焦点】
项目初始化首轮。本轮目标：
1. 搭建治理骨架（README / AGENTS / HARNESS / EXECUTION_POLICY / progress.md + 6 个 SKILL.md）
2. 产品 Agent 执行 Phase -1，产出 5 份产物
3. 主控完成第一份对账报告

## 本轮参与角色
- ✅ 主控：搭骨架 + 对账
- ✅ 产品：5 份 Phase -1 产物
- ⏸ 设计/架构/开发/测试：未启动（依赖产品产物用户确认）

## 已确认的项目默认值（2026-05-24 对话锁定）
14 项已全部接受，详见 [README.md](../../README.md) 末尾"已确认的项目默认值"。

## 本轮已扫 skill 清单
启动时 `ls ~/.claude/skills/` 命中以下与本项目相关：
- PM 类：`prd-development` / `user-story` / `user-story-splitting` / `jobs-to-be-done` / `problem-statement` / `epic-breakdown-advisor` / `epic-hypothesis` / `user-story-mapping` / `prioritization-advisor`
- 设计：`web-design-guidelines`
- 编码：`karpathy-guidelines`
- 流程：`skill-authoring-workflow` / `workshop-facilitation` / `loop` / `schedule`

产品 Agent 在 5 份产物中均已列出"本任务匹配到的 skill 清单"。

## 本轮决定的下一步
- 用户检视 `outputs/product/*` 5 份产物
- 用户确认 → 切 Phase 0，并行启动 设计 Agent + 架构 Agent
- 用户驳回 → 产品 Agent 按反馈返工，本轮 runbook 关闭并开 iteration-1

## 升级与阻塞
（本轮无）

## 对账触发
本 runbook 完成后立即生成 [reconcile-report-iteration-0.md](reconcile-report-iteration-0.md)。
