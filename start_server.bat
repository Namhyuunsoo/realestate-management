@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 현재 디렉토리 확인
if not exist "run.py" (
    echo [ERROR] run.py 파일을 찾을 수 없습니다.
    echo 이 스크립트를 프로젝트 루트 디렉토리에서 실행해주세요.
    pause
    exit /b 1
)

:: 가상환경 활성화
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo [INFO] 가상환경 활성화 완료
) else (
    echo [WARNING] 가상환경을 찾을 수 없습니다. 시스템 Python을 사용합니다.
)

:: DuckDNS 백그라운드 시작
echo [INFO] DuckDNS 자동 IP 업데이트 시작...
start /b python duckdns_updater.py

:: 환경변수 설정
set PORT=5000
set HOST=0.0.0.0
set FLASK_DEBUG=False

echo ========================================
echo    부동산 관리 시스템 서버 시작
echo ========================================
echo.
echo 서버 주소: http://localhost:5000
echo 외부 접속: http://[컴퓨터IP]:5000
echo DuckDNS: 백그라운드에서 자동 실행 중
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요.
echo.

:: 서버 시작
python run.py

echo.
echo 서버가 종료되었습니다.
pause

