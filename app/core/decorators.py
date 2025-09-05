# app/core/decorators.py

from functools import wraps
from flask import request, jsonify, current_app, session
from typing import Optional, Tuple, Any
from .security import security_manager, rate_limit, validate_input, log_security_event, validate_csrf_token

def require_user():
    """사용자 인증 데코레이터 (세션 기반 또는 X-User 헤더 기반)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # IP 차단 확인
            ip = request.remote_addr
            if security_manager.is_ip_blocked(ip):
                log_security_event('BLOCKED_IP_ACCESS', f'IP {ip} is blocked')
                return jsonify({"error": "Access denied"}), 403
            
            # 요청 빈도 제한 확인
            if not security_manager.check_rate_limit(ip):
                log_security_event('RATE_LIMIT_EXCEEDED', f'IP {ip} exceeded rate limit')
                return jsonify({"error": "Rate limit exceeded"}), 429
            
            # 사용자 인증 확인 (세션 또는 X-User 헤더)
            user_id = session.get("user_id")
            user_email = request.headers.get("X-User")
            
            # 둘 다 없는 경우
            if not user_id and not user_email:
                log_security_event('UNAUTHORIZED_ACCESS', f'No session or X-User header from IP {ip}')
                return jsonify({"error": "로그인이 필요합니다."}), 401
            
            # 세션 기반 인증 확인
            if user_id:
                try:
                    user_service = current_app.data_manager.user_service
                    user = user_service.get_user_by_id(user_id)
                    if not user or not user.is_active():
                        session.clear()
                        log_security_event('INVALID_SESSION', f'Invalid session {user_id} from IP {ip}')
                        return jsonify({"error": "유효하지 않은 세션입니다."}), 401
                    # 세션이 유효하면 계속 진행
                except Exception as e:
                    log_security_event('SESSION_ERROR', f'Session error for {user_id} from IP {ip}: {str(e)}')
                    session.clear()
                    return jsonify({"error": "세션 오류가 발생했습니다."}), 401
            
            # X-User 헤더 기반 인증 확인 (세션이 없거나 유효하지 않은 경우)
            elif user_email:
                try:
                    user_service = current_app.data_manager.user_service
                    user = user_service.get_user_by_email(user_email)
                    if not user or not user.is_active():
                        log_security_event('INVALID_X_USER', f'Invalid X-User header: {user_email} from IP {ip}')
                        return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
                    # X-User 헤더가 유효하면 계속 진행
                except Exception as e:
                    log_security_event('X_USER_ERROR', f'X-User error for {user_email} from IP {ip}: {str(e)}')
                    return jsonify({"error": "사용자 인증 오류가 발생했습니다."}), 401
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_admin():
    """관리자 권한 데코레이터 (세션 기반)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # IP 차단 확인
            ip = request.remote_addr
            if security_manager.is_ip_blocked(ip):
                log_security_event('BLOCKED_IP_ADMIN_ACCESS', f'Blocked IP {ip} attempted admin access')
                return jsonify({"error": "Access denied"}), 403
            
            # 요청 빈도 제한 확인
            if not security_manager.check_rate_limit(ip):
                log_security_event('RATE_LIMIT_EXCEEDED_ADMIN', f'IP {ip} exceeded rate limit for admin access')
                return jsonify({"error": "Rate limit exceeded"}), 429
            
            # 세션 기반 관리자 인증 확인
            user_id = session.get("user_id")
            if not user_id:
                log_security_event('UNAUTHORIZED_ADMIN_ACCESS', f'No session for admin access from IP {ip}')
                return jsonify({"error": "로그인이 필요합니다."}), 401
            
            # 관리자 권한 확인
            user_service = current_app.data_manager.user_service
            user = user_service.get_user_by_id(user_id)
            if not user:
                log_security_event('UNAUTHORIZED_ADMIN_ATTEMPT', f'User {user_id} not found from IP {ip}')
                return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
            if not user.is_active():
                log_security_event('UNAUTHORIZED_ADMIN_ATTEMPT', f'Inactive user {user_id} from IP {ip} attempted admin access')
                return jsonify({"error": "비활성 사용자입니다."}), 403
            if not user.is_admin():
                log_security_event('UNAUTHORIZED_ADMIN_ATTEMPT', f'Non-admin user {user_id} from IP {ip} attempted admin access')
                return jsonify({"error": "관리자 권한이 필요합니다."}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_manager_or_admin():
    """매니저 또는 관리자 권한 데코레이터 (세션 기반)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # IP 차단 확인
            ip = request.remote_addr
            if security_manager.is_ip_blocked(ip):
                log_security_event('BLOCKED_IP_MANAGER_ACCESS', f'Blocked IP {ip} attempted manager access')
                return jsonify({"error": "Access denied"}), 403
            
            # 요청 빈도 제한 확인
            if not security_manager.check_rate_limit(ip):
                log_security_event('RATE_LIMIT_EXCEEDED_MANAGER', f'IP {ip} exceeded rate limit for manager access')
                return jsonify({"error": "Rate limit exceeded"}), 429
            
            # 세션 기반 인증 확인
            user_id = session.get("user_id")
            if not user_id:
                log_security_event('UNAUTHORIZED_MANAGER_ACCESS', f'No session for manager access from IP {ip}')
                return jsonify({"error": "로그인이 필요합니다."}), 401
            
            # 매니저 또는 관리자 권한 확인
            user_service = current_app.data_manager.user_service
            user = user_service.get_user_by_id(user_id)
            if not user or not user.is_active() or not (user.is_manager() or user.is_admin()):
                log_security_event('UNAUTHORIZED_MANAGER_ATTEMPT', f'User {user_id} from IP {ip} attempted manager access')
                return jsonify({"error": "매니저 또는 관리자 권한이 필요합니다."}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_user_management():
    """사용자 관리 권한 데코레이터 (관리자만)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # IP 차단 확인
            ip = request.remote_addr
            if security_manager.is_ip_blocked(ip):
                log_security_event('BLOCKED_IP_USER_MGMT_ACCESS', f'Blocked IP {ip} attempted user management access')
                return jsonify({"error": "Access denied"}), 403
            
            # 요청 빈도 제한 확인
            if not security_manager.check_rate_limit(ip):
                log_security_event('RATE_LIMIT_EXCEEDED_USER_MGMT', f'IP {ip} exceeded rate limit for user management access')
                return jsonify({"error": "Rate limit exceeded"}), 429
            
            # 세션 기반 인증 확인
            user_id = session.get("user_id")
            if not user_id:
                log_security_event('UNAUTHORIZED_USER_MGMT_ACCESS', f'No session for user management access from IP {ip}')
                return jsonify({"error": "로그인이 필요합니다."}), 401
            
            # 사용자 관리 권한 확인 (관리자만)
            user_service = current_app.data_manager.user_service
            user = user_service.get_user_by_id(user_id)
            if not user or not user.is_active() or not user.can_manage_users():
                log_security_event('UNAUTHORIZED_USER_MGMT_ATTEMPT', f'User {user_id} from IP {ip} attempted user management access')
                return jsonify({"error": "사용자 관리 권한이 필요합니다."}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_stats_access():
    """통계 조회 권한 데코레이터 (관리자만)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # IP 차단 확인
            ip = request.remote_addr
            if security_manager.is_ip_blocked(ip):
                log_security_event('BLOCKED_IP_STATS_ACCESS', f'Blocked IP {ip} attempted stats access')
                return jsonify({"error": "Access denied"}), 403
            
            # 요청 빈도 제한 확인
            if not security_manager.check_rate_limit(ip):
                log_security_event('RATE_LIMIT_EXCEEDED_STATS', f'IP {ip} exceeded rate limit for stats access')
                return jsonify({"error": "Rate limit exceeded"}), 429
            
            # 세션 기반 인증 확인
            user_id = session.get("user_id")
            if not user_id:
                log_security_event('UNAUTHORIZED_STATS_ACCESS', f'No session for stats access from IP {ip}')
                return jsonify({"error": "로그인이 필요합니다."}), 401
            
            # 통계 조회 권한 확인 (관리자만)
            user_service = current_app.data_manager.user_service
            user = user_service.get_user_by_id(user_id)
            if not user or not user.is_active() or not user.can_view_stats():
                log_security_event('UNAUTHORIZED_STATS_ATTEMPT', f'User {user_id} from IP {ip} attempted stats access')
                return jsonify({"error": "통계 조회 권한이 필요합니다."}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_json(*required_fields):
    """JSON 요청 검증 데코레이터 (보안 강화)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                payload = request.get_json(force=True) or {}
            except Exception as e:
                log_security_event('INVALID_JSON', f'Invalid JSON from IP {request.remote_addr}: {str(e)}')
                return jsonify({"error": "Invalid JSON"}), 400
            
            # 필수 필드 검증
            missing_fields = [field for field in required_fields if field not in payload]
            if missing_fields:
                log_security_event('MISSING_REQUIRED_FIELDS', f'Missing fields: {missing_fields} from IP {request.remote_addr}')
                return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
            
            # 입력 검증 (XSS 방지)
            for key, value in payload.items():
                if isinstance(value, str):
                    # XSS 패턴 검사
                    xss_patterns = [
                        r'<script.*?>.*?</script>',
                        r'javascript:',
                        r'on\w+\s*=',
                        r'<iframe.*?>',
                        r'<object.*?>',
                        r'<embed.*?>'
                    ]
                    for pattern in xss_patterns:
                        import re
                        if re.search(pattern, value, re.IGNORECASE):
                            log_security_event('XSS_ATTEMPT', f'XSS pattern detected in field {key} from IP {request.remote_addr}')
                            return jsonify({"error": "Invalid input detected"}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def handle_errors():
    """에러 핸들링 데코레이터 (보안 강화)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except Exception as e:
                current_app.logger.error(f"Error in {f.__name__}: {str(e)}")
                log_security_event('INTERNAL_ERROR', f'Error in {f.__name__}: {str(e)} from IP {request.remote_addr}')
                return jsonify({"error": "Internal server error"}), 500
        return decorated_function
    return decorator

def require_https():
    """HTTPS 요구 데코레이터"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if current_app.config.get('REQUIRE_HTTPS', False):
                if not request.is_secure:
                    log_security_event('HTTPS_REQUIRED', f'HTTPS required but HTTP used from IP {request.remote_addr}')
                    return jsonify({"error": "HTTPS required"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_file_upload():
    """파일 업로드 검증 데코레이터"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'file' in request.files:
                file = request.files['file']
                if not file or file.filename == '':
                    return jsonify({"error": "No file selected"}), 400
                
                # 파일명 정리
                from .security import sanitize_filename, validate_file_upload
                filename = sanitize_filename(file.filename)
                
                # 파일 검증
                if not validate_file_upload(file):
                    log_security_event('INVALID_FILE_UPLOAD', f'Invalid file upload attempt from IP {request.remote_addr}')
                    return jsonify({"error": "Invalid file"}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def log_access():
    """접근 로깅 데코레이터"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip = request.remote_addr
            user_id = session.get("user_id", "anonymous")
            method = request.method
            path = request.path
            
            current_app.logger.info(f"ACCESS: {method} {path} - User: {user_id} - IP: {ip}")
            return f(*args, **kwargs)
        return decorated_function
    return decorator 