#!/usr/bin/env python3
"""
보안 기능 테스트 스크립트
"""

import requests
import time
import json

# 테스트 설정
BASE_URL = "http://localhost:5000"
TEST_USER = "test@example.com"
ADMIN_USER = "admin@example.com"

def test_rate_limit():
    """요청 빈도 제한 테스트"""
    print("🔍 요청 빈도 제한 테스트...")
    
    # 빠른 요청 연속 전송
    for i in range(105):
        response = requests.get(f"{BASE_URL}/api/health", headers={"X-User": TEST_USER})
        if response.status_code == 429:
            print(f"✅ 요청 빈도 제한 작동: {i+1}번째 요청에서 차단됨")
            return True
        time.sleep(0.01)
    
    print("❌ 요청 빈도 제한이 작동하지 않음")
    return False

def test_ip_blocking():
    """IP 차단 테스트"""
    print("🔍 IP 차단 테스트...")
    
    # 로그인 실패 시뮬레이션
    for i in range(6):
        response = requests.post(f"{BASE_URL}/auth/naver/login", 
                               headers={"X-User": "invalid@example.com"})
        if response.status_code == 401:
            print(f"로그인 실패 {i+1}/5")
    
    # 차단된 IP로 요청 시도
    response = requests.get(f"{BASE_URL}/api/health", headers={"X-User": TEST_USER})
    if response.status_code == 403:
        print("✅ IP 차단 기능 작동")
        return True
    else:
        print("❌ IP 차단 기능이 작동하지 않음")
        return False

def test_xss_protection():
    """XSS 방지 테스트"""
    print("🔍 XSS 방지 테스트...")
    
    # XSS 패턴이 포함된 데이터 전송
    xss_data = {
        "name": "<script>alert('xss')</script>",
        "description": "javascript:alert('xss')"
    }
    
    response = requests.post(f"{BASE_URL}/api/customers", 
                           headers={"X-User": TEST_USER, "Content-Type": "application/json"},
                           json=xss_data)
    
    if response.status_code == 400:
        print("✅ XSS 방지 기능 작동")
        return True
    else:
        print("❌ XSS 방지 기능이 작동하지 않음")
        return False

def test_authentication():
    """인증 테스트"""
    print("🔍 인증 테스트...")
    
    # 인증 없이 요청
    response = requests.get(f"{BASE_URL}/api/customers")
    if response.status_code == 401:
        print("✅ 인증 요구 기능 작동")
        return True
    else:
        print("❌ 인증 요구 기능이 작동하지 않음")
        return False

def test_admin_access():
    """관리자 권한 테스트"""
    print("🔍 관리자 권한 테스트...")
    
    # 일반 사용자로 관리자 기능 접근 시도
    response = requests.get(f"{BASE_URL}/api/security/status", 
                           headers={"X-User": TEST_USER})
    if response.status_code == 403:
        print("✅ 관리자 권한 제어 작동")
        return True
    else:
        print("❌ 관리자 권한 제어가 작동하지 않음")
        return False

def test_security_endpoints():
    """보안 엔드포인트 테스트"""
    print("🔍 보안 엔드포인트 테스트...")
    
    # 관리자로 보안 상태 조회
    response = requests.get(f"{BASE_URL}/api/security/status", 
                           headers={"X-User": ADMIN_USER})
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 보안 상태 조회 성공: {data}")
        return True
    else:
        print(f"❌ 보안 상태 조회 실패: {response.status_code}")
        return False

def main():
    """메인 테스트 함수"""
    print("🚀 보안 기능 테스트 시작...")
    print("=" * 50)
    
    tests = [
        ("인증 테스트", test_authentication),
        ("요청 빈도 제한 테스트", test_rate_limit),
        ("IP 차단 테스트", test_ip_blocking),
        ("XSS 방지 테스트", test_xss_protection),
        ("관리자 권한 테스트", test_admin_access),
        ("보안 엔드포인트 테스트", test_security_endpoints),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} 실패: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("📊 테스트 결과:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ 통과" if result else "❌ 실패"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n총 {len(results)}개 테스트 중 {passed}개 통과")
    
    if passed == len(results):
        print("🎉 모든 보안 기능이 정상 작동합니다!")
    else:
        print("⚠️ 일부 보안 기능에 문제가 있습니다.")

if __name__ == "__main__":
    main() 