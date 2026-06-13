"""知识库检索 · 用 SQLite FTS5 全文索引

接口契约对齐 pgvector RAG，未来切真实向量检索只改本文件。
"""
from __future__ import annotations

from typing import Any

from app.infra.catalog_repo import _conn  # 共用 SQLite 连接（同一 backend-laravel/database.sqlite）


def search(query: str, top_k: int = 3, min_score: float = 0.1) -> list[dict[str, Any]]:
    """全文检索知识库。返回 top_k 条命中（按相关性降序）。

    使用 FTS5 unicode61 tokenizer + bm25 排序。
    中文按字 token，所以查询会自动覆盖部分关键词。
    """
    if not query or not query.strip():
        return []

    cleaned = _build_fts_query(query)
    if not cleaned:
        return []

    with _conn() as c:
        if c is None:
            return []
        try:
            rows = c.execute(
                """
                SELECT kb.id, kb.title, kb.content, kb.category, kb.source,
                       bm25(knowledge_base_fts) AS score
                FROM knowledge_base_fts
                JOIN knowledge_base AS kb ON kb.id = knowledge_base_fts.rowid
                WHERE knowledge_base_fts MATCH ? AND kb.status = 'active'
                ORDER BY score
                LIMIT ?
                """,
                (cleaned, top_k),
            ).fetchall()
        except Exception:
            return []

        results = []
        for r in rows:
            d = dict(r)
            # bm25 越小越相关 → 转 0-1 信度（粗略归一化）
            d["confidence"] = round(1.0 / (1.0 + max(d["score"], 0.0)), 3)
            d.pop("score", None)
            results.append(d)
        return results


def _build_fts_query(text: str) -> str:
    """把用户原文转 FTS5 安全查询。

    策略：
    1. 去掉 FTS5 操作符（避免注入）
    2. 按空格切；非空白也保留
    3. 用 OR 连接（任意 token 命中都召回）
    """
    bad = set('"():*^+-')
    cleaned = "".join(ch if ch not in bad else " " for ch in text).strip()
    if not cleaned:
        return ""
    # 中文短语用引号包，让 FTS5 按短语匹配（unicode61 下等价于字符 AND）
    parts = []
    for tok in cleaned.split():
        if tok:
            parts.append(f'"{tok}"')
    return " OR ".join(parts) if parts else ""
