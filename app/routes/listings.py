# listings.py
# app/routes/listings.py

from flask import current_app
import json
from flask import Blueprint, request, jsonify, session
from werkzeug.utils import secure_filename
from ..services.listings_loader import load_listings
from ..services.housing_listings_service import fetch_housing_listings
from ..services.sheet_fetcher import clear_listing_cache
from ..core.decorators import require_user, validate_csrf_token, require_admin, require_manager_or_admin
from ..services.user_service import mask_email, mask_ip
from ..core.lazy_init import ensure_background_services

from ..services.commercial_listings_service import fetch_all_commercial_listings, SUPABASE_AVAILABLE
from ..core.json_utils import compact_listings

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
    select_format = request.args.get("format") # 'search_skeleton' 등 선택적 조회

    # BBox 필터링 파라미터
    try:
        min_lat = request.args.get("min_lat", type=float)
        max_lat = request.args.get("max_lat", type=float)
        min_lng = request.args.get("min_lng", type=float)
        max_lng = request.args.get("max_lng", type=float)
        bbox = (min_lat, max_lat, min_lng, max_lng) if all(v is not None for v in [min_lat, max_lat, min_lng, max_lng]) else None
    except:
        bbox = None

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
            data = fetch_all_commercial_listings(subtype=subtype, select_format=select_format, bbox=bbox)
            current_app.logger.info(f"✅ Supabase에서 {len(data)}개 매물 로드됨 (subtype: {subtype}, format: {select_format}, bbox: {bbox is not None})")
        else:
            data = load_listings(force_reload=force)
            current_app.logger.info(f"ℹ️ 로컬 파일에서 {len(data)}개 매물 로드됨 (Supabase 미사용)")
    except Exception as e:
        current_app.logger.error(f"❌ 데이터 로드 실패: {str(e)}")
        return jsonify({"error": f"데이터 로드 실패: {str(e)}"}), 500

    # 필터 (현황 필터)
    if status_raw:
        if status_raw == "생":
            # '생' 필터 시 현황이 비어있는 유효 데이터도 포함 (활성 매물로 간주)
            data = [d for d in data if d.get("status_raw") in ["생", "", None]]
        else:
            data = [d for d in data if d.get("status_raw") == status_raw]
    
    # 역할별 필터링 없음 — 시트에 있는 매물은 담당자/사용자 등록 여부 무관하게 전체 표시
    current_app.logger.info(f"✅ 전체 매물 {len(data)}개 반환 (사용자: {mask_email(user.email)})")

    total = len(data)
    sliced = data[offset:offset+limit]

    # 압축 옵션 확인
    is_compact = request.args.get("compact") == "1"
    current_app.logger.info(f"🔍 API Compaction: {is_compact} (args: {request.args.get('compact')})")
    
    resp_dict = {
        "items": compact_listings(sliced) if is_compact else sliced,
        "total": total,
        "limit": limit,
        "offset": offset,
        "force_reload": force,
        "cache_used": not force and not SUPABASE_AVAILABLE,
        "compressed": is_compact
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

    is_compact = request.args.get("compact") == "1"

    resp_dict = {
        "items": compact_listings(data["items"]) if is_compact else data["items"],
        "total": data["total"],
        "limit": data["limit"],
        "offset": data["offset"],
        "force_reload": False,
        "cache_used": False,
        "compressed": is_compact
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

# --- 매물 사진 관리 API ---

@bp.route("/api/listings/<listing_id>/photos", methods=["GET"])
@require_user()
def get_listing_photos_api(listing_id):
    """특정 매물의 사진 목록 조회"""
    from ..services.storage_service import storage_service
    photos = storage_service.get_listing_photos(listing_id)
    return jsonify({
        "success": True,
        "photos": photos
    })

@bp.route("/api/listings/<listing_id>/photos", methods=["POST"])
@require_user()
@validate_csrf_token()
def upload_listing_photo_api(listing_id):
    """매물 사진 업로드"""
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "파일이 없습니다."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "파일명이 없습니다."}), 400

    from ..services.storage_service import storage_service
    user = request.current_user
    
    # 파일 데이터 읽기
    file_data = file.read()
    filename = secure_filename(file.filename)
    
    result = storage_service.upload_photo(
        listing_id=listing_id,
        file_data=file_data,
        filename=filename,
        user_email=user.email
    )
    
    if result:
        return jsonify({
            "success": True,
            "photo": result
        })
    else:
        return jsonify({
            "success": False,
            "error": "업로드 중 오류가 발생했습니다."
        }), 500

@bp.route("/api/listings/photos/<photo_id>", methods=["DELETE"])
@require_user()
@validate_csrf_token()
def delete_listing_photo_api(photo_id):
    """매물 사진 삭제"""
    from ..services.storage_service import storage_service
    user = request.current_user
    
    # TODO: 권한 체크 (본인 업로드 또는 관리자)
    # 현재는 인증된 모든 사용자에게 삭제 권한 부여 (추후 고도화 가능)
    
    success = storage_service.delete_photo(photo_id, user_email=user.email)
    if success:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "삭제 중 오류가 발생했습니다."}), 500

@bp.route("/api/listings/<listing_id>/status", methods=["PUT"])
@require_user()
@validate_csrf_token()
def update_listing_status_api(listing_id):
    """매물 현황 업데이트 (관리자 또는 담당 상담사)"""
    user = request.current_user
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "JSON 데이터가 필요합니다."}), 400
        
    new_status = data.get("status")
    if new_status is None:
        return jsonify({"success": False, "error": "현황(status) 값이 누락되었습니다."}), 400
        
    from ..services.commercial_sync_service import CommercialSyncService, SHEET_CONFIG, HOUSING_SHEET_CONFIG
    sync_service = CommercialSyncService()

    # 프론트엔드에서 넘어오는 접두사(h_, r_, s_, l_ 등) 일괄 제거 (순수 UUID 추출)
    import re
    db_listing_id = re.sub(r'^[a-z]_', '', listing_id)
    
    # 권한 체크: 관리자가 아닌 경우 본인 담당 슬롯인지 확인 (또는 주택 매물인지)
    if not user.is_admin():
        # 매물의 slot_id 조회 (상가) 또는 존재 여부 확인 (주택)
        slot_id = None
        is_housing = False
        
        # 1. 상가 테이블 검색
        for _, table_name in SHEET_CONFIG.items():
            res = sync_service.supabase.table(table_name).select("slot_id").eq("id", db_listing_id).execute()
            if res.data:
                slot_id = res.data[0].get("slot_id")
                break
        
        # 2. 주택 테이블 검색 (상가에 없는 경우)
        if slot_id is None:
            for _, table_name in HOUSING_SHEET_CONFIG.items():
                res = sync_service.supabase.table(table_name).select("id").eq("id", db_listing_id).execute()
                if res.data:
                    is_housing = True
                    break
        
        if slot_id is None and not is_housing:
            return jsonify({"success": False, "error": "매물을 찾을 수 없습니다."}), 404
            
        if is_housing:
            # 주택 매물은 매니저/어드민이면 통과 (상단 데코레이터에서 관리되지 않는 경우를 대비해 추가 체크 가능)
            # 여기서는 API 진입 시 require_user만 있으므로, 주택 수정은 관리자/매니저면 허용
            if not user.is_admin() and user.role != "manager":
                return jsonify({"success": False, "error": "주택 매물은 매니저 또는 관리자만 수정 가능합니다."}), 403
        if not user.is_admin():
            from ..services.user_service import UserService
            user_service = UserService()
            assigned_slots = user_service.get_assigned_slots(user.id)
            
            # 슬롯 일치 여부 확인 (문자열 비교)
            if str(slot_id) not in [str(s) for s in assigned_slots]:
                return jsonify({"success": False, "error": "회원님의 담당 매물이 아니므로 현황을 수정할 수 없습니다."}), 403
    
    result = sync_service.update_listing_status_in_sheet(db_listing_id, new_status)
    
    if result.get("success"):
        return jsonify(result)
    else:
        return jsonify(result), 500