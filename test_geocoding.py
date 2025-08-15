#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
지오코딩 서비스 테스트 스크립트
"""

import os
import sys
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_geocoding_service():
    """지오코딩 서비스 테스트"""
    try:
        print("🚀 지오코딩 서비스 테스트 시작...")
        
        # Flask 애플리케이션 컨텍스트 설정
        from app import create_app
        app = create_app()
        
        with app.app_context():
            # GeocodingService 테스트
            from app.services.geocoding_service import GeocodingService
            
            print("1. GeocodingService 초기화...")
            geocoding_service = GeocodingService()
            print("✅ GeocodingService 초기화 성공")
            
            print("2. 상가임대차에서 주소 추출...")
            addresses = geocoding_service.extract_addresses_from_listings()
            print(f"✅ 주소 추출 완료: {len(addresses)}개")
            
            if addresses:
                print("   처음 5개 주소:")
                for i, addr in enumerate(addresses[:5], 1):
                    print(f"   {i}. {addr}")
            
            print("3. 기존 좌표 가져오기...")
            existing_coords = geocoding_service.get_existing_coordinates()
            print(f"✅ 기존 좌표 로드 완료: {len(existing_coords)}개")
            
            if existing_coords:
                print("   처음 3개 좌표:")
                for i, (addr, (lat, lng)) in enumerate(list(existing_coords.items())[:3], 1):
                    print(f"   {i}. {addr} → ({lat}, {lng})")
            
            print("4. 새로 지오코딩이 필요한 주소 찾기...")
            new_addresses = [addr for addr in addresses if addr not in existing_coords]
            print(f"✅ 새 주소 분석 완료: {len(new_addresses)}개")
            
            if new_addresses:
                print("   처음 3개 새 주소:")
                for i, addr in enumerate(new_addresses[:3], 1):
                    print(f"   {i}. {addr}")
                
                # API 키가 설정된 경우에만 지오코딩 테스트
                if geocoding_service.naver_client_id and geocoding_service.naver_client_secret:
                    print("5. 지오코딩 API 테스트 (첫 번째 주소만)...")
                    test_address = new_addresses[0]
                    print(f"   테스트 주소: {test_address}")
                    
                    coordinates = geocoding_service.geocode_address(test_address)
                    if coordinates:
                        lat, lng = coordinates
                        print(f"   ✅ 지오코딩 성공: ({lat}, {lng})")
                    else:
                        print("   ❌ 지오코딩 실패")
                else:
                    print("5. ⚠️ 네이버 API 키가 설정되지 않아 지오코딩 테스트를 건너뜁니다.")
                    print("   .env 파일에 NAVER_MAPS_NCP_CLIENT_ID와 NAVER_MAPS_NCP_CLIENT_SECRET을 설정해주세요.")
            else:
                print("5. 새로 지오코딩이 필요한 주소가 없습니다.")
            
            print("6. 전체 지오코딩 업데이트 시뮬레이션...")
            result = geocoding_service.run_geocoding_update()
            print(f"✅ 시뮬레이션 완료: {result}")
            
            print("🎉 지오코딩 서비스 테스트 완료!")
        
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_geocoding_scheduler():
    """지오코딩 스케줄러 테스트"""
    try:
        print("\n🚀 지오코딩 스케줄러 테스트 시작...")
        
        # Flask 애플리케이션 컨텍스트 설정
        from app import create_app
        app = create_app()
        
        with app.app_context():
            from app.services.geocoding_scheduler import GeocodingScheduler
            
            print("1. GeocodingScheduler 초기화...")
            scheduler = GeocodingScheduler(interval_minutes=1)  # 1분 간격으로 테스트
            print("✅ GeocodingScheduler 초기화 성공")
            
            print("2. 스케줄러 시작...")
            scheduler.start()
            print("✅ 스케줄러 시작됨")
            
            print("3. 5초 대기 후 상태 확인...")
            import time
            time.sleep(5)
            
            status = scheduler.get_status()
            print(f"✅ 상태 조회: {status}")
            
            print("4. 즉시 실행 테스트...")
            result = scheduler.run_now()
            print(f"✅ 즉시 실행 결과: {result}")
            
            print("5. 스케줄러 중지...")
            scheduler.stop()
            print("✅ 스케줄러 중지됨")
            
            print("🎉 지오코딩 스케줄러 테스트 완료!")
        
    except Exception as e:
        print(f"❌ 스케줄러 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=" * 60)
    print("지오코딩 서비스 테스트")
    print("=" * 60)
    
    # 지오코딩 서비스 테스트
    test_geocoding_service()
    
    # 지오코딩 스케줄러 테스트
    test_geocoding_scheduler()
    
    print("\n" + "=" * 60)
    print("모든 테스트 완료!")
    print("=" * 60)
