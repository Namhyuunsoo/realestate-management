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
        # Flask 컨텍스트가 있을 때만 설정 로드
        try:
            self.naver_client_id = current_app.config.get("NAVER_MAPS_NCP_CLIENT_ID", "")
            self.naver_client_secret = current_app.config.get("NAVER_MAPS_NCP_CLIENT_SECRET", "")
            self.geocode_cache_file = current_app.config["GEOCODE_CACHE_FILE"]
            self.map_cache_file = current_app.config["MAP_CACHE_FILENAME"]
            self.data_dir = current_app.config["DATA_DIR"]
        except RuntimeError:
            # Flask 컨텍스트가 없는 경우 기본값 사용
            self.naver_client_id = ""
            self.naver_client_secret = ""
            self.geocode_cache_file = "geocode_cache.json"
            self.map_cache_file = "지도캐시.xlsx"
            self.data_dir = "./data"
        
        # 로깅 설정
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # API 키 확인
        if not self.naver_client_id or not self.naver_client_secret:
            self.logger.warning("⚠️ 네이버 지오코딩 API 키가 설정되지 않았습니다.")
            self.logger.warning("   NAVER_MAPS_NCP_CLIENT_ID와 NAVER_MAPS_NCP_CLIENT_SECRET 환경변수를 설정해주세요.")
    
    def update_config(self):
        """Flask 컨텍스트에서 설정 업데이트"""
        try:
            self.naver_client_id = current_app.config.get("NAVER_MAPS_NCP_CLIENT_ID", "")
            self.naver_client_secret = current_app.config.get("NAVER_MAPS_NCP_CLIENT_SECRET", "")
            self.geocode_cache_file = current_app.config["GEOCODE_CACHE_FILE"]
            self.map_cache_file = current_app.config["MAP_CACHE_FILENAME"]
            self.data_dir = current_app.config["DATA_DIR"]
            self.logger.info("✅ 설정이 Flask 컨텍스트에서 업데이트되었습니다.")
        except RuntimeError as e:
            self.logger.error(f"설정 업데이트 실패: {e}")
    
    def extract_addresses_from_listings(self) -> List[str]:
        """상가임대차.xlsx에서 모든 주소 추출"""
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
                    # 주소 구성: 지역2 + 지역 + 지번
                    region2 = row[hdr_map.get("지역2", -1)] if "지역2" in hdr_map else ""
                    region = row[hdr_map.get("지역", -1)] if "지역" in hdr_map else ""
                    lot = row[hdr_map.get("지번", -1)] if "지번" in hdr_map else ""
                    
                    # 주소가 완성된 경우만 추가
                    if region2 and region and lot:
                        address = f"{region2} {region} {lot}".strip()
                        if address not in addresses:
                            addresses.append(address)
                            
                except Exception as e:
                    self.logger.warning(f"Row {i} 주소 파싱 실패: {e}")
                    continue
            
            self.logger.info(f"상가임대차에서 {len(addresses)}개 주소 추출 완료")
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
            
            # Excel 파일 읽기
            xls = pd.ExcelFile(map_cache_path)
            sheet = "지도캐시" if "지도캐시" in xls.sheet_names else xls.sheet_names[0]
            
            df = pd.read_excel(map_cache_path, sheet_name=sheet, dtype=str).fillna("")
            
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
        if not self.naver_client_id or not self.naver_client_secret:
            self.logger.warning("네이버 API 키가 설정되지 않았습니다.")
            return None
        
        try:
            url = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"
            headers = {
                "X-NCP-APIGW-API-KEY-ID": self.naver_client_id,
                "X-NCP-APIGW-API-KEY": self.naver_client_secret
            }
            params = {
                "query": address,
                "coordinate": "latlng"
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("status") == "OK" and data.get("addresses"):
                address_info = data["addresses"][0]
                lat = float(address_info["y"])
                lng = float(address_info["x"])
                
                # 한국 지역 범위 확인
                if 33 <= lat <= 39 and 124 <= lng <= 132:
                    self.logger.info(f"지오코딩 성공: {address} → ({lat}, {lng})")
                    return (lat, lng)
                else:
                    self.logger.warning(f"한국 지역 범위를 벗어난 좌표: {address} → ({lat}, {lng})")
                    return None
            else:
                self.logger.warning(f"지오코딩 실패: {address} - {data.get('errorMessage', 'Unknown error')}")
                return None
                
        except Exception as e:
            self.logger.error(f"지오코딩 API 호출 실패 ({address}): {e}")
            return None
    
    def update_map_cache(self, new_coordinates: Dict[str, Tuple[float, float]]):
        """지도캐시 Excel 파일 업데이트"""
        try:
            map_cache_path = os.path.join(self.data_dir, "raw", self.map_cache_file)
            
            # 기존 데이터 읽기
            existing_data = []
            if os.path.exists(map_cache_path):
                try:
                    xls = pd.ExcelFile(map_cache_path)
                    sheet = "지도캐시" if "지도캐시" in xls.sheet_names else xls.sheet_names[0]
                    df = pd.read_excel(map_cache_path, sheet_name=sheet, dtype=str).fillna("")
                    
                    for _, row in df.iterrows():
                        existing_data.append({
                            "주소": row.get("주소", ""),
                            "위도": row.get("위도", ""),
                            "경도": row.get("경도", ""),
                            "업데이트일": row.get("업데이트일", "")
                        })
                except Exception as e:
                    self.logger.warning(f"기존 지도캐시 읽기 실패: {e}")
            
            # 새 좌표 추가/업데이트
            current_time = pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
            
            for addr, (lat, lng) in new_coordinates.items():
                # 기존에 있는 주소인지 확인
                existing = next((item for item in existing_data if item["주소"] == addr), None)
                
                if existing:
                    # 기존 주소 업데이트
                    existing["위도"] = str(lat)
                    existing["경도"] = str(lng)
                    existing["업데이트일"] = current_time
                else:
                    # 새 주소 추가
                    existing_data.append({
                        "주소": addr,
                        "위도": str(lat),
                        "경도": str(lng),
                        "업데이트일": current_time
                    })
            
            # Excel 파일로 저장
            df = pd.DataFrame(existing_data)
            
            # 백업 파일 생성
            if os.path.exists(map_cache_path):
                backup_path = map_cache_path.replace(".xlsx", f"_backup_{int(time.time())}.xlsx")
                os.rename(map_cache_path, backup_path)
                self.logger.info(f"기존 지도캐시 백업: {backup_path}")
            
            # 새 파일 저장
            with pd.ExcelWriter(map_cache_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name="지도캐시", index=False)
            
            self.logger.info(f"지도캐시 업데이트 완료: {len(existing_data)}개 주소")
            
        except Exception as e:
            self.logger.error(f"지도캐시 업데이트 실패: {e}")
    
    def run_geocoding_update(self) -> Dict[str, int]:
        """지오코딩 업데이트 실행"""
        try:
            self.logger.info("🚀 지오코딩 업데이트 시작...")
            
            # 1. 상가임대차에서 모든 주소 추출
            all_addresses = self.extract_addresses_from_listings()
            if not all_addresses:
                return {"total": 0, "new": 0, "updated": 0, "failed": 0}
            
            # 2. 기존 좌표 가져오기
            existing_coordinates = self.get_existing_coordinates()
            
            # 3. 새로 지오코딩이 필요한 주소 찾기
            new_addresses = [addr for addr in all_addresses if addr not in existing_coordinates]
            
            self.logger.info(f"총 주소: {len(all_addresses)}, 기존 좌표: {len(existing_coordinates)}, 새 주소: {len(new_addresses)}")
            
            if not new_addresses:
                self.logger.info("새로 지오코딩이 필요한 주소가 없습니다.")
                return {"total": len(all_addresses), "new": 0, "updated": 0, "failed": 0}
            
            # 4. 새 주소들 지오코딩
            new_coordinates = {}
            failed_addresses = []
            
            for i, address in enumerate(new_addresses, 1):
                self.logger.info(f"지오코딩 진행 중: {i}/{len(new_addresses)} - {address}")
                
                coordinates = self.geocode_address(address)
                if coordinates:
                    new_coordinates[address] = coordinates
                else:
                    failed_addresses.append(address)
                
                # API 호출 제한 방지 (초당 1회)
                if i < len(new_addresses):
                    time.sleep(1)
            
            # 5. 지도캐시 업데이트
            if new_coordinates:
                self.update_map_cache(new_coordinates)
            
            # 6. 결과 요약
            result = {
                "total": len(all_addresses),
                "new": len(new_coordinates),
                "updated": 0,  # 현재는 새 주소만 추가
                "failed": len(failed_addresses)
            }
            
            self.logger.info(f"✅ 지오코딩 업데이트 완료: {result}")
            
            if failed_addresses:
                self.logger.warning(f"실패한 주소들: {failed_addresses}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"지오코딩 업데이트 실행 실패: {e}")
            return {"total": 0, "new": 0, "updated": 0, "failed": 0}
