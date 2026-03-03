# app/services/briefing_service.py

from typing import List, Dict, Any, Optional
from flask import current_app
from ..models.briefing import Briefing
from .repositories import get_briefing_repository

class BriefingService:
    """브리핑 관련 비즈니스 로직 서비스"""
    
    def __init__(self, data_manager):
        self.data_manager = data_manager
        self.repository = get_briefing_repository()
    
    def create_briefing(self, user_email: str, customer_id: str, listing_ids: List[str]) -> Dict[str, Any]:
        """브리핑 생성"""
        print(f"🔍 create_briefing 호출: user={user_email}, customer_id={customer_id}, listings={len(listing_ids)}")
        
        try:
            # Briefing 모델 생성 및 검증
            briefing = Briefing(
                user=user_email,
                customer_id=customer_id,
                listing_ids=listing_ids
            )
            
            # 검증
            errors = briefing.validate()
            if errors:
                print(f"❌ 브리핑 데이터 검증 실패: {errors}")
                raise ValueError(f"브리핑 데이터 검증 실패: {', '.join(errors)}")
            
            # Repository를 통해 저장
            result = self.repository.create_briefing(user_email, customer_id, listing_ids)
            
            print(f"✅ 브리핑 생성 완료: {result['id']}")
            return result
            
        except Exception as e:
            print(f"❌ 브리핑 생성 중 오류: {e}")
            raise
    
    def get_briefing(self, briefing_id: str) -> Optional[Dict[str, Any]]:
        """브리핑 조회"""
        print(f"🔍 get_briefing 호출: bid={briefing_id}")
        
        try:
            result = self.repository.get_briefing(briefing_id)
            if result:
                print(f"✅ 브리핑 조회 완료: {briefing_id}")
            else:
                print(f"❌ 브리핑을 찾을 수 없음: {briefing_id}")
            return result
            
        except Exception as e:
            print(f"❌ 브리핑 조회 중 오류: {e}")
            return None
    
    def list_briefings(self, user_email: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        """브리핑 목록 조회"""
        print(f"🔍 list_briefings 호출: user={user_email}, is_admin={is_admin}")
        
        try:
            result = self.repository.list_briefings(user_email, is_admin)
            print(f"✅ 브리핑 목록 조회 완료: {len(result)}개")
            return result
            
        except Exception as e:
            print(f"❌ 브리핑 목록 조회 중 오류: {e}")
            return []
    
    def set_listing_override(self, briefing_id: str, listing_id: str, field: str, value: str):
        """매물 오버라이드 설정"""
        print(f"🔍 set_listing_override 호출: bid={briefing_id}, lid={listing_id}, field={field}, value={value}")
        
        try:
            result = self.repository.set_listing_override(briefing_id, listing_id, field, value)
            if result:
                print(f"✅ 매물 오버라이드 설정 완료")
            else:
                raise ValueError(f"브리핑을 찾을 수 없음: {briefing_id}")
            
        except Exception as e:
            print(f"❌ 매물 오버라이드 설정 중 오류: {e}")
            raise
    
    def clear_listing_override(self, briefing_id: str, listing_id: str, field: str = None):
        """매물 오버라이드 해제"""
        print(f"🔍 clear_listing_override 호출: bid={briefing_id}, lid={listing_id}, field={field}")
        
        try:
            result = self.repository.clear_listing_override(briefing_id, listing_id, field)
            if result:
                print(f"✅ 매물 오버라이드 해제 완료")
            else:
                raise ValueError(f"브리핑을 찾을 수 없음: {briefing_id}")
            
        except Exception as e:
            print(f"❌ 매물 오버라이드 해제 중 오류: {e}")
            raise
    
    def set_listing_tag(self, briefing_id: str, listing_id: str, tag: str):
        """매물 태그 설정"""
        print(f"🔍 set_listing_tag 호출: bid={briefing_id}, lid={listing_id}, tag={tag}")
        
        try:
            result = self.repository.set_listing_tag(briefing_id, listing_id, tag)
            if result:
                print(f"✅ 매물 태그 설정 완료")
            else:
                raise ValueError(f"브리핑을 찾을 수 없음: {briefing_id}")
            
        except Exception as e:
            print(f"❌ 매물 태그 설정 중 오류: {e}")
            raise
    
    def clear_listing_tag(self, briefing_id: str, listing_id: str):
        """매물 태그 해제"""
        print(f"🔍 clear_listing_tag 호출: bid={briefing_id}, lid={listing_id}")
        
        try:
            result = self.repository.clear_listing_tag(briefing_id, listing_id)
            if result:
                print(f"✅ 매물 태그 해제 완료")
            else:
                raise ValueError(f"브리핑을 찾을 수 없음: {briefing_id}")
            
        except Exception as e:
            print(f"❌ 매물 태그 해제 중 오류: {e}")
            raise
    
    def get_briefing_with_listings(self, briefing_id: str, user) -> Optional[Dict[str, Any]]:
        """브리핑과 매물 정보를 함께 조회"""
        user_email = user.email if hasattr(user, 'email') else str(user)
        print(f"🔍 get_briefing_with_listings 호출: bid={briefing_id}, user={user_email}")
        
        try:
            # 브리핑 조회
            briefing = self.get_briefing(briefing_id)
            if not briefing:
                return None
            
            # 권한 확인
            if briefing["user"] != user_email and not self.data_manager.is_admin(user_email):
                print(f"❌ 권한 없음: {user_email}")
                return None
            
            # 매물 정보 로드
            from .listings_loader import load_listings
            all_listings = {lst["id"]: lst for lst in load_listings()}
            
            # 브리핑의 매물들만 필터링
            items = []
            for listing_id in briefing["listing_ids"]:
                base_listing = all_listings.get(listing_id)
                if not base_listing:
                    continue
                
                items.append({
                    "id": listing_id,
                    "base": base_listing,
                    "override": briefing["overrides"].get(listing_id, {}),
                    "tag": briefing["tags"].get(listing_id)
                })
            
            result = {
                "id": briefing["id"],
                "customer_id": briefing["customer_id"],
                "listing_count": len(items),
                "listings": items,
                "overrides": briefing["overrides"],
                "tags": briefing["tags"]
            }
            
            print(f"✅ 브리핑과 매물 정보 조회 완료: {len(items)}개 매물")
            return result
            
        except Exception as e:
            print(f"❌ 브리핑과 매물 정보 조회 중 오류: {e}")
            return None
    
    def validate_briefing_access(self, briefing_id: str, user_email: str) -> bool:
        """브리핑 접근 권한 확인"""
        briefing = self.get_briefing(briefing_id)
        if not briefing:
            return False
        
        # 본인 브리핑이거나 관리자인 경우
        return briefing["user"] == user_email or self.data_manager.is_admin(user_email) 