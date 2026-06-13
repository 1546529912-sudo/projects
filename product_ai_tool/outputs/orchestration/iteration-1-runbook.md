# Iteration 1 Runbook

## 迭代名称

第一轮：基础壳与预览链路

## 本轮目标

跑通多 Agent 协作的第一轮最小闭环，优先完成 AI Demo 标注工具的基础工作台和 Demo 预览基础能力，为后续标注、AI 修改和版本管理打底。

本轮不追求完整 MVP，只聚焦“能形成稳定宿主页 + 能承载单 HTML Demo + 能约束页面识别协议”。

## 关联 progress 序号

- 1 搭建基础页面布局（顶栏 + 左侧面板 + 中间画布 + 右侧面板）
- 2 实现需求输入和模型选择（默认 `deepseek-v4-flash`）
- 4 使用 iframe 预览 HTML（推荐 `srcdoc`，可配合 sandbox）
- 5 约束 AI 生成 HTML：页面标识、`postMessage` 协议（`DEMO_READY`、`DEMO_PAGE_CHANGE` 等）

## 本轮不包含

- 3 接入 `deepseek-v4-flash` 并生成完整 Demo
- 6-12 标注能力与列表联动
- 13-15 AI 修改、版本保存、回退与风险提示

说明：第 3 项虽然与生成链路相关，但第一轮先允许用静态示例 HTML 或受控假数据替代，优先把工作台、iframe 承载方式和协议约束做实；真实模型口径固定为 `deepseek-v4-flash`。

## 主控判断

本轮适合作为第一轮协作起点，原因如下：

- 范围明确，依赖最少
- 能验证产品、设计、架构、开发、测试五角色交接是否顺畅
- 失败成本低，便于快速调整协作方式
- 为后续标注 overlay 和 `pageKey` 过滤提供稳定基础

## 角色调度顺序

1. 产品 Agent
2. 设计 Agent
3. 架构 Agent
4. 开发 Agent
5. 测试 Agent
6. 主控 Agent 汇总并回写 `progress.md`

## 各角色任务

### 产品 Agent

任务：

- 明确本轮 1、2、4、5 的范围边界
- 写清本轮用户可完成的动作
- 写清本轮验收标准
- 写清第一轮明确不做的内容，避免误入标注和版本范围
- 明确当前项目模型口径固定为 `deepseek-v4-flash`

产物：

- `outputs/product/feature-list.md`

完成门槛：

- 每个功能点都有场景、动作、验收标准、第一版不做
- 明确本轮允许使用静态示例 HTML 替代真实模型生成

### 设计 Agent

任务：

- 明确基础工作台布局
- 明确顶栏、左侧输入区、中间画布区、右侧信息区的优先级
- 明确 iframe 区域与未来 overlay 的叠放预留
- 明确空状态、加载态、无 Demo 时的预览占位表现

产物：

- `outputs/design/framework-proposal.md`

完成门槛：

- 已覆盖布局骨架和关键状态
- 已说明与 `DESIGN.md` 的组件映射关系

### 架构 Agent

任务：

- 明确第一轮技术选型
- 明确 iframe 预览承载方案：`srcdoc`、sandbox、消息监听边界
- 明确 Demo 协议最小集合：`DEMO_READY`、`DEMO_PAGE_CHANGE`
- 明确 `pageKey` 的最小要求与宿主如何接收

产物：

- `outputs/architecture/tech-selection.md`

完成门槛：

- 技术选型可支撑后续标注和版本链路
- 已明确消息协议和宿主边界
- 未把标注数据写入 Demo HTML

### 开发 Agent

任务：

- 实现基础布局
- 实现需求输入和模型选择 UI（默认 `deepseek-v4-flash`）
- 实现 iframe 预览区
- 接入静态示例 HTML 或本地 mock 数据
- 支持最小 `postMessage` 接收与当前 `pageKey` 更新

产物：

- `outputs/development/iteration-1-module-complete.md`

完成门槛：

- 页面可运行
- 可展示单 HTML Demo
- 宿主可收到最小协议消息
- 代码结构未阻碍后续 overlay 接入

### 测试 Agent

任务：

- 对照本轮 1、2、4、5 做验收
- 检查 iframe 是否正常承载 Demo
- 检查 `pageKey` 与最小协议是否能跑通
- 检查是否误做了本轮范围外功能

产物：

- `outputs/testing/iteration-1-test-report.md`

完成门槛：

- 对每个关联 `progress` 条目给出通过/不通过结论
- 对不通过项给出复现步骤和修改建议

## 阶段切换条件

- 产品 → 设计：本轮范围和验收标准已冻结
- 设计 → 架构：关键页面结构和状态已足够支持技术方案
- 架构 → 开发：技术选型、协议、iframe 边界已明确
- 开发 → 测试：已有可运行结果和自检说明
- 测试 → 主控回写：已有测试结论和证据

## 建议勾选策略

若本轮顺利完成，建议回写以下阶段：

- 1：产品确认 / 设计完成 / 架构完成 / 开发完成 / 测试通过
- 2：产品确认 / 设计完成 / 架构完成 / 开发完成 / 测试通过
- 4：产品确认 / 设计完成 / 架构完成 / 开发完成 / 测试通过
- 5：产品确认 / 设计完成 / 架构完成 / 开发完成 / 测试通过

若某项仅完成部分阶段，则只回写对应阶段，不跨阶段补勾。

## 风险与待确认项

- 是否第一轮允许完全跳过 `deepseek-v4-flash` 真实接入，先以 mock HTML 替代
- `DESIGN.md` 中现有组件是否足够覆盖工作台类界面
- 当前代码仓库中的 `web/` 原型不应自动等同于最终技术方案；正式方向需由架构 Agent 定稿

## 证据要求

- 产品：功能清单文档
- 设计：设计框架或规范文档
- 架构：技术选型文档
- 开发：代码提交、截图、自检说明
- 测试：测试报告

## 主控回写规则

- 只有在存在对应产物和测试结论时，主控 Agent 才更新 `progress.md`
- 若存在阻塞，则在 `progress.md` 的“当前问题”中登记，不做超前勾选

完成信号：`ORCHESTRATION_UPDATE_READY`
