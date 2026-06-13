# AGENTS（product_ai_tool）

本目录用于 **AI Demo 标注工具** 的多 Agent 协作开发。这里的「多 Agent」指的是一种**分角色的开发模式**，不是额外开发一套智能体平台；核心目标是让负责人 / 主控 Agent 协调产品、设计、架构、开发、测试围绕同一套文档和进度表协同推进。

## 权威文档

- **需求与范围**：[产品功能开发.md](./产品功能开发.md)
- **执行进度**：[progress.md](./progress.md)
- **全局约束**：[HARNESS.md](./HARNESS.md)
- **执行策略**：[EXECUTION_POLICY.md](./EXECUTION_POLICY.md)
- **角色细则**：[agents/](./agents/) 下各 Agent 文件

## 这套模式怎么用

### 1. 协作对象

- 负责人 / 主控 Agent：负责流程编排、阶段推进、阻塞升级、证据汇总与 `progress.md` 统一回写
- 产品 Agent：负责范围、优先级、验收口径
- 设计 Agent：负责信息架构、界面与交互规范
- 架构 Agent：负责技术选型、数据结构、协议与边界
- 开发 Agent：负责按文档实现可运行代码
- 测试 Agent：负责按需求和进度清单验收

### 2. 运作原则

- 所有角色都受 [HARNESS.md](./HARNESS.md) 约束；Harness 高于单个角色的局部习惯。
- 所有角色都以 [产品功能开发.md](./产品功能开发.md) 为需求权威来源。
- 所有实现节奏都以 [progress.md](./progress.md) 的功能点为推进单位。
- 所有角色都先读上游文档，再输出本角色产物，不跳步。
- 默认每一轮只推进一个模块或一组强相关功能，保证可演示、可验收、可回退。
- 除负责人 / 主控 Agent 外，默认 **其他 Agent 不直接修改 `progress.md`**；由各角色提交建议勾选和证据，再由负责人统一回写。

### 3. 一次标准迭代

1. 产品 Agent 选定本轮目标：明确本轮覆盖哪些 `progress` 序号、验收标准是什么、第一版不做什么。  
2. 设计 Agent 补齐本轮涉及的界面与交互规范，尤其是状态切换、空状态、报错与加载。  
3. 架构 Agent 明确本轮技术实现边界：数据结构、接口、iframe / postMessage 协议、安全策略。  
4. 开发 Agent 按已确认文档实现，并输出可演示增量与自检结果。  
5. 测试 Agent 按需求、设计、架构和 `progress` 对应条目做验收，给出通过/不通过结论。  
6. 负责人 / 主控 Agent 汇总证据、处理阻塞、决定是否进入下一轮，并统一维护 `progress.md`。  

### 4. 何时可以进入下一个角色

- 产品完成后：本轮目标、优先级、验收口径已冻结
- 设计完成后：关键页面和状态说明已足够让开发落地
- 架构完成后：技术选型和协议边界已明确，无关键歧义
- 开发完成后：已有可运行结果，并附带模块总结与自检
- 测试完成后：输出通过结论，或明确打回项与修复要求

### 5. 交接最小模板

- 本轮目标：
- 关联 `progress` 序号：
- 上游输入文档：
- 本角色产物路径：
- 建议勾选项：
- 风险 / 待确认项：

## 角色一览

| Agent | 文件 | 主要职责 |
| --- | --- | --- |
| 主控 | [agents/orchestrator.md](./agents/orchestrator.md) | 编排流程、选择本轮条目、串联交接、升级阻塞、统一回写 progress |
| 产品 | [agents/product.md](./agents/product.md) | 范围、优先级、验收口径、与 progress 对齐；不决定技术实现细节 |
| 设计 | [agents/design.md](./agents/design.md) | 信息架构与视觉/交互规范（顶栏、三栏、标注与列表面板） |
| 架构 | [agents/architect.md](./agents/architect.md) | 技术选型、数据模型（demos / demo_versions / annotations）、接口与 iframe 通信约定 |
| 开发 | [agents/developer.md](./agents/developer.md) | 按已确认文档实现；标注层与 Demo 分离；遵守 postMessage 协议 |
| 测试 | [agents/tester.md](./agents/tester.md) | 对照功能清单与 progress 验收；含 iframe、标注隔离、版本回退 |

## 推荐协作顺序

1. **主控**：选择本轮目标与 `progress.md` 条目，确认谁先开工。  
2. **产品**：确认/拆解需求，对应 `progress.md` 条目；产出功能清单与验收点。  
3. **设计**：布局与组件规范（须覆盖预览/标注模式、列表、编辑浮层）。  
4. **架构**：选型与 schema、API、安全边界（如 iframe sandbox、同源策略下的 postMessage）。  
5. **开发**：按 `progress.md` 迭代模块；每阶段可交付可演示增量。  
6. **测试**：模块完成后按清单与 progress 打勾项验收。  
7. **主控**：汇总结果、回写 `progress.md`、决定是否进入下一轮。

## 任务路由

- **本轮做什么、先找谁、是否可以进入下一阶段** → 主控 Agent  
- **范围、优先级、验收变更** → 产品 Agent，并同步是否调整 `progress.md`（由负责人或产品提议勾选项）。  
- **UI/交互不一致** → 设计 Agent 出规范或补充说明。  
- **数据模型、接口、协议** → 架构 Agent。  
- **实现缺陷、联调** → 开发 Agent；**回归与发布门禁** → 测试 Agent。

## 交接与产物

- 各 Agent 的完成信号、产物路径、是否直接改 `progress.md` 等，以对应 `agents/*.md` 为准。  
- 默认：**除主控 Agent 外，其他 Agent 不直接修改 `progress.md`**，可提交「建议勾选」与证据，由负责人统一回写。

## 推荐落地方式

- 第一步：先由产品 Agent 把 MVP 1～15 项按迭代批次拆开，例如“基础壳与生成”“标注”“AI 修改与版本”。
- 第零步：先由主控 Agent 选定本轮批次、确认上游输入是否齐备。
- 第二步：每个批次都补齐设计与架构文档，再进入开发。
- 第三步：开发完成后由测试 Agent 对照 `progress.md` 验收，不通过则回到开发，不改需求文档来掩盖缺口。
- 第四步：主控 Agent / 负责人统一维护 `progress.md` 勾选状态，并记录证据链接。

## 全项目共识（摘自需求文档）

- Demo 为 **单 HTML**，标注数据由 **系统独立维护**，不写入 AI 生成的 HTML。  
- Demo 须支持 **pageKey** 与 **postMessage**（`DEMO_READY`、`DEMO_PAGE_CHANGE` 等），外层据此切换当前页并过滤标注。  
- MVP 修改范围默认 **单条标注**；多页面自动批量修改不在第一版范围。

补充：所有角色在执行这些共识时，还需遵守 [HARNESS.md](./HARNESS.md) 中定义的全局执行约束、交接约束与回写约束。
