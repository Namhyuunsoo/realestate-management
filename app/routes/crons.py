# app/routes/crons.py

from flask import Blueprint, jsonify, request, current_app
import os
from app.core.decorators import handle_errors

bp = Blueprint("crons", __name__, url_prefix="/api/crons")

def _verify_cron_secret():
    """Vercel Cron 인증 검증 (공통 로직)"""
    target_secret = os.getenv('CRON_SECRET')
    auth_header = request.headers.get('Authorization')
    
    if target_secret:
        if not auth_header or auth_header != f"Bearer {target_secret}":
            current_app.logger.warning("Vercel Cron 엔드포인트 접근이 거부되었습니다. (토큰 불일치)")
            return False
    return True

@bp.route("/sync-all", methods=['GET', 'POST'])
@handle_errors()
def sync_all_data():
    """
    Vercel Cron Job 용 데이터 동기화 엔드포인트
    일정 시간마다 실행되어 전체 시트/DB 동기화를 백그라운드에서 수행
    """
    if not _verify_cron_secret():
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

    # 3. 배포 기능 제거됨 (DB→시트 역배포는 사용하지 않음)
    # supabase_to_sheet_distribution은 더 이상 cron에서 호출하지 않습니다.

    # 4. 지오코딩 (신규 매물 좌표 생성 및 반영)
    try:
        from app.services.geocoding_service import GeocodingService
        geo_service = GeocodingService()
        current_app.logger.info("동기화 후 지오코딩 업데이트를 시작합니다...")
        geo_res = geo_service.run_geocoding_update()
        sync_results['geocoding'] = geo_res
        
        # 좌표를 실제 매물 테이블(coords 컬럼)에 전파
        geo_service.sync_coords_to_supabase_listings()
    except Exception as e:
        current_app.logger.error(f"지오코딩 자동화 실패: {e}")
        sync_results['geocoding'] = {'success': False, 'error': str(e)}

    return jsonify({
        'status': 'ok',
        'message': 'Cron sync and geocoding completed',
        'results': sync_results
    }), 200

@bp.route("/register-webhooks", methods=['GET', 'POST'])
@handle_errors()
def register_webhooks():
    """
    Vercel Cron 용 웹훅 등록 엔드포인트
    Google Sheets 변경 감지를 위한 Push Notification 채널을 등록
    (Vercel serverless에서는 백그라운드 스레드가 불가능하므로 cron으로 등록)
    """
    if not _verify_cron_secret():
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid Cron Secret'}), 401
    
    webhook_base_url = os.getenv("WEBHOOK_BASE_URL", "").strip()
    if not webhook_base_url:
        return jsonify({'error': 'WEBHOOK_BASE_URL not configured'}), 500
    
    results = {"housing": None, "commercial": None}
    
    try:
        from app.services.sheets_webhook_service import SheetsWebhookService
        service = SheetsWebhookService()
        
        # 1. 주택매물장 웹훅 등록
        housing_result = service.register_housing_sheet_webhook(expiration_hours=24)
        results["housing"] = housing_result
        
        # 2. 상가 매물 슬롯 웹훅 등록
        commercial_results = service.register_all_commercial_webhooks(expiration_hours=24)
        results["commercial"] = commercial_results
        
        success_count = commercial_results.get("success", 0) if commercial_results else 0
        total_count = commercial_results.get("total", 0) if commercial_results else 0
        
        current_app.logger.info(f"웹훅 등록 완료: housing={housing_result is not None}, commercial={success_count}/{total_count}")
        
        return jsonify({
            'status': 'ok',
            'message': 'Webhook registration completed',
            'results': results
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"웹훅 등록 실패: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'results': results
        }), 200
