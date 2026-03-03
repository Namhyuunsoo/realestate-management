@echo off
REM Change code page to UTF-8 before any Korean text
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

REM Change to script directory
cd /d "%~dp0"

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ========================================
    echo    [ERROR] Python is not installed
    echo ========================================
    echo.
    echo Please install Python 3.8 or higher:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Check Caddy (system PATH first, project folder as backup)
set CADDY_EXE=
where caddy >nul 2>&1
if not errorlevel 1 (
    REM 시스템 PATH의 Caddy 사용 (WinGet 등)
    set CADDY_EXE=caddy
    echo [INFO] Using system Caddy from PATH
) else if exist "caddy\caddy.exe" (
    REM 프로젝트 폴더의 Caddy 사용 (백업)
    set CADDY_EXE=caddy\caddy.exe
    echo [INFO] Using local Caddy from caddy folder
) else (
    echo.
    echo ========================================
    echo    [ERROR] Caddy not found
    echo ========================================
    echo.
    echo Please install Caddy via WinGet or run setup_caddy.bat
    echo.
    pause
    exit /b 1
)

REM Check if running as administrator
net session >nul 2>&1
if errorlevel 1 (
    echo.
    echo ========================================
    echo    [WARNING] Administrator rights required
    echo ========================================
    echo.
    echo Caddy needs administrator rights to use ports 80 and 443.
    echo Please run this script as Administrator.
    echo.
    echo Right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

REM Check Caddyfile
if not exist "Caddyfile" (
    echo.
    echo ========================================
    echo    [ERROR] Caddyfile not found
    echo ========================================
    echo.
    pause
    exit /b 1
)

REM Check current directory
if not exist "run.py" (
    echo.
    echo ========================================
    echo    [ERROR] run.py file not found
    echo ========================================
    echo.
    echo Current path: %CD%
    echo Please run this script from the project root directory.
    echo.
    pause
    exit /b 1
)

REM Check and activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    if errorlevel 1 (
        echo [WARNING] Virtual environment activation failed. Using system Python.
    ) else (
        echo [INFO] Virtual environment activated
    )
) else (
    echo.
    echo ========================================
    echo    [WARNING] Virtual environment not found
    echo ========================================
    echo.
    echo Virtual environment has not been created.
    echo Please run setup_new_computer.bat first.
    echo.
    pause
    exit /b 1
)

REM Load environment variables from .env if exists
if exist ".env" (
    echo [INFO] Loading environment variables from .env
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        set "%%a=%%b"
    )
)

REM Set default values if not set
if not defined PORT set PORT=5000
if not defined HOST set HOST=0.0.0.0
if not defined FLASK_DEBUG set FLASK_DEBUG=False
if not defined DUCKDNS_DOMAIN set DUCKDNS_DOMAIN=skrealestate

REM Build full domain name (add .duckdns.org if not present)
echo !DUCKDNS_DOMAIN! | findstr /C:".duckdns.org" >nul
if errorlevel 1 (
    set FULL_DOMAIN=!DUCKDNS_DOMAIN!.duckdns.org
) else (
    set FULL_DOMAIN=!DUCKDNS_DOMAIN!
)

echo [INFO] Using domain: !FULL_DOMAIN!

REM Generate Caddyfile from template
echo Generating Caddyfile...
(
    echo # Caddy configuration file
    echo # DuckDNS domain HTTPS auto setup
    echo.
    echo # HTTP to HTTPS auto redirect
    echo # Allow HTTP access for certificate issuance ^(Let's Encrypt HTTP-01 challenge^)
    echo http://!FULL_DOMAIN! {
    echo     # Allow HTTP access until certificate is issued ^(Let's Encrypt challenge^)
    echo     reverse_proxy localhost:!PORT! {
    echo         header_up Host {host}
    echo         header_up X-Real-IP {remote_host}
    echo         header_up X-Forwarded-For {remote_host}
    echo         header_up X-Forwarded-Proto {scheme}
    echo         header_down -Server
    echo     }
    echo.
    echo     log {
    echo         output file logs/caddy.log
    echo         format json
    echo     }
    echo }
    echo.
    echo # HTTPS configuration ^(auto certificate issuance^)
    echo # Caddy automatically issues Let's Encrypt certificate
    echo # HTTP-01 challenge ^(port 80 must be accessible from outside^)
    echo !FULL_DOMAIN! {
    echo     # Proxy to Flask server
    echo     reverse_proxy localhost:!PORT! {
    echo         # Header settings
    echo         header_up Host {host}
    echo         header_up X-Real-IP {remote_host}
    echo         header_up X-Forwarded-For {remote_host}
    echo         header_up X-Forwarded-Proto {scheme}
    echo.
    echo         # Downstream header settings
    echo         header_down -Server
    echo     }
    echo.
    echo     # Log settings
    echo     log {
    echo         output file logs/caddy.log
    echo         format json
    echo     }
    echo }
) > Caddyfile.tmp
move /Y Caddyfile.tmp Caddyfile >nul

REM Start DuckDNS in background
if exist "duckdns_updater.py" (
    echo [INFO] Starting DuckDNS auto IP update...
    start /b python duckdns_updater.py
)

echo.
echo ========================================
echo    Real Estate Management System Server
echo    with Caddy (HTTPS)
echo ========================================
echo.
echo Server address: http://localhost:%PORT%
echo HTTPS access: https://!FULL_DOMAIN!
echo.
echo Starting Flask server...
echo.

REM Start Flask server in background
start /b python run.py

REM Wait for server to start
echo [INFO] Waiting for Flask server to start... (3 seconds)
timeout /t 3 /nobreak >nul

REM Start Caddy
echo [INFO] Starting Caddy web server...
echo.

REM Test Caddy version first
echo [INFO] Testing Caddy...
%CADDY_EXE% version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Caddy executable is not working
    echo Caddy path: %CADDY_EXE%
    echo Please check if caddy.exe is working correctly
    echo Try running: %CADDY_EXE% version
    pause
    exit /b 1
)
echo [OK] Caddy found at: %CADDY_EXE%

REM Set Caddy environment variables
set CADDY_ENV_DUCKDNS_TOKEN=%DUCKDNS_TOKEN%

REM Start Caddy with full path
echo [INFO] Starting Caddy with config: Caddyfile
echo [INFO] Using Caddy: %CADDY_EXE%
start /b %CADDY_EXE% run --config Caddyfile --envfile .env

REM Wait for Caddy to start
echo [INFO] Waiting for Caddy to start... (5 seconds)
timeout /t 5 /nobreak >nul

REM Open web browser
echo [INFO] Opening web browser...
start https://!FULL_DOMAIN!

echo.
echo ========================================
echo    Server and Caddy are running
echo ========================================
echo.
echo Local access: http://localhost:%PORT%
echo HTTPS access: https://!FULL_DOMAIN!
echo.
echo Press Ctrl+C to stop both server and Caddy.
echo.

REM Wait for processes to end
:wait_loop
timeout /t 2 /nobreak >nul
tasklist /FI "IMAGENAME eq python.exe" 2>nul | find /I "python.exe" >nul
if not errorlevel 1 (
    goto wait_loop
)
tasklist /FI "IMAGENAME eq caddy.exe" 2>nul | find /I "caddy.exe" >nul
if not errorlevel 1 (
    goto wait_loop
)

echo.
echo [INFO] Server and Caddy have stopped.
pause
exit /b 0
