# app/services/housing_listings_service.py
"""
주택 매물 조회 서비스.
Supabase listings_housing_sale, listings_housing_lease, listings_housing_oneroom 테이블에서
데이터를 조회하고 address_geocode_cache와 조인하여 좌표를 채운다.
"""

import os
from typing import Dict, List, Any, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

# Supabase
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False


def _get_supabase_client() -> Optional[Client]:
    """Supabase 클라이언트 생성"""
    if not SUPABASE_AVAILABLE:
        return None
    try:
        url = os.getenv("SUPABASE_REAL_URL") or os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            return None
        return create_client(url.strip(), key.strip())
    except Exception:
        return None


# subtype → (테이블명, 거래유형 필터)
SUBTYPE_CONFIG = {
    "sale": ("listings_housing_sale", None),  # 매매: 테이블만, 거래유형 무관
    "jeonse": ("listings_housing_lease", ["전", "전/월"]),  # 전세
    "monthly": ("listings_housing_lease", ["월", "전/월"]),  # 월세
    "oneroom": ("listings_housing_oneroom", None),  # 원룸임대차
}


def _row_to_item(row: Dict[str, Any], coords_map: Dict[str, Tuple[float, float]]) -> Dict[str, Any]:
    """Supabase 행을 프론트 호환 형식으로 변환"""
    address_full = (row.get("address_full") or "").strip()
    lat, lng = coords_map.get(address_full, (None, None))

    coords = None
    if lat is not None and lng is not None:
        coords = {"lat": lat, "lng": lng}
    else:
        # 기존 coords 필드가 있으면 사용
        existing = row.get("coords")
        if isinstance(existing, dict) and existing.get("lat") and existing.get("lng"):
            coords = {"lat": float(existing["lat"]), "lng": float(existing["lng"])}
        else:
            coords = {"lat": None, "lng": None}

    return {
        "id": row.get("id", ""),
        "raw_row_index": row.get("raw_row_index"),
        "address_full": address_full or None,
        "address_comp": row.get("address_comp") or {},
        "fields": row.get("fields") or {},
        "coords": coords,
        "status_raw": row.get("status_raw") or "",
        "geocoded": bool(coords.get("lat") and coords.get("lng")),
    }


def _fetch_coords_map(supabase: Client, addresses: List[str]) -> Dict[str, Tuple[float, float]]:
    """address_geocode_cache에서 주소별 좌표 조회"""
    if not addresses:
        return {}
    addresses = [a.strip() for a in addresses if a and a.strip()]
    if not addresses:
        return {}

    coords_map: Dict[str, Tuple[float, float]] = {}
    batch_size = 200
    for i in range(0, len(addresses), batch_size):
        batch = addresses[i : i + batch_size]
        try:
            result = supabase.table("address_geocode_cache").select("address_full, lat, lng").in_("address_full", batch).execute()
            for r in result.data:
                addr = (r.get("address_full") or "").strip()
                lat = r.get("lat")
                lng = r.get("lng")
                if addr and lat is not None and lng is not None:
                    coords_map[addr] = (float(lat), float(lng))
        except Exception:
            continue
    return coords_map


def _filter_by_trade_type(rows: List[Dict], allowed: List[str]) -> List[Dict]:
    """거래유형으로 필터 (전세/월세)"""
    if not allowed:
        return rows
    result = []
    for r in rows:
        fields = r.get("fields") or {}
        val = (fields.get("거래유형") or "").strip()
        if val in allowed:
            result.append(r)
    return result


def fetch_housing_listings(
    subtype: str,
    status_raw: Optional[str] = None,
    limit: int = 100000,
    offset: int = 0,
) -> Dict[str, Any]:
    """
    주택 매물 조회.
    - subtype: sale, jeonse, monthly, oneroom
    - status_raw: 현황 필터 (예: 생)
    - limit, offset: 페이지네이션
    """
    if subtype not in SUBTYPE_CONFIG:
        return {"items": [], "total": 0, "limit": limit, "offset": offset, "error": f"잘못된 subtype: {subtype}"}

    supabase = _get_supabase_client()
    if not supabase:
        return {"items": [], "total": 0, "limit": limit, "offset": offset, "error": "Supabase 연결 실패"}

    table_name, trade_filter = SUBTYPE_CONFIG[subtype]

    try:
        query = supabase.table(table_name).select("*", count="exact")
        if status_raw:
            query = query.eq("status_raw", status_raw)
        query = query.order("raw_row_index", desc=False)

        if trade_filter:
            # 전세/월세: DB에서 필터 불가하므로 전체 조회 후 Python에서 필터
            result = query.execute()
            rows = _filter_by_trade_type(list(result.data or []), trade_filter)
            total = len(rows)
            rows = rows[offset : offset + limit]
        else:
            result = query.range(offset, offset + limit - 1).execute()
            rows = list(result.data or [])
            total = result.count if hasattr(result, "count") and result.count is not None else len(rows)

        addresses = [(r.get("address_full") or "").strip() for r in rows if (r.get("address_full") or "").strip()]
        coords_map = _fetch_coords_map(supabase, addresses)

        items = [_row_to_item(r, coords_map) for r in rows]

        return {
            "items": items,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        return {"items": [], "total": 0, "limit": limit, "offset": offset, "error": str(e)}
