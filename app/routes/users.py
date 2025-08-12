# app/routes/users.py

from flask import Blueprint, request, jsonify, current_app
from app.core.decorators import require_user, validate_json, handle_errors
import os
import json
from typing import List, Dict, Any
import time

bp = Blueprint("users", __name__, url_prefix="/api")

# 사용자 데이터 파일 경로
def _get_users_file() -> str:
    """사용자 데이터 파일 경로 반환"""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    data_dir = os.path.join(base_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "users.json")

def _migrate_old_users_format() -> bool:
    """기존 사용자 데이터 형식을 새로운 형식으로 마이그레이션"""
    users_file = _get_users_file()
    if not os.path.exists(users_file):
        return False
    
    try:
        with open(users_file, 'r', encoding='utf-8') as f:
            old_data = json.load(f)
        
        # 기존 형식인지 확인 (dict 형태)
        if not isinstance(old_data, dict):
            return False
        
        # 새로운 형식으로 변환
        new_users = []
        next_id = 1
        
        for user_id, user_data in old_data.items():
            new_user = {
                "id": next_id,
                "email": user_data.get("email", f"{user_id}@example.com"),
                "name": user_data.get("name", user_id),
                "role": user_data.get("role", "user"),
                "is_active": user_data.get("status") == "approved",
                "created_at": int(user_data.get("created_at", time.time())),
                "created_by": "system"
            }
            new_users.append(new_user)
            next_id += 1
        
        new_data = {
            "users": new_users,
            "next_id": next_id
        }
        
        # 백업 파일 생성
        backup_file = users_file + ".backup"
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(old_data, f, ensure_ascii=False, indent=2)
        
        # 새로운 형식으로 저장
        with open(users_file, 'w', encoding='utf-8') as f:
            json.dump(new_data, f, ensure_ascii=False, indent=2)
        
        current_app.logger.info(f"사용자 데이터 마이그레이션 완료: {len(new_users)}개 사용자")
        return True
        
    except Exception as e:
        current_app.logger.error(f"사용자 데이터 마이그레이션 실패: {e}")
        return False

def _load_users() -> Dict[str, Any]:
    """사용자 데이터 로드"""
    users_file = _get_users_file()
    if not os.path.exists(users_file):
        return {"users": [], "next_id": 1}
    
    try:
        with open(users_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 새로운 형식인지 확인
        if "users" not in data:
            # 기존 형식이면 마이그레이션 시도
            if _migrate_old_users_format():
                # 마이그레이션 후 다시 로드
                with open(users_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            else:
                # 마이그레이션 실패 시 기본 형식 반환
                return {"users": [], "next_id": 1}
        
        return data
    except Exception as e:
        current_app.logger.error(f"사용자 데이터 로드 실패: {e}")
        return {"users": [], "next_id": 1}

def _save_users(data: Dict[str, Any]) -> bool:
    """사용자 데이터 저장"""
    users_file = _get_users_file()
    try:
        # is_active 필드를 status로 변환하여 저장
        users = data.get("users", [])
        for user in users:
            if "is_active" in user and "status" not in user:
                user["status"] = "approved" if user["is_active"] else "inactive"
            elif "status" in user and "is_active" not in user:
                user["is_active"] = user["status"] == "approved"
        
        with open(users_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        current_app.logger.error(f"사용자 데이터 저장 실패: {e}")
        return False

def _check_admin_permission(user_id: str) -> bool:
    """사용자의 관리자 권한 확인"""
    if not user_id:
        return False
    
    # 설정에서 관리자 목록 확인
    admin_users = current_app.config.get("ADMIN_USERS", [])
    if user_id in admin_users:
        return True
    
    # 사용자 데이터에서 관리자 권한 확인
    data = _load_users()
    users = data.get("users", [])
    user = next((u for u in users if u.get("email") == user_id or u.get("id") == user_id), None)
    
    return user and user.get("role") == "admin" and user.get("status") == "approved"

@bp.get("/users")
@require_user()
@handle_errors()
def list_users_api():
    """사용자 목록 조회"""
    user_id = request.headers.get("X-User")
    
    # 관리자 권한 확인
    if not _check_admin_permission(user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    data = _load_users()
    users = data.get("users", [])
    
    # 삭제된 사용자 필터링 (deleted_at이 있는 사용자 제외)
    active_users = [user for user in users if not user.get("deleted_at")]
    
    # status 필드를 기반으로 is_active 필드 추가
    for user in active_users:
        user["is_active"] = user.get("status") == "approved"
        # 비밀번호는 제외하고 반환
        user.pop("password_hash", None)
    
    return jsonify({
        "users": active_users,
        "total": len(active_users)
    })

@bp.post("/users")
@require_user()
@validate_json()
@handle_errors()
def create_user_api():
    """사용자 생성"""
    user_id = request.headers.get("X-User")
    
    # 관리자 권한 확인
    if not _check_admin_permission(user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    payload = request.get_json()
    
    # 필수 필드 검증
    required_fields = ["email", "name", "role"]
    for field in required_fields:
        if not payload.get(field):
            return jsonify({"error": f"필수 필드가 누락되었습니다: {field}"}), 400
    
    email = payload["email"].strip().lower()
    name = payload["name"].strip()
    role = payload["role"].strip()
    
    # 이메일 형식 검증
    if "@" not in email:
        return jsonify({"error": "올바른 이메일 형식이 아닙니다."}), 400
    
    data = _load_users()
    users = data.get("users", [])
    
    # 중복 이메일 검사
    for user in users:
        if user.get("email") == email:
            return jsonify({"error": "이미 존재하는 이메일입니다."}), 409
    
    # 새 사용자 생성
    new_user = {
        "id": data.get("next_id", 1),
        "email": email,
        "name": name,
        "role": role,
        "is_active": True,
        "created_at": int(time.time()),
        "created_by": user_id
    }
    
    users.append(new_user)
    data["users"] = users
    data["next_id"] = data.get("next_id", 1) + 1
    
    if not _save_users(data):
        return jsonify({"error": "사용자 저장에 실패했습니다."}), 500
    
    # 비밀번호 제외하고 반환
    new_user.pop("password", None)
    
    return jsonify(new_user), 201

@bp.get("/users/<user_id>")
@require_user()
@handle_errors()
def get_user_api(user_id):
    """사용자 상세 조회"""
    current_user_id = request.headers.get("X-User")
    
    # 관리자 권한 확인
    if not _check_admin_permission(current_user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    data = _load_users()
    users = data.get("users", [])
    
    user = next((u for u in users if str(u.get("id")) == str(user_id)), None)
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    # 비밀번호 제외하고 반환
    user.pop("password", None)
    
    return jsonify(user)

@bp.put("/users/<user_id>")
@require_user()
@validate_json()
@handle_errors()
def update_user_api(user_id):
    """사용자 정보 수정"""
    current_user_id = request.headers.get("X-User")
    
    # 관리자 권한 확인
    if not _check_admin_permission(current_user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    payload = request.get_json()
    
    data = _load_users()
    users = data.get("users", [])
    
    user = next((u for u in users if str(u.get("id")) == str(user_id)), None)
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    # 수정 가능한 필드들
    allowed_fields = ["name", "role", "is_active"]
    for field in allowed_fields:
        if field in payload:
            if field == "is_active":
                value = payload[field]
                is_active = False
                if isinstance(value, str):
                    is_active = value.lower() == "true"
                else:
                    is_active = bool(value)
                
                # is_active 값에 따라 status 업데이트
                if is_active:
                    user["status"] = "approved"
                    user["approved_at"] = int(time.time())
                    user["approved_by"] = current_user_id
                    # is_active 필드도 함께 업데이트
                    user["is_active"] = True
                else:
                    user["status"] = "inactive"
                    user["approved_at"] = None
                    user["approved_by"] = None
                    # is_active 필드도 함께 업데이트
                    user["is_active"] = False
            else:
                user[field] = payload[field].strip() if isinstance(payload[field], str) else payload[field]
    
    user["updated_at"] = int(time.time())
    user["updated_by"] = current_user_id
    
    if not _save_users(data):
        return jsonify({"error": "사용자 수정에 실패했습니다."}), 500
    
    # 비밀번호 제외하고 반환
    user.pop("password", None)
    
    return jsonify(user)

@bp.delete("/users/<user_id>")
@require_user()
@handle_errors()
def delete_user_api(user_id):
    """사용자 삭제"""
    current_user_id = request.headers.get("X-User")
    
    # 관리자 권한 확인
    if not _check_admin_permission(current_user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    data = _load_users()
    users = data.get("users", [])
    
    user = next((u for u in users if str(u.get("id")) == str(user_id)), None)
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    # 관리자는 삭제할 수 없음
    if user.get("email") in current_app.config.get("ADMIN_USERS", []):
        return jsonify({"error": "관리자는 삭제할 수 없습니다."}), 403
    
    # 실제 삭제 (리스트에서 제거)
    users.remove(user)
    data["users"] = users
    
    if not _save_users(data):
        return jsonify({"error": "사용자 삭제에 실패했습니다."}), 500
    
    return jsonify({"message": "사용자가 삭제되었습니다."})

@bp.get("/users/roles")
@require_user()
@handle_errors()
def list_roles_api():
    """사용 가능한 역할 목록 조회"""
    current_user_id = request.headers.get("X-User")
    
    # 관리자 권한 확인
    if not _check_admin_permission(current_user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    roles = [
        {"id": "admin", "name": "관리자"},
        {"id": "manager", "name": "매니저"},
        {"id": "user", "name": "일반사용자"}
    ]
    
    return jsonify({"roles": roles}) 