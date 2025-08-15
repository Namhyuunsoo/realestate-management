# app/services/geocoding_scheduler.py

import time
import threading
import logging
from typing import Optional
from .geocoding_service import GeocodingService

class GeocodingScheduler:
    """지오코딩 자동화 스케줄러"""
    
    def __init__(self, interval_minutes: int = 30):
        self.interval_minutes = interval_minutes
        self.interval_seconds = interval_minutes * 60
        
        # 스케줄러 상태
        self.is_running = False
        self.scheduler_thread = None
        self.last_run_time = 0
        self.run_count = 0
        self.last_result = None
        
        # 지오코딩 서비스
        self.geocoding_service = GeocodingService()
        
        # Flask 컨텍스트가 있을 때 설정 업데이트
        try:
            self.geocoding_service.update_config()
        except Exception as e:
            self.logger.warning(f"설정 업데이트 실패: {e}")
        
        # 로깅 설정
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def start(self):
        """스케줄러 시작"""
        if self.is_running:
            self.logger.warning("지오코딩 스케줄러가 이미 실행 중입니다.")
            return
        
        self.is_running = True
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        self.logger.info(f"지오코딩 스케줄러 시작 (간격: {self.interval_minutes}분)")
    
    def stop(self):
        """스케줄러 중지"""
        if not self.is_running:
            return
        
        self.is_running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        
        self.logger.info("지오코딩 스케줄러 중지됨")
    
    def _run_scheduler(self):
        """스케줄러 메인 루프"""
        while self.is_running:
            try:
                current_time = time.time()
                
                # 첫 실행 또는 간격이 지났는지 확인
                if self.last_run_time == 0 or (current_time - self.last_run_time) >= self.interval_seconds:
                    self._execute_geocoding()
                    self.last_run_time = current_time
                    self.run_count += 1
                
                # 1초마다 상태 확인
                time.sleep(1)
                
            except Exception as e:
                self.logger.error(f"지오코딩 스케줄러 실행 중 오류 발생: {str(e)}")
                time.sleep(60)  # 오류 발생 시 1분 대기
    
    def _execute_geocoding(self):
        """지오코딩 실행"""
        try:
            self.logger.info(f"지오코딩 업데이트 시작 (실행 횟수: {self.run_count + 1})")
            
            # 지오코딩 서비스 실행
            result = self.geocoding_service.run_geocoding_update()
            self.last_result = result
            
            # 결과 로깅
            if result["new"] > 0:
                self.logger.info(f"✅ 지오코딩 완료: {result['new']}개 새 주소 처리됨")
            elif result["failed"] > 0:
                self.logger.warning(f"⚠️ 지오코딩 완료: {result['failed']}개 주소 실패")
            else:
                self.logger.info("✅ 지오코딩 완료: 새 주소 없음")
            
        except Exception as e:
            self.logger.error(f"지오코딩 실행 실패: {str(e)}")
    
    def run_now(self) -> dict:
        """즉시 지오코딩 실행 (수동 실행용)"""
        try:
            self.logger.info("수동 지오코딩 실행 시작...")
            result = self.geocoding_service.run_geocoding_update()
            self.last_result = result
            return result
        except Exception as e:
            self.logger.error(f"수동 지오코딩 실행 실패: {str(e)}")
            return {"error": str(e)}
    
    def get_status(self) -> dict:
        """스케줄러 상태 조회"""
        return {
            "is_running": self.is_running,
            "interval_minutes": self.interval_minutes,
            "run_count": self.run_count,
            "last_run_time": self.last_run_time,
            "last_result": self.last_result
        }
