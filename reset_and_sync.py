"""
DB 초기화 및 전체 재동기화 스크립트
- 기존 잘못된 user_id로 저장된 중복 데이터 삭제
- 슬롯 기반 ID(c_{prefix}_slot{slot_id}_{row_idx})로 재동기화
"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
from app.services.sheet_to_supabase_sync import sync_all_slots_to_supabase

TABLES = ['listings_rent', 'listings_sale_unit', 'listings_sale_land']

def main():
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        print("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 없음")
        return

    sb = create_client(url, key)

    # 1. 기존 데이터 전체 삭제
    print("🗑️  기존 데이터 전체 삭제 중...")
    for table in TABLES:
        try:
            # id가 'c_'로 시작하는 모든 레코드 삭제 (상가 매물)
            result = sb.table(table).delete().like('id', 'c_%').execute()
            print(f"   {table}: 삭제 완료")
        except Exception as e:
            print(f"   {table}: 오류 - {e}")

    # 2. 전체 재동기화
    print("\n🔄 전체 슬롯 재동기화 시작...")
    try:
        result = sync_all_slots_to_supabase()
        slots_ok = result.get('slots_processed', 0)
        total_ok = result.get('total_listings', 0)
        errors = result.get('errors', [])
        print(f"\n✅ 동기화 완료: {slots_ok}개 슬롯, {total_ok}개 매물")
        if errors:
            print(f"⚠️  오류 {len(errors)}건:")
            for e in errors[:5]:
                print(f"   - {e}")
    except Exception as e:
        print(f"❌ 재동기화 실패: {e}")

if __name__ == '__main__':
    main()
