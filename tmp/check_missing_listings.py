# /tmp/check_missing_listings.py
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def check_missing():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    tables = ['listings_rent', 'listings_sale_unit', 'listings_sale_land']
    
    report = {}
    
    for table in tables:
        # 주소나 접수일이 비어있는 데이터 확인
        # Supabase API의 filter 기능을 활용하여 JSONB 내부 필드 접근은 어려우므로 일단 가져와서 분석
        print(f"Analyzing {table}...")
        response = supabase.table(table).select("id, address_full, fields").execute()
        data = response.data
        
        missing_address = [d for d in data if not d.get('address_full')]
        
        # 필드별 누락 (주요 필드 위주)
        incomplete_fields = []
        for d in data:
            f = d.get('fields', {})
            missing_cols = [col for col in ['접수일', '지역', '보증금'] if not f.get(col)]
            if missing_cols:
                incomplete_fields.append({
                    "id": d['id'],
                    "missing": missing_cols
                })
        
        report[table] = {
            "total": len(data),
            "missing_address_count": len(missing_address),
            "incomplete_fields_sample": incomplete_fields[:5],
            "incomplete_fields_total": len(incomplete_fields)
        }
    
    print(json.dumps(report, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    check_missing()
