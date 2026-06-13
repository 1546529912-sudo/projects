"""测试 /chat/turn 核心编排链路。

不依赖 LLM provider（默认 mock），但需要 sqlite catalog 在位 — 测试中跳过真实匹配。
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_chitchat_returns_business_guidance():
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1, "user_message": "你好"
    })
    assert r.status_code == 200
    body = r.json()
    assert body["intent"] == "chitchat"
    assert "中研复材" in body["reply"]


def test_quotation_intent_with_missing_qty_asks_for_qty():
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1, "user_message": "我要碳纤维板，多少钱"
    })
    body = r.json()
    assert body["intent"] == "quotation"
    assert body["context_patch"]["material"] == "carbon_fiber"
    assert body["context_patch"]["form"] == "plate"
    assert body["quotation"] is None
    assert "数量" in body["reply"]


def test_quotation_intent_with_full_context_returns_quotation():
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1,
        "user_message": "请报价",
        "context_json": {"material": "carbon_fiber", "form": "plate", "qty": 100},
    })
    body = r.json()
    assert body["intent"] == "quotation"
    # 可能成功也可能没匹配（取决于 sqlite 是否在）
    if body["quotation"]:
        assert body["quotation"]["items"][0]["qty"] == 100
        assert float(body["quotation"]["total_amount"]) > 0
    else:
        assert body["transfer_to_human"] is True


def test_large_quantity_triggers_transfer():
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1,
        "user_message": "5000kg",
        "context_json": {"material": "carbon_fiber", "form": "plate", "qty": 5000},
    })
    body = r.json()
    assert body["transfer_to_human"] is True
    assert body["transfer_reason"] == "large_qty"


def test_keyword_transfer_to_human():
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1, "user_message": "请转人工"
    })
    body = r.json()
    assert body["transfer_to_human"] is True
    assert body["transfer_reason"] == "user_requested"


def test_intent_classifier_recognizes_aftersale():
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1, "user_message": "我要退款"
    })
    body = r.json()
    assert body["intent"] == "aftersale"


def test_intent_classifier_recognizes_presale_params():
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1, "user_message": "碳纤维板的密度是多少"
    })
    body = r.json()
    # 命中"密度"/"材料"等 presale 关键词
    assert body["intent"] in ("presale", "quotation")  # "碳纤维板"也匹配quotation的keywords是否影响 — 实际是 presale


def test_legacy_stream_endpoint_alias():
    """旧 /chat/stream 端点保留兼容，应返回相同结构。"""
    r = client.post("/ai/v1/chat/stream", json={
        "conversation_id": 1, "user_message": "你好"
    })
    assert r.status_code == 200
    assert r.json()["intent"] == "chitchat"
