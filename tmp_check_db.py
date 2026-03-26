from app.services.repositories import _get_supabase_client
import json

def check_db():
    client = _get_supabase_client()
    if not client:
        print("Supabase client not available.")
        return

    print("\n--- [1] Sheet Registry Status ---")
    res = client.table('sheet_registry').select('*').execute()
    for s in res.data:
        print(f"Slot {s.get('slot_id')}: {s.get('manager_name')} / Active: {s.get('is_active')} / Last Sync: {s.get('last_synced_at')} / Success: {s.get('last_sync_status')}")

    print("\n--- [2] DB Row Counts ---")
    tables = ['listings_rent', 'listings_sale_unit', 'listings_sale_land']
    for t in tables:
        count_res = client.table(t).select('id', count='exact').execute()
        print(f"{t}: {count_res.count if hasattr(count_res, 'count') else len(count_res.data)} rows")

    print("\n--- [3] Recent 5 Listings (Rent) ---")
    sample_res = client.table('listings_rent').select('id, address_full, status_raw, created_at').order('created_at', desc=True).limit(5).execute()
    for r in sample_res.data:
        print(r)

if __name__ == "__main__":
    check_db()
