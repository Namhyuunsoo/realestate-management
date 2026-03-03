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

REM Check cloudflared.exe
if not exist "cloudflared.exe" (
    echo.
    echo ========================================
    echo    [ERROR] cloudflared.exe not found
    echo ========================================
    echo.
    echo Please download cloudflared.exe to project root directory.
    echo Download from: https://github.com/cloudflare/cloudflared/releases/latest
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

REM Set environment variables from .env if exists
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

echo.
echo ========================================
echo    Real Estate Management System Server
echo    with Cloudflare Tunnel (HTTPS)
echo ========================================
echo.
echo Server address: http://localhost:%PORT%
echo.
echo Starting Cloudflare Tunnel...
echo.

REM Start Cloudflare Tunnel in background
start /b cloudflared.exe tunnel run realestate-tunnel

REM Wait for tunnel to initialize
echo [INFO] Waiting for Cloudflare Tunnel to initialize... (5 seconds)
timeout /t 5 /nobreak >nul

REM Start Flask server in background
echo [INFO] Starting Flask server...
start /b python run.py

REM Wait for server to start
echo [INFO] Waiting for server to start... (3 seconds)
timeout /t 3 /nobreak >nul

REM Open web browser to localhost
echo [INFO] Opening web browser...
start http://localhost:%PORT%

echo.
echo ========================================
echo    Server and Tunnel are running
echo ========================================
echo.
echo Local access: http://localhost:%PORT%
echo.
echo Cloudflare Tunnel URL will be displayed in the tunnel window.
echo Check the cloudflared.exe output for the HTTPS URL.
echo.
echo Press Ctrl+C to stop both server and tunnel.
echo.

REM Wait for processes to end
:wait_loop
timeout /t 2 /nobreak >nul
tasklist /FI "IMAGENAME eq python.exe" 2>nul | find /I "python.exe" >nul
if not errorlevel 1 (
    goto wait_loop
)
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I "cloudflared.exe" >nul
if not errorlevel 1 (
    goto wait_loop
)

echo.
echo [INFO] Server and tunnel have stopped.
pause
exit /b 0
