# product_ai_tool

AI Demo 标注工具：使用 `deepseek-v4-flash` 生成单文件 HTML 可交互 Demo，在预览画布上叠加标注，并基于标注驱动 AI 迭代 HTML，支持版本回退。

当前项目**正式技术方案**为 **Laravel + MySQL + Alpine.js / 原生 JS**，默认大模型为 **`deepseek-v4-flash`**（服务端调用，密钥不出前端）。仓库中的 `web/` 目录为 **Next.js 原型参考**，不沿用其实现思路作为生产路径。

## 文档

| 文档 | 说明 |
| --- | --- |
| [产品功能开发.md](./产品功能开发.md) | 产品定位、MVP 范围、页面结构、数据结构、技术要点、明确不做、开发顺序 |
| [HARNESS.md](./HARNESS.md) | 多 Agent 协作的全局执行约束与回写边界 |
| [EXECUTION_POLICY.md](./EXECUTION_POLICY.md) | 防重复、返工上限、幂等与长流程兜底策略 |
| [AGENTS.md](./AGENTS.md) | 多 Agent 角色、分工与协作规则 |
| [progress.md](./progress.md) | MVP 进度清单（与开发顺序对齐） |
| [outputs/orchestration/progress-update-template.md](./outputs/orchestration/progress-update-template.md) | 主控 Agent 的 `progress` 回写模板 |
| [outputs/orchestration/blocker-escalation-template.md](./outputs/orchestration/blocker-escalation-template.md) | 主控 Agent 的阻塞升级模板 |
| [outputs/architecture/tech-selection.md](./outputs/architecture/tech-selection.md) | 正式技术选型与 DeepSeek 环境约定 |
| [outputs/architecture/spec.md](./outputs/architecture/spec.md) | 模块划分、表结构、路由与 API、协议与安全 |
| [outputs/development/laravel-task-breakdown.md](./outputs/development/laravel-task-breakdown.md) | Laravel 阶段任务拆分（A～F）与 progress 对照 |
| [agents/](./agents/) | 各 Agent 的详细人设与工作规则 |

## 核心闭环

输入需求 → 选择 `deepseek-v4-flash` → 生成单 HTML Demo → iframe 预览 → 标注模式添加/编辑标注（按 `pageKey` 隔离）→ 基于标注让 AI 修改 HTML → 新版本 → 可回退。

## MVP 边界（摘要）

- **做**：单 HTML（内联 CSS/JS）、iframe（推荐 `srcdoc`）、页面标识与 `postMessage` 协议、标注 overlay（不写进 Demo HTML）、按页过滤标注、右侧列表、单标注驱动 AI 改 HTML、版本保存与回退。
- **不做**：多文件 React/Vue 工程、真实后端业务接口、复杂绘图工具、多人协同、第一版扩展到多个模型等（详见 `产品功能开发.md` 第 6 节）。

## 本地运行（Laravel）

正式代码在目录 `laravel/`。需要 **PHP** 版本满足本仓库 `composer install` 解析结果（**Laravel 11 当前锁文件常见为 PHP 8.4+**；若本机为 8.2/8.3 且报 `platform_check`，请升级 PHP 或重新 `composer update` 按团队约束锁定）。

```bash
cd laravel
cp .env.example .env
php artisan key:generate
# 默认 .env.example 为 sqlite：确保 database/database.sqlite 存在
touch database/database.sqlite
php artisan migrate
php artisan serve
```

浏览器打开 `http://127.0.0.1:8000/workbench`。在 `.env` 中配置 `DEEPSEEK_API_KEY`（及如有需要则调整 `DEEPSEEK_MODEL`）后，生成将走 DeepSeek；未配置时使用离线示例 HTML，仍可验证 iframe 与 `postMessage`。

拉取新代码后若出现新迁移，在 `laravel/` 下执行：

```bash
php artisan migrate
```

**当前已实现**：工作台生成/预览；`annotations` CRUD API；标注 overlay；**预览模式下可勾选「显示标注」**；列表点击定位至高亮 pin；**单标注 AI 修订**（`POST /api/annotations/{id}/revise`）；**版本列表与恢复**；**当前 Demo 重新生成**（有标注时需确认）；自动化测试含 `RevisionVersionRegenerateTest`、`WorkbenchPreviewVersionsTest`、`DeepSeekInitialGenerationTest`、`AnnotationApiTest` 等。本地执行 `cd laravel && php artisan test`。

生产或团队规范使用 **MySQL** 时，修改 `.env` 中 `DB_*` 并去掉 sqlite 文件依赖即可。

## 协作方式

产品需求以 `产品功能开发.md` 为准；实现与验收以 `progress.md` 为准。各 Agent 细则见 `AGENTS.md` 与 `agents/*.md`。

这里的“多 Agent”是一种协作开发模式：由负责人 / 主控 Agent 统一调度，产品、设计、架构、开发、测试按顺序接力，围绕同一份需求和进度表推进，而不是额外开发一套新的 Agent 平台。
