# AI Service · Python FastAPI

## 启动

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## 健康检查

```bash
curl http://127.0.0.1:8001/ai/v1/health
```

## API 文档

- Swagger UI: http://127.0.0.1:8001/docs
- ReDoc: http://127.0.0.1:8001/redoc

## 已实现的端点

| 路径 | 方法 | 状态 | 说明 |
|------|------|------|------|
| /ai/v1/health | GET | ✅ 真实 | 健康检查 |
| /ai/v1/intent/classify | POST | ⚠️ stub（关键词） | 待替换为 LLM 调用 |
| /ai/v1/rag/query | POST | ⚠️ stub（空返回） | 待对接 pgvector |
| /ai/v1/chat/stream | POST | ⚠️ stub（固定文本流） | 待对接 LLM provider |
| /ai/v1/quotation/generate | POST | ⚠️ stub（mock 价格） | 待对接 MySQL skus + 阶梯价 |

## 测试

```bash
pytest
```

## 目录

- `app/api/` — FastAPI 路由（与 [api-list.md](../outputs/architecture/api-list.md) 第 6 节对应）
- `app/services/` — RAG / LLM / 报价业务逻辑
- `app/infra/` — pgvector / MySQL / Redis / LLM 适配层（按 [module-deps.md](../outputs/architecture/module-deps.md)）
- `tests/` — pytest

## 接入 Laravel

- Laravel 通过 `AI_SERVICE_URL=http://127.0.0.1:8001` 调用本服务
- 当前 Laravel HealthController 已实现 `/ai/v1/health` 联通检查
- 后续 Laravel `AiProxyController` 通过 Sanctum 鉴权后转发请求到本服务
