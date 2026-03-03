
import os
import json
from typing import Dict, List, Any, Tuple
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

COMMERCIAL_TABLES = [
    "listings_rent",
    "listings_sale_unit",
    "listings_sale_land"
]

def build_flexible_cache(supabase: Client) -> Dict[str, Tuple[float, float]]:
    """캐시 테이블에서 유연한 매칭용 맵 구축"""
    print("🔍 지오코드 캐시 로드 중...")
    result = supabase.table("address_geocode_cache").select("address_full, lat, lng").execute()
    
    exact_map = {}
    flexible_map = {}
    
    for r in result.data:
        addr = (r.get("address_full") or "").strip()
        lat, lng = r.get("lat"), r.get("lng")
        if not addr or lat is None or lng is None: continue
        
        coords = (float(lat), float(lng))
        exact_map[addr] = coords
        
        parts = addr.split()
        if len(parts) >= 2:
            key = " ".join(parts[-2:])
            if key not in flexible_map: flexible_map[key] = coords
            
    return exact_map, flexible_map

def sync_coords_to_db():
    supabase = get_supabase_client()
    exact_map, flexible_map = build_flexible_cache(supabase)
    
    total_updated = 0
    
    for table in COMMERCIAL_TABLES:
        print(f"--- {table} 처리 중 ---")
        # 좌표가 비어있는 '생' 매물만 가져옴
        # (Supabase SQL에서는 coords가 null인 것을 찾아야 함)
        offset = 0
        page_size = 1000
        
        while True:
            # coords -> lat 가 null인 데이터 필터링 시도 (JSONB 구조에 따라 다름)
            # 여기서는 편의상 전체 가져와서 Python에서 체크 (데이터가 아주 많지 않으므로)
            result = supabase.table(table).select("id, address_full, coords").eq("status_raw", "생").range(offset, offset + page_size - 1).execute()
            if not result.data:
                break
                
            batch_updates = []
            for row in result.data:
                listing_id = row.get("id")
                address = (row.get("address_full") or "").strip()
                current_coords = row.get("coords")
                
                # 이미 좌표가 있으면 건너뜀
                if current_coords and isinstance(current_coords, dict) and current_coords.get("lat"):
                    continue
                
                if not address or "#N/A" in address:
                    continue
                
                # 매칭 시도
                found_coords = exact_map.get(address)
                if not found_coords:
                    parts = address.split()
                    if len(parts) >= 2:
                        found_coords = flexible_map.get(" ".join(parts[-2:]))
                
                if found_coords:
                    new_coords = {"lat": found_coords[0], "lng": found_coords[1]}
                    batch_updates.append({"id": listing_id, "coords": new_coords, "geocoded": True})
            
            # 업데이트 수행
            if batch_updates:
                print(f"  > {len(batch_updates)}개 매물 좌표 업데이트 중...")
                for item in batch_updates:
                    try:
                        supabase.table(table).update({"coords": item["coords"], "geocoded": True}).eq("id", item["id"]).execute()
                        total_updated += 1
                    except Exception as e:
                        print(f"Error updating {item['id']}: {e}")
            
            if len(result.data) < page_size:
                break
            offset += page_size
            
    print(f"✅ 총 {total_updated}개의 매물 좌표가 Supabase DB에 실시간 반영되었습니다.")

if __name__ == "__main__":
    sync_coords_to_db()
