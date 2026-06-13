"""目录数据访问 · 只读 catalog（products/skus）

第一期为简化：直接连 Laravel 的 SQLite。
真实生产：MySQL 只读副本 + read-only 凭证。
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any


def _db_path() -> Path:
    """猜测 Laravel SQLite 位置。本地开发约定路径。"""
    env_path = os.environ.get("CATALOG_DB_PATH")
    if env_path:
        return Path(env_path)
    here = Path(__file__).resolve()
    # ai-service/app/infra/catalog_repo.py → ../../../backend-laravel/database/database.sqlite
    return here.parent.parent.parent.parent / "backend-laravel" / "database" / "database.sqlite"


@contextmanager
def _conn():
    path = _db_path()
    if not path.exists():
        yield None
        return
    c = sqlite3.connect(str(path))
    c.row_factory = sqlite3.Row
    try:
        yield c
    finally:
        c.close()


def find_matching_skus(material: str | None, form: str | None, qty: int = 1) -> list[dict[str, Any]]:
    """根据材料 + 形态匹配 SKU。返回最多 3 条，按价格升序。"""
    if not material:
        return []

    keyword_map = {
        "carbon_fiber": ["碳", "Carbon", "T700", "T800"],
        "glass_fiber":  ["玻", "Glass", "E"],
        "aramid":       ["芳纶", "Aramid", "1414"],
        "prepreg":      ["预浸"],
    }
    form_map = {
        "plate": ["板"],
        "tube":  ["管"],
        "cloth": ["布", "织物"],
    }
    kw = keyword_map.get(material, [])
    fkw = form_map.get(form or "", [])

    if not kw:
        return []

    with _conn() as c:
        if c is None:
            return []

        # 用 LIKE 模糊匹配 product.name
        kw_clauses = " OR ".join(["products.name LIKE ?" for _ in kw])
        params = [f"%{k}%" for k in kw]
        sql = f"""
            SELECT skus.id AS sku_id, skus.sku_code, skus.base_price, skus.stock,
                   products.id AS product_id, products.name, products.model, products.main_image_url
            FROM skus
            JOIN products ON products.id = skus.product_id
            WHERE skus.status = 'active'
              AND products.status = 'active'
              AND ({kw_clauses})
        """
        if fkw:
            form_clauses = " OR ".join(["products.name LIKE ?" for _ in fkw])
            sql += f" AND ({form_clauses})"
            params.extend([f"%{f}%" for f in fkw])

        # 优先返回库存足够的 SKU；同库存档按价格升序
        sql += " ORDER BY (CASE WHEN skus.stock >= ? THEN 0 ELSE 1 END), skus.base_price ASC LIMIT 3"
        params.append(qty)

        rows = c.execute(sql, params).fetchall()
        return [dict(r) for r in rows]


def get_sku(sku_id: int) -> dict[str, Any] | None:
    with _conn() as c:
        if c is None:
            return None
        row = c.execute(
            """
            SELECT skus.id AS sku_id, skus.sku_code, skus.base_price, skus.stock,
                   products.id AS product_id, products.name, products.model, products.main_image_url
            FROM skus JOIN products ON products.id = skus.product_id
            WHERE skus.id = ?
            """,
            (sku_id,),
        ).fetchone()
        return dict(row) if row else None


def get_price_tiers(sku_id: int) -> list[dict[str, Any]]:
    """返回某 SKU 的阶梯价列表（按 min_qty 升序）。"""
    with _conn() as c:
        if c is None:
            return []
        rows = c.execute(
            """
            SELECT min_qty, max_qty, unit_price
            FROM price_tiers
            WHERE sku_id = ?
            ORDER BY min_qty ASC
            """,
            (sku_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def resolve_price(sku_id: int, qty: int, base_price: float) -> float:
    """命中阶梯价区间 → 该档价；无匹配 → base_price"""
    for tier in get_price_tiers(sku_id):
        min_q = tier["min_qty"]
        max_q = tier["max_qty"]
        if qty >= min_q and (max_q is None or qty <= max_q):
            return float(tier["unit_price"])
    return float(base_price)
