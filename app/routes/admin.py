# app/routes/admin.py

from flask import Blueprint, request, jsonify, session, current_app
from app.services.user_service import UserService
from app.core.decorators import require_admin, require_user_management, require_stats_access, validate_json, handle_errors, log_access
from app.core.security import log_security_event
import os
import json
import time

bp = Blueprint("admin", __name__, url_prefix="/api/admin")

def get_user_service() -> UserService:
    """사용자 서비스 인스턴스 반환"""
    return current_app.data_manager.user_service

def get_current_admin_id() -> str:
    """현재 로그인한 관리자 ID 반환"""
    return session.get("user_id")

@bp.post("/users")
@require_user_management()
@validate_json("email", "name", "password", "role")
@handle_errors()
@log_access()
def create_user():
    """관리자가 새 사용자 생성"""
    admin_id = get_current_admin_id()
    data = request.get_json()
    
    email = data["email"].strip().lower()
    name = data["name"].strip()
    password = data["password"]
    role = data.get("role", "user")
    manager_name = data.get("manager_name", "").strip()
    job_title = data.get("job_title", "").strip()
    
    # 이메일 형식 검증
    if "@" not in email:
        return jsonify({"error": "올바른 이메일 형식이 아닙니다."}), 400
    
    # 비밀번호 강도 검증
    if len(password) < 6:
        return jsonify({"error": "비밀번호는 최소 6자 이상이어야 합니다."}), 400
    
    # 이름 검증
    if len(name) < 2:
        return jsonify({"error": "이름은 최소 2자 이상이어야 합니다."}), 400
    
    # 역할 검증
    if role not in ["user", "manager", "admin"]:
        return jsonify({"error": "올바르지 않은 역할입니다."}), 400
    
    user_service = get_user_service()
    
    # 이메일 중복 확인
    if user_service.get_user_by_email(email):
        return jsonify({"error": "이미 등록된 이메일입니다."}), 409
    
    # 새 사용자 생성 (승인 상태로 바로 생성)
    user = user_service.register_user(email, password, name)
    
    if not user:
        return jsonify({"error": "사용자 생성에 실패했습니다."}), 500
    
    # 역할, 직책, 담당자명 설정
    user.role = role
    user.status = "approved"  # 관리자가 생성한 사용자는 바로 승인
    user.approved_at = time.time()
    user.approved_by = admin_id
    if job_title:
        user.set_job_title(job_title)
    if manager_name:
        user.set_manager_name(manager_name)
    
    user_service.repository.save_user(user)
    
    log_security_event('USER_CREATED_BY_ADMIN', f'User {email} created by admin {admin_id}')
    
    return jsonify({
        "message": "사용자가 생성되었습니다.",
        "user": user.to_dict()
    }), 201

@bp.get("/users")
@handle_errors()
@log_access()
def get_users():
    """모든 사용자 목록 조회"""
    # 세션 기반 인증 확인
    user_id = session.get("user_id")
    if not user_id:
        # X-User 헤더 기반 인증 시도
        user_email = request.headers.get("X-User")
        if not user_email:
            return jsonify({"error": "로그인이 필요합니다."}), 401
        
        user_service = get_user_service()
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active() or not user.is_admin():
            return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    else:
        # 세션 기반 인증
        user_service = get_user_service()
        user = user_service.get_user_by_id(user_id)
        if not user or not user.is_active() or not user.is_admin():
            return jsonify({"error": "관리자 권한이 필요합니다."}), 403
    
    user_service = get_user_service()
    include_inactive = request.args.get("include_inactive", "false").lower() == "true"
    users = user_service.get_all_users(include_inactive=include_inactive)
    
    return jsonify({
        "users": [user.to_dict() for user in users],
        "total": len(users)
    })

@bp.get("/users/pending")
@require_user_management()
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
@require_user_management()
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
@require_user_management()
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
@require_user_management()
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
@require_user_management()
@validate_json("new_password")
@handle_errors()
@log_access()
def reset_user_password(user_id):
    """사용자 비밀번호 재설정"""
    admin_id = get_current_admin_id()
    user_service = get_user_service()
    
    data = request.get_json()
    new_password = data["new_password"]
    
    if user_service.reset_password(user_id, new_password, admin_id):
        user = user_service.get_user_by_id(user_id)
        log_security_event('USER_PASSWORD_RESET', f'Password reset for user {user.email} by {admin_id}')
        return jsonify({"message": "비밀번호가 재설정되었습니다."})
    else:
        return jsonify({"error": "비밀번호 재설정에 실패했습니다."}), 400

@bp.post("/users/<user_id>/set-sheet-url")
@require_user_management()
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

@bp.get("/sheet-slots")
@require_user_management()
@handle_errors()
@log_access()
def get_sheet_slots():
    """시트 슬롯 레지스트리 조회"""
    from app.services.repositories import get_sheet_registry_repository
    registry_repo = get_sheet_registry_repository()
    slots = registry_repo.get_all_slots()
    
    return jsonify({"slots": slots})

@bp.get("/debug-supabase")
def debug_supabase():
    """Supabase 연동 디버깅 정보 반환 (임시 시크릿 키 사용)"""
    from flask import request
    if request.args.get('secret') != 'antigravity_debug_123':
        return jsonify({"error": "Unauthorized"}), 401
        
    import os
    env_info = {}
    keys = [
        "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "USE_SUPABASE_USERS",
        "SUPABASE_REAL_URL"
    ]
    for k in keys:
        val = os.environ.get(k)
        if val is not None:
            val_str = str(val)
            env_info[k] = {
                "prefix": val_str[:5] + "...",
                "length": len(val_str),
                "has_newline": "\n" in val_str or "\r" in val_str
            }
        else:
            env_info[k] = "NOT_SET"
            
    # 연결 테스트
    test_result = "N/A"
    try:
        from app.services.repositories import get_sheet_registry_repository
        repo = get_sheet_registry_repository()
        slots = repo.get_all_slots()
        test_result = f"Success - found {len(slots)} slots"
    except Exception as e:
        test_result = f"Error: {str(e)}"
        
    return jsonify({
        "environment": env_info,
        "test_result": test_result,
        "cwd": os.getcwd()
    })

@bp.post("/sheet-slots")
@require_user_management()
@validate_json("slot_id")
@handle_errors()
@log_access()
def update_sheet_slot():
    """특정 슬롯의 담당자 배정 업데이트"""
    data = request.get_json()
    slot_id = str(data["slot_id"])
    new_user_id = data.get("user_id")
    new_manager_name = data.get("manager_name", "공석")
    new_sheet_url = data.get("sheet_url")
    
    from app.services.repositories import get_sheet_registry_repository
    registry_repo = get_sheet_registry_repository()
    
    slots = registry_repo.get_all_slots()
    
    found = False
    updated_slot = None
    for slot in slots:
        slot_key = str(slot.get("slot_id") or slot.get("id"))
        if slot_key == slot_id:
            slot["user_id"] = new_user_id
            slot["manager_name"] = new_manager_name
            if new_sheet_url is not None:
                slot["sheet_url"] = new_sheet_url
            slot["is_active"] = True if (new_user_id or new_manager_name != "공석" or slot.get("sheet_url")) else False
            found = True
            updated_slot = slot
            break
            
    if not found:
        return jsonify({"error": "해당 슬롯을 찾을 수 없습니다."}), 404
        
    if not registry_repo.save_slots(slots):
        return jsonify({"error": "레지스트리 업데이트에 실패했습니다."}), 500
        
    return jsonify({"message": "슬롯이 업데이트되었습니다.", "slot": updated_slot})

@bp.get("/users/<user_id>")
@require_user_management()
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
@require_user_management()
@validate_json("role")
@handle_errors()
@log_access()
def update_user_role(user_id):
    """사용자 역할 변경"""
    admin_id = get_current_admin_id()
    data = request.get_json()
    role = data["role"]
    
    if role not in ["user", "manager", "admin"]:
        return jsonify({"error": "올바르지 않은 역할입니다."}), 400
    
    user_service = get_user_service()
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
    
    # 자기 자신의 역할을 변경하려는 경우 방지
    if user_id == admin_id:
        return jsonify({"error": "자기 자신의 역할을 변경할 수 없습니다."}), 400
    
    user.role = role
    user_service.repository.save_user(user)
    
    log_security_event('USER_ROLE_CHANGED', f'User {user.email} role changed to {role} by {admin_id}')
    return jsonify({"message": "사용자 역할이 변경되었습니다."})

@bp.post("/users/<user_id>/update-job-title")
@require_user_management()
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

@bp.post("/users/<user_id>/update-manager-name")
@require_user_management()
@validate_json("manager_name")
@handle_errors()
@log_access()
def update_user_manager_name(user_id):
    """사용자 담당자명 변경"""
    try:
        admin_id = get_current_admin_id()
        data = request.get_json()
        manager_name = data.get("manager_name", "").strip()
        
        print(f"🔍 담당자명 변경 요청: user_id={user_id}, manager_name='{manager_name}', admin_id={admin_id}")
        current_app.logger.info(f"담당자명 변경 요청: user_id={user_id}, manager_name='{manager_name}', admin_id={admin_id}")
        
        user_service = get_user_service()
        user = user_service.get_user_by_id(user_id)
        
        if not user:
            print(f"❌ 사용자를 찾을 수 없음: user_id={user_id}")
            current_app.logger.error(f"사용자를 찾을 수 없음: user_id={user_id}")
            return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
        
        print(f"✅ 사용자 정보: {user.email}, 현재 담당자명='{user.manager_name}'")
        current_app.logger.info(f"사용자 정보: {user.email}, 현재 담당자명='{user.manager_name}'")
        
        # 담당자명 설정
        user.set_manager_name(manager_name)
        print(f"✅ 담당자명 설정 완료: '{manager_name}'")
        current_app.logger.info(f"담당자명 설정 완료: '{manager_name}'")
        
        # 사용자 데이터 저장
        user_service.repository.save_user(user)
        print(f"✅ 사용자 데이터 저장 완료")
        current_app.logger.info(f"사용자 데이터 저장 완료")
        
        # 저장 후 확인
        saved_user = user_service.get_user_by_id(user_id)
        print(f"✅ 저장 후 확인: 담당자명='{saved_user.manager_name}'")
        
        log_security_event('USER_MANAGER_NAME_UPDATED', f'User {user.email} manager name updated to "{manager_name}" by {admin_id}')
        return jsonify({"message": "담당자명이 변경되었습니다.", "manager_name": manager_name})
        
    except Exception as e:
        print(f"❌ 담당자명 변경 중 오류: {e}")
        current_app.logger.error(f"❌ 담당자명 변경 중 오류: {e}")
        current_app.logger.error(f"❌ 에러 타입: {type(e).__name__}")
        import traceback
        current_app.logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
        return jsonify({"error": f"담당자명 변경 실패: {str(e)}"}), 500

@bp.get("/stats")
@require_stats_access()
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