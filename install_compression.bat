@echo off
echo ========================================
echo Gzip 압축 기능 설치 스크립트
echo ========================================
echo.

echo 🔍 현재 디렉토리 확인...
cd /d "%~dp0"
echo 현재 디렉토리: %CD%
echo.

echo 📦 새로운 패키지 설치 중...
echo Flask-Compress 패키지를 설치합니다.
echo.

REM 가상환경 활성화
if exist "venv\Scripts\activate.bat" (
    echo ✅ 가상환경 활성화 중...
    call venv\Scripts\activate.bat
    echo.
    
    echo 📦 Flask-Compress 설치 중...
    pip install Flask-Compress==1.14
    echo.
    
    echo ✅ 설치 완료!
    echo.
    echo 📋 설치된 패키지 확인:
    pip list | findstr Flask-Compress
    echo.
    
    echo 🚀 서버 재시작이 필요합니다.
    echo 현재 실행 중인 서버를 종료하고 다시 시작해주세요.
    echo.
    
    echo 📊 압축 기능 확인 방법:
    echo 1. 서버 시작 후 http://localhost:5000/api/compression/status 접속
    echo 2. 브라우저 개발자 도구 → Network 탭에서 Content-Encoding: gzip 확인
    echo.
    
) else (
    echo ❌ 가상환경을 찾을 수 없습니다.
    echo venv 폴더가 있는지 확인해주세요.
    echo.
)

echo ========================================
echo 설치 완료!
echo ========================================
pause
