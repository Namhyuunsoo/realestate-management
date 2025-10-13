@echo off
chcp 65001 >nul
title Certbot 설치 스크립트

echo ========================================
echo           Certbot 설치 스크립트
echo ========================================
echo.
echo 이 스크립트는 Windows CMD 환경에서 Certbot을 설치합니다.
echo.

:: 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] 관리자 권한으로 실행 중...
) else (
    echo [ERROR] 관리자 권한이 필요합니다.
    echo 이 스크립트를 관리자 권한으로 실행해주세요.
    pause
    exit /b 1
)

echo.
echo ========================================
echo           1. Python 설치 확인
echo ========================================
python --version >nul 2>&1
if %errorLevel% == 0 (
    echo [SUCCESS] Python이 설치되어 있습니다.
    python --version
) else (
    echo [ERROR] Python이 설치되어 있지 않습니다.
    echo Python을 먼저 설치해주세요.
    pause
    exit /b 1
)

echo.
echo ========================================
echo           2. pip 업그레이드
echo ========================================
echo pip를 최신 버전으로 업그레이드합니다...
python -m pip install --upgrade pip

echo.
echo ========================================
echo           3. Certbot 설치
echo ========================================
echo Certbot을 설치합니다...
pip install certbot

echo.
echo ========================================
echo           4. 설치 확인
echo ========================================
certbot --version >nul 2>&1
if %errorLevel% == 0 (
    echo [SUCCESS] Certbot 설치 완료!
    certbot --version
) else (
    echo [ERROR] Certbot 설치에 실패했습니다.
    pause
    exit /b 1
)

echo.
echo ========================================
echo           5. OpenSSL 설치 확인
echo ========================================
openssl version >nul 2>&1
if %errorLevel% == 0 (
    echo [SUCCESS] OpenSSL이 설치되어 있습니다.
    openssl version
) else (
    echo [WARNING] OpenSSL이 설치되어 있지 않습니다.
    echo OpenSSL을 설치합니다...
    
    :: OpenSSL 다운로드 및 설치
    echo OpenSSL 다운로드 중...
    powershell -Command "Invoke-WebRequest -Uri 'https://slproweb.com/download/Win64OpenSSL_Light-3_1_4.exe' -OutFile 'OpenSSL.exe'"
    
    if exist OpenSSL.exe (
        echo OpenSSL 설치 중...
        OpenSSL.exe /SILENT
        del OpenSSL.exe
        echo [SUCCESS] OpenSSL 설치 완료!
    ) else (
        echo [ERROR] OpenSSL 다운로드에 실패했습니다.
        echo 수동으로 OpenSSL을 설치해주세요.
    )
)

echo.
echo ========================================
echo           설치 완료!
echo ========================================
echo.
echo Certbot이 성공적으로 설치되었습니다.
echo.
echo 다음 단계:
echo 1. 포트 80, 443 열기
echo 2. SSL 인증서 발급
echo 3. 환경변수 설정
echo 4. 서버 시작
echo.
pause

