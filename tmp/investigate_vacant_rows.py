# /tmp/investigate_vacant_rows.py
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def investigate():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    table = 'listings_sale_land'
    print(f"Investigating {table} for '공석' manager...")
    
    # manager_name이 '공석'인 데이터 조회
    response = supabase.table(table).select("id, slot_id, manager_name, fields").eq("manager_name", "공석").execute()
    data = response.data
    
    print(f"Found {len(data)} rows with manager_name='공석'")
    if data:
        for d in data[:5]:
            print(f"ID: {d['id']}, Slot: {d['slot_id']}, Fields: {d['fields']}")

    # 슬롯 레지스트리 상태 확인
    print("\n--- Sheet Registry Slots ---")
    reg_res = supabase.table("sheet_registry").select("*").execute()
    slots = reg_res.data
    for s in slots:
        print(f"Slot {s['slot_id']}: Manager={s['manager_name']}, URL={s['sheet_url'][:30]}...")

if __name__ == "__main__":
    investigate()
