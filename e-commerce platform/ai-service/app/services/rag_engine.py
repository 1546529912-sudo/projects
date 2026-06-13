"""RAG 编排 · presale 意图使用

流程：
1. knowledge_repo.search(query) 取 top 3 知识条目
2. 拼到 LLM system prompt 作为 grounding context
3. 让 LLM 基于知识回答；返 reply + sources（前端可展示"📚 来源：xxx"）
"""
from __future__ import annotations

from typing import Any

from app.infra import knowledge_repo
from app.services import llm_provider


SYSTEM_PROMPT_TEMPLATE = """你是中研复材的售前顾问。基于下面的【公司知识库】回答用户问题。

【公司知识库】
{knowledge_block}

回答要求：
- 优先使用知识库内容，不要编造未列出的具体参数
- 简洁、专业、3-5 句话
- 若知识库无法覆盖，诚实告知并建议联系销售
- 不要在回答里复述"知识库"三个字
"""


def answer_with_grounding(query: str, history: list[dict[str, str]]) -> dict[str, Any]:
    """返回 {reply, sources, confidence}.

    sources 用于前端展示来源标注。
    """
    hits = knowledge_repo.search(query, top_k=3)
    if not hits:
        # 知识库未命中 → 走通用 LLM 兜底
        reply = llm_provider.chat(
            "你是中研复材的售前顾问。简洁、专业地回答用户问题。当你不确定具体参数时，请如实说明并建议联系销售。",
            history,
            query,
        )
        return {"reply": reply, "sources": [], "confidence": 0.4}

    knowledge_block = "\n\n".join(
        f"[#{i+1}] {h['title']}\n{h['content']}\n（来源：{h.get('source') or h.get('category', '内部资料')}）"
        for i, h in enumerate(hits)
    )

    prompt = SYSTEM_PROMPT_TEMPLATE.format(knowledge_block=knowledge_block)
    reply = llm_provider.chat(prompt, history, query)

    return {
        "reply": reply,
        "sources": [
            {
                "id": h["id"],
                "title": h["title"],
                "category": h["category"],
                "source": h.get("source"),
            }
            for h in hits
        ],
        "confidence": max(h["confidence"] for h in hits),
    }
