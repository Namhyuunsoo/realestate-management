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
echo 3. Flask 서버 자동 실행 등록 (DuckDNS 포함)
echo.

echo 계속하려면 아무 키나 누르세요...
pause >nul

echo.
echo ========================================
echo           1. Git 설치 확인
echo ========================================
echo Git 설치 확인 중...
git --version >nul 2>&1
if %errorlevel% == 0 (
    echo Git이 이미 설치되어 있습니다.
    git --version
) else (
    echo Git이 설치되어 있지 않습니다.
    echo install_realestate_system.bat을 먼저 실행해주세요.
    pause
    exit /b 1
)

echo.
echo ========================================
echo           2. Python 패키지 설치
echo ========================================
echo Python 패키지를 설치합니다...
pip install requests google-api-python-client pandas openpyxl

echo.
echo ========================================
echo           3. Flask 서버 자동 실행 등록
echo ========================================
echo Flask 서버와 DuckDNS를 Windows 시작 시 실행되도록 등록합니다...

:: 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] 관리자 권한으로 실행 중...
    schtasks /create /tn "Flask_Server" /tr "\"%cd%\start_server.bat\"" /sc onstart /ru System /f
    if %errorLevel% == 0 (
        echo [SUCCESS] Windows 자동 시작 등록 완료!
    ) else (
        echo [ERROR] 자동 시작 등록에 실패했습니다.
        echo 수동으로 start_server.bat을 실행해주세요.
    )
) else (
    echo [WARNING] 관리자 권한이 없습니다.
    echo 자동 시작 등록을 건너뜁니다.
    echo 수동으로 start_server.bat을 실행해주세요.
)

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
echo - Flask 서버: Windows 시작 시 자동 실행 (DuckDNS 포함)
echo.
echo 이제 서버를 재시작하면 모든 것이 자동으로 실행됩니다!
echo.
echo 아무 키나 누르면 종료됩니다...
pause >nul




