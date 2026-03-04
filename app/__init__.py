# app/__init__.py

from flask import Flask, jsonify, request, make_response, g
from dotenv import load_dotenv
import os
from datetime import timedelta
from flask_compress import Compress
from app.services.user_service import mask_ip

# 환경변수 로드 (반드시 Flask 앱 생성 전에)
print("🔍 환경변수 로딩 시작...")

# .env 파일 경로를 명시적으로 지정
env_path = os.path.join(os.getcwd(), '.env')

# 환경변수 로드 시도
load_dotenv(env_path)

# 로드된 환경변수 확인 (보안을 위해 마스킹 처리)
naver_client_id = os.getenv("NAVER_MAPS_NCP_CLIENT_ID")
naver_client_secret = os.getenv("NAVER_MAPS_NCP_CLIENT_SECRET")
# 보안 강화: 환경변수 로깅 제거
# print(f"로드된 NAVER_MAPS_NCP_CLIENT_ID: {'설정됨' if naver_client_id else 'None'}")
# print(f"로드된 NAVER_MAPS_NCP_CLIENT_SECRET: {'설정됨' if naver_client_secret else 'None'}")
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

    # 세션 설정 (보안 강화)
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)  # 8시간
    
    # HTTPS 설정 (환경변수로 제어)
    require_https = os.getenv("REQUIRE_HTTPS", "false").lower() == "true"
    app.config['SESSION_COOKIE_SECURE'] = require_https  # HTTPS 환경에서만 Secure 쿠키
    app.config['SESSION_COOKIE_HTTPONLY'] = True  # XSS 방지
    app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'  # CSRF 방지 강화
    
    if require_https:
        print("🔒 HTTPS 모드 활성화 - Secure 쿠키 사용")
        print("⚠️ 주의: HTTPS 인증서가 설정되어 있는지 확인하세요!")
    else:
        print("🌐 HTTP 모드 - 개발환경용")
        print("💡 프로덕션 배포 시 HTTPS 인증서 설정 후 REQUIRE_HTTPS=true 권장")

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

    # 보안 헤더 추가
    @app.after_request
    def add_security_headers(response):
        """보안 헤더 추가"""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # HTTPS 환경에서만 HSTS 헤더 추가
        if require_https:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response

    # Blueprint 등록
    register_blueprints(app)

    # 모바일 디바이스 감지 및 최적화 (한 번만 실행)
    @app.before_request
    def detect_mobile_and_optimize():
        """모바일 디바이스 감지 및 압축 최적화"""
        # 이미 감지된 경우 중복 실행 방지
        if hasattr(g, 'mobile_detected'):
            return
            
        user_agent = request.headers.get('User-Agent', '').lower()
        
        # 모바일 디바이스 감지
        mobile_keywords = ['mobile', 'android', 'iphone', 'ipad', 'windows phone']
        is_mobile = any(keyword in user_agent for keyword in mobile_keywords)
        
        # 모바일인 경우 더 적극적인 압축 설정
        if is_mobile:
            app.config['COMPRESS_LEVEL'] = 8  # 최대 압축
            app.config['COMPRESS_MIN_SIZE'] = 100  # 더 작은 파일도 압축
            # 보안 강화: 사용자 에이전트 로깅 제거
            # print(f"📱 모바일 디바이스 감지: {user_agent[:50]}...")
        
        # 중복 실행 방지 플래그 설정
        g.mobile_detected = True

    # 보안: 민감한 경로 접근 차단
    @app.before_request
    def block_sensitive_paths():
        """민감한 데이터 파일 접근 차단"""
        blocked_paths = [
            '/data/cache/',
            '/data/store.json',
            '/data/users.json', 
            '/data/user_sheets.json',
            '/data/state/',
            '/data/users.json.backup'
        ]
        
        for path in blocked_paths:
            if request.path.startswith(path):
                app.logger.warning(f"🚨 차단된 경로 접근 시도: {request.path} from {mask_ip(request.remote_addr)}")
                return "Access Denied", 403

    # CORS 헤더 추가 (다른 컴퓨터에서 접속 가능하도록)
    @app.after_request
    def after_request(response):
        # CORS 헤더 설정
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User,X-CSRF-Token')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        # 캐시 헤더 설정
        # 개발 환경에서는 캐시 비활성화, 프로덕션에서는 캐시 활성화
        is_debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
        if request.path.startswith('/static/'):
            if is_debug:
                # 개발 환경: 캐시 비활성화 (코드 변경 시 즉시 반영)
                response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
                response.headers.add('Pragma', 'no-cache')
                response.headers.add('Expires', '0')
            else:
                # 프로덕션 환경: 캐시 활성화 (성능 최적화)
                response.headers.add('Cache-Control', 'public, max-age=31536000')
        else:
            response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
        
        return response

    # SPA index.html 서빙 (인증 필요)
    @app.route("/")
    def index():
        from flask import session
        from app.core.security import generate_csrf_token
        import os

        # CSRF 토큰 생성 (세션 기반)
        if 'csrf_token' not in session:
            session['csrf_token'] = generate_csrf_token()
        
        # HTML 파일 읽기
        html_path = os.path.join(app.static_folder, 'index.html')
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # CSRF 토큰을 메타 태그에 주입
        csrf_token = session.get('csrf_token', '')
        html_content = html_content.replace(
            '<meta name="csrf-token" content="">',
            f'<meta name="csrf-token" content="{csrf_token}">'
        )
        
        return html_content
    
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
    from .routes.admin import bp as admin_bp
    from .routes.users import bp as users_bp
    from .routes.security import bp as security_bp
    from .routes.user_sheets import bp as user_sheets_bp
    from .routes.geocoding import bp as geocoding_bp
    from .routes.listing_add import bp as listing_add_bp
    from .routes.recommendations import bp as recommendations_bp
    from .routes.webhooks import bp as webhooks_bp
    from .routes.crons import bp as crons_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(listings_bp)
    app.register_blueprint(customers_bp)
    app.register_blueprint(briefings_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(security_bp)
    app.register_blueprint(user_sheets_bp)
    app.register_blueprint(geocoding_bp)
    app.register_blueprint(listing_add_bp)
    app.register_blueprint(recommendations_bp)
    app.register_blueprint(webhooks_bp)
    app.register_blueprint(crons_bp)