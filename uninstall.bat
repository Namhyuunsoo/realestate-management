@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo    부동산 관리 시스템 제거 프로그램
echo ========================================
echo.

:: 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] 관리자 권한으로 실행 중...
) else (
    echo [ERROR] 관리자 권한이 필요합니다.
    echo 이 파일을 마우스 우클릭하여 "관리자 권한으로 실행"을 선택해주세요.
    pause
    exit /b 1
)

set INSTALL_DIR=C:\realestate-management

echo [WARNING] 다음 디렉토리가 완전히 삭제됩니다:
echo %INSTALL_DIR%
echo.
set /p CONFIRM="정말로 삭제하시겠습니까? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo 제거가 취소되었습니다.
    pause
    exit /b 0
)

:: 프로젝트 디렉토리 삭제
echo [INFO] 프로젝트 디렉토리 삭제 중...
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%"
    echo [SUCCESS] 프로젝트 디렉토리가 삭제되었습니다.
) else (
    echo [INFO] 프로젝트 디렉토리가 존재하지 않습니다.
)

:: 방화벽 규칙 제거
echo [INFO] Windows 방화벽 규칙 제거 중...
netsh advfirewall firewall delete rule name="RealEstate Management System" >nul 2>&1

:: Python과 Git은 시스템에 남겨둠 (다른 프로젝트에서 사용할 수 있음)
echo [INFO] Python과 Git은 시스템에 남겨둡니다.
echo (다른 프로젝트에서 사용할 수 있습니다)

echo.
echo ========================================
echo           제거 완료!
echo ========================================
echo.
echo 부동산 관리 시스템이 완전히 제거되었습니다.
echo.

pause


