#sheet_fetcher.py
# app/services/sheet_fetcher.py

import os
import pandas as pd
import pickle
import time
import threading
import shutil
import zipfile
import tempfile
from typing import Optional, Tuple, Dict, Any

class SecurityError(Exception):
    """보안 관련 오류"""
    pass

# 전역 락 - 동시 파일 접근 방지
_file_lock = threading.Lock()

# Excel 읽기 엔진 캐시 (성능 최적화)
_excel_engines_cache: Dict[str, str] = {}

def read_local_listing_sheet(force_reload: bool = False) -> list[list[str]]:
    """
    상가임대차.xlsx를 읽어 2차원 배열 반환
    force_reload=True 시 캐시 무시하고 파일에서 직접 읽기
    """
    with _file_lock:  # 동시 접근 방지
        cache_file = "./data/cache/listing_sheet_cache.pkl"
        cache_dir = os.path.dirname(cache_file)
        
        # 캐시 디렉토리 생성
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir)
        
        # 소스 파일 경로 (보안 강화: 경로 검증)
        filename = os.getenv("LISTING_SHEET_FILENAME", "상가임대차.xlsx")
        data_dir = os.getenv("DATA_DIR", "./data")
        
        # 파일명 보안 검증 (경로 순회 공격 방지)
        if ".." in filename or "/" in filename or "\\" in filename:
            raise SecurityError(f"잘못된 파일명: {filename}")
        
        source_path = os.path.join(data_dir, "raw", filename)
        
        # 절대 경로로 변환하여 보안 강화
        source_path = os.path.abspath(source_path)
        data_dir_abs = os.path.abspath(data_dir)
        
        # 경로가 허용된 디렉토리 내부인지 확인
        if not source_path.startswith(data_dir_abs):
            raise SecurityError(f"허용되지 않은 파일 경로: {source_path}")
        
        if not os.path.exists(source_path):
            raise FileNotFoundError(f"Listing sheet not found: {source_path}")
        
        # 강제 새로고침이 아닌 경우 캐시 확인
        if not force_reload and os.path.exists(cache_file):
            cache_valid, cache_data = _check_cache_validity(cache_file, source_path)
            if cache_valid:
                print("✅ 캐시된 데이터 사용 (성능 최적화)")
                return cache_data
        
        # 캐시가 없거나 무효하거나 강제 새로고침인 경우 파일에서 읽기
        # 로그 제거로 성능 최적화
        rows = _read_excel_file(source_path)
        
        # 캐시에 저장
        _save_to_cache(cache_file, rows)
        
        return rows

def _check_cache_validity(cache_file: str, source_file: str) -> Tuple[bool, Optional[list]]:
    """캐시 파일의 유효성을 검사"""
    try:
        # 캐시 파일 존재 확인
        if not os.path.exists(cache_file):
            return False, None
        
        # 소스 파일의 수정 시간과 캐시 파일의 수정 시간 비교
        source_mtime = os.path.getmtime(source_file)
        cache_mtime = os.path.getmtime(cache_file)
        
        if source_mtime > cache_mtime:
            print(f"⚠️ 소스 파일이 더 최신입니다. 캐시 무효화: {source_mtime} > {cache_mtime}")
            return False, None
        
        # 캐시 파일 로드 시도
        with open(cache_file, 'rb') as f:
            cache_data = pickle.load(f)
        
        # 캐시 데이터 유효성 검사
        if not isinstance(cache_data, list) or len(cache_data) == 0:
            print("⚠️ 캐시 데이터가 유효하지 않습니다.")
            return False, None
        
        return True, cache_data
        
    except Exception as e:
        print(f"⚠️ 캐시 유효성 검사 실패: {e}")
        return False, None

def read_excel_file_universal(file_path: str, sheet_name: str = None) -> list[list[str]]:
    """
    범용 Excel 파일 읽기 함수 (중앙화된 로직)
    모든 Excel 파일 읽기에 사용되는 통합 함수
    """
    # 파일이 존재하는지 확인
    if not os.path.exists(file_path):
        raise Exception(f"파일이 존재하지 않습니다: {file_path}")
    
    # 파일 잠금 확인 함수
    def is_file_locked(file_path):
        try:
            with open(file_path, 'r+b') as f:
                pass
            return False
        except (IOError, OSError):
            return True
    
    # 캐시된 엔진 사용 (성능 최적화)
    cache_key = f"{file_path}:{sheet_name or 'default'}"
    preferred_engine = _excel_engines_cache.get(cache_key)
    
    # 재시도 로직 (최대 3회, 점진적 대기 시간)
    for attempt in range(3):
        # 재시도 로그 제거로 성능 최적화
        
        # 파일 잠금 확인
        if is_file_locked(file_path):
            wait_time = (attempt + 1) * 2  # 2, 4, 6초
            print(f"⚠️ 파일이 잠겨있습니다. {wait_time}초 대기...")
            time.sleep(wait_time)
            continue
        
        # 엔진 우선순위 설정 (캐시된 엔진 우선)
        engines = []
        if preferred_engine:
            engines.append((preferred_engine, preferred_engine))
        
        # 기본 엔진들 추가
        default_engines = [
            ('openpyxl', 'openpyxl'),
            ('xlrd', 'xlrd'), 
            ('기본', None),
            ('odf', 'odf')
        ]
        
        for engine_name, engine in default_engines:
            if not preferred_engine or engine_name != preferred_engine:
                engines.append((engine_name, engine))
        
        # 엔진별로 시도
        df = None
        successful_engine = None
        
        for engine_name, engine in engines:
            try:
                if sheet_name:
                    if engine:
                        df = pd.read_excel(file_path, sheet_name=sheet_name, dtype=str, engine=engine).fillna("")
                    else:
                        df = pd.read_excel(file_path, sheet_name=sheet_name, dtype=str).fillna("")
                else:
                    if engine:
                        df = pd.read_excel(file_path, dtype=str, engine=engine).fillna("")
                    else:
                        df = pd.read_excel(file_path, dtype=str).fillna("")
                
                successful_engine = engine_name
                break
                
            except Exception as e:
                print(f"⚠️ {engine_name} 엔진 실패: {e}")
                continue
        
        if df is not None:
            # 성공한 엔진을 캐시에 저장
            _excel_engines_cache[cache_key] = successful_engine
            
            # DataFrame을 2차원 배열로 변환 (헤더 포함)
            rows = [df.columns.tolist()] + df.values.tolist()
            return rows
        
        # 모든 엔진 실패 시 재시도
        if attempt < 2:  # 마지막 시도가 아니면 재시도
            wait_time = (attempt + 1) * 2  # 점진적 대기 시간
            print(f"🔄 재시도 {attempt + 1}/3 - {wait_time}초 대기...")
            time.sleep(wait_time)
        else:
            # 마지막 시도도 실패한 경우 파일 복구 시도
            print("🔧 파일 복구 시도...")
            if _repair_excel_file(file_path):
                print("✅ 파일 복구 성공, 다시 읽기 시도...")
                try:
                    if sheet_name:
                        df = pd.read_excel(file_path, sheet_name=sheet_name, dtype=str, engine='openpyxl').fillna("")
                    else:
                        df = pd.read_excel(file_path, dtype=str, engine='openpyxl').fillna("")
                    rows = [df.columns.tolist()] + df.values.tolist()
                    print(f"✅ 복구된 파일 읽기 성공! 행 수: {len(rows)}")
                    return rows
                except Exception as e:
                    print(f"❌ 복구된 파일 읽기 실패: {e}")
            
            raise Exception(f"모든 시도 실패: Excel 파일을 읽을 수 없습니다 ({file_path})")

def _read_excel_file(file_path: str) -> list[list[str]]:
    """기존 호환성을 위한 래퍼 함수"""
    return read_excel_file_universal(file_path)
    
    raise Exception(f"예상치 못한 오류: Excel 파일 읽기 실패 ({file_path})")

def _repair_excel_file(file_path: str) -> bool:
    """Excel 파일 복구 시도"""
    try:
        # 임시 파일로 복사
        temp_path = file_path + ".temp"
        shutil.copy2(file_path, temp_path)
        
        # ZIP 파일로 열어서 구조 확인
        with zipfile.ZipFile(temp_path, 'r') as zip_ref:
            # 필수 파일들이 있는지 확인
            required_files = ['xl/workbook.xml', 'xl/worksheets/sheet1.xml']
            missing_files = [f for f in required_files if f not in zip_ref.namelist()]
            
            if missing_files:
                print(f"⚠️ 필수 파일 누락: {missing_files}")
                os.remove(temp_path)
                return False
        
        # 복구 성공 시 원본 파일 교체
        shutil.move(temp_path, file_path)
        print("✅ Excel 파일 복구 완료")
        return True
        
    except Exception as e:
        print(f"❌ Excel 파일 복구 실패: {e}")
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        return False

def _save_to_cache(cache_file: str, data: list[list[str]]) -> None:
    """데이터를 캐시 파일에 저장"""
    try:
        with open(cache_file, 'wb') as f:
            pickle.dump(data, f)
        print(f"💾 캐시 파일에 저장 완료: {cache_file}")
    except Exception as e:
        print(f"❌ 캐시 저장 실패: {e}")

def clear_listing_cache() -> None:
    """캐시 파일 삭제"""
    cache_file = "./data/cache/listing_sheet_cache.pkl"
    try:
        if os.path.exists(cache_file):
            os.remove(cache_file)
            print(f"🗑️ 캐시 파일 삭제 완료: {cache_file}")
        else:
            print("📝 삭제할 캐시 파일이 없습니다.")
    except Exception as e:
        print(f"❌ 캐시 삭제 실패: {e}")