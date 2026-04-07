# tmp/test_permission_logic.py
import json
from dataclasses import dataclass
from typing import List

@dataclass
class MockUser:
    role: str
    id: str
    
    def is_admin(self):
        return self.role == "admin"
    
    def is_manager(self):
        return self.role == "manager"

def check_permission(user, slot_id, assigned_slots):
    # Current backend logic
    if not user.is_admin():
        # Check if slot_id is in assigned_slots
        if str(slot_id) not in [str(s) for s in assigned_slots]:
            return False, "담당 매물이 아닙니다."
    return True, "Success"

# Test cases
test_cases = [
    {"user_role": "admin", "slot_id": "1", "assigned": ["2", "3"], "expected": True, "desc": "Admin should access everything"},
    {"user_role": "manager", "slot_id": "1", "assigned": ["1", "3"], "expected": True, "desc": "Manager should access their assigned slot"},
    {"user_role": "manager", "slot_id": "5", "assigned": ["1", "3"], "expected": False, "desc": "Manager should NOT access other slots"},
    {"user_role": "user", "slot_id": "1", "assigned": ["1"], "expected": True, "desc": "User with slot should access"},
    {"user_role": "user", "slot_id": "2", "assigned": ["1"], "expected": False, "desc": "User without slot should NOT access"},
]

print("--- Permission Logic Test ---")
for tc in test_cases:
    user = MockUser(tc["user_role"], "test_id")
    result, msg = check_permission(user, tc["slot_id"], tc["assigned"])
    status = "PASS" if result == tc["expected"] else "FAIL"
    print(f"[{status}] {tc['desc']}: Result={result}, Msg='{msg}'")
