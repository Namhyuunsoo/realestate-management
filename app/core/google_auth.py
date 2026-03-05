import os
import json
import logging
from typing import Optional
from google.oauth2.service_account import Credentials
import gspread

def get_google_auth_credentials() -> Optional[Credentials]:
    """
    환경 변수 또는 파일을 통해 Google Service Account Credentials 객체를 생성합니다.
    Vercel 등 서버리스 환경에서는 GOOGLE_SERVICE_ACCOUNT_JSON 환경변수(Base64 인코딩 또는 일반 JSON 문자열)를 선호합니다.
    """
    # 1. 환경변수로 전달된 JSON 문자열 기반 로드 (최우선 순위 - Vercel용)
    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if sa_json:
        try:
            # Base64 인코딩된 JSON인지 확인 (보안 및 특수문자 이스케이프 목적)
            import base64
            try:
                decoded = base64.b64decode(sa_json).decode('utf-8')
                sa_info = json.loads(decoded)
            except Exception:
                # 일반 JSON 문자열인 경우
                sa_info = json.loads(sa_json)
            
            return Credentials.from_service_account_info(
                sa_info,
                scopes=['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
            )
        except Exception as e:
            logging.error(f"환경변수 GOOGLE_SERVICE_ACCOUNT_JSON 로딩 실패: {e}")
    
    # 2. 기존 방식 (파일 시스템 기반 로드)
    sa_file = os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
    if not os.path.exists(sa_file):
        # 상위 디렉토리 구성 등 추가 경로 확인
        alt_paths = ["../config/service_account.json", "config/service_account.json", "./data/service_account.json"]
        for p in alt_paths:
            if os.path.exists(p):
                sa_file = p
                break
                
    if os.path.exists(sa_file):
        try:
            return Credentials.from_service_account_file(
                sa_file,
                scopes=['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
            )
        except Exception as e:
            logging.error(f"서비스 계정 파일 로딩 실패 ({sa_file}): {e}")
            
    return None

def get_gspread_client() -> Optional[gspread.Client]:
    """공용 gspread 클라이언트 인스턴스 반환"""
    creds = get_google_auth_credentials()
    if creds:
        return gspread.Client(creds)
    logging.warning("Google Auth Credentials를 생성할 수 없어 gspread 클라이언트를 반환하지 못했습니다.")
    return None
