# Gzip 압축 테스트 스크립트
import requests
import json

def test_compression():
    """Gzip 압축 기능 테스트"""
    print("🔍 Gzip 압축 기능 테스트 시작...")
    print("=" * 50)
    
    base_url = "http://localhost:5001"  # 개발환경 포트
    
    # 1. 압축 상태 확인
    print("1. 압축 상태 확인...")
    try:
        response = requests.get(f"{base_url}/api/compression/status")
        if response.status_code == 200:
            status = response.json()
            print(f"✅ 압축 활성화: {status.get('compression_enabled')}")
            print(f"✅ 압축 레벨: {status.get('compress_level')}")
            print(f"✅ 최소 압축 크기: {status.get('compress_min_size')} bytes")
        else:
            print(f"❌ 압축 상태 확인 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ 압축 상태 확인 오류: {e}")
    
    print()
    
    # 2. 매물 데이터 압축 테스트
    print("2. 매물 데이터 압축 테스트...")
    try:
        headers = {'Accept-Encoding': 'gzip'}
        response = requests.get(f"{base_url}/api/listings", headers=headers)
        
        if response.status_code == 200:
            # 압축 여부 확인
            content_encoding = response.headers.get('content-encoding', '')
            content_length = response.headers.get('content-length', '0')
            
            print(f"✅ 응답 상태: {response.status_code}")
            print(f"✅ 압축 방식: {content_encoding or '압축 없음'}")
            print(f"✅ 응답 크기: {content_length} bytes")
            
            if content_encoding == 'gzip':
                print("🎉 Gzip 압축이 정상적으로 작동하고 있습니다!")
            else:
                print("⚠️ Gzip 압축이 적용되지 않았습니다.")
        else:
            print(f"❌ 매물 데이터 요청 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ 매물 데이터 테스트 오류: {e}")
    
    print()
    
    # 3. 정적 파일 압축 테스트
    print("3. 정적 파일 압축 테스트...")
    try:
        headers = {'Accept-Encoding': 'gzip'}
        response = requests.get(f"{base_url}/static/css/style.css", headers=headers)
        
        if response.status_code == 200:
            content_encoding = response.headers.get('content-encoding', '')
            content_length = response.headers.get('content-length', '0')
            
            print(f"✅ CSS 파일 응답: {response.status_code}")
            print(f"✅ 압축 방식: {content_encoding or '압축 없음'}")
            print(f"✅ 파일 크기: {content_length} bytes")
        else:
            print(f"❌ CSS 파일 요청 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ CSS 파일 테스트 오류: {e}")
    
    print()
    
    # 4. JavaScript 파일 압축 테스트
    print("4. JavaScript 파일 압축 테스트...")
    try:
        headers = {'Accept-Encoding': 'gzip'}
        response = requests.get(f"{base_url}/static/js/main-new.js", headers=headers)
        
        if response.status_code == 200:
            content_encoding = response.headers.get('content-encoding', '')
            content_length = response.headers.get('content-length', '0')
            
            print(f"✅ JS 파일 응답: {response.status_code}")
            print(f"✅ 압축 방식: {content_encoding or '압축 없음'}")
            print(f"✅ 파일 크기: {content_length} bytes")
        else:
            print(f"❌ JS 파일 요청 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ JS 파일 테스트 오류: {e}")
    
    print()
    print("=" * 50)
    print("🎯 테스트 완료!")
    print()
    print("📊 압축 효과 확인:")
    print("- 브라우저 개발자 도구 → Network 탭")
    print("- API 요청에서 'Content-Encoding: gzip' 확인")
    print("- 파일 크기 감소 확인")

if __name__ == "__main__":
    test_compression()
