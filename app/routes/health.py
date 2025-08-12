# app/routes/health.py

from flask import Blueprint, jsonify, request
from app.core.decorators import handle_errors
from app.core.auth import require_user
import os
import time

bp = Blueprint('health', __name__)

@bp.get("/api/health")
@handle_errors()
def health_check():
    """헬스 체크 엔드포인트"""
    return jsonify({
        "status": "healthy",
        "timestamp": int(time.time()),
        "version": "1.0.0"
    })

@bp.get("/api/health/sheets")
@require_user
@handle_errors()
def sheets_health_check():
    """Google Sheets 동기화 상태 확인"""
    try:
        from flask import current_app
        data_manager = current_app.data_manager
        
        if not data_manager:
            return jsonify({
                "status": "error",
                "message": "DataManager가 초기화되지 않았습니다."
            }), 500
        
        # 시트 동기화 상태 조회
        sync_status = data_manager.get_sheet_sync_status()
        
        if sync_status:
            return jsonify({
                "status": "success",
                "sheet_sync": sync_status,
                "message": "Google Sheets 동기화 상태 조회 성공"
            })
        else:
            return jsonify({
                "status": "warning",
                "message": "Google Sheets 동기화가 비활성화되어 있습니다."
            })
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"시트 상태 조회 실패: {str(e)}"
        }), 500

@bp.post("/api/health/sheets/force-download")
@require_user
@handle_errors()
def force_sheet_download():
    """강제로 시트 다운로드 실행"""
    try:
        from flask import current_app
        data_manager = current_app.data_manager
        
        if not data_manager:
            return jsonify({
                "status": "error",
                "message": "DataManager가 초기화되지 않았습니다."
            }), 500
        
        # 강제 다운로드 실행
        success = data_manager.force_sheet_download()
        
        if success:
            return jsonify({
                "status": "success",
                "message": "시트 강제 다운로드가 완료되었습니다."
            })
        else:
            return jsonify({
                "status": "error",
                "message": "시트 강제 다운로드에 실패했습니다."
            }), 500
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"강제 다운로드 실행 실패: {str(e)}"
        }), 500
