# app/services/housing_sheet_to_supabase_sync.py
"""
주택 매물장 시트 → Supabase 3개 테이블 동기화.
사용자 의견(주택매물_기획_검토의견.md 최상단): 전체 데이터를 변형없이 동일한 양식으로 저장.
시트: SK부동산 주택매물장 — 하위 시트 주택 매매, 주택임대차, 원룸임대차.
테이블: listings_housing_sale, listings_housing_lease, listings_housing_oneroom
"""

import os
import re
import uuid
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from supabase import create_client, Client
import gspread

load_dotenv()

# 주택매물장 스프레드시트 ID (사용자 제공 URL 기준)
HOUSING_SHEET_ID = os.getenv("HOUSING_SHEET_ID", "1KZ7aLN_Vzfnp0MhnOsJXuCtPtGIPuVj-UaHB2xP7JRs")
HOUSING_SHEET_NAMES = ["주택 매매", "주택임대차", "원룸임대차"]


def get_supabase_client() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.")
    return create_client(supabase_url, supabase_key)


def get_google_sheets_client() -> gspread.Client:
    from app.core.google_auth import get_gspread_client
    client = get_gspread_client()
    if not client:
        raise Exception("Google 서비스 계정 인증 정보를 로드할 수 없습니다.")
    return client


def extract_sheet_id_from_url(url: str) -> Optional[str]:
    """URL에서 스프레드시트 ID 추출."""
    m = re.search(r"/d/([a-zA-Z0-9-_]+)", url)
    return m.group(1) if m else None


def read_sheet_values(client: gspread.Client, sheet_id: str, sheet_name: str) -> Optional[List[List[str]]]:
    """시트 전체 셀 값 읽기. 첫 행 = 헤더."""
    try:
        spreadsheet = client.open_by_key(sheet_id)
        worksheet = spreadsheet.worksheet(sheet_name)
        return worksheet.get_all_values()
    except gspread.exceptions.WorksheetNotFound:
        return None
    except Exception:
        return None


def get_table_name_for_sheet(sheet_name: str) -> str:
    """시트 이름에 해당하는 테이블 이름 반환"""
    mapping = {
        "주택 매매": "listings_housing_sale",
        "주택임대차": "listings_housing_lease",
        "원룸임대차": "listings_housing_oneroom",
    }
    return mapping.get(sheet_name, "listings_housing_sale")


def row_to_listing_housing(
    sheet_name: str, row_index: int, header_row: List[str], data_row: List[str]
) -> Optional[Dict[str, Any]]:
    """
    한 행을 주택 매물 레코드로 변환.
    변형없이: 시트에 있는 모든 헤더를 fields에 그대로 저장.
    source_sheet 필드는 제거 (테이블이 이미 구분하므로).
    """
    if not header_row or not data_row:
        return None
    fields: Dict[str, str] = {}
    for i, h in enumerate(header_row):
        # 헤더명 정규화: 줄바꿈 문자 및 공백 제거
        key = (h or "").strip().replace("\n", "").replace("\r", "").replace("\t", "")
        if not key:
            continue
        val = data_row[i].strip() if i < len(data_row) else ""
        fields[key] = val

    region2 = fields.get("지역2", "")
    region = fields.get("지역", "")
    lot = fields.get("지번", "")
    address_full = f"{region2} {region} {lot}".strip()
    address_comp = {"region2": region2, "region": region, "lot": lot}
    status_raw = fields.get("현황", "")

    # ID: 상가와 동일하게 UUID 사용 (최우선)
    listing_uuid = fields.get("UUID", "").strip()
    is_new_uuid = False
    if not listing_uuid:
        listing_uuid = str(uuid.uuid4())
        is_new_uuid = True
        fields["UUID"] = listing_uuid

    record_id = listing_uuid

    return {
        "id": record_id,
        "is_new_uuid": is_new_uuid,
        "table_name": get_table_name_for_sheet(sheet_name),
        "raw_row_index": row_index,
        "status_raw": status_raw,
        "address_full": address_full or None,
        "address_comp": address_comp,
        "fields": fields,
        "coords": None,
        "geocoded": False,
    }


def sync_housing_sheets_to_supabase(
    sheet_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    주택매물장 시트(주택 매매, 주택임대차, 원룸임대차)를 읽어
    Supabase 3개 테이블에 변형없이 저장.
    - 주택 매매 → listings_housing_sale
    - 주택임대차 → listings_housing_lease
    - 원룸임대차 → listings_housing_oneroom
    """
    result: Dict[str, Any] = {
        "success": False,
        "total_rows": 0,
        "by_sheet": {},
        "errors": [],
    }
    sid = sheet_id or HOUSING_SHEET_ID

    try:
        gs = get_google_sheets_client()
        supabase = get_supabase_client()
    except Exception as e:
        result["errors"].append(str(e))
        return result

    # 시트별로 데이터 수집 (테이블별로 그룹화)
    # 🚀 [Bug Fix] 모든 주택 관련 테이블을 초기화하여, 시트가 비어있더라도 클린업이 실행되도록 함
    rows_by_table: Dict[str, List[Dict[str, Any]]] = {
        "listings_housing_sale": [],
        "listings_housing_lease": [],
        "listings_housing_oneroom": []
    }

    for sheet_name in HOUSING_SHEET_NAMES:
        try:
            spreadsheet = gs.open_by_key(sid)
            ws = spreadsheet.worksheet(sheet_name)
            values = ws.get_all_values()
        except Exception:
            result["by_sheet"][sheet_name] = 0
            continue

        if not values:
            result["by_sheet"][sheet_name] = 0
            continue

        header_row = [h.strip() for h in values[0]]
        
        # UUID 컬럼 확인 및 추가
        try:
            uuid_col_idx = header_row.index("UUID")
        except ValueError:
            uuid_col_idx = len(header_row)
            ws.add_cols(1)
            ws.update_cell(1, uuid_col_idx + 1, "UUID")
            header_row.append("UUID")

        data_rows = values[1:]
        count = 0
        uuid_updates = []

        for idx, row in enumerate(data_rows, start=2): # 1행은 헤더이므로 데이터는 2행부터
            rec = row_to_listing_housing(sheet_name, idx, header_row, row)
            if rec:
                if rec.pop("is_new_uuid", False):
                    import gspread
                    uuid_updates.append({
                        'range': gspread.utils.rowcol_to_a1(idx, uuid_col_idx + 1),
                        'values': [[rec["id"]]]
                    })
                
                table_name = rec.pop("table_name")
                if table_name not in rows_by_table:
                    rows_by_table[table_name] = []
                rows_by_table[table_name].append(rec)
                count += 1
        
        # 신규 UUID 시트 써기 (배치 업데이트)
        if uuid_updates:
            ws.batch_update(uuid_updates)
            
        result["by_sheet"][sheet_name] = count

    if not rows_by_table:
        result["success"] = True
        result["total_rows"] = 0
        return result

    # 각 테이블별로 배치 저장 및 고스트 데이터 삭제
    batch_size = 500
    saved = 0
    
    for table_name, rows in rows_by_table.items():
        current_ids = [r["id"] for r in rows]
        
        # 1. Upsert (저장/업데이트)
        for i in range(0, len(rows), batch_size):
            batch = rows[i : i + batch_size]
            payload = [
                {
                    "id": r["id"],
                    "raw_row_index": r["raw_row_index"],
                    "status_raw": r["status_raw"],
                    "address_full": r["address_full"],
                    "address_comp": r["address_comp"],
                    "fields": r["fields"],
                    "coords": r["coords"],
                    "geocoded": r["geocoded"],
                }
                for r in batch
            ]
            try:
                supabase.table(table_name).upsert(payload, on_conflict="id").execute()
                saved += len(payload)
            except Exception as e:
                result["errors"].append(f"{table_name} 배치 저장 실패: {e}")

        # 2. 🚀 [Ghost Record Cleanup] 차집합 삭제 (전수조사 개선안)
        # 🚀 [Bug Fix] current_ids가 비어있더라도(시트가 비었더라도) 클린업을 위해 항상 실행
        try:
            # 1. 현재 테이블의 모든 주택 매물 ID 조회
            db_res = supabase.table(table_name).select("id").execute()
            db_ids = set([r["id"] for r in db_res.data]) if db_res.data else set()
            # 2. 삭제 대상 선별 (DB에는 있고 시트에는 없는 ID)
            to_delete = list(db_ids - set(current_ids))
            if to_delete:
                # 3. 100개 단위 분할 삭제
                for i in range(0, len(to_delete), 100):
                    chunk = to_delete[i:i+100]
                    supabase.table(table_name).delete().in_("id", chunk).execute()
                print(f"🗑️ {table_name}: 고스트 데이터 {len(to_delete)}개 정리 완료")
        except Exception as del_err:
            result["errors"].append(f"{table_name} 삭제 로직 실패: {del_err}")

    # 3. 🚀 [Real-time Geocoding] 지오코딩 즉시 트리거
    try:
        from .geocoding_service import GeocodingService
        geo_service = GeocodingService()
        print("🚀 주택 매물 실시간 지오코딩 업데이트 시작...")
        geo_service.run_geocoding_update()
        geo_service.sync_coords_to_supabase_listings()
        print("✅ 주택 매물 지오코딩 및 좌표 반영 완료")
    except Exception as geo_err:
        result["errors"].append(f"실시간 지오코딩 실패: {geo_err}")

    result["total_rows"] = saved
    result["success"] = len(result["errors"]) == 0
    return result
