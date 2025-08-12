#!/usr/bin/env python3
"""
비밀번호 마이그레이션 테스트 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.user import User
from werkzeug.security import generate_password_hash, check_password_hash
import hashlib

def test_password_migration():
    """비밀번호 마이그레이션 테스트"""
    print("🔍 비밀번호 마이그레이션 테스트 시작")
    
    # 테스트 비밀번호
    test_password = "test123"
    
    # 1. 기존 SHA-256 해시 생성
    old_hash = hashlib.sha256(test_password.encode('utf-8')).hexdigest()
    print(f"기존 SHA-256 해시: {old_hash}")
    
    # 2. 새로운 Werkzeug 해시 생성
    new_hash = generate_password_hash(test_password)
    print(f"새로운 Werkzeug 해시: {new_hash}")
    
    # 3. 기존 해시 형식의 사용자 생성
    old_user = User(
        id="test_user",
        email="test@example.com",
        password_hash=old_hash,
        name="테스트 사용자"
    )
    
    # 4. 비밀번호 확인 테스트 (마이그레이션 발생)
    print("\n🔍 기존 해시로 비밀번호 확인 테스트")
    result = old_user.check_password(test_password)
    print(f"비밀번호 확인 결과: {result}")
    
    # 5. 마이그레이션 후 해시 확인
    print(f"마이그레이션 후 해시: {old_user.password_hash}")
    print(f"Werkzeug 해시와 일치: {old_user.password_hash == new_hash}")
    
    # 6. 새로운 해시로 다시 확인 (새로운 사용자 객체 생성)
    print("\n🔍 새로운 해시로 비밀번호 확인 테스트")
    new_user = User(
        id="test_user2",
        email="test2@example.com",
        password_hash=old_user.password_hash,  # 마이그레이션된 해시 사용
        name="테스트 사용자 2"
    )
    result2 = new_user.check_password(test_password)
    print(f"비밀번호 확인 결과: {result2}")
    
    print("\n✅ 비밀번호 마이그레이션 테스트 완료")

if __name__ == "__main__":
    test_password_migration()
