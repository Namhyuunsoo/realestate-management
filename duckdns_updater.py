import requests
import time
from datetime import datetime
import logging
import os
import re

# 로깅 설정
logging.basicConfig(
    filename='duckdns_update.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding='utf-8'
)

def load_env_file(file_path='.env'):
    """환경변수 파일을 로드하여 os.environ에 설정"""
    if not os.path.exists(file_path):
        logging.warning(f"환경변수 파일을 찾을 수 없습니다: {file_path}")
        return
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
                    logging.info(f"환경변수 로드: {key.strip()}")
    except Exception as e:
        logging.error(f"환경변수 파일 로드 오류: {e}")

# 환경변수 파일 로드
load_env_file()

def update_duckdns():
    domain = os.getenv("DUCKDNS_DOMAIN", "skrealestate")
    token = os.getenv("DUCKDNS_TOKEN", "")
    
    if not token:
        logging.error("DUCKDNS_TOKEN 환경변수가 설정되지 않았습니다.")
        print("❌ DUCKDNS_TOKEN 환경변수가 설정되지 않았습니다.")
        return
    
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
    domain = os.getenv("DUCKDNS_DOMAIN", "skrealestate")
    print("🚀 DuckDNS 자동 IP 업데이트 시작...")
    print(f"도메인: {domain}.duckdns.org")
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




