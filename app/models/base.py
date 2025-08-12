# app/models/base.py

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

class BaseModel(ABC):
    """모든 모델의 기본 클래스"""
    
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """모델을 딕셔너리로 변환"""
        pass
    
    @classmethod
    @abstractmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BaseModel':
        """딕셔너리에서 모델 생성"""
        pass
    
    def to_json(self) -> str:
        """모델을 JSON 문자열로 변환"""
        def safe_json_serializer(obj):
            import math
            if isinstance(obj, float) and math.isnan(obj):
                return None
            return str(obj)
        
        return json.dumps(self.to_dict(), ensure_ascii=False, default=safe_json_serializer)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'BaseModel':
        """JSON 문자열에서 모델 생성"""
        data = json.loads(json_str)
        return cls.from_dict(data)

class TimestampMixin:
    """타임스탬프 믹스인"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 안전한 타임스탬프 생성
        try:
            self.created_at = kwargs.get('created_at', int(datetime.now().timestamp()))
            self.updated_at = kwargs.get('updated_at', int(datetime.now().timestamp()))
        except (ValueError, TypeError):
            # 타임스탬프 생성 실패 시 현재 시간을 정수로 사용
            import time
            self.created_at = kwargs.get('created_at', int(time.time()))
            self.updated_at = kwargs.get('updated_at', int(time.time()))
    
    def update_timestamp(self):
        """업데이트 타임스탬프 갱신"""
        try:
            self.updated_at = int(datetime.now().timestamp())
        except (ValueError, TypeError):
            import time
            self.updated_at = int(time.time())

class ValidationMixin:
    """검증 믹스인"""
    
    def validate(self) -> List[str]:
        """모델 검증 - 오류 메시지 리스트 반환"""
        errors = []
        
        # 기본 검증 로직
        if hasattr(self, 'required_fields'):
            for field in self.required_fields:
                if not hasattr(self, field) or getattr(self, field) is None:
                    errors.append(f"필수 필드 '{field}'가 누락되었습니다.")
        
        return errors
    
    def is_valid(self) -> bool:
        """모델이 유효한지 확인"""
        return len(self.validate()) == 0 