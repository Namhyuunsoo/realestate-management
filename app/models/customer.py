# app/models/customer.py

from typing import Dict, Any, Optional
from .base import BaseModel, TimestampMixin, ValidationMixin

class Customer(BaseModel, TimestampMixin, ValidationMixin):
    """고객 모델"""
    
    required_fields = ['name', 'phone']
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.name = kwargs.get('name', '')
        self.phone = kwargs.get('phone', '')
        self.email = kwargs.get('email', '')
        self.region = kwargs.get('region', '')
        self.region2 = kwargs.get('region2', '')
        self.manager = kwargs.get('manager', '')
        self.note = kwargs.get('note', '')
        self.note2 = kwargs.get('note2', '')
        self.note3 = kwargs.get('note3', '')
        self.user_email = kwargs.get('user_email', '')
        
        super().__init__(**kwargs)
    
    def to_dict(self) -> Dict[str, Any]:
        """고객을 딕셔너리로 변환"""
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'region': self.region,
            'region2': self.region2,
            'manager': self.manager,
            'note': self.note,
            'note2': self.note2,
            'note3': self.note3,
            'user_email': self.user_email,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Customer':
        """딕셔너리에서 고객 생성"""
        return cls(**data)
    
    def validate(self) -> list:
        """고객 데이터 검증"""
        errors = super().validate()
        
        # 이름 검증
        if not self.name or not self.name.strip():
            errors.append("고객명은 필수입니다.")
        
        # 전화번호 검증
        if not self.phone or not self.phone.strip():
            errors.append("전화번호는 필수입니다.")
        elif len(self.phone.replace('-', '').replace(' ', '')) < 10:
            errors.append("전화번호 형식이 올바르지 않습니다.")
        
        # 이메일 검증 (선택사항이지만 입력된 경우)
        if self.email and '@' not in self.email:
            errors.append("이메일 형식이 올바르지 않습니다.")
        
        return errors
    
    def update_from_dict(self, data: Dict[str, Any]):
        """딕셔너리로부터 고객 정보 업데이트"""
        for key, value in data.items():
            if hasattr(self, key) and value is not None:
                setattr(self, key, value)
        
        # 지역명 정규화는 CustomerService에서 처리
        self.update_timestamp() 