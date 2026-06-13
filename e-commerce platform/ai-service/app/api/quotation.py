"""报价计算 · 对应 AI-001-04/05

POST /ai/v1/quotation/generate
入参: { "user_id": 1, "params": {"material":"carbon_fiber","form":"plate","qty":100,"thickness_mm":3 } }
出参: { "items": [...], "total_amount": "128000.00", "valid_until": "..." }

第一期 stub: 返回 mock 报价（待对接 MySQL skus + price_tiers）
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["quotation"])


class QuotationParams(BaseModel):
    material: str
    form: str
    qty: int
    thickness_mm: Optional[float] = None
    fiber_direction: Optional[str] = None
    certification: Optional[str] = None


class QuotationRequest(BaseModel):
    user_id: int
    params: QuotationParams


class QuotationItem(BaseModel):
    sku_code: str
    name: str
    spec: str
    qty: int
    unit_price: str
    total: str


class QuotationResponse(BaseModel):
    items: List[QuotationItem]
    total_amount: str
    valid_until: str
    confidence: float
    transfer_to_human: bool = False
    reason: Optional[str] = None


@router.post("/quotation/generate", response_model=QuotationResponse)
def generate(req: QuotationRequest):
    # 兜底转人工规则（AI-001-07）
    if req.params.qty > 1000:
        return QuotationResponse(
            items=[],
            total_amount="0.00",
            valid_until="",
            confidence=0.0,
            transfer_to_human=True,
            reason="超大批量需要人工报价",
        )

    # Stub mock 报价（后续替换为真实匹配 + 阶梯价计算）
    unit_price = 1280 if req.params.material == "carbon_fiber" else 580
    total = unit_price * req.params.qty
    item = QuotationItem(
        sku_code=f"{req.params.material.upper()}-{req.params.form.upper()}-MOCK",
        name=f"{req.params.material} {req.params.form}",
        spec=f"厚度 {req.params.thickness_mm or '?'} mm",
        qty=req.params.qty,
        unit_price=f"{unit_price:.2f}",
        total=f"{total:.2f}",
    )
    return QuotationResponse(
        items=[item],
        total_amount=f"{total:.2f}",
        valid_until=(datetime.utcnow() + timedelta(days=7)).isoformat() + "Z",
        confidence=0.85,
    )
