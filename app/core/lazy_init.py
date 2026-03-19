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

    # 웹훅 갱신 스케줄러 초기화 (매일 05시 주택매물장 웹훅 자동 등록)
    if not hasattr(data_manager, '_webhook_renewal_started'):
        try:
            if data_manager.initialize_webhook_renewal_scheduler(current_app):
                if data_manager.start_webhook_renewal():
                    print("✅ 웹훅 자동 갱신 스케줄러가 시작되었습니다. (매일 05:00)")
                    # 첫 기동 시 즉시 웹훅 등록 시도 (비동기 스레드 실행으로 응답 속도 확보)
                    import threading
                    threading.Thread(target=data_manager.run_webhook_renewal_now, daemon=True).start()
                    print("📡 초기 웹훅 등록이 백그라운드에서 시작되었습니다.")
            data_manager._webhook_renewal_started = True
        except Exception as e:
            print(f"⚠️ 웹훅 갱신 스케줄러 시작 실패: {e}")
            data_manager._webhook_renewal_started = True
