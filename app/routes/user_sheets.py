# app/routes/user_sheets.py

from flask import Blueprint, request, jsonify, current_app
from ..core.auth import require_user
from ..services.user_sheet_service import UserSheetService

bp = Blueprint("user_sheets", __name__)

@bp.route("/api/user-sheets", methods=["GET"])
@require_user
def get_user_sheets():
    """사용자의 모든 시트 조회"""
    try:
        user_email = request.headers.get("X-User", "").strip()
        if not user_email:
            return jsonify({"error": "사용자 정보가 필요합니다."}), 400
        
        # 사용자 서비스로 사용자 확인
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
        
        # 사용자 시트 서비스
        sheet_service = UserSheetService()
        user_sheets = sheet_service.get_user_sheets(user.id)
        
        # 통계 정보 포함
        statistics = sheet_service.get_sheet_statistics(user.id)
        
        return jsonify({
            "success": True,
            "sheets": [sheet.to_dict() for sheet in user_sheets],
            "statistics": statistics
        })
        
    except Exception as e:
        current_app.logger.error(f"사용자 시트 조회 실패: {e}")
        return jsonify({"error": f"시트 조회 실패: {str(e)}"}), 500

@bp.route("/api/user-sheets", methods=["POST"])
@require_user
def create_user_sheet():
    """새로운 사용자 시트 생성"""
    try:
        user_email = request.headers.get("X-User", "").strip()
        if not user_email:
            return jsonify({"error": "사용자 정보가 필요합니다."}), 400
        
        # 사용자 서비스로 사용자 확인
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
        
        # 요청 데이터 검증
        data = request.get_json()
        if not data:
            return jsonify({"error": "요청 데이터가 필요합니다."}), 400
        
        sheet_name = data.get("sheet_name", "").strip()
        sheet_url = data.get("sheet_url", "").strip()
        
        if not sheet_name:
            return jsonify({"error": "시트 이름은 필수입니다."}), 400
        
        if not sheet_url:
            return jsonify({"error": "시트 URL은 필수입니다."}), 400
        
        # 사용자 시트 서비스
        sheet_service = UserSheetService()
        
        # 기존 활성 시트가 있다면 비활성화
        existing_active = sheet_service.get_active_user_sheet(user.id)
        if existing_active:
            sheet_service.update_user_sheet(existing_active.id, is_active=False)
        
        # 새 시트 생성
        new_sheet = sheet_service.create_user_sheet(
            user_id=user.id,
            sheet_name=sheet_name,
            sheet_url=sheet_url,
            is_active=True,
            **data.get("settings", {})
        )
        
        return jsonify({
            "success": True,
            "message": "시트가 성공적으로 생성되었습니다.",
            "sheet": new_sheet.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"사용자 시트 생성 실패: {e}")
        return jsonify({"error": f"시트 생성 실패: {str(e)}"}), 500

@bp.route("/api/user-sheets/<sheet_id>", methods=["GET"])
@require_user
def get_user_sheet(sheet_id):
    """특정 사용자 시트 조회"""
    try:
        user_email = request.headers.get("X-User", "").strip()
        if not user_email:
            return jsonify({"error": "사용자 정보가 필요합니다."}), 400
        
        # 사용자 서비스로 사용자 확인
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
        
        # 사용자 시트 서비스
        sheet_service = UserSheetService()
        sheet = sheet_service.get_user_sheet(sheet_id)
        
        if not sheet:
            return jsonify({"error": "시트를 찾을 수 없습니다."}), 404
        
        # 본인의 시트인지 확인
        if sheet.user_id != user.id:
            return jsonify({"error": "접근 권한이 없습니다."}), 403
        
        return jsonify({
            "success": True,
            "sheet": sheet.to_dict()
        })
        
    except Exception as e:
        current_app.logger.error(f"사용자 시트 조회 실패: {e}")
        return jsonify({"error": f"시트 조회 실패: {str(e)}"}), 500

@bp.route("/api/user-sheets/<sheet_id>", methods=["PUT"])
@require_user
def update_user_sheet(sheet_id):
    """사용자 시트 업데이트"""
    try:
        user_email = request.headers.get("X-User", "").strip()
        if not user_email:
            return jsonify({"error": "사용자 정보가 필요합니다."}), 400
        
        # 사용자 서비스로 사용자 확인
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
        
        # 사용자 시트 서비스
        sheet_service = UserSheetService()
        sheet = sheet_service.get_user_sheet(sheet_id)
        
        if not sheet:
            return jsonify({"error": "시트를 찾을 수 없습니다."}), 404
        
        # 본인의 시트인지 확인
        if sheet.user_id != user.id:
            return jsonify({"error": "접근 권한이 없습니다."}), 403
        
        # 요청 데이터
        data = request.get_json()
        if not data:
            return jsonify({"error": "업데이트할 데이터가 필요합니다."}), 400
        
        # 시트 업데이트
        updated_sheet = sheet_service.update_user_sheet(sheet_id, **data)
        
        return jsonify({
            "success": True,
            "message": "시트가 성공적으로 업데이트되었습니다.",
            "sheet": updated_sheet.to_dict()
        })
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"사용자 시트 업데이트 실패: {e}")
        return jsonify({"error": f"시트 업데이트 실패: {str(e)}"}), 500

@bp.route("/api/user-sheets/<sheet_id>", methods=["DELETE"])
@require_user
def delete_user_sheet(sheet_id):
    """사용자 시트 삭제"""
    try:
        user_email = request.headers.get("X-User", "").strip()
        if not user_email:
            return jsonify({"error": "사용자 정보가 필요합니다."}), 400
        
        # 사용자 서비스로 사용자 확인
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
        
        # 사용자 시트 서비스
        sheet_service = UserSheetService()
        sheet = sheet_service.get_user_sheet(sheet_id)
        
        if not sheet:
            return jsonify({"error": "시트를 찾을 수 없습니다."}), 404
        
        # 본인의 시트인지 확인
        if sheet.user_id != user.id:
            return jsonify({"error": "접근 권한이 없습니다."}), 403
        
        # 시트 삭제
        if sheet_service.delete_user_sheet(sheet_id):
            return jsonify({
                "success": True,
                "message": "시트가 성공적으로 삭제되었습니다."
            })
        else:
            return jsonify({"error": "시트 삭제에 실패했습니다."}), 500
        
    except Exception as e:
        current_app.logger.error(f"사용자 시트 삭제 실패: {e}")
        return jsonify({"error": f"시트 삭제 실패: {str(e)}"}), 500

@bp.route("/api/user-sheets/<sheet_id>/toggle-active", methods=["POST"])
@require_user
def toggle_sheet_active(sheet_id):
    """시트 활성화/비활성화 토글"""
    try:
        user_email = request.headers.get("X-User", "").strip()
        if not user_email:
            return jsonify({"error": "사용자 정보가 필요합니다."}), 400
        
        # 사용자 서비스로 사용자 확인
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
        
        # 사용자 시트 서비스
        sheet_service = UserSheetService()
        sheet = sheet_service.get_user_sheet(sheet_id)
        
        if not sheet:
            return jsonify({"error": "시트를 찾을 수 없습니다."}), 404
        
        # 본인의 시트인지 확인
        if sheet.user_id != user.id:
            return jsonify({"error": "접근 권한이 없습니다."}), 403
        
        # 활성화/비활성화 토글
        updated_sheet = sheet_service.toggle_sheet_active(sheet_id)
        
        status = "활성화" if updated_sheet.is_active else "비활성화"
        return jsonify({
            "success": True,
            "message": f"시트가 {status}되었습니다.",
            "sheet": updated_sheet.to_dict()
        })
        
    except Exception as e:
        current_app.logger.error(f"시트 활성화/비활성화 실패: {e}")
        return jsonify({"error": f"시트 상태 변경 실패: {str(e)}"}), 500

@bp.route("/api/user-sheets/<sheet_id>/toggle-sync", methods=["POST"])
@require_user
def toggle_sync_enabled(sheet_id):
    """동기화 활성화/비활성화 토글"""
    try:
        user_email = request.headers.get("X-User", "").strip()
        if not user_email:
            return jsonify({"error": "사용자 정보가 필요합니다."}), 400
        
        # 사용자 서비스로 사용자 확인
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
        
        # 사용자 시트 서비스
        sheet_service = UserSheetService()
        sheet = sheet_service.get_user_sheet(sheet_id)
        
        if not sheet:
            return jsonify({"error": "시트를 찾을 수 없습니다."}), 404
        
        # 본인의 시트인지 확인
        if sheet.user_id != user.id:
            return jsonify({"error": "접근 권한이 없습니다."}), 403
        
        # 동기화 활성화/비활성화 토글
        updated_sheet = sheet_service.toggle_sync_enabled(sheet_id)
        
        status = "활성화" if updated_sheet.sync_enabled else "비활성화"
        return jsonify({
            "success": True,
            "message": f"시트 동기화가 {status}되었습니다.",
            "sheet": updated_sheet.to_dict()
        })
        
    except Exception as e:
        current_app.logger.error(f"동기화 활성화/비활성화 실패: {e}")
        return jsonify({"error": f"동기화 상태 변경 실패: {str(e)}"}), 500

@bp.route("/api/user-sheets/<sheet_id>/sync-interval", methods=["PUT"])
@require_user
def update_sync_interval(sheet_id):
    """동기화 간격 업데이트"""
    try:
        user_email = request.headers.get("X-User", "").strip()
        if not user_email:
            return jsonify({"error": "사용자 정보가 필요합니다."}), 400
        
        # 사용자 서비스로 사용자 확인
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
        
        # 사용자 시트 서비스
        sheet_service = UserSheetService()
        sheet = sheet_service.get_user_sheet(sheet_id)
        
        if not sheet:
            return jsonify({"error": "시트를 찾을 수 없습니다."}), 404
        
        # 본인의 시트인지 확인
        if sheet.user_id != user.id:
            return jsonify({"error": "접근 권한이 없습니다."}), 403
        
        # 요청 데이터
        data = request.get_json()
        if not data or "interval_seconds" not in data:
            return jsonify({"error": "동기화 간격(초)이 필요합니다."}), 400
        
        interval_seconds = int(data["interval_seconds"])
        
        # 동기화 간격 업데이트
        updated_sheet = sheet_service.update_sync_interval(sheet_id, interval_seconds)
        
        return jsonify({
            "success": True,
            "message": f"동기화 간격이 {interval_seconds}초로 업데이트되었습니다.",
            "sheet": updated_sheet.to_dict()
        })
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"동기화 간격 업데이트 실패: {e}")
        return jsonify({"error": f"동기화 간격 업데이트 실패: {str(e)}"}), 500

@bp.route("/api/user-sheets/<sheet_id>/test-api", methods=["POST"])
@require_user
def test_api_connection(sheet_id):
    """API 연결 테스트"""
    try:
        user_email = request.headers.get("X-User", "").strip()
        if not user_email:
            return jsonify({"error": "사용자 정보가 필요합니다."}), 400
        
        # 사용자 서비스로 사용자 확인
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        if not user or not user.is_active():
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
        
        # 사용자 시트 서비스
        sheet_service = UserSheetService()
        sheet = sheet_service.get_user_sheet(sheet_id)
        
        if not sheet:
            return jsonify({"error": "시트를 찾을 수 없습니다."}), 404
        
        # 본인의 시트인지 확인
        if sheet.user_id != user.id:
            return jsonify({"error": "접근 권한이 없습니다."}), 403
        
        # API 연결 테스트
        test_result = sheet_service.test_api_connection(sheet)
        
        return jsonify(test_result)
        
    except Exception as e:
        current_app.logger.error(f"API 연결 테스트 실패: {e}")
        return jsonify({
            "success": False,
            "error": f"API 연결 테스트 실패: {str(e)}"
        }), 500
