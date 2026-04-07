
import os
import json
import logging
from app.services.commercial_sync_service import CommercialSyncService

# 로깅 설정 (콘솔 출력)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

def test_sync(slot_ids):
    service = CommercialSyncService()
    for sid in slot_ids:
        print(f"\n=== Testing Sync for Slot {sid} ===")
        res = service.supabase.table("sheet_registry").select("*").eq("slot_id", sid).execute()
        if not res.data:
            print(f"Slot {sid} not found in registry")
            continue
        
        slot = res.data[0]
        sync_res = service.sync_single_slot(
            slot_id=str(sid),
            sheet_url=slot['sheet_url'],
            user_id=slot.get('user_id'),
            manager_name=slot.get('manager_name')
        )
        print(f"Sync Result: {sync_res['success']}")
        if sync_res['errors']:
            print(f"Errors: {sync_res['errors']}")
        else:
            print("No errors found.")

if __name__ == "__main__":
    test_sync(["2", "3"])
