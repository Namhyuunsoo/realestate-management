
import os
import json
import re
import gspread
from google.oauth2.service_account import Credentials
from supabase import create_client

# 설정 로드
SERVICE_ACCOUNT_FILE = 'service_account.json'
SUPABASE_URL = 'https://jwwdmtkwrejnwougcrod.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3d2RtdGt3cmVqbndvdWdjcm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU4MzUwNCwiZXhwIjoyMDg0MTU5NTA0fQ.YjVHqRrwywCsqG-E1_OZ2uV69CLihfo4QOcu3x5_9Is'

def get_gspread_client():
    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    credentials = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=scopes)
    return gspread.authorize(credentials)

def inspect_sheet(slot_id, sheet_url):
    print(f"\n--- Inspecting Slot {slot_id} ---")
    gc = get_gspread_client()
    m = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
    if not m:
        print("Invalid URL")
        return
    
    sheet_id = m.group(1)
    try:
        sh = gc.open_by_key(sheet_id)
        print(f"Spreadsheet Title: {sh.title}")
        
        target_tabs = ["상가임대차", "구분상가매매", "건물토지매매"]
        for tab_name in target_tabs:
            try:
                ws = sh.worksheet(tab_name)
                values = ws.get_all_values()
                if not values:
                    print(f"Tab [{tab_name}]: Empty")
                    continue
                
                print(f"Tab [{tab_name}]: {len(values)} rows found.")
                # Show first 5 rows to see where headers are
                for i, row in enumerate(values[:5]):
                    print(f"Row {i+1}: {row[:10]}...")
                
                # Check for UUID column
                headers = values[0]
                if "UUID" in headers:
                    print(f"Result: UUID found in row 1, index {headers.index('UUID')}")
                else:
                    # Search for header row (same logic as sync_single_slot)
                    header_idx = -1
                    for i, row_vals in enumerate(values[:10]):
                        row_str = " ".join([str(v) for v in row_vals])
                        keywords = ["지역", "지번", "층", "건물명", "보증금", "월세"]
                        matches = [k for k in keywords if k in row_str]
                        if len(matches) >= 2:
                            header_idx = i
                            break
                    if header_idx != -1:
                        print(f"Result: Real Headers found at row {header_idx + 1}")
                        if "UUID" in values[header_idx]:
                             print(f"Result: UUID found in row {header_idx + 1}, index {values[header_idx].index('UUID')}")
                        else:
                             print(f"Result: UUID NOT found in row {header_idx + 1}")
                    else:
                        print("Result: Could not find header row in first 10 rows.")
            except gspread.exceptions.WorksheetNotFound:
                print(f"Tab [{tab_name}]: Not Found")
            except Exception as e:
                print(f"Tab [{tab_name}]: Error - {e}")
                
    except Exception as e:
        print(f"Error opening spreadsheet: {e}")

if __name__ == "__main__":
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = supabase.table("sheet_registry").select("*").in_("slot_id", ["2", "3"]).execute()
    for slot in res.data:
        inspect_sheet(slot['slot_id'], slot['sheet_url'])
