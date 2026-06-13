"""意图识别 · 对应 AI-002-01

POST /ai/v1/intent/classify
入参: { "message": "用户原文" }
出参: { "intent": "quotation|presale|order|aftersale|chitchat|other", "confidence": 0.92 }

第一期 stub: 关键词路由（生产替换为 LLM 调用）
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["intent"])


class IntentRequest(BaseModel):
    message: str


class IntentResponse(BaseModel):
    intent: str
    confidence: float


_KEYWORDS = {
    "quotation": ["报价", "多少钱", "价格", "便宜"],
    "order": ["订单", "物流", "到哪", "我的单"],
    "aftersale": ["退货", "退款", "投诉", "纠纷", "质量问题"],
    "presale": ["参数", "规格", "材料", "型号"],
}


@router.post("/intent/classify", response_model=IntentResponse)
def classify(req: IntentRequest):
    text = req.message
    for intent, keywords in _KEYWORDS.items():
        if any(k in text for k in keywords):
            return IntentResponse(intent=intent, confidence=0.85)
    return IntentResponse(intent="chitchat", confidence=0.50)
