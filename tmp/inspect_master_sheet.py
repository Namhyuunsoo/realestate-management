# /tmp/inspect_master_sheet.py
import os
import gspread
import json
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

load_dotenv()

def inspect_master():
    service_account_file = os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
    master_sheet_id = "1D14iWPeTuHAMf9m_LrtsILYEd2Z8dpjAbIfpx-WR8eY"
    sheet_names = ["상가임대차", "구분상가매매", "건물토지매매"]
    
    gc = gspread.service_account(filename=service_account_file)
    sh = gc.open_by_key(master_sheet_id)
    
    result = {}
    for name in sheet_names:
        try:
            ws = sh.worksheet(name)
            headers = ws.row_values(1)
            result[name] = headers
        except Exception as e:
            result[name] = f"Error: {e}"
            
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    inspect_master()
