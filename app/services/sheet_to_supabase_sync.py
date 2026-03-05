# app/services/sheet_to_supabase_sync.py

import os
import json
import re
from typing import List, Dict, Any, Optional
from flask import current_app
from dotenv import load_dotenv
from supabase import create_client, Client
import gspread
from google.oauth2.service_account import Credentials

# 환경변수 로드
load_dotenv()

# 시트와 Supabase 테이블 매핑
SHEET_TO_TABLE = {
    '상가임대차': 'listings_rent',
    '구분상가매매': 'listings_sale_unit',
    '건물토지매매': 'listings_sale_land'
}

# 시트별 ID 접두어 (중복 방지)
SHEET_PREFIX = {
    '상가임대차': 'r',
    '구분상가매매': 's',
    '건물토지매매': 'l'
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
    service_account_file = os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
    
    if not os.path.exists(service_account_file):
        raise FileNotFoundError(f"서비스 계정 파일을 찾을 수 없습니다: {service_account_file}")
    
    return gspread.service_account(filename=service_account_file)

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

def read_sheet_data(client: gspread.Client, sheet_id: str, sheet_name: str) -> Optional[List[List[str]]]:
    """Google Sheets에서 특정 시트의 데이터 읽기 (정확한 이름 매칭)"""
    try:
        spreadsheet = client.open_by_key(sheet_id)
        
        # 1. 정확한 이름으로 시트 찾기
        try:
            worksheet = spreadsheet.worksheet(sheet_name)
        except gspread.exceptions.WorksheetNotFound:
            # 2. 앞뒤 공백 등이 있을 수 있으므로 모든 시트 조회 후 필터링
            all_ws = spreadsheet.worksheets()
            worksheet = None
            for ws in all_ws:
                if ws.title.strip() == sheet_name:
                    worksheet = ws
                    break
            
            if not worksheet:
                current_app.logger.warning(f"시트를 찾을 수 없습니다: {sheet_name} (시트 ID: {sheet_id})")
                return None
        
        # '검색기'가 포함된 시트는 매물 데이터 시트가 아니므로 명시적으로 제외
        if "검색기" in worksheet.title:
            current_app.logger.warning(f"잘못된 시트 제외 (검색기 포함): {worksheet.title}")
            return None
        
        # 모든 데이터 읽기
        values = worksheet.get_all_values()
        
        if not values or len(values) == 0:
            current_app.logger.warning(f"시트 데이터가 비어있습니다: {sheet_name} (시트 ID: {sheet_id})")
            return None
        
        return values
        
    except Exception as e:
        current_app.logger.error(f"시트 데이터 읽기 실패: {sheet_id}/{sheet_name} - {e}")
        return None

def normalize_listing_data(row_idx: int, row: List[str], header_map: Dict[str, int], sheet_name: str, user_id: str = "", slot_id: str = "") -> Optional[Dict[str, Any]]:
    """매물 데이터 정규화"""
    try:
        def get_value(col: str) -> str:
            if col in header_map:
                idx = header_map[col]
                if idx < len(row):
                    return str(row[idx]).strip()
            return ""
        
        # 주소 구성
        region2 = get_value("지역2")
        region = get_value("지역")
        lot = get_value("지번")
        address_full = f"{region2} {region} {lot}".strip()
        
        # 모든 필드 수집
        fields = {}
        for col in header_map.keys():
            fields[col] = get_value(col)
        
        # ID 생성 규칙: c_{시트접두어}_slot{슬롯ID}_{행번호}
        # slot_id 기반으로 생성해야 같은 슬롯 데이터가 언제나 동일한 ID를 가짐 (중복 방지)
        prefix = SHEET_PREFIX.get(sheet_name, 'x')
        id_base = f"slot{slot_id}" if slot_id else user_id
        listing_id = f"c_{prefix}_{id_base}_{row_idx:06d}"
        
        # 정규화된 데이터 반환
        return {
            "id": listing_id,
            "user_id": user_id,
            "slot_id": slot_id,
            "raw_row_index": row_idx,
            "status_raw": fields.get("현황", "").strip(),
            "address_full": address_full or None,
            "address_comp": {
                "region2": region2,
                "region": region,
                "lot": lot
            },
            "fields": fields,
            "coords": None,
            "geocoded": False
        }
        
    except Exception as e:
        if current_app:
            current_app.logger.error(f"데이터 정규화 실패 (행 {row_idx}): {e}")
        return None

def sync_user_sheet_to_supabase(user_id: str, user_name: str, sheet_url: str, slot_id: str = None) -> Dict[str, Any]:
    """사용자 시트의 상가/건물 시트들을 Supabase 전용 테이블에 동기화"""
    result = {
        "user_id": user_id,
        "user_name": user_name,
        "sheet_url": sheet_url,
        "slot_id": slot_id,
        "success": False,
        "total_listings": 0,
        "sheets_synced": [],
        "errors": []
    }
    
    try:
        sheet_id = extract_sheet_id_from_url(sheet_url)
        if not sheet_id:
            result["errors"].append("시트 ID를 추출할 수 없습니다.")
            return result
        
        client = get_google_sheets_client()
        supabase = get_supabase_client()
        
        for sheet_name in SHEET_TO_TABLE.keys():
            table_name = SHEET_TO_TABLE[sheet_name]
            try:
                # 시트 데이터 읽기
                rows = read_sheet_data(client, sheet_id, sheet_name)
                if not rows or len(rows) < 2:
                    continue
                
                header_row = rows[0]
                data_rows = rows[1:]
                
                # 헤더 매핑 (공백 제거)
                header_map = {hdr.strip(): i for i, hdr in enumerate(header_row) if hdr.strip()}
                
                # 데이터 정격화 및 배치 저장 (user_id 전달 시 manager_name은 user_name 사용)
                sheet_listings = []
                for idx, row in enumerate(data_rows, start=1):
                    listing = normalize_listing_data(idx, row, header_map, sheet_name, user_id, slot_id)
                    if listing:
                        # 추가 정보 보강
                        listing["manager_name"] = user_name
                        listing["slot_id"] = slot_id
                        sheet_listings.append(listing)
                
                if sheet_listings:
                    # Supabase 전용 테이블에 업서트
                    batch_size = 500
                    for i in range(0, len(sheet_listings), batch_size):
                        batch = sheet_listings[i:i + batch_size]
                        supabase.table(table_name).upsert(batch, on_conflict='id').execute()
                    
                    result["sheets_synced"].append({
                        "sheet_name": sheet_name,
                        "table": table_name,
                        "count": len(sheet_listings)
                    })
                    result["total_listings"] += len(sheet_listings)
                    if current_app:
                        current_app.logger.info(f"동기화 성공: {user_name}/{sheet_name} -> {table_name} ({len(sheet_listings)}개)")
                
            except Exception as e:
                error_msg = f"시트 처리 실패 ({sheet_name}): {e}"
                result["errors"].append(error_msg)
                if current_app:
                    current_app.logger.error(error_msg)
        
        result["success"] = True
        
    except Exception as e:
        error_msg = f"동기화 중 치명적 오류: {e}"
        result["errors"].append(error_msg)
        if current_app:
            current_app.logger.error(error_msg)
    
    return result

def sync_all_slots_to_supabase() -> Dict[str, Any]:
    """1~7번 시트 슬롯 레지스트리를 기반으로 모든 매물 동기화"""
    # 린트 오류 방지를 위해 명시적 타입 어노테이션 및 초기화
    processed_count: int = 0
    total_listings: int = 0
    slot_results_list: List[Dict[str, Any]] = []
    sync_errors_list: List[str] = []
    
    try:
        # SheetRegistryRepository 활용
        from app.services.repositories import get_sheet_registry_repository
        registry_repo = get_sheet_registry_repository()
        slots = registry_repo.get_all_slots()
        
        if not slots:
            sync_errors_list.append("레지스트리(slots) 데이터를 찾을 수 없습니다.")
            return {"success": False, "errors": sync_errors_list}
        
        # 각 슬롯 동기화
        for slot in slots:
            slot_id_val = str(slot.get("id", ""))
            sheet_url_val = slot.get("sheet_url")
            manager_name_val = slot.get("manager_name", "공석")
            user_id_val = slot.get("user_id")
            is_active_val = slot.get("is_active", True)
            
            if not is_active_val or not sheet_url_val:
                if current_app:
                    current_app.logger.info(f"슬롯 {slot_id_val} 건너뜀 (비활성 또는 URL 없음)")
                continue
            
            if current_app:
                current_app.logger.info(f"슬롯 {slot_id_val} 동기화 시작: {manager_name_val} ({user_id_val or '미등록'})")
            
            # 사용자 ID가 없는 경우(공석 등) 임시 ID 부여하여 중복 방지
            effective_user_id = str(user_id_val) if user_id_val else f"slot_{slot_id_val}"
            
            # slot_id 전달
            slot_result = sync_user_sheet_to_supabase(effective_user_id, manager_name_val, str(sheet_url_val), slot_id=slot_id_val)
            slot_results_list.append(slot_result)
            
            if slot_result.get("success"):
                processed_count = processed_count + 1
                listings_in_slot = slot_result.get("total_listings", 0)
                if isinstance(listings_in_slot, int):
                    total_listings = total_listings + listings_in_slot
            else:
                errors_from_slot = slot_result.get("errors", [])
                if isinstance(errors_from_slot, list):
                    for err in errors_from_slot:
                        sync_errors_list.append(str(err))
        
        if current_app:
            current_app.logger.info(f"레지스트리 동기화 완료: {processed_count}개 슬롯, {total_listings}개 매물")
        
        return {
            "success": True,
            "slots_processed": processed_count,
            "total_listings": total_listings,
            "slot_results": slot_results_list,
            "errors": sync_errors_list
        }
        
    except Exception as e:
        error_msg = f"레지스트리 동기화 실패: {e}"
        sync_errors_list.append(error_msg)
        if current_app:
            current_app.logger.error(error_msg)
        return {"success": False, "errors": sync_errors_list}
