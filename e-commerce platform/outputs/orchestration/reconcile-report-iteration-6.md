# Reconcile Report · Iteration 6（AI 报价 + 智能客服闭环 · mock LLM 模式）

> 主控对账。完成时间：2026-05-22 23:35

## 【当前焦点】

- 范围：AI-001 自动报价 + AI-002 智能客服（对话编排链路 + 报价单 + 一键加购）
- LLM 模式：**rule-based + mock LLM provider**（`LLM_PROVIDER=mock`）。Provider 抽象层就位，等用户提供 DeepSeek/通义千问 API key 时只改 `LLM_PROVIDER=deepseek` + 解开 `_deepseek_chat` 注释即可
- 视觉：同时按用户要求换工业克莱因蓝主色 `#002fa7`，商品图换为 picsum 稳定占位
- 测试：PHPUnit **73/73 PASS**（新增 7）· pytest **14/14 PASS**（新增 8）

## 端到端实测（已跑）

```
登录 buyer → 创建 conversation → 
Turn1 "我要碳纤维板"   → AI 识别 material/form，追问数量
Turn2 "100 kg"          → 真实匹配 SKU + 生成报价单 Q2026052123290103, ¥128000
一键加购                → 购物车 100 件 T700 板, total ¥128010（含运费）
```

## 后端产物（Laravel）

| 文件 | 说明 |
|------|------|
| `database/migrations/2026_05_22_000010_create_ai_tables.php` | ai_conversations / ai_messages / ai_quotations 三表 |
| `app/Models/AiConversation.php` | + messages() 关系 + context_json cast |
| `app/Models/AiMessage.php` | + meta JSON |
| `app/Models/AiQuotation.php` | + items JSON + valid_until datetime |
| `app/Http/Controllers/Api/AiController.php` | createConversation / getConversation / sendMessage / getQuotation / addQuotationToCart — 代理调 FastAPI + 持久化 + 报价单创建 + 加购事务 |
| `routes/api.php` | 5 个 AI 接口 |

## AI Service 产物（FastAPI）

| 文件 | 说明 |
|------|------|
| `app/services/intent_classifier.py` | 关键词 → 5 大意图，含 transfer 关键词识别 |
| `app/services/param_extractor.py` | 正则提取 material/form/qty/thickness，含追问 prompts |
| `app/services/quotation_engine.py` | 调 catalog_repo 匹配 SKU + 价格计算 + 大批量转人工 |
| `app/services/llm_provider.py` | mock + DeepSeek + dashscope 三个 provider 占位，统一 chat() 入口 |
| `app/infra/catalog_repo.py` | 只读 SQLite catalog（生产换 MySQL read-only） |
| `app/api/chat.py` 重写 | `/chat/turn` 编排链路（意图 → 参数采集 → 报价 → LLM 兜底）+ Step 1.5 智能升级 quotation 意图 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/api/ai.ts` | 4 函数：createConversation / sendMessage / getConversation / addQuotationToCart |
| `src/stores/ai.ts` | Pinia store：drawerOpen / messages / quotationByMessageId / collectedContext / transferred |
| `src/components/AiDrawer.vue` | 全局右侧抽屉 + 已采集参数 chips + 消息气泡 + 报价单卡片 + Quick prompts |
| `src/App.vue` | 右下浮动 AI 按钮（已登录显示）+ 挂载 AiDrawer + 登录态变化时同步 |
| `src/views/product/ProductDetailPage.vue` | "AI 报价"按钮接通：开抽屉 + 预填 product_id/sku_id 上下文 |
| `src/styles/tokens.css` | 主色换工业克莱因蓝 `#002fa7` + 新增 `--color-primary-tint` |
| `outputs/design/design-system.md` + `outputs/product/design-brief.md` | 同步色值更新（v2 IKB） |
| Seeder | 商品主图换 picsum 稳定 seed URL |

## 测试结果（真实执行）

### PHPUnit 73/73 PASS

```
✅ AI Controller (7)     — 新增（含 conversation 持久化、quotation 创建、转人工标记、一键加购、过期校验）
✅ + 之前 66 全部通过
```

### pytest 14/14 PASS

```
✅ test_chat_turn (8)    — 新增（闲聊 / 报价不全 / 报价完整 / 大批量转人工 / 转人工关键词 / 售后 / 售前 / 旧接口兼容）
✅ test_health (6)        — 之前
```

### 端到端 curl（实测 5 步）

| # | 操作 | 结果 |
|---|------|------|
| 1 | POST /ai/conversations (source=global_chat) | ✅ conv_id=3 |
| 2 | Turn1: "我要碳纤维板" | ✅ 追问数量 + context_json 写入 {material: carbon_fiber, form: plate} |
| 3 | Turn2: "100 kg" | ✅ 报价单 Q2026052123290103, 100 件, ¥128000 |
| 4 | POST /ai/quotations/2/add-to-cart | ✅ added=1 |
| 5 | GET /cart | ✅ 1 件商品, qty=100, total ¥128010 |

## HARNESS 5 项硬约束

| # | 约束 | 状态 |
|---|------|------|
| 1 | 产物清单已提交 | ✅ 6 后端 + 6 前端 + 6 AI 服务 |
| 2 | 主控 ls 验证存在 | ✅ |
| 3 | 自动化测试 PASS | ✅ PHPUnit 73/73 + pytest 14/14 + Vitest 18/18 |
| 4 | 手动测试用户勾选 | ⏳ |
| 5 | 对账报告已生成 | ✅ |

## 用户手动验收步骤

打开 http://localhost:5173/

1. 登录 buyer（13900000000 / buyer123）
2. 右下角看到 **💬 AI 助手** 浮动按钮（蓝色）→ 点开
3. 输入 "碳纤维板 100kg 报价" → AI 识别参数 + 返回报价单卡片
4. 点报价单上 **一键加入购物车** → 跳转 /cart → 看到 T700 板 ×100 件
5. 也可在任意商品详情页点 **💬 AI 智能报价** → 抽屉自动带商品上下文打开

## 真实接入 DeepSeek 的步骤（≤ 5 分钟）

```bash
# 在 ai-service/ 启动前设环境变量
export LLM_PROVIDER=deepseek
export LLM_API_KEY=sk-xxx          # 你的 DeepSeek key
export LLM_MODEL=deepseek-chat      # 或 deepseek-reasoner
```

然后取消 `app/services/llm_provider.py::_deepseek_chat` 中注释代码，业务侧代码完全不变。

## 风险与已知问题

| 项 | 说明 |
|----|------|
| Mock 模式 ⚠️ | 当前 LLM 是规则回复 + mock provider；用户输入复杂自然语言时回复浅 |
| catalog_repo 直连 SQLite | 测试方便；生产环境换 MySQL read-only 副本 |
| 上下文重复升级问题 | Step 1.5 升级 quotation 意图后参数会被 Step 4 二次提取（语义重复但不影响结果）|
| SSE 流式 | 同步 JSON 返回；流式 token 输出留 iter-?（不影响功能）|
| AI 报价单 PDF | 接口字段就位但未生成 PDF；下载交互 iter-? |

## iteration-7 候选

| 方向 | 简述 |
|------|------|
| **接 DeepSeek 真实 LLM** ⭐ | 你贴 API key 即可 |
| **SKU 多规格 + 阶梯价** | 深化商品（100kg/500kg/1000kg 分档） |
| **RAG 知识库 + pgvector** | 售前问答匹配产品规格书 |
| **物流接快递鸟** | 真实物流轨迹 |
| **超时取消 + Redis 预扣** | 工程质量 |
