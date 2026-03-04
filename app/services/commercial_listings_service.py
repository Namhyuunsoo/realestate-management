import os
import json
from typing import Dict, List, Any, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

# Supabase
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

def get_supabase_client() -> Optional[Client]:
    """Supabase 클라이언트 생성 (서비스 역할 키 사용)"""
    if not SUPABASE_AVAILABLE:
        return None
    try:
        url = os.getenv("SUPABASE_REAL_URL") or os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            print("Supabase Config error: no URL or KEY")
            return None
        return create_client(url.strip(), key.strip())
    except Exception:
        return None

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
    address_geocode_cache에서 좌표 조회.
    주소 형식이 약간 달라도(예: '부평구' 누락) 매칭될 수 있도록 고도화.
    """
    coords_map: Dict[str, Tuple[float, float]] = {}
    
    try:
        # 캐시 테이블 전체 로드 (약 3,500건으로 작으므로 메모리 로드 가능)
        # 테이블이 커질 것에 대비해 향후 쿼리 최적화가 필요할 수 있으나 현재는 효율적임
        result = supabase.table("address_geocode_cache").select("address_full, lat, lng").execute()
        if not result.data:
            return {}
        
        # 1. 정밀 매칭용 맵 (전체 주소)
        exact_map = {}
        # 2. 유연 매칭용 맵 (동+지번)
        flexible_map = {}
        
        for r in result.data:
            addr_full = (r.get("address_full") or "").strip()
            lat = r.get("lat")
            lng = r.get("lng")
            if not addr_full or lat is None or lng is None:
                continue
                
            coords = (float(lat), float(lng))
            exact_map[addr_full] = coords
            
            # 주소에서 핵심 부분 추출 (뒤에서부터 두 단어: '동 지번' 또는 '동')
            parts = addr_full.split()
            if len(parts) >= 2:
                # '산곡동 100-80' 형태
                key = " ".join(parts[-2:])
                if key not in flexible_map: flexible_map[key] = coords
        
        # 입력받은 주소들에 대해 매칭 수행
        for addr in addresses:
            if not addr or "#N/A" in addr:
                continue
            
            clean_addr = addr.strip()
            
            # 단계 1: 정확한 매칭
            if clean_addr in exact_map:
                coords_map[clean_addr] = exact_map[clean_addr]
                continue
            
            # 단계 2: 유연한 매칭 (입력 주소가 짧은 경우 대비)
            parts = clean_addr.split()
            if len(parts) >= 2:
                key = " ".join(parts[-2:])
                if key in flexible_map:
                    coords_map[clean_addr] = flexible_map[key]
            elif len(parts) == 1:
                # 동 이름만 있는 경우 등 (위험할 수 있으나 시도)
                if parts[0] in flexible_map:
                    coords_map[clean_addr] = flexible_map[parts[0]]
                    
    except Exception as e:
        print(f"Error building coords map: {e}")
        
    return coords_map

def _normalize_row(row: Dict[str, Any], coords_map: Dict[str, Tuple[float, float]], registry_map: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Supabase 행 데이터를 프론트엔드 호환 포맷으로 변환"""
    address_full = (row.get("address_full") or "").strip()
    
    # coords_map에서 좌표 조회 (유연한 매칭 결과 포함)
    lat, lng = coords_map.get(address_full, (None, None))

    coords = {"lat": None, "lng": None}
    if lat is not None and lng is not None:
        coords = {"lat": lat, "lng": lng}
    
    fields = row.get("fields") or {}
    user_id = row.get("user_id") or ""
    
    # 레지스트리 정보를 기반으로 담당자명과 슬롯 ID 보완
    reg_info = registry_map.get(user_id, {})
    manager_name = reg_info.get("manager_name") or fields.get("담당자") or row.get("manager_name") or ""
    slot_id = reg_info.get("slot_id") or row.get("slot_id") or ""
    
    return {
        "id": row.get("id"),
        "user_id": user_id,
        "raw_row_index": row.get("raw_row_index"),
        "address_full": address_full,
        "address_comp": row.get("address_comp") or {},
        "fields": fields,
        "coords": coords,
        "numeric_cache": row.get("numeric_cache") or {},
        "status_raw": row.get("status_raw") or "",
        "slot_id": slot_id,
        "manager_name": manager_name
    }

def fetch_all_commercial_listings(subtype: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    상가 매물 데이터를 조회하여 반환합니다.
    subtype: 'lease'(상가임대차), 'unit'(구분상가매매), 'land'(건물토지매매)
    """
    supabase = get_supabase_client()
    if not supabase:
        return []

    # 서브타입에 따른 테이블 매핑
    subtype_table_map = {
        "lease": "listings_rent",
        "unit": "listings_sale_unit",
        "land": "listings_sale_land"
    }

    # 조회할 테이블 목록 결정
    target_tables = []
    if subtype and subtype in subtype_table_map:
        target_tables = [subtype_table_map[subtype]]
    else:
        # 서브타입이 지정되지 않은 경우 지도 표시용 기본 테이블들 조회
        target_tables = MAP_DISPLAY_TABLES

    all_items = []
    all_addresses = []
    registry_map = _load_sheet_registry()

    try:
        for table in target_tables:
            try:
                # 100,000건 고려 Pagination
                offset = 0
                page_size = 1000
                while True:
                    result = supabase.table(table).select("*").eq("status_raw", "생").range(offset, offset + page_size - 1).execute()
                    if not result.data:
                        break
                    
                    data = list(result.data)
                    all_items.extend(data)
                    for r in data:
                        addr = (r.get("address_full") or "").strip()
                        if addr:
                            all_addresses.append(addr)
                    
                    if len(data) < page_size:
                        break
                    offset += page_size
                    
            except Exception as e:
                print(f"Error fetching from {table}: {e}")
                continue

        if not all_items:
            return []

        # 2. 좌표 맵 구축 (모든 매물 주소를 한꺼번에 전달)
        coords_map = _fetch_coords_map(supabase, all_addresses)

        # 3. 데이터 정규화 및 반환
        return [_normalize_row(item, coords_map, registry_map) for item in all_items]

    except Exception as e:
        print(f"fetch_all_commercial_listings failed: {e}")
        return []
