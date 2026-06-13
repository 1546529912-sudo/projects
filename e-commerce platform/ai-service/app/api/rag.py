"""RAG 检索 · 对应 AI-002-02

POST /ai/v1/rag/query
入参: { "query": "...", "top_k": 3 }
出参: { "results": [{ "kb_id": 1, "text": "...", "score": 0.85, "category": "product" }] }

第一期 stub: 返回空列表（待 pgvector 接入）
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["rag"])


class RagQueryRequest(BaseModel):
    query: str
    top_k: int = 3
    category: Optional[str] = None


class RagItem(BaseModel):
    kb_id: int
    text: str
    score: float
    category: str
    title: Optional[str] = None


class RagQueryResponse(BaseModel):
    results: List[RagItem]
    threshold: float = 0.6


@router.post("/rag/query", response_model=RagQueryResponse)
def query(req: RagQueryRequest):
    # TODO: 1) encode query 2) pgvector cosine search 3) load kb content
    return RagQueryResponse(results=[], threshold=0.6)
