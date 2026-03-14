# app/services/sheet_to_supabase_sync.py

import os
import json
import re
import uuid
from typing import List, Dict, Any, Optional
from flask import current_app, has_app_context
from dotenv import load_dotenv
from supabase import create_client, Client
import gspread
from google.oauth2.service_account import Credentials

# Load Environment Variables
load_dotenv()

# Table Mapping
SHEET_TO_TABLE = {
    '상가임대차': 'listings_rent',
    '구분상가매매': 'listings_sale_unit',
    '건물토지매매': 'listings_sale_land'
}

# ID Prefix
SHEET_PREFIX = {
    '상가임대차': 'r',
    '구분상가매매': 's',
    '건물토지매매': 'l'
}

def get_supabase_client() -> Client:
    """Create Supabase Client"""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    return create_client(supabase_url, supabase_key)

def get_google_sheets_client() -> gspread.Client:
    """Create Google Sheets API Client"""
    service_account_file = os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
    return gspread.service_account(filename=service_account_file)

def extract_sheet_id_from_url(sheet_url: str) -> Optional[str]:
    """Extract Sheet ID from URL"""
    try:
        pattern = r'/spreadsheets/d/([a-zA-Z0-9-_]+)'
        match = re.search(pattern, sheet_url)
        return match.group(1) if match else None
    except Exception:
        return None

def read_sheet_data(client: gspread.Client, sheet_id: str, sheet_name: str) -> Optional[gspread.Worksheet]:
    """Get Worksheet object"""
    try:
        spreadsheet = client.open_by_key(sheet_id)
        try:
            return spreadsheet.worksheet(sheet_name)
        except gspread.exceptions.WorksheetNotFound:
            for ws in spreadsheet.worksheets():
                if ws.title.strip() == sheet_name:
                    return ws
            return None
    except Exception:
        return None

def normalize_listing_data(row_idx: int, row: List[str], header_map: Dict[str, int], sheet_name: str, user_id: str = "", slot_id: str = "") -> Optional[Dict[str, Any]]:
    """Normalize data and handle UUID generation"""
    try:
        def get_value(col: str) -> str:
            if col in header_map:
                idx = header_map[col]
                if idx < len(row):
                    return str(row[idx]).strip()
            return ""
        
        # Check essential fields to filter instruction rows
        fields = {}
        has_essential = False
        essential_keys = ['접수일', '지역', '지번', '연락처']
        for col in header_map.keys():
            val = get_value(col)
            fields[col] = val
            if col in essential_keys and val:
                has_essential = True
        
        if not has_essential:
            return None

        # UUID Logic
        listing_uuid = fields.get("UUID", "").strip()
        is_new_uuid = False
        if not listing_uuid:
            listing_uuid = str(uuid.uuid4())
            is_new_uuid = True
            fields["UUID"] = listing_uuid
            
        region2 = get_value("지역2")
        region = get_value("지역")
        lot = get_value("지번")

        return {
            "id": listing_uuid,
            "is_new_uuid": is_new_uuid,
            "user_id": user_id,
            "slot_id": slot_id,
            "raw_row_index": row_idx,
            "status_raw": fields.get("현황", "").strip(),
            "address_full": f"{region2} {region} {lot}".strip() or None,
            "address_comp": {"region2": region2, "region": region, "lot": lot},
            "fields": fields,
            "coords": None,
            "geocoded": False
        }
    except Exception:
        return None

def sync_user_sheet_to_supabase(user_id: str, user_name: str, sheet_url: str, slot_id: str = None) -> Dict[str, Any]:
    """Sync user sheet to Supabase with UUID Write-back"""
    result = {"user_id": user_id, "user_name": user_name, "success": False, "total_listings": 0, "sheets_synced": [], "errors": []}
    
    try:
        sheet_id = extract_sheet_id_from_url(sheet_url)
        if not sheet_id: return result
        
        client = get_google_sheets_client()
        supabase = get_supabase_client()
        
        for sheet_name, table_name in SHEET_TO_TABLE.items():
            try:
                ws = read_sheet_data(client, sheet_id, sheet_name)
                if not ws: continue
                
                all_values = ws.get_all_values()
                if len(all_values) < 2: continue
                
                header_row = [h.strip() for h in all_values[0]]
                header_map = {h: i for i, h in enumerate(header_row) if h}
                
                # Check for UUID column
                uuid_col_idx = header_map.get("UUID")
                if uuid_col_idx is None:
                    uuid_col_idx = len(header_row)
                    if uuid_col_idx >= ws.col_count: ws.add_cols(1)
                    ws.update_cell(1, uuid_col_idx + 1, "UUID")
                    header_map["UUID"] = uuid_col_idx
                
                sheet_listings = []
                uuid_updates = []
                
                for idx, row in enumerate(all_values[1:], start=2):
                    listing = normalize_listing_data(idx, row, header_map, sheet_name, user_id, slot_id)
                    if listing:
                        if listing.get("is_new_uuid"):
                            uuid_updates.append({
                                'range': gspread.utils.rowcol_to_a1(idx, uuid_col_idx + 1),
                                'values': [[listing["id"]]]
                            })
                        
                        listing.pop("is_new_uuid", None)
                        listing["manager_name"] = user_name
                        sheet_listings.append(listing)
                
                if uuid_updates:
                    ws.batch_update(uuid_updates)
                
                if sheet_listings:
                    batch_size = 500
                    for i in range(0, len(sheet_listings), batch_size):
                        supabase.table(table_name).upsert(sheet_listings[i:i+batch_size], on_conflict='id').execute()
                    
                    result["sheets_synced"].append({"sheet": sheet_name, "count": len(sheet_listings)})
                    result["total_listings"] += len(sheet_listings)
                    
            except Exception as e:
                result["errors"].append(f"{sheet_name} Error: {str(e)}")
        
        result["success"] = True
    except Exception as e:
        result["errors"].append(f"Critical Error: {str(e)}")
        
    return result

def sync_all_slots_to_supabase() -> Dict[str, Any]:
    """Sync all slots registry to Supabase"""
    try:
        supabase = get_supabase_client()
        res = supabase.table("sheet_registry").select("*").eq("is_active", True).execute()
        slots = res.data
        
        if not slots: return {"success": False, "errors": ["No active slots"]}
        
        processed = 0
        total = 0
        for slot in slots:
            sid = str(slot.get("slot_id"))
            res = sync_user_sheet_to_supabase(slot.get("user_id") or f"slot_{sid}", slot.get("manager_name", "공석"), slot.get("sheet_url"), slot_id=sid)
            if res["success"]:
                processed += 1
                total += res["total_listings"]
        
        return {"success": True, "slots": processed, "total": total}
    except Exception as e:
        return {"success": False, "errors": [str(e)]}

if __name__ == "__main__":
    # Test Run
    print(json.dumps(sync_all_slots_to_supabase(), indent=2, ensure_ascii=False))
