
import os
import json
import re
import gspread
from google.oauth2.service_account import Credentials
from supabase import create_client

SERVICE_ACCOUNT_FILE = 'service_account.json'
SUPABASE_URL = 'https://jwwdmtkwrejnwougcrod.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3d2RtdGt3cmVqbndvdWdjcm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU4MzUwNCwiZXhwIjoyMDg0MTU5NTA0fQ.YjVHqRrwywCsqG-E1_OZ2uV69CLihfo4QOcu3x5_9Is'

def get_gspread_client():
    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    credentials = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=scopes)
    return gspread.authorize(credentials)

def detailed_inspect(slot_id, sheet_url):
    print(f"\n--- DETAILED INSPECTION: Slot {slot_id} ---")
    gc = get_gspread_client()
    m = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
    sheet_id = m.group(1)
    sh = gc.open_by_key(sheet_id)
    
    tab_name = "상가임대차"
    try:
        ws = sh.worksheet(tab_name)
        values = ws.get_all_values()
        if not values:
            print(f"Tab [{tab_name}]: Empty")
            return
        
        # 1. Header row finding logic (same as sync service)
        header_idx = -1
        for i, row_vals in enumerate(values[:10]):
            row_str = " ".join([str(v) for v in row_vals])
            keywords = ["지역", "지번", "층", "건물명", "보증금", "월세"]
            matches = [k for k in keywords if k in row_str]
            if len(matches) >= 2:
                header_idx = i
                break
        
        if header_idx == -1:
            print("Could not find header row by keywords.")
            header_idx = 0
            
        print(f"Header Row Index detected: {header_idx}")
        headers = values[header_idx]
        print(f"Headers: {headers}")
        
        # 2. Check "UUID" and "현황" columns
        norm_headers = []
        for h in headers:
            # Simple normalization for this script
            clean = re.sub(r'\(.*?\)', '', h)
            clean = re.sub(r'\s+', '', clean)
            clean = re.sub(r'[^가-힣a-zA-Z0-9]', '', clean)
            norm_headers.append(clean)
        
        print(f"Normalized Headers: {norm_headers}")
        
        if "UUID" in norm_headers:
            uuid_idx = norm_headers.index("UUID")
            print(f"UUID Column found at {uuid_idx}")
            # Sample UUID (first 3)
            sample_uuids = [row[uuid_idx] for row in values[header_idx+1:header_idx+6] if len(row) > uuid_idx]
            print(f"Sample UUIDs from sheet: {sample_uuids}")
        else:
            print("UUID Column NOT FOUND.")
            
        if "현황" in norm_headers:
            print(f"현황 Column found at {norm_headers.index('현황')}")
        else:
            print("현황 Column NOT FOUND.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = supabase.table("sheet_registry").select("*").in_("slot_id", ["2", "3"]).execute()
    for slot in res.data:
        detailed_inspect(slot['slot_id'], slot['sheet_url'])
