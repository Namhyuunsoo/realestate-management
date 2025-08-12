# listings.py
# app/routes/listings.py

from flask import current_app
import json
from flask import Blueprint, request, jsonify, session
from ..services.listings_loader import load_listings

bp = Blueprint("listings", __name__)

@bp.route("/api/listings")
def api_listings():
    # 사용자 인증 확인 (세션 또는 X-User 헤더)
    user_id = session.get("user_id")
    user_email = request.headers.get("X-User")
    
    if not user_id and not user_email:
        current_app.logger.warning(f"Unauthorized access attempt from IP {request.remote_addr}")
        return jsonify({"error": "로그인이 필요합니다."}), 401
    
    # 사용자 서비스로 사용자 확인
    user_service = current_app.data_manager.user_service
    user = None
    
    if user_id:
        # 세션 기반 인증
        user = user_service.get_user_by_id(user_id)
        if not user or not user.is_active():
            session.clear()
            current_app.logger.warning(f"Invalid session {user_id} from IP {request.remote_addr}")
            return jsonify({"error": "유효하지 않은 세션입니다."}), 401
    elif user_email:
        # X-User 헤더 기반 인증
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            current_app.logger.warning(f"Invalid X-User header: {user_email} from IP {request.remote_addr}")
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
    
    if not user:
        current_app.logger.warning(f"User not found from IP {request.remote_addr}")
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 401
    
    current_app.logger.info(f"Listings request from user: {user.email} (IP: {request.remote_addr})")
    
    force = request.args.get("force") == "1"
    status_raw = request.args.get("status_raw")
    limit = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))

    data = load_listings(force_reload=force)

    # 필터
    if status_raw:
        data = [d for d in data if d.get("status_raw") == status_raw]

    total = len(data)
    sliced = data[offset:offset+limit]

    resp_dict = {
        "items": sliced,
        "total": total,
        "limit": limit,
        "offset": offset
    }
    return current_app.response_class(
        json.dumps(resp_dict, ensure_ascii=False),
        mimetype="application/json; charset=utf-8"
    )