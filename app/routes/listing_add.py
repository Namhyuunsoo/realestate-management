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
        
        # 시트 URL 확인
        if not user.sheet_url:
            return jsonify({"error": "시트 URL이 설정되지 않았습니다. 관리자에게 문의하세요."}), 400
        
        # 매물 데이터 받기
        data = request.get_json()
        if not data:
            return jsonify({"error": "매물 데이터가 없습니다."}), 400
        
        # 접수날짜 자동 설정 (오늘 날짜)
        if not data.get('접수날짜'):
            data['접수날짜'] = datetime.now().strftime('%Y-%m-%d')
        
        # 매물등록 서비스로 시트에 추가
        listing_service = get_listing_service()
        success = listing_service.add_listing_to_user_sheet(user.sheet_url, data)
        
        if success:
            current_app.logger.info(f"매물등록 성공: {user.email}")
            return jsonify({
                "success": True,
                "message": "매물이 성공적으로 등록되었습니다."
            })
        else:
            current_app.logger.error(f"매물등록 실패: {user.email}")
            return jsonify({
                "success": False,
                "error": "매물등록에 실패했습니다. 시트 URL을 확인해주세요."
            }), 500
            
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
