@echo off
REM Change code page to UTF-8 before any Korean text
chcp 65001 >nul 2>&1

REM Check if running as administrator
net session >nul 2>&1
if not errorlevel 1 (
    REM Already running as administrator, just run the script
    call "%~dp0start_server_with_caddy.bat"
    exit /b %ERRORLEVEL%
)

REM Not running as administrator, request elevation
echo.
echo ========================================
echo    [INFO] 관리자 권한 요청 중...
echo ========================================
echo.

REM Get the directory of this script
set SCRIPT_DIR=%~dp0
set SCRIPT_PATH=%SCRIPT_DIR%start_server_with_caddy.bat

REM Use PowerShell to request administrator privileges
powershell -Command "Start-Process -FilePath '%SCRIPT_PATH%' -WorkingDirectory '%SCRIPT_DIR%' -Verb RunAs"

exit /b 0
