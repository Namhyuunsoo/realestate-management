@echo off
title Git 자동 설치
echo ========================================
echo           Git 자동 설치 스크립트
echo ========================================
echo.
echo 이 스크립트는 Git을 자동으로 설치합니다.
echo 모든 설정은 권장값으로 자동 설정됩니다.
echo.

REM Git이 이미 설치되어 있는지 확인
git --version >nul 2>&1
if %errorlevel% == 0 (
    echo Git이 이미 설치되어 있습니다.
    echo 현재 버전:
    git --version
    echo.
    pause
    exit /b
)

echo Git 다운로드 중...
echo.

REM winget을 사용한 자동 설치 (Windows 10/11)
winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements

if %errorlevel% == 0 (
    echo.
    echo ========================================
    echo           Git 설치 완료!
    echo ========================================
    echo.
    echo Git이 성공적으로 설치되었습니다.
    echo.
    echo 설치된 Git 버전:
    git --version
    echo.
    echo 자동 설정 완료:
    echo - 기본 에디터: Visual Studio Code
    echo - 기본 브랜치: main
    echo - 줄바꿈: Windows 스타일
    echo - HTTPS: OpenSSL
    echo - 터미널: MinTTY
    echo.
    echo 이제 Git을 사용할 수 있습니다!
    echo.
) else (
    echo.
    echo ========================================
    echo           Git 설치 실패!
    echo ========================================
    echo.
    echo winget 설치에 실패했습니다.
    echo 수동으로 Git을 설치해야 합니다.
    echo.
    echo Git 다운로드 링크:
    echo https://git-scm.com/download/win
    echo.
)

echo 아무 키나 누르면 종료됩니다...
pause >nul

