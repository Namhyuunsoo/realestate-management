# listings.py
# app/routes/listings.py

from flask import current_app
import json
from flask import Blueprint, request, jsonify, session
from ..services.listings_loader import load_listings
from ..services.sheet_fetcher import clear_listing_cache
from ..core.decorators import require_user
from ..core.lazy_init import ensure_background_services

bp = Blueprint("listings", __name__)

@bp.route("/api/listings")
@require_user()
def api_listings():
    # 백그라운드 서비스 지연 초기화
    ensure_background_services()
    
    # 데코레이터에서 이미 사용자 인증 완료, request.current_user 사용
    user = request.current_user
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
                    data = [d for d in data if d.get("fields", {}).get("담당자") == manager_name]
                else:
                    # 담당자명이 설정되지 않은 경우 빈 결과 반환
                    data = []
        except Exception as filter_error:
            current_app.logger.error(f"❌ 역할별 필터링 중 오류: {filter_error}")
            # 필터링 실패 시 모든 매물 조회 (안전한 기본값)

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