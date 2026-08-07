# app/services/commercial_sync_service.py

import os
import json
import re
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
import gspread

load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 하위 시트 및 테이블 매핑
# 상가 매물용 설정
SHEET_CONFIG = {
    "상가임대차": "listings_rent",
    "구분상가매매": "listings_sale_unit",
    "건물토지매매": "listings_sale_land"
}

# 주택 매물용 설정 (동기화 로직과 동일하게 유지)
HOUSING_SHEET_CONFIG = {
    "주택 매매": "listings_housing_sale",
    "주택임대차": "listings_housing_lease",
    "원룸임대차": "listings_housing_oneroom"
}

# 주택매물장 스프레드시트 ID
HOUSING_SHEET_ID = os.getenv("HOUSING_SHEET_ID", "1KZ7aLN_Vzfnp0MhnOsJXuCtPtGIPuVj-UaHB2xP7JRs")

class CommercialSyncService:
    # 클래스 레벨 락 (동시성 제어용)
    _sync_locks: Dict[str, bool] = {}

    def __init__(self):
        self.supabase = self._get_supabase_client()
        self.gs = self._get_google_sheets_client()
        self.geocode_cache = {}  # 주소별 {lat, lng} 캐시
        
    def _get_supabase_client(self) -> Client:
        from app.services.repositories import _get_supabase_client
        client = _get_supabase_client()
        if not client:
            raise ValueError("Supabase 클라이언트를 초기화할 수 없습니다. 환경변수 설정을 확인하세요.")
        return client

    def _get_google_sheets_client(self) -> gspread.Client:
        from app.core.google_auth import get_gspread_client
        client = get_gspread_client()
        if not client:
            raise Exception("Google 서비스 계정 인증 정보를 로드할 수 없습니다.")
        return client

    def normalize_header(self, header: str) -> str:
        """헤더 텍스트 정규화 (공백, 특수문자 완벽 제거 v22.3)"""
        if not header: return ""
        # 괄호와 그 안의 내용 제거 (예: 분양(㎡) -> 분양)
        clean = re.sub(r'\(.*?\)', '', header)
        # 모든 공백 문자(유니코드 포함) 및 특수문자 제거
        clean = re.sub(r'\s+', '', clean)
        clean = re.sub(r'[^가-힣a-zA-Z0-9]', '', clean)
        return clean.strip()

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
                "접수일": ["날짜", "접수일자", "date"],
                "지역2": ["시군구", "구"],
                "실평수": ["면적", "전용", "전용평수"],
                "소유자": ["소유주", "임대인"],
                "연락처": ["전화번호", "휴대폰", "연락"],
                "가게명": ["상호", "상호명", "건물명"],
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
        """모든 활성 슬롯의 시트를 동기화"""
        results: Dict[str, Any] = {
            "success": True,
            "slots_processed": 0,
            "total_synced": 0,
            "details": []
        }
        
        try:
            # 0. 지오코딩 캐시 미리 로드 (성능 최적화)
            self._load_geocode_cache()

            # 1. DB에서 활성 슬롯 목록 조회
            response = self.supabase.table("sheet_registry").select("*").eq("is_active", True).execute()
            slots = response.data if response.data else []
            
            if not slots:
                logger.info("동기화할 활성 슬롯이 없습니다.")
                return {"success": True, "slots_processed": 0, "total_synced": 0, "details": []}
                
            for slot in slots:
                slot_id = slot.get("slot_id")
                sheet_url = slot.get("sheet_url")
                user_id = slot.get("user_id")
                manager_name = slot.get("manager_name")
                
                # 🚀 [방어막: 공석 슬롯 스킵] 담당자가 없거나 비활성 상태면 스킵
                s_id = str(slot_id)
                if not s_id or not sheet_url or manager_name == "공석":
                    if manager_name == "공석":
                        logger.info(f"슬롯 {s_id} (공석): 싱크 스킵 (데이터 보호)")
                    else:
                        logger.info(f"슬롯 {s_id}: 필수 정보 없음 - Skip")
                    continue
                
                logger.info(f"슬롯 {s_id} (담당자: {manager_name}) 동기화 시작...")
                slot_sync = self.sync_single_slot(s_id, sheet_url, user_id, manager_name)
                results["details"].append(slot_sync)
                if slot_sync["success"]:
                    results["slots_processed"] += 1
                    results["total_synced"] += slot_sync["total_count"]
                    
        except Exception as e:
            import traceback
            logger.error(f"전체 동기화 중 오류 발생: {traceback.format_exc()}")
            results["success"] = False
            results["error"] = str(e)
            
        return results

    def sync_single_slot(self, slot_id: str, sheet_url: str, user_id: Optional[str] = None, manager_name: Optional[str] = None) -> Dict[str, Any]:
        """단일 슬롯 시트 동기화 (기존 sync_single_user 호환 및 개선)"""
        res: Dict[str, Any] = {
            "slot_id": slot_id,
            "success": False,
            "total_count": 0,
            "sheets": {},
            "errors": [],
            "geocode_updates": 0
        }
        # 후처리 지오코딩 대상: (table_name, record_id, address_full)
        geocode_pending: List[tuple] = []
        
        # 지오코딩 캐시 미리 로드 (API 호출 방지)
        if not self.geocode_cache:
            self._load_geocode_cache()
        
        # 동기화 작업 중복 실행 방지 (DB 레벨 자가 복구 락 사용)
        import uuid
        request_id = str(uuid.uuid4())
        
        try:
            # RPC 호출: DB 내부 시각 기준으로 10분 타임아웃 자동 체크
            rpc_res = self.supabase.rpc("safe_acquire_lock", {
                "p_slot_id": str(slot_id),
                "p_owner_id": request_id
            }).execute()
            
            if not rpc_res.data:
                logger.info(f"슬롯 {slot_id}는 현재 다른 프로세스에서 동기화 중이거나 잠겨 있습니다. (중복 방지)")
                res["errors"].append("Lock acquisition failed (already syncing).")
                return res
            
            logger.info(f"슬롯 {slot_id} 동기화 잠금 획득 성공 (Owner ID: {request_id})")

        except Exception as e:
            logger.error(f"슬롯 {slot_id} 동기화 잠금 RPC 호출 오류: {e}")
            res["errors"].append(f"RPC Lock Error: {e}")
            return res

        # === [전체 매물 DB 캐싱 (id → {address_full, coords}) — per-row 쿼리 제거] ===
        logger.info(f"🔄 슬롯 {slot_id} 기존 DB 매물 캐싱 중 (id, address_full, coords)...")
        db_existing = {}
        db_coords = {}
        for t_name in SHEET_CONFIG.values():
            db_existing[t_name] = {}
            try:
                p_size = 1000
                p_num = 0
                while True:
                    db_cache_res = self.supabase.table(t_name).select("id, address_full, coords").eq("slot_id", slot_id).range(p_num * p_size, (p_num + 1) * p_size - 1).execute()
                    if not db_cache_res.data: break
                    for r in db_cache_res.data:
                        db_existing[t_name][r["id"]] = r.get("address_full")
                        rc = r.get("coords")
                        if rc and isinstance(rc, dict) and rc.get("lat") and rc.get("lng"):
                            db_coords[r["id"]] = rc
                    if len(db_cache_res.data) < p_size: break
                    p_num += 1
            except Exception as e:
                logger.error(f"DB 초기 캐싱 실패 ({t_name}): {e}")
        logger.info(f"✅ DB 캐싱 완료 (existing={sum(len(v) for v in db_existing.values())}, coords={len(db_coords)})")

        try:
            m = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
            if not m:
                res["errors"].append(f"Invalid Sheet URL: {sheet_url}")
                return res
            sheet_id = m.group(1)
            
            try:
                spreadsheet = self.gs.open_by_key(sheet_id)
            except Exception as e:
                res["errors"].append(f"Spreadsheet Open Failed (ID: {sheet_id}): {repr(e)}")
                return res
            
            all_worksheets = {ws.title.strip(): ws for ws in spreadsheet.worksheets()}
            
            for sheet_name, table_name in SHEET_CONFIG.items():
                try:
                    target_ws = all_worksheets.get(sheet_name)
                    if not target_ws: continue
                        
                    values = target_ws.get_all_values()
                    # 🚀 [Bug Fix] 데이터가 없더라도(헤더만 있더라도) 계속 진행하여 고스트 데이터를 클린업하도록 함
                    # if len(values) < 2: continue
                    
                    # --- 동적 헤더 탐색 로직 추가 ---
                    header_idx = 0
                    found_header = False
                    # 상위 10행까지만 탐색
                    for i, row_vals in enumerate(values[:10]):
                        row_str = " ".join([str(v) for v in row_vals])
                        # 필수 키워드 중 2개 이상 포함 시 헤더로 간주
                        keywords = ["지역", "지번", "층", "건물명", "보증금", "월세"]
                        matches = [k for k in keywords if k in row_str]
                        if len(matches) >= 2:
                            header_idx = i
                            found_header = True
                            break
                    
                    if not found_header:
                        logger.warning(f"시트 {sheet_name}에서 유효한 헤더를 찾을 수 없음. 1행을 기본으로 사용합니다.")
                        header_idx = 0

                    headers = [h.strip() for h in values[header_idx]]
                    data_rows = values[header_idx + 1:]
                    
                    # --- 고도화된 헤더 매핑 적용 ---
                    expected_headers = [
                        "접수일", "지역", "지번", "건물명", "층수", "가게명", "분양", "실평수",
                        "보증금", "월세", "권리금", "비고", "담당자", "현황", "지역2", "연락처",
                        "의뢰인", "비고3", "위반여부", "현수막번호", "UUID"
                    ]
                    # 원본 매핑 (시트에 존재하는 모든 컬럼 유지용)
                    raw_header_map = {h: i for i, h in enumerate(headers) if h}
                    # 정규화 및 별칭 매핑 (비즈니스 로직용)
                    normalized_map = self.get_header_mapping(headers, expected_headers)
                    
                    # 통합 헤더 맵 (정규화된 이름 우선, 원본 보존)
                    header_map = raw_header_map.copy()
                    header_map.update(normalized_map)
                    
                    # 🚀 [UUID Column Check] UUID 컬럼이 없으면 자동 생성
                    uuid_col_idx = header_map.get("UUID")
                    if uuid_col_idx is None:
                        logger.info(f"시트 {sheet_name}에 UUID 컬럼이 없어 새로 생성합니다.")
                        uuid_col_idx = len(headers)
                        target_ws.add_cols(1)
                        target_ws.update_cell(header_idx + 1, uuid_col_idx + 1, "UUID")
                        header_map["UUID"] = uuid_col_idx
                        headers.append("UUID")

                    batch_data = []
                    uuid_updates = []
                    current_ids = [] # 🚀 [Bug Fix] 현재 시트의 유효 ID 목록 초기화
                    
                    if len(values) >= 1: # 최소한 헤더라도 있는 경우
                        from collections import defaultdict
                        uuid_groups = defaultdict(list)
                        
                        # DB 캐시 맵 (id → {address_full, coords}) 전달
                        target_table_name = SHEET_CONFIG.get(sheet_name, "listings_rent")
                        db_lookup = db_existing.get(target_table_name, {})
                        db_coords_lookup = db_coords  # 전체 coords

                        for idx, row in enumerate(data_rows, start=header_idx + 2):
                            record = self._process_row_v3(
                                slot_id, sheet_name, idx, row, header_map,
                                user_id, manager_name,
                                db_existing_map=db_lookup,
                                db_coords_map=db_coords_lookup
                            )
                            if record: uuid_groups[record["id"]].append(record)

                        # 지능형 중복 식별 (Smart Resolution)
                        for uid, recs in uuid_groups.items():
                            if len(recs) == 1:
                                record = recs[0]
                                if record.pop("is_new_uuid", False):
                                    import gspread
                                    uuid_updates.append({'range': gspread.utils.rowcol_to_a1(record["raw_row_index"], uuid_col_idx + 1), 'values': [[uid]]})
                                batch_data.append(record)
                                current_ids.append(record["id"])
                            else:
                                target_table = SHEET_CONFIG.get(sheet_name)
                                db_addr = db_existing.get(target_table, {}).get(uid)
                                
                                original_rec = next((r for r in recs if r["address_full"] == db_addr), None)
                                if not original_rec: original_rec = recs[0]
                                
                                original_rec.pop("is_new_uuid", False)
                                batch_data.append(original_rec)
                                current_ids.append(original_rec["id"])
                                
                                for r in recs:
                                    if r is original_rec: continue
                                    r.pop("is_new_uuid", False)
                                    if r["address_full"] == original_rec["address_full"]:
                                        # 아직 안 고친 쌍둥이: 대기
                                        pass
                                    else:
                                        # 고친 녀석: 가차없이 새 UUID 발급
                                        import gspread
                                        import uuid
                                        new_uid = str(uuid.uuid4())
                                        r["id"] = new_uid
                                        uuid_updates.append({'range': gspread.utils.rowcol_to_a1(r["raw_row_index"], uuid_col_idx + 1), 'values': [[new_uid]]})
                                        batch_data.append(r)
                                        current_ids.append(r["id"])
                    
                    # 🚀 [UUID Write-back] 생성된 UUID를 시트에 일괄 기록
                    if uuid_updates:
                        try:
                            target_ws.batch_update(uuid_updates)
                            logger.info(f"시트 {sheet_name}에 신규 UUID {len(uuid_updates)}개 박제 완료")
                        except Exception as wu_err:
                            logger.error(f"UUID 시트 쓰기 실패: {wu_err}")

                    # 🚀 [Bug Fix] 데이터가 있든 없든(Upsert 성공 후) 클린업 로직 실행
                    try:
                        if batch_data:
                            # [De-duplication] 동일한 ID(UUID)가 한 배치에 중복될 경우 대비 (마지막 발생 항목 유지)
                            unique_data = {}
                            for item in batch_data:
                                unique_data[item["id"]] = item
                            batch_data = list(unique_data.values())
                            
                            # [Atomic Sync] Upsert 기반 동기화
                            self.supabase.table(table_name).upsert(batch_data).execute()
                            logger.info(f"슬롯 {slot_id} ({sheet_name}) Upsert 완료: {len(batch_data)}개")

                            # 후처리 지오코딩 대상 수집 (주소 있고 coords 없는 것)
                            for item in batch_data:
                                if item.get("address_full") and not item.get("coords"):
                                    geocode_pending.append((table_name, item["id"], item["address_full"]))

# 🚀 [Ghost Record Cleanup] 시트에서 사라진 데이터 정리
                        # 다른 슬롯에 같은 UUID가 있으면(=이관 완료) 안전하게 삭제
                        # 다른 슬롯에 없으면(=고아 데이터) 삭제하지 않고 경고만 남김
                        db_ids = set()
                        p_size = 1000
                        p_num = 0
                        while True:
                            db_res = self.supabase.table(table_name).select("id").eq("slot_id", slot_id).range(p_num * p_size, (p_num + 1) * p_size - 1).execute()
                            if not db_res.data: break
                            db_ids.update(r["id"] for r in db_res.data)
                            if len(db_res.data) < p_size: break
                            p_num += 1

                        to_remove = list(db_ids - set(current_ids))
                        if to_remove:
                            # 다른 슬롯에 이관된 UUID인지 확인
                            safe_to_delete = []
                            orphan_ids = []
                            for i in range(0, len(to_remove), 500):
                                chunk = to_remove[i:i+500]
                                check_res = self.supabase.table(table_name).select("id").in_("id", chunk).neq("slot_id", slot_id).execute()
                                reassigned_ids = {r["id"] for r in (check_res.data or [])}
                                for rid in chunk:
                                    if rid in reassigned_ids:
                                        safe_to_delete.append(rid)
                                    else:
                                        orphan_ids.append(rid)

                            # 이관 완료: 이전 슬롯에서만 삭제 (사진은 유지)
                            if safe_to_delete:
                                for i in range(0, len(safe_to_delete), 100):
                                    chunk = safe_to_delete[i:i+100]
                                    self.supabase.table(table_name).delete().in_("id", chunk).eq("slot_id", slot_id).execute()
                                logger.info(f"🔄 슬롯 {slot_id} ({sheet_name}): 이관 완료 데이터 {len(safe_to_delete)}개 정리")

                            # 고아 데이터: 삭제하지 않고 경고만
                            if orphan_ids:
                                logger.warning(f"⚠️ 슬롯 {slot_id} ({sheet_name}): 고아 데이터 {len(orphan_ids)}개 - 다른 슬롯에도 없어 삭제 스킵 (수동 확인 필요): {orphan_ids[:5]}...")
                    except Exception as sync_err:
                        logger.error(f"슬롯 {slot_id} 동기화/클린업 중 치명적 오류: {sync_err}")
                        res["errors"].append(str(sync_err))

                    # sheets/total_count 기록 (정상 종료 시)
                    try:
                        bd_len = len(batch_data)
                    except Exception:
                        bd_len = 0
                    res["sheets"][sheet_name] = bd_len
                    res["total_count"] += bd_len

                except Exception as e:
                    res["errors"].append(f"시트 {sheet_name} 처리 실패: {e}")
            
            res["success"] = True

            # === [후처리 지오코딩] DB upsert 완료 후, coords가 없는 매물만 지오코딩 ===
            if geocode_pending:
                logger.info(f"🗺️ 후처리 지오코딩 시작: {len(geocode_pending)}건")
                try:
                    from .geocoding_service import GeocodingService
                    geo_service = GeocodingService()
                    geo_updates = []
                    for t_name, rec_id, addr in geocode_pending:
                        try:
                            new_coords = geo_service.geocode_address(addr)
                            if new_coords:
                                coords = {"lat": float(new_coords[0]), "lng": float(new_coords[1])}
                                self.geocode_cache[addr] = coords
                                geo_updates.append({"id": rec_id, "coords": coords})
                                # DB 지오코딩 캐시 테이블도 갱신
                                try:
                                    self.supabase.table("address_geocode_cache").upsert({
                                        "address_full": addr,
                                        "lat": coords["lat"],
                                        "lng": coords["lng"]
                                    }, on_conflict="address_full").execute()
                                except Exception:
                                    pass
                        except Exception as geo_err:
                            logger.error(f"지오코딩 실패 ({addr}): {geo_err}")

                    # coords 업데이트를 테이블별로 배치
                    if geo_updates:
                        # 테이블별로 그룹화
                        from collections import defaultdict
                        table_groups = defaultdict(list)
                        for t_name, rec_id, addr in geocode_pending:
                            for gu in geo_updates:
                                if gu["id"] == rec_id:
                                    table_groups[t_name].append(gu)
                                    break
                        for t_name, updates in table_groups.items():
                            try:
                                self.supabase.table(t_name).upsert(updates, on_conflict="id").execute()
                            except Exception as up_err:
                                logger.error(f"coords 업데이트 실패 ({t_name}): {up_err}")
                        logger.info(f"✅ 후처리 지오코딩 완료: {len(geo_updates)}/{len(geocode_pending)}건 좌표 획득")
                        res["geocode_updates"] = len(geo_updates)
                except Exception as geo_fatal:
                    logger.error(f"후처리 지오코딩 중 치명적 오류: {geo_fatal}")
                    res["errors"].append(f"Geocoding error: {geo_fatal}")
        except Exception as e:
            res["errors"].append(f"Fatal Error: {e}")
        finally:
            # 동기화 상태 안전하게 해제 (본인이 소유한 락만 해제)
            try:
                self.supabase.rpc("safe_release_lock", {
                    "p_slot_id": str(slot_id),
                    "p_owner_id": request_id
                }).execute()
                
                # 최종 성공 상태 기록 (락 해제와 별도로 인덱싱용 업데이트)
                # 🚀 [Bug Fix] 동기화 성공 여부와 관계없이 시도된 시각을 기록하여 웹훅 폭주 방지
                now_str = datetime.now(timezone.utc).isoformat() if hasattr(timezone, 'utc') else datetime.now().isoformat()
                status = "success" if res["success"] else "error"
                self.supabase.table("sheet_registry").update({
                    "last_synced_at": now_str,
                    "last_sync_status": status
                }).eq("slot_id", slot_id).execute()
                
                logger.info(f"슬롯 {slot_id} 동기화 프로세스 종료 및 상태 업데이트 완료")
            except Exception as final_err:
                logger.error(f"슬롯 {slot_id} 동기화 상태 정리 실패: {final_err}")
            
        return res

    def _process_row_v3(self, slot_id: str, sheet_name: str, row_idx: int, row: List[str], header_map: Dict[str, int], 
                       user_id: Optional[str] = None, manager_name: Optional[str] = None,
                       db_existing_map: Optional[Dict[str, str]] = None,
                       db_coords_map: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """UUID 우선, 없으면 새로 생성. per-row DB 쿼리/지오코딩 제거 — 메모리 캐시로 대체."""
        try:
            fields = {}
            for h, i in header_map.items():
                fields[h] = row[i].strip() if i < len(row) else ""
            
            listing_uuid = fields.get("UUID", "").strip()
            
            if listing_uuid and listing_uuid.startswith("c_") and "_slot" in listing_uuid:
                logger.info(f"♻️ UUID 강제 전환을 위해 무시: {listing_uuid}")
                listing_uuid = ""

            region2 = fields.get("지역2", fields.get("시군구", ""))
            region = fields.get("지역", "")
            lot = fields.get("지번", "")
            address_full = f"{region2} {region} {lot}".strip()
            
            if listing_uuid:
                record_id = listing_uuid
                is_new_uuid = False
            else:
                import uuid
                listing_uuid = str(uuid.uuid4())
                record_id = listing_uuid
                is_new_uuid = True
                fields["UUID"] = listing_uuid

            # 좌표: DB 캐시에서 먼저, 그 다음 지오코딩 캐시에서, 없으면 None (지오코딩은 후처리)
            coords = None
            geocoded = False

            if db_coords_map and record_id in db_coords_map:
                coords = db_coords_map[record_id]
                geocoded = True
            else:
                addr_key = address_full.strip()
                if addr_key and self.geocode_cache:
                    c = self.geocode_cache.get(addr_key)
                    if c:
                        coords = c
                        geocoded = True

            return {
                "id": record_id,
                "slot_id": slot_id,
                "user_id": user_id,
                "manager_name": manager_name,
                "raw_row_index": row_idx,
                "address_full": address_full or None,
                "address_comp": {"region2": region2, "region": region, "lot": lot},
                "fields": fields,
                "status_raw": fields.get("현황", "").strip() if fields.get("현황") else "",
                "coords": coords,
                "geocoded": geocoded,
                "is_new_uuid": is_new_uuid
            }
        except Exception as e:
            logger.error(f"Row 처리 중 오류 (Row: {row_idx}): {e}")
            return None


    def update_listing_status_in_sheet(self, listing_id: str, new_status: str) -> Dict[str, Any]:
        """
        UUID를 기반으로 DB와 시트의 현황을 동기화 업데이트 (상가 및 주택 모두 지원)

        트랜잭션 흐름:
        1. 락 획득 (동시성 제어)
        2. DB 업데이트 (원본 데이터)
        3. 시트 업데이트
        4. 시트 실패 시 DB 롤백
        5. 락 해제
        """
        # 1. 동시성 제어: 락 획득
        lock_key = f"status_update:{listing_id}"
        if CommercialSyncService._sync_locks.get(lock_key):
            return {"success": False, "error": "이미 처리 중인 요청입니다. 잠시 후 다시 시도해주세요."}

        CommercialSyncService._sync_locks[lock_key] = True
        old_status = None  # 롤백용

        try:
            # 2. DB에서 해당 매물 정보 조회 (상가 -> 주택 순서로 조회)
            record = None
            found_table = None
            is_housing = False

            # 상가 테이블 먼저 검색
            for sheet_name, table_name in SHEET_CONFIG.items():
                res = self.supabase.table(table_name).select("*").eq("id", listing_id).execute()
                if res.data:
                    record = res.data[0]
                    record["sheet_name"] = sheet_name # 동적 할당
                    found_table = table_name
                    break

            # 상가에 없으면 주택 테이블 검색
            if not record:
                for sheet_name, table_name in HOUSING_SHEET_CONFIG.items():
                    res = self.supabase.table(table_name).select("*").eq("id", listing_id).execute()
                    if res.data:
                        record = res.data[0]
                        record["sheet_name"] = sheet_name
                        found_table = table_name
                        is_housing = True
                        break

            if not record:
                return {"success": False, "error": f"매물을 찾을 수 없습니다. (ID: {listing_id})"}

            # 기존 현황 저장 (롤백용)
            old_status = record.get("status_raw")

            slot_id = record.get("slot_id")
            sheet_name = record.get("sheet_name")

            # 3. DB 먼저 업데이트 (원본 데이터 보호)
            try:
                self.supabase.table(found_table).update({"status_raw": new_status}).eq("id", listing_id).execute()
                logger.info(f"✅ DB 현황 업데이트 성공: {listing_id} -> '{new_status}'")
            except Exception as db_err:
                logger.error(f"❌ DB 업데이트 실패: {db_err}")
                return {"success": False, "error": f"DB 업데이트 실패: {str(db_err)}"}

            # 4. 시트 정보 확인
            if is_housing:
                # 주택 매물은 고정 시트 ID 사용
                sheet_url = f"https://docs.google.com/spreadsheets/d/{HOUSING_SHEET_ID}"
            else:
                # 상가 매물은 슬롯 정보에서 시트 URL 확인
                if not slot_id or not sheet_name:
                    # 시트 정보 없으면 DB만 업데이트하고 성공 처리 (시트 동기화는 별도)
                    logger.warning(f"⚠️ 시트 정보 없음 - DB만 업데이트: {listing_id}")
                    return {"success": True, "message": f"현황이 '{new_status}'로 변경되었습니다. (DB 반영 완료, 시트 정보 없음)"}

                slot_res = self.supabase.table("sheet_registry").select("sheet_url").eq("slot_id", slot_id).execute()
                if not slot_res.data:
                    logger.warning(f"⚠️ 슬롯 등록 정보 없음 - DB만 업데이트: {listing_id}")
                    return {"success": True, "message": f"현황이 '{new_status}'로 변경되었습니다. (DB 반영 완료)"}

                sheet_url = slot_res.data[0]["sheet_url"]

            # 5. 구글 시트 업데이트 시도
            sheet_error = None
            try:
                m = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
                if not m:
                    raise ValueError("잘못된 시트 URL 형식")

                spreadsheet = self.gs.open_by_key(m.group(1))
                try:
                    worksheet = spreadsheet.worksheet(sheet_name)
                except Exception:
                    # 공백 등 처리를 위해 루프 탐색
                    all_ws = {ws.title.strip(): ws for ws in spreadsheet.worksheets()}
                    worksheet = all_ws.get(sheet_name.strip())

                if not worksheet:
                    raise ValueError(f"시트 '{sheet_name}'를 찾을 수 없음")

                # UUID 컬럼 및 해당 행 찾기
                values = worksheet.get_all_values()
                if not values:
                    raise ValueError("시트 데이터가 비어 있음")

                # 🚀 [Bug Fix] 헤더 행 동적 탐색 (상위 10행 중 키워드 매칭)
                header_idx = 0
                found_header = False
                for i, row_vals in enumerate(values[:10]):
                    row_str = " ".join([str(v) for v in row_vals])
                    keywords = ["지역", "지번", "층", "건물명", "보증금", "월세"]
                    if len([k for k in keywords if k in row_str]) >= 2:
                        header_idx = i
                        found_header = True
                        break
                
                if not found_header:
                    logger.warning(f"시트 '{sheet_name}'에서 유효한 헤더를 찾을 수 없어 1행을 사용합니다.")
                    header_idx = 0

                headers = values[header_idx]
                norm_headers = [self.normalize_header(h) for h in headers]
                uuid_norm = self.normalize_header("UUID")
                status_norm = self.normalize_header("현황")

                if uuid_norm not in norm_headers:
                    raise ValueError("시트에 UUID 컬럼이 없음")

                uuid_col_idx = norm_headers.index(uuid_norm)

                # 행(Row) 찾기
                row_idx = -1
                for i, row in enumerate(values):
                    if i <= header_idx: continue # 헤더 이하부터 검색
                    # 🚀 [Bug Fix] UUID 비교 시 strip() 필수 적용 (미세 공백 매칭 실패 방지)
                    if len(row) > uuid_col_idx and row[uuid_col_idx].strip() == listing_id.strip():
                        row_idx = i + 1 # 1-based index (gspread update_cell용)
                        break

                if row_idx == -1:
                    raise ValueError(f"시트에서 매물(UUID: {listing_id})을 찾을 수 없음")

                # '현황' 컬럼 인덱스 찾기
                if status_norm not in norm_headers:
                    raise ValueError("시트에 '현황' 컬럼이 없음")

                status_col_idx = norm_headers.index(status_norm)

                # 셀 업데이트
                worksheet.update_cell(row_idx, status_col_idx + 1, new_status)
                logger.info(f"✅ 시트 업데이트 성공: UUID {listing_id} 의 현황을 '{new_status}'로 변경 (Row: {row_idx})")

            except Exception as sheet_err:
                sheet_error = sheet_err
                logger.error(f"❌ 시트 업데이트 실패, DB 롤백 시도: {sheet_err}")

                # 6. 시트 실패 시 DB 롤백
                try:
                    self.supabase.table(found_table).update({"status_raw": old_status}).eq("id", listing_id).execute()
                    logger.info(f"🔄 DB 롤백 완료: {listing_id} -> '{old_status}'")
                except Exception as rollback_err:
                    logger.error(f"🚨 DB 롤백 실패! 데이터 불일치 가능성: {rollback_err}")

                return {"success": False, "error": f"시트 동기화 실패: {str(sheet_error)}"}

            return {"success": True, "message": f"현황이 '{new_status}'로 변경되었습니다. (DB+시트 반영 완료)"}

        except Exception as e:
            logger.error(f"현황 업데이트 중 오류 발생: {e}")
            return {"success": False, "error": f"업데이트 실패: {str(e)}"}

        finally:
            # 7. 락 해제
            CommercialSyncService._sync_locks.pop(lock_key, None)

    def _load_geocode_cache(self):
        """Supabase에서 지오코딩 캐시를 메모리로 로드"""
        try:
            # 대량 데이터 대비 4000개 정도는 한 번에 가져와도 무방
            response = self.supabase.table("address_geocode_cache").select("address_full, lat, lng").execute()
            if response.data:
                for row in response.data:
                    addr = row.get("address_full")
                    lat = row.get("lat")
                    lng = row.get("lng")
                    if addr and lat and lng:
                        self.geocode_cache[addr] = {"lat": lat, "lng": lng}
            logger.info(f"지오코딩 캐시 {len(self.geocode_cache)}개 로드 완료")
        except Exception as e:
            logger.warning(f"지오코딩 캐시 로드 실패: {e}")

if __name__ == "__main__":
    # 수동 실행 테스트
    service = CommercialSyncService()
    report = service.sync_all_users()
    print(json.dumps(report, indent=2, ensure_ascii=False))
