# app/services/repositories/__init__.py

import os
from typing import Optional, Any
from app.config import AppConfig
from flask import current_app, has_app_context
from app.services.repositories.base import CustomerRepository, BriefingRepository, RecommendationRepository, UserRepository, UserSheetRepository, SheetRegistryRepository
from app.services.repositories.file.customer_repository import FileCustomerRepository
from app.services.repositories.supabase.customer_repository import SupabaseCustomerRepository
from app.services.repositories.file.briefing_repository import FileBriefingRepository
from app.services.repositories.supabase.briefing_repository import SupabaseBriefingRepository
from app.services.repositories.file.recommendation_repository import FileRecommendationRepository
from app.services.repositories.supabase.recommendation_repository import SupabaseRecommendationRepository
from app.services.repositories.file.user_repository import FileUserRepository
from app.services.repositories.supabase.user_repository import SupabaseUserRepository

from app.services.repositories.file.sheet_repository import FileUserSheetRepository, FileSheetRegistryRepository
from app.services.repositories.supabase.sheet_repository import SupabaseUserSheetRepository, SupabaseSheetRegistryRepository

_supabase_client = None

def _get_supabase_client() -> Optional[Any]:
    """Supabase 클라이언트 싱글톤 반환 (환경 변수 처리 포함)"""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
        
    use_supabase = os.getenv('USE_SUPABASE_USERS', 'false').strip().lower() in ('true', '1')
    if not use_supabase:
        return None
        
    try:
        from supabase import create_client
        supabase_url = os.environ.get("SUPABASE_URL", "").strip()
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        
        if supabase_url and supabase_key:
            if has_app_context() and current_app:
                current_app.logger.info(f"🔄 Creating Supabase client (URL prefix: {str(supabase_url)[:15]}...)")
            _supabase_client = create_client(supabase_url, supabase_key)
            return _supabase_client
        else:
            if has_app_context() and current_app:
                current_app.logger.warning(f"⚠️ Supabase env vars missing: URL={bool(supabase_url)}, KEY={bool(supabase_key)}")
    except Exception as e:
        if has_app_context() and current_app:
            current_app.logger.error(f"❌ Supabase client creation failed: {e}", exc_info=True)
    return None

def get_user_repository() -> UserRepository:
    client = _get_supabase_client()
    if client:
        try:
            return SupabaseUserRepository(client)
        except Exception as e:
            if has_app_context() and current_app:
                current_app.logger.error(f"SupabaseUserRepository 초기화 실패: {e}")
    
    return FileUserRepository(data_dir=AppConfig.DATA_DIR)

def get_customer_repository() -> CustomerRepository:
    client = _get_supabase_client()
    if client:
        return SupabaseCustomerRepository(client)
    return FileCustomerRepository(data_dir=AppConfig.DATA_DIR)

def get_briefing_repository() -> BriefingRepository:
    client = _get_supabase_client()
    if client:
        return SupabaseBriefingRepository(client)
    return FileBriefingRepository(data_dir=AppConfig.DATA_DIR)

def get_recommendation_repository(data_dir: str = "./data") -> RecommendationRepository:
    client = _get_supabase_client()
    if client:
        return SupabaseRecommendationRepository(client)
    return FileRecommendationRepository(data_dir=AppConfig.DATA_DIR)

def get_user_sheet_repository() -> UserSheetRepository:
    client = _get_supabase_client()
    if client:
        return SupabaseUserSheetRepository(client)
    return FileUserSheetRepository(data_store_path=os.path.join(AppConfig.DATA_DIR, "user_sheets.json"))

def get_sheet_registry_repository() -> SheetRegistryRepository:
    client = _get_supabase_client()
    if client:
        return SupabaseSheetRegistryRepository(client)
    return FileSheetRegistryRepository(data_store_path=os.path.join(AppConfig.DATA_DIR, "sheet_registry.json"))

