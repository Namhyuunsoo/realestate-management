#!/usr/bin/env python3
"""
관리자 비밀번호 업데이트 스크립트
환경변수에 설정된 ADMIN_EMAIL과 ADMIN_PASSWORD로 비밀번호를 업데이트합니다.
"""

import json
import os
import hashlib
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

def hash_password(password):
    """비밀번호 해시화"""
    return hashlib.sha256(password.encode()).hexdigest()

def update_admin_password():
    """관리자 비밀번호 업데이트"""
    users_file = "data/users.json"
    
    if not os.path.exists(users_file):
        print("❌ 사용자 데이터 파일을 찾을 수 없습니다.")
        return
    
    # 환경변수에서 관리자 정보 읽기
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if not admin_email or not admin_password:
        print("❌ 환경변수 ADMIN_EMAIL 또는 ADMIN_PASSWORD가 설정되지 않았습니다.")
        return
    
    print(f"🔍 관리자 이메일: {admin_email}")
    print(f"🔍 새 비밀번호: {admin_password}")
    
    # 사용자 데이터 로드
    with open(users_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 관리자 계정 찾기
    admin_user = None
    for user in data.get("users", []):
        if user.get("email") == admin_email.lower():
            admin_user = user
            break
    
    if not admin_user:
        print(f"❌ 관리자 계정을 찾을 수 없습니다: {admin_email}")
        return
    
    # 비밀번호 해시 생성
    new_password_hash = hash_password(admin_password)
    
    # 기존 해시와 비교
    old_hash = admin_user.get("password_hash", "")
    if old_hash == new_password_hash:
        print("ℹ️ 비밀번호가 이미 올바르게 설정되어 있습니다.")
        return
    
    # 비밀번호 업데이트
    admin_user["password_hash"] = new_password_hash
    
    # 백업 파일 생성
    backup_file = users_file + ".password_backup"
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"📁 백업 파일 생성: {backup_file}")
    
    # 업데이트된 데이터 저장
    with open(users_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("✅ 관리자 비밀번호가 성공적으로 업데이트되었습니다!")
    print(f"   이메일: {admin_email}")
    print(f"   새 비밀번호: {admin_password}")

if __name__ == "__main__":
    update_admin_password()
