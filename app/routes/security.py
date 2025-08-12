# app/routes/security.py

from flask import Blueprint, request, jsonify, current_app
from app.core.decorators import require_admin, log_access, handle_errors
from app.core.security import security_manager, log_security_event
import time

bp = Blueprint("security", __name__, url_prefix="/api/security")

@bp.get("/status")
@require_admin()
@log_access()
@handle_errors()
def get_security_status():
    """보안 상태 조회"""
    ip = request.remote_addr
    
    # 현재 보안 상태 정보
    status = {
        "current_ip": ip,
        "is_blocked": security_manager.is_ip_blocked(ip),
        "is_allowed": security_manager.is_ip_allowed(ip),
        "login_attempts": len(security_manager.login_attempts.get(ip, [])),
        "request_count": len(security_manager.request_counts.get(ip, [])),
        "blocked_ips_count": len(security_manager.blocked_ips),
        "active_sessions_count": len(security_manager.sessions),
        "timestamp": time.time()
    }
    
    return jsonify(status)

@bp.get("/blocked-ips")
@require_admin()
@log_access()
@handle_errors()
def get_blocked_ips():
    """차단된 IP 목록 조회"""
    blocked_ips = []
    current_time = time.time()
    
    for ip, block_time in security_manager.blocked_ips.items():
        remaining_time = 3600 - (current_time - block_time)
        if remaining_time > 0:
            blocked_ips.append({
                "ip": ip,
                "blocked_at": block_time,
                "remaining_time": int(remaining_time),
                "reason": "Too many login attempts"
            })
    
    return jsonify({"blocked_ips": blocked_ips})

@bp.post("/block-ip")
@require_admin()
@log_access()
@handle_errors()
def block_ip():
    """IP 수동 차단"""
    data = request.get_json() or {}
    ip = data.get("ip")
    reason = data.get("reason", "Manual block")
    
    if not ip:
        return jsonify({"error": "IP address required"}), 400
    
    security_manager.blocked_ips[ip] = time.time()
    log_security_event('MANUAL_IP_BLOCK', f'IP {ip} manually blocked by admin: {reason}')
    
    return jsonify({"message": f"IP {ip} blocked successfully", "reason": reason})

@bp.delete("/unblock-ip/<ip>")
@require_admin()
@log_access()
@handle_errors()
def unblock_ip(ip):
    """IP 차단 해제"""
    if ip in security_manager.blocked_ips:
        del security_manager.blocked_ips[ip]
        log_security_event('MANUAL_IP_UNBLOCK', f'IP {ip} manually unblocked by admin')
        return jsonify({"message": f"IP {ip} unblocked successfully"})
    else:
        return jsonify({"error": "IP not found in blocked list"}), 404

@bp.get("/login-attempts")
@require_admin()
@log_access()
@handle_errors()
def get_login_attempts():
    """로그인 시도 기록 조회"""
    attempts = []
    current_time = time.time()
    
    for ip, attempt_times in security_manager.login_attempts.items():
        recent_attempts = [t for t in attempt_times if current_time - t < 300]  # 5분 이내
        if recent_attempts:
            attempts.append({
                "ip": ip,
                "attempt_count": len(recent_attempts),
                "last_attempt": max(recent_attempts),
                "is_blocked": security_manager.is_ip_blocked(ip)
            })
    
    return jsonify({"login_attempts": attempts})

@bp.get("/request-stats")
@require_admin()
@log_access()
@handle_errors()
def get_request_stats():
    """요청 통계 조회"""
    stats = []
    current_time = time.time()
    
    for ip, request_times in security_manager.request_counts.items():
        recent_requests = [t for t in request_times if current_time - t < 60]  # 1분 이내
        if recent_requests:
            stats.append({
                "ip": ip,
                "request_count": len(recent_requests),
                "last_request": max(recent_requests),
                "is_rate_limited": len(recent_requests) >= current_app.config.get('MAX_REQUESTS_PER_MINUTE', 100)
            })
    
    return jsonify({"request_stats": stats})

@bp.post("/clear-stats")
@require_admin()
@log_access()
@handle_errors()
def clear_security_stats():
    """보안 통계 초기화"""
    security_manager.login_attempts.clear()
    security_manager.request_counts.clear()
    security_manager.blocked_ips.clear()
    security_manager.sessions.clear()
    
    log_security_event('SECURITY_STATS_CLEARED', 'Security statistics cleared by admin')
    return jsonify({"message": "Security statistics cleared successfully"})

@bp.get("/config")
@require_admin()
@log_access()
@handle_errors()
def get_security_config():
    """보안 설정 조회"""
    config = {
        "max_login_attempts": current_app.config.get('MAX_LOGIN_ATTEMPTS', 5),
        "lockout_duration": current_app.config.get('LOCKOUT_DURATION', 300),
        "session_timeout": current_app.config.get('SESSION_TIMEOUT', 3600),
        "max_requests_per_minute": current_app.config.get('MAX_REQUESTS_PER_MINUTE', 100),
        "allowed_ips": current_app.config.get('ALLOWED_IPS', []),
        "blocked_ips": current_app.config.get('BLOCKED_IPS', []),
        "require_https": current_app.config.get('REQUIRE_HTTPS', False),
        "csrf_protection": current_app.config.get('CSRF_PROTECTION', True)
    }
    
    return jsonify(config) 