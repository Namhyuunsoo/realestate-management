# app/routes/briefings.py

from flask import Blueprint, request, jsonify, current_app
from app.core.decorators import require_user, validate_json, handle_errors

bp = Blueprint("briefings", __name__, url_prefix="/api")

# 목록
@bp.get("/briefings")
@require_user()
@handle_errors()
def list_briefings_api():
    user_email = request.headers.get("X-User")
    
    # 사용자 객체 가져오기
    try:
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        
        if not user or not user.is_active():
            current_app.logger.warning(f"Invalid user: {user_email}")
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
            
    except Exception as auth_error:
        current_app.logger.error(f"❌ 사용자 인증 중 오류: {auth_error}")
        return jsonify({"error": f"사용자 인증 실패: {str(auth_error)}"}), 500
    
    # BriefingService를 통해 브리핑 목록 조회
    briefing_service = current_app.data_manager.briefing_service
    
    # 역할별 필터링 적용
    if user.is_user():
        # 일반 사용자는 본인 담당 고객의 브리핑만 조회
        manager_name = getattr(user, 'manager_name', '')
        if manager_name:
            # 담당자명으로 고객을 필터링하고, 해당 고객들의 브리핑만 조회
            from app.services import store
            customers = store.list_customers(user, 'own', '')
            customer_ids = [c['id'] for c in customers if c.get('id')]
            
            # 해당 고객들의 브리핑만 필터링
            all_briefings = briefing_service.list_briefings(user_email, is_admin=False)
            data = [b for b in all_briefings if b.get('customer_id') in customer_ids]
            
            current_app.logger.info(f"User {user.email} filtered briefings by manager_name: {manager_name} ({len(data)} items)")
        else:
            # 담당자명이 설정되지 않은 경우 빈 결과 반환
            data = []
            current_app.logger.info(f"User {user.email} has no manager_name set, returning empty briefings")
    elif user.is_manager() or user.is_admin():
        # 매니저와 어드민은 모든 브리핑 조회 가능
        is_admin = user.is_admin()
        data = briefing_service.list_briefings(user_email, is_admin=is_admin)
        user_role = getattr(user, 'role', 'unknown')
        current_app.logger.info(f"{user_role.title()} {user.email} accessing all briefings ({len(data)} items)")
    else:
        # 역할이 명확하지 않은 경우 모든 브리핑 조회 (기본값)
        data = briefing_service.list_briefings(user_email, is_admin=False)
        current_app.logger.info(f"User {user.email} with unknown role accessing all briefings ({len(data)} items)")
    
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
