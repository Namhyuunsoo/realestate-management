# app/routes/admin.py

from flask import Blueprint, request, jsonify, session, current_app
from app.services.user_service import UserService
from app.core.decorators import require_admin, validate_json, handle_errors, log_access
from app.core.security import log_security_event
import time

bp = Blueprint("admin", __name__, url_prefix="/api/admin")

def get_user_service() -> UserService:
    """사용자 서비스 인스턴스 반환"""
    return current_app.data_manager.user_service

def get_current_admin_id() -> str:
    """현재 로그인한 관리자 ID 반환"""
    return session.get("user_id")

@bp.get("/users")
@require_admin()
@handle_errors()
@log_access()
def get_users():
    """모든 사용자 목록 조회"""
    user_service = get_user_service()
    include_inactive = request.args.get("include_inactive", "false").lower() == "true"
    users = user_service.get_all_users(include_inactive=include_inactive)
    
    return jsonify({
        "users": [user.to_dict() for user in users],
        "total": len(users)
    })

@bp.get("/users/pending")
@require_admin()
@handle_errors()
@log_access()
def get_pending_users():
    """승인 대기 중인 사용자 목록 조회"""
    user_service = get_user_service()
    users = user_service.get_pending_users()
    
    return jsonify({
        "users": [user.to_dict() for user in users],
        "total": len(users)
    })

@bp.post("/users/<user_id>/approve")
@require_admin()
@handle_errors()
@log_access()
def approve_user(user_id):
    """사용자 승인"""
    admin_id = get_current_admin_id()
    user_service = get_user_service()
    
    if user_service.approve_user(user_id, admin_id):
        user = user_service.get_user_by_id(user_id)
        log_security_event('USER_APPROVED', f'User {user.email} approved by {admin_id}')
        return jsonify({"message": "사용자가 승인되었습니다."})
    else:
        return jsonify({"error": "사용자 승인에 실패했습니다."}), 400

@bp.post("/users/<user_id>/reject")
@require_admin()
@handle_errors()
@log_access()
def reject_user(user_id):
    """사용자 거부"""
    admin_id = get_current_admin_id()
    user_service = get_user_service()
    
    if user_service.reject_user(user_id, admin_id):
        user = user_service.get_user_by_id(user_id)
        log_security_event('USER_REJECTED', f'User {user.email} rejected by {admin_id}')
        return jsonify({"message": "사용자가 거부되었습니다."})
    else:
        return jsonify({"error": "사용자 거부에 실패했습니다."}), 400

@bp.post("/users/<user_id>/deactivate")
@require_admin()
@handle_errors()
@log_access()
def deactivate_user(user_id):
    """사용자 비활성화"""
    admin_id = get_current_admin_id()
    user_service = get_user_service()
    
    if user_service.deactivate_user(user_id, admin_id):
        user = user_service.get_user_by_id(user_id)
        log_security_event('USER_DEACTIVATED', f'User {user.email} deactivated by {admin_id}')
        return jsonify({"message": "사용자가 비활성화되었습니다."})
    else:
        return jsonify({"error": "사용자 비활성화에 실패했습니다."}), 400

@bp.post("/users/<user_id>/reset-password")
@require_admin()
@validate_json("new_password")
@handle_errors()
@log_access()
def reset_user_password(user_id):
    """사용자 비밀번호 재설정"""
    admin_id = get_current_admin_id()
    user_service = get_user_service()
    
    data = request.get_json()
    new_password = data["new_password"]
    
    if user_service.reset_user_password(user_id, new_password, admin_id):
        user = user_service.get_user_by_id(user_id)
        log_security_event('USER_PASSWORD_RESET', f'Password reset for user {user.email} by {admin_id}')
        return jsonify({"message": "비밀번호가 재설정되었습니다."})
    else:
        return jsonify({"error": "비밀번호 재설정에 실패했습니다."}), 400

@bp.post("/users/<user_id>/set-sheet-url")
@require_admin()
@validate_json("sheet_url")
@handle_errors()
@log_access()
def set_user_sheet_url(user_id):
    """사용자 시트 URL 설정"""
    admin_id = get_current_admin_id()
    user_service = get_user_service()
    
    data = request.get_json()
    sheet_url = data["sheet_url"]
    
    if user_service.set_user_sheet_url(user_id, sheet_url, admin_id):
        user = user_service.get_user_by_id(user_id)
        log_security_event('USER_SHEET_URL_SET', f'Sheet URL set for user {user.email} by {admin_id}')
        return jsonify({"message": "시트 URL이 설정되었습니다."})
    else:
        return jsonify({"error": "시트 URL 설정에 실패했습니다."}), 400

@bp.get("/users/<user_id>")
@require_admin()
@handle_errors()
@log_access()
def get_user(user_id):
    """특정 사용자 정보 조회"""
    user_service = get_user_service()
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    return jsonify({"user": user.to_dict()})

@bp.put("/users/<user_id>/role")
@require_admin()
@validate_json("role")
@handle_errors()
@log_access()
def update_user_role(user_id):
    """사용자 역할 변경"""
    admin_id = get_current_admin_id()
    data = request.get_json()
    role = data["role"]
    
    if role not in ["user", "admin"]:
        return jsonify({"error": "올바르지 않은 역할입니다."}), 400
    
    user_service = get_user_service()
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    # 자기 자신의 역할을 변경하려는 경우 방지
    if user_id == admin_id:
        return jsonify({"error": "자기 자신의 역할을 변경할 수 없습니다."}), 400
    
    user.role = role
    user_service._save_users()
    
    log_security_event('USER_ROLE_CHANGED', f'User {user.email} role changed to {role} by {admin_id}')
    return jsonify({"message": "사용자 역할이 변경되었습니다."})

@bp.post("/users/<user_id>/update-job-title")
@require_admin()
@validate_json("job_title")
@handle_errors()
@log_access()
def update_user_job_title(user_id):
    """사용자 직책 변경"""
    admin_id = get_current_admin_id()
    data = request.get_json()
    job_title = data.get("job_title", "").strip()
    
    if not job_title:
        return jsonify({"error": "직책을 입력해주세요."}), 400
    
    user_service = get_user_service()
    if user_service.update_user_job_title(user_id, job_title, admin_id):
        user = user_service.get_user_by_id(user_id)
        log_security_event('USER_JOB_TITLE_UPDATED', f'User {user.email} job title updated to "{job_title}" by {admin_id}')
        return jsonify({"message": "직책이 변경되었습니다.", "job_title": job_title})
    else:
        return jsonify({"error": "직책 변경에 실패했습니다."}), 400

@bp.get("/stats")
@require_admin()
@handle_errors()
@log_access()
def get_admin_stats():
    """관리자 통계 조회"""
    user_service = get_user_service()
    all_users = user_service.get_all_users(include_inactive=True)
    
    stats = {
        "total_users": len(all_users),
        "approved_users": len([u for u in all_users if u.status == "approved"]),
        "pending_users": len([u for u in all_users if u.status == "pending"]),
        "rejected_users": len([u for u in all_users if u.status == "rejected"]),
        "inactive_users": len([u for u in all_users if u.status == "inactive"]),
        "admin_users": len([u for u in all_users if u.role == "admin"]),
        "locked_users": len([u for u in all_users if u.is_locked()])
    }
    
    return jsonify(stats) 