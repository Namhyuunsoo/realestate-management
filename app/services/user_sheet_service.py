# app/services/user_sheet_service.py

import json
import os
import tempfile
from typing import List, Dict, Any, Optional
from datetime import datetime

# 외부 패키지 임포트 (try-except로 덮지 않아도 Vercel/Local 모두 pip를 통해 설치됨)
import gspread
from google.oauth2.service_account import Credentials
from flask import current_app

# 내부 모듈 임포트
from app.models.user_sheet import UserSheet
from app.core.ids import generate_id
from app.services.repositories import get_user_sheet_repository

class UserSheetService:
    """사용자별 개별매물장 시트 관리 서비스 (DB 기반)"""
    
    def __init__(self, data_store_path: str = None):
        # 기존 로컬 경로 유지를 위해 일단 파라미터는 남기되,
        # 내부적으로는 Repository 인스턴스를 주입받아 사용합니다.
        self.repository = get_user_sheet_repository()
        # 데이터는 DB에서 동적으로 조회하므로, 인메모리 load_sheets() 방식은 제거합니다.
    
    def create_user_sheet(self, user_id: str, sheet_name: str, sheet_url: str, **kwargs) -> UserSheet:
        """새로운 사용자 시트 생성"""
        sheet_id = generate_id()
        
        # 기본 생성값 구성 등
        sheet = UserSheet(
            id=sheet_id,
            user_id=user_id,
            sheet_name=sheet_name,
            sheet_url=sheet_url,
            **kwargs
        )
        
        # 시트 ID 자동 추출
        if not sheet.sheet_id:
            sheet.sheet_id = sheet.extract_sheet_id()
        
        # 검증
        errors = sheet.validate()
        if errors:
            raise ValueError(f"시트 생성 실패: {'; '.join(errors)}")
        
        # DB(Repository)에 저장
        success = self.repository.save_sheet(sheet.to_dict())
        if not success:
            raise RuntimeError("Database Insert Failed")
        
        if current_app: current_app.logger.info(f"사용자 시트 생성됨: {user_id} - {sheet_name}")
        return sheet
    
    def get_user_sheets(self, user_id: str) -> List[UserSheet]:
        """사용자 ID로 모든 시트 조회"""
        all_data = self.repository.get_all_sheets()
        sheets = [UserSheet.from_dict(data) for data in all_data]
        return [sheet for sheet in sheets if sheet.user_id == user_id]
    
    def get_active_user_sheet(self, user_id: str) -> Optional[UserSheet]:
        """사용자의 활성화된 시트 조회"""
        sheets = self.get_user_sheets(user_id)
        for sheet in sheets:
            if sheet.is_active:
                return sheet
        return None
        
    def get_user_sheet(self, sheet_id: str) -> Optional[UserSheet]:
        """특정 사용자 시트 정보 조회"""
        data = self.repository.get_sheet_by_id(sheet_id)
        return UserSheet.from_dict(data) if data else None
        
    def update_user_sheet(self, sheet_id: str, **kwargs) -> Optional[UserSheet]:
        """사용자 시트 정보 업데이트"""
        sheet = self.get_user_sheet(sheet_id)
        if not sheet:
            return None
        
        # 업데이트할 필드들
        for key, value in kwargs.items():
            if hasattr(sheet, key):
                setattr(sheet, key, value)
        
        # 시트 ID 자동 업데이트
        if 'sheet_url' in kwargs and not sheet.sheet_id:
            sheet.sheet_id = sheet.extract_sheet_id()
        
        # 검증
        errors = sheet.validate()
        if errors:
            raise ValueError(f"시트 업데이트 실패: {'; '.join(errors)}")
        
        sheet.update_timestamp()
        
        # Repository를 통해 저장
        if self.repository.save_sheet(sheet.to_dict()):
           current_app.logger.info(f"사용자 시트 업데이트됨: {sheet_id}")
           return sheet
        return None
    
    def delete_user_sheet(self, sheet_id: str) -> bool:
        """사용자 시트 삭제"""
        sheet = self.get_user_sheet(sheet_id)
        if sheet:
            if self.repository.delete_sheet(sheet_id):
                current_app.logger.info(f"사용자 시트 삭제됨: {sheet_id} - {sheet.sheet_name}")
                return True
        return False
    
    def toggle_sheet_active(self, sheet_id: str) -> Optional[UserSheet]:
        """시트 활성화/비활성화 토글"""
        sheet = self.get_user_sheet(sheet_id)
        if not sheet:
            return None
        
        sheet.is_active = not sheet.is_active
        sheet.update_timestamp()
        self.repository.save_sheet(sheet.to_dict())
        
        status = "활성화" if sheet.is_active else "비활성화"
        current_app.logger.info(f"사용자 시트 {status}: {sheet_id} - {sheet.sheet_name}")
        return sheet
    
    def toggle_sync_enabled(self, sheet_id: str) -> Optional[UserSheet]:
        """동기화 활성화/비활성화 토글"""
        sheet = self.get_user_sheet(sheet_id)
        if not sheet:
            return None
        
        sheet.sync_enabled = not sheet.sync_enabled
        sheet.update_timestamp()
        self.repository.save_sheet(sheet.to_dict())
        
        status = "활성화" if sheet.sync_enabled else "비활성화"
        current_app.logger.info(f"시트 동기화 {status}: {sheet_id} - {sheet.sheet_name}")
        return sheet
    
    def update_sync_interval(self, sheet_id: str, interval_seconds: int) -> Optional[UserSheet]:
        """동기화 간격 업데이트"""
        sheet = self.get_user_sheet(sheet_id)
        if not sheet:
            return None
        
        if interval_seconds < 60:  # 최소 1분
            raise ValueError("동기화 간격은 최소 60초 이상이어야 합니다.")
        
        sheet.sync_interval = interval_seconds
        sheet.update_timestamp()
        self.repository.save_sheet(sheet.to_dict())
        
        current_app.logger.info(f"동기화 간격 업데이트: {sheet_id} - {interval_seconds}초")
        return sheet
    
    def get_all_user_sheets(self) -> List[UserSheet]:
        """모든 사용자 시트 목록 조회 (DB)"""
        return [UserSheet.from_dict(d) for d in self.repository.get_all_sheets()]

    def get_sheets_by_user(self, user_id: str) -> List[UserSheet]:
        """특정 사용자의 시트 목록 조회"""
        return [s for s in self.get_all_user_sheets() if s.user_id == user_id]

    def get_sheets_needing_sync(self) -> List[UserSheet]:
        """동기화가 필요한 시트들 조회"""
        return [sheet for sheet in self.get_all_user_sheets() 
                if sheet.sync_enabled and sheet.is_active and sheet.is_sync_due()]
    
    def update_sync_timestamp(self, sheet_id: str):
        """동기화 타임스탬프 업데이트"""
        sheet = self.get_user_sheet(sheet_id)
        if sheet:
            sheet.update_sync_timestamp()
            self.repository.save_sheet(sheet.to_dict())
    
    def get_sheet_statistics(self, user_id: str) -> Dict[str, Any]:
        """사용자 시트 통계 정보"""
        user_sheets = self.get_user_sheets(user_id)
        
        total_sheets = len(user_sheets)
        active_sheets = len([s for s in user_sheets if s.is_active])
        sync_enabled_sheets = len([s for s in user_sheets if s.sync_enabled])
        personal_api_sheets = len([s for s in user_sheets if s.has_personal_api()])
        
        return {
            'total_sheets': total_sheets,
            'active_sheets': active_sheets,
            'sync_enabled_sheets': sync_enabled_sheets,
            'personal_api_sheets': personal_api_sheets,
            'last_sync': max([s.last_sync_at for s in user_sheets if s.last_sync_at], default=None)
        }
    
    def get_user_api_client(self, user_sheet: UserSheet) -> Optional[gspread.Client]:
        """사용자별 API 클라이언트 생성"""
        try:
            if user_sheet.has_personal_api():
                if user_sheet.google_api_key:
                    return self.create_api_client_with_key(user_sheet.google_api_key)
                elif user_sheet.service_account_json:
                    return self.create_api_client_with_service_account(user_sheet.service_account_json)
            else:
                return self.get_default_api_client()
        except Exception as e:
            current_app.logger.error(f"API 클라이언트 생성 실패: {e}")
            return None
    
    def create_api_client_with_key(self, api_key: str) -> gspread.Client:
        """API 키로 클라이언트 생성"""
        try:
            # API 키를 사용한 클라이언트 생성
            client = gspread.authorize(api_key)
            current_app.logger.info("API 키로 클라이언트 생성 성공")
            return client
        except Exception as e:
            current_app.logger.error(f"API 키로 클라이언트 생성 실패: {e}")
            raise
    
    def create_api_client_with_service_account(self, service_account_json: str) -> gspread.Client:
        """서비스어카운트로 클라이언트 생성 (메모리 기반 - 보안 강화)"""
        try:
            import json
            from google.oauth2.service_account import Credentials
            
            # JSON 문자열을 딕셔너리로 파싱
            service_account_info = json.loads(service_account_json)
            
            # 메모리에서 직접 인증 정보 생성
            credentials = Credentials.from_service_account_info(
                service_account_info,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            
            # gspread 클라이언트 생성
            client = gspread.Client(credentials)
            current_app.logger.info("서비스어카운트로 클라이언트 생성 성공 (메모리 기반)")
            return client
            
        except Exception as e:
            current_app.logger.error(f"서비스어카운트로 클라이언트 생성 실패: {e}")
            raise
    
    def get_default_api_client(self) -> Optional[gspread.Client]:
        """기본 API 클라이언트 반환 (환경 변수 또는 파일)"""
        try:
            from app.core.google_auth import get_gspread_client
            client = get_gspread_client()
            if client:
                current_app.logger.info("기본 Google 서비스어카운트로 클라이언트 생성 성공")
                return client
            else:
                current_app.logger.warning("기본 서비스어카운트 인증 정보를 로드할 수 없습니다.")
                return None
        except Exception as e:
            current_app.logger.error(f"기본 API 클라이언트 생성 실패: {e}")
            return None
    
    def test_api_connection(self, user_sheet: UserSheet) -> Dict[str, Any]:
        """API 연결 테스트"""
        try:
            client = self.get_user_api_client(user_sheet)
            if not client:
                return {
                    'success': False,
                    'error': 'API 클라이언트를 생성할 수 없습니다.'
                }
            
            # 간단한 API 호출 테스트
            test_sheet = client.open_by_key(user_sheet.sheet_id)
            sheet_info = test_sheet.get_worksheet(0)
            
            return {
                'success': True,
                'message': 'API 연결 성공',
                'sheet_title': test_sheet.title,
                'api_type': user_sheet.get_api_type()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'API 연결 실패: {str(e)}'
            }
