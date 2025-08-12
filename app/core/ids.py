# ids.py
# app/core/ids.py

import time
import random
import string

def listing_id_from_row(idx: int) -> str:
    return f"lst_{idx:06d}"

def generate_id(prefix: str = "id") -> str:
    """고유 ID 생성"""
    timestamp = int(time.time() * 1000)
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{prefix}_{timestamp}_{random_suffix}"
