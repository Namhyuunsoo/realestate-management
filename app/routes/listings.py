# listings.py
# app/routes/listings.py

from flask import current_app
import json
from flask import Blueprint, request, jsonify, session
from ..services.listings_loader import load_listings
from ..services.sheet_fetcher import clear_listing_cache

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

    # 강제 새로고침 요청 시 로그
    if force:
        current_app.logger.info(f"🔄 강제 새로고침 요청: {user.email} (IP: {request.remote_addr})")

    # force 파라미터를 제대로 전달
    try:
        data = load_listings(force_reload=force)
    except Exception as e:
        current_app.logger.error(f"❌ load_listings 실패: {str(e)}")
        current_app.logger.error(f"❌ 에러 타입: {type(e).__name__}")
        import traceback
        current_app.logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
        return jsonify({"error": f"데이터 로드 실패: {str(e)}"}), 500

    # 필터
    if status_raw:
        data = [d for d in data if d.get("status_raw") == status_raw]
    
    # 역할별 매물 필터링 (안전한 처리)
    if user and hasattr(user, 'is_user') and hasattr(user, 'is_manager') and hasattr(user, 'is_admin'):
        try:
            if user.is_user():
                # 일반 사용자는 본인 담당 매물만 조회
                manager_name = getattr(user, 'manager_name', '')
                if manager_name:
                    data = [d for d in data if d.get("담당자") == manager_name]
                    current_app.logger.info(f"User {user.email} filtered listings by manager_name: {manager_name} ({len(data)} items)")
                else:
                    # 담당자명이 설정되지 않은 경우 빈 결과 반환
                    data = []
                    current_app.logger.info(f"User {user.email} has no manager_name set, returning empty results")
            elif user.is_manager():
                # 매니저는 모든 매물 조회 가능
                current_app.logger.info(f"Manager {user.email} accessing all listings ({len(data)} items)")
            elif user.is_admin():
                # 어드민은 모든 매물 조회 가능
                current_app.logger.info(f"Admin {user.email} accessing all listings ({len(data)} items)")
            else:
                # 역할이 명확하지 않은 경우 모든 매물 조회 (기본값)
                current_app.logger.info(f"User {user.email} with unknown role accessing all listings ({len(data)} items)")
        except Exception as filter_error:
            current_app.logger.error(f"❌ 역할별 필터링 중 오류: {filter_error}")
            # 필터링 실패 시 모든 매물 조회 (안전한 기본값)
            current_app.logger.info(f"Fallback: User {user.email} accessing all listings due to filter error ({len(data)} items)")
    else:
        # 사용자 객체가 없거나 메서드가 없는 경우 모든 매물 조회
        current_app.logger.warning(f"User object or role methods not available, accessing all listings ({len(data)} items)")

    total = len(data)
    sliced = data[offset:offset+limit]

    resp_dict = {
        "items": sliced,
        "total": total,
        "limit": limit,
        "offset": offset,
        "force_reload": force,
        "cache_used": not force
    }
    return current_app.response_class(
        json.dumps(resp_dict, ensure_ascii=False),
        mimetype="application/json; charset=utf-8"
    )

@bp.route("/api/listings/clear-cache", methods=["POST"])
def clear_listings_cache():
    """매물 캐시 강제 삭제 (관리자용)"""
    try:
        if clear_listing_cache():
            current_app.logger.info("매물 캐시 삭제 완료")
            return jsonify({
                "success": True,
                "message": "매물 캐시가 삭제되었습니다. 다음 요청 시 파일에서 새로 로드됩니다."
            })
        else:
            return jsonify({
                "success": False,
                "message": "캐시 파일이 존재하지 않습니다."
            })
            
    except Exception as e:
        current_app.logger.error(f"캐시 삭제 실패: {e}")
        return jsonify({
            "success": False,
            "message": f"캐시 삭제 실패: {str(e)}"
        }), 500