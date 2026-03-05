# app/routes/listing_add.py

from flask import Blueprint, request, jsonify, session, current_app
from ..services.listing_add_service import ListingAddService
from ..services.user_service import UserService
from ..core.decorators import require_user, handle_errors, log_access
from datetime import datetime
import json

bp = Blueprint("listing_add", __name__, url_prefix="/api/listing-add")

def get_listing_service() -> ListingAddService:
    """매물등록 서비스 인스턴스 반환"""
    return ListingAddService()

def get_user_service() -> UserService:
    """사용자 서비스 인스턴스 반환"""
    return current_app.data_manager.user_service

@bp.post("/add")
@require_user()
@handle_errors()
@log_access()
def add_listing():
    """매물등록"""
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "로그인이 필요합니다."}), 401
        
        # 사용자 정보 조회
        user_service = get_user_service()
        user = user_service.get_user_by_id(user_id)
        if not user:
            return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
        

        # 매물 데이터 받기
        data = request.get_json()
        if not data:
            return jsonify({"error": "매물 데이터가 없습니다."}), 400
            
        target_sheet_type = data.get('매물유형')
        if not target_sheet_type:
            return jsonify({"error": "매물 종류(유형)가 선택되지 않았습니다."}), 400
        
        # 접수일 형식 확인 (프론트에서 '250304' 등으로 보내지만 혹시 없을 경우 포맷)
        if not data.get('접수일'):
            data['접수일'] = datetime.now().strftime('%y%m%d')
            
        # 목표 시트 결정 (주택 vs 상가)
        is_housing = target_sheet_type in ['주택 매매', '주택임대차']
        target_sheet_id_or_url = None
        
        if is_housing:
            # 주택은 공용 시트 사용 (환경 변수 또는 config 확인 필요)
            target_sheet_id_or_url = current_app.config.get('HOUSING_SHEET_ID')
            if not target_sheet_id_or_url:
                current_app.logger.warning("HOUSING_SHEET_ID 설정이 없습니다. 하드코딩된 기본값을 사용합니다.")
                target_sheet_id_or_url = "1KZ7aLN_Vzfnp0MhnOsJXuCtPtGIPuVj-UaHB2xP7JRs"
        else:
            # 상가는 사용자 이름(user.name)을 기반으로 sheet_registry 슬롯에서 시트 URL 매핑
            manager_name = getattr(user, 'name', None)
            if not manager_name:
                return jsonify({"error": "사용자 이름이 설정되어 있지 않아 매물을 등록할 수 없습니다."}), 400
                
            from app.services.repositories import get_sheet_registry_repository
            repo = get_sheet_registry_repository()
            slots = repo.get_all_slots()
            
            # 활성화된 슬롯 중 작성자와 담당자명이 일치하는 슬롯 찾기
            user_slot = next((slot for slot in slots if slot.get('manager_name') == manager_name and slot.get('is_active')), None)
            
            if not user_slot or not user_slot.get('sheet_url'):
                current_app.logger.error(f"담당자 '{manager_name}'에 할당된 활성 시트 슬롯을 찾을 수 없습니다.")
                return jsonify({"error": f"담당자 '{manager_name}'에 할당된 매물장 시트를 찾을 수 없습니다. 슬롯 관리를 확인해주세요."}), 400
                
            target_sheet_id_or_url = user_slot.get('sheet_url')
            current_app.logger.info(f"상가 매물 타겟 시트 매핑 완료: {manager_name} -> {target_sheet_id_or_url}")
        
        # 매물등록 서비스 호출
        listing_service = get_listing_service()
        success = listing_service.add_listing_dynamic(target_sheet_id_or_url, target_sheet_type, data)
        
        if success:
            current_app.logger.info(f"매물등록 성공 (유형: {target_sheet_type}): {user.email}")
            return jsonify({
                "success": True,
                "message": f"{target_sheet_type} 매물이 성공적으로 등록되었습니다."
            })
        else:
            current_app.logger.error(f"매물등록 실패 (유형: {target_sheet_type}): {user.email}")
            return jsonify({"error": "매물등록에 실패했습니다. 시트 URL을 확인해주세요."}), 500
            
    except Exception as e:
        current_app.logger.error(f"매물등록 중 오류 발생: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"매물등록 중 오류가 발생했습니다: {str(e)}"
        }), 500

@bp.get("/user-sheet-info")
@require_user()
@handle_errors()
@log_access()
def get_user_sheet_info():
    """사용자 시트 정보 조회"""
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "로그인이 필요합니다."}), 401
        
        # 사용자 정보 조회
        user_service = get_user_service()
        user = user_service.get_user_by_id(user_id)
        if not user:
            return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404
        
        return jsonify({
            "has_sheet_url": bool(user.sheet_url),
            "sheet_url": user.sheet_url if user.sheet_url else None
        })
        
    except Exception as e:
        current_app.logger.error(f"시트 정보 조회 중 오류 발생: {str(e)}")
        return jsonify({
            "error": f"시트 정보 조회 중 오류가 발생했습니다: {str(e)}"
        }), 500
