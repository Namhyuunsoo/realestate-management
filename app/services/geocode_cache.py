# geocode_cache.py
# app/services/geocode_cache.py

import json
import os
from flask import current_app

def load_geocode_cache() -> dict:
    """
    geocoding 결과 캐시를 JSON 파일에서 불러옵니다.
    파일이 없거나 읽기 오류가 발생하면 빈 dict를 반환합니다.
    """
    path = current_app.config["GEOCODE_CACHE_FILE"]
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_geocode_cache(cache: dict):
    """
    geocoding 결과 캐시 dict를 JSON 파일로 저장합니다.
    저장 디렉터리가 없으면 생성합니다.
    """
    path = current_app.config["GEOCODE_CACHE_FILE"]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
