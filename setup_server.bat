@echo off
title 서버 자동 설정
echo ========================================
echo           서버 자동 설정 스크립트
echo ========================================
echo.
echo 이 스크립트는 서버 컴퓨터를 자동으로 설정합니다.
echo.
echo 설정할 항목:
echo 1. Git 설치
echo 2. Python 패키지 설치
echo 3. DuckDNS 자동 업데이트 등록
echo 4. Flask 서버 자동 실행 등록
echo.

echo 계속하려면 아무 키나 누르세요...
pause >nul

echo.
echo ========================================
echo           1. Git 설치 확인
echo ========================================
call install_git.bat

echo.
echo ========================================
echo           2. Python 패키지 설치
echo ========================================
echo Python 패키지를 설치합니다...
pip install requests google-api-python-client pandas openpyxl

echo.
echo ========================================
echo           3. DuckDNS 자동 업데이트 등록
echo ========================================
echo DuckDNS 자동 업데이트를 Windows 시작 시 실행되도록 등록합니다...
schtasks /create /tn "DuckDNS_Updater" /tr "python \"%cd%\duckdns_updater.py\"" /sc onstart /ru System /f

echo.
echo ========================================
echo           4. Flask 서버 자동 실행 등록
echo ========================================
echo Flask 서버를 Windows 시작 시 실행되도록 등록합니다...
schtasks /create /tn "Flask_Server" /tr "python \"%cd%\run.py\"" /sc onstart /ru System /f

echo.
echo ========================================
echo           서버 설정 완료!
echo ========================================
echo.
echo 모든 설정이 완료되었습니다!
echo.
echo 설정된 항목:
echo - Git: 자동 설치 및 설정
echo - Python 패키지: requests, google-api-python-client 등
echo - DuckDNS: 5분마다 자동 IP 업데이트
echo - Flask 서버: Windows 시작 시 자동 실행
echo.
echo 이제 서버를 재시작하면 모든 것이 자동으로 실행됩니다!
echo.
echo 아무 키나 누르면 종료됩니다...
pause >nul




