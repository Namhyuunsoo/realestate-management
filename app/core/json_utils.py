# app/core/json_utils.py
from typing import List, Dict, Any

def compact_listings(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    매물 리스트를 표 형식(Tabular JSON)으로 압축하여 전송량을 줄입니다.
    """
    if not items:
        return {"cols": [], "rows": [], "f_keys": [], "n_keys": []}

    # 기본 컬럼 정의 (모든 매물에 공통적으로 존재하는 상단 레벨 키)
    # status_raw, address_full 등 자주 쓰이는 것 포함
    base_cols = ["id", "status_raw", "address_full", "user_id", "raw_row_index", "slot_id", "manager_name"]
    
    # 가변적인 키 수집 (fields, numeric_cache)
    all_f_keys = set()
    all_n_keys = set()
    
    for item in items:
        if "fields" in item and isinstance(item["fields"], dict):
            all_f_keys.update(item["fields"].keys())
        if "numeric_cache" in item and isinstance(item["numeric_cache"], dict):
            all_n_keys.update(item["numeric_cache"].keys())
            
    f_keys = sorted(list(all_f_keys))
    n_keys = sorted(list(all_n_keys))
    
    rows = []
    for item in items:
        row = []
        # 1. 기본 컬럼 값 추출
        for col in base_cols:
            row.append(item.get(col))
            
        # 2. 좌표 (lat, lng) - 별도 처리
        coords = item.get("coords") or {}
        row.append(coords.get("lat"))
        row.append(coords.get("lng"))
        
        # 3. fields 값 추출 (순서대로)
        f_data = item.get("fields") or {}
        row.append([f_data.get(k) for k in f_keys])
        
        # 4. numeric_cache 값 추출 (순서대로)
        n_data = item.get("numeric_cache") or {}
        row.append([n_data.get(k) for k in n_keys])
        
        # 5. 기타 플래그 (geocoded 등 주택 전용)
        row.append(item.get("geocoded", False))
        
        rows.append(row)
        
    return {
        "cols": base_cols + ["lat", "lng"],
        "f_keys": f_keys,
        "n_keys": n_keys,
        "rows": rows,
        "compressed": True
    }
