# app/services/commercial_sync_service.py

import os
import json
import re
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
import gspread

load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 하위 시트 및 테이블 매핑
SHEET_CONFIG = {
    "상가임대차": "listings_rent",
    "구분상가매매": "listings_sale_unit",
    "건물토지매매": "listings_sale_land"
}

class CommercialSyncService:
    def __init__(self):
        self.supabase = self._get_supabase_client()
        self.gs = self._get_google_sheets_client()
        
    def _get_supabase_client(self) -> Client:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError("SUPABASE 환경변수가 설정되지 않았습니다.")
        return create_client(url, key)

    def _get_google_sheets_client(self) -> gspread.Client:
        from app.core.google_auth import get_gspread_client
        client = get_gspread_client()
        if not client:
            raise Exception("Google 서비스 계정 인증 정보를 로드할 수 없습니다.")
        return client

    def normalize_header(self, header: str) -> str:
        """헤더 텍스트 정규화 (공백, 특수문자 제거)"""
        if not header: return ""
        # 괄호와 그 안의 내용 제거 (예: 분양(㎡) -> 분양)
        clean = re.sub(r'\(.*?\)', '', header)
        # 공백 및 특수문자 제거
        clean = re.sub(r'[^가-힣a-zA-Z0-9]', '', clean)
        return clean

    def get_header_mapping(self, actual_headers: List[str], expected_headers: List[str]) -> Dict[str, int]:
        """실제 시트 헤더와 기대하는 헤더 간의 매핑 보구 로직"""
        mapping = {}
        norm_actual = [self.normalize_header(h) for h in actual_headers]
        
        for expected in expected_headers:
            norm_expected = self.normalize_header(expected)
            
            # 1. 완전 일치 또는 정규화 일치 확인
            if norm_expected in norm_actual:
                mapping[expected] = norm_actual.index(norm_expected)
                continue
            
            # 2. 유사 어휘 매핑 (Alias)
            aliases = {
                "지역2": ["시군구", "구"],
                "실평수": ["면적", "전용", "전용평수"],
                "소유자": ["소유주", "임대인"],
            }
            
            found = False
            for alias in aliases.get(expected, []):
                norm_alias = self.normalize_header(alias)
                if norm_alias in norm_actual:
                    mapping[expected] = norm_actual.index(norm_alias)
                    found = True
                    break
            
            if not found:
                logger.warning(f"필수 헤더를 찾을 수 없음: {expected}")
                
        return mapping

    def sync_all_users(self) -> Dict[str, Any]:
        """모든 사용자의 시트를 동기화"""
        results = {"success": True, "users_processed": 0, "total_synced": 0, "details": []}
        
        try:
            users_file = "./data/users.json"
            if not os.path.exists(users_file):
                return {"success": False, "error": "users.json not found"}
                
            with open(users_file, 'r', encoding='utf-8') as f:
                users = json.load(f).get("users", [])
                
            for user in users:
                user_id = user.get("id")
                sheet_url = user.get("sheet_url")
                if not user_id or not sheet_url: continue
                
                logger.info(f"사용자 {user_id} 동기화 시작...")
                user_sync = self.sync_single_user(user_id, sheet_url)
                results["details"].append(user_sync)
                if user_sync["success"]:
                    results["users_processed"] += 1
                    results["total_synced"] += user_sync["total_count"]
                    
        except Exception as e:
            results["success"] = False
            results["error"] = str(e)
            
        return results

    def sync_single_user(self, user_id: str, sheet_url: str) -> Dict[str, Any]:
        """단일 사용자 시트 동기화"""
        res = {"user_id": user_id, "success": False, "total_count": 0, "sheets": {}, "errors": []}
        
        try:
            m = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
            if not m:
                res["errors"].append(f"Invalid Sheet URL: {sheet_url}")
                return res
            sheet_id = m.group(1)
            
            try:
                spreadsheet = self.gs.open_by_key(sheet_id)
            except Exception as e:
                import traceback
                error_detail = traceback.format_exc()
                res["errors"].append(f"Spreadsheet Open Failed (ID: {sheet_id}): {repr(e)}")
                logger.error(f"Spreadsheet Open Failed for {user_id}:\n{error_detail}")
                return res
            
            # 실제 존재하는 모든 워크시트 가져오기
            all_worksheets = {ws.title.strip(): ws for ws in spreadsheet.worksheets()}
            
            for sheet_name, table_name in SHEET_CONFIG.items():
                try:
                    # 시트명 포함 여부로 유연하게 찾기 (예: " 상가임대차 " 등 대응)
                    target_ws = None
                    for actual_name, ws in all_worksheets.items():
                        if sheet_name in actual_name:
                            target_ws = ws
                            break
                    
                    if not target_ws:
                        # logger.info(f"시트 없음: {sheet_name} (사용자: {user_id})")
                        continue
                        
                    values = target_ws.get_all_values()
                    if len(values) < 2: continue
                    
                    headers = values[0]
                    data_rows = values[1:]
                    
                    # 매핑 생성
                    header_map = {h.strip(): i for i, h in enumerate(headers) if h.strip()}
                    
                    batch_data = []
                    for idx, row in enumerate(data_rows, start=1):
                        record = self._process_row(user_id, sheet_name, idx, row, header_map)
                        if record:
                            batch_data.append(record)
                    
                    if batch_data:
                        # Supabase에 업서트
                        self.supabase.table(table_name).upsert(batch_data, on_conflict="id").execute()
                        res["sheets"][sheet_name] = len(batch_data)
                        res["total_count"] += len(batch_data)
                        
                except Exception as e:
                    err_msg = f"시트 {sheet_name} 처리 실패: {e}"
                    logger.error(err_msg)
                    res["errors"].append(err_msg)
            
            res["success"] = True
        except Exception as e:
            import traceback
            err_detail = traceback.format_exc()
            logger.error(f"사용자 {user_id} 동기화 중 치명적 오류:\n{err_detail}")
            res["errors"].append(f"Fatal Error: {e}")
            
        return res

    def _process_row(self, user_id: str, sheet_name: str, row_idx: int, row: List[str], header_map: Dict[str, int]) -> Optional[Dict[str, Any]]:
        """한 행의 데이터를 테이블 형식에 맞춰 정규화"""
        try:
            fields = {}
            for h, i in header_map.items():
                fields[h] = row[i].strip() if i < len(row) else ""
            
            # 주소 추출 (헤더 이름 유연하게 대응 필요 - 여기선 기본적인 것만)
            region2 = fields.get("지역2", fields.get("시군구", ""))
            region = fields.get("지역", "")
            lot = fields.get("지번", "")
            address_full = f"{region2} {region} {lot}".strip()
            
            # ID 생성 규칙: c_{시트약어}_{사용자ID}_{행번호}
            sheet_slug = "r" if "임대" in sheet_name else "s" if "구분" in sheet_name else "l"
            record_id = f"c_{sheet_slug}_{user_id}_{row_idx:06d}"
            
            return {
                "id": record_id,
                "user_id": user_id,
                "raw_row_index": row_idx,
                "address_full": address_full or None,
                "address_comp": {"region2": region2, "region": region, "lot": lot},
                "fields": fields,
                "status_raw": fields.get("현황", ""),
                "coords": None,
                "geocoded": False
            }
        except Exception:
            return None

if __name__ == "__main__":
    # 수동 실행 테스트
    service = CommercialSyncService()
    report = service.sync_all_users()
    print(json.dumps(report, indent=2, ensure_ascii=False))
