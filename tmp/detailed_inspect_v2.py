
import os
import json
import re
import gspread
from google.oauth2.service_account import Credentials

SERVICE_ACCOUNT_FILE = 'service_account.json'

def get_gspread_client():
    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    credentials = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=scopes)
    return gspread.authorize(credentials)

def detailed_inspect(slot_id, sheet_url):
    print(f"\n--- DETAILED INSPECTION: Slot {slot_id} ---")
    gc = get_gspread_client()
    m = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
    sheet_id = m.group(1)
    try:
        sh = gc.open_by_key(sheet_id)
        print(f"Spreadsheet Title: {sh.title}")
    except Exception as e:
        print(f"Could not open spreadsheet: {e}")
        return
    
    tab_name = "상가임대차"
    try:
        ws = sh.worksheet(tab_name)
        values = ws.get_all_values()
        if not values:
            print(f"Tab [{tab_name}]: Empty")
            return
        
        # 1. Header row finding logic
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
        print(f"Headers (len {len(headers)}): {headers}")
        
        # 2. Check "UUID" and "현황" columns
        def normalize_header(header):
            if not header: return ""
            clean = re.sub(r'\(.*?\)', '', header)
            clean = re.sub(r'\s+', '', clean)
            clean = re.sub(r'[^가-힣a-zA-Z0-9]', '', clean)
            return clean.strip()

        norm_headers = [normalize_header(h) for h in headers]
        
        # print(f"Normalized Headers: {norm_headers}")
        
        if "UUID" in norm_headers:
            uuid_idx = norm_headers.index("UUID")
            print(f"UUID Column found at index {uuid_idx}, Original Name: '{headers[uuid_idx]}'")
            
            # Check for data rows
            data_rows = values[header_idx+1:]
            print(f"First 3 data rows UUID check:")
            for i, row in enumerate(data_rows[:3]):
                if len(row) > uuid_idx:
                    val = row[uuid_idx]
                    print(f"  Row {i+1}: '{val}' (len {len(val)})")
                else:
                    print(f"  Row {i+1}: Column too short")
        else:
            print("UUID Column NOT FOUND.")
            
        if "현황" in norm_headers:
            h_idx = norm_headers.index("현황")
            print(f"현황 Column found at index {h_idx}, Original Name: '{headers[h_idx]}'")
        else:
            print("현황 Column NOT FOUND.")
            
    except Exception as e:
        print(f"Error inspecting tab: {e}")

if __name__ == "__main__":
    slots = [
        ("2", "https://docs.google.com/spreadsheets/d/1B4w5TPxNZ9ZfzHn1LxHJoqbNDkPkI13in8F4VH-zZi8/"),
        ("3", "https://docs.google.com/spreadsheets/d/1XVbR4WmllKJPQx_bATHVEJ0EGumnkMlFbSGzmDByYhg/")
    ]
    for sid, url in slots:
        detailed_inspect(sid, url)
