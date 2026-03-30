import sys
import os

# app 폴더를 찾을 수 있도록 경로 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.housing_sheet_to_supabase_sync import sync_housing_sheets_to_supabase

if __name__ == "__main__":
    print("🚀 수동 주택 데이터 동기화 시작 (중복 지연발급 및 500건 제약 패치 검증)")
    result = sync_housing_sheets_to_supabase()
    
    import json
    print("\n✅ 동기화 결과:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
