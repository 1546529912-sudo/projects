"""意图识别 · AI-002-01

第一期：规则关键词匹配（精度足够覆盖 5 大意图）。
真实接入时换成 LLM few-shot 分类，接口契约不变。
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class IntentResult:
    intent: str           # quotation / presale / order / aftersale / chitchat / other
    confidence: float     # 0.0 - 1.0
    matched_keyword: str | None = None


_KEYWORD_MAP: dict[str, list[str]] = {
    "quotation":  ["报价", "多少钱", "价格", "便宜", "优惠", "几千", "几万", "kg", "千克"],
    "presale":   ["参数", "规格", "材料", "型号", "厚度", "密度", "强度", "材质", "纤维", "认证"],
    "order":     ["订单", "我的单", "到哪", "发货", "物流", "什么时候到"],
    "aftersale": ["退货", "退款", "投诉", "纠纷", "质量问题", "坏了", "损坏"],
    "transfer":  ["人工", "客服", "找人", "转接"],
}

_CHITCHAT_HINTS = ["天气", "你好", "在吗", "在不在", "您好", "hi", "hello"]


def classify(message: str) -> IntentResult:
    text = message.lower()

    for kw in _KEYWORD_MAP["transfer"]:
        if kw in text:
            return IntentResult(intent="other", confidence=0.95, matched_keyword=kw)

    best_intent = None
    best_kw = None
    best_score = 0.0
    for intent, keywords in _KEYWORD_MAP.items():
        if intent == "transfer":
            continue
        for kw in keywords:
            if kw in text:
                score = 0.85 if len(kw) >= 2 else 0.70
                if score > best_score:
                    best_score = score
                    best_intent = intent
                    best_kw = kw

    if best_intent:
        return IntentResult(intent=best_intent, confidence=best_score, matched_keyword=best_kw)

    for kw in _CHITCHAT_HINTS:
        if kw in text:
            return IntentResult(intent="chitchat", confidence=0.6, matched_keyword=kw)

    return IntentResult(intent="other", confidence=0.4)
