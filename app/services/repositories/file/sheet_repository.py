import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from flask import current_app, has_app_context
from ..base import UserSheetRepository, SheetRegistryRepository

class FileUserSheetRepository(UserSheetRepository):
    """파일 기반 사용자 시트(user_sheets.json) 저장소"""
    
    def __init__(self, data_store_path: str = "./data/user_sheets.json"):
        self.data_store_path = data_store_path
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        if not os.path.exists(self.data_store_path):
            os.makedirs(os.path.dirname(self.data_store_path), exist_ok=True)
            self._write_data({'sheets': [], 'updated_at': datetime.now().isoformat()})

    def _read_data(self) -> Dict[str, Any]:
        try:
            with open(self.data_store_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Error reading {self.data_store_path}: {e}")
            return {'sheets': [], 'updated_at': datetime.now().isoformat()}

    def _write_data(self, data: Dict[str, Any]) -> bool:
        try:
            data['updated_at'] = datetime.now().isoformat()
            with open(self.data_store_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
            return True
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Error writing {self.data_store_path}: {e}")
            return False

    def get_all_sheets(self) -> List[Dict[str, Any]]:
        return self._read_data().get('sheets', [])
        
    def get_sheet_by_id(self, sheet_id: str) -> Optional[Dict[str, Any]]:
        sheets = self.get_all_sheets()
        for sheet in sheets:
            if sheet.get('id') == sheet_id:
                return sheet
        return None
        
    def save_sheet(self, sheet_data: Dict[str, Any]) -> bool:
        data = self._read_data()
        sheets = data.get('sheets', [])
        
        updated = False
        for i, sheet in enumerate(sheets):
            if sheet.get('id') == sheet_data.get('id'):
                sheets[i] = sheet_data
                updated = True
                break
                
        if not updated:
            sheets.append(sheet_data)
            
        data['sheets'] = sheets
        return self._write_data(data)
        
    def delete_sheet(self, sheet_id: str) -> bool:
        data = self._read_data()
        sheets = data.get('sheets', [])
        
        initial_length = len(sheets)
        sheets = [s for s in sheets if s.get('id') != sheet_id]
        
        if len(sheets) < initial_length:
            data['sheets'] = sheets
            return self._write_data(data)
        return False

class FileSheetRegistryRepository(SheetRegistryRepository):
    """파일 기반 시트 레지스트리(sheet_registry.json) 저장소"""
    
    def __init__(self, data_store_path: str = "./data/sheet_registry.json"):
        self.data_store_path = data_store_path
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        if not os.path.exists(self.data_store_path):
            os.makedirs(os.path.dirname(self.data_store_path), exist_ok=True)
            self._write_data({'slots': []})

    def _read_data(self) -> Dict[str, Any]:
        try:
            with open(self.data_store_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Error reading {self.data_store_path}: {e}")
            return {'slots': []}

    def _write_data(self, data: Dict[str, Any]) -> bool:
        try:
            with open(self.data_store_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            return True
        except Exception as e:
            if has_app_context() and current_app: current_app.logger.error(f"Error writing {self.data_store_path}: {e}")
            return False

    def get_all_slots(self) -> List[Dict[str, Any]]:
        return self._read_data().get('slots', [])
        
    def save_slots(self, slots_data: List[Dict[str, Any]]) -> bool:
        # 파일 기반은 통째로 덮어쓰기
        return self._write_data({'slots': slots_data})

    def set_listing_tag(self, briefing_id: str, listing_id: str, tag: str) -> Optional[Dict[str, Any]]:
        pass
        
    def clear_listing_tag(self, briefing_id: str, listing_id: str) -> Optional[Dict[str, Any]]:
        pass
