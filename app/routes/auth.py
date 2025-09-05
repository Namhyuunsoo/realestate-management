# app/routes/auth.py

from flask import Blueprint, request, jsonify, session, current_app
from app.services.user_service import UserService
from app.core.decorators import validate_json, handle_errors, log_access, require_user
from app.core.security import log_security_event
import re

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

def get_user_service() -> UserService:
    """사용자 서비스 인스턴스 반환"""
    current_app.logger.info("get_user_service() 호출됨")
    
    if not hasattr(current_app, 'data_manager'):
        current_app.logger.error("DataManager 속성이 존재하지 않습니다.")
        return None
        
    if not current_app.data_manager:
        current_app.logger.error("DataManager가 None입니다.")
        return None
        
    if not hasattr(current_app.data_manager, 'user_service'):
        current_app.logger.error("DataManager에 user_service 속성이 없습니다.")
        return None
        
    if not current_app.data_manager.user_service:
        current_app.logger.error("DataManager.user_service가 None입니다.")
        return None
        
    current_app.logger.info("UserService 인스턴스 반환 성공")
    return current_app.data_manager.user_service

@bp.post("/register")
@validate_json("email", "password", "name")
@handle_errors()
@log_access()
def register():
    """사용자 등록"""
    data = request.get_json()
    email = data["email"].lower().strip()
    password = data["password"]
    name = data["name"].strip()
    
    # 이메일 형식 검증
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({"error": "올바른 이메일 형식이 아닙니다."}), 400
    
    # 비밀번호 강도 검증
    if len(password) < 6:
        return jsonify({"error": "비밀번호는 최소 6자 이상이어야 합니다."}), 400
    
    # 이름 검증
    if len(name) < 2:
        return jsonify({"error": "이름은 최소 2자 이상이어야 합니다."}), 400
    
    user_service = get_user_service()
    user = user_service.register_user(email, password, name)
    
    if not user:
        return jsonify({"error": "이미 등록된 이메일입니다."}), 400
    
    log_security_event('USER_REGISTERED', f'New user registered: {email}')
    
    return jsonify({
        "message": "회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "status": user.status
        }
    }), 201

@bp.post("/login")
@validate_json("email", "password")
@handle_errors()
@log_access()
def login():
    """사용자 로그인"""
    try:
        data = request.get_json()
        email = data["email"].lower().strip()
        password = data["password"]
        
        current_app.logger.info(f"로그인 시도: {email}")
        current_app.logger.info(f"비밀번호 길이: {len(password) if password else 0}")
        
        # 강화된 입력 검증
        if not email or not email.strip():
            current_app.logger.warning(f"로그인 실패 - 빈 이메일")
            return jsonify({"error": "이메일을 입력해주세요."}), 400
            
        if not password or len(password.strip()) == 0:
            current_app.logger.warning(f"로그인 실패 - 빈 비밀번호: {email}")
            return jsonify({"error": "비밀번호를 입력해주세요."}), 400
        
        # 이메일 형식 검증
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            current_app.logger.warning(f"로그인 실패 - 잘못된 이메일 형식: {email}")
            return jsonify({"error": "올바른 이메일 형식이 아닙니다."}), 400
        
        # 사용자 서비스 가져오기
        user_service = get_user_service()
        if not user_service:
            current_app.logger.error("사용자 서비스를 가져올 수 없습니다.")
            return jsonify({"error": "서버 오류가 발생했습니다."}), 500
        
        # 사용자 조회
        user = user_service.get_user_by_email(email)
        if not user:
            current_app.logger.warning(f"로그인 실패 - 사용자 없음: {email}")
            log_security_event('LOGIN_FAILED', f'User not found: {email}')
            return jsonify({"error": "이메일 또는 비밀번호가 올바르지 않습니다."}), 401
        
        current_app.logger.info(f"사용자 찾음: {email} (상태: {user.status}, 역할: {user.role})")
        current_app.logger.info(f"사용자 비밀번호 해시 존재: {bool(user.password_hash)}")
        
        # 계정 상태 확인
        if user.status == "pending":
            current_app.logger.info(f"로그인 실패 - 승인 대기: {email}")
            return jsonify({"error": "관리자 승인 대기 중입니다."}), 403
        
        if user.status == "rejected":
            current_app.logger.info(f"로그인 실패 - 가입 거부: {email}")
            return jsonify({"error": "가입이 거부되었습니다."}), 403
        
        if user.status == "inactive":
            current_app.logger.info(f"로그인 실패 - 비활성화: {email}")
            return jsonify({"error": "비활성화된 계정입니다."}), 403
        
        # 계정 잠금 확인
        if user.is_locked():
            current_app.logger.warning(f"로그인 실패 - 계정 잠금: {email}")
            return jsonify({"error": "계정이 잠겨있습니다. 잠시 후 다시 시도해주세요."}), 423
        
        # 비밀번호 확인
        current_app.logger.info(f"비밀번호 확인 시작: {email}")
        try:
            password_check_result = user.check_password(password)
            current_app.logger.info(f"비밀번호 확인 결과: {password_check_result}")
            
            if not password_check_result:
                current_app.logger.warning(f"로그인 실패 - 잘못된 비밀번호: {email}")
                log_security_event('LOGIN_FAILED', f'Invalid password for: {email}')
                return jsonify({"error": "이메일 또는 비밀번호가 올바르지 않습니다."}), 401
                
        except Exception as e:
            current_app.logger.error(f"비밀번호 확인 중 오류 발생: {str(e)}")
            return jsonify({"error": "로그인 처리 중 오류가 발생했습니다."}), 500
        
        current_app.logger.info(f"비밀번호 확인 성공: {email}")
        
        # 로그인 성공
        user.record_login_attempt(True)
        # 해시가 마이그레이션되었을 수 있으므로 항상 저장
        user_service._save_users()  # 로그인 기록 저장
        
        # 기존 세션 완전 정리 (다른 사용자로 로그인 시 충돌 방지)
        session.clear()
        
        # 세션에 사용자 정보 저장
        session["user_id"] = user.id
        session["user_email"] = user.email
        session["user_name"] = user.name
        session["user_role"] = user.role
        
        current_app.logger.info(f"로그인 성공: {email} (역할: {user.role})")
        log_security_event('LOGIN_SUCCESS', f'User logged in: {email}')
        
        return jsonify({
            "message": "로그인되었습니다.",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "status": user.status
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"로그인 처리 중 오류 발생: {str(e)}")
        current_app.logger.error(f"오류 타입: {type(e).__name__}")
        current_app.logger.error(f"오류 상세: {str(e)}")
        import traceback
        current_app.logger.error(f"스택 트레이스: {traceback.format_exc()}")
        return jsonify({"error": f"로그인 처리 중 오류가 발생했습니다: {str(e)}"}), 500

@bp.get("/check-session")
@handle_errors()
@log_access()
def check_session():
    """세션 상태 확인"""
    try:
        if 'user_id' in session:
            user_service = get_user_service()
            if user_service:
                user = user_service.get_user_by_id(session['user_id'])
                if user and user.is_active:
                    current_app.logger.info(f"세션 확인 성공: {user.email}")
                    return jsonify({
                        "logged_in": True,
                        "user": {
                            "id": user.id,
                            "email": user.email,
                            "name": user.name,
                            "role": user.role,
                            "status": user.status
                        }
                    })
        
        current_app.logger.info("세션 없음 또는 만료됨")
        return jsonify({"logged_in": False, "user": None})
        
    except Exception as e:
        current_app.logger.error(f"세션 확인 중 오류 발생: {str(e)}")
        return jsonify({"logged_in": False, "user": None, "error": str(e)})

@bp.post("/auto-login")
@handle_errors()
@log_access()
def auto_login():
    """자동 로그인 (localStorage 기반)"""
    try:
        user_email = request.headers.get('X-User')
        if not user_email:
            return jsonify({"error": "사용자 정보가 없습니다."}), 400
        
        user_service = get_user_service()
        if not user_service:
            return jsonify({"error": "사용자 서비스를 사용할 수 없습니다."}), 500
        
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active:
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
        
        # 세션에 사용자 정보 저장
        session["user_id"] = user.id
        session["user_email"] = user.email
        session["user_name"] = user.name
        session["user_role"] = user.role
        
        current_app.logger.info(f"자동 로그인 성공: {user.email}")
        log_security_event('AUTO_LOGIN_SUCCESS', f'User auto-logged in: {user.email}')
        
        return jsonify({
            "message": "자동 로그인되었습니다.",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "status": user.status
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"자동 로그인 중 오류 발생: {str(e)}")
        return jsonify({"error": f"자동 로그인 처리 중 오류가 발생했습니다: {str(e)}"}), 500

@bp.post("/logout")
@handle_errors()
@log_access()
def logout():
    """사용자 로그아웃"""
    user_email = session.get("user_email")
    if user_email:
        log_security_event('LOGOUT', f'User logged out: {user_email}')
    
    session.clear()
    return jsonify({"message": "로그아웃되었습니다."})

@bp.get("/me")
@handle_errors()
def get_current_user():
    """현재 로그인한 사용자 정보 조회"""
    user_id = session.get("user_id")
    user_email = request.headers.get("X-User")
    
    user_service = get_user_service()
    user = None
    
    # 세션 기반 인증 확인
    if user_id:
        user = user_service.get_user_by_id(user_id)
        if not user or not user.is_active():
            session.clear()
            return jsonify({"error": "유효하지 않은 세션입니다."}), 401
    
    # X-User 헤더 기반 인증 확인
    elif user_email:
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
    
    # 인증되지 않은 경우
    if not user:
        return jsonify({"error": "로그인이 필요합니다."}), 401
    
    return jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "status": user.status,
            "created_at": user.created_at,
            "approved_at": user.approved_at,
            "last_login": user.last_login
        }
    })

@bp.put("/change-password")
@validate_json("old_password", "new_password")
@handle_errors()
def change_password():
    """비밀번호 변경"""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "로그인이 필요합니다."}), 401
    
    data = request.get_json()
    old_password = data["old_password"]
    new_password = data["new_password"]
    
    user_service = get_user_service()
    if not user_service.change_password(user_id, old_password, new_password):
        return jsonify({"error": "현재 비밀번호가 올바르지 않습니다."}), 400
    
    log_security_event('PASSWORD_CHANGED', f'Password changed for user: {user_id}')
    return jsonify({"message": "비밀번호가 변경되었습니다."})

@bp.post("/reset-password")
@require_user()
@validate_json("user_id", "new_password")
@handle_errors()
def reset_password():
    """비밀번호 초기화 (관리자용)"""
    try:
        data = request.get_json()
        user_id = data["user_id"]
        new_password = data["new_password"]
        
        # 관리자 권한 확인
        current_user_email = session.get("user_email")
        if not current_user_email:
            return jsonify({"error": "로그인이 필요합니다."}), 401
        
        user_service = get_user_service()
        current_user = user_service.get_user_by_email(current_user_email)
        
        if not current_user or not current_user.is_admin():
            return jsonify({"error": "관리자 권한이 필요합니다."}), 403
        
        # 대상 사용자 조회
        target_user = user_service.get_user_by_id(user_id)
        if not target_user:
            return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
        
        # 비밀번호 변경
        if user_service.reset_password(user_id, new_password, current_user_email):
            current_app.logger.info(f"비밀번호 재설정 완료: {target_user.email} (관리자: {current_user_email})")
            return jsonify({"message": "비밀번호가 재설정되었습니다."})
        else:
            return jsonify({"error": "비밀번호 재설정에 실패했습니다."}), 500
            
    except Exception as e:
        current_app.logger.error(f"비밀번호 재설정 중 오류 발생: {str(e)}")
        return jsonify({"error": "비밀번호 재설정 중 오류가 발생했습니다."}), 500

@bp.post("/reset-password-temp")
@validate_json("email")
@handle_errors()
@log_access()
def reset_password_temp():
    """임시 비밀번호로 비밀번호 재설정 (사용자용)"""
    try:
        data = request.get_json()
        email = data["email"].lower().strip()
        
        current_app.logger.info(f"임시 비밀번호 재설정 요청: {email}")
        
        # 사용자 조회
        user_service = get_user_service()
        user = user_service.get_user_by_email(email)
        
        if not user:
            current_app.logger.warning(f"임시 비밀번호 재설정 실패 - 사용자 없음: {email}")
            return jsonify({"error": "등록되지 않은 이메일입니다."}), 404
        
        # 임시 비밀번호 생성 (8자리 랜덤)
        import secrets
        import string
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        
        # 비밀번호 재설정
        if user_service.reset_password(user.id, temp_password, "system"):
            current_app.logger.info(f"임시 비밀번호 설정 완료: {email} (임시 비밀번호: {temp_password})")
            return jsonify({
                "message": "임시 비밀번호가 설정되었습니다.",
                "temp_password": temp_password
            })
        else:
            return jsonify({"error": "임시 비밀번호 설정에 실패했습니다."}), 500
            
    except Exception as e:
        current_app.logger.error(f"임시 비밀번호 재설정 중 오류 발생: {str(e)}")
        return jsonify({"error": "임시 비밀번호 재설정 중 오류가 발생했습니다."}), 500

@bp.put("/profile")
@validate_json("name")
@handle_errors()
def update_profile():
    """프로필 업데이트"""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "로그인이 필요합니다."}), 401
    
    data = request.get_json()
    name = data["name"].strip()
    
    if len(name) < 2:
        return jsonify({"error": "이름은 최소 2자 이상이어야 합니다."}), 400
    
    user_service = get_user_service()
    if user_service.update_user_profile(user_id, name=name):
        # 세션 업데이트
        session["user_name"] = name
        return jsonify({"message": "프로필이 업데이트되었습니다."})
    else:
        return jsonify({"error": "프로필 업데이트에 실패했습니다."}), 400 