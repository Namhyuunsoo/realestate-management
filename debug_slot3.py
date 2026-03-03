
import os
import sys
import json
from dotenv import load_dotenv

# 프로젝트 루트를 경로에 추가
sys.path.append(os.getcwd())

from app.services.commercial_listings_service import fetch_all_commercial_listings

load_dotenv()

def debug_slot_3():
    print("--- 슬롯3(오태식) 데이터 정밀 분석 ---")
    data = fetch_all_commercial_listings()
    
    # 1. 유저 ID별 통계
    stats = {}
    for d in data:
        uid = d.get('user_id', 'unknown')
        if uid not in stats:
            stats[uid] = {'total': 0, 'with_coords': 0}
        stats[uid]['total'] += 1
        if d.get('coords') and d['coords'].get('lat'):
            stats[uid]['with_coords'] += 1
            
    print("\n[유저/담당자별 통계]")
    for uid, s in stats.items():
        print(f"User ID: {uid}, 총 매물: {s['total']}, 좌표 있음: {s['with_coords']}")

    # 2. 슬롯3(usr_1754650773146_e3t141) 샘플 확인
    slot3_id = 'usr_1754650773146_e3t141'
    slot3_data = [d for d in data if d.get('user_id') == slot3_id]
    
    print(f"\n[슬롯3 상세]")
    print(f"슬롯3 총 매물: {len(slot3_data)}")
    
    if slot3_data:
        no_coords = [d for d in slot3_data if not (d.get('coords') and d['coords'].get('lat'))]
        print(f"좌표 없는 매물: {len(no_coords)}")
        
        if no_coords:
            print("\n좌표 없는 슬롯3 매물 샘플 (첫 10개):")
            for d in no_coords[:10]:
                print(f"ID: {d['id']}, 주소: '{d['address_full']}', 상호: {d.get('fields', {}).get('상호', 'N/A')}")

if __name__ == "__main__":
    debug_slot_3()
