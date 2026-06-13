# Iteration 6 · Runbook（AI 报价 + 智能客服闭环，mock LLM 模式）

## 【当前焦点】

- 范围：AI-001 自动报价 + AI-002 智能客服（主要 UI/接口/数据链路）
- LLM 模式：本期用 **rule-based mock**（关键词识别 + 规则报价），ai-service 接口和契约对齐 DeepSeek/通义千问，等用户提供 API key 时只换一处 LLM provider
- 真实接入路径：替换 `ai-service/app/services/llm_client.py` 的 `mock_provider` 为 `dashscope_provider` 或 `deepseek_provider`，业务代码无感

## 核心目标（用户能在浏览器看到的）

1. 任意页右下角浮动 **AI 助手** 按钮，点开右侧抽屉
2. 商品详情页"AI 报价"按钮接通 → 抽屉打开 + 预填商品上下文
3. 抽屉对话：用户问 → AI 流式回复（mock 但格式正确）→ 必要时返回 **报价单卡片**
4. 报价单卡片可一键加入购物车（复用 iter-4 加购接口）
5. AI 识别"转人工"关键词时返回 transfer 标记 + 联系电话

## Backend 任务（Laravel）

| Task | 简述 |
|------|------|
| Migration: ai_conversations | conversation 主表（session_id / source / intent / context_json / transferred） |
| Migration: ai_messages | 消息流水（sender_type=user/ai/human + content + confidence + meta） |
| Migration: ai_quotations | AI 报价单（quotation_no / items JSON / total / valid_until / status） |
| Models: AiConversation, AiMessage, AiQuotation | Eloquent + 关系 |
| AiController | createConversation / getMessages / sendMessage(代理 FastAPI 流式) / getQuotation / placeOrderFromQuotation |

## AI Service 任务（Python FastAPI）

| Task | 简述 |
|------|------|
| `services/intent_classifier.py` | 规则关键词 → 5 大意图（quotation/presale/order/aftersale/chitchat），返置信度 |
| `services/quotation_engine.py` | 解析对话采集的参数 → 从 MySQL `skus` 表匹配产品 → 应用阶梯价规则 → 返回报价单 |
| `services/llm_client.py` | 接口 `chat(messages, stream=True)`，默认 mock provider 返回基于意图的固定文本，预留 `set_provider("deepseek"/"dashscope")` |
| `infra/mysql_client.py` | 简单 SQLAlchemy 引擎，只读 catalog（products/skus） |
| `api/chat.py` 升级 | 真实意图分发 + 调对应 service + 流式吐字 + 持久化消息到 MySQL |

## Frontend 任务

| Task | 简述 |
|------|------|
| `api/ai.ts` | createConversation / sendMessage(SSE 流) / getQuotation / placeFromQuotation |
| `stores/ai.ts` | Pinia store：当前 conversation / messages / 已采集参数 / 抽屉开关 |
| `components/AiDrawer.vue` | 全局右侧抽屉，集成在 App.vue（仅登录后显示）|
| 浮动按钮 | App.vue 右下角圆形按钮触发抽屉 |
| 商品详情接入 | "AI 报价"按钮 → 打开抽屉 + 预填商品上下文 |
| 抽屉内 QuotationCard | 报价单消息渲染 + "一键下单"按钮 |

## 切换条件

1. 浏览器：任意页点浮按钮 → 抽屉打开 → 输入"T700 板材 100kg" → AI 回复 + 报价单卡片
2. 商品详情 → "AI 报价" → 抽屉自动带商品入对话
3. 报价单卡片"一键加入购物车" → 进购物车（接 iter-4 接口）
4. PHPUnit 新增 ≥ 6 PASS
5. pytest（ai-service）≥ 6 测试（含 quotation_engine 单测）

## 不在 iter-6 范围

- ❌ 真实接 DeepSeek/通义千问 API（等 key；但 provider 抽象层就位）
- ❌ RAG + pgvector 真实检索（先返"无匹配"提示 + 转人工）
- ❌ AI 报价单 PDF 下载（先在线查看；PDF iter-?）
- ❌ 多轮上下文超长截断（保最近 20 条够了）

## 风险

| 项 | 缓解 |
|----|------|
| Python pydantic 兼容 3.9 用 Optional[T] | 沿用 iter-1 的 from __future__ + Optional 做法 |
| SSE 流式响应跨 Laravel 转发 | 第一版同步 JSON（FastAPI 内部仍可流但 Laravel 转发统一拉完再返），iter-? 加 SSE 透传 |
| ai-service 跟 Laravel 共享 MySQL 只读 | 直连 MySQL 同库，只 SELECT skus/products；用环境变量配 read-only credential |
