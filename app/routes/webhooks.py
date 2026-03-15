# app/routes/webhooks.py

from flask import Blueprint, request, jsonify, current_app
from app.core.decorators import handle_errors
import json
import os
import re
from typing import Dict, Any, Optional

bp = Blueprint("webhooks", __name__, url_prefix="/api/webhooks")

# 사용자가 직접 입력하는 시트 이름 목록
INPUT_SHEET_NAMES = ['상가임대차', '구분상가매매', '건물토지매매']

def extract_user_id_from_token(token: str) -> Optional[str]:
    """웹훅 토큰에서 사용자 ID 추출 (형식: user_id:channel_id)"""
    try:
        if ':' in token:
            return token.split(':')[0]
        return None
    except Exception:
        return None

def extract_sheet_id_from_url(sheet_url: str) -> Optional[str]:
    """시트 URL에서 시트 ID 추출"""
    try:
        pattern = r'/spreadsheets/d/([a-zA-Z0-9-_]+)'
        match = re.search(pattern, sheet_url)
        if match:
            return match.group(1)
        return None
    except Exception as e:
        current_app.logger.error(f"시트 ID 추출 실패: {sheet_url} - {e}")
        return None

def get_user_sheet_url(user_id: str) -> Optional[str]:
    """사용자의 시트 URL 조회"""
    try:
        users_file = "./data/users.json"
        if not os.path.exists(users_file):
            return None
        
        with open(users_file, 'r', encoding='utf-8') as f:
            users_data = json.load(f)
        
        users = users_data.get("users", [])
        user = next((u for u in users if str(u.get("id")) == str(user_id)), None)
        
        if user:
            return user.get("sheet_url")
        return None
    except Exception as e:
        current_app.logger.error(f"사용자 시트 URL 조회 실패: {user_id} - {e}")
        return None

def get_sheet_data_hash(worksheet, max_rows: int = 1000) -> Optional[str]:
    """시트 데이터의 해시값 계산 (변경 감지용)"""
    try:
        import hashlib
        
        # 시트의 데이터 범위 읽기 (A1부터 최대 max_rows행까지)
        try:
            values = worksheet.get(f'A1:Z{max_rows}')
        except Exception:
            # 데이터가 없거나 범위를 벗어난 경우
            values = []
        
        # 데이터를 문자열로 변환하여 해시 계산
        data_str = str(values)
        hash_obj = hashlib.md5(data_str.encode('utf-8'))
        return hash_obj.hexdigest()
    except Exception as e:
        current_app.logger.error(f"시트 해시 계산 실패: {e}")
        return None

def load_sheet_hashes(sheet_id: str) -> Dict[str, str]:
    """저장된 시트 해시값 로드"""
    try:
        hash_file = f"./data/cache/sheet_hashes_{sheet_id}.json"
        if os.path.exists(hash_file):
            with open(hash_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    except Exception as e:
        current_app.logger.error(f"해시 파일 로드 실패: {e}")
        return {}

def save_sheet_hashes(sheet_id: str, hashes: Dict[str, str]):
    """시트 해시값 저장"""
    try:
        os.makedirs("./data/cache", exist_ok=True)
        hash_file = f"./data/cache/sheet_hashes_{sheet_id}.json"
        with open(hash_file, 'w', encoding='utf-8') as f:
            json.dump(hashes, f, ensure_ascii=False, indent=2)
    except Exception as e:
        current_app.logger.error(f"해시 파일 저장 실패: {e}")

def check_if_input_sheet_changed(sheet_id: str) -> bool:
    """
    입력 시트(상가임대차, 구분상가매매, 건물토지매매) 중 하나라도 변경되었는지 확인
    Revision History 방식: 각 시트의 데이터 해시를 비교하여 변경 여부 확인
    
    Args:
        sheet_id: Google Sheets 파일 ID
    
    Returns:
        변경 여부 (True: 입력 시트 변경됨, False: 입력 시트 변경 안됨)
    """
    try:
        from app.core.google_auth import get_gspread_client
        client = get_gspread_client()
        if not client:
            raise Exception("Google 서비스 계정 인증 정보를 로드할 수 없습니다.")
        spreadsheet = client.open_by_key(sheet_id)
        
        # 저장된 해시값 로드
        saved_hashes = load_sheet_hashes(sheet_id)
        current_hashes = {}
        input_sheet_changed = False
        
        # 모든 시트 확인 (입력 시트와 다른 시트 모두)
        all_worksheets = spreadsheet.worksheets()
        
        # 첫 실행 여부 확인 (저장된 해시가 없으면 첫 실행)
        is_first_run = len(saved_hashes) == 0
        
        for worksheet in all_worksheets:
            sheet_name = worksheet.title
            current_hash = get_sheet_data_hash(worksheet)
            
            if current_hash:
                current_hashes[sheet_name] = current_hash
                
                # 입력 시트 중 하나인지 확인
                if sheet_name in INPUT_SHEET_NAMES:
                    saved_hash = saved_hashes.get(sheet_name)
                    
                    # 첫 실행이 아니고 해시값이 다르면 변경된 것
                    if not is_first_run and saved_hash != current_hash:
                        current_app.logger.info(f"입력 시트 변경 감지: {sheet_name} (해시 변경: {saved_hash} -> {current_hash})")
                        input_sheet_changed = True
                    elif is_first_run:
                        # 첫 실행 시에는 해시만 저장하고 변경으로 간주하지 않음
                        current_app.logger.info(f"첫 실행: 입력 시트 해시 저장: {sheet_name}")
                # 입력 시트가 아닌 경우 (예: ★종합임대★)는 변경 여부만 기록
                else:
                    saved_hash = saved_hashes.get(sheet_name)
                    if saved_hash != current_hash:
                        current_app.logger.info(f"다른 시트 변경 감지 (무시): {sheet_name}")
        
        # 현재 해시값 저장 (다음 비교를 위해)
        save_sheet_hashes(sheet_id, current_hashes)
        
        # 첫 실행 시에는 변경으로 간주하지 않음 (토글 ON 시 즉시 동기화는 별도로 처리됨)
        if is_first_run:
            current_app.logger.info(f"첫 실행: 해시값 저장 완료, 변경 감지는 다음부터 수행")
            return False
        
        # 입력 시트가 변경되었는지 반환
        if input_sheet_changed:
            current_app.logger.info(f"입력 시트 변경 확인됨: {sheet_id}")
        else:
            current_app.logger.info(f"입력 시트 변경 없음: {sheet_id}")
        
        return input_sheet_changed
        
    except Exception as e:
        current_app.logger.error(f"입력 시트 변경 확인 실패: {sheet_id} - {e}")
        # 오류 발생 시 안전하게 False 반환 (동기화 실행하지 않음)
        # 오류가 발생하면 불필요한 동기화를 방지하기 위해 False 반환
        return False

@bp.route("/sheets-changed", methods=['POST'])
@handle_errors()
def handle_sheets_changed():
    """
    Google Drive API에서 전송하는 웹훅 수신
    
    헤더:
    - X-Goog-Resource-State: 리소스 상태 (sync, update, not_exists)
    - X-Goog-Resource-ID: 리소스 ID
    - X-Goog-Channel-ID: 채널 ID
    - X-Goog-Channel-Token: 채널 토큰 (user_id:channel_id 형식)
    """
    try:
        # 웹훅 검증
        channel_token = request.headers.get('X-Goog-Channel-Token')
        if not channel_token:
            current_app.logger.warning("웹훅 토큰 없음")
            return jsonify({'error': 'Unauthorized'}), 401
        
        # 주택매물장 웹훅인지 확인 (토큰 형식: "housing:sheet_id")
        is_housing_webhook = channel_token.startswith("housing:")
        
        # 사용자 ID 추출 (주택매물장이 아닌 경우만)
        user_id = None
        if not is_housing_webhook:
            user_id = extract_user_id_from_token(channel_token)
            if not user_id:
                current_app.logger.warning(f"사용자 ID 추출 실패: {channel_token}")
                return jsonify({'error': 'Invalid token'}), 401
        
        # 리소스 상태 확인
        resource_state = request.headers.get('X-Goog-Resource-State')
        resource_id = request.headers.get('X-Goog-Resource-ID')
        channel_id = request.headers.get('X-Goog-Channel-ID')
        
        if is_housing_webhook:
            current_app.logger.info(f"웹훅 수신 (주택매물장): state={resource_state}, resource_id={resource_id}")
        else:
            current_app.logger.info(f"웹훅 수신: state={resource_state}, resource_id={resource_id}, user_id={user_id}")
        
        # 'sync'는 채널 생성 시 초기 알림 (무시)
        if resource_state == 'sync':
            current_app.logger.info("웹훅 초기 동기화 알림 (무시)")
            return jsonify({'status': 'sync'}), 200
        
        # 'update'는 파일 변경 알림
        if resource_state == 'update':
            # 주택매물장 웹훅인지 확인 (토큰 형식: "housing:sheet_id")
            if channel_token.startswith("housing:"):
                # 주택매물장 동기화 실행
                try:
                    from app.services.housing_sheet_to_supabase_sync import sync_housing_sheets_to_supabase
                    current_app.logger.info("주택매물장 변경 감지 → 동기화 시작")
                    sync_result = sync_housing_sheets_to_supabase()
                    if sync_result.get("success"):
                        current_app.logger.info(f"주택매물장 동기화 완료: {sync_result.get('total_rows', 0)}행")
                        return jsonify({'status': 'ok', 'synced_rows': sync_result.get('total_rows', 0)}), 200
                    else:
                        current_app.logger.error(f"주택매물장 동기화 실패: {sync_result.get('errors', [])}")
                        return jsonify({'status': 'sync_failed', 'errors': sync_result.get('errors', [])}), 200
                except Exception as e:
                    current_app.logger.error(f"주택매물장 동기화 중 오류: {e}")
                    return jsonify({'status': 'error', 'message': str(e)}), 200
            
            # 사용자 시트 웹훅 (상가 매물)
            # 사용자의 시트 URL 및 슬롯 정보 조회
            try:
                from app.services.commercial_sync_service import CommercialSyncService
                service = CommercialSyncService()
                
                # Supabase 레지스트리에서 슬롯 정보 조회
                reg_res = service.supabase.table("sheet_registry").select("*").eq("user_id", user_id).execute()
                if not reg_res.data:
                    current_app.logger.warning(f"등록되지 않은 사용자 웹훅: {user_id}")
                    return jsonify({'status': 'unregistered_user'}), 200
                
                slot = reg_res.data[0]
                slot_id = str(slot.get("slot_id"))
                sheet_url = slot.get("sheet_url")
                manager_name = slot.get("manager_name")
                
                if not sheet_url:
                    current_app.logger.warning(f"슬롯 {slot_id}에 시트 URL이 없습니다.")
                    return jsonify({'status': 'no_sheet_url'}), 200
                
                # 시트 ID 추출 및 변경 확인
                sheet_id = extract_sheet_id_from_url(sheet_url)
                if not sheet_id:
                    return jsonify({'status': 'invalid_sheet_url'}), 200
                
                if not check_if_input_sheet_changed(sheet_id):
                    current_app.logger.info(f"입력 시트 변경 없음: {user_id} (슬롯 {slot_id})")
                    return jsonify({'status': 'no_input_sheet_changed'}), 200
                
                # 실시간 동기화 실행
                current_app.logger.info(f"상가 매물 변경 감지 (슬롯 {slot_id}) → 동기화 시작")
                sync_result = service.sync_single_slot(slot_id, sheet_url, user_id, manager_name)
                
                if sync_result.get("success"):
                    current_app.logger.info(f"상가 매물 동기화 완료: {slot_id} (담당자: {manager_name})")
                    return jsonify({'status': 'ok', 'synced_count': sync_result.get('total_count', 0)}), 200
                else:
                    current_app.logger.error(f"상가 매물 동기화 실패: {sync_result.get('errors', [])}")
                    return jsonify({'status': 'sync_failed', 'errors': sync_result.get('errors', [])}), 200
                    
            except Exception as e:
                current_app.logger.error(f"상가 매물 동기화 처리 중 오류: {e}")
                return jsonify({'status': 'error', 'message': str(e)}), 200
        
        # 기타 상태는 무시
        current_app.logger.info(f"알 수 없는 리소스 상태: {resource_state}")
        return jsonify({'status': 'ignored'}), 200
        
    except Exception as e:
        current_app.logger.error(f"웹훅 처리 중 오류: {e}")
        # 오류 발생 시에도 200 반환 (Google이 재시도하지 않도록)
        return jsonify({'status': 'error', 'message': str(e)}), 200
