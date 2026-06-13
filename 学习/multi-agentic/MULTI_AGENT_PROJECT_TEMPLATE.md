# MULTI_AGENT_PROJECT_TEMPLATE（通用多 Agent 项目初始化总模板）

本文档用于快速初始化一个新的多 Agent 协作项目。  
它应作为**唯一入口文档**使用，统一包含：

- 新项目启动时需要提供的信息
- 可直接复制给 AI 的启动提示词
- AI 一次性需要生成的文档清单
- 每份文档的最低生成要求
- 推荐目录结构与默认协作规则

目标是让新项目在一开始就具备：需求文档、角色分工、全局约束、执行策略、进度面板、skill 包、首轮 runbook 和回写模板。

适用场景：

- 需要产品、设计、架构、开发、测试协作的项目
- 希望由主控 Agent 统一调度的项目
- 希望 AI 能根据进度推进并回写状态的项目

## 1. 新项目启动时需要提供的信息

初始化新项目时，推荐把输入分成“必填”和“选填补充约束”两层。

### 必填

- 项目名称：
- 项目目标：
- 产品功能列表：

### 选填补充约束

- 项目一句话描述：
- MVP 范围：
- 明确不做：
- 是否需要主控 Agent：
- 计划使用的角色：
- 是否需要 `progress.md`：
- 是否需要独立 skill 包：
- 第一轮计划做哪些模块：
- 是否已有设计系统或技术栈约束：

说明：

- `产品功能列表` 是主输入
- 其他信息默认视为补充约束，不要求每次都完整提供
- 如果未提供选填项，AI 应在生成文档时自动推导默认值，并显式标记为“待确认默认值”

## 2. 推荐输入格式

如果你希望 AI 根据“产品功能列表”自动生成整套项目资料，推荐直接提供以下格式：

```md
项目名称：
项目一句话目标：

产品功能列表：
1. 
2. 
3. 

MVP 范围：
1. 
2. 

明确不做：
1. 
2. 

第一轮计划：
1. 
2. 

技术/设计约束：
- 
```

说明：

- 如果没有完整需求文档，也可以只给“产品功能列表”
- AI 应先根据功能列表生成需求文档，再生成协作与执行文档
- 如果没有提供 `MVP 范围`、`明确不做`、`第一轮计划`，AI 应先自动推导，并在输出中标记为“待确认默认值”

## 3. 可直接复制给 AI 的启动提示词

以后新开项目时，可以直接复制下面这段提示词给 AI：

```md
帮我初始化一个新的多 Agent 项目，请一次性生成完整项目文档体系。

要求如下：

1. 先根据我提供的产品功能列表，自动整理出项目需求文档
2. 再生成多 Agent 协作文档，而不是只生成单一需求文档
3. 默认包含主控 Agent、产品 Agent、设计 Agent、架构 Agent、开发 Agent、测试 Agent
4. 默认包含：
   - README.md
   - 产品需求文档
   - AGENTS.md
   - HARNESS.md
   - EXECUTION_POLICY.md
   - progress.md
   - agents/*.md
   - skills/*/SKILL.md
   - outputs/orchestration/iteration-1-runbook.md
   - outputs/orchestration/progress-update-template.md
   - outputs/orchestration/blocker-escalation-template.md
5. progress.md 必须拆成可推进的功能条目，并带阶段勾选与产物/证据字段
6. 必须包含 progress 回写机制，且默认只有主控 Agent / 负责人可回写
7. 必须包含防重复、返工上限、幂等、长流程兜底与升级规则
8. 子 Agent 自主返工上限默认 3 次；第 4 次仍未通过则升级给主控 Agent；主控 Agent 介入后可再给 1 次定向修正机会
9. 同类问题连续 2 次重复出现时，主控 Agent 可提前介入
10. 所有角色都要有自己的 skill 包，skill 中至少包含：
    - read first
    - responsibilities
    - workflow
    - required outputs
    - guardrails
    - blocking / escalation
11. 如果我只提供产品功能列表，没有完整需求文档或 MVP 划分，你要自动推导：
    - 初版需求文档
    - 初版 MVP 范围
    - 初版明确不做
    - 初版第一轮计划
    并明确标注这些内容是“待确认默认值”
12. 第一轮 runbook 必须明确：
    - 本轮范围
    - 本轮不做
    - 角色调度顺序
    - 各角色产物
    - 阶段切换条件
    - 风险与待确认项
13. 初始化项目时，除了模板文件外，还要生成：
    - `outputs/` 目录结构
    - 第一份真实 `progress` 回写样例文档
    - 第一批真实可勾选的 `progress` 阶段回写案例
14. 如果后续出现阻塞，阻塞不仅要写入 blocker 文档，也要同步回写到 `progress.md` 的“当前问题”区
15. 生成的每份文档不要只给空壳，必须写出实际内容、默认规则和最小可执行结构


项目信息如下：
- 项目名称：
- 项目目标：
- 产品功能列表：
- MVP 范围：
- 明确不做：
- 第一轮计划：
- 技术/设计约束：
```

## 4. 推荐一次性生成的文档

### 根文档

- `README.md`
- `产品需求.md` 或 `产品功能开发.md`
- `AGENTS.md`
- `HARNESS.md`
- `EXECUTION_POLICY.md`
- `progress.md`

### 角色文档

- `agents/orchestrator.md`
- `agents/product.md`
- `agents/design.md`
- `agents/architect.md`
- `agents/developer.md`
- `agents/tester.md`

### skill 包

- `skills/orchestrator/SKILL.md`
- `skills/product/SKILL.md`
- `skills/design/SKILL.md`
- `skills/architect/SKILL.md`
- `skills/developer/SKILL.md`
- `skills/tester/SKILL.md`

### 首轮执行产物

- `outputs/orchestration/iteration-1-runbook.md`
- `outputs/orchestration/iteration-1-progress-update.md`
- `outputs/orchestration/progress-update-template.md`
- `outputs/orchestration/blocker-escalation-template.md`
- `outputs/product/feature-list.md`

### 目录初始化

- `outputs/orchestration/`
- `outputs/product/`
- `outputs/design/`
- `outputs/architecture/`
- `outputs/development/`
- `outputs/testing/`

## 5. 各文档最低生成要求

### `产品需求.md` 或 `产品功能开发.md`

至少包含：

- 产品定位
- 核心目标
- 产品功能列表
- MVP 范围
- 明确不做
- 推荐开发顺序
- 核心约束

### `progress.md`

至少包含：

- 按功能条目拆分的进度项
- 每项包含阶段勾选
- 每项包含产物/证据字段
- 当前问题区
- 已完成记录区
- 阻塞项与 blocker 文档的挂接方式

### `AGENTS.md`

至少包含：

- 主控 Agent 与各子 Agent 的角色定义
- 推荐协作顺序
- 任务路由
- 交接最小模板
- 回写规则

### `HARNESS.md`

至少包含：

- 权威文档优先级
- 全局行为约束
- 交接约束
- 回写约束
- 项目硬约束

### `EXECUTION_POLICY.md`

至少包含：

- 防重复规则
- 重试与返工上限
- 提前介入规则
- 幂等规则
- 长流程兜底
- 回写保护

### `agents/*.md`

每个角色文档至少包含：

- 我是谁
- 关注重点
- 决策边界
- 输入与输出
- 进度回写边界
- 标准交付模板
- 完成信号

### `skills/*/SKILL.md`

每个 skill 至少包含：

- 什么时候使用
- read first
- responsibilities
- workflow
- required outputs
- guardrails
- blocking / escalation

### `outputs/orchestration/iteration-1-runbook.md`

至少包含：

- 迭代名称
- 本轮目标
- 关联 progress 序号
- 本轮不包含
- 角色调度顺序
- 各角色任务
- 阶段切换条件
- 风险与待确认项

### `outputs/orchestration/iteration-1-progress-update.md`

至少包含：

- 回写目标
- 关联 progress 序号
- 回写依据
- 回写判断
- 建议回写项
- 不应回写项
- 证据链接
- 主控结论

### `outputs/orchestration/progress-update-template.md`

至少包含：

- 回写目标
- 关联 progress 序号
- 回写依据
- 回写判断
- 建议回写项
- 不应回写项
- 证据链接

### `outputs/orchestration/blocker-escalation-template.md`

至少包含：

- 阻塞名称
- 当前阶段
- 阻塞描述
- 已尝试方案
- 当前缺失项
- 建议处理方式
- 是否需要负责人拍板

## 6. 推荐目录结构

```text
project/
├── README.md
├── 产品需求.md
├── AGENTS.md
├── HARNESS.md
├── EXECUTION_POLICY.md
├── progress.md
├── agents/
│   ├── orchestrator.md
│   ├── product.md
│   ├── design.md
│   ├── architect.md
│   ├── developer.md
│   └── tester.md
├── skills/
│   ├── orchestrator/SKILL.md
│   ├── product/SKILL.md
│   ├── design/SKILL.md
│   ├── architect/SKILL.md
│   ├── developer/SKILL.md
│   └── tester/SKILL.md
└── outputs/
    ├── orchestration/
    ├── product/
    ├── design/
    ├── architecture/
    ├── development/
    └── testing/
```

## 7. 推荐初始化顺序

1. 写需求文档，明确 MVP 范围与不做项
2. 生成 `AGENTS.md`，定义角色与协作顺序
3. 生成 `HARNESS.md`，定义全局边界
4. 生成 `EXECUTION_POLICY.md`，定义返工、幂等、兜底与升级机制
5. 生成 `progress.md`，把 MVP 拆成阶段性条目
6. 初始化 `outputs/` 目录结构
7. 为每个角色生成 `agents/*.md`
8. 为每个角色生成 `skills/*/SKILL.md`
9. 写第一轮 `runbook`
10. 写第一轮产品产物
11. 写第一份真实 `progress-update` 样例
12. 将首批证据充分的阶段真实回写到 `progress.md`
13. 由主控 Agent 推进后续设计、架构、开发、测试

## 8. 推荐默认角色

- 主控 Agent：流程编排、回写进度、阻塞升级
- 产品 Agent：范围、优先级、验收标准
- 设计 Agent：布局、交互、视觉规范
- 架构 Agent：技术选型、协议、数据边界
- 开发 Agent：实现代码
- 测试 Agent：验收、回归、打回

## 9. 推荐默认策略

### 进度回写

- 默认只有主控 Agent / 负责人可以更新 `progress.md`
- 其他角色只提交建议勾选与证据

### 重试次数

- 子 Agent 自主返工上限：`3` 次
- 第 `4` 次仍未通过：升级给主控 Agent
- 主控 Agent 介入后再给 `1` 次定向修正机会
- 若仍未通过：升级给负责人

### 提前介入

- 同类问题连续 `2` 次重复出现时，主控 Agent 可提前介入

## 10. 适合让 AI 一次性产出的原则

- 需求范围尽量明确
- 第一轮目标尽量小
- 明确哪些内容不做
- 明确是否允许 mock / 假数据 / 静态示例
- 明确是否需要真实技术栈选型
- 当信息不足时，允许 AI 先做默认推导，但必须显式标记为“待确认默认值”

## 11. 这个模板在当前项目中的映射

当前 `product_ai_tool` 已经具备这套模板的大部分内容，可作为以后新项目的参考母版：

- 角色体系：已建立
- skill 包：已建立
- 全局约束：已建立
- 执行策略：已建立
- 进度面板：已建立
- 首轮 runbook：已建立
- 首轮产品产物：已建立
- progress 回写样例：已建立
