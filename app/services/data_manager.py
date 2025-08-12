# app/services/data_manager.py

import os
import time
from typing import Dict, Any, Optional, List
from .customer_service import CustomerService
from .briefing_service import BriefingService
from .user_service import UserService
from .sheet_download_service import SheetDownloadService
from .sheet_scheduler import SheetScheduler

class DataManager:
    """중앙 데이터 관리자"""
    
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        self._lock = None  # 스레드 안전성을 위한 락
        
        # 서비스 인스턴스들
        self.customer_service: Optional[CustomerService] = None
        self.briefing_service: Optional[BriefingService] = None
        self.user_service: Optional[UserService] = None
        self.sheet_download_service: Optional[SheetDownloadService] = None
        self.sheet_scheduler: Optional[SheetScheduler] = None
        
        # 기존 호환성을 위한 데이터
        self.customers = {}
        self.briefings = {}
        self.users = {}
    
    def initialize(self):
        """모든 서비스 초기화"""
        print("🚀 DataManager 초기화 시작...")
        
        # 사용자 서비스 초기화 (가장 먼저)
        self.user_service = UserService(self.data_dir)
        print("✅ UserService 초기화 완료")
        
        # 고객 서비스 초기화
        self.customer_service = CustomerService(self.data_dir)
        print("✅ CustomerService 초기화 완료")
        
        # 브리핑 서비스 초기화
        self.briefing_service = BriefingService(self)
        print("✅ BriefingService 초기화 완료")
        
        # 시트 다운로드 서비스 초기화
        try:
            self.sheet_download_service = SheetDownloadService()
            print("✅ SheetDownloadService 초기화 완료")
            
            # 시트 다운로드 스케줄러 초기화
            self.sheet_scheduler = SheetScheduler(self.sheet_download_service)
            print("✅ SheetScheduler 초기화 완료")
            
        except Exception as e:
            print(f"⚠️ SheetDownloadService 초기화 실패: {e}")
            print("   Google Sheets 자동 동기화 기능이 비활성화됩니다.")
        
        # 기존 호환성을 위한 데이터 로드
        self._load_compatibility_data()
        
        print("🎉 DataManager 초기화 완료!")
    
    def start_sheet_sync(self):
        """시트 동기화 스케줄러 시작"""
        if self.sheet_scheduler:
            try:
                self.sheet_scheduler.start()
                print("✅ 시트 동기화 스케줄러 시작됨")
                return True
            except Exception as e:
                print(f"❌ 시트 동기화 스케줄러 시작 실패: {e}")
                return False
        else:
            print("⚠️ SheetDownloadService가 초기화되지 않았습니다.")
            return False
    
    def stop_sheet_sync(self):
        """시트 동기화 스케줄러 중지"""
        if self.sheet_scheduler:
            self.sheet_scheduler.stop()
            print("✅ 시트 동기화 스케줄러 중지됨")
    
    def get_sheet_sync_status(self) -> Optional[Dict[str, Any]]:
        """시트 동기화 상태 조회"""
        if self.sheet_scheduler:
            return self.sheet_scheduler.get_status()
        return None
    
    def force_sheet_download(self) -> bool:
        """강제로 시트 다운로드 실행"""
        if self.sheet_download_service:
            try:
                results = self.sheet_download_service.download_all_sheets()
                success_count = sum(results.values())
                print(f"✅ 강제 시트 다운로드 완료: {success_count}/{len(results)} 성공")
                return success_count == len(results)
            except Exception as e:
                print(f"❌ 강제 시트 다운로드 실패: {e}")
                return False
        return False
    
    def _load_compatibility_data(self):
        """기존 호환성을 위한 데이터 로드"""
        # 기존 데이터 구조 유지를 위한 호환성 레이어
        # CustomerService와 BriefingService는 별도 파일로 데이터를 관리하므로
        # 여기서는 빈 딕셔너리로 초기화
        self.customers = {}
        self.briefings = {}
        
        if self.user_service:
            self.users = self.user_service.users
    
    def _next_id(self, prefix: str) -> str:
        """ID 생성 (기존 호환성)"""
        timestamp = int(time.time() * 1000)
        return f"{prefix}_{timestamp}"
    
    def _save_store(self):
        """데이터 저장 (기존 호환성)"""
        if self.customer_service:
            self.customer_service._save_customers()
        if self.briefing_service:
            self.briefing_service._save_briefings()
        if self.user_service:
            self.user_service._save_users()
    
    # 기존 호환성 메서드들
    def create_customer(self, user_email: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """고객 생성 (기존 호환성)"""
        if self.customer_service:
            return self.customer_service.create_customer(user_email, data)
        return {}
    
    def get_customer(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """고객 조회 (기존 호환성)"""
        if self.customer_service:
            return self.customer_service.get_customer(customer_id)
        return None
    
    def update_customer(self, customer_id: str, data: Dict[str, Any], user_email: str) -> Optional[Dict[str, Any]]:
        """고객 업데이트 (기존 호환성)"""
        if self.customer_service:
            return self.customer_service.update_customer(customer_id, data, user_email)
        return None
    
    def delete_customer(self, customer_id: str, user_email: str) -> bool:
        """고객 삭제 (기존 호환성)"""
        if self.customer_service:
            return self.customer_service.delete_customer(customer_id, user_email)
        return False
    
    def list_customers(self, user_email: str, filter_type: str = 'own', manager: str = '') -> list:
        """고객 목록 조회 (기존 호환성)"""
        if self.customer_service:
            return self.customer_service.list_customers(user_email, filter_type, manager)
        return []
    
    def get_managers(self, user_email: str) -> list:
        """매니저 목록 조회 (기존 호환성)"""
        if self.customer_service:
            return self.customer_service.get_managers(user_email)
        return []
    
    def is_admin(self, user_email: str) -> bool:
        """관리자 권한 확인 (기존 호환성)"""
        if self.user_service:
            user = self.user_service.get_user_by_email(user_email)
            return user and user.is_admin()
        return False
    
    def create_briefing(self, user_email: str, customer_id: str, listing_ids: list) -> Dict[str, Any]:
        """브리핑 생성 (기존 호환성)"""
        if self.briefing_service:
            return self.briefing_service.create_briefing(user_email, customer_id, listing_ids)
        return {}
    
    def get_briefing(self, briefing_id: str) -> Optional[Dict[str, Any]]:
        """브리핑 조회 (기존 호환성)"""
        if self.briefing_service:
            return self.briefing_service.get_briefing(briefing_id)
        return None 