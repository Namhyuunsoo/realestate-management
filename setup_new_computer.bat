@echo off
REM Change code page to UTF-8 before any Korean text
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ========================================
echo    Real Estate Management System Setup
echo ========================================
echo.

REM Check Python installation
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed.
    echo.
    echo Please install Python 3.8 or higher:
    echo https://www.python.org/downloads/
    echo.
    echo Run this script again after installation.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python !PYTHON_VERSION! installed
echo.

REM Create virtual environment
echo [2/5] Creating virtual environment...
if exist "venv" (
    echo [INFO] Virtual environment already exists. Using existing environment.
) else (
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Virtual environment creation failed
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)
echo.

REM Activate virtual environment and install dependencies
echo [3/5] Installing Python packages...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Virtual environment activation failed
    pause
    exit /b 1
)

python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Package installation failed
    pause
    exit /b 1
)
echo [OK] Packages installed
echo.

REM Check .env file
echo [4/5] Checking environment variable file...
if exist ".env" (
    echo [OK] .env file already exists.
) else (
    echo [WARNING] .env file not found.
    if exist "env_example.txt" (
        copy env_example.txt .env >nul
        echo [INFO] Copied env_example.txt to .env
        echo [WARNING] Please edit .env file with actual values!
        echo           Especially the following items must be modified:
        echo           - SECRET_KEY
        echo           - NAVER_MAPS_NCP_CLIENT_ID
        echo           - NAVER_MAPS_NCP_CLIENT_SECRET
    ) else (
        echo [ERROR] env_example.txt file not found.
    )
)
echo.

REM Check service_account.json
echo [5/5] Checking Google service account file...
if exist "service_account.json" (
    echo [OK] service_account.json file exists.
) else (
    echo [WARNING] service_account.json file not found.
    echo           This file is required for Google Sheets functionality.
    echo           Download service account key from Google Cloud Console
    echo           and save it as service_account.json in project root.
)
echo.

REM Check data directories
if not exist "data" (
    mkdir data
    mkdir data\raw
    mkdir data\cache
    mkdir data\state
    echo [INFO] Data directories created
)

echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env file with actual values
echo 2. Check service_account.json if available
echo 3. Run start_server.bat to start the server
echo.
pause
