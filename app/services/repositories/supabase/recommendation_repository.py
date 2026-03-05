# app/services/repositories/supabase/recommendation_repository.py

import os
from typing import Dict, List, Optional, Any
from datetime import datetime
from flask import current_app, has_app_context
from app.services.repositories.base import RecommendationRepository
from dotenv import load_dotenv
from supabase import create_client, Client

# 환경변수 로드
load_dotenv()

def get_supabase_client() -> Client:
    """Supabase 클라이언트 생성"""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.")
    
    return create_client(supabase_url, supabase_key)

def _map_recommendation_to_response(recommendation: Dict[str, Any]) -> Dict[str, Any]:
    """Supabase에서 조회된 추천매물 데이터를 프론트엔드 응답 형식에 맞게 매핑"""
    return {
        'recommended_by': recommendation.get('recommended_by', {}),
        'comments': recommendation.get('comments', {})
    }

class SupabaseRecommendationRepository(RecommendationRepository):
    """Supabase 기반 추천매물 저장소"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def add_recommendation(self, listing_id: str, user_email: str, reason: str) -> bool:
        """매물 추천 추가"""
        try:
            # 먼저 현재 추천 데이터 조회
            result = self.supabase.table('recommendations').select('*').eq('listing_id', listing_id).execute()
            
            if result.data:
                # 기존 레코드 업데이트
                recommendation = result.data[0]
                recommended_by = recommendation.get('recommended_by', {})
                recommended_by[user_email] = {
                    'reason': reason,
                    'recommended_at': datetime.now().isoformat()
                }
                
                self.supabase.table('recommendations').update({
                    'recommended_by': recommended_by,
                    'updated_at': datetime.now().isoformat()
                }).eq('listing_id', listing_id).execute()
            else:
                # 새 레코드 생성
                record = {
                    'listing_id': listing_id,
                    'recommended_by': {
                        user_email: {
                            'reason': reason,
                            'recommended_at': datetime.now().isoformat()
                        }
                    },
                    'comments': {},
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                self.supabase.table('recommendations').insert(record).execute()
            
            return True
        except Exception as e:
            if has_app_context() and current_app:
                current_app.logger.error(f"추천 추가 실패: {str(e)}")
            return False
    
    def remove_recommendation(self, listing_id: str, user_email: str) -> bool:
        """매물 추천 제거"""
        try:
            # 현재 추천 데이터 조회
            result = self.supabase.table('recommendations').select('*').eq('listing_id', listing_id).execute()
            
            if not result.data:
                return False
            
            recommendation = result.data[0]
            recommended_by = recommendation.get('recommended_by', {})
            
            if user_email not in recommended_by:
                return False
            
            # 추천 제거
            del recommended_by[user_email]
            
            # 추천과 의견이 모두 없으면 레코드 삭제
            comments = recommendation.get('comments', {})
            if not recommended_by and not comments:
                self.supabase.table('recommendations').delete().eq('listing_id', listing_id).execute()
            else:
                # 업데이트
                self.supabase.table('recommendations').update({
                    'recommended_by': recommended_by,
                    'updated_at': datetime.now().isoformat()
                }).eq('listing_id', listing_id).execute()
            
            return True
        except Exception as e:
            if has_app_context() and current_app:
                current_app.logger.error(f"추천 제거 실패: {str(e)}")
            return False
    
    def add_comment(self, listing_id: str, user_email: str, comment: str) -> bool:
        """매물에 의견 추가"""
        try:
            # 먼저 현재 추천 데이터 조회
            result = self.supabase.table('recommendations').select('*').eq('listing_id', listing_id).execute()
            
            if result.data:
                # 기존 레코드 업데이트
                recommendation = result.data[0]
                comments = recommendation.get('comments', {})
                comments[user_email] = {
                    'comment': comment,
                    'commented_at': datetime.now().isoformat()
                }
                
                self.supabase.table('recommendations').update({
                    'comments': comments,
                    'updated_at': datetime.now().isoformat()
                }).eq('listing_id', listing_id).execute()
            else:
                # 새 레코드 생성
                record = {
                    'listing_id': listing_id,
                    'recommended_by': {},
                    'comments': {
                        user_email: {
                            'comment': comment,
                            'commented_at': datetime.now().isoformat()
                        }
                    },
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                self.supabase.table('recommendations').insert(record).execute()
            
            return True
        except Exception as e:
            if has_app_context() and current_app:
                current_app.logger.error(f"의견 추가 실패: {str(e)}")
            return False
    
    def is_recommended(self, listing_id: str, user_email: str) -> bool:
        """특정 사용자가 특정 매물을 추천했는지 확인"""
        try:
            result = self.supabase.table('recommendations').select('recommended_by').eq('listing_id', listing_id).execute()
            
            if result.data:
                recommended_by = result.data[0].get('recommended_by', {})
                return user_email in recommended_by
            
            return False
        except Exception as e:
            if has_app_context() and current_app:
                current_app.logger.error(f"추천 확인 실패: {str(e)}")
            return False
    
    def get_recommendation_data(self, listing_id: str) -> Optional[Dict[str, Any]]:
        """매물의 추천 데이터 조회"""
        try:
            result = self.supabase.table('recommendations').select('*').eq('listing_id', listing_id).execute()
            
            if result.data:
                return _map_recommendation_to_response(result.data[0])
            
            return None
        except Exception as e:
            if has_app_context() and current_app:
                current_app.logger.error(f"추천 데이터 조회 실패: {str(e)}")
            return None
    
    def get_user_recommendations(self, user_email: str) -> List[str]:
        """사용자가 추천한 매물 목록"""
        try:
            # 모든 추천 데이터 조회
            result = self.supabase.table('recommendations').select('listing_id, recommended_by').execute()
            
            recommended_listings = []
            for rec in result.data:
                recommended_by = rec.get('recommended_by', {})
                if user_email in recommended_by:
                    recommended_listings.append(rec['listing_id'])
            
            return recommended_listings
        except Exception as e:
            if has_app_context() and current_app:
                current_app.logger.error(f"사용자 추천 목록 조회 실패: {str(e)}")
            return []
    
    def get_all_recommendations(self) -> Dict[str, Dict[str, Any]]:
        """모든 추천매물 조회"""
        try:
            result = self.supabase.table('recommendations').select('*').execute()
            
            recommendations = {}
            for rec in result.data:
                listing_id = rec['listing_id']
                recommendations[listing_id] = _map_recommendation_to_response(rec)
            
            return recommendations
        except Exception as e:
            if has_app_context() and current_app:
                current_app.logger.error(f"모든 추천 조회 실패: {str(e)}")
            return {}
