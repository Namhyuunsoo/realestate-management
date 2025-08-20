#sheet_fetcher.py
# app/services/sheet_fetcher.py

import os
import pandas as pd
import pickle
import time
from typing import Optional, Tuple

def read_local_listing_sheet(force_reload: bool = False) -> list[list[str]]:
    """
    상가임대차.xlsx를 읽어 2차원 배열 반환
    force_reload=True 시 캐시 무시하고 파일에서 직접 읽기
    """
    cache_file = "./data/cache/listing_sheet_cache.pkl"
    cache_dir = os.path.dirname(cache_file)
    
    # 캐시 디렉토리 생성
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
    
    # 소스 파일 경로
    filename = os.getenv("LISTING_SHEET_FILENAME", "상가임대차.xlsx")
    data_dir = os.getenv("DATA_DIR", "./data")
    source_path = os.path.join(data_dir, "raw", filename)
    
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"Listing sheet not found: {source_path}")
    
    # 강제 새로고침이 아닌 경우 캐시 확인
    if not force_reload and os.path.exists(cache_file):
        cache_valid, cache_data = _check_cache_validity(cache_file, source_path)
        if cache_valid:
            return cache_data
    
    # 캐시가 없거나 무효하거나 강제 새로고침인 경우 파일에서 읽기
    rows = _read_excel_file(source_path)
    
    # 캐시에 저장
    _save_to_cache(cache_file, rows)
    
    return rows

def _check_cache_validity(cache_file: str, source_file: str) -> Tuple[bool, Optional[list]]:
    """
    캐시 유효성 검사
    Returns: (유효성 여부, 캐시 데이터)
    """
    try:
        # 캐시 파일 수정 시간
        cache_time = os.path.getmtime(cache_file)
        # 소스 파일 수정 시간
        source_time = os.path.getmtime(source_file)
        
        # 소스 파일이 더 최신이면 캐시 무효 (하지만 로그는 간소화)
        if source_time > cache_time:
            return False, None
        
        # 캐시 파일 읽기 시도
        with open(cache_file, 'rb') as f:
            cached_data = pickle.load(f)
        
        # 캐시 데이터 유효성 검사 (기본적인 구조 확인)
        if (isinstance(cached_data, list) and 
            len(cached_data) > 0 and 
            isinstance(cached_data[0], list)):
            return True, cached_data
        else:
            print("⚠️ 캐시 데이터 구조가 유효하지 않습니다.")
            return False, None
            
    except Exception as e:
        print(f"⚠️ 캐시 유효성 검사 실패: {e}")
        return False, None

def _read_excel_file(file_path: str) -> list[list[str]]:
    """Excel 파일을 읽어서 2차원 배열로 변환"""
    try:
        # 여러 엔진을 시도하여 Excel 파일 읽기
        df = None
        
        # 1. openpyxl 엔진 시도 (최신 .xlsx 파일)
        try:
            df = pd.read_excel(file_path, dtype=str, engine='openpyxl').fillna("")
        except Exception as e1:
            # 2. xlrd 엔진 시도 (.xls 파일)
            try:
                df = pd.read_excel(file_path, dtype=str, engine='xlrd').fillna("")
            except Exception as e2:
                # 3. 기본 엔진 시도 (pandas가 자동 선택)
                try:
                    df = pd.read_excel(file_path, dtype=str).fillna("")
                except Exception as e3:
                    # 4. odf 엔진 시도 (.ods 파일)
                    try:
                        df = pd.read_excel(file_path, dtype=str, engine='odf').fillna("")
                    except Exception as e4:
                        raise Exception(f"모든 Excel 엔진 시도 실패: openpyxl({e1}), xlrd({e2}), 기본({e3}), odf({e4})")
        
        if df is None:
            raise Exception("Excel 파일을 읽을 수 없습니다.")
        
        # 결과를 2차원 배열로 변환
        rows = [df.columns.tolist()] + df.values.tolist()
        
        # DataFrame 명시적 해제 (메모리 절약)
        del df
        
        return rows
        
    except Exception as e:
        print(f"❌ Excel 파일 읽기 실패: {e}")
        raise Exception(f"Excel 파일 읽기 실패: {e}")

def _save_to_cache(cache_file: str, data: list) -> None:
    """데이터를 캐시 파일에 저장"""
    try:
        with open(cache_file, 'wb') as f:
            pickle.dump(data, f)
    except Exception as e:
        print(f"⚠️ 캐시 저장 실패: {e}")

def clear_listing_cache() -> bool:
    """매물 캐시 파일 삭제 (강제 새로고침용)"""
    cache_file = "./data/cache/listing_sheet_cache.pkl"
    try:
        if os.path.exists(cache_file):
            os.remove(cache_file)
            return True
        return False
    except Exception as e:
        print(f"❌ 캐시 파일 삭제 실패: {e}")
        return False
