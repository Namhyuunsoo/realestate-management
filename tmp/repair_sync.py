
import os
import sys
import logging

# Ensure project root is in PYTHONPATH
sys.path.append(os.getcwd())

from app.services.commercial_sync_service import CommercialSyncService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ManualSync")

def run_repair_sync():
    service = CommercialSyncService()
    
    # 1. Slot 2(정한나) Sync - UUID 재발행 및 DB 등록
    print("\n--- [REPAIR] Syncing Slot 2 (Jeong Hannah) - Issuing new UUIDs ---")
    res2 = service.supabase.table("sheet_registry").select("*").eq("slot_id", "2").execute()
    if res2.data:
        slot = res2.data[0]
        sync_res = service.sync_single_slot(
            slot_id="2",
            sheet_url=slot['sheet_url'],
            user_id=slot.get('user_id'),
            manager_name=slot.get('manager_name')
        )
        print(f"Slot 2 Sync Result: {sync_res['success']}")
        if sync_res['errors']: print(f"Errors: {sync_res['errors']}")
    
    # 2. Slot 3(오태식) Sync - 소유권 정상화
    print("\n--- [REPAIR] Syncing Slot 3 (Oh Taeshik) - Reclaiming duplicated UUIDs ---")
    res3 = service.supabase.table("sheet_registry").select("*").eq("slot_id", "3").execute()
    if res3.data:
        slot = res3.data[0]
        sync_res = service.sync_single_slot(
            slot_id="3",
            sheet_url=slot['sheet_url'],
            user_id=slot.get('user_id'),
            manager_name=slot.get('manager_name')
        )
        print(f"Slot 3 Sync Result: {sync_res['success']}")
        if sync_res['errors']: print(f"Errors: {sync_res['errors']}")

if __name__ == "__main__":
    run_repair_sync()
