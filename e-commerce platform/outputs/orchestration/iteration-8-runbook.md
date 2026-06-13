# Iteration 8 · Runbook（RAG 知识库 · 轻量版 SQLite FTS5）

## 【当前焦点】

- 范围：AI-002-02 售前问答 RAG + AI-004 知识库管理后台
- 选型：**SQLite FTS5 全文索引**（无额外依赖，接口契约对齐 pgvector，可后续平替）
- 目标：用户问"T700 板的密度是多少"时，AI 从公司 FAQ 取数据回答，并附 "来源：xxx"

## 为什么用 SQLite FTS5 而不是 pgvector

| 维度 | 当前选择 | pgvector |
|------|---------|----------|
| 部署复杂度 | 无（SQLite 自带）| 需要 PostgreSQL + 扩展 Docker 容器 |
| Embedding 模型 | 不需要 | 需要 200MB+ 本地模型或调 API |
| 中文召回精度 | 中等（FTS5 支持中文分词） | 高（向量语义） |
| 接口契约 | 与真实 RAG 完全一致 | - |
| 升级成本 | 改 `rag.py` 1 个文件 | - |

未来用户准备好 OpenAI/通义 embedding API key 时，只需改 `app/services/rag_engine.py` 切到真实 embedding，业务侧零改动。

## 数据模型

```
knowledge_base
  - id, title, content, category, keywords
  - status: draft / pending_review / active / disabled
  - source: 来源（如 "T700 规格书 v2.1"）
  - created_at / updated_at

knowledge_base_fts (FTS5 virtual table)
  - 索引 title + content + keywords
  - 用 unicode61 tokenizer（中文按字索引）
```

## Backend 任务

| Task | 简述 |
|------|------|
| Migration: knowledge_base + FTS5 virtual table | 业务表 + FTS 索引 + 触发器同步 |
| Model: KnowledgeBase | + scope active() |
| KnowledgeAdminController | index / store / update / destroy / toggleStatus |
| KnowledgeSeeder | 15 条产品 FAQ（碳纤维 / 玻纤 / 芳纶 / 价格政策 / 物流） |
| Routes | /admin/knowledge CRUD + /knowledge/search (公开) |

## AI Service 任务

| Task | 简述 |
|------|------|
| `infra/knowledge_repo.py` | search(query, top_k) 用 SQLite FTS5 MATCH 检索 |
| `services/rag_engine.py` | 整合 search → 拼到 LLM prompt → 返回 reply + sources |
| `chat.py` | presale 意图分支：先查 RAG，命中则带知识进 LLM；不命中走 LLM 兜底 |
| `api/rag.py` | 升级为真实 FTS5 调用（替换之前 stub）|

## Frontend 任务

| Task | 简述 |
|------|------|
| `api/knowledge.ts` | admin CRUD 封装 |
| `views/admin/KnowledgePage.vue` | 知识库列表 + 新建/编辑表单 + 上下架 |
| `AiDrawer.vue` | AI 消息底部显示 "📚 来源：xx, xx"（meta.sources 渲染） |
| 个人中心 admin 卡片 | 加"知识库管理 →"入口 |

## 切换条件

1. 浏览器：管理员后台 → 新建知识"T700 板的密度是 1.78 g/cm³" → 上架
2. AI 抽屉问"T700 板密度是多少" → 命中知识 + LLM 回答附"📚 来源：T700 板的密度"
3. 问知识库没有的（如"明天天气"）→ AI 走 LLM 兜底，不附来源
4. PHPUnit 新增 ≥ 5 PASS
5. pytest 新增 ≥ 3 PASS

## 不在范围

- ❌ 真实 pgvector + embedding 模型（接口预留，留 iter-?）
- ❌ 知识库审核工作流（先用简单 active/disabled）
- ❌ Bad Case 标注后台
- ❌ 知识富文本编辑器（先用 textarea 纯文本）
