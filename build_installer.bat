@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo    부동산 관리 시스템 설치 파일 빌드
echo ========================================
echo.

:: Inno Setup 컴파일러 경로 확인
set "INNO_SETUP_PATH="
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set "INNO_SETUP_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    set "INNO_SETUP_PATH=C:\Program Files\Inno Setup 6\ISCC.exe"
) else if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" (
    set "INNO_SETUP_PATH=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
) else (
    echo [ERROR] Inno Setup을 찾을 수 없습니다.
    echo.
    echo Inno Setup 6을 설치해주세요:
    echo https://jrsoftware.org/isdl.php
    echo.
    echo 또는 Inno Setup이 설치된 경로를 직접 지정해주세요.
    pause
    exit /b 1
)

echo [INFO] Inno Setup 경로: %INNO_SETUP_PATH%
echo.

:: .env 파일 확인
echo [1/3] 필수 파일 확인 중...
if not exist ".env" (
    echo [WARNING] .env 파일이 없습니다.
    if exist "env_example.txt" (
        echo [INFO] env_example.txt를 .env로 복사합니다.
        copy env_example.txt .env >nul
        echo [WARNING] 설치 후 .env 파일을 실제 값으로 수정해주세요!
    ) else (
        echo [ERROR] env_example.txt 파일을 찾을 수 없습니다.
        pause
        exit /b 1
    )
)

:: service_account.json 확인
if not exist "service_account.json" (
    echo [WARNING] service_account.json 파일이 없습니다.
    echo           설치 파일에는 포함되지 않지만, Google Sheets 기능을 사용하려면 필요합니다.
)

echo [OK] 필수 파일 확인 완료
echo.

:: installer_output 디렉토리 생성
echo [2/3] 출력 디렉토리 준비 중...
if not exist "installer_output" (
    mkdir installer_output
)
echo [OK] 출력 디렉토리 준비 완료
echo.

:: 설치 파일 빌드
echo [3/3] 설치 파일 빌드 중...
echo.
"%INNO_SETUP_PATH%" "installer_setup.iss"

if errorlevel 1 (
    echo.
    echo [ERROR] 설치 파일 빌드 실패
    pause
    exit /b 1
)

echo.
echo ========================================
echo    빌드 완료!
echo ========================================
echo.
echo 설치 파일 위치: installer_output\부동산관리시스템_설치.exe
echo.
echo 다음 단계:
echo 1. installer_output 폴더에서 설치 파일 확인
echo 2. 설치 파일을 테스트하여 정상 작동 확인
echo 3. 배포 준비 완료
echo.
pause
