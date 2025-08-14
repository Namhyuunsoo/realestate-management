# app/models/user_sheet.py

from typing import Dict, Any, List, Optional
from .base import BaseModel, TimestampMixin, ValidationMixin

class UserSheet(BaseModel, TimestampMixin, ValidationMixin):
    """사용자별 개별매물장 시트 연동 모델"""
    
    required_fields = ['user_id', 'sheet_name', 'sheet_url']
    
    def __init__(self, **kwargs):
        # 타임스탬프 초기화
        from datetime import datetime
        self.created_at = kwargs.get('created_at', datetime.now().isoformat())
        self.updated_at = kwargs.get('updated_at', datetime.now().isoformat())
        
        self.id = kwargs.get('id')
        self.user_id = kwargs.get('user_id', '')
        self.sheet_name = kwargs.get('sheet_name', '')
        self.sheet_url = kwargs.get('sheet_url', '')
        self.sheet_id = kwargs.get('sheet_id', '')  # 구글 시트 ID
        self.is_active = kwargs.get('is_active', True)
        self.sync_enabled = kwargs.get('sync_enabled', True)
        self.last_sync_at = kwargs.get('last_sync_at')
        self.sync_interval = kwargs.get('sync_interval', 3600)  # 초 단위
        self.custom_fields = kwargs.get('custom_fields', {})  # 사용자 정의 필드
        
        # 시트별 설정
        self.selected_sheets = kwargs.get('selected_sheets', [])  # 선택된 시트 목록
        self.sheet_configs = kwargs.get('sheet_configs', {})  # 시트별 설정 (헤더, 필드 등)
        
        # API 인증 정보
        self.google_api_key = kwargs.get('google_api_key', '')  # 개인 API 키
        self.service_account_json = kwargs.get('service_account_json', '')  # 개인 서비스어카운트
        self.api_credentials = kwargs.get('api_credentials', {})  # API 인증 정보
        
        self.settings = kwargs.get('settings', {
            'auto_sync': True,
            'sync_on_create': True,
            'sync_on_update': True,
            'sync_on_delete': True,
            'use_personal_api': False,  # 개인 API 사용 여부
            'api_key_encrypted': False  # API 키 암호화 여부
        })
        
        # BaseModel 초기화
        super().__init__(**kwargs)
    
    def to_dict(self) -> Dict[str, Any]:
        """사용자 시트를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'sheet_name': self.sheet_name,
            'sheet_url': self.sheet_url,
            'sheet_id': self.sheet_id,
            'is_active': self.is_active,
            'sync_enabled': self.sync_enabled,
            'last_sync_at': self.last_sync_at,
            'sync_interval': self.sync_interval,
            'custom_fields': self.custom_fields,
            'google_api_key': self.google_api_key,
            'service_account_json': self.service_account_json,
            'api_credentials': self.api_credentials,
            'selected_sheets': self.selected_sheets,
            'sheet_configs': self.sheet_configs,
            'settings': self.settings,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserSheet':
        """딕셔너리에서 사용자 시트 생성"""
        return cls(**data)
    
    def validate(self) -> list:
        """사용자 시트 데이터 검증"""
        errors = super().validate()
        
        # 사용자 ID 검증
        if not self.user_id or not self.user_id.strip():
            errors.append("사용자 ID는 필수입니다.")
        
        # 시트 이름 검증
        if not self.sheet_name or not self.sheet_name.strip():
            errors.append("시트 이름은 필수입니다.")
        
        # 시트 URL 검증
        if not self.sheet_url or not self.sheet_url.strip():
            errors.append("시트 URL은 필수입니다.")
        
        # 구글 시트 URL 형식 검증
        if self.sheet_url and not self.sheet_url.startswith('https://docs.google.com/spreadsheets/'):
            errors.append("올바른 구글 시트 URL이 아닙니다.")
        
        # API 키 검증 (선택사항)
        if self.google_api_key and not self.google_api_key.strip():
            errors.append("API 키가 입력된 경우 유효한 값을 입력해야 합니다.")
        
        # 서비스어카운트 JSON 검증 (선택사항)
        if self.service_account_json:
            try:
                import json
                json.loads(self.service_account_json)
            except (json.JSONDecodeError, TypeError):
                errors.append("서비스어카운트 JSON 형식이 올바르지 않습니다.")
        
        return errors
    
    def extract_sheet_id(self) -> str:
        """URL에서 시트 ID 추출"""
        if not self.sheet_url:
            return ""
        
        try:
            # https://docs.google.com/spreadsheets/d/{sheet_id}/edit
            parts = self.sheet_url.split('/')
            if 'd' in parts:
                d_index = parts.index('d')
                if d_index + 1 < len(parts):
                    return parts[d_index + 1]
        except:
            pass
        
        return ""
    
    def update_sync_timestamp(self):
        """동기화 타임스탬프 업데이트"""
        from datetime import datetime
        self.last_sync_at = datetime.now().isoformat()
        self.updated_at = datetime.now().isoformat()
    
    def is_sync_due(self) -> bool:
        """동기화가 필요한지 확인"""
        if not self.sync_enabled or not self.last_sync_at:
            return True
        
        from datetime import datetime, timedelta
        now = datetime.now()
        last_sync = self.last_sync_at
        if isinstance(last_sync, str):
            try:
                last_sync = datetime.fromisoformat(last_sync.replace('Z', '+00:00'))
            except ValueError:
                # ISO 형식이 아닌 경우 현재 시간으로 처리
                return True
        
        return now - last_sync > timedelta(seconds=self.sync_interval)
    
    def get_setting(self, key: str, default=None):
        """설정값 가져오기"""
        return self.settings.get(key, default)
    
    def set_setting(self, key: str, value: Any):
        """설정값 설정"""
        self.settings[key] = value
        self.update_timestamp()
    
    def add_custom_field(self, field_name: str, field_type: str = 'text'):
        """사용자 정의 필드 추가"""
        self.custom_fields[field_name] = {
            'type': field_type,
            'created_at': self.created_at
        }
        self.update_timestamp()
    
    def remove_custom_field(self, field_name: str):
        """사용자 정의 필드 제거"""
        if field_name in self.custom_fields:
            del self.custom_fields[field_name]
            self.update_timestamp()
    
    def set_google_api_key(self, api_key: str):
        """구글 API 키 설정"""
        self.google_api_key = api_key
        self.settings['use_personal_api'] = bool(api_key.strip())
        self.update_timestamp()
    
    def set_service_account_json(self, json_data: str):
        """서비스어카운트 JSON 설정"""
        self.service_account_json = json_data
        self.settings['use_personal_api'] = bool(json_data.strip())
        self.update_timestamp()
    
    def clear_api_credentials(self):
        """API 인증 정보 초기화"""
        self.google_api_key = ""
        self.service_account_json = ""
        self.api_credentials = {}
        self.settings['use_personal_api'] = False
        self.update_timestamp()
    
    def has_personal_api(self) -> bool:
        """개인 API 키가 설정되어 있는지 확인"""
        return bool(self.google_api_key.strip() or self.service_account_json.strip())
    
    def get_api_type(self) -> str:
        """사용 중인 API 타입 반환"""
        if self.google_api_key.strip():
            return "api_key"
        elif self.service_account_json.strip():
            return "service_account"
        else:
            return "default"
    
    def add_selected_sheet(self, sheet_name: str, config: dict = None):
        """선택된 시트 추가"""
        if sheet_name not in self.selected_sheets:
            self.selected_sheets.append(sheet_name)
            if config:
                self.sheet_configs[sheet_name] = config
            self.update_timestamp()
    
    def remove_selected_sheet(self, sheet_name: str):
        """선택된 시트 제거"""
        if sheet_name in self.selected_sheets:
            self.selected_sheets.remove(sheet_name)
            if sheet_name in self.sheet_configs:
                del self.sheet_configs[sheet_name]
            self.update_timestamp()
    
    def get_sheet_config(self, sheet_name: str) -> dict:
        """시트별 설정 가져오기"""
        return self.sheet_configs.get(sheet_name, {})
    
    def set_sheet_config(self, sheet_name: str, config: dict):
        """시트별 설정 설정"""
        self.sheet_configs[sheet_name] = config
        self.update_timestamp()
    
    def has_selected_sheets(self) -> bool:
        """선택된 시트가 있는지 확인"""
        return len(self.selected_sheets) > 0
