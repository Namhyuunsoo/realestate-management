# app/extensions.py

import logging
import os
from logging.handlers import RotatingFileHandler

def init_extensions(app):
    """Flask 앱의 확장 기능들을 초기화"""
    init_logging(app)

def init_logging(app):
    """로깅 시스템 초기화"""
    if not app.debug and not app.testing:
        # 로그 디렉토리 생성
        log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        # 파일 핸들러 설정
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, 'app.log'),
            maxBytes=10240000,  # 10MB
            backupCount=10
        )
        
        # 로그 포맷 설정
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)
        
        # 앱에 핸들러 추가
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('애플리케이션 시작')
