import sys
import os
import time
from typing import Dict, Any, Optional

# Mocking parts of the environment
class MockUser:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
    @classmethod
    def from_dict(cls, data):
        import time
        from datetime import datetime
        
        def parse_timestamp(val: Any) -> Optional[float]:
            if val is None: return None
            if isinstance(val, (int, float)): return float(val)
            if isinstance(val, str):
                try:
                    clean_val = val.replace('Z', '+00:00')
                    dt = datetime.fromisoformat(clean_val)
                    return dt.timestamp()
                except Exception as e:
                    print(f"ISO parse failed for {val}: {e}")
                    try:
                        return float(val)
                    except Exception as e2:
                        print(f"Float parse failed for {val}: {e2}")
                        return time.time()
            return time.time()

        return MockUser(
            id=data["id"],
            email=data["email"],
            name=data["name"],
            created_at=parse_timestamp(data.get("created_at")),
            last_login=parse_timestamp(data.get("last_login")),
            locked_until=parse_timestamp(data.get("locked_until"))
        )

# Sample data from Supabase
data = {
    'id': '8d65317d-76c5-42c3-8550-b06fe8fe2d7a', 
    'email': 'darkbirth@naver.com', 
    'name': '관리자',
    'created_at': '2025-08-06T12:31:41+00:00',
    'last_login': '2026-02-25T08:17:42+00:00',
    'locked_until': None
}

try:
    user = MockUser.from_dict(data)
    print("User created successfully")
    print(f"ID: {user.id}")
    print(f"Created At: {user.created_at}")
    print(f"Last Login: {user.last_login}")
    print(f"Locked Until: {user.locked_until}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
