# app/services/housing_sheet_to_supabase_sync.py
"""
주택 매물장 시트 → Supabase 3개 테이블 동기화.
사용자 의견(주택매물_기획_검토의견.md 최상단): 전체 데이터를 변형없이 동일한 양식으로 저장.
시트: SK부동산 주택매물장 — 하위 시트 주택 매매, 주택임대차, 원룸임대차.
테이블: listings_housing_sale, listings_housing_lease, listings_housing_oneroom
"""

import os
import re
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
    service_account_file = os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
    if not os.path.exists(service_account_file):
        raise FileNotFoundError(f"서비스 계정 파일을 찾을 수 없습니다: {service_account_file}")
    return gspread.service_account(filename=service_account_file)


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

    # ID: 상가와 겹치지 않도록 h_시트이름_행번호 (공백 제거)
    sheet_slug = sheet_name.replace(" ", "")
    record_id = f"h_{sheet_slug}_{row_index:06d}"

    return {
        "id": record_id,
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
    rows_by_table: Dict[str, List[Dict[str, Any]]] = {}

    for sheet_name in HOUSING_SHEET_NAMES:
        values = read_sheet_values(gs, sid, sheet_name)
        if not values:
            result["by_sheet"][sheet_name] = 0
            continue
        header_row = values[0]
        data_rows = values[1:]
        count = 0
        for idx, row in enumerate(data_rows, start=1):
            rec = row_to_listing_housing(sheet_name, idx, header_row, row)
            if rec:
                table_name = rec.pop("table_name")
                if table_name not in rows_by_table:
                    rows_by_table[table_name] = []
                rows_by_table[table_name].append(rec)
                count += 1
        result["by_sheet"][sheet_name] = count

    if not rows_by_table:
        result["success"] = True
        result["total_rows"] = 0
        return result

    # 각 테이블별로 배치 저장
    batch_size = 500
    saved = 0
    
    for table_name, rows in rows_by_table.items():
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
                # 개별 저장 시도
                for r in batch:
                    try:
                        supabase.table(table_name).upsert(
                            {
                                "id": r["id"],
                                "raw_row_index": r["raw_row_index"],
                                "status_raw": r["status_raw"],
                                "address_full": r["address_full"],
                                "address_comp": r["address_comp"],
                                "fields": r["fields"],
                                "coords": r["coords"],
                                "geocoded": r["geocoded"],
                            },
                            on_conflict="id",
                        ).execute()
                        saved += 1
                    except Exception as e2:
                        result["errors"].append(f"{table_name}/{r['id']}: {e2}")

    result["total_rows"] = saved
    result["success"] = len(result["errors"]) == 0
    return result
