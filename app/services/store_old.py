# app/services/store.py
from typing import Dict, List
import time
import itertools

# 간단한 증가 id
_customer_seq = itertools.count(1)
_briefing_seq = itertools.count(1)

# 인메모리 저장
CUSTOMERS: Dict[str, dict] = {}
BRIEFINGS: Dict[str, dict] = {}
# 브리핑: {id, user, customer_id, listing_ids, overrides{}, tags{} }

def make_customer_id():
    return f"cus_{next(_customer_seq):06d}"

def make_briefing_id():
    return f"brf_{next(_briefing_seq):06d}"

def create_customer(user_email: str, payload: dict) -> dict:
    cid = make_customer_id()
    data = {
        "id": cid,
        "user": user_email,
        "name": payload.get("name",""),
        "phone": payload.get("phone",""),
        "region": payload.get("region",""),
        "created_at": int(time.time())
    }
    CUSTOMERS[cid] = data
    return data

def list_customers(user_email: str, is_admin=False):
    if is_admin:
        return list(CUSTOMERS.values())
    return [c for c in CUSTOMERS.values() if c["user"] == user_email]

def get_customer(cid: str):
    return CUSTOMERS.get(cid)

def create_briefing(user_email: str, customer_id: str, listing_ids: List[str]) -> dict:
    bid = make_briefing_id()
    data = {
        "id": bid,
        "user": user_email,
        "customer_id": customer_id,
        "listing_ids": listing_ids,
        "overrides": {},  # {listing_id: {필드명: 값}}
        "tags": {},       # {listing_id: tagValue}
        "created_at": int(time.time())
    }
    BRIEFINGS[bid] = data
    return data

def list_briefings(user_email: str, is_admin=False):
    if is_admin:
        return list(BRIEFINGS.values())
    return [b for b in BRIEFINGS.values() if b["user"] == user_email]

def get_briefing(bid: str):
    return BRIEFINGS.get(bid)

def set_listing_override(bid: str, listing_id: str, field: str, value: str):
    b = BRIEFINGS.get(bid)
    if not b:
        return None
    b["overrides"].setdefault(listing_id, {})[field] = value
    return b

def set_listing_tag(bid: str, listing_id: str, tag: str):
    b = BRIEFINGS.get(bid)
    if not b:
        return None
    b["tags"][listing_id] = tag
    return b
