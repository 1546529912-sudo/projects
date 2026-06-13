"""报价参数采集 · AI-001-02

从用户原文 + 已有上下文中提取报价所需参数：
material（材料）/ form（形态）/ qty / thickness_mm
"""
from __future__ import annotations

import re
from typing import Any


_MATERIAL_PATTERNS = {
    "carbon_fiber": ["碳纤维", "carbon", "t700", "t800", "t1000", "3k"],
    "glass_fiber":  ["玻璃纤维", "玻纤", "e-glass", "e玻璃"],
    "aramid":       ["芳纶", "kevlar", "aramid", "1414"],
    "prepreg":      ["预浸料", "prepreg"],
}

_FORM_PATTERNS = {
    "plate": ["板", "板材", "plate"],
    "tube":  ["管", "管材", "tube", "od"],
    "cloth": ["布", "织物", "cloth", "fabric"],
}


def extract(text: str, existing_context: dict[str, Any] | None = None) -> dict[str, Any]:
    """Return a context_patch dict with newly recognized fields."""
    existing_context = existing_context or {}
    patch: dict[str, Any] = {}
    lowered = text.lower()

    if "material" not in existing_context:
        for material, hints in _MATERIAL_PATTERNS.items():
            if any(h.lower() in lowered for h in hints):
                patch["material"] = material
                break

    if "form" not in existing_context:
        for form, hints in _FORM_PATTERNS.items():
            if any(h.lower() in lowered for h in hints):
                patch["form"] = form
                break

    # 数量：匹配 "100kg" "500 公斤" "1 吨"
    if "qty" not in existing_context:
        m = re.search(r"(\d+(?:\.\d+)?)\s*(kg|千克|公斤|t|吨)", lowered)
        if m:
            n = float(m.group(1))
            unit = m.group(2)
            if unit in ("t", "吨"):
                n *= 1000
            patch["qty"] = int(n)

    # 厚度：匹配 "3mm" "5 毫米"
    if "thickness_mm" not in existing_context:
        m = re.search(r"(\d+(?:\.\d+)?)\s*(mm|毫米|厘米)", lowered)
        if m:
            n = float(m.group(1))
            if m.group(2) == "厘米":
                n *= 10
            patch["thickness_mm"] = n

    return patch


def required_fields() -> list[str]:
    return ["material", "form", "qty"]


def missing_fields(context: dict[str, Any]) -> list[str]:
    return [f for f in required_fields() if not context.get(f)]


_FIELD_PROMPTS = {
    "material": "您需要哪种材料？比如碳纤维、玻璃纤维、芳纶？",
    "form":     "需要什么形态的产品？板材 / 管材 / 布材？",
    "qty":      "采购数量大概多少？（以 kg 为单位，比如 100kg）",
    "thickness_mm": "需要的厚度是多少？（如 3mm / 5mm）",
}


def prompt_for(field: str) -> str:
    return _FIELD_PROMPTS.get(field, f"请提供 {field} 信息")
