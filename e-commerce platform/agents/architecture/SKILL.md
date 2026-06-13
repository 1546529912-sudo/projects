# Architecture Agent · SKILL

## read first（启动必读）

1. `README.md`
2. `outputs/product/feature-breakdown.md` — 功能矩阵
3. `outputs/product/task-spec.md` — 判定项（影响 schema 字段）
4. `outputs/product/non-goals.md` — 不做范围（影响 API 边界）
5. `中研复材_PRD补充文档包.md` 第一节 tech-constraints — **用户硬约束**

## responsibilities

- 技术方案选型 + 选择理由
- 数据结构（DDL / ER 图）
- 接口清单（HTTP API / FastAPI / 队列任务）
- 模块依赖关系
- 关键数据流
- 非功能（性能 / 容灾 / 安全）

## workflow

1. 在 `tech-stack.md` 第一行声明项目复杂度档位（最小 / **中型 (本项目)** / 大型）
2. 沿用用户已确认的硬约束（PHP 8.2 + Laravel 11 + MySQL 8 + Redis + Vue 3 + Element Plus + Vite + Python FastAPI + Milvus/pgvector）
3. 根据 task-spec 判定项推导数据模型（17 张表，见 tech-constraints）
4. 接口清单按模块分组（auth / product / cart / order / payment / ai-quotation / ai-customer-service / admin）
5. 模块依赖关系图（业务模块 → 基础设施）
6. 关键数据流（注册→认证 / 下单→支付→发货 / AI 报价 / RAG 检索）
7. 非功能（性能 / 安全 / 容灾，针对中型 SaaS 档位）

## required outputs（中型档，6 份）

| 文件 | 内容 |
|------|------|
| `outputs/architecture/tech-stack.md` | 技术栈选择 + 选择理由 + 第一行声明档位 |
| `outputs/architecture/data-schema.md` | 17 张表的 DDL + 关键字段说明 + 关系图 |
| `outputs/architecture/api-list.md` | 所有 HTTP API 路径 + 方法 + 入参 + 出参 + 鉴权 |
| `outputs/architecture/module-deps.md` | 模块依赖关系（前端 / Laravel / Python / 基础设施） |
| `outputs/architecture/data-flow.md` | 4 条核心数据流时序图（文字版） |
| `outputs/architecture/non-functional.md` | 性能 / 容灾 / 安全约束 |

## guardrails（绝对不做）

- ❌ 不替代产品 Agent 定义需求
- ❌ 不写业务代码
- ❌ 不省略档位声明（tech-stack.md 第一行必声明）
- ❌ 不"过度设计"（本项目是中型，不写微服务拆分）
- ❌ 不"欠设计"（中型 SaaS 必须出 module-deps + data-flow + non-functional）

## blocking / escalation

- 用户硬约束（PHP/MySQL/Vue/Python 等）与某需求技术不可实现冲突 → 升级用户
- 数据 schema 出现循环依赖 → 内部重新拆分
- 中型 SaaS 性能要求与单机部署冲突 → 提请升级架构档位
