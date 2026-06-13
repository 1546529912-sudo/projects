"""健康检查端点 · GET /ai/v1/health"""
from datetime import datetime
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "code": 0,
        "message": "ok",
        "data": {
            "service": "zhongyan-ai-service",
            "version": "0.1.0",
            "checks": {
                "pgvector": {"ok": True, "note": "skeleton stub"},
                "llm": {"ok": True, "note": "skeleton stub"},
            },
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    }
