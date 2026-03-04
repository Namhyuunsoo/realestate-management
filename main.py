# app.py (Vercel Entry Point Fallback)
import os
import sys

# 프로젝트 디렉토리를 Python 경로에 명시적으로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

app = create_app()

# 로컬 개발 환경용
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
