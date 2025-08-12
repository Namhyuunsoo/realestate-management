# app/services/user_service.py

import json
import os
import time
from typing import List, Optional, Dict, Any
from app.models.user import User
from app.core.ids import generate_id

class UserService:
    """사용자 관리 서비스"""
    
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        self.users_file = os.path.join(data_dir, "users.json")
        self.users: Dict[str, User] = {}
        self._load_users()
    
    def _load_users(self):
        """사용자 데이터 로드"""
        if os.path.exists(self.users_file):
            try:
                print(f"사용자 데이터 파일 로드 중: {self.users_file}")
                with open(self.users_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    # 새로운 형식인지 확인
                    if "users" in data:
                        # 새로운 형식
                        self.users = {}
                        print(f"새로운 형식 사용자 데이터 발견: {len(data.get('users', []))}명")
                        for user_data in data.get("users", []):
                            try:
                                # is_active 필드가 있으면 status로 변환
                                if "is_active" in user_data and "status" not in user_data:
                                    user_data["status"] = "approved" if user_data["is_active"] else "inactive"
                                
                                # status 필드가 있으면 is_active로 변환
                                if "status" in user_data and "is_active" not in user_data:
                                    user_data["is_active"] = user_data["status"] == "approved"
                                
                                user = User.from_dict(user_data)
                                self.users[user.id] = user
                                print(f"사용자 로드됨: {user.email} (상태: {user.status})")
                            except Exception as e:
                                print(f"사용자 데이터 로드 실패 (개별): {e}")
                                continue
                    else:
                        # 기존 형식 - 마이그레이션 필요
                        print("기존 형식 사용자 데이터 발견, 마이그레이션 시작...")
                        self._migrate_old_format(data)
                        
                print(f"총 {len(self.users)}명의 사용자가 로드됨")
                        
            except Exception as e:
                print(f"사용자 데이터 로드 실패: {e}")
                self.users = {}
        else:
            print("사용자 데이터 파일이 없음, 기본 관리자 계정 생성...")
            # 기본 관리자 계정 생성
            self._create_default_admin()
    
    def _migrate_old_format(self, old_data):
        """기존 형식의 사용자 데이터를 새로운 형식으로 마이그레이션"""
        print("🔄 기존 사용자 데이터 마이그레이션 시작...")
        
        # 기존 사용자들을 새로운 형식으로 변환
        for user_id, user_data in old_data.items():
            # 기본 비밀번호 설정 (환경변수에서 가져오기)
            default_password = os.getenv("ADMIN_PASSWORD", "admin123")
            
            user = User(
                id=user_id,
                email=user_data.get("email", f"{user_id}@example.com"),
                password_hash="",  # 임시로 빈 값
                name=user_data.get("name", user_id),
                role=user_data.get("role", "user"),
                status=user_data.get("status", "approved"),
                created_at=user_data.get("created_at", time.time()),
                approved_at=user_data.get("approved_at"),
                approved_by=user_data.get("approved_by"),
                last_login=user_data.get("last_login"),
                failed_login_attempts=user_data.get("failed_login_attempts", 0),
                locked_until=user_data.get("locked_until")
            )
            
            # 비밀번호 설정
            if user_data.get("password_hash"):
                # 기존 해시가 있으면 그대로 사용
                user.password_hash = user_data["password_hash"]
            else:
                # 없으면 기본 비밀번호로 설정
                user.set_password(default_password)
            
            self.users[user.id] = user
        
        # 환경변수에 설정된 관리자 계정이 없으면 생성
        admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        admin_name = os.getenv("ADMIN_NAME", "관리자")
        
        existing_admin = self.get_user_by_email(admin_email)
        if not existing_admin:
            admin = User(
                id="admin",
                email=admin_email.lower(),
                password_hash="",
                name=admin_name,
                role="admin",
                status="approved",
                created_at=time.time(),
                approved_at=time.time()
            )
            admin.set_password(admin_password)
            self.users[admin.id] = admin
            print(f"✅ 환경변수 기반 관리자 계정 생성: {admin_email}")
        
        # 새로운 형식으로 저장
        self._save_users_new_format()
        print("✅ 사용자 데이터 마이그레이션 완료")
    
    def _save_users_new_format(self):
        """새로운 형식으로 사용자 데이터 저장"""
        os.makedirs(self.data_dir, exist_ok=True)
        
        # 백업 파일 생성
        backup_file = self.users_file + ".backup"
        if os.path.exists(self.users_file):
            import shutil
            shutil.copy2(self.users_file, backup_file)
            print(f"📁 기존 데이터 백업: {backup_file}")
        
        # 새로운 형식으로 저장
        users_data = []
        for user in self.users.values():
            user_dict = user.to_dict()
            user_dict["password_hash"] = user.password_hash
            # is_active 필드도 함께 저장 (app/routes/users.py와 호환성)
            user_dict["is_active"] = user.is_active()
            users_data.append(user_dict)
        
        data = {
            "users": users_data
        }
        
        with open(self.users_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"💾 새로운 형식으로 사용자 데이터 저장 완료: {len(self.users)}명")
    
    def _save_users(self):
        """사용자 데이터 저장 (새로운 형식)"""
        self._save_users_new_format()
    
    def _create_default_admin(self):
        """기본 관리자 계정 생성"""
        import os
        
        # 환경변수에서 어드민 정보 읽기
        admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        admin_name = os.getenv("ADMIN_NAME", "관리자")
        
        admin = User(
            id="admin",
            email=admin_email.lower(),
            password_hash="",  # 임시로 빈 값
            name=admin_name,
            role="admin",
            status="approved",
            created_at=time.time(),
            approved_at=time.time()
        )
        admin.set_password(admin_password)
        self.users[admin.id] = admin
        self._save_users_new_format()
        print("✅ 기본 관리자 계정이 생성되었습니다.")
        print(f"   이메일: {admin_email}")
        print(f"   비밀번호: {admin_password}")
        print(f"   이름: {admin_name}")
        print("   ⚠️ 보안을 위해 로그인 후 비밀번호를 변경하세요!")
    
    def register_user(self, email: str, password: str, name: str) -> Optional[User]:
        """새 사용자 등록"""
        # 이메일 중복 확인
        if self.get_user_by_email(email):
            return None
        
        # 새 사용자 생성
        user = User(
            id=generate_id("usr"),
            email=email.lower(),
            password_hash="",
            name=name,
            role="user",
            status="pending"
        )
        user.set_password(password)
        
        self.users[user.id] = user
        self._save_users()
        return user
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """사용자 인증"""
        try:
            user = self.get_user_by_email(email)
            if not user:
                print(f"인증 실패 - 사용자 없음: {email}")
                return None
            
            # 계정 잠금 확인
            if user.is_locked():
                print(f"인증 실패 - 계정 잠금: {email}")
                return None
            
            # 비밀번호 확인
            if user.check_password(password):
                user.record_login_attempt(True)
                # 해시가 마이그레이션되었을 수 있으므로 항상 저장
                self._save_users()
                print(f"인증 성공: {email}")
                return user if user.is_active() else None
            else:
                user.record_login_attempt(False)
                self._save_users()
                print(f"인증 실패 - 잘못된 비밀번호: {email}")
                return None
                
        except Exception as e:
            print(f"인증 처리 중 오류 발생: {str(e)}")
            return None
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """이메일로 사용자 조회"""
        try:
            if not email:
                print("이메일이 비어있음")
                return None
                
            email = email.lower().strip()
            print(f"사용자 조회 시도: {email}")
            
            if not self.users:
                print("사용자 데이터가 로드되지 않음")
                return None
            
            for user in self.users.values():
                if user.email == email:
                    print(f"사용자 찾음: {email} (상태: {user.status})")
                    return user
            
            print(f"사용자를 찾을 수 없음: {email}")
            return None
            
        except Exception as e:
            print(f"사용자 조회 중 오류 발생: {str(e)}")
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """ID로 사용자 조회"""
        return self.users.get(user_id)
    
    def get_all_users(self, include_inactive: bool = False) -> List[User]:
        """모든 사용자 조회"""
        users = list(self.users.values())
        if not include_inactive:
            users = [u for u in users if u.status != "inactive"]
        return sorted(users, key=lambda u: u.created_at, reverse=True)
    
    def get_pending_users(self) -> List[User]:
        """승인 대기 중인 사용자 조회"""
        return [u for u in self.users.values() if u.status == "pending"]
    
    def approve_user(self, user_id: str, approved_by: str) -> bool:
        """사용자 승인"""
        user = self.get_user_by_id(user_id)
        if not user or user.status != "pending":
            return False
        
        user.status = "approved"
        user.approved_at = time.time()
        user.approved_by = approved_by
        
        self._save_users()
        return True
    
    def reject_user(self, user_id: str, rejected_by: str) -> bool:
        """사용자 거부"""
        user = self.get_user_by_id(user_id)
        if not user or user.status != "pending":
            return False
        
        user.status = "rejected"
        user.approved_by = rejected_by
        
        self._save_users()
        return True
    
    def deactivate_user(self, user_id: str, deactivated_by: str) -> bool:
        """사용자 비활성화"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.status = "inactive"
        user.approved_by = deactivated_by
        
        self._save_users()
        return True
    
    def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """비밀번호 변경"""
        user = self.get_user_by_id(user_id)
        if not user or not user.check_password(old_password):
            return False
        
        user.set_password(new_password)
        self._save_users()
        return True
    
    def reset_password(self, user_id: str, new_password: str, reset_by: str) -> bool:
        """비밀번호 초기화 (관리자용)"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.set_password(new_password)
        user.failed_login_attempts = 0
        user.locked_until = None
        self._save_users()
        return True
    
    def update_user_profile(self, user_id: str, name: str = None, email: str = None) -> bool:
        """사용자 프로필 업데이트"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        if name:
            user.name = name
        if email:
            # 이메일 중복 확인
            existing_user = self.get_user_by_email(email)
            if existing_user and existing_user.id != user_id:
                return False
            user.email = email.lower()
        
        self._save_users()
        return True 