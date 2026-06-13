"""中研复材 · AI 微服务入口

挂载 4 个核心路由组：health / intent / rag / chat / quotation
对应 outputs/architecture/api-list.md 第 6 节 FastAPI 端点。
"""
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 自动加载 ai-service/.env 中的环境变量（LLM_PROVIDER / LLM_API_KEY 等）
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.api import health, intent, rag, chat, quotation

app = FastAPI(
    title="Zhongyan Composite Platform · AI Service",
    description="意图识别 / RAG 检索 / 报价计算 / 智能客服",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由挂载（前缀 /ai/v1）
app.include_router(health.router, prefix="/ai/v1")
app.include_router(intent.router, prefix="/ai/v1")
app.include_router(rag.router, prefix="/ai/v1")
app.include_router(chat.router, prefix="/ai/v1")
app.include_router(quotation.router, prefix="/ai/v1")


@app.get("/")
def root():
    return {"service": "ai-service", "version": "0.1.0", "docs": "/docs"}
