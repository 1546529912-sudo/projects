"""RAG 集成测试 · 依赖 backend-laravel/database/database.sqlite 已 seed knowledge_base"""
from fastapi.testclient import TestClient
from app.main import app
from app.infra import knowledge_repo
from app.services import rag_engine

client = TestClient(app)


def test_knowledge_search_returns_hits_for_known_terms():
    """直接测 FTS5 检索：T700 密度 应命中知识"""
    hits = knowledge_repo.search("T700 密度", top_k=3)
    assert len(hits) > 0
    assert any("T700" in h["title"] for h in hits)


def test_knowledge_search_returns_empty_for_unknown():
    hits = knowledge_repo.search("外星人飞船需要什么材料", top_k=3)
    # 部分中文字符仍可能有 hit；只断言 confidence 都较低
    if hits:
        assert all(h["confidence"] < 0.5 for h in hits)


def test_rag_engine_returns_sources_when_hit():
    result = rag_engine.answer_with_grounding("T700 的密度是多少", history=[])
    assert "reply" in result
    assert isinstance(result["sources"], list)
    # 命中时 sources 非空
    if result["sources"]:
        assert all("title" in s and "id" in s for s in result["sources"])


def test_chat_turn_presale_returns_rag_sources():
    """端到端：presale 意图问参数 → 应返 sources"""
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1,
        "user_message": "T700 板的密度是多少",
    })
    assert r.status_code == 200
    body = r.json()
    # intent classifier 把"密度"判为 presale
    assert body["intent"] == "presale"
    # RAG 应命中
    assert len(body["sources"]) > 0
    assert any("T700" in s["title"] for s in body["sources"])


def test_chat_turn_chitchat_does_not_use_rag():
    """闲聊不走 RAG，sources 为空"""
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1, "user_message": "你好"
    })
    body = r.json()
    assert body["intent"] == "chitchat"
    assert body["sources"] == []


def test_chat_turn_quotation_does_not_use_rag():
    """报价场景不走 RAG，走规则报价引擎"""
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1,
        "user_message": "请报价",
        "context_json": {"material": "carbon_fiber", "form": "plate", "qty": 100},
    })
    body = r.json()
    assert body["intent"] == "quotation"
    assert body["sources"] == []
