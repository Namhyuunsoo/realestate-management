#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
각 PC의 store.json 데이터를 통합하는 스크립트

사용법:
1. 각 PC의 data/store.json 파일을 수집
2. pc_stores/ 폴더에 각 PC별로 저장:
   pc_stores/
   ├── pc1_store.json
   ├── pc2_store.json
   └── pc3_store.json
3. 이 스크립트 실행: python merge_store_data.py
4. 통합된 store.json이 output/merged_store.json에 생성됨
"""

import json
import os
import time
from collections import defaultdict
from typing import Dict, List, Set

# 설정
PC_STORES_DIR = "pc_stores"  # 각 PC의 store.json 파일들이 있는 폴더
OUTPUT_DIR = "output"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "merged_store.json")

def load_store_file(filepath: str) -> Dict:
    """store.json 파일 로드"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ 파일 로드 실패: {filepath} - {e}")
        return None

def generate_unique_customer_id(name: str, phone: str, existing_ids: Set[str], pc_suffix: str = "") -> str:
    """고유한 고객 ID 생성"""
    # 기본 ID 생성 (이름_전화번호)
    clean_name = name.strip().replace(" ", "_")
    clean_phone = phone.strip().replace("-", "").replace(" ", "")
    base_id = f"{clean_name}_{clean_phone}"
    
    # PC 접미사 추가 (같은 이름+전화번호가 여러 PC에 있을 경우 구분)
    if pc_suffix:
        base_id = f"{base_id}_{pc_suffix}"
    
    # ID 충돌 시 번호 추가
    customer_id = base_id
    counter = 1
    while customer_id in existing_ids:
        customer_id = f"{base_id}_{counter:03d}"
        counter += 1
    
    return customer_id

def merge_customers(all_stores: List[Dict], pc_names: List[str]) -> Dict[str, Dict]:
    """모든 PC의 고객 데이터 통합"""
    merged_customers = {}
    existing_ids = set()
    customer_id_mapping = {}  # 원본 ID -> 새 ID 매핑
    
    print("\n📋 고객 데이터 통합 시작...")
    
    for store_data, pc_name in zip(all_stores, pc_names):
        customers = store_data.get("customers", {})
        print(f"  - {pc_name}: {len(customers)}개 고객")
        
        for old_customer_id, customer in customers.items():
            name = customer.get("name", "").strip()
            phone = customer.get("phone", "").strip()
            
            if not name or not phone:
                print(f"    ⚠️ 고객 ID {old_customer_id}: 이름 또는 전화번호가 없어 건너뜀")
                continue
            
            # 고유 ID 생성
            new_customer_id = generate_unique_customer_id(
                name, phone, existing_ids, pc_suffix=pc_name
            )
            
            # ID 매핑 저장
            customer_id_mapping[old_customer_id] = new_customer_id
            
            # 고객 데이터 복사 (ID 업데이트)
            merged_customer = customer.copy()
            merged_customer["id"] = new_customer_id
            merged_customer["_merged_from"] = pc_name  # 어느 PC에서 왔는지 기록
            merged_customer["_original_id"] = old_customer_id  # 원본 ID 기록
            
            merged_customers[new_customer_id] = merged_customer
            existing_ids.add(new_customer_id)
    
    print(f"✅ 고객 통합 완료: 총 {len(merged_customers)}개 고객")
    return merged_customers, customer_id_mapping

def merge_briefings(all_stores: List[Dict], pc_names: List[str], customer_id_mapping: Dict[str, str]) -> Dict[str, Dict]:
    """모든 PC의 브리핑 데이터 통합"""
    merged_briefings = {}
    existing_ids = set()
    briefing_counter = 1
    
    print("\n📋 브리핑 데이터 통합 시작...")
    
    for store_data, pc_name in zip(all_stores, pc_names):
        briefings = store_data.get("briefings", {})
        print(f"  - {pc_name}: {len(briefings)}개 브리핑")
        
        for old_briefing_id, briefing in briefings.items():
            # 브리핑 ID 생성 (충돌 방지)
            new_briefing_id = f"brf_{briefing_counter:06d}"
            while new_briefing_id in existing_ids:
                briefing_counter += 1
                new_briefing_id = f"brf_{briefing_counter:06d}"
            
            # 고객 ID 매핑 업데이트
            old_customer_id = briefing.get("customer_id", "")
            new_customer_id = customer_id_mapping.get(old_customer_id, old_customer_id)
            
            # 브리핑 데이터 복사
            merged_briefing = briefing.copy()
            merged_briefing["id"] = new_briefing_id
            merged_briefing["customer_id"] = new_customer_id  # 고객 ID 업데이트
            merged_briefing["_merged_from"] = pc_name  # 어느 PC에서 왔는지 기록
            merged_briefing["_original_id"] = old_briefing_id  # 원본 ID 기록
            
            merged_briefings[new_briefing_id] = merged_briefing
            existing_ids.add(new_briefing_id)
            briefing_counter += 1
    
    print(f"✅ 브리핑 통합 완료: 총 {len(merged_briefings)}개 브리핑")
    return merged_briefings

def main():
    """메인 함수"""
    print("=" * 60)
    print("  store.json 데이터 통합 스크립트")
    print("=" * 60)
    
    # 디렉토리 확인
    if not os.path.exists(PC_STORES_DIR):
        print(f"\n❌ {PC_STORES_DIR} 폴더가 없습니다.")
        print(f"   각 PC의 store.json 파일을 {PC_STORES_DIR}/ 폴더에 복사하세요.")
        print(f"   예: {PC_STORES_DIR}/pc1_store.json")
        return
    
    # 출력 디렉토리 생성
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 각 PC의 store.json 파일 찾기
    store_files = []
    pc_names = []
    
    for filename in os.listdir(PC_STORES_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(PC_STORES_DIR, filename)
            pc_name = filename.replace("_store.json", "").replace(".json", "")
            store_files.append(filepath)
            pc_names.append(pc_name)
    
    if not store_files:
        print(f"\n❌ {PC_STORES_DIR} 폴더에 JSON 파일이 없습니다.")
        return
    
    print(f"\n📁 발견된 파일: {len(store_files)}개")
    for filepath, pc_name in zip(store_files, pc_names):
        print(f"  - {pc_name}: {filepath}")
    
    # 모든 store.json 파일 로드
    all_stores = []
    for filepath, pc_name in zip(store_files, pc_names):
        store_data = load_store_file(filepath)
        if store_data:
            all_stores.append(store_data)
        else:
            print(f"⚠️ {pc_name} 파일을 건너뜀")
    
    if not all_stores:
        print("\n❌ 로드할 수 있는 파일이 없습니다.")
        return
    
    # 고객 데이터 통합
    merged_customers, customer_id_mapping = merge_customers(all_stores, pc_names)
    
    # 브리핑 데이터 통합
    merged_briefings = merge_briefings(all_stores, pc_names, customer_id_mapping)
    
    # 통합된 데이터 저장
    merged_data = {
        "customers": merged_customers,
        "briefings": merged_briefings,
        "saved_at": int(time.time()),
        "_merge_info": {
            "merged_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source_pcs": pc_names,
            "total_customers": len(merged_customers),
            "total_briefings": len(merged_briefings)
        }
    }
    
    # JSON 파일 저장
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print("✅ 통합 완료!")
    print("=" * 60)
    print(f"\n📄 통합된 파일: {OUTPUT_FILE}")
    print(f"   - 고객: {len(merged_customers)}개")
    print(f"   - 브리핑: {len(merged_briefings)}개")
    print(f"\n💡 다음 단계:")
    print(f"   1. {OUTPUT_FILE} 파일을 확인하세요")
    print(f"   2. 웹 서버의 data/store.json으로 복사하세요")
    print(f"   3. 서버 재시작 후 데이터 확인하세요")

if __name__ == "__main__":
    main()
