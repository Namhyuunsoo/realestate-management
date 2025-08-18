# geocode_cache.py
# app/services/geocode_cache.py

import json
import os
from flask import current_app

def load_geocode_cache(filename: str = None, data_dir: str = None) -> dict:
    """
    geocoding 결과 캐시를 JSON 파일에서 불러옵니다.
    파일이 없거나 읽기 오류가 발생하면 빈 dict를 반환합니다.
    """
    if filename and data_dir:
        # 직접 지정된 파일 경로 사용
        path = os.path.join(data_dir, "raw", filename)
    else:
        # Flask 컨텍스트에서 설정 사용
        try:
            path = current_app.config["GEOCODE_CACHE_FILE"]
        except RuntimeError:
            # Flask 컨텍스트가 없는 경우 기본값 사용
            path = "geocode_cache.json"
    
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_geocode_cache(cache: dict, filename: str = None, data_dir: str = None):
    """
    geocoding 결과 캐시 dict를 JSON 파일로 저장합니다.
    저장 디렉터리가 없으면 생성합니다.
    """
    if filename and data_dir:
        # 직접 지정된 파일 경로 사용
        path = os.path.join(data_dir, "raw", filename)
    else:
        # Flask 컨텍스트에서 설정 사용
        try:
            path = current_app.config["GEOCODE_CACHE_FILE"]
        except RuntimeError:
            # Flask 컨텍스트가 없는 경우 기본값 사용
            path = "geocode_cache.json"
    
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
