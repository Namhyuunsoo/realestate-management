# app/core/security.py

import time
import hashlib
import secrets
import re
from typing import Dict, List, Optional, Tuple
from functools import wraps
from flask import request, jsonify, current_app, session
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class SecurityConfig:
    """보안 설정"""
    max_login_attempts: int = 5
    lockout_duration: int = 300  # 5분
    session_timeout: int = 3600  # 1시간
    max_requests_per_minute: int = 100
    allowed_ips: List[str] = None
    blocked_ips: List[str] = None
    require_https: bool = False
    csrf_protection: bool = True

class SecurityManager:
    """보안 관리자"""
    
    def __init__(self):
        self.login_attempts: Dict[str, List[float]] = {}
        self.blocked_ips: Dict[str, float] = {}
        self.request_counts: Dict[str, List[float]] = {}
        self.sessions: Dict[str, Dict] = {}
        
    def is_ip_allowed(self, ip: str) -> bool:
        """IP 허용 여부 확인"""
        # 차단된 IP 확인
        if ip in self.blocked_ips:
            block_time = self.blocked_ips[ip]
            if time.time() - block_time < 3600:  # 1시간 차단
                return False
            else:
                del self.blocked_ips[ip]
        
        # 허용된 IP 목록 확인
        allowed_ips = current_app.config.get('ALLOWED_IPS', [])
        if allowed_ips and ip not in allowed_ips:
            return False
            
        return True
    
    def check_rate_limit(self, ip: str) -> bool:
        """요청 빈도 제한 확인"""
        now = time.time()
        if ip not in self.request_counts:
            self.request_counts[ip] = []
        
        # 1분 이전 요청들 제거
        self.request_counts[ip] = [t for t in self.request_counts[ip] if now - t < 60]
        
        # 요청 수 확인
        max_requests = current_app.config.get('MAX_REQUESTS_PER_MINUTE', 100)
        if len(self.request_counts[ip]) >= max_requests:
            return False
        
        self.request_counts[ip].append(now)
        return True
    
    def record_login_attempt(self, ip: str, success: bool):
        """로그인 시도 기록"""
        if ip not in self.login_attempts:
            self.login_attempts[ip] = []
        
        now = time.time()
        
        if success:
            # 성공 시 기록 초기화
            self.login_attempts[ip] = []
        else:
            # 실패 시 기록 추가
            self.login_attempts[ip].append(now)
            
            # 5분 이전 기록 제거
            self.login_attempts[ip] = [t for t in self.login_attempts[ip] if now - t < 300]
            
            # 최대 시도 횟수 초과 시 IP 차단
            max_attempts = current_app.config.get('MAX_LOGIN_ATTEMPTS', 5)
            if len(self.login_attempts[ip]) >= max_attempts:
                self.blocked_ips[ip] = now
                logger.warning(f"IP {ip} blocked due to too many login attempts")
    
    def is_ip_blocked(self, ip: str) -> bool:
        """IP 차단 여부 확인"""
        if ip in self.blocked_ips:
            block_time = self.blocked_ips[ip]
            if time.time() - block_time < 3600:  # 1시간 차단
                return True
            else:
                del self.blocked_ips[ip]
        return False
    
    def validate_session(self, session_id: str) -> bool:
        """세션 유효성 확인"""
        if session_id not in self.sessions:
            return False
        
        session_data = self.sessions[session_id]
        if time.time() - session_data['created_at'] > 3600:  # 1시간 만료
            del self.sessions[session_id]
            return False
        
        return True
    
    def create_session(self, user_id: str) -> str:
        """새 세션 생성"""
        session_id = secrets.token_urlsafe(32)
        self.sessions[session_id] = {
            'user_id': user_id,
            'created_at': time.time(),
            'last_activity': time.time()
        }
        return session_id
    
    def update_session(self, session_id: str):
        """세션 활동 시간 업데이트"""
        if session_id in self.sessions:
            self.sessions[session_id]['last_activity'] = time.time()

# 전역 보안 관리자 인스턴스
security_manager = SecurityManager()

def require_https():
    """HTTPS 요구 데코레이터"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if current_app.config.get('REQUIRE_HTTPS', False):
                if not request.is_secure:
                    return jsonify({"error": "HTTPS required"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def rate_limit():
    """요청 빈도 제한 데코레이터"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip = request.remote_addr
            
            # IP 허용 여부 확인
            if not security_manager.is_ip_allowed(ip):
                return jsonify({"error": "Access denied"}), 403
            
            # IP 차단 여부 확인
            if security_manager.is_ip_blocked(ip):
                return jsonify({"error": "IP temporarily blocked"}), 429
            
            # 요청 빈도 제한 확인
            if not security_manager.check_rate_limit(ip):
                return jsonify({"error": "Rate limit exceeded"}), 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_input():
    """입력 검증 데코레이터"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # XSS 방지를 위한 입력 검증
            if request.method in ['POST', 'PUT']:
                data = request.get_json() or {}
                for key, value in data.items():
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
                            if re.search(pattern, value, re.IGNORECASE):
                                return jsonify({"error": "Invalid input detected"}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def log_security_event(event_type: str, details: str = ""):
    """보안 이벤트 로깅"""
    ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    
    log_message = f"[SECURITY] {timestamp} - {event_type} - IP: {ip} - UA: {user_agent}"
    if details:
        log_message += f" - {details}"
    
    logger.warning(log_message)

def generate_csrf_token() -> str:
    """CSRF 토큰 생성"""
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_hex(32)
    return session['csrf_token']

def validate_csrf_token():
    """CSRF 토큰 검증 데코레이터"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_app.config.get('CSRF_PROTECTION', True):
                return f(*args, **kwargs)
            
            if request.method in ['POST', 'PUT', 'DELETE']:
                token = request.headers.get('X-CSRF-Token') or request.form.get('csrf_token')
                if not token or token != session.get('csrf_token'):
                    log_security_event('CSRF_ATTEMPT', f'Invalid token: {token}')
                    return jsonify({"error": "Invalid CSRF token"}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def sanitize_filename(filename: str) -> str:
    """파일명 정리 (경로 순회 공격 방지)"""
    # 위험한 문자들 제거
    dangerous_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    for char in dangerous_chars:
        filename = filename.replace(char, '_')
    
    # 상대 경로 제거
    if filename.startswith('..'):
        filename = filename[2:]
    
    return filename

def validate_file_upload(file) -> bool:
    """파일 업로드 검증"""
    if not file:
        return False
    
    # 파일 크기 제한 (10MB)
    max_size = 10 * 1024 * 1024
    if len(file.read()) > max_size:
        file.seek(0)  # 파일 포인터 리셋
        return False
    
    file.seek(0)  # 파일 포인터 리셋
    
    # 허용된 파일 확장자
    allowed_extensions = {'.txt', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif'}
    filename = file.filename.lower()
    if not any(filename.endswith(ext) for ext in allowed_extensions):
        return False
    
    return True 