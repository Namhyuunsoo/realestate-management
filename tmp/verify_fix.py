import os
import sys

# 프로젝트 루트를 경로에 추가
sys.path.append(os.getcwd())

# 환경 변수 강제 설정 (테스트용)
os.environ['USE_SUPABASE_USERS'] = 'true'
os.environ['USE_SUPABASE_CUSTOMERS'] = 'true'

from app.services.repositories import (
    get_user_repository, 
    get_customer_repository, 
    get_briefing_repository, 
    get_recommendation_repository
)

def test_factories():
    print("--- 팩토리 함수 테스트 시작 ---")
    try:
        user_repo = get_user_repository()
        print(f"✅ User Repository 생성 성공: {type(user_repo)}")
        
        customer_repo = get_customer_repository()
        print(f"✅ Customer Repository 생성 성공: {type(customer_repo)}")
        
        briefing_repo = get_briefing_repository()
        print(f"✅ Briefing Repository 생성 성공: {type(briefing_repo)}")
        
        recommendation_repo = get_recommendation_repository()
        print(f"✅ Recommendation Repository 생성 성공: {type(recommendation_repo)}")
        
        print("\n--- 모든 팩토리 함수 에러 없이 작동함 ---")
    except TypeError as e:
        print(f"❌ TypeError 발생: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 기타 에러 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_factories()
