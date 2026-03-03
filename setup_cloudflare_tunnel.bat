@echo off
REM Change code page to UTF-8 before any Korean text
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

REM Change to script directory
cd /d "%~dp0"

echo ========================================
echo    Cloudflare Tunnel Setup
echo ========================================
echo.

REM Check cloudflared.exe
if not exist "cloudflared.exe" (
    echo [ERROR] cloudflared.exe not found in current directory.
    echo.
    echo Please download cloudflared.exe first:
    echo https://github.com/cloudflare/cloudflared/releases/latest
    echo.
    echo Download cloudflared-windows-amd64.exe and rename to cloudflared.exe
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking cloudflared version...
cloudflared.exe --version
if errorlevel 1 (
    echo [ERROR] cloudflared.exe is not working properly.
    pause
    exit /b 1
)
echo.

echo [2/4] Cloudflare Login
echo.
echo This will open your browser for Cloudflare authentication.
echo Please login and authorize the application.
echo.
pause
cloudflared.exe tunnel login
if errorlevel 1 (
    echo [ERROR] Login failed. Please try again.
    pause
    exit /b 1
)
echo [OK] Login successful
echo.

echo [3/4] Creating tunnel...
echo.
echo Enter tunnel name (default: realestate-tunnel)
set /p TUNNEL_NAME="Tunnel name: "
if "!TUNNEL_NAME!"=="" set TUNNEL_NAME=realestate-tunnel

cloudflared.exe tunnel create !TUNNEL_NAME!
if errorlevel 1 (
    echo [ERROR] Tunnel creation failed.
    echo.
    echo If tunnel already exists, you can skip this step.
    echo.
    pause
    exit /b 1
)
echo [OK] Tunnel created: !TUNNEL_NAME!
echo.

echo [4/4] Listing tunnels...
echo.
cloudflared.exe tunnel list
echo.

echo ========================================
echo    Setup Complete!
echo ========================================
echo.

REM Get tunnel ID
for /f "tokens=1" %%i in ('cloudflared.exe tunnel list ^| findstr /C:"realestate-tunnel"') do set TUNNEL_ID=%%i

if defined TUNNEL_ID (
    echo [INFO] Tunnel ID found: !TUNNEL_ID!
    echo.
    echo Creating config file...
    
    REM Create .cloudflared directory
    if not exist ".cloudflared" mkdir .cloudflared
    
    REM Get username
    set USERNAME=%USERNAME%
    
    REM Create config.yml
    (
        echo tunnel: realestate-tunnel
        echo credentials-file: C:\Users\!USERNAME!\.cloudflared\!TUNNEL_ID!.json
        echo.
        echo ingress:
        echo   - hostname: realestate-tunnel.trycloudflare.com
        echo     service: http://localhost:5000
        echo   - service: http_status:404
    ) > .cloudflared\config.yml
    
    echo [OK] Config file created: .cloudflared\config.yml
    echo.
    echo Please edit .cloudflared\config.yml if you need to:
    echo - Change the port number (currently 5000)
    echo - Use a custom domain
    echo.
) else (
    echo [WARNING] Could not automatically detect tunnel ID.
    echo Please manually create .cloudflared\config.yml
    echo See .cloudflared\config.yml.example for reference
    echo.
)

echo Next steps:
echo 1. Check .cloudflared\config.yml file
echo 2. Run start_server_with_cloudflare.bat to start server with tunnel
echo.
pause
