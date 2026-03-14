# /tmp/cleanup_instruction_rows.py
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def cleanup():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    tables = ['listings_rent', 'listings_sale_unit', 'listings_sale_land']
    
    deleted_total = 0
    for table in tables:
        print(f"Cleaning instructions from {table}...")
        response = supabase.table(table).select("id, fields").execute()
        data = response.data
        
        ids_to_delete = []
        for d in data:
            f = d.get('fields', {})
            # '접수일', '지역', '지번' 중 하나도 없으면 매물 데이터가 아님 (안내문일 가능성 높음)
            # 특히 '공석' 담당자 데이터 중 이런 경우가 많음
            essential_fields = ['접수일', '지역', '지번']
            has_essential = False
            for ef in essential_fields:
                if f.get(ef) and str(f.get(ef)).strip():
                    has_essential = True
                    break
            
            if not has_essential:
                ids_to_delete.append(d['id'])
        
        if ids_to_delete:
            print(f"Deleting {len(ids_to_delete)} instruction/empty rows from {table}...")
            for i in range(0, len(ids_to_delete), 100):
                batch = ids_to_delete[i:i+100]
                supabase.table(table).delete().in_("id", batch).execute()
            deleted_total += len(ids_to_delete)
    
    print(f"Cleanup finished. Total deleted: {deleted_total}")

if __name__ == "__main__":
    cleanup()
