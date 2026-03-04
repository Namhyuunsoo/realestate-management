# app/extensions.py

import logging
import os
import sys
from logging.handlers import RotatingFileHandler

def init_extensions(app):
    """Flask 앱의 확장 기능들을 초기화"""
    init_logging(app)

def init_logging(app):
    """로깅 시스템 초기화"""
    if not app.debug and not app.testing:
        # Vercel과 같은 읽기 전용 환경인지 확인
        is_vercel = os.environ.get('VERCEL', '0') == '1'
        
        # 로그 포맷 설정
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
        )
        
        if is_vercel:
            # Vercel 환경: 파일 시스템 쓰기 불가 (Errno 30)
            # 기본 StreamHandler(표준 출력)만 사용하여 Vercel 로그 대시보드로 라우팅
            stream_handler = logging.StreamHandler(sys.stdout)
            stream_handler.setFormatter(formatter)
            stream_handler.setLevel(logging.INFO)
            app.logger.addHandler(stream_handler)
        else:
            # 로컬/일반 서버 환경: 파일 기반 로깅 유지
            log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
            os.makedirs(log_dir, exist_ok=True)
            
            file_handler = RotatingFileHandler(
                os.path.join(log_dir, 'app.log'),
                maxBytes=10240000,  # 10MB
                backupCount=10
            )
            file_handler.setFormatter(formatter)
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            
        app.logger.setLevel(logging.INFO)
        app.logger.info('애플리케이션 시작 (Vercel 모드: %s)', is_vercel)
