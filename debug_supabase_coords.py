
import os
import sys
from dotenv import load_dotenv

# 프로젝트 루트를 경로에 추가
sys.path.append(os.getcwd())

from app.services.commercial_listings_service import fetch_all_commercial_listings, get_supabase_client

load_dotenv()

def debug_coords():
    print("--- Supabase 좌표 연동 디버깅 시작 ---")
    data = fetch_all_commercial_listings()
    print(f"로드된 전체 매물 수: {len(data)}")
    
    if not data:
        print("데이터가 없습니다.")
        return

    # 좌표가 있는 매물과 없는 매물 수 확인
    with_coords = [d for d in data if d.get('coords') and d['coords'].get('lat')]
    without_coords = [d for d in data if not (d.get('coords') and d['coords'].get('lat'))]
    
    print(f"좌표 있음: {len(with_coords)}")
    print(f"좌표 없음: {len(without_coords)}")
    
    if without_coords:
        print("\n좌표 없는 매물 샘플 (첫 5개):")
        for d in without_coords[:5]:
            print(f"ID: {d['id']}, 주소: {d['address_full']}, 담당자: {d.get('manager_name')}")
            
    # 원인 분석: 캐시 테이블에 실제로 있는지 확인
    supabase = get_supabase_client()
    if without_coords and supabase:
        sample_addr = without_coords[0]['address_full']
        print(f"\n캐시 확인 샘플 주소: '{sample_addr}'")
        res = supabase.table("address_geocode_cache").select("*").eq("address_full", sample_addr).execute()
        print(f"캐시 조회 결과: {res.data}")

if __name__ == "__main__":
    debug_coords()
