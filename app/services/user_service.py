import json
import os
import time
from typing import List, Optional, Dict, Any
from app.models.user import User
from app.core.ids import generate_id
from app.services.repositories import get_user_repository

def mask_ip(ip: str) -> str:
    """IP 주소 마스킹 함수"""
    if '.' in ip:  # IPv4
        parts = ip.split('.')
        return f"{parts[0]}.{parts[1]}.***.***"
    elif ':' in ip:  # IPv6
        parts = ip.split(':')
        return f"{parts[0]}:{parts[1]}:***:***"
    return "***.***.***.***"

def mask_email(email: str) -> str:
    """이메일 마스킹 함수 (4자리 + 마스킹)"""
    if '@' in email:
        local, domain = email.split('@', 1)
        if len(local) > 4:
            masked_local = local[:4] + '*' * (len(local) - 4)
        else:
            masked_local = local
        return f"{masked_local}@{domain}"
    return email

class UserService:
    """사용자 관리 서비스 (저장소 추상화 기반)"""
    
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        self.repository = get_user_repository()
    
    def register_user(self, email: str, password: str, name: str) -> Optional[User]:
        """새 사용자 등록"""
        return self.repository.register_user(email, password, name)
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """사용자 인증"""
        return self.repository.authenticate_user(email, password)
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """이메일로 사용자 조회"""
        return self.repository.get_user_by_email(email)
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """ID로 사용자 조회"""
        return self.repository.get_user_by_id(user_id)
    
    def get_all_users(self, include_inactive: bool = False) -> List[User]:
        """모든 사용자 조회"""
        return self.repository.get_all_users(include_inactive)
    
    def get_pending_users(self) -> List[User]:
        """승인 대기 중인 사용자 조회"""
        return self.repository.get_pending_users()
    
    def approve_user(self, user_id: str, approved_by: str) -> bool:
        """사용자 승인"""
        user = self.get_user_by_id(user_id)
        if not user or user.status != "pending":
            return False
        
        user.status = "approved"
        user.approved_at = time.time()
        user.approved_by = approved_by
        
        return self.repository.save_user(user)
    
    def reject_user(self, user_id: str, rejected_by: str) -> bool:
        """사용자 거부"""
        user = self.get_user_by_id(user_id)
        if not user or user.status != "pending":
            return False
        
        user.status = "rejected"
        user.approved_by = rejected_by
        
        return self.repository.save_user(user)
    
    def _release_slots_for_user(self, user_id: str):
        """사용자 퇴사/비활성화 시 할당된 슬롯을 '공석'으로 전환하여 데이터 유지"""
        try:
            from app.services.repositories import get_sheet_registry_repository
            registry_repo = get_sheet_registry_repository()
            slots = registry_repo.get_all_slots()
            
            changed = False
            for slot in slots:
                if slot.get("user_id") == user_id:
                    slot["user_id"] = None
                    slot["manager_name"] = "공석"
                    slot["is_active"] = True 
                    changed = True
            
            if changed:
                registry_repo.save_slots(slots)
                print(f"✅ 사용자 {user_id}가 비활성화되어 관련 슬롯이 '공석'으로 전환되었습니다.")
        except Exception as e:
            print(f"❌ 슬롯 상태 전환 중 오류: {e}")

    def deactivate_user(self, user_id: str, deactivated_by: str) -> bool:
        """사용자 비활성화 (데이터 삭제 없이 슬롯만 재조정)"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.status = "inactive"
        user.approved_by = deactivated_by
        
        self._release_slots_for_user(user_id)
        return self.repository.save_user(user)
    
    def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """비밀번호 변경"""
        return self.repository.change_password(user_id, old_password, new_password)
    
    def reset_password(self, user_id: str, new_password: str, reset_by: str) -> bool:
        """비밀번호 초기화 (관리자용)"""
        return self.repository.reset_password(user_id, new_password, reset_by)
    
    def update_user_profile(self, user_id: str, name: str = None, email: str = None) -> bool:
        """사용자 프로필 업데이트"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        if name:
            user.name = name
        if email:
            existing_user = self.get_user_by_email(email)
            if existing_user and existing_user.id != user_id:
                return False
            user.email = email.lower()
        
        return self.repository.save_user(user)
    
    def update_user_role(self, user_id: str, new_role: str, admin_id: str) -> bool:
        """사용자 역할 변경"""
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                return False
            
            old_role = user.role
            user.role = new_role
            
            if self.repository.save_user(user):
                print(f"사용자 역할 변경: {mask_email(user.email)} ({old_role} → {new_role})")
                return True
            return False
        except Exception as e:
            print(f"사용자 역할 변경 실패: {e}")
            return False
    
    def update_user_job_title(self, user_id: str, new_job_title: str, admin_id: str) -> bool:
        """사용자 직책 변경"""
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                return False
            
            old_job_title = user.job_title
            user.set_job_title(new_job_title)
            
            if self.repository.save_user(user):
                print(f"사용자 직책 변경: {mask_email(user.email)} ({old_job_title} → {new_job_title})")
                return True
            return False
        except Exception as e:
            print(f"사용자 직책 변경 실패: {e}")
            return False
    
    def set_user_sheet_url(self, user_id: str, sheet_url: str, admin_id: str) -> bool:
        """사용자 시트 URL 설정"""
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                return False
            
            old_sheet_url = user.sheet_url
            user.sheet_url = sheet_url.strip()
            
            if self.repository.save_user(user):
                print(f"사용자 시트 URL 설정: {mask_email(user.email)} ({old_sheet_url} → {user.sheet_url})")
                return True
            return False
        except Exception as e:
            print(f"사용자 시트 URL 설정 실패: {e}")
            return False

    def get_assigned_slots(self, user_id: str) -> List[str]:
        """사용자에게 할당된 슬롯 ID 목록 반환"""
        try:
            from app.services.repositories import get_sheet_registry_repository
            repo = get_sheet_registry_repository()
            slots = repo.get_slots_by_user_id(user_id)
            return [str(s.get("slot_id") or s.get("id")) for s in slots if s.get("slot_id") or s.get("id")]
        except Exception as e:
            print(f"할당된 슬롯 조회 실패: {e}")
            return []