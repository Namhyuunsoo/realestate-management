"""
run/app/routes/auth_naver.py
네이버 아이디 로그인(OAuth2) 처리 라우트
- /auth/naver/login     : 네이버 인증 페이지로 리다이렉트
- /auth/naver/callback  : 콜백 처리(토큰 발급 → 사용자 정보 조회 → 세션 저장)
- /auth/logout          : 로그아웃(세션 정리)
- /api/me               : 현재 세션 사용자 정보 반환(JSON)
"""
import os
import secrets
import time
import requests
from urllib.parse import urlencode

from flask import Blueprint, current_app, redirect, request, session, jsonify, make_response

bp = Blueprint("auth_naver", __name__)

NAVER_AUTH_URL = "https://nid.naver.com/oauth2.0/authorize"
NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token"
NAVER_USERINFO_URL = "https://openapi.naver.com/v1/nid/me"

def _get_cfg(name: str) -> str:
    return current_app.config.get(name) or os.environ.get(name) or ""

def _require_config(*keys):
    for k in keys:
        if not _get_cfg(k):
            raise RuntimeError(f"필수 설정 {k} 가 누락되었습니다. .env 또는 config에 값을 넣어주세요.")

@bp.route("/auth/naver/login")
def naver_login():
    """
    네이버 로그인 페이지로 이동
    """
    _require_config("NAVER_LOGIN_CLIENT_ID", "NAVER_LOGIN_CLIENT_SECRET", "NAVER_LOGIN_REDIRECT_URI")

    state = secrets.token_urlsafe(16)
    session["naver_oauth_state"] = state
    session["naver_oauth_state_ts"] = int(time.time())

    params = {
        "response_type": "code",
        "client_id": _get_cfg("NAVER_LOGIN_CLIENT_ID"),
        "redirect_uri": _get_cfg("NAVER_LOGIN_REDIRECT_URI"),
        "state": state,
        "scope": "name"
    }
    return redirect(f"{NAVER_AUTH_URL}?{urlencode(params)}")

@bp.route("/auth/naver/callback")
def naver_callback():
    """
    콜백 처리: code/state 검증 → 토큰 교환 → 사용자 정보 조회 → 세션 저장
    허용/관리자 이메일 검사 포함
    """
    try:
        _require_config("NAVER_LOGIN_CLIENT_ID", "NAVER_LOGIN_CLIENT_SECRET", "NAVER_LOGIN_REDIRECT_URI")

        code = request.args.get("code")
        state = request.args.get("state")
        error = request.args.get("error")
        error_description = request.args.get("error_description")
        
        # 에러 체크
        if error:
            current_app.logger.error(f"네이버 로그인 에러: {error} - {error_description}")
            return f"네이버 로그인 에러: {error_description or error}", 400
        
        stored_state = session.get("naver_oauth_state")
        if not code or not state or state != stored_state:
            current_app.logger.error(f"State mismatch: received={state}, stored={stored_state}")
            return "잘못된 접근(state mismatch)", 400

        # state 정리
        session.pop("naver_oauth_state", None)
        session.pop("naver_oauth_state_ts", None)

        # 1) 토큰 요청
        token_params = {
            "grant_type": "authorization_code",
            "client_id": _get_cfg("NAVER_LOGIN_CLIENT_ID"),
            "client_secret": _get_cfg("NAVER_LOGIN_CLIENT_SECRET"),
            "code": code,
            "state": state
        }
        
        current_app.logger.info("네이버 토큰 요청 시작")
        token_res = requests.post(NAVER_TOKEN_URL, data=token_params, timeout=10)
        
        if token_res.status_code != 200:
            current_app.logger.error(f"토큰 요청 실패: {token_res.status_code} - {token_res.text}")
            return f"토큰 요청 실패: {token_res.text}", 400
            
        token_json = token_res.json()
        access_token = token_json.get("access_token")
        if not access_token:
            current_app.logger.error(f"토큰 응답에 access_token 없음: {token_json}")
            return f"토큰 응답에 access_token 없음: {token_json}", 400

        # 2) 사용자 정보 요청
        headers = {"Authorization": f"Bearer {access_token}"}
        current_app.logger.info("네이버 사용자 정보 요청 시작")
        ures = requests.get(NAVER_USERINFO_URL, headers=headers, timeout=10)
        
        if ures.status_code != 200:
            current_app.logger.error(f"사용자 정보 요청 실패: {ures.status_code} - {ures.text}")
            return f"사용자 정보 요청 실패: {ures.text}", 400
            
        ujson = ures.json()

        if ujson.get("resultcode") != "00":
            current_app.logger.error(f"사용자 정보 응답 에러: {ujson}")
            return f"사용자 정보 응답 에러: {ujson}", 400

        data = ujson.get("response", {})
        email = (data.get("email") or "").lower()
        name = data.get("name", "")
        uid  = data.get("id", "")

        current_app.logger.info(f"네이버 로그인 성공: {email} ({name}) - ID: {uid}")

        # ===== 허용/관리자 체크 =====
        allowed = current_app.config.get("ALLOWED_USERS", [])
        admins  = current_app.config.get("ADMIN_USERS", [])

        # 이메일이 없으면 네이버 ID로 확인
        if not email:
            current_app.logger.warning(f"이메일이 없어서 네이버 ID로 확인: {uid}")
            if allowed and uid not in allowed:
                current_app.logger.warning(f"허용되지 않은 사용자 시도: {uid}")
                return make_response("허용되지 않은 사용자입니다.", 403)
            is_admin = uid in admins
        else:
            # 이메일로 어드민 권한 확인
            if allowed and email not in allowed:
                current_app.logger.warning(f"허용되지 않은 사용자 시도: {email}")
                return make_response("허용되지 않은 사용자입니다.", 403)
            is_admin = email in admins
        
        current_app.logger.info(f"사용자 권한: {email or uid} - {'어드민' if is_admin else '일반사용자'}")

        # 세션 저장
        session["user"] = {
            "provider": "naver",
            "id": uid,
            "email": email,
            "name": name,
            "is_admin": is_admin
        }

        # 로그인 후 메인 페이지로
        return make_response(redirect("/static/index.html"))
        
    except Exception as e:
        current_app.logger.error(f"네이버 로그인 콜백 처리 중 예외 발생: {str(e)}")
        return "로그인 처리 중 오류가 발생했습니다.", 500

@bp.route("/auth/logout")
def logout():
    session.pop("user", None)
    return redirect("/static/index.html")

@bp.route("/api/me")
def api_me():
    # 1. 세션 기반 사용자 확인
    u = session.get("user")
    if u:
        return jsonify({
            "logged_in": True,
            "email": u.get("email"),
            "name": u.get("name"),
            "provider": u.get("provider", "naver"),
            "id": u.get("id"),
            "is_admin": bool(u.get("is_admin"))
        })
    
    # 2. X-User 헤더 기반 사용자 확인 (임시 로그인)
    user_email = request.headers.get("X-User", "").strip()
    if user_email:
        # 어드민 권한 확인
        admin_users = current_app.config.get("ADMIN_USERS", [])
        is_admin = user_email.lower() in admin_users
        
        return jsonify({
            "logged_in": True,
            "email": user_email,
            "name": "",
            "provider": "manual",
            "id": "",
            "is_admin": is_admin
        })
    
    # 3. 로그인되지 않음
    return jsonify({"logged_in": False})

@bp.route("/auth/debug_config")
def debug_config():
    allowed = current_app.config.get("ALLOWED_USERS", [])
    admins = current_app.config.get("ADMIN_USERS", [])
    return jsonify({"allowed_users": allowed, "admin_users": admins})

@bp.route("/api/check-admin", methods=["POST"])
def check_admin():
    """임시 로그인 사용자의 어드민 권한 확인"""
    data = request.get_json()
    email = data.get("email", "").lower() if data else ""
    
    if not email:
        return jsonify({"error": "이메일이 필요합니다."}), 400
    
    # 어드민 목록에서 확인
    admin_users = current_app.config.get("ADMIN_USERS", [])
    is_admin = email in admin_users
    
    return jsonify({
        "email": email,
        "is_admin": is_admin,
        "admin_users": admin_users
    })
