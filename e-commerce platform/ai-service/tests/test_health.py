from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint_returns_ok():
    res = client.get("/ai/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["code"] == 0
    assert body["data"]["service"] == "zhongyan-ai-service"
    assert "checks" in body["data"]


def test_intent_classify_quotation():
    res = client.post("/ai/v1/intent/classify", json={"message": "T700 多少钱"})
    assert res.status_code == 200
    assert res.json()["intent"] == "quotation"


def test_intent_classify_chitchat():
    res = client.post("/ai/v1/intent/classify", json={"message": "今天天气怎么样"})
    assert res.status_code == 200
    assert res.json()["intent"] == "chitchat"


def test_quotation_generates_for_small_qty():
    res = client.post(
        "/ai/v1/quotation/generate",
        json={"user_id": 1, "params": {"material": "carbon_fiber", "form": "plate", "qty": 100, "thickness_mm": 3}},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["transfer_to_human"] is False
    assert float(body["total_amount"]) > 0


def test_quotation_transfers_for_large_qty():
    res = client.post(
        "/ai/v1/quotation/generate",
        json={"user_id": 1, "params": {"material": "carbon_fiber", "form": "plate", "qty": 5000}},
    )
    assert res.status_code == 200
    assert res.json()["transfer_to_human"] is True


def test_rag_query_returns_empty_in_skeleton():
    res = client.post("/ai/v1/rag/query", json={"query": "碳纤维板密度", "top_k": 3})
    assert res.status_code == 200
    assert res.json()["results"] == []
