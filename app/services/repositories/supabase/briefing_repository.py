# app/services/repositories/supabase/briefing_repository.py

import os
import time
from typing import List, Dict, Optional, Any
from datetime import datetime
from flask import current_app
from app.services.repositories.base import BriefingRepository
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

def _generate_briefing_id() -> str:
    """브리핑 ID 생성 (store.py와 동일한 로직: brf_{숫자:06d})"""
    # 간단한 타임스탬프 기반 ID 생성 (실제로는 시퀀스가 필요하지만, 타임스탬프로 대체)
    timestamp = int(time.time() * 1000)
    return f"brf_{timestamp:06d}"

def _map_briefing_to_response(briefing: Dict[str, Any]) -> Dict[str, Any]:
    """Supabase에서 조회된 브리핑 데이터를 프론트엔드 응답 형식에 맞게 매핑"""
    result = {
        'id': briefing.get('id'),
        'user': briefing.get('created_by'),  # 프론트엔드는 'user' 필드 사용
        'customer_id': briefing.get('customer_id'),
        'listing_ids': briefing.get('listing_ids', []),
        'overrides': briefing.get('overrides', {}),
        'tags': briefing.get('tags', {}),
        'status': briefing.get('status', 'normal'),
        'created_at': briefing.get('created_at'),
        'updated_at': briefing.get('updated_at')
    }
    
    # created_at이 ISO 형식이면 Unix timestamp로 변환 (기존 코드 호환성)
    if result.get('created_at'):
        try:
            if isinstance(result['created_at'], str):
                dt = datetime.fromisoformat(result['created_at'].replace('Z', '+00:00'))
                result['created_at'] = int(dt.timestamp())
        except:
            pass
    
    return result

class SupabaseBriefingRepository(BriefingRepository):
    """Supabase 기반 브리핑 저장소"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    def create_briefing(self, user_email: str, customer_id: str, listing_ids: List[str]) -> Dict[str, Any]:
        """브리핑 생성"""
        briefing_id = _generate_briefing_id()
        
        record = {
            'id': briefing_id,
            'customer_id': customer_id,
            'created_by': user_email,
            'listing_ids': listing_ids,
            'overrides': {},
            'tags': {},
            'status': 'normal',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Supabase에 삽입
        result = self.supabase.table('briefings').insert(record).execute()
        
        if result.data:
            return _map_briefing_to_response(result.data[0])
        return record
    
    def list_briefings(self, user_email: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        """브리핑 목록 조회"""
        query = self.supabase.table('briefings').select('*')
        
        # 관리자가 아니면 본인 브리핑만 조회
        if not is_admin:
            query = query.eq('created_by', user_email)
        
        # 최신순 정렬
        query = query.order('created_at', desc=True)
        
        result = query.execute()
        
        # 응답 형식으로 변환
        briefings = [_map_briefing_to_response(b) for b in result.data]
        
        return briefings
    
    def get_briefing(self, briefing_id: str) -> Optional[Dict[str, Any]]:
        """브리핑 조회"""
        result = self.supabase.table('briefings').select('*').eq('id', briefing_id).execute()
        
        if result.data:
            return _map_briefing_to_response(result.data[0])
        return None
    
    def set_listing_override(self, briefing_id: str, listing_id: str, field: str, value: str) -> Optional[Dict[str, Any]]:
        """매물 오버라이드 설정"""
        # 먼저 현재 브리핑 조회
        briefing = self.get_briefing(briefing_id)
        if not briefing:
            return None
        
        # overrides 업데이트
        overrides = briefing.get('overrides', {})
        if listing_id not in overrides:
            overrides[listing_id] = {}
        overrides[listing_id][field] = value
        
        # Supabase 업데이트
        result = self.supabase.table('briefings').update({
            'overrides': overrides,
            'updated_at': datetime.now().isoformat()
        }).eq('id', briefing_id).execute()
        
        if result.data:
            return _map_briefing_to_response(result.data[0])
        return None
    
    def clear_listing_override(self, briefing_id: str, listing_id: str, field: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """매물 오버라이드 해제"""
        # 먼저 현재 브리핑 조회
        briefing = self.get_briefing(briefing_id)
        if not briefing:
            return None
        
        # overrides 업데이트
        overrides = briefing.get('overrides', {})
        if field:
            # 특정 필드만 제거
            if listing_id in overrides and field in overrides[listing_id]:
                del overrides[listing_id][field]
                # 필드가 비어있으면 listing_id도 제거
                if not overrides[listing_id]:
                    del overrides[listing_id]
        else:
            # 전체 오버라이드 제거
            if listing_id in overrides:
                del overrides[listing_id]
        
        # Supabase 업데이트
        result = self.supabase.table('briefings').update({
            'overrides': overrides,
            'updated_at': datetime.now().isoformat()
        }).eq('id', briefing_id).execute()
        
        if result.data:
            return _map_briefing_to_response(result.data[0])
        return None
    
    def set_listing_tag(self, briefing_id: str, listing_id: str, tag: str) -> Optional[Dict[str, Any]]:
        """매물 태그 설정"""
        # 먼저 현재 브리핑 조회
        briefing = self.get_briefing(briefing_id)
        if not briefing:
            return None
        
        # tags 업데이트
        tags = briefing.get('tags', {})
        tags[listing_id] = tag
        
        # Supabase 업데이트
        result = self.supabase.table('briefings').update({
            'tags': tags,
            'updated_at': datetime.now().isoformat()
        }).eq('id', briefing_id).execute()
        
        if result.data:
            return _map_briefing_to_response(result.data[0])
        return None
    
    def clear_listing_tag(self, briefing_id: str, listing_id: str) -> Optional[Dict[str, Any]]:
        """매물 태그 해제"""
        # 먼저 현재 브리핑 조회
        briefing = self.get_briefing(briefing_id)
        if not briefing:
            return None
        
        # tags 업데이트
        tags = briefing.get('tags', {})
        if listing_id in tags:
            del tags[listing_id]
        
        # Supabase 업데이트
        result = self.supabase.table('briefings').update({
            'tags': tags,
            'updated_at': datetime.now().isoformat()
        }).eq('id', briefing_id).execute()
        
        if result.data:
            return _map_briefing_to_response(result.data[0])
        return None
