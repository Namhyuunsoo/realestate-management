import os
from typing import List, Optional, Dict, Any
from app.models.user import User
from app.services.repositories.base import UserRepository
from supabase import create_client, Client
from flask import current_app, has_app_context

class SupabaseUserRepository(UserRepository):
    """Supabase 기반 사용자 저장소 (하이브리드 인증 지원)"""
    
    def __init__(self, supabase_client: Client):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.")
            
        self.client: Client = supabase_client

    def get_user_by_email(self, email: str) -> Optional[User]:
        try:
            if hasattr(email, 'email'): email = email.email
            email = email.lower().strip()
            response = self.client.table('users').select('*').eq('email', email).execute()
            if response.data and len(response.data) > 0:
                return User.from_dict(response.data[0])
            return None
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase get_user_by_email 오류: {e}")
            return None

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        try:
            response = self.client.table('users').select('*').eq('id', user_id).execute()
            if response.data and len(response.data) > 0:
                return User.from_dict(response.data[0])
            return None
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase get_user_by_id 오류: {e}")
            return None

    def get_all_users(self, include_inactive: bool = False) -> List[User]:
        try:
            query = self.client.table('users').select('*')
            if not include_inactive:
                query = query.neq('status', 'inactive')
            response = query.order('created_at', desc=True).execute()
            return [User.from_dict(data) for data in response.data] if response.data else []
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase get_all_users 오류: {e}")
            return []

    def register_user(self, email: str, password: str, name: str) -> Optional[User]:
        try:
            if self.get_user_by_email(email):
                return None
                
            # 1. Supabase Auth에 사용자 생성 (admin API)
            auth_response = self.client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"name": name}
            })
            
            if not auth_response.user:
                return None
                
            auth_user_id = auth_response.user.id
            
            # 2. public.users 테이블에 추가 정보 생성
            user = User(
                id=auth_user_id,
                email=email.lower(),
                password_hash="",
                name=name,
                role="user",
                status="pending"
            )
            
            self.save_user(user)
            return user
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase register_user 오류: {e}")
            return None

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        try:
            # 1. Supabase Auth를 통한 로그인 검증 (session 오염 방지용 임시 클라이언트 생성. anon/role 통합)
            try:
                auth_client = create_client(self.supabase_url, os.getenv('SUPABASE_ANON_KEY', self.supabase_key))
                auth_res = auth_client.auth.sign_in_with_password({"email": email, "password": password})
                is_valid = bool(auth_res.user)
            except Exception:
                is_valid = False
            
            # 2. Db 조회 및 이력 갱신
            user = self.get_user_by_email(email)
            if not user or user.is_locked():
                return None
                
            if is_valid:
                user.record_login_attempt(True)
                self.save_user(user)
                return user if user.is_active() else None
            else:
                user.record_login_attempt(False)
                self.save_user(user)
                return None
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase authenticate_user 오류: {e}")
            return None

    def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                return False
                
            # 이전 비밀번호 검증
            try:
                auth_client = create_client(self.supabase_url, os.getenv('SUPABASE_ANON_KEY', self.supabase_key))
                auth_client.auth.sign_in_with_password({"email": user.email, "password": old_password})
            except Exception:
                return False
                
            # 새 비밀번호 적용
            self.client.auth.admin.update_user_by_id(user_id, {"password": new_password})
            return True
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase change_password 오류: {e}")
            return False

    def reset_password(self, user_id: str, new_password: str, reset_by: str) -> bool:
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                return False
                
            # admin API로 비밀번호 즉시 초기화
            self.client.auth.admin.update_user_by_id(user_id, {"password": new_password})
            user.failed_login_attempts = 0
            user.locked_until = None
            self.save_user(user)
            return True
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase reset_password 오류: {e}")
            return False

    def get_pending_users(self) -> List[User]:
        try:
            response = self.client.table('users').select('*').eq('status', 'pending').execute()
            return [User.from_dict(data) for data in response.data] if response.data else []
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase get_pending_users 오류: {e}")
            return []

    def save_user(self, user: User) -> bool:
        try:
            user_dict = user.to_dict()
            # User.to_dict()에서 누락된 필드 추가 (해시 및 하위호환 플래그)
            user_dict["password_hash"] = user.password_hash
            user_dict["is_active"] = user.is_active()
            
            self.client.table('users').upsert(user_dict).execute()
            return True
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase save_user 오류: {e}")
            return False

    def delete_user(self, user_id: str) -> bool:
        try:
            self.client.table('users').delete().eq('id', user_id).execute()
            return True
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase delete_user 오류: {e}")
            return False
