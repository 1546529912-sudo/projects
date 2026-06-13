# MVP 进度（对齐 [产品功能开发.md](./产品功能开发.md) 第 7 节）

说明：下列序号与需求文档 **7. MVP 开发顺序** 一致。每个功能点含五阶段勾选，由负责人根据实际交付统一维护。

使用建议：

- 本文档用于 **多 Agent 协作开发** 的统一推进面板，不替代需求、设计、架构、开发、测试各自的详细产物。
- 默认由负责人统一回写；各 Agent 不直接修改勾选状态，可提交「建议勾选 + 证据链接」。
- 每个功能点除勾选外，建议同步补充「产物/证据」，用于挂接设计稿、架构文档、代码提交、测试报告。

---

## 正式技术栈（冻结）

| 层级 | 选型 |
| --- | --- |
| 应用 | Laravel 11+，PHP 8.2+ |
| 数据 | MySQL 8.x |
| 页面与交互 | Blade + Alpine.js + 原生 JS |
| 大模型 | `deepseek-v4-flash`（仅服务端 HTTP 调用） |
| 原型参考 | 仓库 `web/`（Next.js）**仅作交互与协议参考**，**不**作为生产实现蓝图 |

阶段任务与验收粒度见 [outputs/development/laravel-task-breakdown.md](./outputs/development/laravel-task-breakdown.md)。

## Laravel 实现路径（对照 progress 1～15）

| 序号 | 主要 Laravel / 前端交付 |
| --- | --- |
| 1 | Blade 布局与工作台壳：`layouts/workbench.blade.php`、`workbench/index.blade.php`；路由 `GET /workbench` |
| 2 | 需求输入、模型展示（默认 `deepseek-v4-flash`）；表单提交或 `fetch` 至 API，前端不接触密钥 |
| 3 | `DeepSeekClient` + `DemoGenerationService`；`POST /api/demos` 创建 demo + `demo_versions` v1；提示词约束见 [产品功能开发.md](./产品功能开发.md) §5.4 |
| 4 | `DemoController@preview`（或等价）输出 `text/html`；iframe `src` + `sandbox`；MVP 可短期 `srcdoc`，正式以独立预览 URL 为主（见 spec） |
| 5 | 宿主页 JS：监听 `postMessage`，校验 `type`，维护当前 `pageKey`（`stateKey` 预留） |
| 6～7 | Alpine 切换预览/标注；overlay 捕获点击 → 百分比坐标 → `POST` 创建标注 |
| 8～10 | `annotations` 表与 Eloquent；按 `demo_id` + `page_key` 过滤；编辑 UI |
| 11～12 | 右侧列表、全部标注视图、状态筛选；列表与画布 pin 联动高亮 |
| 13 | `POST /api/annotations/{id}/revise` → `DemoRevisionService` 调 DeepSeek → 新版本 |
| 14 | 每次生成/修订写入 `demo_versions`；标注记录 `demo_version_id` |
| 15 | 版本列表与恢复；重新生成前风险提示（需求 §2.6 第 37 条） |

**路径废止声明**：不再以 Next.js `web/` 的目录结构、`app/api/*`、React 组件状态作为实现依据；实现冲突时以 [outputs/architecture/spec.md](./outputs/architecture/spec.md) 为准。

---

## 基础壳与生成

### 1 搭建基础页面布局（顶栏 + 左侧面板 + 中间画布 + 右侧面板）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`outputs/orchestration/iteration-1-runbook.md`；`outputs/product/feature-list.md`；`outputs/design/framework-proposal.md`；`outputs/architecture/tech-selection.md`；`outputs/architecture/spec.md`；`laravel/resources/views/layouts/workbench.blade.php`；`laravel/resources/views/workbench/index.blade.php`；`laravel/tests/Feature/ExampleTest.php`

### 2 实现需求输入和模型选择（默认 `deepseek-v4-flash`）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`outputs/orchestration/iteration-1-runbook.md`；`outputs/product/feature-list.md`；`outputs/design/framework-proposal.md`；`outputs/architecture/tech-selection.md`；`outputs/architecture/spec.md`；`laravel/resources/views/workbench/index.blade.php`（顶栏模型 chip）；`laravel/config/services.php`

### 3 接入 `deepseek-v4-flash`，生成单 HTML Demo

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/app/Services/DeepSeekClient.php`；`laravel/app/Services/DemoGenerationService.php`；`laravel/app/Services/SampleDemoHtml.php`；`laravel/app/Http/Controllers/WorkbenchController.php`；`laravel/tests/Feature/DeepSeekInitialGenerationTest.php`；`laravel/tests/Feature/WorkbenchPreviewVersionsTest.php`

### 4 使用 iframe 预览 HTML（推荐 `srcdoc`，可配合 sandbox）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`outputs/orchestration/iteration-1-runbook.md`；`outputs/product/feature-list.md`；`outputs/design/framework-proposal.md`；`outputs/architecture/tech-selection.md`；`outputs/architecture/spec.md`；`laravel/app/Http/Controllers/DemoController.php`；`laravel/resources/views/workbench/index.blade.php`；`laravel/tests/Feature/WorkbenchPreviewVersionsTest.php`

### 5 约束 AI 生成 HTML：页面标识、`postMessage` 协议（`DEMO_READY`、`DEMO_PAGE_CHANGE` 等）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`outputs/orchestration/iteration-1-runbook.md`；`outputs/product/feature-list.md`；`outputs/design/framework-proposal.md`；`outputs/architecture/tech-selection.md`；`outputs/architecture/spec.md`；`laravel/app/Services/SampleDemoHtml.php`；`laravel/app/Services/DeepSeekClient.php`（生成提示词约束）；`laravel/resources/views/workbench/index.blade.php`（`postMessage` 监听）；`laravel/tests/Feature/ExampleTest.php`

---

## 标注

### 6 预览模式 / 标注模式切换

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/resources/views/workbench/index.blade.php`（`previewMode`、顶栏切换；预览下「显示标注」开关）

### 7 点击画布添加标注（overlay 层，非写入 Demo HTML）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/resources/views/workbench/index.blade.php`；`laravel/app/Http/Controllers/AnnotationController.php`；`laravel/tests/Feature/AnnotationApiTest.php`

### 8 标注位置按百分比存储；绑定 `demoId + pageKey`（`stateKey` 预留）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/database/migrations/*_create_annotations_table.php`；`laravel/app/Models/Annotation.php`；`laravel/tests/Feature/AnnotationApiTest.php`

### 9 点击标注编辑（标题、描述、类型、状态等）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/resources/views/workbench/index.blade.php`；`laravel/app/Http/Controllers/AnnotationController.php`；`laravel/tests/Feature/AnnotationApiTest.php`

### 10 页面级标注过滤（当前页只显示当前页标注）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/app/Http/Controllers/AnnotationController.php?page_key`；`laravel/resources/views/workbench/index.blade.php`（`pinsForCanvas`、`listScope`）；`laravel/tests/Feature/AnnotationApiTest.php`

---

## 列表与维护

### 11 右侧「当前页面」标注列表；**全部标注**入口与按状态筛选（未处理 / 已完成）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/resources/views/workbench/index.blade.php`；`laravel/tests/Feature/AnnotationApiTest.php`

### 12 删除标注；标注状态更新；列表与画布联动定位/高亮

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/resources/views/workbench/index.blade.php`（`selectAnnotation`、`scrollIntoView`、pin 高亮）；`laravel/app/Http/Controllers/AnnotationController.php`；`laravel/tests/Feature/AnnotationApiTest.php`

---

## AI 修改与版本

### 13 基于**单个标注**让 AI 修改 HTML（上下文含 HTML、demoId、pageKey、位置与标注内容等）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/app/Services/DemoRevisionService.php`；`laravel/app/Http/Controllers/AnnotationController.php`（`revise`）；`laravel/resources/views/workbench/index.blade.php`；`laravel/tests/Feature/RevisionVersionRegenerateTest.php`

### 14 Demo 版本保存（每次生成或 AI 修改产生新版本；标注记录创建时版本可追溯）

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/database/migrations/*_create_demo_versions_table.php`；`laravel/app/Models/DemoVersion.php`；`laravel/app/Http/Controllers/AnnotationController.php`（创建标注写 `demo_version_id`）；`laravel/tests/Feature/RevisionVersionRegenerateTest.php`；`laravel/tests/Feature/WorkbenchPreviewVersionsTest.php`

### 15 版本列表与**恢复上一版本**；重新生成 Demo 时对已有标注的风险提示

- [x] 产品确认
- [x] 设计完成
- [x] 架构完成
- [x] 开发完成
- [x] 测试通过
- 产物/证据：`laravel/app/Http/Controllers/VersionController.php`；`laravel/app/Services/DemoRegenerationService.php`；`laravel/app/Http/Controllers/WorkbenchController.php`（`regenerate`）；`laravel/resources/views/workbench/index.blade.php`；`laravel/tests/Feature/RevisionVersionRegenerateTest.php`；`laravel/tests/Feature/WorkbenchPreviewVersionsTest.php`

---

说明（非 MVP 闭环节点）：需求文档第 8 节（`stateKey` 完整链路、截图、评论串等）不在上述 1～15 必完成范围内；若单独立项，可在本文追加模块/功能点条目，格式同上。

---

## 当前问题

### 产品待确认

（范围、优先级、验收口径变更等）

### 设计待确认

（布局、组件状态、交互细节等）

### 架构待确认

（技术选型、数据结构、接口协议、安全边界等）

### 开发阻塞

（实现依赖、联调问题、环境问题等）

### 外部依赖

（模型额度、第三方服务、部署资源等）

---

## 已完成记录

建议记录格式：

- 日期：
- 关联 progress 序号：
- 功能名称：
- 完成阶段：产品确认 / 设计完成 / 架构完成 / 开发完成 / 测试通过
- 责任角色：
- 产物/证据：
- 备注：

实际记录：

- 日期：2026-05-09
- 关联 progress 序号：1、2、4、5
- 功能名称：第一轮基础壳与预览链路的产品范围确认
- 完成阶段：产品确认
- 责任角色：主控 Agent / 产品 Agent
- 产物/证据：`outputs/orchestration/iteration-1-runbook.md`；`outputs/product/feature-list.md`；`outputs/orchestration/iteration-1-progress-update.md`
- 备注：本次为第一份真实回写样例，只回写产品确认阶段，不超前勾选其他阶段

- 日期：2026-05-10
- 关联 progress 序号：1、2、4、5
- 功能名称：第一轮基础壳与预览链路的架构方案确认（PHP 优先）
- 完成阶段：架构完成
- 责任角色：主控 Agent / 架构 Agent
- 产物/证据：`outputs/architecture/tech-selection.md`；`outputs/architecture/spec.md`；`outputs/orchestration/iteration-1-architecture-progress-update.md`
- 备注：本次确认正式技术方向为 Laravel + MySQL + Alpine.js / 原生 JS；`web/` 下 Next.js 代码视为原型参考

- 日期：2026-05-10
- 关联 progress 序号：1、2、4、5
- 功能名称：第一轮基础壳与预览链路的设计框架确认
- 完成阶段：设计完成
- 责任角色：主控 Agent / 设计 Agent
- 产物/证据：`outputs/design/framework-proposal.md`；`outputs/orchestration/iteration-1-design-progress-update.md`
- 备注：本次确认工作台布局、关键状态、组件映射和专有控件方向；与 PHP 优先方案保持一致

- 日期：2026-05-10
- 关联 progress 序号：文档级（覆盖 1～15 实现路径，不替代各条「开发完成」勾选）
- 功能名称：正式栈 Laravel 冻结 + progress Laravel 对照路径 + 开发任务拆分
- 完成阶段：架构结论更新（文档）
- 责任角色：主控 / 架构 / 开发协调
- 产物/证据：`outputs/architecture/tech-selection.md`（正式结论段）；`outputs/architecture/spec.md`（技术栈声明）；`progress.md`（Laravel 路径表）；`outputs/development/laravel-task-breakdown.md`
- 备注：**废止**以 Next.js `web/` 为生产实现路径；默认模型 `deepseek-v4-flash` 仅服务端调用

- 日期：2026-05-10
- 关联 progress 序号：1～15（对照《产品功能开发.md》第 7 节 MVP 顺序）
- 功能名称：MVP 闭环交付（含显示/隐藏标注、列表定位、DeepSeek 首启生成测试）
- 完成阶段：开发完成；测试通过（`php artisan test`）
- 责任角色：开发 Agent（应负责人要求同步勾选 progress）
- 产物/证据：见各条目「产物/证据」；增量：`laravel/tests/Feature/DeepSeekInitialGenerationTest.php`；`progress.md` 勾选更新
- 备注：**第 8 节「后续增强」仍为排期外**；未纳入 multi-model、stateKey 全链路等
