# listings.py
# app/routes/listings.py

from flask import current_app
import json
from flask import Blueprint, request, jsonify, session
from ..services.listings_loader import load_listings
from ..services.housing_listings_service import fetch_housing_listings
from ..services.sheet_fetcher import clear_listing_cache
from ..core.decorators import require_user, validate_csrf_token, require_admin, require_manager_or_admin
from ..services.user_service import mask_email, mask_ip
from ..core.lazy_init import ensure_background_services

from ..services.commercial_listings_service import fetch_all_commercial_listings, SUPABASE_AVAILABLE

bp = Blueprint("listings", __name__)

@bp.route("/api/listings")
@require_user()
@validate_csrf_token()
def api_listings():
    # 백그라운드 서비스 지연 초기화
    ensure_background_services()
    
    # 데코레이터에서 이미 사용자 인증 완료, request.current_user 사용
    user = request.current_user
    current_app.logger.info(f"Listings request from user: {mask_email(user.email)} (IP: {mask_ip(request.remote_addr)})")
    
    force = request.args.get("force") == "1"
    status_raw = request.args.get("status_raw")
    subtype = request.args.get("subtype") # 상가 하위 카테고리 (lease, unit, land)
    # 매물 데이터 접근 제한 제거
    requested_limit = int(request.args.get("limit", 100))
    limit = requested_limit  
    offset = int(request.args.get("offset", 0))

    # 강제 새로고침 요청 시 로그
    if force:
        current_app.logger.info(f"🔄 강제 새로고침 요청: {mask_email(user.email)} (IP: {mask_ip(request.remote_addr)})")

    try:
        # Supabase 사용 가능 시 Supabase에서 로드, 아니면 레거시 로컬 파일 사용
        if SUPABASE_AVAILABLE:
            data = fetch_all_commercial_listings(subtype=subtype)
            current_app.logger.info(f"✅ Supabase에서 {len(data)}개 매물 로드됨 (subtype: {subtype})")
        else:
            data = load_listings(force_reload=force)
            current_app.logger.info(f"ℹ️ 로컬 파일에서 {len(data)}개 매물 로드됨 (Supabase 미사용)")
    except Exception as e:
        current_app.logger.error(f"❌ 데이터 로드 실패: {str(e)}")
        return jsonify({"error": f"데이터 로드 실패: {str(e)}"}), 500

    # 필터 (현황 필터)
    if status_raw:
        data = [d for d in data if d.get("status_raw") == status_raw]
    
    # 역할별 필터링 없음 — 시트에 있는 매물은 담당자/사용자 등록 여부 무관하게 전체 표시
    current_app.logger.info(f"✅ 전체 매물 {len(data)}개 반환 (사용자: {mask_email(user.email)})")

    total = len(data)
    sliced = data[offset:offset+limit]

    resp_dict = {
        "items": sliced,
        "total": total,
        "limit": limit,
        "offset": offset,
        "force_reload": force,
        "cache_used": not force and not SUPABASE_AVAILABLE
    }
    return current_app.response_class(
        json.dumps(resp_dict, ensure_ascii=False),
        mimetype="application/json; charset=utf-8"
    )

@bp.route("/api/listings/housing")
@require_user()
@require_manager_or_admin()
@validate_csrf_token()
def api_listings_housing():
    """주택 매물 조회 API (매니저·어드민만)"""
    user = request.current_user
    current_app.logger.info(f"Housing listings request from user: {mask_email(user.email)}")

    subtype = request.args.get("subtype", "sale")
    status_raw = request.args.get("status_raw")
    limit = int(request.args.get("limit", 100000))
    offset = int(request.args.get("offset", 0))

    try:
        data = fetch_housing_listings(subtype=subtype, status_raw=status_raw, limit=limit, offset=offset)
    except Exception as e:
        current_app.logger.error(f"Housing listings fetch failed: {e}")
        return jsonify({"error": str(e)}), 500

    if "error" in data and data["error"]:
        return jsonify({"error": data["error"]}), 400

    resp_dict = {
        "items": data["items"],
        "total": data["total"],
        "limit": data["limit"],
        "offset": data["offset"],
        "force_reload": False,
        "cache_used": False,
    }
    return current_app.response_class(
        json.dumps(resp_dict, ensure_ascii=False),
        mimetype="application/json; charset=utf-8",
    )


@bp.route("/api/listings/clear-cache", methods=["POST"])
@require_admin()
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