# app/routes/geocoding.py

from flask import Blueprint, jsonify, request, current_app
from ..core.decorators import require_user, require_admin

bp = Blueprint('geocoding', __name__, url_prefix='/api/geocoding')

@bp.route('/status', methods=['GET'])
@require_user()
def get_geocoding_status():
    """지오코딩 동기화 상태 조회"""
    try:
        data_manager = current_app.data_manager
        status = data_manager.get_geocoding_sync_status()
        
        if status:
            return jsonify({
                "success": True,
                "data": status
            })
        else:
            return jsonify({
                "success": False,
                "message": "지오코딩 스케줄러가 초기화되지 않았습니다."
            })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"상태 조회 실패: {str(e)}"
        }), 500

@bp.route('/run-now', methods=['POST'])
@require_admin()
def run_geocoding_now():
    """즉시 지오코딩 실행 (관리자만)"""
    try:
        data_manager = current_app.data_manager
        result = data_manager.run_geocoding_now()
        
        if "error" not in result:
            return jsonify({
                "success": True,
                "message": "지오코딩 실행 완료",
                "data": result
            })
        else:
            return jsonify({
                "success": False,
                "message": result["error"]
            }), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"지오코딩 실행 실패: {str(e)}"
        }), 500

@bp.route('/start', methods=['POST'])
@require_admin()
def start_geocoding_sync():
    """지오코딩 동기화 시작 (관리자만)"""
    try:
        data_manager = current_app.data_manager
        success = data_manager.start_geocoding_sync()
        
        if success:
            return jsonify({
                "success": True,
                "message": "지오코딩 동기화가 시작되었습니다."
            })
        else:
            return jsonify({
                "success": False,
                "message": "지오코딩 동기화를 시작할 수 없습니다."
            }), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"지오코딩 동기화 시작 실패: {str(e)}"
        }), 500

@bp.route('/stop', methods=['POST'])
@require_admin()
def stop_geocoding_sync():
    """지오코딩 동기화 중지 (관리자만)"""
    try:
        data_manager = current_app.data_manager
        data_manager.stop_geocoding_sync()
        
        return jsonify({
            "success": True,
            "message": "지오코딩 동기화가 중지되었습니다."
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"지오코딩 동기화 중지 실패: {str(e)}"
        }), 500
