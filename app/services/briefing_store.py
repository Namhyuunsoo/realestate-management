# app/services/briefing_store.py
import json, uuid, os, threading, time
from typing import Dict, Any, List, Optional

_LOCK = threading.Lock()
BASE_DIR = os.path.join(os.getcwd(), "data", "state")
os.makedirs(BASE_DIR, exist_ok=True)
BRIEF_FILE = os.path.join(BASE_DIR, "briefings.json")

def _now(): return int(time.time())

def _load() -> Dict[str, Any]:
    if not os.path.exists(BRIEF_FILE):
        return {"items": []}
    with open(BRIEF_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except:
            return {"items": []}

def _save(data: Dict[str, Any]):
    with open(BRIEF_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def list_briefings(owner: str, is_admin: bool, customer_id: Optional[str]=None) -> List[Dict[str, Any]]:
    data = _load()
    res = data["items"]
    if customer_id:
        res = [b for b in res if b["customer_id"] == customer_id]
    if is_admin:
        return res
    return [b for b in res if b["created_by"] == owner]

def create_briefing(customer_id: str, listing_ids: List[str], owner: str) -> Dict[str, Any]:
    with _LOCK:
        data = _load()
        item = {
            "id": "brf_" + uuid.uuid4().hex[:10],
            "customer_id": customer_id,
            "created_by": owner,
            "created_at": _now(),
            "updated_at": _now(),
            "items": [
                {
                    "listing_id": lid,
                    "tag": None,         # 컬러태그 (ex: red / green / blue ...)
                    "overrides": {}      # 필드별 override {"deposit": "조정가능", ...}
                } for lid in listing_ids
            ]
        }
        data["items"].append(item)
        _save(data)
        return item

def get_briefing(bid: str) -> Optional[Dict[str, Any]]:
    data = _load()
    for b in data["items"]:
        if b["id"] == bid:
            return b
    return None

def update_briefing(bid: str, requester: str, is_admin: bool, modify_fn):
    with _LOCK:
        data = _load()
        for b in data["items"]:
            if b["id"] == bid:
                if not is_admin and b["created_by"] != requester:
                    return None
                modify_fn(b)
                b["updated_at"] = _now()
                _save(data)
                return b
    return None

def add_listing(bid: str, listing_id: str, requester: str, is_admin: bool):
    def _m(b):
        if listing_id not in [i["listing_id"] for i in b["items"]]:
            b["items"].append({"listing_id": listing_id, "tag": None, "overrides": {}})
    return update_briefing(bid, requester, is_admin, _m)

def remove_listing(bid: str, listing_id: str, requester: str, is_admin: bool):
    def _m(b):
        b["items"] = [i for i in b["items"] if i["listing_id"] != listing_id]
    return update_briefing(bid, requester, is_admin, _m)

def set_tag(bid: str, listing_id: str, tag: Optional[str], requester: str, is_admin: bool):
    def _m(b):
        for it in b["items"]:
            if it["listing_id"] == listing_id:
                it["tag"] = tag
    return update_briefing(bid, requester, is_admin, _m)

def set_override(bid: str, listing_id: str, field: str, value: Optional[str], requester: str, is_admin: bool):
    def _m(b):
        for it in b["items"]:
            if it["listing_id"] == listing_id:
                if value is None:
                    it["overrides"].pop(field, None)
                else:
                    it["overrides"][field] = value
    return update_briefing(bid, requester, is_admin, _m)
