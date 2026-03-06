import sys
import os
import json

# 프로젝트 루트 추가
sys.path.append(os.getcwd())

from flask import Flask
from app.services.commercial_sync_service import CommercialSyncService

app = Flask(__name__)

def test_sync():
    with app.app_context():
        print("--- Starting Manual Sync Test (Commercial) ---")
        service = CommercialSyncService()
        report = service.sync_all_users()
        
        print(json.dumps(report, indent=2, ensure_ascii=False))
        
        if report.get("success"):
            print(f"✅ Sync Successful! Total Synced: {report.get('total_synced')}")
        else:
            print(f"❌ Sync Failed: {report.get('error')}")

if __name__ == "__main__":
    test_sync()
