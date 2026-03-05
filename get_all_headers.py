import os
import sys
import json
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.services.sheet_to_supabase_sync import get_google_sheets_client

def get_headers():
    load_dotenv()
    client = get_google_sheets_client()
    
    # Commercial Standard Sheet (from slot 1)
    comm_sheet_id = "18I1rog8mytAT9cHgLQOrRjqo_MA7uC2jzWf7sJRN4LY"
    comm_sheet = client.open_by_key(comm_sheet_id)
    
    # Housing Shared Sheet
    housing_sheet_id = "1KZ7aLN_Vzfnp0MhnOsJXuCtPtGIPuVj-UaHB2xP7JRs"
    housing_sheet = client.open_by_key(housing_sheet_id)
    
    headers = {}
    
    def fetch_header(spreadsheet, sheet_name):
        try:
            ws = spreadsheet.worksheet(sheet_name)
            return ws.get_all_values()[0]
        except Exception as e:
            return f"Error: {e}"
            
    headers['상가임대차'] = fetch_header(comm_sheet, "상가임대차")
    headers['구분상가매매'] = fetch_header(comm_sheet, "구분상가매매")
    headers['건물토지매매'] = fetch_header(comm_sheet, "건물토지매매")
    
    headers['주택 매매'] = fetch_header(housing_sheet, "주택 매매")
    headers['주택임대차'] = fetch_header(housing_sheet, "주택임대차")
    
    print(json.dumps(headers, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    get_headers()
