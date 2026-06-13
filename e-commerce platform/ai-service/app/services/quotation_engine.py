"""报价引擎 · AI-001-04/05

根据已采集参数 → 匹配 SKU → 应用价格规则（暂用基础价，iter-? 上阶梯价）
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from app.infra import catalog_repo


def build_quotation(context: dict[str, Any]) -> dict[str, Any] | None:
    """从已采集参数生成报价单数据。无匹配返回 None。"""
    material = context.get("material")
    form = context.get("form")
    qty = int(context.get("qty") or 1)

    if not material or not form or qty < 1:
        return None

    candidates = catalog_repo.find_matching_skus(material, form, qty)
    if not candidates:
        return None

    # 第一期取最低价 SKU；后续可改"按厚度精确匹配"
    sku = candidates[0]

    if sku["stock"] < qty:
        return {
            "items": [],
            "total_amount": "0.00",
            "valid_until": (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z",
            "remark": f"匹配商品 {sku['name']} 库存不足（仅 {sku['stock']} 件），建议联系销售。",
            "transfer_to_human": True,
        }

    # 应用阶梯价（命中区间用该档价，否则 base_price）
    base_price = float(sku["base_price"])
    unit_price = catalog_repo.resolve_price(sku["sku_id"], qty, base_price)
    total = round(unit_price * qty, 2)

    items = [{
        "sku_id": sku["sku_id"],
        "sku_code": sku["sku_code"],
        "name": sku["name"],
        "qty": qty,
        "unit_price": f"{unit_price:.2f}",
        "total": f"{total:.2f}",
    }]

    saved = base_price - unit_price
    remark = "价格以下单时为准；如需多型号比价可继续追问。"
    if saved > 0.01:
        remark = (
            f"已应用 {qty} kg 阶梯价（单价 ¥{unit_price:.2f}，"
            f"较零售价节省 ¥{saved:.2f}/kg）。" + remark
        )

    return {
        "items": items,
        "total_amount": f"{total:.2f}",
        "valid_until": (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z",
        "remark": remark,
        "transfer_to_human": False,
    }


def needs_transfer_for_large_order(qty: int) -> bool:
    """大批量自动转人工。"""
    return qty >= 1000
