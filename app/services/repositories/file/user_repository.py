import json
import os
import time
from typing import List, Optional, Dict, Any
from app.models.user import User
from app.services.repositories.base import UserRepository

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

class FileUserRepository(UserRepository):
    """파일 기반 사용자 저장소 (기존 users.json 의존 유지)"""
    
    def __init__(self, data_dir: str = "./data"):
        # Vercel Serverless (Read-only OS) 지원을 위해 /tmp 로 경로 우회 처리
        is_vercel = os.environ.get("VERCEL", "0") == "1"
        if is_vercel and not data_dir.startswith("/tmp"):
            self.data_dir = "/tmp/data"
        else:
            self.data_dir = data_dir
            
        self.users_file = os.path.join(self.data_dir, "users.json")
        self.users: Dict[str, User] = {}
        
        # 파일 저장 권한이 가능한 경우에만 폴더 생성 시도 (혹은 실패 무시)
        try:
            os.makedirs(self.data_dir, exist_ok=True)
        except OSError:
            pass
            
        self._load_users()
    
    def _load_users(self):
        """사용자 데이터 로드"""
        if os.path.exists(self.users_file):
            try:
                with open(self.users_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    if "users" in data:
                        self.users = {}
                        for user_data in data.get("users", []):
                            try:
                                if "is_active" in user_data and "status" not in user_data:
                                    user_data["status"] = "approved" if user_data["is_active"] else "inactive"
                                if "status" in user_data and "is_active" not in user_data:
                                    user_data["is_active"] = user_data["status"] == "approved"
                                if "job_title" not in user_data:
                                    user_data["job_title"] = ""
                                
                                user = User.from_dict(user_data)
                                self.users[user.id] = user
                            except Exception:
                                continue
                    else:
                        self._migrate_old_format(data)
            except Exception:
                self.users = {}
        else:
            self._create_default_admin()
    
    def _migrate_old_format(self, old_data):
        print("🔄 기존 사용자 데이터 마이그레이션 시작...")
        for user_id, user_data in old_data.items():
            default_password = os.getenv("ADMIN_PASSWORD", "admin123")
            user = User(
                id=user_id,
                email=user_data.get("email", f"{user_id}@example.com"),
                password_hash="",
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
            if user_data.get("password_hash"):
                user.password_hash = user_data["password_hash"]
            else:
                user.set_password(default_password)
            self.users[user.id] = user
        
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
            print(f"✅ 환경변수 기반 관리자 계정 생성: {mask_email(admin_email)}")
        
        self._save_users_new_format()
        print("✅ 사용자 데이터 마이그레이션 완료")
    
    def _save_users_new_format(self):
        os.makedirs(self.data_dir, exist_ok=True)
        backup_file = self.users_file + ".backup"
        if os.path.exists(self.users_file):
            import shutil
            shutil.copy2(self.users_file, backup_file)
            print(f"📁 기존 데이터 백업: {backup_file}")
        
        users_data = []
        for user in self.users.values():
            user_dict = user.to_dict()
            user_dict["password_hash"] = user.password_hash
            user_dict["is_active"] = user.is_active()
            users_data.append(user_dict)
        
        data = {"users": users_data}
        with open(self.users_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"💾 새로운 형식으로 사용자 데이터 저장 완료: {len(self.users)}명")
    
    def _create_default_admin(self):
        admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        admin_name = os.getenv("ADMIN_NAME", "관리자")
        
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
        self._save_users_new_format()
        print("✅ 기본 관리자 계정이 생성되었습니다.")

    def get_user_by_email(self, email: str) -> Optional[User]:
        if not email: return None
        if hasattr(email, 'email'): email = email.email
        email = email.lower().strip()
        for user in self.users.values():
            if user.email == email:
                return user
        return None

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)

    def get_all_users(self, include_inactive: bool = False) -> List[User]:
        users = list(self.users.values())
        if not include_inactive:
            users = [u for u in users if u.status != "inactive"]
        return sorted(users, key=lambda u: u.created_at, reverse=True)

    def get_pending_users(self) -> List[User]:
        return [u for u in self.users.values() if u.status == "pending"]

    def register_user(self, email: str, password: str, name: str) -> Optional[User]:
        if self.get_user_by_email(email):
            return None
        from app.core.ids import generate_id
        user = User(
            id=generate_id("usr"),
            email=email.lower(),
            password_hash="",
            name=name,
            role="user",
            status="pending"
        )
        user.set_password(password)
        self.save_user(user)
        return user

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        try:
            user = self.get_user_by_email(email)
            if not user or user.is_locked():
                return None
            
            if user.check_password(password):
                user.record_login_attempt(True)
                self.save_user(user)
                return user if user.is_active() else None
            else:
                user.record_login_attempt(False)
                self.save_user(user)
                return None
        except Exception:
            return None

    def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        user = self.get_user_by_id(user_id)
        if not user or not user.check_password(old_password):
            return False
        user.set_password(new_password)
        return self.save_user(user)

    def reset_password(self, user_id: str, new_password: str, reset_by: str) -> bool:
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        user.set_password(new_password)
        user.failed_login_attempts = 0
        user.locked_until = None
        return self.save_user(user)

    def save_user(self, user: User) -> bool:
        self.users[user.id] = user
        self._save_users_new_format()
        return True

    def delete_user(self, user_id: str) -> bool:
        if user_id in self.users:
            del self.users[user_id]
            self._save_users_new_format()
            return True
        return False
