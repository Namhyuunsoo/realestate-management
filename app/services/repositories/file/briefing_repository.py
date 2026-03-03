# app/services/repositories/file/briefing_repository.py

from typing import List, Dict, Optional, Any
from app.services.repositories.base import BriefingRepository
from app.services import store

class FileBriefingRepository(BriefingRepository):
    """파일 기반 브리핑 저장소 (기존 store.py 래핑)"""
    
    def create_briefing(self, user_email: str, customer_id: str, listing_ids: List[str]) -> Dict[str, Any]:
        """브리핑 생성"""
        return store.create_briefing(user_email, customer_id, listing_ids)
    
    def list_briefings(self, user_email: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        """브리핑 목록 조회"""
        return store.list_briefings(user_email, is_admin)
    
    def get_briefing(self, briefing_id: str) -> Optional[Dict[str, Any]]:
        """브리핑 조회"""
        return store.get_briefing(briefing_id)
    
    def set_listing_override(self, briefing_id: str, listing_id: str, field: str, value: str) -> Optional[Dict[str, Any]]:
        """매물 오버라이드 설정"""
        return store.set_listing_override(briefing_id, listing_id, field, value)
    
    def clear_listing_override(self, briefing_id: str, listing_id: str, field: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """매물 오버라이드 해제"""
        return store.clear_listing_override(briefing_id, listing_id, field)
    
    def set_listing_tag(self, briefing_id: str, listing_id: str, tag: str) -> Optional[Dict[str, Any]]:
        """매물 태그 설정"""
        return store.set_listing_tag(briefing_id, listing_id, tag)
    
    def clear_listing_tag(self, briefing_id: str, listing_id: str) -> Optional[Dict[str, Any]]:
        """매물 태그 해제"""
        return store.clear_listing_tag(briefing_id, listing_id)
