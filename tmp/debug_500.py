import sys
import os

# 프로젝트 루트를 경로에 추가
sys.path.append(os.getcwd())

from app import create_app

def debug_api_endpoints():
    print("\n--- API 엔드포인트 디버깅 시작 ---")
    app = create_app()
    app.config['TESTING'] = True
    client = app.test_client()
    
    # 1. 고객 목록 조회 API 테스트
    print("\n[GET /api/customers/] 호출 시도...")
    response = client.get('/api/customers/')
    print(f"상태 코드: {response.status_code}")
    print(f"응답 데이터: {response.get_data(as_text=True)}")

    # 2. 고객 생성 API 테스트
    print("\n[POST /api/customers/] 호출 시도...")
    payload = {
        "name": "API 디버그 테스트",
        "phone": "010-9999-9999",
        "is_urgent": False,
        "memo": "API 테스트용"
    }
    response = client.post('/api/customers/', json=payload)
    print(f"상태 코드: {response.status_code}")
    print(f"응답 데이터: {response.get_data(as_text=True)}")

if __name__ == "__main__":
    debug_api_endpoints()
