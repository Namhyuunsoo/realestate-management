# app/models/proposal_schema.py
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import uuid

@dataclass
class ProposalImage:
    """기획안에 포함된 이미지 정보"""
    id: str
    url: str
    filename: str
    description: Optional[str] = None
    order: int = 0

@dataclass
class Proposal:
    """기획안 정보"""
    id: str
    title: str
    content: str
    images: List[ProposalImage]
    tags: List[str]
    customer_id: Optional[str] = None
    listing_ids: List[str] = None
    created_by: str
    created_at: int
    updated_at: int
    is_public: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        data = asdict(self)
        data['images'] = [img.to_dict() if hasattr(img, 'to_dict') else asdict(img) for img in self.images]
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Proposal':
        """딕셔너리에서 생성"""
        images = [ProposalImage(**img) if isinstance(img, dict) else img for img in data.get('images', [])]
        return cls(
            id=data['id'],
            title=data['title'],
            content=data['content'],
            images=images,
            tags=data.get('tags', []),
            customer_id=data.get('customer_id'),
            listing_ids=data.get('listing_ids', []),
            created_by=data['created_by'],
            created_at=data['created_at'],
            updated_at=data['updated_at'],
            is_public=data.get('is_public', False)
        )

def create_proposal_id() -> str:
    """기획안 ID 생성"""
    return "prop_" + uuid.uuid4().hex[:12]

def validate_proposal(data: Dict[str, Any]) -> List[str]:
    """기획안 데이터 검증"""
    errors = []
    
    if not data.get('title', '').strip():
        errors.append("제목은 필수입니다")
    
    if not data.get('content', '').strip():
        errors.append("내용은 필수입니다")
    
    if len(data.get('title', '')) > 200:
        errors.append("제목은 200자 이하여야 합니다")
    
    if len(data.get('content', '')) > 10000:
        errors.append("내용은 10000자 이하여야 합니다")
    
    return errors 