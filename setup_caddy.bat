@echo off
REM Change code page to UTF-8 before any Korean text
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

REM Change to script directory
cd /d "%~dp0"

echo ========================================
echo    Caddy Web Server Setup
echo ========================================
echo.

REM Check if Caddy is already installed
where caddy >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Caddy is already installed.
    caddy version
    echo.
    echo Do you want to reinstall? (Y/N)
    set /p REINSTALL="> "
    if /i not "!REINSTALL!"=="Y" (
        echo Setup cancelled.
        pause
        exit /b 0
    )
)

echo [1/3] Downloading Caddy...
echo.

REM Create caddy directory if not exists
if not exist "caddy" mkdir caddy

REM Download Caddy for Windows
set CADDY_URL=https://caddyserver.com/api/download?os=windows&arch=amd64&idempotency=1
set CADDY_FILE=caddy\caddy.exe

echo Downloading from: %CADDY_URL%
echo Saving to: %CADDY_FILE%
echo.

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%CADDY_URL%' -OutFile '%CADDY_FILE%' -UseBasicParsing}"

if not exist "%CADDY_FILE%" (
    echo [ERROR] Failed to download Caddy.
    echo.
    echo Please download manually from:
    echo https://caddyserver.com/download
    echo.
    pause
    exit /b 1
)

echo [OK] Caddy downloaded successfully
echo.

echo [2/3] Creating Caddyfile...
echo.

REM Check if Caddyfile exists
if exist "Caddyfile" (
    echo [INFO] Caddyfile already exists.
    echo.
) else (
    echo [ERROR] Caddyfile not found.
    echo Please create Caddyfile first.
    pause
    exit /b 1
)

echo [OK] Caddyfile ready
echo.

echo [3/3] Checking environment variables...
echo.

REM Check .env file
if not exist ".env" (
    echo [WARNING] .env file not found.
    echo Please create .env file with DUCKDNS_TOKEN.
    echo.
) else (
    echo [OK] .env file found
)

REM Create logs directory
if not exist "logs" mkdir logs

echo.
echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure .env file has DUCKDNS_TOKEN set
echo 2. Update Caddyfile with your DuckDNS domain
echo 3. Run start_server_with_caddy.bat to start server with Caddy
echo.
pause
