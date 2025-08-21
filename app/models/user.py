# app/models/user.py

import time
import hashlib
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

@dataclass
class User:
    """사용자 모델"""
    id: str
    email: str
    password_hash: str
    name: str
    role: str = "user"  # user, admin
    status: str = "pending"  # pending, approved, rejected, inactive
    job_title: str = ""  # 직책 (예: 대표공인중개사, 공인중개사, 직원 등)
    sheet_url: str = ""  # 개인 시트 URL
    created_at: float = field(default_factory=time.time)
    approved_at: Optional[float] = None
    approved_by: Optional[str] = None
    last_login: Optional[float] = None
    failed_login_attempts: int = 0
    locked_until: Optional[float] = None
    
    def is_active(self) -> bool:
        """사용자가 활성 상태인지 확인"""
        return self.status == "approved"
    
    def is_admin(self) -> bool:
        """관리자인지 확인"""
        return self.role == "admin"
    
    def get_display_name(self) -> str:
        """직책과 이름을 조합한 표시명 반환"""
        if self.job_title:
            return f"{self.job_title} {self.name}"
        return self.name
    
    def set_job_title(self, job_title: str):
        """직책 설정"""
        self.job_title = job_title.strip()
    
    def is_locked(self) -> bool:
        """계정이 잠겨있는지 확인"""
        if self.locked_until and time.time() < self.locked_until:
            return True
        return False
    
    def check_password(self, password: str) -> bool:
        """비밀번호 확인"""
        try:
            if not password:
                print(f"비밀번호가 비어있음")
                return False
            
            if not self.password_hash:
                print(f"저장된 비밀번호 해시가 없음")
                return False
            
            # 기존 SHA-256 해시인지 확인하고 마이그레이션
            if self._is_old_hash_format():
                print(f"기존 해시 형식 발견, 마이그레이션 시도: {self.email}")
                if self._migrate_old_hash(password):
                    print(f"해시 마이그레이션 성공: {self.email}")
                    return True
                else:
                    print(f"해시 마이그레이션 실패: {self.email}")
                    return False
            
            # Werkzeug의 check_password_hash 사용
            is_valid = check_password_hash(self.password_hash, password)
            
            print(f"비밀번호 확인 결과: {is_valid}")
            return is_valid
            
        except Exception as e:
            print(f"비밀번호 확인 중 오류 발생: {str(e)}")
            return False
    
    def set_password(self, password: str):
        """비밀번호 설정"""
        try:
            # Werkzeug의 generate_password_hash 사용
            self.password_hash = generate_password_hash(password)
            print(f"비밀번호 설정 완료 (해시 길이: {len(self.password_hash)})")
        except Exception as e:
            print(f"비밀번호 설정 중 오류 발생: {str(e)}")
            raise
    
    def _is_old_hash_format(self) -> bool:
        """기존 SHA-256 해시 형식인지 확인"""
        # Werkzeug 해시는 scrypt: 또는 pbkdf2:로 시작
        if not self.password_hash:
            return False
        return not (self.password_hash.startswith('scrypt:') or self.password_hash.startswith('pbkdf2:'))
    
    def _migrate_old_hash(self, password: str) -> bool:
        """기존 SHA-256 해시를 Werkzeug 해시로 마이그레이션"""
        try:
            # 기존 SHA-256 해시 생성
            old_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
            
            # 저장된 해시와 비교
            if self.password_hash == old_hash:
                # 새로운 Werkzeug 해시로 업데이트
                self.password_hash = generate_password_hash(password)
                print(f"해시 마이그레이션 완료: {self.email}")
                return True
            else:
                print(f"기존 해시와 일치하지 않음: {self.email}")
                return False
                
        except Exception as e:
            print(f"해시 마이그레이션 중 오류 발생: {str(e)}")
            return False
    
    def record_login_attempt(self, success: bool):
        """로그인 시도 기록"""
        if success:
            self.failed_login_attempts = 0
            self.last_login = time.time()
            self.locked_until = None
        else:
            self.failed_login_attempts += 1
            if self.failed_login_attempts >= 5:
                # 30분간 잠금
                self.locked_until = time.time() + 1800
    
    def to_dict(self) -> Dict[str, Any]:
        """사용자 정보를 딕셔너리로 변환 (비밀번호 제외)"""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "status": self.status,
            "job_title": self.job_title,
            "sheet_url": self.sheet_url,
            "created_at": self.created_at,
            "approved_at": self.approved_at,
            "approved_by": self.approved_by,
            "last_login": self.last_login,
            "failed_login_attempts": self.failed_login_attempts,
            "locked_until": self.locked_until
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """딕셔너리에서 사용자 객체 생성"""
        # is_active 필드가 있으면 status로 변환
        status = data.get("status", "pending")
        if "is_active" in data and "status" not in data:
            status = "approved" if data["is_active"] else "inactive"
        
        return cls(
            id=data["id"],
            email=data["email"],
            password_hash=data["password_hash"],
            name=data["name"],
            role=data.get("role", "user"),
            status=status,
            job_title=data.get("job_title", ""),
            sheet_url=data.get("sheet_url", ""),
            created_at=data.get("created_at", time.time()),
            approved_at=data.get("approved_at"),
            approved_by=data.get("approved_by"),
            last_login=data.get("last_login"),
            failed_login_attempts=data.get("failed_login_attempts", 0),
            locked_until=data.get("locked_until")
        ) 