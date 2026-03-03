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
    echo Check "Add Python to PATH" during installation.
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
        echo.
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
    echo Continuing with system Python...
    echo.
    pause
)

REM Start DuckDNS in background
if exist "duckdns_updater.py" (
    echo [INFO] Starting DuckDNS auto IP update...
    start /b python duckdns_updater.py
)

REM Set environment variables
set PORT=5000
set HOST=0.0.0.0
set FLASK_DEBUG=False

echo.
echo ========================================
echo    Real Estate Management System Server
echo ========================================
echo.
echo Server address: http://localhost:5000
echo External access: http://[ComputerIP]:5000
if exist "duckdns_updater.py" (
    echo DuckDNS: Running in background
)
echo.
echo Press Ctrl+C to stop the server.
echo.

REM Start server in background
start /b python run.py

REM Wait for server to start
echo [INFO] Starting server... (waiting 3 seconds)
timeout /t 3 /nobreak >nul

REM Open web browser
echo [INFO] Opening web browser...
start http://localhost:5000

REM Wait for server process to end
:wait_loop
timeout /t 2 /nobreak >nul
tasklist /FI "IMAGENAME eq python.exe" 2>nul | find /I "python.exe" >nul
if not errorlevel 1 (
    goto wait_loop
)
echo.
echo [INFO] Server has stopped.
set EXIT_CODE=%ERRORLEVEL%

echo.
if %EXIT_CODE% neq 0 (
    echo ========================================
    echo    [ERROR] Server error occurred
    echo ========================================
    echo.
    echo Exit code: %EXIT_CODE%
    echo.
    echo Troubleshooting:
    echo 1. Check if Python is properly installed
    echo 2. Run setup_new_computer.bat to install packages
    echo 3. Check if .env file is properly configured
    echo.
) else (
    echo Server stopped normally.
)
pause
exit /b %EXIT_CODE%
