
import os
import sys
import json
from dotenv import load_dotenv

# 프로젝트 루트를 경로에 추가
sys.path.append(os.getcwd())

from app.services.commercial_listings_service import get_supabase_client

load_dotenv()

def debug_db_raw():
    print("--- Supabase 원본 데이터 확인 (슬롯3 샘플) ---")
    supabase = get_supabase_client()
    if not supabase:
        print("Supabase 클라이언트 생성 실패")
        return

    # 슬롯3 유저 ID
    slot3_uid = 'usr_1754650773146_e3t141'
    
    # 원본 데이터 1개만 조회
    res = supabase.table("listings_rent").select("*").eq("user_id", slot3_uid).limit(1).execute()
    
    if res.data:
        row = res.data[0]
        print(f"조회된 컬럼들: {list(row.keys())}")
        print(f"ID: {row.get('id')}")
        print(f"User ID: {row.get('user_id')}")
        print(f"Address: '{row.get('address_full')}'")
        
        # 캐시 테이블에 이 주소가 있는지 확인
        addr = row.get('address_full')
        if addr:
            cache_res = supabase.table("address_geocode_cache").select("*").eq("address_full", addr).execute()
            print(f"캐시 테이블 조회 결과: {cache_res.data}")
    else:
        print("해당 유저의 데이터를 찾을 수 없습니다.")

if __name__ == "__main__":
    debug_db_raw()
