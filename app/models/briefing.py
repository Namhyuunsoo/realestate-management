# app/models/briefing.py

from typing import Dict, Any, List, Optional
from .base import BaseModel, TimestampMixin, ValidationMixin

class Briefing(BaseModel, TimestampMixin, ValidationMixin):
    """브리핑 모델"""
    
    required_fields = ['user', 'customer_id', 'listing_ids']
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.user = kwargs.get('user', '')
        self.customer_id = kwargs.get('customer_id', '')
        self.listing_ids = kwargs.get('listing_ids', [])
        self.overrides = kwargs.get('overrides', {})
        self.tags = kwargs.get('tags', {})
        
        super().__init__(**kwargs)
    
    def to_dict(self) -> Dict[str, Any]:
        """브리핑을 딕셔너리로 변환"""
        # NaN 값 안전 처리
        def safe_value(value):
            import math
            if value is None or (isinstance(value, float) and math.isnan(value)):
                return None
            return value
        
        return {
            'id': self.id,
            'user': self.user,
            'customer_id': self.customer_id,
            'listing_ids': self.listing_ids,
            'overrides': self.overrides,
            'tags': self.tags,
            'created_at': safe_value(self.created_at),
            'updated_at': safe_value(self.updated_at)
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Briefing':
        """딕셔너리에서 브리핑 생성"""
        return cls(**data)
    
    def validate(self) -> list:
        """브리핑 데이터 검증"""
        errors = super().validate()
        
        # 사용자 검증
        if not self.user or not self.user.strip():
            errors.append("사용자 정보는 필수입니다.")
        
        # 고객 ID 검증
        if not self.customer_id or not self.customer_id.strip():
            errors.append("고객 ID는 필수입니다.")
        
        # 매물 ID 리스트 검증
        if not isinstance(self.listing_ids, list):
            errors.append("매물 ID는 리스트 형태여야 합니다.")
        elif len(self.listing_ids) == 0:
            errors.append("최소 하나의 매물이 필요합니다.")
        
        return errors
    
    def add_listing(self, listing_id: str):
        """매물 추가"""
        if listing_id not in self.listing_ids:
            self.listing_ids.append(listing_id)
            self.update_timestamp()
    
    def remove_listing(self, listing_id: str):
        """매물 제거"""
        if listing_id in self.listing_ids:
            self.listing_ids.remove(listing_id)
            # 관련 오버라이드와 태그도 제거
            self.overrides.pop(listing_id, None)
            self.tags.pop(listing_id, None)
            self.update_timestamp()
    
    def set_override(self, listing_id: str, field: str, value: str):
        """매물 오버라이드 설정"""
        if listing_id not in self.overrides:
            self.overrides[listing_id] = {}
        self.overrides[listing_id][field] = value
        self.update_timestamp()
    
    def clear_override(self, listing_id: str, field: str = None):
        """매물 오버라이드 해제"""
        if listing_id in self.overrides:
            if field is None:
                del self.overrides[listing_id]
            else:
                self.overrides[listing_id].pop(field, None)
            self.update_timestamp()
    
    def set_tag(self, listing_id: str, tag: str):
        """매물 태그 설정"""
        self.tags[listing_id] = tag
        self.update_timestamp()
    
    def clear_tag(self, listing_id: str):
        """매물 태그 해제"""
        self.tags.pop(listing_id, None)
        self.update_timestamp()
    
    def get_listing_count(self) -> int:
        """매물 개수 반환"""
        return len(self.listing_ids)
    
    def has_listing(self, listing_id: str) -> bool:
        """특정 매물 포함 여부 확인"""
        return listing_id in self.listing_ids 