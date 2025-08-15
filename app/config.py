# app/config.py

import os
import secrets
from dataclasses import dataclass, field
from typing import List

def parse_csv_env(env_var: str) -> List[str]:
    """환경변수 CSV 문자열을 리스트로 파싱"""
    raw = env_var or ""
    return [s.strip().lower() for s in raw.split(",") if s.strip()]

@dataclass
class AppConfig:
    """애플리케이션 설정을 관리하는 클래스"""
    # 기본 설정
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_hex(32))
    JSON_AS_ASCII: bool = False
    JSON_SORT_KEYS: bool = False
    
    # 사용자 권한 설정
    ALLOWED_USERS: List[str] = field(default_factory=lambda: parse_csv_env(os.getenv("ALLOWED_USERS", "")))
    ADMIN_USERS: List[str] = field(default_factory=lambda: parse_csv_env(os.getenv("ADMIN_USERS", "")))
    
    # 보안 설정
    MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    LOCKOUT_DURATION: int = int(os.getenv("LOCKOUT_DURATION", "300"))  # 5분
    SESSION_TIMEOUT: int = int(os.getenv("SESSION_TIMEOUT", "28800"))  # 8시간
    MAX_REQUESTS_PER_MINUTE: int = int(os.getenv("MAX_REQUESTS_PER_MINUTE", "100"))
    ALLOWED_IPS: List[str] = field(default_factory=lambda: parse_csv_env(os.getenv("ALLOWED_IPS", "")))
    BLOCKED_IPS: List[str] = field(default_factory=lambda: parse_csv_env(os.getenv("BLOCKED_IPS", "")))
    REQUIRE_HTTPS: bool = os.getenv("REQUIRE_HTTPS", "false").lower() == "true"
    CSRF_PROTECTION: bool = os.getenv("CSRF_PROTECTION", "false").lower() == "true"
    
    # 데이터 경로 설정
    DATA_DIR: str = os.getenv("DATA_DIR", "./data")
    LISTING_SHEET_FILENAME: str = os.getenv("LISTING_SHEET_FILENAME", "상가임대차.xlsx")
    MAP_CACHE_FILENAME: str = os.getenv("MAP_CACHE_FILENAME", "지도캐시.xlsx")
    
    # 캐시 파일 설정
    LISTING_CACHE_FILE: str = os.getenv("LISTING_CACHE_FILE", "./data/cache/listings_normalized.json")
    GEOCODE_CACHE_FILE: str = os.getenv("GEOCODE_CACHE_FILE", "./data/cache/geocode_cache.json")
    
    # Google Sheets 설정
    SPREADSHEET_NAME: str = os.getenv("SPREADSHEET_NAME", "")
    SERVICE_ACCOUNT_FILE: str = os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
    SPREADSHEET_ID: str = os.getenv("SPREADSHEET_ID", "1D14iWPeTuHAMf9m_LrtsILYEd2Z8dpjAbIfpx-WR8eY")
    SHEET_DOWNLOAD_DIR: str = os.getenv("SHEET_DOWNLOAD_DIR", "./data/raw")
    SHEET_DOWNLOAD_INTERVAL: int = int(os.getenv("SHEET_DOWNLOAD_INTERVAL", "5"))
    
    # Naver 지도 API 설정
    NAVER_MAPS_NCP_KEY_ID: str = os.getenv("NAVER_MAPS_NCP_KEY_ID", "")
    NAVER_MAPS_NCP_CLIENT_ID: str = os.getenv("NAVER_MAPS_NCP_CLIENT_ID", "")
    NAVER_MAPS_NCP_CLIENT_SECRET: str = os.getenv("NAVER_MAPS_NCP_CLIENT_SECRET", "")
    
    # Naver 로그인 API 설정
    NAVER_LOGIN_CLIENT_ID: str = os.getenv("NAVER_LOGIN_CLIENT_ID", "")
    NAVER_LOGIN_CLIENT_SECRET: str = os.getenv("NAVER_LOGIN_CLIENT_SECRET", "")
    NAVER_LOGIN_REDIRECT_URI: str = os.getenv("NAVER_LOGIN_REDIRECT_URI", "")
    
    @classmethod
    def from_env(cls) -> 'AppConfig':
        """환경변수에서 설정을 로드하여 AppConfig 인스턴스를 생성"""
        return cls()
    
    def to_dict(self) -> dict:
        """설정을 딕셔너리로 변환 (민감한 정보 제외)"""
        return {
            'JSON_AS_ASCII': self.JSON_AS_ASCII,
            'JSON_SORT_KEYS': self.JSON_SORT_KEYS,
            'ALLOWED_USERS': self.ALLOWED_USERS,
            'ADMIN_USERS': self.ADMIN_USERS,
            'MAX_LOGIN_ATTEMPTS': self.MAX_LOGIN_ATTEMPTS,
            'LOCKOUT_DURATION': self.LOCKOUT_DURATION,
            'SESSION_TIMEOUT': self.SESSION_TIMEOUT,
            'MAX_REQUESTS_PER_MINUTE': self.MAX_REQUESTS_PER_MINUTE,
            'ALLOWED_IPS': self.ALLOWED_IPS,
            'BLOCKED_IPS': self.BLOCKED_IPS,
            'REQUIRE_HTTPS': self.REQUIRE_HTTPS,
            'CSRF_PROTECTION': self.CSRF_PROTECTION,
            'DATA_DIR': self.DATA_DIR,
            'LISTING_SHEET_FILENAME': self.LISTING_SHEET_FILENAME,
            'MAP_CACHE_FILENAME': self.MAP_CACHE_FILENAME,
            'LISTING_CACHE_FILE': self.LISTING_CACHE_FILE,
            'GEOCODE_CACHE_FILE': self.GEOCODE_CACHE_FILE,
            'SPREADSHEET_NAME': self.SPREADSHEET_NAME,
            'SERVICE_ACCOUNT_FILE': self.SERVICE_ACCOUNT_FILE,
            'SPREADSHEET_ID': self.SPREADSHEET_ID,
            'SHEET_DOWNLOAD_DIR': self.SHEET_DOWNLOAD_DIR,
            'SHEET_DOWNLOAD_INTERVAL': self.SHEET_DOWNLOAD_INTERVAL,
            'NAVER_MAPS_NCP_KEY_ID': self.NAVER_MAPS_NCP_KEY_ID,
            'NAVER_MAPS_NCP_CLIENT_ID': self.NAVER_MAPS_NCP_CLIENT_ID,
            'NAVER_MAPS_NCP_CLIENT_SECRET': '***' if self.NAVER_MAPS_NCP_CLIENT_SECRET else '',
            'NAVER_LOGIN_CLIENT_ID': self.NAVER_LOGIN_CLIENT_ID,
            'NAVER_LOGIN_CLIENT_SECRET': '***' if self.NAVER_LOGIN_CLIENT_SECRET else '',
            'NAVER_LOGIN_REDIRECT_URI': self.NAVER_LOGIN_REDIRECT_URI,
        }

def load_config(app):
    """Flask 앱에 설정을 로드"""
    config = AppConfig.from_env()
    
    # 기본 설정
    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['JSON_AS_ASCII'] = config.JSON_AS_ASCII
    app.config['JSON_SORT_KEYS'] = config.JSON_SORT_KEYS
    
    # 사용자 권한 설정
    app.config['ALLOWED_USERS'] = config.ALLOWED_USERS
    app.config['ADMIN_USERS'] = config.ADMIN_USERS
    
    # 보안 설정
    app.config['MAX_LOGIN_ATTEMPTS'] = config.MAX_LOGIN_ATTEMPTS
    app.config['LOCKOUT_DURATION'] = config.LOCKOUT_DURATION
    app.config['SESSION_TIMEOUT'] = config.SESSION_TIMEOUT
    app.config['MAX_REQUESTS_PER_MINUTE'] = config.MAX_REQUESTS_PER_MINUTE
    app.config['ALLOWED_IPS'] = config.ALLOWED_IPS
    app.config['BLOCKED_IPS'] = config.BLOCKED_IPS
    app.config['REQUIRE_HTTPS'] = config.REQUIRE_HTTPS
    app.config['CSRF_PROTECTION'] = config.CSRF_PROTECTION
    
    # 데이터 경로 설정
    app.config['DATA_DIR'] = config.DATA_DIR
    app.config['LISTING_SHEET_FILENAME'] = config.LISTING_SHEET_FILENAME
    app.config['MAP_CACHE_FILENAME'] = config.MAP_CACHE_FILENAME
    
    # 캐시 파일 설정
    app.config['LISTING_CACHE_FILE'] = config.LISTING_CACHE_FILE
    app.config['GEOCODE_CACHE_FILE'] = config.GEOCODE_CACHE_FILE
    
    # Google Sheets 설정
    app.config['SPREADSHEET_NAME'] = config.SPREADSHEET_NAME
    app.config['SERVICE_ACCOUNT_FILE'] = config.SERVICE_ACCOUNT_FILE
    app.config['SPREADSHEET_ID'] = config.SPREADSHEET_ID
    app.config['SHEET_DOWNLOAD_DIR'] = config.SHEET_DOWNLOAD_DIR
    app.config['SHEET_DOWNLOAD_INTERVAL'] = config.SHEET_DOWNLOAD_INTERVAL
    
    # Naver 지도 API 설정
    app.config['NAVER_MAPS_NCP_KEY_ID'] = config.NAVER_MAPS_NCP_KEY_ID
    app.config['NAVER_MAPS_NCP_CLIENT_ID'] = config.NAVER_MAPS_NCP_CLIENT_ID
    app.config['NAVER_MAPS_NCP_CLIENT_SECRET'] = config.NAVER_MAPS_NCP_CLIENT_SECRET
    
    # Naver 로그인 API 설정
    app.config['NAVER_LOGIN_CLIENT_ID'] = config.NAVER_LOGIN_CLIENT_ID
    app.config['NAVER_LOGIN_CLIENT_SECRET'] = config.NAVER_LOGIN_CLIENT_SECRET
    app.config['NAVER_LOGIN_REDIRECT_URI'] = config.NAVER_LOGIN_REDIRECT_URI