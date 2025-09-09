# app/__init__.py

from flask import Flask, jsonify, request, make_response
from dotenv import load_dotenv
import os
from datetime import timedelta
from flask_compress import Compress

# 환경변수 로드 (반드시 Flask 앱 생성 전에)
print("🔍 환경변수 로딩 시작...")
print(f"현재 작업 디렉토리: {os.getcwd()}")
print(f".env 파일 존재 여부: {os.path.exists('.env')}")

# .env 파일 경로를 명시적으로 지정
env_path = os.path.join(os.getcwd(), '.env')
print(f".env 파일 경로: {env_path}")
print(f".env 파일 존재 여부 (절대 경로): {os.path.exists(env_path)}")

# 환경변수 로드 시도
load_dotenv(env_path)

# 로드된 환경변수 확인
naver_client_id = os.getenv("NAVER_MAPS_NCP_CLIENT_ID")
naver_client_secret = os.getenv("NAVER_MAPS_NCP_CLIENT_SECRET")
print(f"로드된 NAVER_MAPS_NCP_CLIENT_ID: {'설정됨' if naver_client_id else 'None'}")
print(f"로드된 NAVER_MAPS_NCP_CLIENT_SECRET: {'설정됨' if naver_client_secret else 'None'}")
print("🔍 환경변수 로딩 완료")

def create_app(config_object=None):
    """
    Flask 애플리케이션 팩토리 함수
    
    Args:
        config_object: 설정 객체 (테스트용)
    """
    # Flask 인스턴스 생성 (템플릿 폴더 없음)
    app = Flask(__name__, static_folder="static", template_folder=None)

    # 설정 로드
    if config_object:
        app.config.from_object(config_object)
    else:
        from .config import load_config
        load_config(app)

    # 세션 설정 (다른 컴퓨터에서 접속 가능하도록)
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)  # 8시간
    app.config['SESSION_COOKIE_SECURE'] = False  # HTTP 허용
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

    # Gzip 압축 활성화
    Compress(app)
    print("✅ Gzip 압축 활성화 완료")
    
    # 압축 설정 최적화
    app.config['COMPRESS_MIMETYPES'] = [
        'text/html',
        'text/css',
        'text/xml',
        'application/json',
        'application/javascript',
        'text/javascript'
    ]
    app.config['COMPRESS_LEVEL'] = 6  # 압축 레벨 (1-9)
    app.config['COMPRESS_MIN_SIZE'] = 500  # 최소 압축 크기
    print("✅ 압축 설정 최적화 완료")

    # 확장 기능 초기화
    from .extensions import init_extensions
    init_extensions(app)

    # 데이터 저장소 초기화
    from .services.data_manager import DataManager
    data_manager = DataManager()
    app.data_manager = data_manager
    data_manager.initialize()
    
    # 백그라운드 서비스들은 첫 요청 시 지연 초기화됨
    print("⏳ 백그라운드 서비스들은 첫 요청 시 지연 초기화됩니다.")

    # Blueprint 등록
    register_blueprints(app)

    # 모바일 디바이스 감지 및 최적화
    @app.before_request
    def detect_mobile_and_optimize():
        """모바일 디바이스 감지 및 압축 최적화"""
        user_agent = request.headers.get('User-Agent', '').lower()
        
        # 모바일 디바이스 감지
        mobile_keywords = ['mobile', 'android', 'iphone', 'ipad', 'windows phone']
        is_mobile = any(keyword in user_agent for keyword in mobile_keywords)
        
        # 모바일인 경우 더 적극적인 압축 설정
        if is_mobile:
            app.config['COMPRESS_LEVEL'] = 8  # 최대 압축
            app.config['COMPRESS_MIN_SIZE'] = 100  # 더 작은 파일도 압축
            print(f"📱 모바일 디바이스 감지: {user_agent[:50]}...")

    # CORS 헤더 추가 (다른 컴퓨터에서 접속 가능하도록)
    @app.after_request
    def after_request(response):
        # CORS 헤더 설정
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        # 캐시 헤더 설정
        if request.path.startswith('/static/'):
            response.headers.add('Cache-Control', 'public, max-age=31536000')
        else:
            response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
        
        return response

    # SPA index.html 서빙 (인증 필요)
    @app.route("/")
    def index():
        from flask import session
        # 로그인 상태 확인 - 항상 메인 페이지 서빙 (인라인 로그인 사용)
        return app.send_static_file("index.html")
    
    # 로그인 페이지 서빙
    @app.route("/login")
    def login():
        return app.send_static_file("login.html")
    
    # 회원가입 페이지 서빙
    @app.route("/register")
    def register():
        return app.send_static_file("register.html")
    
    # 네이버 지도 API 설정 반환
    @app.route("/api/config/maps")
    def get_maps_config():
        """네이버 지도 API 설정을 반환"""
        ncp_client_id = app.config.get("NAVER_MAPS_NCP_CLIENT_ID", "")
        ncp_client_secret = app.config.get("NAVER_MAPS_NCP_CLIENT_SECRET", "")
        
        # 환경변수가 이미 설정되어 있으므로 그대로 반환
        return jsonify({
            "ncpKeyId": ncp_client_id,
            "ncpClientId": ncp_client_id,
            "ncpClientSecret": ncp_client_secret
        })

    # 압축 상태 확인 API
    @app.route("/api/compression/status")
    def get_compression_status():
        """압축 설정 상태 확인"""
        return jsonify({
            "compression_enabled": True,
            "compress_level": app.config.get('COMPRESS_LEVEL', 6),
            "compress_min_size": app.config.get('COMPRESS_MIN_SIZE', 500),
            "compress_mimetypes": app.config.get('COMPRESS_MIMETYPES', []),
            "message": "Gzip 압축이 활성화되어 있습니다."
        })

    return app

def register_blueprints(app):
    """Blueprint 등록"""
    from .routes.health import bp as health_bp
    from .routes.listings import bp as listings_bp
    from .routes.customers import bp as customers_bp
    from .routes.briefings import bp as briefings_bp
    from .routes.auth import bp as auth_bp
    from .routes.auth_naver import bp as auth_naver_bp
    from .routes.admin import bp as admin_bp
    from .routes.users import bp as users_bp
    from .routes.security import bp as security_bp
    from .routes.user_sheets import bp as user_sheets_bp
    from .routes.geocoding import bp as geocoding_bp
    from .routes.listing_add import bp as listing_add_bp
    from .routes.recommendations import bp as recommendations_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(listings_bp)
    app.register_blueprint(customers_bp)
    app.register_blueprint(briefings_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(auth_naver_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(security_bp)
    app.register_blueprint(user_sheets_bp)
    app.register_blueprint(geocoding_bp)
    app.register_blueprint(listing_add_bp)
    app.register_blueprint(recommendations_bp)
