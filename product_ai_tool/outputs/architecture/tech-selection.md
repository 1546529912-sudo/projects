# Architecture Tech Selection

## 正式结论（冻结方向 · 2026-05-10 起）

以下组合为 **当前项目唯一正式技术栈**；后续设计与开发以此为准，**不**将 `web/` 下 Next.js 实现作为生产蓝图。

| 层级 | 选型 | 说明 |
| --- | --- | --- |
| 应用框架 | **Laravel 11+**（PHP 8.2+） | 单体 Web：页面、API、队列入口均可同属一仓 |
| 数据 | **MySQL 8.x** | `demos` / `demo_versions` / `annotations` |
| 页面与轻交互 | **Blade + Alpine.js + 原生 JS** | 工作台、iframe 宿主、postMessage、`pageKey` 状态以原生能力为主 |
| 大模型 | **`deepseek-v4-flash`** | **仅服务端** HTTP 调用；前端不持有密钥、不直连接口 |
| 原型参考 | `web/`（Next.js） | 仅作布局与协议调试参考；**不得**将其目录结构、API 形态、依赖栈默认为正式方案 |

**DeepSeek 接入约定（实现时落 `.env`）**

- `DEEPSEEK_API_KEY`：必填（非提交环境）
- `DEEPSEEK_API_BASE`：可选，默认以官方/兼容网关文档为准（Laravel `Http` 客户端指向该 base）
- `DEEPSEEK_MODEL`：默认 `deepseek-v4-flash`；若线上模型名与控制台不一致，以控制台为准并仅改环境变量

## 本轮目标

- 为 `product_ai_tool` 确定一版更适合团队长期部署与维护的技术方案
- 以“PHP 优先、便于同事部署”为核心约束，**废止**“沿用 Next.js 原型即等于最终方案”的默认假设
- 保证方案仍能满足 MVP：单 HTML Demo 生成、iframe 预览、页面级标注、基于标注修改、版本管理

## 技术选型

- 前端：Laravel Blade + Alpine.js / 少量原生 JavaScript
- 后端：Laravel 11+（PHP 8.2+）
- 数据存储：MySQL 8.x
- AI 接入方式：服务端通过 HTTP 调用 `deepseek-v4-flash`
- 部署方式：标准 PHP 部署环境（Nginx/Apache + PHP-FPM + MySQL）

## 选型理由

- 团队部署成本更低：既然同事反馈 PHP 更容易部署，这就是强约束，优先级高于当前原型技术偏好
- 更利于后续维护：工作台类产品并不依赖 Next.js 的特有优势，Laravel 足以承载管理后台、表单、列表、详情、版本记录等常规页面
- 后端能力集中：Demo 生成、标注存储、版本管理、AI 调用、本地权限和日志都更适合集中在一个 PHP 服务里处理
- 渐进复杂度更低：MVP 重点是流程闭环，不是炫技式前后端分离
- 更适合企业内网和传统服务器环境：PHP 在许多现有环境里上线更直接

## 明确不选

- 不把当前 `web/` 下的 Next.js 原型直接视为最终生产方案
- 第一版不采用“Next.js 前端 + 独立 PHP/Node API + 多服务部署”的复杂结构
- 第一版不采用 React/Vue 多文件工程作为 AI 生成目标

## 当前仓库原型定位

- 当前仓库中的 `web/` 目录可视为“交互原型 / 探索性前端样机”
- 它可以帮助验证工作台布局、iframe 承载、协议调试
- 但它不应绑定最终生产技术选型
- 若后续正式走 PHP 方案，`web/` 可以：
  - 作为交互参考保留
  - 或在 PHP 版本稳定后归档 / 删除

## 推荐系统结构

### 页面层

- Laravel Blade 渲染主工作台
- 左侧：需求输入、Demo 信息、版本信息
- 中间：iframe 预览区 + 后续 overlay 标注层
- 右侧：当前页标注列表、标注详情、协议状态

### 交互层

- 使用 Alpine.js 或原生 JS 处理轻交互：
  - 模式切换
  - 标注面板开关
  - 当前 `pageKey` 状态显示
  - 列表联动与高亮
- 与 iframe 的通信使用浏览器原生 `postMessage`

### 服务层

- Laravel Controller 负责：
  - 创建 Demo
  - 保存版本
  - 读取当前版本 HTML
  - 保存 / 更新 / 删除标注
  - 调用 `deepseek-v4-flash`
  - 根据标注生成新版本

### 存储层

- MySQL 存储：
  - demos
  - demo_versions
  - annotations

## 数据结构

### demos

- `id`
- `title`
- `prompt`
- `current_version_id`
- `created_at`
- `updated_at`

### demo_versions

- `id`
- `demo_id`
- `version_no`
- `html_code`
- `model`，第一版固定为 `deepseek-v4-flash`
- `prompt`
- `created_at`

### annotations

- `id`
- `demo_id`
- `demo_version_id`
- `page_key`
- `state_key`，可空，预留
- `x_percent`
- `y_percent`
- `title`
- `description`
- `type`
- `status`
- `created_at`
- `updated_at`

## 协议与接口

### iframe 承载方式

- 第一版优先使用 iframe + 独立 HTML 内容
- 若用 Laravel 输出 HTML，可通过单独路由返回完整 Demo HTML
- 也可在特定场景下使用 `srcdoc`
- 生产上更推荐“HTML 存储 + 路由输出”方式，便于调试与版本切换

### sandbox 策略

- 推荐默认启用受限 iframe sandbox
- 在保证 Demo 正常交互的前提下，最小化权限开放

### postMessage 最小集合

- `DEMO_READY`
- `DEMO_PAGE_CHANGE`
- `DEMO_STATE_CHANGE`，预留
- `DEMO_ACTION`，预留

### 标注过滤键

- MVP：`demoId + pageKey`
- 预留：`demoId + pageKey + stateKey`

## AI 接入建议（DeepSeek）

- **唯一默认模型**：`deepseek-v4-flash`（与产品、progress 条目 2/3 对齐）
- **调用位置**：`app/Services/DeepSeekClient.php`（或等价命名），由 `DemoGenerationService` / `DemoRevisionService` 调用；Controller 仅编排
- **协议**：OpenAI 兼容 Chat Completions 形态（以 DeepSeek 当前官方文档为准）；禁止把 Key 下发到 Blade/Alpine
- **失败策略**：不覆盖当前 `demo_versions` 当前指针；返回可展示错误；可记录日志与 request id
- **降级**：开发/演示环境可有「示例 HTML」fallback，生产验收以真实调用为准

## 安全边界

- 标注数据绝不写入 AI 生成的 Demo HTML
- AI 返回值必须只作为新版本 HTML 存储，不直接改历史版本
- API Key 仅保存在服务端环境变量
- iframe 与宿主页交互仅通过约定消息类型进行

## 部署建议

- 一台标准 PHP 应用服务器即可起步
- Nginx/Apache + PHP-FPM + MySQL
- 静态资源由 Web Server 提供
- 后续如果 AI 调用量增加，再考虑把模型调用抽成独立队列任务

## 风险与待确认项

- **DeepSeek**：`deepseek-v4-flash` 在控制台中的确切 model 字符串、地域限流与单请求 token 上限
- **HTML 体量**：`demo_versions.html_code` 用 LONGTEXT 是否足够；超长 HTML 是否需对象存储 offload
- **标注 overlay**：复杂高频 DOM 更新是否需在局部引入小型打包资源（仍避免把整个栈迁回 SPA）
- **iframe**：优先 `GET /demos/{id}/preview` 独立文档还是 `srcdoc`——见 `spec.md` 建议（正式版偏向预览路由）

## 建议结论

- 正式架构 = **Laravel + MySQL + Blade + Alpine.js / 原生 JS + `deepseek-v4-flash`（服务端）**
- **`web/` Next.js = 原型参考**，不继承为生产实现路径

完成信号：`ARCH_TECH_SELECTION_READY`
