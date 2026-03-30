import logging
logging.disable(logging.CRITICAL)
from app.services.housing_sheet_to_supabase_sync import get_google_sheets_client, HOUSING_SHEET_ID, row_to_listing_housing
from collections import defaultdict

try:
    gc = get_google_sheets_client()
    sp = gc.open_by_key(HOUSING_SHEET_ID)
    ws = sp.worksheet('주택임대차')
    values = ws.get_all_values()
    header_row = [h.strip() for h in values[0]]
    data_rows = values[1:]

    uuid_rows = defaultdict(list)
    for idx, row in enumerate(data_rows, start=2):
        rec = row_to_listing_housing('주택임대차', idx, header_row, row)
        if rec and 'id' in rec:
            uuid_rows[rec['id']].append({
                'row': idx,
                'addr': rec['address_full'],
                'date': rec['fields'].get('접수일', '')
            })

    dups = {uid: rows for uid, rows in uuid_rows.items() if len(rows) > 1}
    print(f"중복 UUID 총 {len(dups)}개")
    for uid, rows in dups.items():
        print(f"\n중복 UUID: {uid}")
        for r in rows:
            batch_num = (r['row'] - 2) // 500
            print(f"  행{r['row']} | 접수일:{r['date']} | 주소:{r['addr']} | -> 배치{batch_num}")

except Exception as e:
    print(f"에러 발생: {e}")
