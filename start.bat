@echo off
title 부동산 관리 시스템 서버
echo ========================================
echo        부동산 관리 시스템 서버 시작
echo ========================================
echo.

REM 현재 디렉토리로 이동
cd /d "%~dp0"

REM 가상환경 활성화
echo 가상환경을 활성화합니다...
call venv\Scripts\Activate.bat

REM Python 경로 확인
echo Python 경로: %VIRTUAL_ENV%\Scripts\python.exe

REM Flask 앱 실행
echo.
echo Flask 앱을 시작합니다...
echo 서버 주소: http://localhost:5000
echo 내부 네트워크: http://[서버IP]:5000
echo 외부 인터넷: http://skrealestate.duckdns.org:8081
echo.
echo 종료하려면 Ctrl+C를 누르세요.
echo ========================================
echo.

python run.py

REM 오류 발생 시 일시 정지
if errorlevel 1 (
    echo.
    echo 오류가 발생했습니다.
    pause
)
