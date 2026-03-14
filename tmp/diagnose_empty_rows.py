# /tmp/diagnose_empty_rows.py
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def diagnose():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    tables = ['listings_rent', 'listings_sale_unit', 'listings_sale_land']
    
    for table in tables:
        print(f"\n--- Analyzing {table} ---")
        response = supabase.table(table).select("id, fields").execute()
        data = response.data
        total = len(data)
        
        # '접수일', '지역', '건물명' 등 주요 필드가 하나도 없는 행 필터링
        really_empty = []
        for d in data:
            f = d.get('fields', {})
            # 모든 밸류가 비어있는지 확인
            is_empty = True
            for k, v in f.items():
                if v and str(v).strip():
                    is_empty = False
                    break
            if is_empty:
                really_empty.append(d['id'])
        
        print(f"Total rows in Supabase: {total}")
        print(f"Completely empty rows (no field values): {len(really_empty)}")
        if really_empty:
            print(f"Sample empty ID: {really_empty[0]}")

if __name__ == "__main__":
    diagnose()
