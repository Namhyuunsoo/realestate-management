import sys
import os
import json

# 프로젝트 루트 추가
sys.path.append(os.getcwd())

from flask import Flask
from app.services.housing_sheet_to_supabase_sync import sync_housing_sheets_to_supabase

app = Flask(__name__)

def test_housing_sync():
    with app.app_context():
        print("--- Starting Manual Sync Test (Housing) ---")
        report = sync_housing_sheets_to_supabase()
        
        print(json.dumps(report, indent=2, ensure_ascii=False))
        
        if report.get("success"):
            print(f"✅ Housing Sync Successful! Total Rows: {report.get('total_rows')}")
        else:
            print(f"❌ Housing Sync Failed: {report.get('errors')}")

if __name__ == "__main__":
    test_housing_sync()
