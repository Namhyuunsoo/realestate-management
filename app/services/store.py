# app/services/store.py

import os
import json
import time
import itertools
import threading
import pandas as pd
from flask import current_app
import uuid

def clean_nan_values(obj):
    """JSON 직렬화 전에 NaN 값을 완전히 제거하는 함수"""
    if isinstance(obj, dict):
        return {k: clean_nan_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan_values(item) for item in obj]
    elif pd.isna(obj):
        return ""
    elif isinstance(obj, (int, float)) and (pd.isna(obj) or str(obj) == 'nan' or str(obj).lower() == 'nan'):
        return 0
    elif isinstance(obj, str) and obj.lower() == 'nan':
        return ""
    else:
        return obj

def _clean_numeric_value(value):
    """숫자 값에서 불필요한 소수점 제거 (강화된 버전)"""
    if value is None or value == '':
        return value
    
    # 문자열로 변환
    str_value = str(value)
    
    # pandas NaN 값 처리
    if str_value.lower() in ['nan', 'none', 'null']:
        return ''
    
    # .0으로 끝나는 경우 제거 (여러 번 반복하여 .0.0 같은 경우도 처리)
    while str_value.endswith('.0'):
        str_value = str_value.replace('.0', '')
        print(f"🔧 store.py .0 제거: '{value}' → '{str_value}'")
    
    # float이고 정수인 경우 정수로 변환
    try:
        float_val = float(str_value)
        if float_val.is_integer():
            cleaned = str(int(float_val))
            print(f"🔧 store.py float→int 변환: '{value}' → '{cleaned}'")
            return cleaned
    except (ValueError, TypeError):
        pass
    
    return str_value

# ======================================
# 1) JSON 기반 저장소: 브리핑 & get_customer
# ======================================

# 애플리케이션 컨텍스트 없이도 사용 가능한 BASE_DIR 설정
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DATA_DIR   = "./data"
STORE_FILE = os.path.join(DATA_DIR, "store.json")

_lock         = threading.Lock()
_customer_seq = itertools.count(1)
_briefing_seq = itertools.count(1)

CUSTOMERS = {}   # id → 고객 dict
BRIEFINGS = {}   # id → 브리핑 dict

def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def _next_id(seq, prefix):
    return f"{prefix}_{next(seq):06d}"

def _generate_customer_id(name: str, phone: str) -> str:
    """고객명과 전화번호로 고객 ID 생성"""
    # 특수문자 제거 및 공백 처리
    clean_name = name.strip().replace(" ", "_")
    clean_phone = phone.strip().replace("-", "").replace(" ", "")
    return f"{clean_name}_{clean_phone}"

def _reseed_sequences():
    global _customer_seq, _briefing_seq
    max_c = max((int(cid.split("_")[1]) for cid in CUSTOMERS), default=0)
    max_b = max((int(bid.split("_")[1]) for bid in BRIEFINGS), default=0)
    _customer_seq = itertools.count(max_c + 1)
    _briefing_seq = itertools.count(max_b + 1)

def save_store():
    _ensure_dir()
    tmp = STORE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({
            "customers": CUSTOMERS,
            "briefings": BRIEFINGS,
            "saved_at": int(time.time())
        }, f, ensure_ascii=False, indent=2)
    if os.path.exists(STORE_FILE):
        os.remove(STORE_FILE)
    os.replace(tmp, STORE_FILE)

def load_store():
    if not os.path.isfile(STORE_FILE):
        return
    with open(STORE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    CUSTOMERS.clear();  CUSTOMERS.update(data.get("customers", {}))
    BRIEFINGS.clear();  BRIEFINGS.update(data.get("briefings", {}))
    _reseed_sequences()
    print(f"🗂  store.json 로드 완료 (customers={len(CUSTOMERS)}, briefings={len(BRIEFINGS)})")

def get_customer(cid: str, user_email: str):
    """고객 정보 조회 - ID로 직접 찾기"""
    print(f"🔍 get_customer 호출: cid={cid}, user_email={user_email}")
    
    # 사용자 파일에서 고객 찾기
    user_path = _user_file(user_email)
    if not os.path.exists(user_path):
        return None
    
    df = pd.read_excel(user_path)
    # NaN 값을 더 확실하게 처리
    df = df.fillna("")
    # 숫자 컬럼에서 NaN이 남아있을 수 있으므로 추가 처리
    for col in df.columns:
        if df[col].dtype in ['float64', 'int64']:
            df[col] = df[col].fillna(0)
        else:
            df[col] = df[col].fillna("")
    
    # 문자열로 변환된 'nan' 값들도 처리
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].astype(str).replace(['nan', 'NaN', 'NAN'], '')
    
    print(f"📊 Excel 파일에서 {len(df)}개 고객 로드")
    
    # ID로 직접 찾기
    customer = df[df['id'] == cid]
    
    if len(customer) == 0:
        print(f"❌ 고객을 찾을 수 없음: ID={cid}")
        return None
    
    customer_dict = customer.iloc[0].to_dict()
    
    # NaN 값 정리
    customer_dict = clean_nan_values(customer_dict)
    
    print(f"✅ 고객 찾음: {customer_dict.get('name')}, {customer_dict.get('phone')}")
    return customer_dict

def create_briefing(user_email: str, customer_id: str, listing_ids):
    with _lock:
        bid = _next_id(_briefing_seq, "brf")
        BRIEFINGS[bid] = {
            "id": bid,
            "user": user_email,
            "customer_id": customer_id,
            "listing_ids": list(listing_ids),
            "overrides": {},
            "tags": {},
            "created_at": int(time.time())
        }
        save_store()
        return BRIEFINGS[bid]

def list_briefings(user_email: str, is_admin=False):
    if is_admin:
        return list(BRIEFINGS.values())
    return [b for b in BRIEFINGS.values() if b["user"] == user_email]

def get_briefing(bid: str):
    return BRIEFINGS.get(bid)

def set_listing_override(bid: str, listing_id: str, field: str, value: str):
    with _lock:
        b = BRIEFINGS.get(bid)
        if not b:
            return None
        b["overrides"].setdefault(listing_id, {})[field] = value
        save_store()
        return b

def clear_listing_override(bid: str, listing_id: str, field: str = None):
    with _lock:
        b = BRIEFINGS.get(bid)
        if not b:
            return None
        if field:
            b["overrides"].get(listing_id, {}).pop(field, None)
            if not b["overrides"].get(listing_id):
                b["overrides"].pop(listing_id, None)
        else:
            b["overrides"].pop(listing_id, None)
        save_store()
        return b

def set_listing_tag(bid: str, listing_id: str, tag: str):
    with _lock:
        b = BRIEFINGS.get(bid)
        if not b:
            return None
        b["tags"][listing_id] = tag
        save_store()
        return b

def clear_listing_tag(bid: str, listing_id: str):
    with _lock:
        b = BRIEFINGS.get(bid)
        if not b:
            return None
        b["tags"].pop(listing_id, None)
        save_store()
        return b


# ======================================
# 2) 엑셀 기반 고객 저장/조회 로직
# ======================================

def _excel_data_dir() -> str:
    path = os.path.join(BASE_DIR, "data", "raw")
    os.makedirs(path, exist_ok=True)
    return path

def _user_file(user_email: str) -> str:
    username = user_email.split("@")[0]
    return os.path.join(_excel_data_dir(), f"{username}_customerList.xlsx")

def _admin_file() -> str:
    return os.path.join(_excel_data_dir(), "all_customers.xlsx")

def normalize_region(region: str) -> str:
    """
    지역명 정규화 함수
    - "부평구 전체", "부평구 전부", "부평구전체", "부평구전부" → "부평구"
    - "구 전체", "구 전부" → "구" 앞부분만 추출
    """
    if not region:
        return region
    
    # 공백 제거
    region = region.strip()
    
    # "구 전체", "구 전부" 패턴 처리
    if "구 전체" in region or "구 전부" in region:
        return region.split("구")[0] + "구"
    
    # "구전체", "구전부" 패턴 처리 (공백 없는 경우)
    if "구전체" in region or "구전부" in region:
        return region.split("구전체")[0] + "구"
    
    # "시 전체", "시 전부" 패턴 처리
    if "시 전체" in region or "시 전부" in region:
        return region.split("시")[0] + "시"
    
    # "시전체", "시전부" 패턴 처리 (공백 없는 경우)
    if "시전체" in region or "시전부" in region:
        return region.split("시전체")[0] + "시"
    
    return region

def is_admin(user_email: str) -> bool:
    admins = current_app.config.get("ADMIN_USERS", [])
    return user_email in admins

def _repair_excel_file(file_path: str) -> bool:
    """
    손상된 Excel 파일을 복구하는 함수
    """
    try:
        # 백업 파일 경로 생성
        backup_path = file_path.replace('.xlsx', '_backup.xlsx')
        
        # 원본 파일이 존재하면 백업 시도
        if os.path.exists(file_path):
            try:
                import shutil
                shutil.copy2(file_path, backup_path)
                print(f"백업 파일 생성: {backup_path}")
            except Exception as e:
                print(f"백업 파일 생성 실패: {e}")
        
        # 새 Excel 파일 생성
        import pandas as pd
        empty_df = pd.DataFrame(columns=[
            'id', 'name', 'phone', 'regions', 'floor', 'area', 
            'deposit', 'rent', 'premium', 'notes', 'manager', 
            'created_by', 'created_at', 'filter_data'
        ])
        empty_df.to_excel(file_path, index=False)
        print(f"새 Excel 파일 생성: {file_path}")
        return True
        
    except Exception as e:
        print(f"Excel 파일 복구 실패 ({file_path}): {e}")
        return False

def list_customers(user_email: str, filter_type: str = 'own', manager: str = '') -> list:
    """
    GET /api/customers 호출 시 사용.
    - filter_type: 'own', 'all', 'manager'
    - manager: 담당자명 (filter_type이 'manager'일 때 사용)
    """
    # 사용자 서비스를 통해 사용자 정보 가져오기
    user_service = current_app.data_manager.user_service
    user = user_service.get_user_by_email(user_email)
    
    if not user:
        return []
    
    # 역할별 파일 선택
    if user.is_admin() or user.is_manager():
        # 어드민과 매니저는 항상 all_customers.xlsx 사용
        target = _admin_file()
    else:
        # 일반 사용자는 자신의 파일만 사용
        target = _user_file(user_email)
    
    if not os.path.exists(target):
        return []
    
    try:
        df = pd.read_excel(target)
        # NaN 값을 더 확실하게 처리
        df = df.fillna("")
        # 숫자 컬럼에서 NaN이 남아있을 수 있으므로 추가 처리
        for col in df.columns:
            if df[col].dtype in ['float64', 'int64']:
                df[col] = df[col].fillna(0)
            else:
                df[col] = df[col].fillna("")
        
        # 문자열로 변환된 'nan' 값들도 처리
        for col in df.columns:
            if df[col].dtype == 'object':
                df[col] = df[col].astype(str).replace(['nan', 'NaN', 'NAN'], '')
    except Exception as e:
        print(f"Excel 파일 읽기 오류 ({target}): {e}")
        # 파일 복구 시도
        if _repair_excel_file(target):
            try:
                df = pd.read_excel(target)
                df = df.fillna("")
            except Exception as e2:
                print(f"복구된 파일 읽기 실패: {e2}")
                return []
        else:
            return []
    
    # id 없는 행에 대해 자동 id 부여 (고객명+전화번호 기반)
    changed = False
    if "id" not in df.columns:
        df["id"] = ""
        changed = True
    
    for i, row in df.iterrows():
        try:
            if not row.get("id") and row.get("name") and row.get("phone"):
                customer_id = _generate_customer_id(row["name"], row["phone"])
                df.at[i, "id"] = customer_id
                changed = True
        except Exception as e:
            print(f"ID 생성 오류 (행 {i}): {e}")
            continue
    
    if changed:
        try:
            df.to_excel(target, index=False)
        except Exception as e:
            print(f"Excel 파일 저장 오류: {e}")
    
    # 역할별 필터링 적용 (안전한 처리)
    try:
        if user and hasattr(user, 'is_user') and hasattr(user, 'is_manager') and hasattr(user, 'is_admin'):
            if user.is_user():
                # 일반 사용자는 본인 담당 고객만 조회
                manager_name = getattr(user, 'manager_name', '')
                if manager_name:
                    df = df[df['manager'] == manager_name]
                    print(f"User {user.email} filtered customers by manager_name: {manager_name} ({len(df)} items)")
                else:
                    # 담당자명이 설정되지 않은 경우 빈 결과 반환
                    df = df.iloc[0:0]  # 빈 DataFrame
                    print(f"User {user.email} has no manager_name set, returning empty results")
            elif user.is_manager() or user.is_admin():
                # 매니저와 어드민은 모든 고객 조회 가능
                if filter_type == 'manager' and manager:
                    df = df[df['manager'] == manager]
                # 다른 필터는 적용하지 않음 (모든 고객 조회)
                user_role = getattr(user, 'role', 'unknown')
                print(f"{user_role.title()} {user.email} accessing all customers ({len(df)} items)")
            else:
                # 보안 강화: 역할이 명확하지 않은 경우 빈 결과 반환
                from app.services.user_service import mask_email
                from app.core.security import log_security_event
                log_security_event('UNKNOWN_ROLE_ERROR', f'User {mask_email(user.email)} with unknown role attempted data access')
                print(f"보안 강화: 역할 불명으로 인해 빈 결과 반환")
                return []  # 빈 결과 반환으로 보안 강화
        else:
            # 보안 강화: 사용자 객체가 없거나 메서드가 없는 경우 빈 결과 반환
            from app.services.user_service import mask_email
            from app.core.security import log_security_event
            log_security_event('USER_OBJECT_ERROR', f'User object or role methods not available for {mask_email(user_email)}')
            print(f"보안 강화: 사용자 객체 오류로 인해 빈 결과 반환")
            return []  # 빈 결과 반환으로 보안 강화
    except Exception as e:
        print(f"필터링 오류: {e}")
        # 보안 강화: 필터링 실패 시 빈 결과 반환
        from app.services.user_service import mask_email
        from app.core.security import log_security_event
        log_security_event('FILTERING_ERROR', f'Filtering error for user {mask_email(user_email)}: {str(e)}')
        print(f"보안 강화: 필터링 실패로 인해 빈 결과 반환")
        return []  # 빈 결과 반환으로 보안 강화
    
    result = df.to_dict(orient="records")
    
    # 최신순으로 정렬 (created_at 기준, 없으면 역순)
    try:
        # created_at 컬럼이 있고 값이 있는 경우에만 정렬
        if 'created_at' in df.columns and df['created_at'].notna().any():
            # created_at이 있는 행들을 최신순으로 정렬
            df_with_date = df[df['created_at'].notna()].sort_values('created_at', ascending=False)
            # created_at이 없는 행들을 뒤에 추가
            df_without_date = df[df['created_at'].isna()]
            df_sorted = pd.concat([df_with_date, df_without_date])
            result = df_sorted.to_dict(orient="records")
        else:
            # created_at이 없으면 역순으로 정렬 (최신 등록이 위에)
            result = df.iloc[::-1].to_dict(orient="records")
    except Exception as e:
        # 오류 발생 시 역순으로 정렬
        print(f"정렬 오류: {e}")
        result = df.iloc[::-1].to_dict(orient="records")
    
    # NaN 값 정리
    result = clean_nan_values(result)
    
    # 소수점 제거 및 필드명 매핑
    for customer in result:
        # floor → floor_pref (항상 복사하고 소수점 제거)
        if 'floor' in customer:
            original_val = customer['floor']
            cleaned_val = _clean_numeric_value(original_val)
            customer['floor_pref'] = cleaned_val
            print(f"🔧 store.py floor 정리: '{original_val}' → '{cleaned_val}'")
        
        # area → area_pref (항상 복사하고 소수점 제거)
        if 'area' in customer:
            original_val = customer['area']
            cleaned_val = _clean_numeric_value(original_val)
            customer['area_pref'] = cleaned_val
            print(f"🔧 store.py area 정리: '{original_val}' → '{cleaned_val}'")
        
        # deposit → deposit_pref (항상 복사하고 소수점 제거)
        if 'deposit' in customer:
            original_val = customer['deposit']
            cleaned_val = _clean_numeric_value(original_val)
            customer['deposit_pref'] = cleaned_val
            print(f"🔧 store.py deposit 정리: '{original_val}' → '{cleaned_val}'")
        
        # rent → rent_pref (항상 복사하고 소수점 제거)
        if 'rent' in customer:
            original_val = customer['rent']
            cleaned_val = _clean_numeric_value(original_val)
            customer['rent_pref'] = cleaned_val
            print(f"🔧 store.py rent 정리: '{original_val}' → '{cleaned_val}'")
        
        # premium → premium_pref (항상 복사하고 소수점 제거)
        if 'premium' in customer:
            original_val = customer['premium']
            cleaned_val = _clean_numeric_value(original_val)
            customer['premium_pref'] = cleaned_val
            print(f"🔧 store.py premium 정리: '{original_val}' → '{cleaned_val}'")
        
        # note → notes
        if 'note' in customer and not customer.get('notes'):
            customer['notes'] = customer['note']
    
    return result

def create_customer(user_email: str, payload: dict) -> dict:
    """
    POST /api/customers 호출 시 사용.
    1) payload['regions'] 정규화
    2) 사용자 파일 + all_customers.xlsx 에 동시 저장
    3) 저장된 레코드 리턴
    """
    # 타입 체크 및 디버깅
    print('create_customer called with payload type:', type(payload))
    print('create_customer payload:', payload)
    
    # payload가 딕셔너리가 아닌 경우 처리
    if not isinstance(payload, dict):
        print('Error: payload is not a dict, converting...')
        if isinstance(payload, str):
            try:
                import json
                payload = json.loads(payload)
                print('Successfully converted string to dict:', payload)
            except Exception as e:
                print('Failed to parse JSON string:', e)
                payload = {}
        else:
            print('Payload is neither dict nor string, creating empty dict')
            payload = {}
    
    # payload가 여전히 딕셔너리가 아닌 경우 빈 딕셔너리로 설정
    if not isinstance(payload, dict):
        print('Final fallback: creating empty dict')
        payload = {}
    
    print('Final payload type:', type(payload))
    print('Final payload:', payload)
    
    # regions 필드 정규화
    regions = payload.get("regions", "") if isinstance(payload, dict) else ""
    payload["regions"] = normalize_region(regions)
    
    # 필드명 매핑 (프론트엔드 필드명 -> 백엔드 필드명)
    field_mapping = {
        "manager": "manager",
        "name": "name", 
        "phone": "phone",
        "regions": "regions",
        "floor": "floor",
        "area": "area", 
        "deposit": "deposit",
        "rent": "rent",
        "premium": "premium",
        "notes": "notes",
        "filter_data": "filter_data"  # 필터데이터 필드 추가
    }
    record = {}
    for frontend_field, backend_field in field_mapping.items():
        record[backend_field] = payload.get(frontend_field, "") if isinstance(payload, dict) else ""
    
    # 추가 필드들
    record["created_by"] = user_email
    record["created_at"] = payload.get("created_at", "") if isinstance(payload, dict) else ""
    
    # 고객명과 전화번호로 ID 생성
    record["id"] = _generate_customer_id(record["name"], record["phone"])
    
    # 사용자 파일
    user_path = _user_file(user_email)
    df_u = pd.DataFrame([record])
    
    # 사용자 파일이 존재하면 기존 데이터 읽어서 추가, 없으면 새로 생성
    if os.path.exists(user_path):
        try:
            existing_df = pd.read_excel(user_path)
            # NaN 값 처리
            existing_df = existing_df.fillna("")
            for col in existing_df.columns:
                if existing_df[col].dtype in ['float64', 'int64']:
                    existing_df[col] = existing_df[col].fillna(0)
                else:
                    existing_df[col] = existing_df[col].fillna("")
            
            # 문자열로 변환된 'nan' 값들도 처리
            for col in existing_df.columns:
                if existing_df[col].dtype == 'object':
                    existing_df[col] = existing_df[col].astype(str).replace(['nan', 'NaN', 'NAN'], '')
            
            # 기존 데이터에 새 고객 추가
            df_u = pd.concat([existing_df, df_u], ignore_index=True)
            print(f"✅ 사용자 파일에 기존 데이터 {len(existing_df)}개 + 새 고객 1개 추가")
        except Exception as e:
            print(f"사용자 파일 읽기 오류, 복구 시도: {e}")
            # 파일 복구 시도
            if _repair_excel_file(user_path):
                try:
                    existing_df = pd.read_excel(user_path)
                    existing_df = existing_df.fillna("")
                    df_u = pd.concat([existing_df, df_u], ignore_index=True)
                    print(f"✅ 복구된 사용자 파일에 기존 데이터 {len(existing_df)}개 + 새 고객 1개 추가")
                except Exception as e2:
                    print(f"복구된 사용자 파일 읽기 실패: {e2}")
                    print("사용자 파일 복구 실패, 새로 생성")
            else:
                print("사용자 파일 복구 실패, 새로 생성")
    else:
        print(f"📁 사용자 파일이 존재하지 않음, 새로 생성: {user_path}")
    
    # 사용자 파일 저장
    try:
        df_u.to_excel(user_path, index=False)
        print(f"✅ 사용자 파일 저장 완료: {user_path}")
    except Exception as e:
        print(f"❌ 사용자 파일 저장 오류: {e}")
    
    # 관리자 통합 파일
    admin_path = _admin_file()
    df_a = pd.DataFrame([record])
    
    # 관리자 파일이 존재하면 기존 데이터 읽어서 추가, 없으면 새로 생성
    if os.path.exists(admin_path):
        try:
            existing_df = pd.read_excel(admin_path)
            # NaN 값 처리
            existing_df = existing_df.fillna("")
            for col in existing_df.columns:
                if existing_df[col].dtype in ['float64', 'int64']:
                    existing_df[col] = existing_df[col].fillna(0)
                else:
                    existing_df[col] = existing_df[col].fillna("")
            
            # 문자열로 변환된 'nan' 값들도 처리
            for col in existing_df.columns:
                if existing_df[col].dtype == 'object':
                    existing_df[col] = existing_df[col].astype(str).replace(['nan', 'NaN', 'NAN'], '')
            
            # 기존 데이터에 새 고객 추가
            df_a = pd.concat([existing_df, df_a], ignore_index=True)
            print(f"✅ 관리자 파일에 기존 데이터 {len(existing_df)}개 + 새 고객 1개 추가")
        except Exception as e:
            print(f"관리자 파일 읽기 오류, 복구 시도: {e}")
            # 파일 복구 시도
            if _repair_excel_file(admin_path):
                try:
                    existing_df = pd.read_excel(admin_path)
                    existing_df = existing_df.fillna("")
                    df_a = pd.concat([existing_df, df_a], ignore_index=True)
                    print(f"✅ 복구된 관리자 파일에 기존 데이터 {len(existing_df)}개 + 새 고객 1개 추가")
                except Exception as e2:
                    print(f"복구된 관리자 파일 읽기 실패: {e2}")
                    print("관리자 파일 복구 실패, 새로 생성")
            else:
                print("관리자 파일 복구 실패, 새로 생성")
    else:
        print(f"📁 관리자 파일이 존재하지 않음, 새로 생성: {admin_path}")
    
    # 관리자 파일 저장
    try:
        df_a.to_excel(admin_path, index=False)
        print(f"✅ 관리자 파일 저장 완료: {admin_path}")
    except Exception as e:
        print(f"❌ 관리자 파일 저장 오류: {e}")
    
    return record

def update_customer(cid: str, updates: dict, user_email: str) -> dict:
    """고객 정보 수정 - ID로 직접 찾기"""
    print(f"🔄 update_customer 호출: cid={cid}, user_email={user_email}")
    
    # 어드민 여부 확인
    admin_status = is_admin(user_email)
    print(f"🔍 어드민 여부: {admin_status}")
    
    # 어드민이면 all_customers.xlsx에서, 아니면 사용자 파일에서 찾기
    if admin_status:
        target_path = _admin_file()
        print(f"📂 어드민 파일 사용: {target_path}")
    else:
        target_path = _user_file(user_email)
        print(f"📂 사용자 파일 사용: {target_path}")
    
    if not os.path.exists(target_path):
        print(f"❌ 파일이 존재하지 않음: {target_path}")
        return None
    
    df = pd.read_excel(target_path)
    # NaN 값을 더 확실하게 처리
    df = df.fillna("")
    # 숫자 컬럼에서 NaN이 남아있을 수 있으므로 추가 처리
    for col in df.columns:
        if df[col].dtype in ['float64', 'int64']:
            df[col] = df[col].fillna(0)
        else:
            df[col] = df[col].fillna("")
    
    # 문자열로 변환된 'nan' 값들도 처리
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].astype(str).replace(['nan', 'NaN', 'NAN'], '')
    
    print(f"📊 파일 읽기 완료, 행 수: {len(df)}")
    print(f"📊 고객 ID 목록: {df['id'].tolist() if 'id' in df.columns else 'id 컬럼 없음'}")
    
    # ID로 직접 찾기
    customer_idx = df[df['id'] == cid].index
    print(f"🔍 찾은 고객 인덱스: {customer_idx.tolist()}")
    
    if len(customer_idx) == 0:
        print(f"❌ 고객을 찾을 수 없음: ID={cid}")
        return None
    
    # 필드명 매핑 (프론트엔드 _pref 접미사 처리)
    mapped_updates = {}
    field_mapping = {
        'floor_pref': 'floor',
        'area_pref': 'area',
        'deposit_pref': 'deposit',
        'rent_pref': 'rent',
        'premium_pref': 'premium',
        'notes': 'note'  # Excel에서는 'note'로 저장되는 경우 대응
    }
    
    for key, value in updates.items():
        if key in ['id', 'created_by', 'created_at']:
            continue
            
        target_key = field_mapping.get(key, key)
        if value is not None and value != '' and value != 'undefined':
            # Excel 시트에 해당 컬럼이 있는지 확인 (있을 때만 업데이트)
            if target_key in df.columns:
                df.at[customer_idx[0], target_key] = value
                print(f"📝 업데이트: {target_key} (from {key}) = {value}")
            else:
                # 컬럼이 없으면 새로 추가하거나 무시 (여기선 안전하게 무시 또는 추가 선택 가능)
                # 기존 로직은 그냥 추가했으므로, 매핑되지 않은 키는 그대로 추가
                df.at[customer_idx[0], target_key] = value
                print(f"📝 새 컬럼 업데이트: {target_key} = {value}")
        else:
            print(f"⏭️ 빈 값 건너뛰기: {key} = {value}")
    
    # 파일 저장
    df.to_excel(target_path, index=False)
    print(f"💾 파일 저장 완료: {target_path}")
    
    # 어드민이 아닌 경우 관리자 파일도 업데이트
    if not admin_status:
        admin_path = _admin_file()
        if os.path.exists(admin_path):
            df_admin = pd.read_excel(admin_path)
            # NaN 값 처리
            df_admin = df_admin.fillna("")
            for col in df_admin.columns:
                if df_admin[col].dtype in ['float64', 'int64']:
                    df_admin[col] = df_admin[col].fillna(0)
                else:
                    df_admin[col] = df_admin[col].fillna("")
            
            # 문자열로 변환된 'nan' 값들도 처리
            for col in df_admin.columns:
                if df_admin[col].dtype == 'object':
                    df_admin[col] = df_admin[col].astype(str).replace(['nan', 'NaN', 'NAN'], '')
            
            admin_customer_idx = df_admin[df_admin['id'] == cid].index
            if len(admin_customer_idx) > 0:
                for key, value in updates.items():
                    if key in ['id', 'created_by', 'created_at']:
                        continue
                    df_admin.at[admin_customer_idx[0], key] = value
                df_admin.to_excel(admin_path, index=False)
                print(f"💾 관리자 파일도 업데이트 완료")
    
    updated_customer = df.iloc[customer_idx[0]].to_dict()
    
    # NaN 값 정리
    updated_customer = clean_nan_values(updated_customer)
    
    # 필드명 매핑 (Excel 컬럼명과 모델 필드명 통일)
    if 'floor' in updated_customer and not updated_customer.get('floor_pref'):
        updated_customer['floor_pref'] = updated_customer['floor']
    if 'area' in updated_customer and not updated_customer.get('area_pref'):
        updated_customer['area_pref'] = updated_customer['area']
    if 'deposit' in updated_customer and not updated_customer.get('deposit_pref'):
        updated_customer['deposit_pref'] = updated_customer['deposit']
    if 'rent' in updated_customer and not updated_customer.get('rent_pref'):
        updated_customer['rent_pref'] = updated_customer['rent']
    if 'premium' in updated_customer and not updated_customer.get('premium_pref'):
        updated_customer['premium_pref'] = updated_customer['premium']
    if 'note' in updated_customer and not updated_customer.get('notes'):
        updated_customer['notes'] = updated_customer['note']
    
    print(f"✅ 고객 업데이트 완료: ID={cid}")
    return updated_customer

def get_managers(user_email: str) -> list:
    """담당자 목록을 가져오는 함수"""
    if is_admin(user_email):
        # 어드민은 all_customers.xlsx 사용
        target = _admin_file()
    else:
        # 일반 사용자는 자신의 파일만 사용
        target = _user_file(user_email)
    
    if not os.path.exists(target):
        return []
    
    try:
        df = pd.read_excel(target)
        # NaN 값을 더 확실하게 처리
        df = df.fillna("")
        # 숫자 컬럼에서 NaN이 남아있을 수 있으므로 추가 처리
        for col in df.columns:
            if df[col].dtype in ['float64', 'int64']:
                df[col] = df[col].fillna(0)
            else:
                df[col] = df[col].fillna("")
        
        # 문자열로 변환된 'nan' 값들도 처리
        for col in df.columns:
            if df[col].dtype == 'object':
                df[col] = df[col].astype(str).replace(['nan', 'NaN', 'NAN'], '')
        
        # manager 컬럼이 있는지 확인
        if "manager" not in df.columns:
            return []
        
        # 담당자 목록 추출 (빈 값 제외 및 정렬)
        managers = sorted([m.strip() for m in df['manager'].unique() if m and str(m).strip()])
        
        # NaN 값 정리
        managers = clean_nan_values(managers)
        
        return managers
        
    except Exception as e:
        return []


def delete_customer(cid: str, user_email: str) -> bool:
    """고객 삭제 - ID로 직접 찾기"""
    # 어드민 여부 확인
    admin_status = is_admin(user_email)
    
    # 어드민이면 all_customers.xlsx에서, 아니면 사용자 파일에서 찾기
    if admin_status:
        target_path = _admin_file()
    else:
        target_path = _user_file(user_email)
    
    if not os.path.exists(target_path):
        return False
    
    df = pd.read_excel(target_path)
    # NaN 값을 더 확실하게 처리
    df = df.fillna("")
    # 숫자 컬럼에서 NaN이 남아있을 수 있으므로 추가 처리
    for col in df.columns:
        if df[col].dtype in ['float64', 'int64']:
            df[col] = df[col].fillna(0)
        else:
            df[col] = df[col].fillna("")
    
    # 문자열로 변환된 'nan' 값들도 처리
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].astype(str).replace(['nan', 'NaN', 'NAN'], '')
    
    original_len = len(df)
    
    # ID로 직접 찾아서 삭제
    df = df[df['id'] != cid]
    
    if len(df) == original_len:
        return False
    
    # 파일 저장
    df.to_excel(target_path, index=False)
    
    # 어드민이 아닌 경우 관리자 파일에서도 삭제
    if not admin_status:
        admin_path = _admin_file()
        if os.path.exists(admin_path):
            df_admin = pd.read_excel(admin_path)
            # NaN 값 처리
            df_admin = df_admin.fillna("")
            for col in df_admin.columns:
                if df_admin[col].dtype in ['float64', 'int64']:
                    df_admin[col] = df_admin[col].fillna(0)
                else:
                    df_admin[col] = df_admin[col].fillna("")
            
            # 문자열로 변환된 'nan' 값들도 처리
            for col in df_admin.columns:
                if df_admin[col].dtype == 'object':
                    df_admin[col] = df_admin[col].astype(str).replace(['nan', 'NaN', 'NAN'], '')
            
            df_admin = df_admin[df_admin['id'] != cid]
            df_admin.to_excel(admin_path, index=False)
    
    print(f"✅ 고객 삭제 완료: ID={cid}")
    return True
