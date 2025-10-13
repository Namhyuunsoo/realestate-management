import os
from app import create_app

# Flask CLI에서도 0.0.0.0으로 실행되도록 환경변수 설정
os.environ['FLASK_RUN_HOST'] = '0.0.0.0'

app = create_app()

if __name__ == "__main__":
    # 환경변수에서 설정 가져오기 (기본값: 0.0.0.0:5000)
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    use_https = os.getenv('USE_HTTPS', 'false').lower() == 'true'
    
    # HTTPS 설정
    ssl_context = None
    if use_https:
        cert_path = os.getenv('SSL_CERT_PATH', '/etc/letsencrypt/live/skrealestate.duckdns.org/fullchain.pem')
        key_path = os.getenv('SSL_KEY_PATH', '/etc/letsencrypt/live/skrealestate.duckdns.org/privkey.pem')
        
        if os.path.exists(cert_path) and os.path.exists(key_path):
            ssl_context = (cert_path, key_path)
            print(f"🔒 HTTPS 모드: 활성화")
            print(f"📜 인증서: {cert_path}")
            print(f"🔑 개인키: {key_path}")
        else:
            print(f"⚠️ HTTPS 인증서 파일을 찾을 수 없습니다.")
            print(f"   인증서: {cert_path}")
            print(f"   개인키: {key_path}")
            print(f"   HTTP 모드로 실행합니다.")
            use_https = False
    
    protocol = "https" if use_https else "http"
    print(f"🚀 서버 시작: {protocol}://{host}:{port}")
    print(f"📡 외부 접속: {protocol}://skrealestate.duckdns.org:{port}")
    print(f"🔧 디버그 모드: {debug}")
    
    app.run(host=host, port=port, debug=debug, ssl_context=ssl_context)
