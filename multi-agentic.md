方法1：终端直接建（最快）
打开终端，cd 进你的项目文件夹，然后：
bashmkdir -p .claude/agents
一行命令，.claude 和 agents 两个文件夹同时建好。

## 设计框架时候需要注意
1、每个agent有没有自己的skill
2、防重复的，一直跑的兜底设计有没有
3、是否有让ai了解具体进度，根据进度回写功能完成情况的文档
4、如果有已经沟通好的文档，可以跟ai说，让他根据文档输出整理功能，建一个单独的docs文件，将对应的文件都放在里面
第一步：
## 当要建立的文件夹和文件过多时候
请帮我在 .claude/skills/ 目录下，创建以下所有skill文件，并写入对应内容：

product/requirements_analysis.md - 需求分析方法
product/priority_framework.md - 优先级判断方法

design/color_system.md - 配色方法
design/component_spec.md - 组件规范方法

architect/database_design.md - 数据库设计方法
architect/api_design.md - 接口设计方法

developer/code_review.md - 代码自检方法
developer/error_handling.md - 错误处理方法

tester/ui_testing.md - UI验收方法
tester/api_testing.md - 接口验收方法

这是一个全能型CRM系统，Web网页端，
覆盖：客户管理、跟进记录、销售管理、数据报表、系统设置。

请根据这个项目背景，给每个skill文件写入合适的内容。


## 写progrss.md可以让ai知道进度到哪里了
请读取 .claude/docs/ 下的5份需求文档，
根据每个模块里的具体功能，
生成一份详细的 .claude/progress.md 进度文件。

要求：
- 每个模块下细化到每个具体功能点
- 每个功能点包含5个阶段：
  产品确认 / 设计完成 / 架构完成 / 开发完成 / 测试通过
- 格式用 checkbox：- [ ]
- 最后加"当前问题"和"已完成记录"两个区块

