# app/routes/users.py

from flask import Blueprint, request, jsonify, current_app
from app.core.decorators import require_user, validate_json, handle_errors
from app.routes.auth import get_user_service
import time

bp = Blueprint("users", __name__, url_prefix="/api")

def _check_admin_permission(user_id: str) -> bool:
    """사용자의 관리자 권한 확인"""
    if not user_id:
        return False
    
    # 설정에서 관리자 목록 확인
    admin_users = current_app.config.get("ADMIN_USERS", [])
    if user_id in admin_users:
        return True
    
    # 사용자 서비스에서 확인
    user_service = get_user_service()
    if not user_service:
        return False
        
    user = user_service.get_user_by_email(user_id) or user_service.get_user_by_id(user_id)
    return user and user.is_admin() and user.is_active()

@bp.get("/users")
@require_user()
@handle_errors()
def list_users_api():
    """사용자 목록 조회"""
    current_user_id = request.headers.get("X-User")
    
    # 관리자 권한 확인
    if not _check_admin_permission(current_user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    user_service = get_user_service()
    users = user_service.get_all_users()
    
    # 사용자 리스트 딕셔너리로 변환 (is_active 등 프론트 요구 스펙 맞춤)
    result_users = []
    for user in users:
        u_dict = user.to_dict()
        u_dict["is_active"] = (user.status == "approved")
        result_users.append(u_dict)
    
    return jsonify({
        "users": result_users,
        "total": len(result_users)
    })

@bp.post("/users")
@require_user()
@validate_json()
@handle_errors()
def create_user_api():
    """사용자 생성"""
    current_user_id = request.headers.get("X-User")
    
    # 관리자 권한 확인
    if not _check_admin_permission(current_user_id):
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
    
    user_service = get_user_service()
    existing_user = user_service.get_user_by_email(email)
    if existing_user:
        return jsonify({"error": "이미 존재하는 이메일입니다."}), 409
    
    # 신규 사용자 자동 생성 및 승인 (어드민 직권 생성)
    # register_user 시 기본값은 pending이므로 즉시 업데이트
    temp_password = "TemporaryPassword123!"
    new_user = user_service.register_user(email, temp_password, name)
    
    if not new_user:
        return jsonify({"error": "사용자 생성에 실패했습니다."}), 500
        
    new_user.role = role
    new_user.status = "approved"
    
    if not user_service.repository.save_user(new_user):
        return jsonify({"error": "사용자 저장에 실패했습니다."}), 500
    
    u_dict = new_user.to_dict()
    u_dict["is_active"] = True
    
    return jsonify(u_dict), 201

@bp.get("/users/<user_id>")
@require_user()
@handle_errors()
def get_user_api(user_id):
    """사용자 상세 조회"""
    current_user_id = request.headers.get("X-User")
    
    if not _check_admin_permission(current_user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    user_service = get_user_service()
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    u_dict = user.to_dict()
    u_dict["is_active"] = (user.status == "approved")
    
    return jsonify(u_dict)

@bp.put("/users/<user_id>")
@require_user()
@validate_json()
@handle_errors()
def update_user_api(user_id):
    """사용자 정보 수정"""
    current_user_id = request.headers.get("X-User")
    
    if not _check_admin_permission(current_user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    payload = request.get_json()
    user_service = get_user_service()
    
    user = user_service.get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    # 수정 가능한 필드들
    if "name" in payload:
        user.name = payload["name"].strip()
    if "role" in payload:
        user.role = payload["role"].strip()
    if "is_active" in payload:
        value = payload["is_active"]
        is_active = str(value).lower() == "true" if isinstance(value, str) else bool(value)
        
        if is_active:
            user.status = "approved"
        else:
            user.status = "inactive"
            
    if not user_service.repository.save_user(user):
        return jsonify({"error": "사용자 수정에 실패했습니다."}), 500
    
    u_dict = user.to_dict()
    u_dict["is_active"] = (user.status == "approved")
    
    return jsonify(u_dict)

@bp.delete("/users/<user_id>")
@require_user()
@handle_errors()
def delete_user_api(user_id):
    """사용자 삭제"""
    current_user_id = request.headers.get("X-User")
    
    if not _check_admin_permission(current_user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    user_service = get_user_service()
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    if user.email in current_app.config.get("ADMIN_USERS", []):
        return jsonify({"error": "관리자는 삭제할 수 없습니다."}), 403
    
    # DB에서 완전 삭제. (Repository 구현에 delete_user가 없으면 상태값만 업데이트해야 하지만 일단 구현)
    if hasattr(user_service.repository, 'delete_user'):
        res = user_service.repository.delete_user(user_id)
    else:
        # 삭제 인터페이스가 없는 경우 상태를 deleted 등으로 처리 (현재는 삭제된 걸로 간주)
        user.status = "deleted"
        res = user_service.repository.save_user(user)
        
    if not res:
        return jsonify({"error": "사용자 삭제에 실패했습니다."}), 500
    
    return jsonify({"message": "사용자가 삭제되었습니다."})

@bp.get("/users/roles")
@require_user()
@handle_errors()
def list_roles_api():
    """사용 가능한 역할 목록 조회"""
    current_user_id = request.headers.get("X-User")
    
    if not _check_admin_permission(current_user_id):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    roles = [
        {"id": "admin", "name": "관리자"},
        {"id": "manager", "name": "매니저"},
        {"id": "user", "name": "일반사용자"}
    ]
    
    return jsonify({"roles": roles})  