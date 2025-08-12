# app/routes/briefings.py

from flask import Blueprint, request, jsonify, current_app
from app.core.decorators import require_user, validate_json, handle_errors

bp = Blueprint("briefings", __name__, url_prefix="/api")

# 목록
@bp.get("/briefings")
@require_user()
@handle_errors()
def list_briefings_api():
    user = request.headers.get("X-User")
    
    # BriefingService를 통해 브리핑 목록 조회
    briefing_service = current_app.data_manager.briefing_service
    is_admin = current_app.data_manager.is_admin(user)
    data = briefing_service.list_briefings(user, is_admin=is_admin)
    
    # listing_ids 길이만 간단히 포함
    items = []
    for b in data:
        items.append({
            "id": b["id"],
            "customer_id": b["customer_id"],
            "count": len(b["listing_ids"]),
            "created_at": b["created_at"]
        })
    return jsonify({"items": items, "total": len(items)})

# 생성
@bp.post("/briefings")
@require_user()
@validate_json("customer_id", "listing_ids")
@handle_errors()
def create_briefing_api():
    user = request.headers.get("X-User")
    payload = request.get_json(force=True) or {}
    customer_id = payload.get("customer_id")
    listing_ids = payload.get("listing_ids") or []
    
    if not isinstance(listing_ids, list):
        return jsonify({"error":"listing_ids는 리스트 형태여야 합니다"}), 400
    
    # BriefingService를 통해 브리핑 생성
    briefing_service = current_app.data_manager.briefing_service
    b = briefing_service.create_briefing(user, customer_id, listing_ids)
    return jsonify({"id": b["id"]}), 201

# 상세
@bp.get("/briefings/<bid>")
@require_user()
@handle_errors()
def get_briefing_api(bid):
    user = request.headers.get("X-User")
    
    # BriefingService를 통해 브리핑과 매물 정보 조회
    briefing_service = current_app.data_manager.briefing_service
    result = briefing_service.get_briefing_with_listings(bid, user)
    
    if not result:
        return jsonify({"error":"not found"}), 404
    
    return jsonify(result)

# Override 설정
@bp.post("/briefings/<bid>/listing/<lid>/override")
@require_user()
@validate_json("field")
@handle_errors()
def set_override_api(bid, lid):
    user = request.headers.get("X-User")
    payload = request.get_json(force=True) or {}
    field = payload.get("field")
    value = payload.get("value")
    
    # 권한 확인
    briefing_service = current_app.data_manager.briefing_service
    if not briefing_service.validate_briefing_access(bid, user):
        return jsonify({"error":"forbidden"}), 403
    
    # BriefingService를 통해 오버라이드 설정
    briefing_service.set_listing_override(bid, lid, field, value if value is not None else "")
    return jsonify({"ok": True})

# Override 해제 (특정 field 또는 전체)
@bp.delete("/briefings/<bid>/listing/<lid>/override")
@require_user()
@handle_errors()
def clear_override_api(bid, lid):
    user = request.headers.get("X-User")
    field = request.args.get("field")  # ?field=월세
    
    # 권한 확인
    briefing_service = current_app.data_manager.briefing_service
    if not briefing_service.validate_briefing_access(bid, user):
        return jsonify({"error":"forbidden"}), 403
    
    # BriefingService를 통해 오버라이드 해제
    briefing_service.clear_listing_override(bid, lid, field)
    return jsonify({"ok": True})

# 태그 설정
@bp.post("/briefings/<bid>/listing/<lid>/tag")
@require_user()
@validate_json("tag")
@handle_errors()
def set_tag_api(bid, lid):
    user = request.headers.get("X-User")
    payload = request.get_json(force=True) or {}
    tag = payload.get("tag")
    
    # 권한 확인
    briefing_service = current_app.data_manager.briefing_service
    if not briefing_service.validate_briefing_access(bid, user):
        return jsonify({"error":"forbidden"}), 403
    
    # BriefingService를 통해 태그 설정
    briefing_service.set_listing_tag(bid, lid, tag)
    return jsonify({"ok": True})

# 태그 해제
@bp.delete("/briefings/<bid>/listing/<lid>/tag")
@require_user()
@handle_errors()
def clear_tag_api(bid, lid):
    user = request.headers.get("X-User")
    
    # 권한 확인
    briefing_service = current_app.data_manager.briefing_service
    if not briefing_service.validate_briefing_access(bid, user):
        return jsonify({"error":"forbidden"}), 403
    
    # BriefingService를 통해 태그 해제
    briefing_service.clear_listing_tag(bid, lid)
    return jsonify({"ok": True})
