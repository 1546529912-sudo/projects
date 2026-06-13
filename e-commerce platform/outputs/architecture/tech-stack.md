# Tech Stack · 技术栈选型（架构 Agent 产物 1/6）

> **项目复杂度档位声明：中型（SaaS / 有外部依赖）**

理由：第一期需求包含独立 AI 微服务（Python）、第三方支付/物流接入、文件存储外部依赖、消息队列异步任务，且第二期会接入 CRM 与仓储管理。符合"中型 SaaS"档位定义。

按硬约束：必须产出 6 份架构文档（含 module-deps / data-flow / non-functional）。本文档为 6/6 的第 1 份。

## 【当前焦点】

- 档位：中型
- 产出：6 份架构文档
- 强约束：所有硬约束栏（用户指定项）不可调整，仅推荐栏可微调

---

## 1. 前端

| 类目 | 选型 | 决策类型 | 理由 |
|------|------|---------|------|
| 语言 | TypeScript 5.x | 推荐 | Vue 3 配套首选，类型安全 |
| 框架 | **Vue 3** | **用户硬约束** | 组合式 API，生态成熟 |
| 构建 | **Vite 5** | **用户硬约束** | dev server 快，HMR 体验好 |
| UI 组件库 | **Element Plus** | **用户硬约束** | B2B 后台组件齐全（表单/表格/弹窗） |
| 状态管理 | Pinia 2 | 推荐 | Vue 3 官方推荐，比 Vuex 简洁 |
| 路由 | Vue Router 4 | 推荐 | 配套 |
| HTTP | axios 1.x | 推荐 | 拦截器 + 取消请求成熟 |
| 样式 | CSS variables + 原生 CSS | 推荐 | 严格遵循 design-system.md token，不引入额外 CSS-in-JS |
| 测试 | Vitest + Playwright | 推荐 | 单测 + e2e |
| Lint | ESLint + Prettier | 推荐 | 标准 |

## 2. 后端（业务）

| 类目 | 选型 | 决策类型 | 理由 |
|------|------|---------|------|
| 语言 | **PHP 8.2+** | **用户硬约束** | 用户指定 |
| 框架 | **Laravel 11** | **用户硬约束（待确认默认值）** | PHP 生态最成熟，ORM / 路由 / 队列 / 认证开箱即用 |
| ORM | Eloquent（Laravel 自带） | 默认 | 与 Laravel 强绑定 |
| 认证 | Laravel Sanctum | 推荐 | 适合前后端分离的 SPA + token |
| 队列 | **Laravel Horizon + Redis** | **用户硬约束（待确认默认值）** | 用户已指定 Redis Queue |
| 缓存 | **Redis 7** | **用户硬约束** | 会话 / 购物车临时 / 库存预扣 / 验证码 |
| 调度 | Laravel Schedule | 默认 | cron 任务管理 |
| 测试 | PHPUnit | 默认 | Laravel 内置 |
| 文档 | Scribe（API 文档生成） | 推荐 | 与 Laravel 路由耦合 |
| Lint | Pint（Laravel 内置） | 默认 | Laravel 标准 |

## 3. AI 微服务

| 类目 | 选型 | 决策类型 | 理由 |
|------|------|---------|------|
| 语言 | **Python 3.11+** | **用户硬约束** | LLM 生态首选 |
| 框架 | **FastAPI** | **用户硬约束（待确认默认值）** | 异步原生 + 自动 OpenAPI |
| LLM 调用 | LangChain 0.3+ | 推荐 | RAG 链路工具成熟，便于集成 |
| LLM 提供商 | 待用户决定（推荐 通义千问 / DeepSeek） | 待确认 | 国内合规 + 性价比 |
| Embedding | text2vec-base-chinese 或 bge-small-zh-v1.5 | 推荐 | 中文 embedding 效果好 |
| **向量库** | **pgvector**（基于 PostgreSQL）| **用户已确认** | 第一期 <10k 条知识，pgvector 性能足够，运维简单 |
| 测试 | pytest | 默认 | 标准 |

## 4. 数据库

| 类目 | 选型 | 决策类型 | 理由 |
|------|------|---------|------|
| 主库 | **MySQL 8.0+** | **用户硬约束** | 业务数据（17 张表） |
| 向量库 | **PostgreSQL 15 + pgvector** | **用户已确认** | 知识库 embedding（独立实例，与 MySQL 分离部署） |
| 内存数据 | Redis 7 | 默认 | 缓存 / 队列 / 锁 |

## 5. 第三方依赖

| 类目 | 选型 | 决策类型 | 理由 |
|------|------|---------|------|
| 对象存储 | **阿里云 OSS**（默认） | **用户硬约束（待确认）** | 国内访问稳定 |
| 短信 | 阿里云短信 | 推荐 | 国内主流 |
| 微信支付 | 微信商户平台 + EasyWeChat（PHP SDK） | 默认 | 业内通用 |
| 支付宝 | 支付宝开放平台 + Alipay-PHP-SDK | 默认 | 同上 |
| **物流接口** | **快递鸟**（用户已确认） | 用户已确认 | 聚合 90+ 快递，单接口 |
| 站内信通知 | Laravel Notifications | 默认 | 标准 |
| 邮件通知 | 阿里云邮件推送 | 推荐 | 同生态 |
| 监控/日志 | Laravel Telescope + 阿里云 SLS | 推荐 | 标准 |
| 性能 APM | 阿里云 ARMS | 推荐 | 同生态 |

## 6. 部署

| 类目 | 选型 | 理由 |
|------|------|------|
| Web 服务器 | Nginx 1.25 | 标准 |
| PHP-FPM | PHP-FPM 8.2 | Nginx + PHP 标配 |
| 进程管理 | Supervisor | Laravel Horizon 进程守护 |
| OS | Ubuntu 22.04 LTS 或 CentOS Stream 9 | 标准 |
| 容器化 | 第一期不引入 K8s，第二期视量级再说 | 第一期单机或主从可控（见 non-goals.md T-07）|
| CI/CD | GitHub Actions 或 GitLab CI | 待用户决定（与代码托管平台一致） |

## 7. 中型档必备的 6 份产出（架构 Agent 自查）

| # | 文件 | 状态 |
|---|------|------|
| 1 | tech-stack.md（本文档） | ✅ |
| 2 | data-schema.md | 🔄 |
| 3 | api-list.md | 🔄 |
| 4 | module-deps.md | 🔄 |
| 5 | data-flow.md | 🔄 |
| 6 | non-functional.md | 🔄 |

## 8. 待用户确认默认值

- [ ] Laravel 11（vs 10 LTS）：推荐 11 走最新特性
- [ ] FastAPI（vs Flask）：推荐 FastAPI
- [ ] 阿里云 OSS（vs 腾讯云 COS）：推荐阿里云
- [ ] LLM 选型（通义千问 vs DeepSeek vs ChatGPT API）：第一期建议**通义千问**（国内合规，价格合理）
- [ ] 代码托管 / CI（GitHub / GitLab / 阿里云效）

## 9. 裁剪说明

- ❌ 不引入 Kubernetes（中型档不需要，见 non-goals T-07）
- ❌ 不引入 Service Mesh（同上）
- ❌ 不引入 ElasticSearch（MySQL 全文索引 + Like 满足第一期搜索需求，详见 data-schema 索引设计）
- ❌ 不引入 RabbitMQ / Kafka（Redis Queue 满足第一期吞吐）
- ❌ 不引入独立微服务架构（仅 Laravel + Python 双服务，不强拆 user / product / order）
