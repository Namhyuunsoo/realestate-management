# utils.py
# app/core/utils.py

import re

def to_int_or_none(val: str):
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s.lower() in ("협의", "x", "-", "n/a"):
        return None
    digits = re.sub(r"[^\d]", "", s)
    if digits == "":
        return None
    try:
        return int(digits)
    except:
        return None
