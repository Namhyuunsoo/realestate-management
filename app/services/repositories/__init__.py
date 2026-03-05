# app/services/repositories/__init__.py

import os
from typing import Optional
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

def get_user_repository() -> UserRepository:
    """
    환경변수에 따라 적절한 User Repository 반환
    USE_SUPABASE_USERS 환경변수:
    - 'true' 또는 '1': Supabase Repository 사용
    - 그 외: File Repository 사용 (기본값)
    """
    use_supabase = os.getenv('USE_SUPABASE_USERS', 'false').strip().lower() in ('true', '1')

    if use_supabase:
        try:
            if has_app_context() and current_app:
                current_app.logger.info("🔄 SupabaseUserRepository 초기화 시도...")
            repo = SupabaseUserRepository()
            if has_app_context() and current_app:
                current_app.logger.info("✅ SupabaseUserRepository 초기화 성공")
            return repo
        except Exception as e:
            if has_app_context() and current_app:
                current_app.logger.error(f"❌ Supabase 연결 실패, File Repository로 폴백: {e}", exc_info=True)
            return FileUserRepository(data_dir=AppConfig.DATA_DIR)

    if has_app_context() and current_app:
        current_app.logger.info("📁 FileUserRepository 사용 (USE_SUPABASE_USERS=false)")
    return FileUserRepository(data_dir=AppConfig.DATA_DIR)

def get_customer_repository() -> CustomerRepository:
    """
    환경변수에 따라 적절한 Customer Repository 반환

    USE_SUPABASE_CUSTOMERS 환경변수:
    - 'true' 또는 '1': Supabase Repository 사용
    - 그 외: File Repository 사용 (기본값)
    """
    use_supabase = os.getenv('USE_SUPABASE_CUSTOMERS', 'false').strip().lower() in ('true', '1')

    if use_supabase:
        try:
            if has_app_context() and current_app:
                current_app.logger.info("🔄 SupabaseCustomerRepository 초기화 시도...")
            repo = SupabaseCustomerRepository()
            if has_app_context() and current_app:
                current_app.logger.info("✅ SupabaseCustomerRepository 초기화 성공")
            return repo
        except Exception as e:
            # Supabase 연결 실패 시 File Repository로 폴백
            if has_app_context() and current_app:
                current_app.logger.error(f"❌ Supabase 연결 실패, File Repository로 폴백: {e}", exc_info=True)
            return FileCustomerRepository(data_dir=AppConfig.DATA_DIR)

    if has_app_context() and current_app:
        current_app.logger.info("📁 FileCustomerRepository 사용 (USE_SUPABASE_CUSTOMERS=false)")
    return FileCustomerRepository(data_dir=AppConfig.DATA_DIR)

def get_briefing_repository() -> BriefingRepository:
    """
    환경변수에 따라 적절한 Briefing Repository 반환
    
    USE_SUPABASE_BRIEFINGS 환경변수:
    - 'true' 또는 '1': Supabase Repository 사용
    - 그 외: File Repository 사용 (기본값)
    """
    use_supabase = os.getenv('USE_SUPABASE_BRIEFINGS', 'false').strip().lower() in ('true', '1')
    
    if use_supabase:
        try:
            return SupabaseBriefingRepository()
        except Exception as e:
            # Supabase 연결 실패 시 File Repository로 폴백
            if has_app_context() and current_app:
                current_app.logger.warning(f"Supabase 연결 실패, File Repository 사용: {e}")
            return FileBriefingRepository(data_dir=AppConfig.DATA_DIR)
    
    return FileBriefingRepository(data_dir=AppConfig.DATA_DIR)

def get_recommendation_repository(data_dir: str = "./data") -> RecommendationRepository:
    """
    환경변수에 따라 적절한 Recommendation Repository 반환
    
    USE_SUPABASE_RECOMMENDATIONS 환경변수:
    - 'true' 또는 '1': Supabase Repository 사용
    - 그 외: File Repository 사용 (기본값)
    """
    use_supabase = os.getenv('USE_SUPABASE_RECOMMENDATIONS', 'false').strip().lower() in ('true', '1')
    
    if use_supabase:
        try:
            return SupabaseRecommendationRepository()
        except Exception as e:
            # Supabase 연결 실패 시 File Repository로 폴백
            if has_app_context() and current_app:
                current_app.logger.warning(f"Supabase 연결 실패, File Repository 사용: {e}")
            return FileRecommendationRepository(data_dir=AppConfig.DATA_DIR)
    
    return FileRecommendationRepository(data_dir=AppConfig.DATA_DIR)

def get_user_sheet_repository() -> UserSheetRepository:
    """
    환경변수에 따라 적절한 UserSheet Repository 반환
    USE_SUPABASE_USERS 환경변수 고려
    """
    use_supabase = os.getenv('USE_SUPABASE_USERS', 'false').strip().lower() in ('true', '1')
    
    if use_supabase:
        try:
            from supabase import create_client
            supabase_url = os.environ.get("SUPABASE_URL", "").strip()
            supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
            if supabase_url and supabase_key:
                client = create_client(supabase_url, supabase_key)
                return SupabaseUserSheetRepository(client)
        except Exception as e:
            if has_app_context() and current_app:
                current_app.logger.warning(f"Supabase 연결 실패(UserSheet), File Repository 사용: {e}")
            return FileUserSheetRepository(data_store_path=os.path.join(AppConfig.DATA_DIR, "user_sheets.json"))
            
    return FileUserSheetRepository(data_store_path=os.path.join(AppConfig.DATA_DIR, "user_sheets.json"))

def get_sheet_registry_repository() -> SheetRegistryRepository:
    """
    환경변수에 따라 적절한 SheetRegistry Repository 반환
    """
    use_supabase = os.getenv('USE_SUPABASE_USERS', 'false').strip().lower() in ('true', '1')
    
    if use_supabase:
        try:
            from supabase import create_client
            supabase_url = os.environ.get("SUPABASE_URL", "").strip()
            supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
            if supabase_url and supabase_key:
                print(f"DEBUG: Creating Supabase client with URL={supabase_url[:20]}...")
                client = create_client(supabase_url, supabase_key)
                print(f"DEBUG: Returning SupabaseSheetRegistryRepository")
                return SupabaseSheetRegistryRepository(client)
            else:
                print(f"DEBUG: Missing SUPABASE_URL or KEY (URL_LEN={len(supabase_url)}, KEY_LEN={len(supabase_key)})")
        except Exception as e:
            print(f"DEBUG: Supabase client creation failed: {e}")
            if has_app_context() and current_app:
                current_app.logger.warning(f"Supabase 연결 실패(SheetRegistry), File Repository 사용: {e}")
            return FileSheetRegistryRepository(data_store_path=os.path.join(AppConfig.DATA_DIR, "sheet_registry.json"))
            
    print(f"DEBUG: Returning FileSheetRegistryRepository (use_supabase={use_supabase})")
    return FileSheetRegistryRepository(data_store_path=os.path.join(AppConfig.DATA_DIR, "sheet_registry.json"))
