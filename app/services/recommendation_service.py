import os
from typing import Dict, List, Set, Optional
from datetime import datetime
from .repositories import get_recommendation_repository

class RecommendationService:
    """추천매물 관리 서비스"""

    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        self.repository = get_recommendation_repository(data_dir)

    def add_recommendation(self, listing_id: str, user_email: str, reason: str) -> bool:
        """매물 추천 추가"""
        result = self.repository.add_recommendation(listing_id, user_email, reason)
        if result:
            print(f"✅ 매물 추천 추가: {listing_id} by {user_email}")
        return result

    def remove_recommendation(self, listing_id: str, user_email: str) -> bool:
        """매물 추천 제거"""
        result = self.repository.remove_recommendation(listing_id, user_email)
        if result:
            print(f"✅ 매물 추천 제거: {listing_id} by {user_email}")
        return result

    def add_comment(self, listing_id: str, user_email: str, comment: str) -> bool:
        """매물에 의견 추가"""
        result = self.repository.add_comment(listing_id, user_email, comment)
        if result:
            print(f"✅ 매물 의견 추가: {listing_id} by {user_email}")
        return result

    def is_recommended(self, listing_id: str, user_email: str) -> bool:
        """특정 사용자가 특정 매물을 추천했는지 확인"""
        return self.repository.is_recommended(listing_id, user_email)

    def get_recommendation_data(self, listing_id: str) -> Optional[Dict]:
        """매물의 추천 데이터 조회"""
        return self.repository.get_recommendation_data(listing_id)

    def get_user_recommendations(self, user_email: str) -> List[str]:
        """사용자가 추천한 매물 목록"""
        return self.repository.get_user_recommendations(user_email)

    def get_all_recommendations(self) -> Dict[str, Dict]:
        """모든 추천매물 조회 (API 응답용)"""
        return self.repository.get_all_recommendations()
