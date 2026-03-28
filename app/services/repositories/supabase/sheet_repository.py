from typing import List, Dict, Any, Optional
from flask import current_app, has_app_context
from supabase import Client
from ..base import UserSheetRepository, SheetRegistryRepository

class SupabaseUserSheetRepository(UserSheetRepository):
    """Supabase 기반 사용자 시트(public.user_sheets) 저장소"""
    
    def __init__(self, supabase_client: Client):
        self.client = supabase_client
        self.table_name = "user_sheets"
        
    def get_all_sheets(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.table(self.table_name).select("*").execute()
            return res.data
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase get_all_sheets error: {e}")
            return []
            
    def get_sheet_by_id(self, sheet_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.client.table(self.table_name).select("*").eq("id", sheet_id).execute()
            if res.data:
                return res.data[0]
            return None
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase get_sheet_by_id error ({sheet_id}): {e}")
            return None
            
    def save_sheet(self, sheet_data: Dict[str, Any]) -> bool:
        try:
            # upsert를 위한 Dict 처리 (id가 필수이므로 충돌 방지됨)
            self.client.table(self.table_name).upsert(sheet_data).execute()
            return True
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase save_sheet error: {e}")
            return False
            
    def delete_sheet(self, sheet_id: str) -> bool:
        try:
            self.client.table(self.table_name).delete().eq("id", sheet_id).execute()
            return True
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase delete_sheet error ({sheet_id}): {e}")
            return False

class SupabaseSheetRegistryRepository(SheetRegistryRepository):
    """Supabase 기반 시트 레지스트리(public.sheet_registry) 저장소"""
    
    def __init__(self, supabase_client: Client):
        self.client = supabase_client
        self.table_name = "sheet_registry"
        
    def get_all_slots(self) -> List[Dict[str, Any]]:
        try:
            print(f"DEBUG: Fetching slots from Supabase table: {self.table_name}")
            # user_id가 UUID로 외래키 잡혀있음
            res = self.client.table(self.table_name).select("*").order("slot_id").execute()
            print(f"DEBUG: Fetched {len(res.data) if res.data else 0} slots from table")
            return res.data
        except Exception as e:
            print(f"DEBUG: Supabase get_all_slots error: {e}")
            if has_app_context() and current_app: current_app.logger.error(f"Supabase get_all_slots error: {e}")
            return []
            
    def save_slots(self, slots_data: List[Dict[str, Any]]) -> bool:
        try:
            # slot_id 기준으로 덮어쓰기
            self.client.table(self.table_name).upsert(slots_data).execute()
            return True
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase save_slots error: {e}")
            return False

    def get_slots_by_user_id(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.client.table(self.table_name).select("*").eq("user_id", user_id).execute()
            return res.data
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Supabase get_slots_by_user_id error ({user_id}): {e}")
            return []
