# app/services/repositories/file/customer_repository.py

from typing import List, Dict, Optional, Any
from app.models.user import User
from app.services.repositories.base import CustomerRepository
from app.services import store

class FileCustomerRepository(CustomerRepository):
    """파일 기반 고객 저장소 (기존 store.py 래핑)"""
    
    def create_customer(self, user_email: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """고객 생성"""
        return store.create_customer(user_email, payload)
    
    def list_customers(self, user: User, filter_type: str = 'own', manager: str = '') -> List[Dict[str, Any]]:
        """고객 목록 조회"""
        return store.list_customers(user.email, filter_type, manager)
    
    def get_customer(self, customer_id: str, user_email: str) -> Optional[Dict[str, Any]]:
        """고객 조회"""
        return store.get_customer(customer_id, user_email)
    
    def update_customer(self, customer_id: str, updates: Dict[str, Any], user_email: str) -> Optional[Dict[str, Any]]:
        """고객 수정"""
        return store.update_customer(customer_id, updates, user_email)
    
    def delete_customer(self, customer_id: str, user_email: str) -> bool:
        """고객 삭제"""
        return store.delete_customer(customer_id, user_email)
