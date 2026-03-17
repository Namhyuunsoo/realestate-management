# app/services/supabase_to_sheet_distribution.py

import os
import re
from typing import List, Dict, Any, Optional
from flask import current_app
from dotenv import load_dotenv
from supabase import create_client, Client
import gspread
from google.oauth2.service_account import Credentials

# 환경변수 로드
load_dotenv()

# Supabase 데이터 배포 대상 시트 매핑
# 상가임대차 데이터 → ★종합임대★ 시트
# 구분상가매매 데이터 → ★상가매매★ 시트
# 건물토지매매 데이터 → ★종합건물토지★ 시트
SHEET_DISTRIBUTION_MAPPING = {
    '상가임대차': '★종합임대★',
    '구분상가매매': '★상가매매★',
    '건물토지매매': '★종합건물토지★'
}

def get_supabase_client() -> Client:
    """Supabase 클라이언트 생성"""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.")
    
    return create_client(supabase_url, supabase_key)

def get_google_sheets_client() -> gspread.Client:
    """Google Sheets API 클라이언트 생성 (기본 서비스 계정)"""
    from app.core.google_auth import get_gspread_client
    client = get_gspread_client()
    if not client:
        raise Exception("Google 서비스 계정 인증 정보를 로드할 수 없습니다.")
    return client

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

def find_header_row(worksheet: gspread.Worksheet) -> Optional[int]:
    """시트에서 헤더 행 찾기 (B열부터 확인, A열은 비워둠)"""
    try:
        # 처음 10행 확인 (B열부터 확인)
        # ★종합임대★, ★상가매매★, ★종합건물토지★ 시트는 보통 B3 또는 B4에 헤더가 있음
        for row_num in range(1, 11):
            row_values = worksheet.row_values(row_num)
            if len(row_values) > 1:  # B열(인덱스 1)부터 확인
                # B열부터 헤더로 보이는 키워드 확인
                # 헤더 키워드를 포함하는지 훨씬 유연하게 확인 (공백 제거 및 부분 일치)
                header_keywords = ['접수일', '지역', '지번', '건물명', '층수', '가게명', '매매가', '보증금']
                b_to_g_values = [str(v).replace(' ', '') for v in row_values[1:10]]
                row_combined = ''.join(b_to_g_values)
                
                if any(keyword in row_combined for keyword in header_keywords):
                    current_app.logger.info(f"헤더 행 발견: 행 {row_num}, 내용: {row_combined[:50]}...")
                    return row_num
        # 키워드가 없으면 B열부터 첫 번째 비어있지 않은 행 반환
        for row_num in range(1, 11):
            row_values = worksheet.row_values(row_num)
            if len(row_values) > 1 and any(v.strip() for v in row_values[1:]):
                current_app.logger.warning(f"키워드 없이 헤더 행 추정: 행 {row_num}")
                return row_num
        current_app.logger.warning("헤더 행을 찾지 못해 기본값 1 반환")
        return 1  # 기본값
    except Exception as e:
        current_app.logger.error(f"헤더 행 찾기 실패: {e}")
        return 1

def get_listings_from_supabase(sheet_name: str) -> List[Dict[str, Any]]:
    """Supabase에서 특정 시트의 매물 데이터 조회 (전체 데이터, 제한 없음)"""
    try:
        supabase = get_supabase_client()
        
        # sheet_name으로 필터링 (전체 데이터, 제한 없음)
        # Supabase 기본 limit은 1000개이므로 range를 사용하여 모든 데이터 가져오기
        all_listings = []
        page_size = 1000
        start = 0
        
        while True:
            response = supabase.table('listings').select('*').eq('sheet_name', sheet_name).range(start, start + page_size - 1).execute()
            
            if not response.data or len(response.data) == 0:
                break
            
            all_listings.extend(response.data)
            
            # 마지막 페이지인지 확인
            if len(response.data) < page_size:
                break
            
            start += page_size
        
        current_app.logger.info(f"Supabase에서 {len(all_listings)}개 매물 조회: {sheet_name}")
        
        return all_listings
        
    except Exception as e:
        current_app.logger.error(f"Supabase 조회 실패: {sheet_name} - {e}")
        return []

def prepare_listing_row(listing: Dict[str, Any], header_order: List[str]) -> List[str]:
    """매물 데이터를 헤더 순서에 맞게 배열로 변환 (A열은 비우고 B열부터)
    
    시트의 실제 헤더 순서를 그대로 따르고, Supabase fields에서 해당 키의 값을 가져옵니다.
    헤더가 fields에 없으면 빈 문자열을 반환합니다.
    
    중요: 시트의 실제 헤더 순서를 그대로 유지하여 배포합니다.
    """
    fields = listing.get('fields', {})
    if not isinstance(fields, dict):
        fields = {}
    
    row_data = []
    
    # A열은 비워두기 (빈 문자열)
    row_data.append("")
    
    # B열부터 시트의 실제 헤더 순서대로 데이터 배치
    # 시트 헤더 이름을 그대로 사용하여 fields에서 값을 찾습니다
    for header_name in header_order:
        # 헤더 이름 정리 (앞뒤 공백 제거)
        header_name_clean = header_name.strip()
        
        # fields에서 정확한 키로 찾기 (대소문자 구분)
        value = ""
        
        # 1. 정확한 키로 찾기
        if header_name_clean in fields:
            value = fields[header_name_clean]
        else:
            # 2. 대소문자 무시하고 찾기 (필요시)
            for key in fields.keys():
                if key.strip().lower() == header_name_clean.lower():
                    value = fields[key]
                    break
        
        # None이거나 빈 값이면 빈 문자열
        if value is None:
            value = ""
        else:
            value = str(value)
        
        row_data.append(value)
    
    return row_data


def get_header_order_from_sheet(worksheet: gspread.Worksheet, header_row_num: int) -> Optional[List[str]]:
    """시트에서 헤더 순서 읽기 (B열부터, A열은 제외)"""
    try:
        # 헤더 행 읽기 (1-based row number)
        header_row = worksheet.row_values(header_row_num)
        
        # A열(인덱스 0)은 제외하고 B열(인덱스 1)부터 헤더 읽기
        if len(header_row) <= 1:
            return None
        
        # B열부터 전체 헤더 사용 (빈 값 제외)
        headers = [h.strip() for h in header_row[1:] if h.strip()]
        
        if not headers:
            return None
        
        return headers
        
    except Exception as e:
        current_app.logger.error(f"헤더 읽기 실패 (행 {header_row_num}): {e}")
        return None

def distribute_listings_to_sheet(user_id: str, user_name: str, sheet_url: str, sheet_name: str) -> Dict[str, Any]:
    """Supabase의 매물 데이터를 사용자가 원래 쓰는 시트에 배포 (전체 데이터)"""
    result = {
        "user_id": user_id,
        "user_name": user_name,
        "sheet_name": sheet_name,
        "success": False,
        "listings_written": 0,
        "errors": []
    }
    
    try:
        # 시트 ID 추출
        sheet_id = extract_sheet_id_from_url(sheet_url)
        if not sheet_id:
            result["errors"].append("시트 ID를 추출할 수 없습니다.")
            return result
        
        # Google Sheets 클라이언트 생성
        try:
            client = get_google_sheets_client()
        except Exception as e:
            result["errors"].append(f"Google Sheets 클라이언트 생성 실패: {e}")
            return result
        
        # Supabase에서 매물 데이터 조회 (전체 데이터)
        listings = get_listings_from_supabase(sheet_name)
        if not listings:
            result["success"] = True
            result["errors"].append("배포할 매물이 없습니다.")
            return result
        
        # 스프레드시트 열기
        spreadsheet = client.open_by_key(sheet_id)
        
        # 배포 대상 시트 이름 확인 (매핑 사용)
        target_sheet_name = SHEET_DISTRIBUTION_MAPPING.get(sheet_name)
        if not target_sheet_name:
            result["errors"].append(f"배포 대상 시트를 찾을 수 없습니다: {sheet_name}")
            return result
        
        # 배포 대상 시트 열기 (★종합임대★, ★상가매매★, ★종합건물토지★)
        try:
            target_worksheet = spreadsheet.worksheet(target_sheet_name)
        except gspread.exceptions.WorksheetNotFound:
            result["errors"].append(f"시트를 찾을 수 없습니다: {target_sheet_name}")
            return result
        
        # 헤더 행 찾기
        header_row_num = find_header_row(target_worksheet)
        if not header_row_num:
            result["errors"].append("헤더 행을 찾을 수 없습니다.")
            return result
        
        data_start_row = header_row_num + 1  # 헤더 다음 행부터 데이터
        
        # 헤더 순서 읽기
        header_order = get_header_order_from_sheet(target_worksheet, header_row_num)
        if not header_order:
            result["errors"].append(f"헤더를 읽을 수 없습니다 (행 {header_row_num}).")
            return result
        
        current_app.logger.info(f"헤더 읽기 완료: {len(header_order)}개 컬럼 (행 {header_row_num})")
        current_app.logger.info(f"시트 헤더 (처음 10개): {header_order[:10]}")
        
        # 기존 데이터 범위 확인 및 삭제 (B열부터)
        try:
            # B열의 마지막 행 찾기
            b_column_values = target_worksheet.col_values(2)  # B열 (인덱스 2)
            
            # 헤더 행 이후의 데이터 행 수 계산
            if len(b_column_values) > header_row_num:
                last_data_row = len(b_column_values)
                # 기존 데이터 삭제 (헤더 제외, B열부터 Z열까지)
                if last_data_row >= data_start_row:
                    # B열부터 Z열까지 삭제 (A열은 유지)
                    # worksheet 객체를 사용하므로 시트 이름 제외
                    delete_range = f"B{data_start_row}:Z{last_data_row}"
                    target_worksheet.batch_clear([delete_range])
                    current_app.logger.info(f"기존 데이터 삭제 완료: {delete_range}")
        except Exception as e:
            current_app.logger.warning(f"기존 데이터 확인 실패 (무시하고 계속): {e}")
        
        # 매물 데이터를 헤더 순서에 맞게 변환
        rows_to_write = []
        for listing in listings:
            row_data = prepare_listing_row(listing, header_order)
            rows_to_write.append(row_data)
        
        if not rows_to_write:
            result["success"] = True
            result["errors"].append("작성할 데이터가 없습니다.")
            return result
        
        # 디버깅: 첫 번째 매물의 fields 키 확인
        if listings:
            first_listing_fields = listings[0].get('fields', {})
            if isinstance(first_listing_fields, dict):
                fields_keys = list(first_listing_fields.keys())[:10]
                current_app.logger.info(f"첫 번째 매물의 fields 키 (처음 10개): {fields_keys}")
                current_app.logger.info(f"시트 헤더와 fields 키 매칭 확인 필요")
        
        # B열부터 데이터 쓰기 (A열은 비워둠)
        # 범위: A{data_start_row}부터 (A열은 비우고 B열부터 데이터)
        # worksheet 객체를 사용하므로 시트 이름 제외
        range_name = f"A{data_start_row}"
        
        # 배치 쓰기 (A열은 빈 값, B열부터 실제 데이터)
        target_worksheet.update(range_name, rows_to_write, value_input_option='USER_ENTERED')
        
        result["listings_written"] = len(rows_to_write)
        result["success"] = True
        result["target_sheet"] = target_sheet_name
        current_app.logger.info(f"데이터 배포 완료: {user_name}/{sheet_name} → {target_sheet_name} - {len(rows_to_write)}개 매물")
        
    except Exception as e:
        error_msg = f"데이터 배포 실패: {user_name}/{sheet_name} - {e}"
        result["errors"].append(error_msg)
        current_app.logger.error(error_msg)
    
    return result

def is_sync_enabled_for_user(user_id: str) -> bool:
    """사용자의 Supabase 동기화가 활성화되어 있는지 확인 (users.json의 supabase_sync_enabled만 확인)"""
    try:
        # users.json에서 supabase_sync_enabled 확인
        import json
        users_file = "./data/users.json"
        if os.path.exists(users_file):
            with open(users_file, 'r', encoding='utf-8') as f:
                users_data = json.load(f)
            
            users = users_data.get("users", [])
            user = next((u for u in users if str(u.get("id")) == str(user_id)), None)
            
            if user:
                # users.json의 supabase_sync_enabled만 확인 (기본값 False)
                return user.get('supabase_sync_enabled', False)
        
        return False
        
    except Exception as e:
        current_app.logger.error(f"동기화 활성화 확인 실패: {user_id} - {e}")
        return False

def distribute_all_listings_to_user_sheet(user_id: str, user_name: str, sheet_url: str) -> Dict[str, Any]:
    """사용자가 원래 쓰는 모든 시트에 매물 데이터 배포"""
    result = {
        "user_id": user_id,
        "user_name": user_name,
        "success": False,
        "sheets_processed": [],
        "total_listings": 0,
        "errors": []
    }
    
    # 각 시트 타입별로 배포 (전체 데이터)
    for sheet_name in ['상가임대차', '구분상가매매', '건물토지매매']:
        try:
            sheet_result = distribute_listings_to_sheet(user_id, user_name, sheet_url, sheet_name)
            result["sheets_processed"].append(sheet_result)
            
            if sheet_result["success"]:
                result["total_listings"] += sheet_result["listings_written"]
            else:
                result["errors"].extend(sheet_result["errors"])
                
        except Exception as e:
            error_msg = f"시트 배포 실패: {sheet_name} - {e}"
            result["errors"].append(error_msg)
            current_app.logger.error(error_msg)
    
    result["success"] = len(result["errors"]) == 0
    return result

def distribute_all_listings_to_all_users() -> Dict[str, Any]:
    """모든 사용자 시트에 매물 데이터 배포 (동기화 활성화된 사용자만)"""
    result = {
        "success": False,
        "users_processed": 0,
        "total_listings": 0,
        "user_results": [],
        "errors": []
    }
    
    try:
        # users.json 읽기
        import json
        users_file = "./data/users.json"
        if not os.path.exists(users_file):
            result["errors"].append(f"사용자 파일을 찾을 수 없습니다: {users_file}")
            return result
        
        with open(users_file, 'r', encoding='utf-8') as f:
            users_data = json.load(f)
        
        users = users_data.get("users", [])
        
        # 각 사용자 시트 동기화
        for user in users:
            user_id = user.get("id")
            user_name = user.get("name", "")
            sheet_url = user.get("sheet_url", "")
            
            if not sheet_url:
                current_app.logger.warning(f"시트 URL 없음: {user_name} ({user_id})")
                continue
            
            # 동기화 활성화 확인
            if not is_sync_enabled_for_user(user_id):
                current_app.logger.info(f"동기화 비활성화: {user_name} ({user_id})")
                continue
            
            current_app.logger.info(f"사용자 시트 배포 시작: {user_name} ({user_id})")
            
            user_result = distribute_all_listings_to_user_sheet(user_id, user_name, sheet_url)
            result["user_results"].append(user_result)
            
            if user_result["success"]:
                result["users_processed"] += 1
                result["total_listings"] += user_result["total_listings"]
            else:
                result["errors"].extend(user_result["errors"])
        
        result["success"] = True
        current_app.logger.info(f"전체 배포 완료: {result['users_processed']}명 사용자, {result['total_listings']}개 매물")
        
    except Exception as e:
        error_msg = f"전체 배포 실패: {e}"
        result["errors"].append(error_msg)
        current_app.logger.error(error_msg)
    
    return result
