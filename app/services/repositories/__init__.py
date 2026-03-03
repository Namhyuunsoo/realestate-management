# app/services/repositories/__init__.py

import os
from typing import Optional
from flask import current_app
from app.services.repositories.base import CustomerRepository, BriefingRepository, RecommendationRepository
from app.services.repositories.file.customer_repository import FileCustomerRepository
from app.services.repositories.supabase.customer_repository import SupabaseCustomerRepository
from app.services.repositories.file.briefing_repository import FileBriefingRepository
from app.services.repositories.supabase.briefing_repository import SupabaseBriefingRepository
from app.services.repositories.file.recommendation_repository import FileRecommendationRepository
from app.services.repositories.supabase.recommendation_repository import SupabaseRecommendationRepository

def get_customer_repository() -> CustomerRepository:
    """
    환경변수에 따라 적절한 Customer Repository 반환

    USE_SUPABASE_CUSTOMERS 환경변수:
    - 'true' 또는 '1': Supabase Repository 사용
    - 그 외: File Repository 사용 (기본값)
    """
    use_supabase = os.getenv('USE_SUPABASE_CUSTOMERS', 'false').lower() in ('true', '1')

    if use_supabase:
        try:
            if current_app:
                current_app.logger.info("🔄 SupabaseCustomerRepository 초기화 시도...")
            repo = SupabaseCustomerRepository()
            if current_app:
                current_app.logger.info("✅ SupabaseCustomerRepository 초기화 성공")
            return repo
        except Exception as e:
            # Supabase 연결 실패 시 File Repository로 폴백
            if current_app:
                current_app.logger.error(f"❌ Supabase 연결 실패, File Repository로 폴백: {e}", exc_info=True)
            return FileCustomerRepository()

    if current_app:
        current_app.logger.info("📁 FileCustomerRepository 사용 (USE_SUPABASE_CUSTOMERS=false)")
    return FileCustomerRepository()

def get_briefing_repository() -> BriefingRepository:
    """
    환경변수에 따라 적절한 Briefing Repository 반환
    
    USE_SUPABASE_BRIEFINGS 환경변수:
    - 'true' 또는 '1': Supabase Repository 사용
    - 그 외: File Repository 사용 (기본값)
    """
    use_supabase = os.getenv('USE_SUPABASE_BRIEFINGS', 'false').lower() in ('true', '1')
    
    if use_supabase:
        try:
            return SupabaseBriefingRepository()
        except Exception as e:
            # Supabase 연결 실패 시 File Repository로 폴백
            if current_app:
                current_app.logger.warning(f"Supabase 연결 실패, File Repository 사용: {e}")
            return FileBriefingRepository()
    
    return FileBriefingRepository()

def get_recommendation_repository(data_dir: str = "./data") -> RecommendationRepository:
    """
    환경변수에 따라 적절한 Recommendation Repository 반환
    
    USE_SUPABASE_RECOMMENDATIONS 환경변수:
    - 'true' 또는 '1': Supabase Repository 사용
    - 그 외: File Repository 사용 (기본값)
    """
    use_supabase = os.getenv('USE_SUPABASE_RECOMMENDATIONS', 'false').lower() in ('true', '1')
    
    if use_supabase:
        try:
            return SupabaseRecommendationRepository()
        except Exception as e:
            # Supabase 연결 실패 시 File Repository로 폴백
            if current_app:
                current_app.logger.warning(f"Supabase 연결 실패, File Repository 사용: {e}")
            return FileRecommendationRepository(data_dir)
    
    return FileRecommendationRepository(data_dir)
