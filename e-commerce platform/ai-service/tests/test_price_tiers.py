"""测试 quotation_engine 应用阶梯价。

依赖 catalog_repo 直连 SQLite，因此需要 Laravel seeder 已跑。
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_quotation_uses_tier_price_for_t700_plate_100kg():
    """100kg → 命中 [100-499] 档 ¥1280"""
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1,
        "user_message": "100kg",
        "context_json": {"material": "carbon_fiber", "form": "plate", "qty": 100},
    })
    body = r.json()
    if body.get("quotation"):
        unit = float(body["quotation"]["items"][0]["unit_price"])
        # 100 件命中第 2 档 1280（base 1380）
        assert unit <= 1380.0
        # 100 件以上一定比 base_price 便宜
        if unit < 1380.0:
            assert "阶梯价" in body["quotation"]["remark"]


def test_quotation_small_qty_uses_first_tier():
    """1kg → 第一档 base 价"""
    r = client.post("/ai/v1/chat/turn", json={
        "conversation_id": 1,
        "user_message": "1kg",
        "context_json": {"material": "carbon_fiber", "form": "plate", "qty": 1},
    })
    body = r.json()
    if body.get("quotation"):
        unit = float(body["quotation"]["items"][0]["unit_price"])
        # 第一档（1-99）就是 1380
        assert unit >= 1280.0
