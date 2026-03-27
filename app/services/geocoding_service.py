# app/services/geocoding_service.py

import os
import time
import logging
import pandas as pd
import requests
from typing import Dict, List, Tuple, Optional
from flask import current_app
from .sheet_fetcher import read_local_listing_sheet
from .geocode_cache import load_geocode_cache, save_geocode_cache

# Supabase 클라이언트 (선택적 import)
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

class GeocodingService:
    """지오코딩 자동화 서비스"""
    
    def __init__(self):
        # 로깅 설정을 먼저 수행
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # 환경변수에서 직접 API 키 로드 (Flask 컨텍스트와 관계없이)
        import os
        self.naver_client_id = os.getenv("NAVER_MAPS_NCP_CLIENT_ID", "")
        self.naver_client_secret = os.getenv("NAVER_MAPS_NCP_CLIENT_SECRET", "")
        
        # 기본값 설정
        self.geocode_cache_file = "geocode_cache.json"
        self.map_cache_file = "지도캐시.xlsx"
        self.data_dir = "./data"
        
        # Flask 컨텍스트가 있을 때 추가 설정 로드
        try:
            self.geocode_cache_file = current_app.config["GEOCODE_CACHE_FILE"]
            self.map_cache_file = current_app.config["MAP_CACHE_FILENAME"]
            self.data_dir = current_app.config["DATA_DIR"]
            self.logger.info("✅ Flask 컨텍스트에서 추가 설정 로드됨")
        except RuntimeError:
            self.logger.info("✅ 환경변수에서 기본 설정 사용")
        
        # data_dir이 None이거나 빈 문자열인 경우 기본값 사용
        if not self.data_dir or self.data_dir.strip() == "":
            self.data_dir = "./data"
            self.logger.info(f"data_dir이 설정되지 않아 기본값 사용: {self.data_dir}")
        
        # API 키 상태 즉시 확인 및 로깅 (logger 초기화 후)
        print(f"=== API 키 상태 확인 (__init__) ===")
        print(f"Client ID: {'*' * len(self.naver_client_id) if self.naver_client_id else 'None'}")
        print(f"Client Secret: {'*' * 8 if self.naver_client_secret else 'None'}")  # 고정 길이로 마스킹
        
        if not self.naver_client_id or not self.naver_client_secret:
            print("❌ 네이버 지오코딩 API 키가 설정되지 않았습니다!")
            print("   NAVER_MAPS_NCP_CLIENT_ID와 NAVER_MAPS_NCP_CLIENT_SECRET 환경변수를 확인해주세요.")
        else:
            print("✅ 네이버 API 키가 정상적으로 로드되었습니다.")
        print("=" * 50)
        
        self._log_api_key_status("__init__")
    
    def _log_api_key_status(self, context: str):
        """API 키 상태를 로깅하는 헬퍼 메서드 (키 값은 노출하지 않음)"""
        self.logger.info(f"=== API 키 상태 확인 ({context}) ===")
        self.logger.info(f"Client ID: {'*' * len(self.naver_client_id) if self.naver_client_id else 'None'}")
        self.logger.info(f"Client Secret: {'*' * len(self.naver_client_secret) if self.naver_client_secret else 'None'}")
        
        if not self.naver_client_id or not self.naver_client_secret:
            self.logger.error("❌ 네이버 지오코딩 API 키가 설정되지 않았습니다!")
            self.logger.error("   NAVER_MAPS_NCP_CLIENT_ID와 NAVER_MAPS_NCP_CLIENT_SECRET 환경변수를 확인해주세요.")
        else:
            self.logger.info("✅ 네이버 API 키가 정상적으로 로드되었습니다.")
        self.logger.info("=" * 50)
    
    def update_config(self):
        """Flask 컨텍스트에서 설정 업데이트"""
        self.logger.info("update_config 메서드 호출됨")
        try:
            self.naver_client_id = current_app.config.get("NAVER_MAPS_NCP_CLIENT_ID", "")
            self.naver_client_secret = current_app.config.get("NAVER_MAPS_NCP_CLIENT_SECRET", "")
            self.geocode_cache_file = current_app.config["GEOCODE_CACHE_FILE"]
            self.map_cache_file = current_app.config["MAP_CACHE_FILENAME"]
            self.data_dir = current_app.config["DATA_DIR"]
            self.logger.info("✅ 설정이 Flask 컨텍스트에서 업데이트되었습니다.")
            self._log_api_key_status("update_config (Flask 컨텍스트)")
        except RuntimeError as e:
            # Flask 컨텍스트가 없는 경우 환경변수에서 직접 로드
            self.logger.warning(f"Flask 컨텍스트 없음: {e}")
            import os
            self.naver_client_id = os.getenv("NAVER_MAPS_NCP_CLIENT_ID", "")
            self.naver_client_secret = os.getenv("NAVER_MAPS_NCP_CLIENT_SECRET", "")
            self.geocode_cache_file = "geocode_cache.json"
            self.map_cache_file = "지도캐시.xlsx"
            self.data_dir = "./data"
            self.logger.info("✅ 설정이 환경변수에서 업데이트되었습니다.")
            self._log_api_key_status("update_config (환경변수)")
        
        # data_dir이 None이거나 빈 문자열인 경우 기본값 사용
        if not self.data_dir or self.data_dir.strip() == "":
            self.data_dir = "./data"
            self.logger.info(f"data_dir이 설정되지 않아 기본값 사용: {self.data_dir}")
    
    def extract_housing_addresses_from_supabase(self) -> List[str]:
        """Supabase 주택매물 테이블에서 현황이 '생'인 매물의 주소만 추출"""
        try:
            supabase = self._get_supabase_client()
            if not supabase:
                self.logger.warning("Supabase 클라이언트를 생성할 수 없습니다. 주택매물 주소 추출 건너뜀.")
                return []
            
            addresses = []
            housing_tables = ["listings_housing_sale", "listings_housing_lease", "listings_housing_oneroom"]
            
            for table_name in housing_tables:
                try:
                    # 모든 매물 조회 (필터 제거)
                    result = supabase.table(table_name).select("address_full").execute()
                    
                    for row in result.data:
                        # address_full 추출
                        address_full = row.get("address_full", "").strip()
                        if address_full and address_full not in addresses:
                            addresses.append(address_full)
                    
                    self.logger.info(f"{table_name}에서 {len(result.data)}개 매물 주소 추출 완료")
                    
                except Exception as e:
                    self.logger.error(f"{table_name}에서 주소 추출 실패: {e}")
                    continue
            
            self.logger.info(f"Supabase 주택매물에서 현황이 '생'인 매물 {len(addresses)}개 주소 추출 완료")
            return addresses
            
        except Exception as e:
            self.logger.error(f"주택매물 주소 추출 실패: {e}")
            return []
    
    def extract_commercial_addresses_from_supabase(self) -> List[str]:
        """Supabase 상가매물 테이블에서 현황이 '생'인 매물의 주소 추출"""
        try:
            supabase = self._get_supabase_client()
            if not supabase:
                return []
            
            addresses = []
            commercial_tables = ["listings_rent", "listings_sale_unit", "listings_sale_land"]
            
            for table_name in commercial_tables:
                try:
                    # Pagination 처리 (대량 데이터 대비)
                    offset = 0
                    page_size = 1000
                    while True:
                        result = supabase.table(table_name).select("address_full").range(offset, offset + page_size - 1).execute()
                        if not result.data:
                            break
                        
                        for row in result.data:
                            addr = (row.get("address_full") or "").strip()
                            if addr and addr not in addresses:
                                addresses.append(addr)
                        
                        if len(result.data) < page_size:
                            break
                        offset += page_size
                        
                    self.logger.info(f"{table_name}에서 매물 주소 추출 중... 현재 누적: {len(addresses)}개")
                    
                except Exception as e:
                    self.logger.error(f"{table_name}에서 주소 추출 실패: {e}")
                    continue
            
            return addresses
        except Exception as e:
            self.logger.error(f"상가매물 주소 추출 실패: {e}")
            return []

    def extract_addresses_from_listings(self) -> List[str]:
        """
        [Legacy/Sync] 상가임대차.xlsx 및 Supabase에서 주소 추출
        이제는 Supabase 데이터를 우선적으로 사용하도록 권장됩니다.
        """
        # 1. Supabase에서 먼저 추출 (새로운 표준)
        supabase_addresses = self.extract_commercial_addresses_from_supabase()
        
        # 2. 로컬 파일에서 추가 추출 (하위 호환성 유지)
        local_addresses = []
        try:
            filename = os.getenv("LISTING_SHEET_FILENAME", "상가임대차.xlsx")
            data_dir = os.getenv("DATA_DIR", "./data")
            source_path = os.path.join(data_dir, "raw", filename)
            
            if os.path.exists(source_path):
                rows = read_local_listing_sheet()
                if rows and len(rows) >= 2:
                    header = rows[0]
                    hdr_map = self._normalize_headers(header)
                    for row in rows[1:]:
                        r2 = row[hdr_map.get("지역2", -1)] if "지역2" in hdr_map else ""
                        r1 = row[hdr_map.get("지역", -1)] if "지역" in hdr_map else ""
                        lot = row[hdr_map.get("지번", -1)] if "지번" in hdr_map else ""
                        if r2 and r1 and lot:
                            addr = f"{r2} {r1} {lot}".strip()
                            if addr not in local_addresses:
                                local_addresses.append(addr)
        except Exception as e:
            self.logger.warning(f"로컬 파일 주소 추출 실패 (Supabase 데이터 사용): {e}")
            
        return list(set(supabase_addresses + local_addresses))
    
    def _normalize_headers(self, header_row: List[str]) -> Dict[str, int]:
        """헤더 정규화"""
        mapping = {}
        for i, col in enumerate(header_row):
            mapping[col] = i
        return mapping
    
    def get_existing_coordinates(self) -> Dict[str, Tuple[float, float]]:
        """지도캐시에서 기존 좌표 가져오기"""
        try:
            # data_dir과 map_cache_file이 유효한지 확인
            if not self.data_dir or not self.map_cache_file:
                self.logger.warning("data_dir 또는 map_cache_file이 설정되지 않았습니다.")
                return {}
            
            map_cache_path = os.path.join(self.data_dir, "raw", self.map_cache_file)
            self.logger.info(f"지도캐시 파일 경로: {map_cache_path}")
            
            if not os.path.exists(map_cache_path):
                self.logger.warning(f"지도캐시 파일이 없습니다: {map_cache_path}")
                return {}
            
            # 통합된 Excel 읽기 함수 사용
            from .sheet_fetcher import read_excel_file_universal
            try:
                rows = read_excel_file_universal(map_cache_path)
                if not rows or len(rows) < 2:
                    self.logger.warning("지도캐시 데이터가 없습니다.")
                    return {}
                
                # 첫 번째 행을 헤더로 사용하고 나머지를 데이터로 변환
                df = pd.DataFrame(rows[1:], columns=rows[0])
            except Exception as e:
                self.logger.error(f"지도캐시 Excel 읽기 실패: {e}")
                return {}
            
            coordinates = {}
            for _, row in df.iterrows():
                addr = row.get("주소", "").strip()
                lat = row.get("위도", "").strip()
                lng = row.get("경도", "").strip()
                
                if addr and lat and lng:
                    try:
                        lat_val = float(lat)
                        lng_val = float(lng)
                        if -90 <= lat_val <= 90 and -180 <= lng_val <= 180:
                            coordinates[addr] = (lat_val, lng_val)
                    except ValueError:
                        continue
            
            self.logger.info(f"지도캐시에서 {len(coordinates)}개 좌표 로드 완료")
            return coordinates
            
        except Exception as e:
            self.logger.error(f"지도캐시 읽기 실패: {e}")
            return {}
    
    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """네이버 지오코딩 API로 주소를 좌표로 변환 (지능형 단계별 폴백 적용)"""
        if not address:
            return None

        # 부평 사무실 기준 좌표 (부평구 부평동 근처)
        OFFICE_LAT = 37.5088
        OFFICE_LNG = 126.7117

        def get_dist(lat, lng):
            # 직선 거리 근사치 연산 (km 단위)
            return ((lat - OFFICE_LAT)**2 + (lng - OFFICE_LNG)**2)**0.5 * 111

        # [전처리] 복수 지번 처리: 콤마(,)가 있으면 첫 번째 부분만 사용
        addr_to_search = address.split(',')[0].strip() if ',' in address else address
        
        self.logger.info(f"=== 지능형 지오코딩 시작: {address} (검색어: {addr_to_search}) ===")

        def call_api(query):
            if not self.naver_client_id or not self.naver_client_secret:
                return []
            try:
                url = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode"
                headers = {
                    "X-NCP-APIGW-API-KEY-ID": self.naver_client_id,
                    "X-NCP-APIGW-API-KEY": self.naver_client_secret,
                }
                params = {"query": query}
                res = requests.get(url, headers=headers, params=params, timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("addresses", [])
            except Exception as e:
                self.logger.error(f"지오코딩 API 호출 실패: {e}")
            return []

        # 1차 시도: 정석 주소 검색
        results = call_api(addr_to_search)

        # 2차 시도: 1차 실패 시 '#N/A' 제거 후 '동+지번' 폴백 검색
        if not results and "#N/A" in addr_to_search:
            fallback_query = addr_to_search.replace("#N/A", "").strip()
            self.logger.info(f"🔄 2차 시도(폴백): {fallback_query}")
            results = call_api(fallback_query)

        if not results:
            self.logger.warning(f"⚠️ 지오코딩 결과 없음: {address}")
            return None

        # 결과 처리
        if len(results) > 1:
            self.logger.info(f"⚖️ 중복 결과 발생({len(results)}개), 부평 사무실 기준 근접 거리 선택 중...")
            best_match = None
            min_dist = float('inf')
            
            for addr_info in results:
                try:
                    lat, lng = float(addr_info["y"]), float(addr_info["x"])
                    dist = get_dist(lat, lng)
                    if dist < min_dist:
                        min_dist = dist
                        best_match = (lat, lng)
                except: continue
            
            if best_match and min_dist < 50: # 50km 이내 결과만 인정
                self.logger.info(f"✅ 최적지 선택 완료 (거리: {min_dist:.2f}km)")
                return best_match
            return None
        else:
            # 단일 결과
            res = results[0]
            lat, lng = float(res["y"]), float(res["x"])
            return (lat, lng)
    
    def _get_supabase_client(self) -> Optional[Client]:
        """Supabase 클라이언트 생성 (설정이 없으면 None 반환)"""
        if not SUPABASE_AVAILABLE:
            return None
        
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if not supabase_url or not supabase_key:
                return None
            
            return create_client(supabase_url, supabase_key)
        except Exception as e:
            self.logger.warning(f"Supabase 클라이언트 생성 실패: {e}")
            return None
    
    def sync_coords_to_supabase_listings(self):
        """캐시된 좌표를 상가 매물 테이블의 coords 컬럼에 영구적으로 채워넣기"""
        try:
            supabase = self._get_supabase_client()
            if not supabase:
                return
            
            self.logger.info("🔄 지오코드 캐시 -> 매물 테이블 좌표 동기화 시작")
            
            # 1. 캐시 데이터 로드
            result = supabase.table("address_geocode_cache").select("address_full, lat, lng").execute()
            if not result.data: return
            
            cache = {r["address_full"]: {"lat": r["lat"], "lng": r["lng"]} for r in result.data if r["lat"] and r["lng"]}
            
            # 2. 각 테이블 업데이트 (상가 + 주택)
            target_tables = [
                "listings_rent", "listings_sale_unit", "listings_sale_land",
                "listings_housing_sale", "listings_housing_lease", "listings_housing_oneroom"
            ]
            
            for table in target_tables:
                # 좌표가 null인 데이터 조회 (현황이 '생'인 매물 우선)
                res = supabase.table(table).select("id, address_full").is_("coords", "null").execute()
                if not res.data: continue
                
                updated_count = 0
                for row in res.data:
                    addr = (row.get("address_full") or "").strip()
                    if addr in cache:
                        try:
                            supabase.table(table).update({
                                "coords": cache[addr],
                                "geocoded": True
                            }).eq("id", row["id"]).execute()
                            updated_count += 1
                        except Exception: continue
                
                if updated_count > 0:
                    self.logger.info(f"✅ {table}: {updated_count}개 매물 좌표 영구 반영 완료")
                
        except Exception as e:
            self.logger.error(f"좌표 DB 동기화 실패: {e}")

    def update_map_cache(self, new_coordinates: Dict[str, Tuple[float, float]]):
        """지도 캐시 파일 업데이트 (엑셀 + Supabase 동시 저장)"""
        excel_success = False
        supabase_success = False
        
        # 1. 엑셀 파일 저장 (기존 로직)
        try:
            # 기존 지도캐시 파일 읽기
            map_cache_path = os.path.join(self.data_dir, "raw", self.map_cache_file)
            
            # 기존 데이터 읽기
            existing_data = []
            if os.path.exists(map_cache_path):
                try:
                    df = pd.read_excel(map_cache_path, dtype=str).fillna("")
                    for _, row in df.iterrows():
                        existing_data.append({
                            "주소": row.get("주소", ""),
                            "위도": row.get("위도", ""),
                            "경도": row.get("경도", "")
                        })
                    self.logger.info(f"기존 지도캐시에서 {len(existing_data)}개 데이터 로드")
                except Exception as e:
                    self.logger.warning(f"기존 지도캐시 읽기 실패, 새로 시작: {e}")
            
            # 새 좌표 데이터 추가 (중복 방지)
            added_count = 0
            
            for addr, (lat, lng) in new_coordinates.items():
                # 이미 존재하는 주소인지 확인
                existing = next((item for item in existing_data if item["주소"] == addr), None)
                
                if existing:
                    # 기존 주소 업데이트
                    existing["위도"] = str(lat)
                    existing["경도"] = str(lng)
                    self.logger.info(f"기존 주소 업데이트: {addr}")
                else:
                    # 새 주소 추가
                    existing_data.append({
                        "주소": addr,
                        "위도": str(lat),
                        "경도": str(lng)
                    })
                    added_count += 1
                    self.logger.info(f"새 주소 추가: {addr}")
            
            # DataFrame으로 변환하여 저장
            cache_df = pd.DataFrame(existing_data)
            cache_df.to_excel(map_cache_path, index=False)
            
            excel_success = True
            self.logger.info(f"✅ 엑셀 지도 캐시 업데이트 완료: 기존 {len(existing_data) - added_count}개, 새로 추가 {added_count}개")
            
        except Exception as e:
            self.logger.error(f"❌ 엑셀 지도 캐시 업데이트 실패: {e}")
            excel_success = False
        
        # 2. Supabase 저장 (엑셀 저장 성공 여부와 관계없이 시도)
        try:
            supabase = self._get_supabase_client()
            if supabase:
                # 배치로 Supabase에 저장 (배치 크기: 100)
                batch_size = 100
                coordinates_list = list(new_coordinates.items())
                supabase_inserted = 0
                
                for i in range(0, len(coordinates_list), batch_size):
                    batch = coordinates_list[i:i + batch_size]
                    batch_data = []
                    
                    for addr, (lat, lng) in batch:
                        batch_data.append({
                            "address_full": addr,
                            "lat": lat,
                            "lng": lng
                        })
                    
                    try:
                        # Upsert 실행 (address_full이 PK이므로 중복 시 업데이트)
                        supabase.table("address_geocode_cache").upsert(
                            batch_data,
                            on_conflict="address_full"
                        ).execute()
                        
                        supabase_inserted += len(batch)
                        self.logger.info(f"✅ Supabase 배치 저장 완료: {len(batch)}개")
                        
                    except Exception as e:
                        self.logger.error(f"❌ Supabase 배치 저장 실패: {e}")
                        # 개별 저장 시도
                        for addr, (lat, lng) in batch:
                            try:
                                supabase.table("address_geocode_cache").upsert({
                                    "address_full": addr,
                                    "lat": lat,
                                    "lng": lng
                                }, on_conflict="address_full").execute()
                                supabase_inserted += 1
                            except Exception as e2:
                                self.logger.error(f"❌ Supabase 개별 저장 실패: {addr} - {e2}")
                
                supabase_success = True
                self.logger.info(f"✅ Supabase 지도 캐시 업데이트 완료: {supabase_inserted}개 저장")
                
                # 추가: 매물 테이블에도 전파
                self.sync_coords_to_supabase_listings()
            else:
                self.logger.warning("⚠️ Supabase 클라이언트를 생성할 수 없습니다. 엑셀만 저장됩니다.")
                
        except Exception as e:
            self.logger.error(f"❌ Supabase 지도 캐시 업데이트 실패: {e}")
            supabase_success = False
        
        # 3. 최종 결과 확인
        if not excel_success and not supabase_success:
            raise Exception("엑셀과 Supabase 모두 저장 실패")
        elif not excel_success:
            self.logger.warning("⚠️ 엑셀 저장 실패했지만 Supabase 저장은 성공했습니다.")
        elif not supabase_success:
            self.logger.warning("⚠️ Supabase 저장 실패했지만 엑셀 저장은 성공했습니다.")
    
    def run_geocoding_update(self) -> Dict[str, int]:
        """지오코딩 업데이트 실행 (상가 + 주택 매물, 새 매물만 처리)"""
        try:
            self.logger.info("🚀 지오코딩 업데이트 시작...")
            
            # 1. 상가임대차에서 주소 추출
            commercial_addresses = self.extract_addresses_from_listings()
            self.logger.info(f"상가임대차 주소: {len(commercial_addresses)}개")
            
            # 2. 주택매물에서 주소 추출 (Supabase)
            housing_addresses = self.extract_housing_addresses_from_supabase()
            self.logger.info(f"주택매물 주소: {len(housing_addresses)}개")
            
            # 3. 모든 주소 합치기 (중복 제거)
            all_addresses = list(set(commercial_addresses + housing_addresses))
            self.logger.info(f"전체 주소 (중복 제거 후): {len(all_addresses)}개")
            
            if not all_addresses:
                return {"total": 0, "new": 0, "updated": 0, "failed": 0, "commercial": 0, "housing": 0}
            
            # 4. 기존 지도캐시에서 좌표 가져오기 (기존 캐시 유지)
            existing_coordinates = self.get_existing_coordinates()
            
            # 5. Supabase 캐시에서도 좌표 가져오기 (중복 체크용)
            supabase_coordinates = {}
            try:
                supabase = self._get_supabase_client()
                if supabase:
                    result = supabase.table("address_geocode_cache").select("address_full, lat, lng").execute()
                    for row in result.data:
                        addr = row.get("address_full", "").strip()
                        lat = row.get("lat")
                        lng = row.get("lng")
                        if addr and lat is not None and lng is not None:
                            supabase_coordinates[addr] = (float(lat), float(lng))
                    self.logger.info(f"Supabase 캐시에서 {len(supabase_coordinates)}개 좌표 로드")
            except Exception as e:
                self.logger.warning(f"Supabase 캐시 읽기 실패 (계속 진행): {e}")
            
            # 6. 기존 좌표 통합 (엑셀 + Supabase)
            all_existing_coordinates = {**existing_coordinates, **supabase_coordinates}
            
            # 7. 새로 지오코딩이 필요한 주소만 찾기 (기존에 없는 주소)
            new_addresses = [addr for addr in all_addresses if addr not in all_existing_coordinates]
            
            self.logger.info(f"총 주소: {len(all_addresses)}, 기존 좌표: {len(all_existing_coordinates)}, 새 주소: {len(new_addresses)}")
            
            if not new_addresses:
                self.logger.info("새로 지오코딩이 필요한 주소가 없습니다. 기존 캐시 유지.")
                return {
                    "total": len(all_addresses),
                    "new": 0,
                    "updated": 0,
                    "failed": 0,
                    "commercial": len(commercial_addresses),
                    "housing": len(housing_addresses)
                }
            
            # 8. 새 주소들만 지오코딩 (기존 매물은 건드리지 않음)
            new_coordinates = {}
            failed_addresses = []
            
            for i, address in enumerate(new_addresses, 1):
                self.logger.info(f"지오코딩 진행 중: {i}/{len(new_addresses)} - {address}")
                
                coordinates = self.geocode_address(address)
                if coordinates:
                    new_coordinates[address] = coordinates
                    self.logger.info(f"✅ 새 매물 지오코딩 성공: {address}")
                else:
                    failed_addresses.append(address)
                    self.logger.warning(f"❌ 새 매물 지오코딩 실패: {address}")
                
                # API 호출 제한 방지 (초당 1회)
                if i < len(new_addresses):
                    time.sleep(1)
            
            # 9. 새 매물만 캐시에 추가 (엑셀 + Supabase)
            if new_coordinates:
                self.logger.info(f"새 매물 {len(new_coordinates)}개를 캐시에 추가합니다.")
                self.update_map_cache(new_coordinates)
            else:
                self.logger.warning("새로 지오코딩된 매물이 없습니다.")
            
            # 10. 결과 요약
            result = {
                "total": len(all_addresses),
                "new": len(new_coordinates),
                "updated": 0,  # 기존 매물은 업데이트하지 않음
                "failed": len(failed_addresses),
                "commercial": len(commercial_addresses),
                "housing": len(housing_addresses)
            }
            
            self.logger.info(f"✅ 지오코딩 업데이트 완료: {result}")
            self.logger.info(f"기존 캐시 유지: {len(all_existing_coordinates)}개 매물")
            self.logger.info(f"  - 상가: {len(commercial_addresses)}개, 주택: {len(housing_addresses)}개")
            
            if failed_addresses:
                self.logger.warning(f"실패한 새 주소들: {failed_addresses}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"지오코딩 업데이트 실행 실패: {e}")
            return {"total": 0, "new": 0, "updated": 0, "failed": 0, "commercial": 0, "housing": 0}
