import requests
import time
from datetime import datetime
import logging
import os

# 로깅 설정
logging.basicConfig(
    filename='duckdns_update.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding='utf-8'
)

def update_duckdns():
    token = "ad2c018b-41a7-4c42-b144-adb49787bd43"
    domain = "realestate"
    
    url = f"https://www.duckdns.org/update?domains={domain}&token={token}"
    
    try:
        response = requests.get(url)
        if response.text == "OK":
            logging.info("DuckDNS IP 업데이트 성공")
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ DuckDNS IP 업데이트 성공")
        else:
            logging.error(f"DuckDNS IP 업데이트 실패: {response.text}")
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ DuckDNS IP 업데이트 실패: {response.text}")
    except Exception as e:
        logging.error(f"오류 발생: {e}")
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ 오류 발생: {e}")

def main():
    print("🚀 DuckDNS 자동 IP 업데이트 시작...")
    print("도메인: realestate.duckdns.org")
    print("업데이트 주기: 5분")
    print("로그 파일: duckdns_update.log")
    print("=" * 50)
    
    # 시작 시 즉시 한 번 실행
    update_duckdns()
    
    # 5분마다 반복 실행
    while True:
        try:
            time.sleep(300)  # 5분 대기
            update_duckdns()
        except KeyboardInterrupt:
            print("\n🛑 사용자에 의해 중단됨")
            logging.info("사용자에 의해 스크립트 중단")
            break
        except Exception as e:
            print(f"❌ 예상치 못한 오류: {e}")
            logging.error(f"예상치 못한 오류: {e}")
            time.sleep(60)  # 오류 발생 시 1분 후 재시도

if __name__ == "__main__":
    main()




