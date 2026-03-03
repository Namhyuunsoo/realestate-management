# app/services/repositories/base.py

from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from app.models.user import User

class CustomerRepository(ABC):
    """고객 데이터 저장소 추상 인터페이스"""
    
    @abstractmethod
    def create_customer(self, user_email: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """고객 생성"""
        pass
    
    @abstractmethod
    def list_customers(self, user: User, filter_type: str = 'own', manager: str = '') -> List[Dict[str, Any]]:
        """고객 목록 조회"""
        pass
    
    @abstractmethod
    def get_customer(self, customer_id: str, user_email: str) -> Optional[Dict[str, Any]]:
        """고객 조회"""
        pass
    
    @abstractmethod
    def update_customer(self, customer_id: str, updates: Dict[str, Any], user_email: str) -> Optional[Dict[str, Any]]:
        """고객 수정"""
        pass
    
    @abstractmethod
    def delete_customer(self, customer_id: str, user_email: str) -> bool:
        """고객 삭제"""
        pass

class BriefingRepository(ABC):
    """브리핑 데이터 저장소 추상 인터페이스"""
    
    @abstractmethod
    def create_briefing(self, user_email: str, customer_id: str, listing_ids: List[str]) -> Dict[str, Any]:
        """브리핑 생성"""
        pass
    
    @abstractmethod
    def list_briefings(self, user_email: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        """브리핑 목록 조회"""
        pass
    
    @abstractmethod
    def get_briefing(self, briefing_id: str) -> Optional[Dict[str, Any]]:
        """브리핑 조회"""
        pass
    
    @abstractmethod
    def set_listing_override(self, briefing_id: str, listing_id: str, field: str, value: str) -> Optional[Dict[str, Any]]:
        """매물 오버라이드 설정"""
        pass
    
    @abstractmethod
    def clear_listing_override(self, briefing_id: str, listing_id: str, field: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """매물 오버라이드 해제"""
        pass
    
    @abstractmethod
    def set_listing_tag(self, briefing_id: str, listing_id: str, tag: str) -> Optional[Dict[str, Any]]:
        """매물 태그 설정"""
        pass
    
    @abstractmethod
    def clear_listing_tag(self, briefing_id: str, listing_id: str) -> Optional[Dict[str, Any]]:
        """매물 태그 해제"""
        pass

class RecommendationRepository(ABC):
    """추천매물 데이터 저장소 추상 인터페이스"""
    
    @abstractmethod
    def add_recommendation(self, listing_id: str, user_email: str, reason: str) -> bool:
        """매물 추천 추가"""
        pass
    
    @abstractmethod
    def remove_recommendation(self, listing_id: str, user_email: str) -> bool:
        """매물 추천 제거"""
        pass
    
    @abstractmethod
    def add_comment(self, listing_id: str, user_email: str, comment: str) -> bool:
        """매물에 의견 추가"""
        pass
    
    @abstractmethod
    def is_recommended(self, listing_id: str, user_email: str) -> bool:
        """특정 사용자가 특정 매물을 추천했는지 확인"""
        pass
    
    @abstractmethod
    def get_recommendation_data(self, listing_id: str) -> Optional[Dict[str, Any]]:
        """매물의 추천 데이터 조회"""
        pass
    
    @abstractmethod
    def get_user_recommendations(self, user_email: str) -> List[str]:
        """사용자가 추천한 매물 목록"""
        pass
    
    @abstractmethod
    def get_all_recommendations(self) -> Dict[str, Dict[str, Any]]:
        """모든 추천매물 조회"""
        pass
