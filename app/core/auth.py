# app/core/auth.py
from dataclasses import dataclass
from flask import request, current_app
from functools import wraps
from flask import jsonify

@dataclass
class CurrentUser:
    user_id: str
    is_admin: bool

def get_current_user() -> CurrentUser:
    # 헤더로 간단 식별 (실서비스에서는 OAuth/JWT 교체)
    user_id = request.headers.get("X-User", "").strip()
    if not user_id:
        user_id = "anonymous"   # 혹은 401 처리 가능
    
    # Flask 애플리케이션의 설정에서 관리자 목록 가져오기
    admin_users = current_app.config.get("ADMIN_USERS", [])
    return CurrentUser(user_id=user_id, is_admin=user_id in admin_users)

def require_user(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = request.headers.get("X-User", "").strip()
        if not user_id or user_id == "anonymous":
            return jsonify({"error": "로그인이 필요합니다"}), 401
        return f(*args, **kwargs)
    return decorated_function
