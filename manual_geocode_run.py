import os
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
from app.services.geocoding_service import GeocodingService

def main():
    load_dotenv()
    print("🚀 지오코딩 수동 업데이트 시작 (주택 매물 포함)...")
    
    # GeocodingService 초기화
    # Flask 컨텍스트가 없어도 환경변수에서 키를 읽도록 설계됨
    service = GeocodingService()
    
    # 지오코딩 업데이트 실행
    # (extract_housing_addresses_from_supabase를 통해 주택 매물 주소도 수집함)
    result = service.run_geocoding_update()
    
    print("\n" + "=" * 40)
    print("  지오코딩 처리 결과")
    print("=" * 40)
    print(f"  - 전체 주소 수: {result.get('total', 0)}")
    print(f"  - 신규 변환: {result.get('new', 0)}")
    print(f"  - 실패: {result.get('failed', 0)}")
    print(f"  - 상가 매물: {result.get('commercial', 0)}")
    print(f"  - 주택 매물: {result.get('housing', 0)}")
    
    # 좌표 DB 반영 강제 실행 (상가 + 주택 테이블 업데이트)
    print("\n🔄 Supabase 테이블에 좌표 반영 중...")
    service.sync_coords_to_supabase_listings()
    
    print("\n✅ 모든 작업 완료!")

if __name__ == "__main__":
    main()
