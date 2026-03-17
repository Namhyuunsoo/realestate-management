# app/services/supabase_to_master_sheet.py

import os
import json
from typing import List, Dict, Any, Optional
from flask import current_app, has_app_context
from supabase import create_client, Client
import gspread
from dotenv import load_dotenv

load_dotenv()

# 시트와 Supabase 테이블 매핑
TABLE_TO_SHEET = {
    'listings_rent': '상가임대차',
    'listings_sale_unit': '구분상가매매',
    'listings_sale_land': '건물토지매매'
}

def get_supabase_client() -> Client:
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    return create_client(supabase_url, supabase_key)

def get_google_sheets_client() -> gspread.Client:
    service_account_file = os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
    return gspread.service_account(filename=service_account_file)

def push_supabase_to_master() -> Dict[str, Any]:
    """Supabase의 통합 데이터를 마스터 종합시트로 배포 (GAS 대체)"""
    master_sheet_id = "1D14iWPeTuHAMf9m_LrtsILYEd2Z8dpjAbIfpx-WR8eY"
    
    result = {
        "success": False,
        "sheets_updated": [],
        "errors": []
    }
    
    try:
        supabase = get_supabase_client()
        gc = get_google_sheets_client()
        sh = gc.open_by_key(master_sheet_id)
        
        for table_name, sheet_name in TABLE_TO_SHEET.items():
            try:
                # 1. Supabase에서 전체 데이터 가져오기 (접수일 오름차순 정렬)
                # JSONB 필드 정렬을 위해 fields->접수일 사용
                response = supabase.table(table_name).select("*").order("fields->접수일", desc=False).execute()
                listings = response.data
                
                if not listings:
                    continue
                
                # 2. 시트 열기 및 헤더 읽기
                worksheet = sh.worksheet(sheet_name)
                headers = worksheet.row_values(1)
                
                if not headers:
                    result["errors"].append(f"{sheet_name}: 헤더를 읽을 수 없습니다.")
                    continue
                
                # 3. 데이터 변환 (헤더 이름 기반 매핑)
                rows_to_write = []
                for listing in listings:
                    fields = listing.get("fields", {})
                    # manager_name 보정 (fields에 없을 경우 상위 컬럼에서 가져옴)
                    if "담당자" not in fields:
                        fields["담당자"] = listing.get("manager_name", "")
                    
                    row = []
                    for header in headers:
                        if not header: # 첫 번째 열 등 비어있는 경우
                            row.append("")
                            continue
                        
                        # fields JSON에서 값을 찾음
                        val = fields.get(header, "")
                        
                        # 숫자 필드 여부 확인 (헤더의 공백 무시하고 비교)
                        numeric_fields = ["보증금", "월세", "권리금", "분양", "실평수", "매매가", "수익율", "평당가격", "층수"]
                        header_stripped = str(header).replace(' ', '')
                        if any(nf in header_stripped for nf in numeric_fields):
                            try:
                                if val and str(val).strip():
                                    val = float(str(val).replace(',', ''))
                            except:
                                pass
                        else:
                            val = str(val) if val is not None else ""
                                
                        row.append(val)
                    rows_to_write.append(row)
                
                # 4. 시트에 쓰기 (2행부터 덮어쓰기)
                if rows_to_write:
                    # 기존 데이터 삭제 (헤더 제외)
                    # Worksheet.row_count를 사용하여 유효 범위를 동적으로 계산
                    total_rows = worksheet.row_count
                    if total_rows > 1:
                        worksheet.batch_clear([f'A2:Z{total_rows}'])
                    
                    # 새 데이터 기록 (Range 지정 시 rows_to_write 규모에 따라 자동 조정됨)
                    worksheet.update(values=rows_to_write, range_name='A2')
                    
                    # 정렬 (담당자순으로 이미 가져왔으므로 추가 정렬 불필요하지만 필요시 수행)
                    
                    result["sheets_updated"].append({
                        "sheet": sheet_name,
                        "count": len(rows_to_write)
                    })
                    
            except Exception as e:
                result["errors"].append(f"{sheet_name} 처리 중 오류: {str(e)}")
        
        result["success"] = True if not result["errors"] else False
        
    except Exception as e:
        result["errors"].append(f"치명적 오류: {str(e)}")
    
    return result

if __name__ == "__main__":
    # 직접 실행 시 테스트
    res = push_supabase_to_master()
    print(json.dumps(res, indent=2, ensure_ascii=False))
