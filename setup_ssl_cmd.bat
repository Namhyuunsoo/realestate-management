@echo off
chcp 65001 >nul
title SSL 인증서 설정 스크립트

echo ========================================
echo         SSL 인증서 설정 스크립트
echo ========================================
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
echo           1. 포트 80, 443 열기
echo ========================================
echo Windows 방화벽에서 포트 80, 443을 엽니다...

:: 포트 80 열기
netsh advfirewall firewall add rule name="HTTP" dir=in action=allow protocol=TCP localport=80
if %errorLevel% == 0 (
    echo [SUCCESS] 포트 80 열기 완료
) else (
    echo [WARNING] 포트 80 열기 실패 (이미 열려있을 수 있음)
)

:: 포트 443 열기
netsh advfirewall firewall add rule name="HTTPS" dir=in action=allow protocol=TCP localport=443
if %errorLevel% == 0 (
    echo [SUCCESS] 포트 443 열기 완료
) else (
    echo [WARNING] 포트 443 열기 실패 (이미 열려있을 수 있음)
)

:: 포트 5000 열기
netsh advfirewall firewall add rule name="Flask HTTPS" dir=in action=allow protocol=TCP localport=5000
if %errorLevel% == 0 (
    echo [SUCCESS] 포트 5000 열기 완료
) else (
    echo [WARNING] 포트 5000 열기 실패 (이미 열려있을 수 있음)
)

echo.
echo ========================================
echo           2. DuckDNS IP 업데이트
echo ========================================
echo DuckDNS IP를 업데이트합니다...
python duckdns_updater.py

echo.
echo ========================================
echo           3. SSL 인증서 발급
echo ========================================
echo SSL 인증서를 발급합니다...
echo.

:: 이메일 주소 입력
set /p admin_email="관리자 이메일 주소를 입력하세요: "

if "%admin_email%"=="" (
    echo [ERROR] 이메일 주소를 입력해주세요.
    pause
    exit /b 1
)

echo.
echo SSL 인증서 발급 중...
echo 도메인: skrealestate.duckdns.org
echo 이메일: %admin_email%
echo.

:: SSL 인증서 발급
certbot certonly --standalone -d skrealestate.duckdns.org --non-interactive --agree-tos --email %admin_email%

if %errorLevel% == 0 (
    echo [SUCCESS] SSL 인증서 발급 완료!
) else (
    echo [ERROR] SSL 인증서 발급에 실패했습니다.
    echo.
    echo 문제 해결 방법:
    echo 1. 포트 80, 443이 열려있는지 확인
    echo 2. DuckDNS 도메인이 현재 IP로 연결되는지 확인
    echo 3. 방화벽 설정 확인
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo           4. 인증서 파일 위치 확인
echo ========================================
echo 인증서 파일 위치를 확인합니다...

:: Windows에서 Certbot 인증서 위치 확인
set cert_path=""
set key_path=""

:: 일반적인 Windows Certbot 경로들 확인
if exist "C:\Certbot\live\skrealestate.duckdns.org\fullchain.pem" (
    set cert_path=C:\Certbot\live\skrealestate.duckdns.org\fullchain.pem
    set key_path=C:\Certbot\live\skrealestate.duckdns.org\privkey.pem
    echo [SUCCESS] 인증서 파일을 찾았습니다: C:\Certbot\live\skrealestate.duckdns.org\
) else if exist "%USERPROFILE%\AppData\Local\Certbot\live\skrealestate.duckdns.org\fullchain.pem" (
    set cert_path=%USERPROFILE%\AppData\Local\Certbot\live\skrealestate.duckdns.org\fullchain.pem
    set key_path=%USERPROFILE%\AppData\Local\Certbot\live\skrealestate.duckdns.org\privkey.pem
    echo [SUCCESS] 인증서 파일을 찾았습니다: %USERPROFILE%\AppData\Local\Certbot\live\skrealestate.duckdns.org\
) else (
    echo [WARNING] 인증서 파일을 찾을 수 없습니다.
    echo 수동으로 인증서 파일 위치를 확인해주세요.
    echo.
    echo 일반적인 위치:
    echo - C:\Certbot\live\skrealestate.duckdns.org\
    echo - %USERPROFILE%\AppData\Local\Certbot\live\skrealestate.duckdns.org\
    echo.
    set /p cert_path="인증서 파일 경로를 입력하세요 (fullchain.pem): "
    set /p key_path="개인키 파일 경로를 입력하세요 (privkey.pem): "
)

echo.
echo ========================================
echo           5. 환경변수 설정
echo ========================================
echo .env 파일에 HTTPS 설정을 추가합니다...

:: .env 파일이 있는지 확인
if not exist ".env" (
    echo [ERROR] .env 파일을 찾을 수 없습니다.
    echo .env 파일을 먼저 생성해주세요.
    pause
    exit /b 1
)

:: .env 파일에 HTTPS 설정 추가
echo. >> .env
echo # HTTPS 설정 >> .env
echo USE_HTTPS=true >> .env
echo REQUIRE_HTTPS=true >> .env
echo ADMIN_EMAIL=%admin_email% >> .env
echo SSL_CERT_PATH=%cert_path% >> .env
echo SSL_KEY_PATH=%key_path% >> .env

echo [SUCCESS] .env 파일에 HTTPS 설정 추가 완료!

echo.
echo ========================================
echo           6. 서버 시작
echo ========================================
echo HTTPS 모드로 서버를 시작합니다...
echo.

:: HTTPS 서버 시작
start_server_with_ssl.bat

echo.
echo ========================================
echo           설정 완료!
echo ========================================
echo.
echo SSL 인증서 설정이 완료되었습니다!
echo.
echo 접속 주소:
echo - 로컬: https://localhost:5000
echo - 외부: https://skrealestate.duckdns.org:5000
echo.
echo 자동 갱신:
echo - DuckDNS IP 업데이트: 5분마다
echo - SSL 인증서 갱신: IP 변경 시 자동
echo.
pause

