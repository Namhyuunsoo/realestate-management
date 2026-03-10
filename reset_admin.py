import json
from werkzeug.security import generate_password_hash
import sys
import os

# 현재 활성화된 데이터 파일 경로 (루트 디렉토리의 data 폴더)
data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
users_file = os.path.join(data_dir, 'users.json')

if not os.path.exists(users_file):
    print(f"오류: {users_file} 파일을 찾을 수 없습니다.")
    sys.exit(1)

# 사용자 정보 로드
try:
    with open(users_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        users = data.get('users', [])
except Exception as e:
    print(f"JSON 파싱 오류: {e}")
    sys.exit(1)

# 초기화할 이메일 및 새 비밀번호 설정
target_email = "darkbirth@naver.com"
new_password = "password"

user_found = False
for u in users:
    if u.get('email') == target_email:
        u['password'] = generate_password_hash(new_password)
        u['status'] = 'approved' # 승인 상태로 강제 변경
        u['invalid_login_attempts'] = 0 # 잠금 해제
        u['locked_until'] = None
        user_found = True
        print(f"성공: {target_email} 계정의 비밀번호를 '{new_password}' 로 초기화했습니다.")
        break

if not user_found:
    print(f"경고: {target_email} 계정을 찾을 수 없습니다. 새로운 관리자 계정을 생성합니다.")
    new_admin = {
        "id": "admin_reset",
        "email": target_email,
        "password": generate_password_hash(new_password),
        "name": "관리자",
        "role": "admin",
        "status": "approved",
        "invalid_login_attempts": 0,
        "locked_until": None,
        "created_at": "2024-03-10T00:00:00.000000",
        "last_login": None,
        "approved_at": "2024-03-10T00:00:00.000000"
    }
    users.append(new_admin)

# 파일 저장
try:
    data['users'] = users
    with open(users_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"데이터 파일 저장 완료: {users_file}")
except Exception as e:
    print(f"파일 쓰기 오류: {e}")
    sys.exit(1)
