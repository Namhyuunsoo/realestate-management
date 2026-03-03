import os
import sys
import json
from dotenv import load_dotenv

# 로컬 임포트를 위해 경로 추가
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.sheet_to_supabase_sync import get_google_sheets_client, extract_sheet_id_from_url

def analyze_headers():
    load_dotenv()
    client = get_google_sheets_client()
    
    # 슬롯 1번 시트 사용
    sheet_url = "https://docs.google.com/spreadsheets/d/18I1rog8mytAT9cHgLQOrRjqo_MA7uC2jzWf7sJRN4LY/edit?gid=1958107055#gid=1958107055"
    sheet_id = extract_sheet_id_from_url(sheet_url)
    
    print(f"Opening spreadsheet: {sheet_id}")
    spreadsheet = client.open_by_key(sheet_id)
    
    def get_first_row(name):
        try:
            ws = spreadsheet.worksheet(name)
            return ws.get_all_values()[0]
        except Exception as e:
            print(f"Error reading {name}: {e}")
            return None

    h_unit = get_first_row('구분상가매매')
    h_land = get_first_row('건물토지매매')
    h_rent = get_first_row('상가임대차')

    print("\n" + "="*50)
    print("CATEGORY: 구분상가매매")
    print(f"Count: {len(h_unit) if h_unit else 0}")
    print(h_unit)
    
    print("\n" + "="*50)
    print("CATEGORY: 건물토지매매")
    print(f"Count: {len(h_land) if h_land else 0}")
    print(h_land)

    if h_unit and h_land:
        print("\n" + "="*50)
        print("DIFFERENCE ANALYSIS")
        
        unit_set = set(h_unit)
        land_set = set(h_land)
        
        only_unit = unit_set - land_set
        only_land = land_set - unit_set
        
        print(f"In 구분상가매매 ONLY: {only_unit}")
        print(f"In 건물토지매매 ONLY: {only_land}")
        
        if h_unit == h_land:
            print("\n>>> RESULT: HEADERS ARE EXACTLY THE SAME")
        else:
            print("\n>>> RESULT: HEADERS ARE DIFFERENT")
    else:
        print("\n>>> FAILED TO READ ONE OR BOTH HEADERS")

if __name__ == "__main__":
    analyze_headers()
