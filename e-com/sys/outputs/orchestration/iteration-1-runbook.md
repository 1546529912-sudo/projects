# iteration-1-runbook.md · Phase 0 调度记录

## 【当前焦点】
Phase -1 用户确认通过（2026-05-24），本轮目标：
1. 设计 Agent 出 prototype-spec + design-system + airbnb-components-map
2. 架构 Agent 出 tech-stack + data-schema + api-list + module-deps + data-flow
3. 主控完成 iteration-1 对账

## 本轮参与角色
- ✅ 主控：调度 + 对账
- ✅ 设计：3 份产物
- ✅ 架构：5 份产物（并行）
- ⏸ 开发/测试：未启动（依赖 Phase 0 用户确认）

## 本轮调度顺序
两个 Agent 无依赖关系，**并行启动**：
- 设计 Agent 读 [design-brief.md](../product/design-brief.md) + 访问 Airbnb 仓库
- 架构 Agent 读 [task-spec.md](../product/task-spec.md) + [feature-breakdown.md](../product/feature-breakdown.md)

## 关于原型图（重要说明）
本环境无法生成可视化原型图（Figma/Sketch 等位图）。设计 Agent 交付的"原型图"采用 **markdown 文本规范** 形式：
- 详细布局描述（每个区块的位置 / 字段 / 字号 / 间距）
- 状态枚举（默认/加载/空/错/特殊态）
- 交互说明（点击/滑动/输入等行为）
- 与 Airbnb 组件的对应关系

这份规范可直接转交给前端 Agent 在 Phase 1 实现，或交给可视化设计工具/真人设计师转化为位图。如需 HTML 交互原型，可在 Phase 1 单独立项（不在本轮范围）。

## 本轮已扫 skill 清单
- 设计相关：`web-design-guidelines`（已就位）
- 编码相关：`karpathy-guidelines`（架构 Agent 用）
- 新增可用但本轮不调起：`prototype-html`（如需 HTML 原型可下轮启用）/ `animal-island-ui-style`（与已固化的 Airbnb 风格冲突，本项目不用）

## 升级与阻塞
（本轮无）

## 对账触发
本 runbook 完成后立即生成 [reconcile-report-iteration-1.md](reconcile-report-iteration-1.md)。
