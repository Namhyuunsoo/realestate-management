#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Sheets 다운로드 테스트 스크립트
"""

import os
import sys
import time
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_sheet_download():
    """시트 다운로드 기능 테스트"""
    try:
        print("🚀 Google Sheets 다운로드 테스트 시작...")
        
        # SheetDownloadService 테스트
        from app.services.sheet_download_service import SheetDownloadService
        
        print("1. SheetDownloadService 초기화...")
        download_service = SheetDownloadService()
        print("✅ SheetDownloadService 초기화 성공")
        
        print("2. 스프레드시트 정보 조회...")
        sheets_info = download_service.get_sheet_info()
        print(f"✅ 시트 정보 조회 성공: {len(sheets_info)}개 시트")
        for name, info in sheets_info.items():
            print(f"   - {name}: ID {info['id']}")
        
        print("3. 개별 시트 다운로드 테스트...")
        # 상가임대차 시트만 테스트
        success = download_service.download_sheet_as_excel('상가임대차', '상가임대차.xlsx')
        if success:
            print("✅ 상가임대차 시트 다운로드 성공")
        else:
            print("❌ 상가임대차 시트 다운로드 실패")
        
        print("4. 전체 시트 다운로드 테스트...")
        results = download_service.download_all_sheets()
        success_count = sum(results.values())
        print(f"✅ 전체 시트 다운로드 완료: {success_count}/{len(results)} 성공")
        
        for sheet_name, success in results.items():
            status = "✅" if success else "❌"
            print(f"   {status} {sheet_name}")
        
        print("5. 스케줄러 테스트...")
        from app.services.sheet_scheduler import SheetScheduler
        
        scheduler = SheetScheduler(download_service, interval_minutes=1)
        print("✅ 스케줄러 생성 성공")
        
        print("6. 스케줄러 시작...")
        scheduler.start()
        print("✅ 스케줄러 시작됨")
        
        print("7. 10초간 실행 상태 확인...")
        for i in range(10):
            status = scheduler.get_status()
            print(f"   {i+1}초: 실행 중={status['is_running']}, 다음 실행까지={status['next_run_in']:.1f}초")
            time.sleep(1)
        
        print("8. 스케줄러 중지...")
        scheduler.stop()
        print("✅ 스케줄러 중지됨")
        
        print("🎉 모든 테스트가 성공적으로 완료되었습니다!")
        
    except Exception as e:
        print(f"❌ 테스트 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = test_sheet_download()
    sys.exit(0 if success else 1)
