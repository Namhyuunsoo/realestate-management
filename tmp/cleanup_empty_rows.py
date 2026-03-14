# /tmp/cleanup_empty_rows.py
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
        print(f"Cleaning {table}...")
        response = supabase.table(table).select("id, fields").execute()
        data = response.data
        
        ids_to_delete = []
        for d in data:
            f = d.get('fields', {})
            is_empty = True
            for v in f.values():
                if v and str(v).strip():
                    is_empty = False
                    break
            if is_empty:
                ids_to_delete.append(d['id'])
        
        if ids_to_delete:
            print(f"Deleting {len(ids_to_delete)} rows from {table}...")
            # 대량 삭제 처리 (배치)
            for i in range(0, len(ids_to_delete), 100):
                batch = ids_to_delete[i:i+100]
                supabase.table(table).delete().in_("id", batch).execute()
            deleted_total += len(ids_to_delete)
    
    print(f"Cleanup finished. Total deleted: {deleted_total}")

if __name__ == "__main__":
    cleanup()
