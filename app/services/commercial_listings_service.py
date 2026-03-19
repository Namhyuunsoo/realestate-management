import os
import json
import concurrent.futures
from typing import Dict, List, Any, Optional, Tuple
from dotenv import load_dotenv
from flask import current_app

load_dotenv()

# Supabase
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

def get_supabase_client() -> Optional[Client]:
    """Supabase 클라이언트 반환 (싱글톤 재사용)"""
    from app.services.repositories import _get_supabase_client
    return _get_supabase_client()

# 동기화 대상 테이블 전체 목록 (sync에서 사용)
COMMERCIAL_TABLES = [
    "listings_rent",
    "listings_sale_unit",
    "listings_sale_land"
]

# 지도 표시용 테이블 (현재는 상가임대차만 표시)
MAP_DISPLAY_TABLES = [
    "listings_rent",
]

# --- 서버측 글로벌 좌표 캐시 ---
_GEOCODE_CACHE: Dict[str, Tuple[float, float]] = {}
_FLEXIBLE_CACHE: Dict[str, Tuple[float, float]] = {}
_LAST_CACHE_UPDATE: float = 0

def _get_or_build_geocode_cache(supabase: Client) -> Tuple[Dict[str, Tuple[float, float]], Dict[str, Tuple[float, float]]]:
    """글로벌 캐시가 없거나 오래된 경우 구축하여 반환"""
    global _GEOCODE_CACHE, _FLEXIBLE_CACHE, _LAST_CACHE_UPDATE
    import time
    
    current_time = time.time()
    # 1시간(3600초) 주기로 갱신
    # 1시간(3600초) 주기로 갱신
    if not _GEOCODE_CACHE or (current_time - _LAST_CACHE_UPDATE > 3600):
        try:
            print("🔄 Building global geocode cache from Supabase...")
            result = supabase.table("address_geocode_cache").select("address_full, lat, lng").execute()
            if result.data:
                new_exact = {}
                new_flex = {}
                for r in result.data:
                    addr_full = (r.get("address_full") or "").strip()
                    lat = r.get("lat")
                    lng = r.get("lng")
                    if not addr_full or lat is None or lng is None:
                        continue
                    coords = (float(lat), float(lng))
                    new_exact[addr_full] = coords
                    
                    parts = addr_full.split()
                    if len(parts) >= 2:
                        key = " ".join(parts[-2:])
                        if key not in new_flex: new_flex[key] = coords
                
                _GEOCODE_CACHE = new_exact
                _FLEXIBLE_CACHE = new_flex
                _LAST_CACHE_UPDATE = current_time
                print(f"✅ Cache built: {len(_GEOCODE_CACHE)} addresses")
        except Exception as e:
            print(f"❌ Error building geocode cache: {e}")
            
    return _GEOCODE_CACHE, _FLEXIBLE_CACHE

def _load_sheet_registry() -> Dict[str, Dict[str, Any]]:
    """SheetRegistryRepository를 활용하여 user_id별 슬롯 정보를 맵으로 반환"""
    mapping = {}
    try:
        from app.services.repositories import get_sheet_registry_repository
        registry_repo = get_sheet_registry_repository()
        slots = registry_repo.get_all_slots()
        
        for slot in slots:
            uid = slot.get("user_id")
            if uid:
                mapping[uid] = {
                    "manager_name": slot.get("manager_name"),
                    "slot_id": slot.get("id")
                }
            # 슬롯 ID 기반 매핑도 추가 (동기화 시 slot_X 형태로 저장될 경우 대비)
            sid = slot.get("id")
            if sid:
                mapping[f"slot_{sid}"] = {
                    "manager_name": slot.get("manager_name"),
                    "slot_id": sid
                }
    except Exception as e:
        print(f"Error loading sheet registry: {e}")
    return mapping

def _fetch_coords_map(supabase: Client, addresses: List[str]) -> Dict[str, Tuple[float, float]]:
    """
    글로벌 캐시를 활용하여 좌표 조회.
    DB 요청 없이 메모리에서 즉시 매칭하여 성능을 극대화함.
    """
    coords_map: Dict[str, Tuple[float, float]] = {}
    
    # 캐시 가져오기 (필요 시 자동 구축)
    exact_map, flexible_map = _get_or_build_geocode_cache(supabase)
    
    if not exact_map:
        return {}
        
    for addr in addresses:
        if not addr or "#N/A" in addr:
            continue
        
        clean_addr = addr.strip()
        
        # 1. 정확한 매칭
        if clean_addr in exact_map:
            coords_map[clean_addr] = exact_map[clean_addr]
            continue
        
        # 2. 유연한 매칭
        parts = clean_addr.split()
        if len(parts) >= 2:
            key = " ".join(parts[-2:])
            if key in flexible_map:
                coords_map[clean_addr] = flexible_map[key]
        elif len(parts) == 1:
            if parts[0] in flexible_map:
                coords_map[clean_addr] = flexible_map[parts[0]]
                
    return coords_map

def _normalize_row(row: Dict[str, Any], coords_map: Dict[str, Tuple[float, float]], registry_map: Dict[str, Dict[str, Any]], id_prefix: str = "", prune_fields: bool = False) -> Dict[str, Any]:
    """Supabase 행 데이터를 프론트엔드 호환 포맷으로 변환 (ID 충돌 방지 접두사 포함)"""
    address_full = (row.get("address_full") or "").strip()
    
    # 상가 매물 데이터베이스에 이미 좌표가 있는 경우 우선 사용
    row_coords = row.get("coords")
    if row_coords and isinstance(row_coords, dict) and row_coords.get("lat") and row_coords.get("lng"):
        coords = {"lat": float(row_coords["lat"]), "lng": float(row_coords["lng"])}
    else:
        # DB에 좌표가 없는 경우에만 coords_map(캐시 테이블)에서 조회
        lat, lng = coords_map.get(address_full, (None, None))
        coords = {"lat": lat, "lng": lng}
    
    fields = row.get("fields") or {}
    
    # [최적화] 스켈레톤 로딩 시 필드 경량화
    if prune_fields:
        # 사용자 요청 핵심 필드: 지역, 지번, 층수, 실평수, 보증금, 월세
        allowed_keys = ["지역", "지번", "층수", "실평수", "보증금", "월세", "지역2", "현황", "건물명"]
        fields = {k: v for k, v in fields.items() if k in allowed_keys}

    user_id = row.get("user_id") or ""
    
    # 레지스트리 정보를 기반으로 담당자명과 슬롯 ID 보완
    reg_info = registry_map.get(user_id, {})
    manager_name = reg_info.get("manager_name") or fields.get("담당자") or row.get("manager_name") or ""
    slot_id = reg_info.get("slot_id") or row.get("slot_id") or ""
    
    # ID에 접두사를 부여하여 테이블 간 중복 방지 (예: r_123, u_456)
    original_id = str(row.get("id"))
    prefixed_id = f"{id_prefix}{original_id}" if id_prefix else original_id

    return {
        "id": prefixed_id,
        "user_id": user_id,
        "raw_row_index": row.get("raw_row_index"),
        "address_full": address_full,
        "fields": fields,
        "coords": coords,
        "numeric_cache": row.get("numeric_cache") or {},
        "status_raw": row.get("status_raw") or "",
        "slot_id": slot_id,
        "manager_name": manager_name
    }

def fetch_all_commercial_listings(subtype: Optional[str] = None, select_format: Optional[str] = None, bbox: Optional[tuple] = None) -> List[Dict[str, Any]]:
    """
    상가 매물 데이터를 조회하여 반환합니다.
    subtype: 'lease'(상가임대차), 'unit'(구분상가매매), 'land'(건물토지매매)
    select_format: 'search_skeleton' (핵심 필드만 조회)
    bbox: (min_lat, max_lat, min_lng, max_lng) 튜플
    """
    supabase = get_supabase_client()
    if not supabase:
        return []

    min_lat, max_lat, min_lng, max_lng = bbox if bbox else (None, None, None, None)

    # 서브타입에 따른 테이블 매핑
    subtype_table_map = {
        "lease": "listings_rent",
        "unit": "listings_sale_unit",
        "land": "listings_sale_land"
    }

    # 조회할 필드 결정
    if select_format == "search_skeleton":
        # 핵심 필드 + 좌표(coords) 추가 (BBox 필터링 및 마커 표시 필수)
        select_query = "id, address_full, status_raw, user_id, raw_row_index, slot_id, manager_name, fields, coords"
    else:
        select_query = "*"

    # 조회할 테이블 목록 결정
    target_tables = []
    if subtype and subtype in subtype_table_map:
        target_tables = [subtype_table_map[subtype]]
    else:
        target_tables = MAP_DISPLAY_TABLES

    all_items = []
    all_addresses = []
    registry_map = _load_sheet_registry()

    def _fetch_table_worker(table):
        # 각 스레드마다 별도의 Supabase 클라이언트 생성 (쓰레드 세이프)
        supabase_local = get_supabase_client()
        if not supabase_local:
            return [], []

        prefix = table_prefix_map.get(table, "")
        local_results = []
        local_addresses = []
        try:
            offset = 0
            page_size = 1000
            while True:
                q = supabase_local.table(table).select(select_query).in_("status_raw", ["생", "완", "보류", ""])
                if min_lat is not None and max_lat is not None:
                    q = q.gte("coords->lat", min_lat).lte("coords->lat", max_lat)
                if min_lng is not None and max_lng is not None:
                    q = q.gte("coords->lng", min_lng).lte("coords->lng", max_lng)
                
                q = q.order("fields->접수일", desc=True)
                res = q.range(offset, offset + page_size - 1).execute()
                
                if not res.data:
                    break
                
                rows = list(res.data)
                for r in rows:
                    local_results.append((r, prefix))
                    
                    # 좌표가 없는 행에 대해서만 주소 수집
                    row_coords = r.get("coords")
                    has_coords = row_coords and isinstance(row_coords, dict) and row_coords.get("lat")
                    if not has_coords:
                        addr = (r.get("address_full") or "").strip()
                        if addr:
                            local_addresses.append(addr)
                
                if len(rows) < page_size:
                    break
                offset += page_size
        except Exception as e:
            print(f"Error fetching from {table} in parallel: {e}")
        return local_results, local_addresses

    try:
        table_prefix_map = {
            "listings_rent": "r_",
            "listings_sale_unit": "u_",
            "listings_sale_land": "l_"
        }

        all_items_with_prefix = []
        all_addresses = []
        
        # 병렬 실행: 각 테이블 조회를 별도 스레드에서 수행
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(target_tables)) as executor:
            future_to_table = {executor.submit(_fetch_table_worker, table): table for table in target_tables}
            for future in concurrent.futures.as_completed(future_to_table):
                table_result, table_addresses = future.result()
                all_items_with_prefix.extend(table_result)
                all_addresses.extend(table_addresses)

        if not all_items_with_prefix:
            return []

        coords_map = _fetch_coords_map(supabase, all_addresses)
        is_skeleton = select_format == "search_skeleton"
        normalized_items = [_normalize_row(item, coords_map, registry_map, prefix, prune_fields=is_skeleton) for item, prefix in all_items_with_prefix]
        
        return normalized_items

    except Exception as e:
        print(f"fetch_all_commercial_listings failed: {e}")
        return []
