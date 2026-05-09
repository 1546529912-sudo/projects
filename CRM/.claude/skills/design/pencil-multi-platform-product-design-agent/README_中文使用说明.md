# Pencil 多端产品设计代理 Skill v2.2

这是一套用于 Claude Code / Codex / Cursor / Windsurf / VS Code 等编辑器环境的 Pencil 多端产品设计代理 Skill。

它的目标不是让 AI “随便生成一张好看的图”，而是让 AI 通过 Pencil MCP 或 Pencil IDE 插件工具，在 Pencil 画布上稳定创建：

- Web 管理后台
- SaaS Dashboard
- 响应式网页 / 官网 / Landing Page
- Mobile App
- 微信小程序
- 可视化大屏
- 电商页面 / 活动物料
- 设计系统 / 组件库
- 多端一致性设计方案

## 文件结构

```text
pencil-multi-platform-product-design-agent/
  SKILL.md
  references/
    00-mode-router.md
    01-role-modes.md
    02-design-workflow.md
    03-pencil-mcp-canvas-rules.md
    04-codebase-sync-rules.md
    05-quality-verification.md
    06-example-prompts.md
    07-failure-and-boundaries.md
    08-pencil-batch-design-rules.md
    09-enterprise-admin-dashboard-rules.md
    10-responsive-web-landing-page-rules.md
    11-mobile-app-design-rules.md
    12-wechat-mini-program-rules.md
    13-data-visualization-big-screen-rules.md
    14-ecommerce-campaign-rules.md
    15-design-system-component-library-rules.md
    16-cross-platform-consistency-rules.md
  templates/
    AGENTS.md
    CLAUDE.md
  standalone/
    Pencil_MultiPlatform_Product_Design_Agent_SingleFile.md
```

## v2.0 核心升级

v1.3 是：

```text
Pencil 画布执行规范 + 企业后台模式
```

v2.0 升级为：

```text
Pencil 多端产品设计代理 Skill
```

新增核心能力：

```text
模式路由
+ 用户角色模式
+ 多平台产品端模式
+ 跨端一致性
+ Pencil MCP 执行规范
+ batch_design 安全规则
+ 代码库同步
+ 质量验证闭环
```

## 推荐调用方式

```text
Use the Pencil multi-platform product design agent skill.

我需要通过 Pencil MCP 在 Pencil 画布上设计：
[你的任务]

请先：
1. 检测 Pencil host mode：桌面 App 还是 VS Code/Cursor 插件模式
2. 检查当前 .pen 文件
3. 选择合适的角色模式和平台模式
4. 读取现有代码 / token / 组件 / 设计上下文
5. 先给 2-3 个设计方向
6. 我确认后再生成 Pencil 页面和元素
7. 生成后验证截图、布局、层级、变量、组件和平台规范
```

## 后台页面调用示例

```text
Use the Pencil multi-platform product design agent skill in Product Manager + Enterprise Admin / SaaS Dashboard Mode.

设计一个资产管理后台的设备台账列表页。
请先分析业务对象、字段、筛选器、表格操作、批量操作、详情入口、权限状态和异常状态。
```

## App 调用示例

```text
Use the Pencil multi-platform product design agent skill in Mobile App Mode.

设计一个巡检人员 App 的工单详情与提交结果流程。
需要考虑拍照、定位、离线草稿、提交失败和底部操作区。
```

## 微信小程序调用示例

```text
Use the Pencil multi-platform product design agent skill in WeChat Mini Program Mode.

设计一个报修小程序的提交报修流程。
需要考虑微信授权、手机号授权、拍照上传、地址选择、提交成功和进度查看。
```

## 大屏调用示例

```text
Use the Pencil multi-platform product design agent skill in Data Visualization Big Screen Mode.

设计一个智慧建筑能耗监控大屏，尺寸 1920×1080。
需要包含能耗 KPI、楼层/区域分布、异常告警、趋势图和实时刷新状态。
```

## 多端调用示例

```text
Use the Pencil multi-platform product design agent skill in Cross-platform Consistency Mode.

围绕“工单”业务对象，设计 Web 后台、巡检 App、小程序报修端和大屏监控端的一致性方案。
先输出跨端对象/状态/动作映射，再生成各端 Pencil 页面。
```

## 使用建议

- 普通单页：可以直接指定平台模式。
- 多页面流程：让 Skill 先做页面清单和状态清单。
- 多端产品：务必启用 Cross-platform Consistency Mode。
- VS Code / Cursor 中使用：确认 `.pen` 文件已打开，Pencil 插件已启用，Agent 能访问 Pencil MCP 或插件工具。


## v2.1 新增：Presentation / Deck Mode

v2.1 新增：

```text
references/18-presentation-deck-rules.md
```

用于支持：

- PPT / 演示文稿
- HTML Deck / 网页演示
- Pitch Deck / 路演
- 产品方案汇报
- 商业提案
- 培训课件
- 研究报告型 Deck
- 项目汇报 / 述职 / 总结汇报
- 可导出 PDF / PPTX 的页面式演示

它不会把 PPT 当成普通网页或普通画布页面，而是按下面流程处理：

```text
受众
→ 目标
→ 核心观点
→ 叙事线
→ 页码结构
→ 每页核心 takeaway
→ 视觉系统
→ 输出格式
→ Pencil / HTML / Deck 生成
```

推荐调用：

```text
Use the Pencil multi-platform product design agent skill in Presentation / Deck Mode.

我需要做一个 HTML 格式的演示文稿，主题是：
[主题]

受众：
[受众]

目标：
[希望听众理解/相信/决定/行动什么]

输出形式：
[HTML deck / Pencil canvas / PPTX-compatible / PDF-exportable]

请先输出叙事结构、页码大纲、每页核心 takeaway 和视觉系统方向，我确认后再生成设计。
```


## v2.2 新增：前置确认 / Intake Gate

v2.2 新增：

```text
references/00-clarification-intake-rules.md
```

它会在模式路由和画布生成之前先判断用户提示词是否足够。

规则分三类：

```text
A. 阻塞型缺失：必须先问
B. 重要但可假设：声明假设后继续
C. 低影响缺失：直接使用默认值
```

这样用户不需要一开始就写很完整的提示词。比如用户只说：

```text
帮我做一个页面
```

Skill 应该先问：

```text
1. 这是 Web 后台、官网/落地页、App、小程序、大屏、电商页面，还是 PPT/HTML Deck？
2. 这个页面的主要目标是什么？
3. 目标用户是谁？
4. 有没有必须包含的内容、字段、数据、卖点或资料？
```

同时提供快速开始假设：

```text
如果你想快速开始，我可以先按“Web 后台页面，1440×1024，专业企业风格，可编辑 Pencil 画布”推进。
```

核心变化：

```text
Host check
→ Clarification / Intake Gate
→ Inspect current state
→ Mode routing
→ Context reading
→ Direction proposal
→ Canvas generation
→ Verification
```
