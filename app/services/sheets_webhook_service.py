# app/services/sheets_webhook_service.py

import os
import uuid
import time
import logging
from typing import Dict, Any, Optional
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# 로거 설정
logger = logging.getLogger(__name__)

class SheetsWebhookService:
    """Google Sheets 변경 감지를 위한 웹훅 서비스"""
    
    def __init__(self):
        self.service_account_file = os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
        self.webhook_base_url = os.getenv("WEBHOOK_BASE_URL", "")  # https://skrealestate.duckdns.org
        self.drive_service = None
        self._authenticate()
    
    def _authenticate(self):
        """Google Drive API 인증"""
        try:
            scopes = ['https://www.googleapis.com/auth/drive']
            credentials = Credentials.from_service_account_file(
                self.service_account_file, 
                scopes=scopes
            )
            self.drive_service = build('drive', 'v3', credentials=credentials)
            logger.info("Google Drive API 인증 완료")
        except Exception as e:
            logger.error(f"Google Drive API 인증 실패: {e}")
            raise
    
    def extract_sheet_id_from_url(self, sheet_url: str) -> Optional[str]:
        """시트 URL에서 시트 ID 추출"""
        import re
        try:
            pattern = r'/spreadsheets/d/([a-zA-Z0-9-_]+)'
            match = re.search(pattern, sheet_url)
            if match:
                return match.group(1)
            return None
        except Exception as e:
            logger.error(f"시트 ID 추출 실패: {sheet_url} - {e}")
            return None
    
    def create_watch_channel(self, sheet_id: str, user_id: str, expiration_hours: int = 24) -> Dict[str, Any]:
        """
        Google Sheets 파일에 대한 웹훅 채널 생성
        
        Args:
            sheet_id: Google Sheets 파일 ID
            user_id: 사용자 ID
            expiration_hours: 채널 만료 시간 (최대 24시간)
        
        Returns:
            채널 정보 (channel_id, resource_id 포함)
        """
        if not self.webhook_base_url:
            raise ValueError("WEBHOOK_BASE_URL 환경변수가 설정되지 않았습니다.")
        
        channel_id = str(uuid.uuid4())
        expiration_ms = int((time.time() + expiration_hours * 3600) * 1000)
        webhook_url = f"{self.webhook_base_url}/api/webhooks/sheets-changed"
        
        request_body = {
            'id': channel_id,
            'type': 'web_hook',
            'address': webhook_url,
            'expiration': expiration_ms,
            'token': f"{user_id}:{channel_id}"  # 웹훅 검증용 (user_id:channel_id)
        }
        
        try:
            response = self.drive_service.files().watch(
                fileId=sheet_id,
                body=request_body
            ).execute()
            
            logger.info(f"웹훅 채널 생성 성공: {channel_id} (사용자: {user_id}, 시트: {sheet_id})")
            return {
                'channel_id': channel_id,
                'resource_id': response.get('resourceId'),
                'expiration': response.get('expiration'),
                'user_id': user_id,
                'sheet_id': sheet_id
            }
        except HttpError as e:
            error_msg = f"웹훅 채널 생성 실패: {e}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"웹훅 채널 생성 중 오류: {e}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def stop_watch_channel(self, channel_id: str, resource_id: str) -> bool:
        """
        웹훅 채널 중지
        
        Args:
            channel_id: 채널 ID
            resource_id: 리소스 ID
        
        Returns:
            성공 여부
        """
        try:
            self.drive_service.channels().stop(
                body={
                    'id': channel_id,
                    'resourceId': resource_id
                }
            ).execute()
            
            logger.info(f"웹훅 채널 중지 성공: {channel_id}")
            return True
        except HttpError as e:
            if e.resp.status == 404:
                # 채널이 이미 만료되었거나 존재하지 않음
                logger.warning(f"웹훅 채널이 이미 만료되었거나 존재하지 않음: {channel_id}")
                return True  # 이미 중지된 것으로 간주
            error_msg = f"웹훅 채널 중지 실패: {e}"
            logger.error(error_msg)
            return False
        except Exception as e:
            error_msg = f"웹훅 채널 중지 중 오류: {e}"
            logger.error(error_msg)
            return False
    
    def register_all_commercial_webhooks(self, expiration_hours: int = 24) -> Dict[str, Any]:
        """
        registry에 등록된 모든 활성 상가 매물 슬롯에 대해 웹훅을 등록합니다.
        
        Args:
            expiration_hours: 웹훅 만료 시간
            
        Returns:
            결과 요약 (성공/실패 수 등)
        """
        results = {
            "total": 0,
            "success": 0,
            "failed": 0,
            "details": []
        }
        
        try:
            from app.services.repositories import get_sheet_registry_repository
            repo = get_sheet_registry_repository()
            slots = repo.get_all_slots()
            
            active_slots = [s for s in slots if s.get("is_active") and s.get("sheet_url") and s.get("user_id")]
            results["total"] = len(active_slots)
            
            logger.info(f"상가 매물 웹훅 일괄 등록 시작: 대상 슬롯 {len(active_slots)}개")
            
            for slot in active_slots:
                slot_id = slot.get("slot_id")
                user_id = slot.get("user_id")
                sheet_url = slot.get("sheet_url")
                
                channel_info = self.register_user_sheet_webhook(user_id, sheet_url)
                if channel_info:
                    results["success"] += 1
                    results["details"].append({"slot_id": slot_id, "status": "success"})
                else:
                    results["failed"] += 1
                    results["details"].append({"slot_id": slot_id, "status": "failed"})
            
            logger.info(f"상가 매물 웹훅 일괄 등록 완료: 성공 {results['success']}, 실패 {results['failed']}")
            return results
        except Exception as e:
            logger.error(f"상가 매물 웹훅 일괄 등록 중 치명적 오류: {e}")
            results["error"] = str(e)
            return results

    def register_user_sheet_webhook(self, user_id: str, sheet_url: str) -> Optional[Dict[str, Any]]:
        """
        사용자 시트에 웹훅 등록
        
        Args:
            user_id: 사용자 ID
            sheet_url: Google Sheets URL
        
        Returns:
            채널 정보 또는 None
        """
        try:
            sheet_id = self.extract_sheet_id_from_url(sheet_url)
            if not sheet_id:
                logger.error(f"시트 ID 추출 실패: {sheet_url}")
                return None
            
            channel_info = self.create_watch_channel(sheet_id, user_id)
            
            # 채널 정보를 저장 (나중에 중지할 때 사용)
            # TODO: 데이터베이스나 파일에 저장 필요
            # 현재는 메모리에만 저장 (서버 재시작 시 손실)
            
            return channel_info
        except Exception as e:
            logger.error(f"사용자 시트 웹훅 등록 실패: {user_id} - {e}")
            return None
    
    def unregister_user_sheet_webhook(self, channel_id: str, resource_id: str) -> bool:
        """
        사용자 시트 웹훅 등록 해제
        
        Args:
            channel_id: 채널 ID
            resource_id: 리소스 ID
        
        Returns:
            성공 여부
        """
        return self.stop_watch_channel(channel_id, resource_id)
    
    def register_housing_sheet_webhook(self, expiration_hours: int = 24) -> Optional[Dict[str, Any]]:
        """
        주택매물장 스프레드시트에 웹훅 등록
        
        Args:
            expiration_hours: 채널 만료 시간 (최대 24시간)
        
        Returns:
            채널 정보 또는 None
        """
        try:
            housing_sheet_id = os.getenv("HOUSING_SHEET_ID", "1KZ7aLN_Vzfnp0MhnOsJXuCtPtGIPuVj-UaHB2xP7JRs")
            # 주택매물장은 특별 토큰 사용 (구분용)
            token = f"housing:{housing_sheet_id}"
            channel_info = self.create_watch_channel(housing_sheet_id, token, expiration_hours)
            logger.info(f"주택매물장 웹훅 등록 성공: {channel_info.get('channel_id')}")
            return channel_info
        except Exception as e:
            logger.error(f"주택매물장 웹훅 등록 실패: {e}")
            return None
