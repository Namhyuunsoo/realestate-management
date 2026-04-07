# app/services/repositories/supabase/customer_repository.py

import os
from typing import List, Dict, Optional, Any
from datetime import datetime
from flask import current_app
from app.models.user import User
from app.services.repositories.base import CustomerRepository
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

def _generate_customer_id(name: str, phone: str) -> str:
    """고객명과 전화번호로 고객 ID 생성 (store.py와 동일한 로직)"""
    clean_name = name.strip().replace(" ", "_")
    clean_phone = phone.strip().replace("-", "").replace(" ", "")
    return f"{clean_name}_{clean_phone}"

def normalize_region(region: str) -> str:
    """지역명 정규화 함수 (store.py와 동일한 로직)"""
    if not region:
        return region
    
    region = region.strip()
    
    if "구 전체" in region or "구 전부" in region:
        return region.split("구")[0] + "구"
    
    if "구전체" in region or "구전부" in region:
        return region.split("구전체")[0] + "구"
    
    if "시 전체" in region or "시 전부" in region:
        return region.split("시")[0] + "시"
    
    if "시전체" in region or "시전부" in region:
        return region.split("시전체")[0] + "시"
    
    return region

def _map_customer_fields(payload: Dict[str, Any], user_email: str) -> Dict[str, Any]:
    """프론트엔드 필드명을 Supabase 테이블 필드명으로 매핑"""
    # regions 필드 정규화
    regions = payload.get("regions", "")
    normalized_region = normalize_region(regions)
    
    # region과 region2 분리 (예: "부평구, 계양구" -> region="부평구", region2="계양구")
    region_parts = [r.strip() for r in normalized_region.split(",") if r.strip()]
    region = region_parts[0] if len(region_parts) > 0 else ""
    region2 = region_parts[1] if len(region_parts) > 1 else ""
    
    # filter_data 처리 (JSONB 형식)
    filter_data = payload.get("filter_data", {})
    if isinstance(filter_data, str):
        try:
            import json
            filter_data = json.loads(filter_data)
        except:
            filter_data = {}
    elif not isinstance(filter_data, dict):
        filter_data = {}
    
    # Supabase 테이블 구조에 맞게 매핑 (모든 필드 포함)
    record = {
        'id': _generate_customer_id(payload.get("name", ""), payload.get("phone", "")),
        'created_by': user_email,
        'name': payload.get("name", ""),
        'phone': payload.get("phone", ""),
        'email': payload.get("email", ""),
        'region': region,
        'region2': region2,
        'manager': payload.get("manager", ""),
        'note': payload.get("notes", "") or payload.get("note", ""),  # 프론트엔드의 notes -> note
        'note2': payload.get("note2", ""),
        'note3': payload.get("note3", ""),
        'status': payload.get("status", ""),
        # 새로 추가된 필드들 (프론트엔드 _pref 필드 우선 매핑)
        'floor': payload.get("floor_pref") if payload.get("floor_pref") is not None else payload.get("floor", ""),
        'area': payload.get("area_pref") if payload.get("area_pref") is not None else (payload.get("area") or payload.get("size_pref", "")),
        'deposit': payload.get("deposit_pref") if payload.get("deposit_pref") is not None else (payload.get("deposit") or payload.get("budget", "")),
        'rent': payload.get("rent_pref") if payload.get("rent_pref") is not None else payload.get("rent", ""),
        'premium': payload.get("premium_pref") if payload.get("premium_pref") is not None else payload.get("premium", ""),
        'filter_data': filter_data,
    }
    
    # created_at이 있으면 사용, 없으면 현재 시간
    if payload.get("created_at"):
        try:
            # 문자열 형식의 날짜를 ISO 형식으로 변환
            record['created_at'] = payload.get("created_at")
        except:
            record['created_at'] = datetime.now().isoformat()
    
    return record

def _map_customer_to_response(customer: Dict[str, Any]) -> Dict[str, Any]:
    """Supabase 데이터를 프론트엔드 형식으로 변환"""
    result = {
        'id': customer.get('id'),
        'name': customer.get('name'),
        'phone': customer.get('phone'),
        'email': customer.get('email', ''),
        'manager': customer.get('manager', ''),
        'notes': customer.get('note', ''),  # note -> notes
        'note2': customer.get('note2', ''),
        'note3': customer.get('note3', ''),
        'status': customer.get('status', ''),
        'created_by': customer.get('created_by'),
        'created_at': customer.get('created_at'),
        # 새로 추가된 필드들
        'floor': customer.get('floor', ''),
        'area': customer.get('area', ''),
        'deposit': customer.get('deposit', ''),
        'rent': customer.get('rent', ''),
        'premium': customer.get('premium', ''),
        'filter_data': customer.get('filter_data', {}),
    }
    
    # region과 region2를 regions로 합치기
    region = customer.get('region', '')
    region2 = customer.get('region2', '')
    if region2:
        result['regions'] = f"{region}, {region2}"
    else:
        result['regions'] = region
    
    return result

class SupabaseCustomerRepository(CustomerRepository):
    """Supabase 기반 고객 저장소"""

    def __init__(self, supabase_client: Client):
        import logging
        logger = logging.getLogger(__name__)

        self.supabase = supabase_client

        # 연결 테스트: customers 테이블 존재 확인
        try:
            self.supabase.table('customers').select('id').limit(1).execute()
            logger.info("✅ Supabase customers 테이블 연결 성공")
        except Exception as e:
            logger.error(f"❌ Supabase customers 테이블 접근 실패: {e}", exc_info=True)
            raise ValueError(f"Supabase customers 테이블에 접근할 수 없습니다: {e}")
    
    def create_customer(self, user_email: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """고객 생성"""
        import logging
        logger = logging.getLogger(__name__)

        try:
            record = _map_customer_fields(payload, user_email)

            # Supabase에 삽입 (upsert 사용)
            result = self.supabase.table('customers').upsert(record, on_conflict='id').execute()

            if result.data:
                logger.info(f"✅ 고객 생성 성공: {record['id']}")
                return _map_customer_to_response(result.data[0])
            return record
        except Exception as e:
            logger.error(f"❌ Supabase 고객 생성 중 오류: {e}", exc_info=True)
            raise
    
    def list_customers(self, user: User, filter_type: str = 'own', manager: str = '') -> List[Dict[str, Any]]:
        """고객 목록 조회"""
        import logging
        logger = logging.getLogger(__name__)

        try:
            query = self.supabase.table('customers').select('*')

            # 디버깅 로그
            logger.info(f"🔍 list_customers 호출: user={user.email}, role={user.role}, filter_type={filter_type}, manager={manager}")
            logger.info(f"🔍 user.is_user()={user.is_user()}, user.is_manager()={user.is_manager()}, user.is_admin()={user.is_admin()}")

            # 역할별 필터링
            if user.is_user():
                # 일반 사용자는 본인 담당 고객만 조회
                manager_name = getattr(user, 'manager_name', '')
                logger.info(f"🔍 일반 사용자: manager_name={manager_name}")
                if manager_name:
                    query = query.eq('manager', manager_name)
                else:
                    # 담당자명이 없으면 빈 결과 반환
                    logger.warning(f"⚠️ 담당자명이 없어 빈 결과 반환")
                    return []
            elif user.is_manager() or user.is_admin():
                # 매니저와 어드민은 필터 타입에 따라 조회
                logger.info(f"🔍 매니저/어드민: filter_type={filter_type}, manager={manager}")
                if filter_type == 'own':
                    # 'own' 필터인 경우 본인 담당 고객만 조회
                    manager_name = getattr(user, 'manager_name', '')
                    if manager_name:
                        query = query.eq('manager', manager_name)
                        logger.info(f"🔍 'own' 필터 적용: manager_name={manager_name}")
                    else:
                        logger.warning(f"⚠️ 'own' 필터인데 담당자명이 없어 빈 결과 반환")
                        return []
                elif filter_type == 'manager' and manager:
                    # 특정 담당자의 고객만 조회
                    query = query.eq('manager', manager)
                    logger.info(f"🔍 'manager' 필터 적용: manager={manager}")
                # 'all' 필터인 경우 필터링 없이 모든 고객 조회 (아무 필터도 적용하지 않음)
                elif filter_type == 'all':
                    logger.info(f"🔍 'all' 필터: 모든 고객 조회 (필터링 없음)")
                else:
                    # 기본값: 모든 고객 조회
                    logger.info(f"🔍 필터 타입 없음: 모든 고객 조회 (기본값)")
            else:
                # 역할이 명확하지 않은 경우 빈 결과 반환
                logger.warning(f"⚠️ 역할이 명확하지 않아 빈 결과 반환")
                return []

            # 최신순 정렬 (문법 수정: desc=True는 지원되지 않음)
            query = query.order('created_at', desc=True)

            logger.info(f"🔍 Supabase 쿼리 실행 전")
            result = query.execute()
            logger.info(f"🔍 Supabase 쿼리 결과: {len(result.data)}개 고객")

            # 응답 형식으로 변환
            customers = [_map_customer_to_response(c) for c in result.data]
            logger.info(f"🔍 변환된 고객 목록: {len(customers)}개")

            return customers

        except Exception as e:
            logger.error(f"❌ Supabase 고객 조회 중 오류: {e}", exc_info=True)
            # 빈 리스트 반환
            return []
    
    def get_customer(self, customer_id: str, user_email: str) -> Optional[Dict[str, Any]]:
        """고객 조회"""
        import logging
        logger = logging.getLogger(__name__)

        try:
            result = self.supabase.table('customers').select('*').eq('id', customer_id).execute()

            if result.data and len(result.data) > 0:
                logger.info(f"✅ 고객 조회 성공: {customer_id}")
                return _map_customer_to_response(result.data[0])
            logger.warning(f"⚠️ 고객을 찾을 수 없음: {customer_id}")
            return None
        except Exception as e:
            logger.error(f"❌ Supabase 고객 조회 중 오류: {e}", exc_info=True)
            raise
    
    def update_customer(self, customer_id: str, updates: Dict[str, Any], user_email: str) -> Optional[Dict[str, Any]]:
        """고객 수정"""
        import logging
        logger = logging.getLogger(__name__)

        try:
            # updates를 Supabase 형식으로 변환
            update_data = {}

            # 필드 매핑
            if 'name' in updates:
                update_data['name'] = updates['name']
            if 'phone' in updates:
                update_data['phone'] = updates['phone']
            if 'email' in updates:
                update_data['email'] = updates['email']
            if 'manager' in updates:
                update_data['manager'] = updates['manager']
            if 'notes' in updates:
                update_data['note'] = updates['notes']  # notes -> note
            if 'note2' in updates:
                update_data['note2'] = updates['note2']
            if 'note3' in updates:
                update_data['note3'] = updates['note3']
            if 'status' in updates:
                update_data['status'] = updates['status']
            if 'regions' in updates:
                # regions를 region, region2로 분리
                normalized_region = normalize_region(updates['regions'])
                region_parts = [r.strip() for r in normalized_region.split(",") if r.strip()]
                update_data['region'] = region_parts[0] if len(region_parts) > 0 else ""
                update_data['region2'] = region_parts[1] if len(region_parts) > 1 else ""

            # 새로 추가된 필드들 (접미사 _pref도 허용)
            # v is not None 체크를 통해 명시적으로 전달된 값(빈 문자열 포함)을 수용함
            if 'floor' in updates or 'floor_pref' in updates:
                update_data['floor'] = updates.get('floor_pref') if 'floor_pref' in updates else updates.get('floor')
            if 'area' in updates or 'area_pref' in updates:
                update_data['area'] = updates.get('area_pref') if 'area_pref' in updates else updates.get('area')
            if 'deposit' in updates or 'deposit_pref' in updates:
                update_data['deposit'] = updates.get('deposit_pref') if 'deposit_pref' in updates else updates.get('deposit')
            if 'rent' in updates or 'rent_pref' in updates:
                update_data['rent'] = updates.get('rent_pref') if 'rent_pref' in updates else updates.get('rent')
            if 'premium' in updates or 'premium_pref' in updates:
                update_data['premium'] = updates.get('premium_pref') if 'premium_pref' in updates else updates.get('premium')
            
            if 'filter_data' in updates:
                filter_data = updates['filter_data']
                if isinstance(filter_data, str):
                    try:
                        import json
                        filter_data = json.loads(filter_data)
                    except:
                        filter_data = {}
                elif not isinstance(filter_data, dict):
                    filter_data = {}
                update_data['filter_data'] = filter_data

            # 빈 값(empty string)이나 0 등 유효한 값은 포함시키고, None이나 'undefined' 문자열만 필터링
            update_data = {k: v for k, v in update_data.items() if v is not None and v != 'undefined'}

            if not update_data:
                # 업데이트할 데이터가 없으면 조회만
                logger.info(f"⚠️ 업데이트할 데이터가 없음: {customer_id}")
                return self.get_customer(customer_id, user_email)

            # Supabase 업데이트
            result = self.supabase.table('customers').update(update_data).eq('id', customer_id).execute()

            if result.data and len(result.data) > 0:
                logger.info(f"✅ 고객 업데이트 성공: {customer_id}")
                return _map_customer_to_response(result.data[0])
            logger.warning(f"⚠️ 고객을 찾을 수 없음: {customer_id}")
            return None
        except Exception as e:
            logger.error(f"❌ Supabase 고객 업데이트 중 오류: {e}", exc_info=True)
            raise
    
    def delete_customer(self, customer_id: str, user_email: str) -> bool:
        """고객 삭제"""
        import logging
        logger = logging.getLogger(__name__)

        try:
            result = self.supabase.table('customers').delete().eq('id', customer_id).execute()

            # 삭제 성공 여부 확인
            logger.info(f"✅ 고객 삭제 성공: {customer_id}")
            return True  # Supabase는 삭제 성공 시 빈 배열 반환
        except Exception as e:
            logger.error(f"❌ Supabase 고객 삭제 중 오류: {e}", exc_info=True)
            raise

    def get_managers(self, user: User) -> List[str]:
        """담당자 목록 조회 (Supabase 실시간 데이터 반영)"""
        import logging
        logger = logging.getLogger(__name__)

        try:
            # 모든 고객에서 unique한 manager 값을 가져옴
            # Supabase Python 클라이언트는 SELECT DISTINCT를 직접 지원하지 않으므로 전체를 가져와서 처리하거나 
            # 혹은 count와 함께 사용하여 rpc 등을 쓸 수 있지만, 여기서는 고객 데이터가 아주 많지 않다고 가정하고 처리
            result = self.supabase.table('customers').select('manager').execute()
            
            if not result.data:
                return []
            
            # 중복 제거 및 정합성 검증
            managers = sorted(list(set([
                str(item['manager']).strip() 
                for item in result.data 
                if item.get('manager') and str(item['manager']).strip()
            ])))
            
            return managers
        except Exception as e:
            logger.error(f"❌ Supabase 담당자 조회 중 오류: {e}", exc_info=True)
            return []
