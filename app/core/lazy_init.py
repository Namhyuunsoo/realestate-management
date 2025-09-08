# app/core/lazy_init.py

from flask import current_app

def ensure_background_services():
    """백그라운드 서비스들이 필요할 때만 초기화"""
    data_manager = current_app.data_manager
    
    # 시트 동기화 서비스 초기화 (첫 매물 요청 시)
    if not hasattr(data_manager, '_sheet_sync_started'):
        try:
            if data_manager.start_sheet_sync():
                print("✅ Google Sheets 자동 동기화가 시작되었습니다.")
            data_manager._sheet_sync_started = True
        except Exception as e:
            print(f"⚠️ 시트 동기화 시작 실패: {e}")
            data_manager._sheet_sync_started = True
    
    # 지오코딩 서비스 초기화 (첫 매물 요청 시)
    if not hasattr(data_manager, '_geocoding_sync_started'):
        try:
            if data_manager.initialize_geocoding_scheduler(current_app):
                if data_manager.start_geocoding_sync():
                    print("✅ 자동 지오코딩이 시작되었습니다.")
            data_manager._geocoding_sync_started = True
        except Exception as e:
            print(f"⚠️ 지오코딩 동기화 시작 실패: {e}")
            data_manager._geocoding_sync_started = True
