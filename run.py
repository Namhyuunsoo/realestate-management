import os
from app import create_app

# Flask CLI에서도 0.0.0.0으로 실행되도록 환경변수 설정
os.environ['FLASK_RUN_HOST'] = '0.0.0.0'
os.environ['FLASK_RUN_PORT'] = '5000'

app = create_app()

if __name__ == "__main__":
    # 환경변수에서 설정 가져오기 (기본값: 0.0.0.0:5000)
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"🚀 서버 시작: http://{host}:{port}")
    print(f"📡 외부 접속: http://[서버IP]:{port}")
    print(f"🔧 디버그 모드: {debug}")
    
    app.run(host=host, port=port, debug=debug)
