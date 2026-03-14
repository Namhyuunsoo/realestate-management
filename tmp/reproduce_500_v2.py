import os
import sys
import json
import logging
from flask import Flask

# 프로젝트 루트 경로 추가
sys.path.append(os.getcwd())

from app import create_app

# 전역 로깅 설정
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def test_api_reproduction():
    print("🚀 API reproduction test starting...")
    app = create_app()
    client = app.test_client()
    
    # 1. 테스트 유저 찾기
    with app.app_context():
        from app.services.repositories import get_user_repository
        users_repo = get_user_repository()
        
        # 관리자 이메일 가져오기
        target_email = "admin@example.com"
        admin_users_env = os.environ.get("ADMIN_USERS", "")
        if admin_users_env:
            try:
                if admin_users_env.startswith("["):
                    target_email = json.loads(admin_users_env.replace("'", '"'))[0]
                else:
                    target_email = admin_users_env.split(",")[0].strip()
            except Exception as e:
                print(f"Error parsing ADMIN_USERS: {e}")

        user = users_repo.get_user_by_email(target_email)
        
        if not user:
            print(f"⚠️ User {target_email} not found. Searching for any active user...")
            # Try to get first user from repository if it supports listing
            if hasattr(users_repo, 'list_users'):
                try:
                    all_users = users_repo.list_users()
                    if all_users:
                        user = all_users[0]
                except:
                    pass
            
            if not user:
                # Try file fallback check
                users_path = os.path.join(os.getcwd(), "data", "users.json")
                if os.path.exists(users_path):
                    try:
                        with open(users_path, 'r', encoding='utf-8') as f:
                            users_data = json.load(f)
                            if users_data:
                                first_id = list(users_data.keys())[0]
                                from app.models.user import User
                                user = User.from_dict(users_data[first_id])
                    except:
                        pass

        if not user:
            print("❌ Failure: No user found for testing. Please ensure at least one user exists in data/users.json or Supabase.")
            return

        print(f"✅ Found user: {user.email} (ID: {user.id})")

    # 2. GET /api/customers/
    print("\n--- [GET /api/customers/] ---")
    with client.session_transaction() as sess:
        sess['user_id'] = user.id
    
    response = client.get('/api/customers/')
    print(f"Status Code: {response.status_code}")
    try:
        data = response.get_json()
        if response.status_code == 500:
            print("❌ 500 Internal Server Error detected!")
            print(f"Error JSON: {json.dumps(data, indent=2, ensure_ascii=False)}")
            if 'traceback' in data:
                print("\nBackend Traceback:")
                print(data['traceback'])
        else:
            print(f"✅ Success (Items: {len(data.get('items', [])) if data else 0})")
    except Exception as e:
        print(f"Failed to parse response: {e}")
        print(f"Raw body: {response.data}")

    # 3. POST /api/customers/ (Registration)
    print("\n--- [POST /api/customers/] ---")
    payload = {
        "name": "테스트찻집",
        "phone": "010-9999-8888",
        "manager": "테스트",
        "regions": "인천 부평구",
        "floor": "1",
        "area": "15",
        "deposit": "1000",
        "rent": "50",
        "premium": "200",
        "notes": "Reproduction test automated entry"
    }
    
    response = client.post('/api/customers/', 
                           data=json.dumps(payload),
                           content_type='application/json')
    print(f"Status Code: {response.status_code}")
    try:
        data = response.get_json()
        if response.status_code == 500:
            print("❌ 500 Internal Server Error detected!")
            print(f"Error JSON: {json.dumps(data, indent=2, ensure_ascii=False)}")
            if 'traceback' in data:
                print("\nBackend Traceback:")
                print(data['traceback'])
        else:
            print(f"✅ Success (Created ID: {data.get('id')})")
    except Exception as e:
        print(f"Failed to parse response: {e}")
        print(f"Raw body: {response.data}")

if __name__ == "__main__":
    test_api_reproduction()
