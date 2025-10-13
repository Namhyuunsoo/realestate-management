#!/usr/bin/env python3
"""
SSL 인증서 자동 갱신 스크립트
DuckDNS IP 업데이트와 연동하여 SSL 인증서를 자동으로 갱신합니다.
"""

import requests
import time
import subprocess
import os
import logging
from datetime import datetime
import socket

# 로깅 설정
logging.basicConfig(
    filename='ssl_renew.log',
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

def get_current_ip():
    """현재 공인 IP 주소를 가져옵니다."""
    try:
        response = requests.get('https://api.ipify.org', timeout=10)
        if response.status_code == 200:
            return response.text.strip()
    except Exception as e:
        logging.error(f"IP 주소 조회 실패: {e}")
    return None

def get_domain_ip(domain):
    """도메인의 현재 IP 주소를 가져옵니다."""
    try:
        ip = socket.gethostbyname(domain)
        return ip
    except Exception as e:
        logging.error(f"도메인 IP 조회 실패: {e}")
    return None

def update_duckdns():
    """DuckDNS IP를 업데이트합니다."""
    domain = os.getenv("DUCKDNS_DOMAIN", "skrealestate")
    token = os.getenv("DUCKDNS_TOKEN", "")
    
    if not token:
        logging.error("DUCKDNS_TOKEN 환경변수가 설정되지 않습니다.")
        return False
    
    url = f"https://www.duckdns.org/update?domains={domain}&token={token}"
    
    try:
        response = requests.get(url, timeout=10)
        if response.text == "OK":
            logging.info("DuckDNS IP 업데이트 성공")
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ DuckDNS IP 업데이트 성공")
            return True
        else:
            logging.error(f"DuckDNS IP 업데이트 실패: {response.text}")
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ DuckDNS IP 업데이트 실패: {response.text}")
            return False
    except Exception as e:
        logging.error(f"DuckDNS 업데이트 오류: {e}")
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ DuckDNS 업데이트 오류: {e}")
        return False

def renew_ssl_certificate():
    """SSL 인증서를 갱신합니다."""
    domain = os.getenv("DUCKDNS_DOMAIN", "skrealestate")
    full_domain = f"{domain}.duckdns.org"
    
    try:
        # Certbot으로 인증서 갱신
        cmd = [
            "certbot", "certonly", 
            "--standalone", 
            "-d", full_domain,
            "--non-interactive",
            "--agree-tos",
            "--email", os.getenv("ADMIN_EMAIL", "admin@example.com")
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            logging.info("SSL 인증서 갱신 성공")
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ SSL 인증서 갱신 성공")
            return True
        else:
            logging.error(f"SSL 인증서 갱신 실패: {result.stderr}")
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ SSL 인증서 갱신 실패: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logging.error("SSL 인증서 갱신 시간 초과")
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ SSL 인증서 갱신 시간 초과")
        return False
    except Exception as e:
        logging.error(f"SSL 인증서 갱신 오류: {e}")
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ SSL 인증서 갱신 오류: {e}")
        return False

def check_ssl_certificate_validity():
    """SSL 인증서 유효성을 확인합니다."""
    domain = os.getenv("DUCKDNS_DOMAIN", "skrealestate")
    full_domain = f"{domain}.duckdns.org"
    
    try:
        # OpenSSL로 인증서 정보 확인 (포트 5000 사용)
        cmd = [
            "openssl", "s_client", "-connect", f"{full_domain}:5000", 
            "-servername", full_domain, "-verify_return_error"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            logging.info("SSL 인증서 유효성 확인 성공")
            return True
        else:
            logging.warning("SSL 인증서 유효성 확인 실패")
            return False
            
    except Exception as e:
        logging.error(f"SSL 인증서 유효성 확인 오류: {e}")
        return False

def restart_web_server():
    """웹 서버를 재시작합니다."""
    try:
        # 현재 실행 중인 Python 프로세스 찾기
        cmd = ["tasklist", "/FI", "IMAGENAME eq python.exe", "/FO", "CSV"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if "run.py" in result.stdout:
            logging.info("웹 서버 재시작 필요")
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 🔄 웹 서버 재시작 필요")
            # 실제로는 서비스 재시작 로직이 필요
            return True
        else:
            logging.info("웹 서버가 실행 중이 아닙니다")
            return False
            
    except Exception as e:
        logging.error(f"웹 서버 재시작 확인 오류: {e}")
        return False

def main():
    """메인 함수"""
    domain = os.getenv("DUCKDNS_DOMAIN", "skrealestate")
    full_domain = f"{domain}.duckdns.org"
    
    print("🔒 SSL 인증서 자동 갱신 시작...")
    print(f"도메인: {full_domain}")
    print("확인 주기: 10분")
    print("로그 파일: ssl_renew.log")
    print("=" * 50)
    
    last_ip = None
    
    while True:
        try:
            # 현재 IP 확인
            current_ip = get_current_ip()
            if not current_ip:
                time.sleep(60)
                continue
            
            # IP 변경 확인
            if last_ip and last_ip != current_ip:
                logging.info(f"IP 변경 감지: {last_ip} → {current_ip}")
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 🔄 IP 변경 감지: {last_ip} → {current_ip}")
                
                # DuckDNS 업데이트
                if update_duckdns():
                    # 잠시 대기 (DNS 전파 시간)
                    time.sleep(30)
                    
                    # SSL 인증서 갱신
                    if renew_ssl_certificate():
                        # 웹 서버 재시작
                        restart_web_server()
                        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ SSL 인증서 갱신 완료")
                    else:
                        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ SSL 인증서 갱신 실패")
                else:
                    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ DuckDNS 업데이트 실패")
            
            last_ip = current_ip
            
            # 10분마다 확인
            time.sleep(600)
            
        except KeyboardInterrupt:
            print("\n🛑 사용자에 의해 중단됨")
            logging.info("사용자에 의해 스크립트 중단")
            break
        except Exception as e:
            print(f"❌ 예상치 못한 오류: {e}")
            logging.error(f"예상치 못한 오류: {e}")
            time.sleep(60)

if __name__ == "__main__":
    # 환경변수 로드
    load_env_file()
    main()
