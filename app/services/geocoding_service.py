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
        
        # API 키 상태 즉시 확인 및 로깅 (logger 초기화 후)
        print(f"=== API 키 상태 확인 (__init__) ===")
        print(f"Client ID: {'*' * len(self.naver_client_id) if self.naver_client_id else 'None'}")
        print(f"Client Secret: {'*' * len(self.naver_client_secret) if self.naver_client_secret else 'None'}")
        
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
    
    def extract_addresses_from_listings(self) -> List[str]:
        """상가임대차.xlsx에서 현황이 '생'인 매물의 주소만 추출"""
        try:
            rows = read_local_listing_sheet()
            if not rows or len(rows) < 2:
                self.logger.warning("상가임대차 데이터가 없습니다.")
                return []
            
            header = rows[0]
            hdr_map = self._normalize_headers(header)
            
            addresses = []
            for i, row in enumerate(rows[1:], start=1):
                try:
                    # 현황이 '생'인 매물만 처리
                    status = row[hdr_map.get("현황", -1)] if "현황" in hdr_map else ""
                    if status != "생":
                        continue  # 현황이 '생'이 아닌 매물은 건너뛰기
                    
                    # 주소 구성: 지역2 + 지역 + 지번
                    region2 = row[hdr_map.get("지역2", -1)] if "지역2" in hdr_map else ""
                    region = row[hdr_map.get("지역", -1)] if "지역" in hdr_map else ""
                    lot = row[hdr_map.get("지번", -1)] if "지번" in hdr_map else ""
                    
                    # 주소가 완성된 경우만 추가
                    if region2 and region and lot:
                        address = f"{region2} {region} {lot}".strip()
                        # 줄바꿈 문자 제거 및 정리
                        address = address.replace('\n', ' ').replace('\r', ' ').strip()
                        # 연속된 공백을 하나로
                        address = ' '.join(address.split())
                        if address and address not in addresses:
                            addresses.append(address)
                            
                except Exception as e:
                    self.logger.warning(f"Row {i} 주소 파싱 실패: {e}")
                    continue
            
            self.logger.info(f"상가임대차에서 현황이 '생'인 매물 {len(addresses)}개 주소 추출 완료")
            return addresses
            
        except Exception as e:
            self.logger.error(f"주소 추출 실패: {e}")
            return []
    
    def _normalize_headers(self, header_row: List[str]) -> Dict[str, int]:
        """헤더 정규화"""
        mapping = {}
        for i, col in enumerate(header_row):
            mapping[col] = i
        return mapping
    
    def get_existing_coordinates(self) -> Dict[str, Tuple[float, float]]:
        """지도캐시에서 기존 좌표 가져오기"""
        try:
            map_cache_path = os.path.join(self.data_dir, "raw", self.map_cache_file)
            if not os.path.exists(map_cache_path):
                self.logger.warning(f"지도캐시 파일이 없습니다: {map_cache_path}")
                return {}
            
            # Excel 파일 읽기 (xlrd 엔진만 사용)
            df = None
            try:
                df = pd.read_excel(map_cache_path, dtype=str, engine='xlrd').fillna("")
            except Exception as e:
                # xlrd 실패 시 기본 엔진 시도
                df = pd.read_excel(map_cache_path, dtype=str).fillna("")
            
            if df is None:
                # 모든 엔진이 실패한 경우 기본 엔진으로 시도
                try:
                    xls = pd.ExcelFile(map_cache_path)
                    sheet = "지도캐시" if "지도캐시" in xls.sheet_names else xls.sheet_names[0]
                    df = pd.read_excel(map_cache_path, sheet_name=sheet, dtype=str).fillna("")
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
        """네이버 지오코딩 API로 주소를 좌표로 변환"""
        # API 키 상태 확인 (로그에는 노출하지 않음)
        self.logger.info(f"=== 지오코딩 시작: {address} ===")
        
        if not self.naver_client_id or not self.naver_client_secret:
            self.logger.error(f"❌ 지오코딩 실패: 네이버 API 키가 설정되지 않았습니다. ({address})")
            return None
        
        try:
            url = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode"
            headers = {
                "X-NCP-APIGW-API-KEY-ID": self.naver_client_id,
                "X-NCP-APIGW-API-KEY": self.naver_client_secret,
                "Accept": "application/json"
            }
            params = {
                "query": address
            }
            
            # 디버깅: 헤더 값 로그 출력 (API 키는 제외)
            self.logger.info(f"지오코딩 API 호출 - URL: {url}")
            self.logger.info(f"지오코딩 API 호출 - Params: {params}")
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            
            # 응답 상태 및 내용 로깅
            self.logger.info(f"API 응답 상태 코드: {response.status_code}")
            self.logger.info(f"API 응답 헤더: {dict(response.headers)}")
            
            if response.status_code != 200:
                self.logger.error(f"API 응답 내용: {response.text}")
            
            response.raise_for_status()
            
            data = response.json()
            
            # 응답 데이터 로깅
            self.logger.info(f"API 응답 데이터: {data}")
            
            if data.get("status") == "OK" and data.get("addresses"):
                address_info = data["addresses"][0]
                lat = float(address_info["y"])
                lng = float(address_info["x"])
                
                # 좌표값 상세 로깅
                self.logger.info(f"📍 API 반환 좌표: {address} → 위도: {lat}, 경도: {lng}")
                
                # 한국 지역 범위 확인
                if 33 <= lat <= 39 and 124 <= lng <= 132:
                    self.logger.info(f"✅ 지오코딩 성공: {address} → ({lat}, {lng})")
                    return (lat, lng)
                else:
                    self.logger.warning(f"⚠️ 한국 지역 범위를 벗어난 좌표: {address} → ({lat}, {lng})")
                    self.logger.warning(f"   위도 범위: 33-39, 경도 범위: 124-132")
                    return None
            else:
                error_msg = data.get('errorMessage', 'Unknown error')
                if not error_msg:
                    error_msg = f"Status: {data.get('status', 'Unknown')}"
                self.logger.warning(f"⚠️ 지오코딩 실패: {address} - {error_msg}")
                return None
                
        except Exception as e:
            self.logger.error(f"❌ 지오코딩 API 호출 실패 ({address}): {e}")
            return None
    
    def update_map_cache(self, new_coordinates: Dict[str, Tuple[float, float]]):
        """지도 캐시 파일 업데이트 (기존 파일 덮어쓰기 방지)"""
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
            
            self.logger.info(f"지도 캐시 업데이트 완료: 기존 {len(existing_data) - added_count}개, 새로 추가 {added_count}개")
            
        except Exception as e:
            self.logger.error(f"지도 캐시 업데이트 실패: {e}")
            raise
    
    def run_geocoding_update(self) -> Dict[str, int]:
        """지오코딩 업데이트 실행 (새 매물만 처리)"""
        try:
            self.logger.info("🚀 지오코딩 업데이트 시작...")
            
            # 1. 상가임대차에서 모든 주소 추출
            all_addresses = self.extract_addresses_from_listings()
            if not all_addresses:
                return {"total": 0, "new": 0, "updated": 0, "failed": 0}
            
            # 2. 기존 지도캐시에서 좌표 가져오기 (기존 캐시 유지)
            existing_coordinates = self.get_existing_coordinates()
            
            # 3. 새로 지오코딩이 필요한 주소만 찾기 (기존에 없는 주소)
            new_addresses = [addr for addr in all_addresses if addr not in existing_coordinates]
            
            self.logger.info(f"총 주소: {len(all_addresses)}, 기존 좌표: {len(existing_coordinates)}, 새 주소: {len(new_addresses)}")
            
            if not new_addresses:
                self.logger.info("새로 지오코딩이 필요한 주소가 없습니다. 기존 지도캐시 유지.")
                return {"total": len(all_addresses), "new": 0, "updated": 0, "failed": 0}
            
            # 4. 새 주소들만 지오코딩 (기존 매물은 건드리지 않음)
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
            
            # 5. 새 매물만 지도캐시에 추가 (기존 캐시 덮어쓰지 않음)
            if new_coordinates:
                self.logger.info(f"새 매물 {len(new_coordinates)}개를 기존 지도캐시에 추가합니다.")
                self.update_map_cache(new_coordinates)
            else:
                self.logger.warning("새로 지오코딩된 매물이 없습니다.")
            
            # 6. 결과 요약
            result = {
                "total": len(all_addresses),
                "new": len(new_coordinates),
                "updated": 0,  # 기존 매물은 업데이트하지 않음
                "failed": len(failed_addresses)
            }
            
            self.logger.info(f"✅ 지오코딩 업데이트 완료: {result}")
            self.logger.info(f"기존 지도캐시 유지: {len(existing_coordinates)}개 매물")
            
            if failed_addresses:
                self.logger.warning(f"실패한 새 주소들: {failed_addresses}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"지오코딩 업데이트 실행 실패: {e}")
            return {"total": 0, "new": 0, "updated": 0, "failed": 0}
