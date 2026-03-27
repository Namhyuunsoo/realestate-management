# app/services/webhook_renewal_scheduler.py

"""
주택매물장 웹훅 채널을 매일 지정 시간에 자동 등록하는 스케줄러.
서버가 실행 중일 때만 동작하며, WEBHOOK_BASE_URL이 설정된 경우에만 시작됨.
"""

import os
import time
import threading
import logging
from datetime import datetime

class WebhookRenewalScheduler:
    """매일 지정 시간에 주택매물장 웹훅을 등록하는 스케줄러"""

    def __init__(self, app=None, run_hour: int = 5, run_minute: int = 0):
        """
        Args:
            app: Flask 앱 (앱 컨텍스트용)
            run_hour: 실행 시각 (시, 0-23)
            run_minute: 실행 시각 (분, 0-59)
        """
        self.app = app
        self.run_hour = run_hour
        self.run_minute = run_minute

        self.is_running = False
        self.scheduler_thread = None
        self._last_run_date = None  # "YYYY-MM-DD" 형식
        self._check_interval_seconds = 60  # 1분마다 체크

        # 로깅 설정 (기존 스케줄러와 동일)
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def start(self):
        """스케줄러 시작 (WEBHOOK_BASE_URL이 없으면 시작하지 않음)"""
        if not os.getenv("WEBHOOK_BASE_URL", "").strip():
            self.logger.info("WEBHOOK_BASE_URL 미설정 - 웹훅 갱신 스케줄러 비활성화")
            return False

        if self.is_running:
            self.logger.warning("웹훅 갱신 스케줄러가 이미 실행 중입니다.")
            return True

        self.is_running = True
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()

        self.logger.info(f"웹훅 갱신 스케줄러 시작 (매일 {self.run_hour:02d}:{self.run_minute:02d} 실행)")
        return True

    def stop(self):
        """스케줄러 중지"""
        if not self.is_running:
            return

        self.is_running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        self.scheduler_thread = None
        self.logger.info("웹훅 갱신 스케줄러 중지됨")

    def _run_scheduler(self):
        """스케줄러 메인 루프"""
        while self.is_running:
            try:
                now = datetime.now()
                current_timestamp = time.time()
                today = now.strftime("%Y-%m-%d")

                # 1. 매일 지정 시각 웹훅 갱신 (예: 5:00)
                if now.hour == self.run_hour and self.run_minute <= now.minute < self.run_minute + 5:
                    if self._last_run_date != today:
                        self._execute_renewal()
                        self._last_run_date = today

                # 2. 주기적 배경 전체 동기화 (6시간마다)
                # 서버 시작 시 최초 1회 즉시 실행은 제외(필요시 추가), 이후 간격마다 실행
                if self._last_background_sync == 0:
                    # 첫 실행 시점 설정 (서버 시작 후 5분 뒤 첫 동기화 권장 혹은 즉시)
                    self._last_background_sync = current_timestamp
                
                if (current_timestamp - self._last_background_sync) >= self._background_sync_interval:
                    self._execute_background_sync()
                    self._last_background_sync = current_timestamp

                time.sleep(self._check_interval_seconds)

            except Exception as e:
                self.logger.error(f"웹훅 갱신 스케줄러 오류: {e}")
                time.sleep(60)

    def _execute_background_sync(self):
        """웹훅 실패를 대비한 정기적 전체 동기화 실행"""
        try:
            self.logger.info("정기적 배경 전체 동기화(Background Fallback Sync) 시작...")
            
            # 상가 매물 전체 동기화
            from .commercial_sync_service import CommercialSyncService
            com_service = CommercialSyncService()
            com_res = com_service.sync_all_users()
            self.logger.info(f"배경 동기화 결과 (상가): {com_res.get('total_synced', 0)}개 성공")
            
            # 주택 매물장 전체 동기화
            from .housing_sheet_to_supabase_sync import sync_housing_sheets_to_supabase
            house_res = sync_housing_sheets_to_supabase()
            self.logger.info(f"배경 동기화 결과 (주택): {house_res.get('total_rows', 0)}개 성공")
            
            # 지오코딩 업데이트
            from .geocoding_service import GeocodingService
            geo_service = GeocodingService()
            geo_service.run_geocoding_update()
            geo_service.sync_coords_to_supabase_listings()
            self.logger.info("배경 동기화 후 지오코딩 업데이트 완료")

        except Exception as e:
            self.logger.error(f"정기 배경 동기화 중 오류 발생: {e}")

    def _execute_renewal(self):
        """웹훅 등록 실행"""
        try:
            self.logger.info("주택매물장 웹훅 자동 등록 실행...")

            if self.app:
                with self.app.app_context():
                    self._register_webhook()
            else:
                self._register_webhook()

        except Exception as e:
            self.logger.error(f"웹훅 등록 실패: {e}")

    def _register_webhook(self):
        """SheetsWebhookService를 통해 웹훅 등록"""
        from .sheets_webhook_service import SheetsWebhookService

        service = SheetsWebhookService()
        
        # 1. 주택매물장 웹훅 등록
        housing_result = service.register_housing_sheet_webhook(expiration_hours=24)
        if housing_result:
            self.logger.info("주택매물장 웹훅 등록 성공")
        else:
            self.logger.warning("주택매물장 웹훅 등록 실패")
            
        # 2. 상가 매물 슬롯(Slot 1~7) 웹훅 등록
        commercial_results = service.register_all_commercial_webhooks(expiration_hours=24)
        success_count = commercial_results.get("success", 0)
        total_count = commercial_results.get("total", 0)
        
        if success_count > 0:
            self.logger.info(f"상가 매물 웹훅 등록 완료: {success_count}/{total_count} 성공")
        else:
            self.logger.warning("상가 매물 웹훅 등록 실패 또는 활성 슬롯 없음")

    def run_now(self) -> bool:
        """즉시 웹훅 등록 실행 (수동 호출용)"""
        try:
            self._execute_renewal()
            return True
        except Exception as e:
            self.logger.error(f"수동 웹훅 등록 실패: {e}")
            return False

    def get_status(self) -> dict:
        """스케줄러 상태 반환"""
        return {
            "is_running": self.is_running,
            "run_time": f"{self.run_hour:02d}:{self.run_minute:02d}",
            "last_run_date": self._last_run_date,
        }
