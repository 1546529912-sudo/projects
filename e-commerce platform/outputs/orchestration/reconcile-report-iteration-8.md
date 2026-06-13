# Reconcile Report · Iteration 8（RAG 知识库 · SQLite FTS5 轻量版）

> 完成时间：2026-05-22

## 【当前焦点】

- 范围：AI-002-02 售前 RAG + AI-004 知识库管理后台
- 选型：**SQLite FTS5 全文索引**（接口契约对齐 pgvector，可后续平替）
- 结论：DeepSeek 真实从公司知识库取答案 + 自动附"📚 来源：xx"标注
- 测试：PHPUnit **85/85** · pytest **22/22**（新增 6 + 6）

## 后端产物

| 文件 | 说明 |
|------|------|
| `migrations/2026_05_22_000012_create_knowledge_base.php` | KB 主表 + FTS5 虚拟表 + 3 个 trigger 自动同步索引 |
| `Models/KnowledgeBase.php` | active() scope |
| `Http/Controllers/Api/KnowledgeAdminController.php` | index / store / show / update / destroy / toggle |
| `Seeders/KnowledgeBaseSeeder.php` | **15 条 FAQ**（产品参数 / 价格政策 / 物流 / 售后 / 应用场景 5 类）|
| `routes/api.php` | 注册 6 个 admin/knowledge 接口 |
| `AiController.persistAiMessage` | 把 RAG sources 持久化到 ai_messages.meta |

## AI Service 产物

| 文件 | 说明 |
|------|------|
| `infra/knowledge_repo.py` | `search(query, top_k)` 用 SQLite FTS5 bm25 排序；`_build_fts_query` 防注入 |
| `services/rag_engine.py` | `answer_with_grounding`：命中知识 → 拼到 system_prompt → LLM；未命中 → 通用兜底 |
| `api/chat.py` | Step 1.5 仅在含 qty 时升级 quotation；Step 5 改走 RAG（任何非报价/闲聊都尝试） |

## 前端产物

| 文件 | 说明 |
|------|------|
| `api/knowledge.ts` | CRUD + toggle 封装 |
| `views/admin/KnowledgePage.vue` | 表格 + 搜索 + 新建/编辑模态 + 上下架 + 删除 |
| `components/AiDrawer.vue` | AI 消息底部 "📚 来源：xx" 渲染（meta.sources） |
| `router/index.ts` | + `/admin/knowledge` 路由（requiresAdmin） |
| `views/profile/MePage.vue` | admin 卡片加"知识库 →"入口 |

## 端到端实测

```
登录 buyer → AI 抽屉问 "T700 板的密度是多少" →
  intent: presale, sources hit: 3 条
  DeepSeek 回复："T700 碳纤维板的密度为 1.78 g/cm³，同时具备 4900 MPa 的抗伸强度
                  和 230 GPa 的弹性模量，适用于航空、汽车结构件及运动器材..."
  📚 来源：T700 碳纤维板密度 / 无人机机身材料选型 / 复合材料航空应用
  meta.sources 已持久化到 ai_messages 表
```

## RAG 路由策略（升级版意图分流）

```
                   ┌─ chitchat → 引导回业务
                   ├─ transfer 关键词 → 立即转人工
意图分流 ─────────► ├─ 含 qty 数字 → 报价引擎（规则）
                   ├─ 含 material+form 但无 qty → presale → RAG
                   └─ 其他（presale/order/aftersale/other）→ RAG
                                   │
                                   ▼
                  ┌─────────── RAG ──────────┐
                  │ FTS5 全文检索 top 3      │
                  │ ┌── 命中 → 拼进 LLM      │
                  │ │       prompt + sources │
                  │ └── 未命中 → 通用 LLM    │
                  │       兜底（sources=[])  │
                  └──────────────────────────┘
```

## 测试结果

```
PHPUnit 85/85 PASS（新增 6 KnowledgeAdmin）
pytest  22/22 PASS（新增 6 RAG：FTS5 召回、grounding、空命中、presale 端到端、非走 RAG）
Vitest  18/18 PASS（无新增）
```

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 6 后端 + 5 前端 + 3 AI 服务 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ |
| 手动验收 | ⏳ |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. admin 账号 → 个人中心 → **知识库 →** 进入管理页
2. 看到 15 条预置 FAQ（T700 密度 / 阶梯价说明 / 物流交期 / 大客户议价 等）
3. 新建一条："3K 碳布抗剪强度" → 内容随意 → 上架
4. 切 buyer 账号 → 右下 AI → 问"T700 板密度多少"
5. 应看到 DeepSeek 回答 + 底部"📚 来源：T700 碳纤维板密度、无人机机身材料选型..."
6. 再问"明天天气" → AI 走兜底，无 sources

## 风险与已知问题

| 项 | 说明 |
|----|------|
| FTS5 中文按字 token | "大客户" 在文档中按字分散时召回率打折；语义检索需 embedding 升级 |
| 无审核工作流 | 第一期 active/disabled 切换；多人协作后需加 pending_review |
| 富文本编辑 | 纯 textarea；后续可换 ProseMirror / TipTap |
| Bad Case 收集 | 未实现 AI-004-05；建议 iter-? 加"知识库未命中"日志统计 |

## iteration-9 候选

| 方向 | 简述 |
|------|------|
| **pgvector + embedding** ⭐ | 语义检索（解决 FTS5 按字 token 的中文召回弱点） |
| 物流接快递鸟 | 真实轨迹 |
| Redis Lua 预扣 + 超时取消 | 工程质量 |
| Bad Case 收集 + 标注后台 | AI 持续改善闭环 |
| Admin Policy 精细化 | 后端权限校验 |
