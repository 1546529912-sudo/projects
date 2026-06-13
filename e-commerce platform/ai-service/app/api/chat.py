"""对话编排 · 主端点 POST /ai/v1/chat/turn

整合：
1. 意图识别（intent_classifier）
2. 参数采集（param_extractor）
3. 报价引擎（quotation_engine）
4. LLM 兜底生成（llm_provider）

调用方（Laravel AiController）负责持久化消息与报价单。
"""
from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import intent_classifier, param_extractor, quotation_engine, llm_provider, rag_engine

router = APIRouter(tags=["chat"])


class ContextMessage(BaseModel):
    role: str  # user / ai / human
    content: str


class TurnRequest(BaseModel):
    conversation_id: int
    user_id: Optional[int] = None
    user_message: str
    context_messages: List[ContextMessage] = []
    context_json: Optional[dict] = None


class QuotationData(BaseModel):
    items: list[dict]
    total_amount: str
    valid_until: str
    remark: Optional[str] = None


class KnowledgeSource(BaseModel):
    id: int
    title: str
    category: str
    source: Optional[str] = None


class TurnResponse(BaseModel):
    reply: str
    intent: str
    confidence: float
    context_patch: Optional[dict] = None
    quotation: Optional[QuotationData] = None
    sources: list[KnowledgeSource] = []
    transfer_to_human: bool = False
    transfer_reason: Optional[str] = None


SYSTEM_PROMPT = (
    "你是中研复材的 AI 销售助手。你专业、简洁、不啰嗦。"
    "你帮用户匹配复合材料商品、计算报价、查询订单。"
    "对超出业务范围或闲聊不要展开，温和引导回业务话题。"
)


@router.post("/chat/turn", response_model=TurnResponse)
def chat_turn(req: TurnRequest) -> TurnResponse:
    msg = req.user_message
    ctx = dict(req.context_json or {})
    context_patch: dict[str, Any] = {}

    # Step 1: 意图识别
    intent_res = intent_classifier.classify(msg)

    # Step 1.5: 只在消息明确含 qty（"100kg/500件"）时升级 quotation。
    # 这样 "T700 板密度多少" 仍走 presale → RAG，不被误判为报价。
    pre_extracted = param_extractor.extract(msg, ctx)
    if pre_extracted.get("qty") and intent_res.intent in ("other", "presale"):
        intent_res = intent_classifier.IntentResult(intent="quotation", confidence=0.85)

    # Step 2: 主动转人工
    if intent_res.matched_keyword and "人工" in (intent_res.matched_keyword or "") or "客服" in msg:
        return TurnResponse(
            reply="好的，已为您转接人工客服，工作日 9:00-18:00 会有同事联系您。",
            intent="other",
            confidence=0.95,
            transfer_to_human=True,
            transfer_reason="user_requested",
        )

    # Step 3: 闲聊兜底
    if intent_res.intent == "chitchat":
        return TurnResponse(
            reply="您好！我是中研复材 AI 助手，可以帮您查询商品参数、生成报价、跟踪订单。请问需要什么帮助？",
            intent="chitchat",
            confidence=intent_res.confidence,
        )

    # Step 4: 报价场景 — 参数采集 + 报价引擎
    if intent_res.intent == "quotation":
        new_patch = param_extractor.extract(msg, ctx)
        if new_patch:
            ctx.update(new_patch)
            context_patch.update(new_patch)

        missing = param_extractor.missing_fields(ctx)
        if missing:
            field = missing[0]
            return TurnResponse(
                reply=param_extractor.prompt_for(field),
                intent="quotation",
                confidence=0.9,
                context_patch=context_patch or None,
            )

        # 大批量自动转人工
        if quotation_engine.needs_transfer_for_large_order(int(ctx.get("qty", 0))):
            return TurnResponse(
                reply=f"您的采购量较大（{ctx.get('qty')} kg），已为您转接销售经理，会在 1 个工作日内主动联系您。",
                intent="quotation",
                confidence=0.95,
                context_patch=context_patch or None,
                transfer_to_human=True,
                transfer_reason="large_qty",
            )

        # 匹配报价
        quotation = quotation_engine.build_quotation(ctx)
        if not quotation:
            return TurnResponse(
                reply=f"很抱歉，按当前参数（材料={ctx.get('material')} / 形态={ctx.get('form')} / 数量={ctx.get('qty')}）暂未匹配到合适商品。已为您转接销售。",
                intent="quotation",
                confidence=0.85,
                context_patch=context_patch or None,
                transfer_to_human=True,
                transfer_reason="no_match",
            )

        if quotation.get("transfer_to_human"):
            return TurnResponse(
                reply=quotation.get("remark") or "已为您转接销售。",
                intent="quotation",
                confidence=0.85,
                context_patch=context_patch or None,
                transfer_to_human=True,
                transfer_reason="stock_insufficient",
            )

        item = quotation["items"][0]
        reply = (
            f"已为您匹配：{item['name']}，单价 ¥{item['unit_price']}，"
            f"{item['qty']} 件合计 ¥{item['total']}。"
            "请确认后可一键加入购物车。"
        )
        return TurnResponse(
            reply=reply,
            intent="quotation",
            confidence=0.9,
            context_patch=context_patch or None,
            quotation=QuotationData(**{
                "items": quotation["items"],
                "total_amount": quotation["total_amount"],
                "valid_until": quotation["valid_until"],
                "remark": quotation.get("remark"),
            }),
        )

    # Step 5: 剩余意图（presale / order / aftersale / other）统一走 RAG。
    # rag_engine 内部：命中知识 → grounding 回答 + sources；未命中 → 通用 LLM 兜底（sources=[]）
    history = [{"role": m.role if m.role != "ai" else "assistant", "content": m.content} for m in req.context_messages]
    grounded = rag_engine.answer_with_grounding(msg, history)
    return TurnResponse(
        reply=grounded["reply"],
        intent=intent_res.intent,
        confidence=grounded["confidence"] if grounded["sources"] else intent_res.confidence,
        sources=[KnowledgeSource(**s) for s in grounded["sources"]],
    )


# 历史兼容：保留旧的流式端点（指向 turn 的同步版本，供未来扩展）
@router.post("/chat/stream")
def chat_stream_legacy(req: TurnRequest):
    return chat_turn(req)
