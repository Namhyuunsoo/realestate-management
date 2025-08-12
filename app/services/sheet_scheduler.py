# app/services/sheet_scheduler.py

import time
import threading
import logging
from typing import Optional
from .sheet_download_service import SheetDownloadService

class SheetScheduler:
    """Google Sheets를 주기적으로 다운로드하는 스케줄러"""
    
    def __init__(self, download_service: SheetDownloadService, interval_minutes: int = 5):
        self.download_service = download_service
        self.interval_minutes = interval_minutes
        self.interval_seconds = interval_minutes * 60
        
        # 스케줄러 상태
        self.is_running = False
        self.scheduler_thread = None
        self.last_run_time = 0
        self.run_count = 0
        
        # 로깅 설정
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def start(self):
        """스케줄러 시작"""
        if self.is_running:
            self.logger.warning("스케줄러가 이미 실행 중입니다.")
            return
        
        self.is_running = True
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        self.logger.info(f"시트 다운로드 스케줄러 시작 (간격: {self.interval_minutes}분)")
    
    def stop(self):
        """스케줄러 중지"""
        if not self.is_running:
            return
        
        self.is_running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        
        self.logger.info("시트 다운로드 스케줄러 중지됨")
    
    def _run_scheduler(self):
        """스케줄러 메인 루프"""
        while self.is_running:
            try:
                current_time = time.time()
                
                # 첫 실행 또는 간격이 지났는지 확인
                if self.last_run_time == 0 or (current_time - self.last_run_time) >= self.interval_seconds:
                    self._execute_download()
                    self.last_run_time = current_time
                    self.run_count += 1
                
                # 1초마다 상태 확인
                time.sleep(1)
                
            except Exception as e:
                self.logger.error(f"스케줄러 실행 중 오류 발생: {str(e)}")
                time.sleep(10)  # 오류 발생 시 10초 대기
    
    def _execute_download(self):
        """시트 다운로드 실행"""
        try:
            self.logger.info(f"시트 다운로드 시작 (실행 횟수: {self.run_count + 1})")
            
            # 모든 시트 다운로드
            results = self.download_service.download_all_sheets()
            
            # 결과 로깅
            success_count = sum(results.values())
            total_count = len(results)
            
            if success_count == total_count:
                self.logger.info(f"✅ 모든 시트 다운로드 성공 ({success_count}/{total_count})")
            else:
                failed_sheets = [name for name, success in results.items() if not success]
                self.logger.warning(f"⚠️ 일부 시트 다운로드 실패: {failed_sheets}")
            
        except Exception as e:
            self.logger.error(f"시트 다운로드 실행 실패: {str(e)}")
    
    def get_status(self) -> dict:
        """스케줄러 상태 조회"""
        return {
            'is_running': self.is_running,
            'interval_minutes': self.interval_minutes,
            'last_run_time': self.last_run_time,
            'run_count': self.run_count,
            'next_run_in': max(0, self.interval_seconds - (time.time() - self.last_run_time))
        }
    
    def force_download(self):
        """강제로 즉시 다운로드 실행"""
        try:
            self.logger.info("강제 다운로드 실행")
            self._execute_download()
            self.last_run_time = time.time()
            return True
        except Exception as e:
            self.logger.error(f"강제 다운로드 실패: {str(e)}")
            return False
    
    def change_interval(self, new_interval_minutes: int):
        """실행 간격 변경"""
        if new_interval_minutes < 1:
            self.logger.warning("간격은 최소 1분 이상이어야 합니다.")
            return False
        
        old_interval = self.interval_minutes
        self.interval_minutes = new_interval_minutes
        self.interval_seconds = new_interval_minutes * 60
        
        self.logger.info(f"실행 간격 변경: {old_interval}분 → {new_interval_minutes}분")
        return True
