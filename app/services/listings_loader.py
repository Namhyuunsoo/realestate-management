# listings_loader.py
# app/services/listings_loader.py

import os
import json
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from flask import current_app
from .sheet_fetcher import read_local_listing_sheet
from ..core.ids import listing_id_from_row
from ..core.utils import to_int_or_none
from ..models.listing_schema import Listing

# 헤더 기대 (최소)
EXPECTED_HEADERS = [
    "접수날짜","지역","지번","건물명","층수","가게명","분양","실평수",
    "보증금","월세","권리금","비고","담당자","현황","지역2","연락처",
    "의뢰인","비고3","위반여부","현수막번호"
]

class CacheEntry:
    """TTL 기반 캐시 엔트리 클래스"""
    def __init__(self, data: Any, ttl_seconds: int = 300):
        self.data = data
        self.created_at = datetime.now()
        self.ttl_seconds = ttl_seconds
    
    def is_expired(self) -> bool:
        """캐시가 만료되었는지 확인"""
        return datetime.now() - self.created_at > timedelta(seconds=self.ttl_seconds)

# TTL 기반 캐시 (기존 전역 변수 대체)
_cache: Optional[CacheEntry] = None

def read_map_cache() -> Dict[str, tuple[float,float]]:
    """
    data/raw/지도캐시.xlsx 의 '지도캐시' 시트를 읽어서
    {주소: (lat, lng)} 매핑을 반환합니다.
    """
    fn   = current_app.config["MAP_CACHE_FILENAME"]  # "지도캐시.xlsx"
    data_dir = current_app.config["DATA_DIR"]
    path = os.path.join(data_dir, "raw", fn)
    if not os.path.exists(path):
        current_app.logger.warning(f"Map cache not found: {path}")
        return {}

    try:
        # Excel 파일 열고 시트 이름 목록을 확인
        xls = pd.ExcelFile(path)
        # 만약 '지도캐시' 시트가 있으면, 그걸 쓰고 아니면 첫 번째 시트 사용
        sheet = "지도캐시" if "지도캐시" in xls.sheet_names else xls.sheet_names[0]
        current_app.logger.info(f"Using sheet for map cache: {sheet}")

        df = pd.read_excel(path, sheet_name=sheet, dtype=str).fillna("")

        mapping: dict[str, tuple[float,float]] = {}
        for _, row in df.iterrows():
            addr = row.get("주소","").strip()
            lat  = row.get("위도","").strip()
            lng  = row.get("경도","").strip()
            if addr and lat and lng:
                coords = safe_parse_coordinates(lat, lng)
                if coords:
                    mapping[addr] = coords
                else:
                    current_app.logger.warning(f"Invalid coordinates for {addr}: {lat}/{lng}")
        
        current_app.logger.info(f"Loaded {len(mapping)} coordinate mappings")
        return mapping
        
    except Exception as e:
        current_app.logger.error(f"Failed to read map cache: {e}")
        return {}

def safe_parse_coordinates(lat: str, lng: str) -> Optional[tuple[float, float]]:
    """안전하게 좌표를 파싱하는 함수"""
    try:
        lat_val = float(lat)
        lng_val = float(lng)
        
        # 유효한 좌표 범위 검증
        if -90 <= lat_val <= 90 and -180 <= lng_val <= 180:
            return (lat_val, lng_val)
        else:
            current_app.logger.warning(f"Coordinates out of valid range: {lat_val}, {lng_val}")
            return None
            
    except (ValueError, TypeError) as e:
        current_app.logger.warning(f"Invalid coordinate format: {lat}/{lng} - {e}")
        return None

def normalize_headers(header_row: list[str]) -> Dict[str, int]:
    mapping = {}
    for name in EXPECTED_HEADERS:
        if name in header_row:
            mapping[name] = header_row.index(name)
    return mapping

def build_address(row: list[str], hdr: Dict[str,int]) -> str:
    try:
        region2 = row[hdr["지역2"]].strip()
        region = row[hdr["지역"]].strip()
        lot = row[hdr["지번"]].strip()
        return f"{region2} {region} {lot}".strip()
    except:
        return ""

def normalize_listing(row_idx: int, row: list[str], hdr: Dict[str,int]) -> Listing | None:
    try:
        status_raw = row[hdr["현황"]].strip()
        # 디버그: 현황 값 확인
        if row_idx <= 5:  # 처음 5개 행만 로그
            current_app.logger.info(f"Row {row_idx}: 현황 = '{status_raw}' (원본: '{row[hdr['현황']]}')")
    except Exception as e:
        current_app.logger.error(f"Row {row_idx}: 현황 읽기 실패 - {e}")
        status_raw = ""

    address_full = build_address(row, hdr)
    if address_full.strip() == "":
        return None

    def gv(col):  # get value
        return row[hdr[col]] if col in hdr else ""

    fields = { col: gv(col) for col in hdr.keys() }

    # numeric parsing (만원 기준이라면 그대로 int)
    deposit = to_int_or_none(fields.get("보증금"))
    rent = to_int_or_none(fields.get("월세"))
    premium = to_int_or_none(fields.get("권리금"))
    area = to_int_or_none(fields.get("실평수"))
    total = None
    if deposit is not None and premium is not None:
        total = deposit + premium

    listing = Listing(
        id=listing_id_from_row(row_idx),
        raw_row_index=row_idx,
        address_full=address_full,
        address_comp={
            "region2": fields.get("지역2",""),
            "region": fields.get("지역",""),
            "lot": fields.get("지번","")
        },
        fields=fields,
        coords={"lat": None, "lng": None},  # S2 이후 geocode fill
        numeric_cache={
            "deposit": deposit,
            "rent": rent,
            "premium": premium,
            "area": area,
            "total": total
        },
        status_raw=status_raw
    )
    return listing

def load_listings(force_reload=False) -> List[dict]:
    """매번 엑셀 파일을 새로 읽어서 최신 데이터 반환"""
    current_app.logger.info("Loading listings from source data...")
    rows = read_local_listing_sheet()
    header = rows[0]
    hdr_map = normalize_headers(header)
    missing = [h for h in EXPECTED_HEADERS if h not in hdr_map]
    if missing:
        current_app.logger.warning(f"Missing headers: {missing}")

    listings: List[dict] = []
    for i, row in enumerate(rows[1:], start=1):
        listing = normalize_listing(i, row, hdr_map)
        if listing:
            listings.append(listing.to_dict())

    # 지도캐시 매핑 적용 (모든 항목에 대해, "생"인 경우에만 좌표 적용)
    try:
        map_cache = read_map_cache()
        for item in listings:
            # 모든 항목을 로드하되, 지도 좌표는 "생"인 경우에만 적용
            addr = item.get("address_full","")
            if addr in map_cache and item.get("status_raw") == "생":
                lat, lng = map_cache[addr]
                item["coords"] = {"lat": lat, "lng": lng}
            else:
                # "생"이 아닌 경우에도 기본 좌표 설정 (null)
                item["coords"] = {"lat": None, "lng": None}
    except Exception as e:
        current_app.logger.warning(f"지도캐시 매핑 실패, 기본값 사용: {e}")
        # 지도캐시 실패 시 모든 항목에 null 좌표 설정
        for item in listings:
            item["coords"] = {"lat": None, "lng": None}

    current_app.logger.info(f"Loaded listings: {len(listings)}")
    return listings
