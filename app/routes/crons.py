# app/routes/crons.py

from flask import Blueprint, jsonify, request, current_app
import os
from app.core.decorators import handle_errors

bp = Blueprint("crons", __name__, url_prefix="/api/crons")

@bp.route("/sync-all", methods=['GET', 'POST'])
@handle_errors()
def sync_all_data():
    """
    Vercel Cron Job 용 데이터 동기화 엔드포인트
    일정 시간마다 실행되어 전체 시트/DB 동기화를 백그라운드에서 수행
    """
    # Vercel Cron 요청 인증 확인
    # Vercel 환경 변수인 CRON_SECRET과 Authorization Bearer 요청 헤더를 비교
    target_secret = os.getenv('CRON_SECRET')
    auth_header = request.headers.get('Authorization')
    
    if target_secret:
        if not auth_header or auth_header != f"Bearer {target_secret}":
            current_app.logger.warning("Vercel Cron 엔드포인트 접근이 거부되었습니다. (토큰 불일치)")
            return jsonify({'error': 'Unauthorized', 'message': 'Invalid Cron Secret'}), 401
    
    current_app.logger.info("정기 데이터 동기화 Cron이 실행되었습니다.")
    
    sync_results = {}
    
    # 1. 상가 매물 (전체 사용자 시트 -> DB 다운)
    try:
        from app.services.commercial_sync_service import CommercialSyncService
        commercial_service = CommercialSyncService()
        res_com = commercial_service.sync_all_users()
        sync_results['commercial'] = res_com
    except Exception as e:
        current_app.logger.error(f"상가 매물 동기화 실패: {e}")
        sync_results['commercial'] = {'success': False, 'error': str(e)}

    # 2. 주택 매물장 (SK 주택 매물 시트 -> DB 다운)
    try:
        from app.services.housing_sheet_to_supabase_sync import sync_housing_sheets_to_supabase
        res_house = sync_housing_sheets_to_supabase()
        sync_results['housing'] = res_house
    except Exception as e:
        current_app.logger.error(f"주택 매물 동기화 실패: {e}")
        sync_results['housing'] = {'success': False, 'error': str(e)}

    # 3. 배포 (DB 전체 -> 사용자별 맞춤 시트) 
    # (선택적: 부하를 고려하여 새벽 시간 위주로 동작하도록 분리 가능)
    try:
        from app.services.supabase_to_sheet_distribution import distribute_all_listings_to_all_users
        res_dist = distribute_all_listings_to_all_users()
        sync_results['distribution'] = res_dist
    except Exception as e:
        current_app.logger.error(f"사용자 시트 배포 동기화 실패: {e}")
        sync_results['distribution'] = {'success': False, 'error': str(e)}

    return jsonify({
        'status': 'ok',
        'message': 'Cron sync completed',
        'results': sync_results
    }), 200
