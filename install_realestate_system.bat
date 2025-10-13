@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo    부동산 관리 시스템 자동 설치 프로그램
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

:: 설치 디렉토리 설정
set INSTALL_DIR=C:\realestate-management
set PYTHON_VERSION=3.12.0
set PYTHON_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-amd64.exe

echo [1/10] 설치 디렉토리 확인: %INSTALL_DIR%
if exist "%INSTALL_DIR%" (
    echo [WARNING] 기존 설치가 발견되었습니다. 삭제합니다...
    rmdir /s /q "%INSTALL_DIR%"
)

:: Python 설치 확인 및 다운로드
echo [2/10] Python 설치 확인 중...
python --version >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Python이 이미 설치되어 있습니다.
    python --version
) else (
    echo [INFO] Python을 다운로드하고 설치합니다...
    echo [INFO] 다운로드 URL: %PYTHON_URL%
    
    :: Python 설치 파일 다운로드
    powershell -Command "& {Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile 'python-installer.exe'}"
    
    if not exist "python-installer.exe" (
        echo [ERROR] Python 설치 파일 다운로드에 실패했습니다.
        echo 수동으로 Python 3.12를 설치해주세요: https://www.python.org/downloads/
        pause
        exit /b 1
    )
    
    :: Python 설치 (자동으로 PATH에 추가)
    echo [INFO] Python 설치 중... (잠시만 기다려주세요)
    python-installer.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
    
    :: 설치 파일 삭제
    del python-installer.exe
    
    :: PATH 새로고침
    call refreshenv
    
    :: Python 설치 확인
    python --version >nul 2>&1
    if %errorLevel% == 0 (
        echo [SUCCESS] Python 설치 완료!
        python --version
    ) else (
        echo [ERROR] Python 설치에 실패했습니다.
        echo 수동으로 Python 3.12를 설치해주세요: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

:: Git 설치 확인 및 다운로드
echo [3/10] Git 설치 확인 중...
git --version >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Git이 이미 설치되어 있습니다.
    git --version
) else (
    echo [INFO] Git을 다운로드하고 설치합니다...
    
    :: Git 설치 파일 다운로드
    powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe' -OutFile 'git-installer.exe'}"
    
    if not exist "git-installer.exe" (
        echo [ERROR] Git 설치 파일 다운로드에 실패했습니다.
        echo 수동으로 Git을 설치해주세요: https://git-scm.com/download/win
        pause
        exit /b 1
    )
    
    :: Git 설치 (자동으로 PATH에 추가)
    echo [INFO] Git 설치 중... (잠시만 기다려주세요)
    git-installer.exe /SILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"
    
    :: 설치 파일 삭제
    del git-installer.exe
    
    :: PATH 새로고침
    call refreshenv
    
    :: Git 설치 확인
    git --version >nul 2>&1
    if %errorLevel% == 0 (
        echo [SUCCESS] Git 설치 완료!
        git --version
    ) else (
        echo [ERROR] Git 설치에 실패했습니다.
        echo 수동으로 Git을 설치해주세요: https://git-scm.com/download/win
        pause
        exit /b 1
    )
)

:: 프로젝트 디렉토리 생성
echo [4/10] 프로젝트 디렉토리 생성 중...
mkdir "%INSTALL_DIR%" 2>nul
cd /d "%INSTALL_DIR%"

:: GitHub에서 프로젝트 클론
echo [5/10] 프로젝트 다운로드 중...
git clone https://github.com/Namhyuunsoo/realestate-management.git .
if %errorLevel% neq 0 (
    echo [ERROR] 프로젝트 다운로드에 실패했습니다.
    echo 인터넷 연결을 확인해주세요.
    pause
    exit /b 1
)

:: 가상환경 생성
echo [6/10] Python 가상환경 생성 중...
python -m venv venv
if %errorLevel% neq 0 (
    echo [ERROR] 가상환경 생성에 실패했습니다.
    pause
    exit /b 1
)

:: 가상환경 활성화
echo [7/10] 가상환경 활성화 중...
call venv\Scripts\activate.bat

:: pip 업그레이드
echo [8/10] pip 업그레이드 중...
python -m pip install --upgrade pip

:: 의존성 설치
echo [9/10] 필요한 패키지 설치 중...
pip install -r requirements.txt
if %errorLevel% neq 0 (
    echo [ERROR] 패키지 설치에 실패했습니다.
    pause
    exit /b 1
)

:: 환경변수 파일 생성
echo [10/10] 환경 설정 파일 생성 중...
echo # 부동산 관리 시스템 환경변수 설정 > .env
echo # 포트 설정 >> .env
echo PORT=5000 >> .env
echo HOST=0.0.0.0 >> .env
echo FLASK_DEBUG=False >> .env
echo. >> .env
echo # 보안 설정 >> .env
echo SECRET_KEY=your-secret-key-here >> .env
echo. >> .env
echo # Google Sheets 설정 (필요시 수정) >> .env
echo SPREADSHEET_ID=1D14iWPeTuHAMf9m_LrtsILYEd2Z8dpjAbIfpx-WR8eY >> .env
echo. >> .env
echo # Naver API 설정 (필요시 수정) >> .env
echo NAVER_MAPS_NCP_CLIENT_ID= >> .env
echo NAVER_MAPS_NCP_CLIENT_SECRET= >> .env
echo NAVER_LOGIN_CLIENT_ID= >> .env
echo NAVER_LOGIN_CLIENT_SECRET= >> .env
echo. >> .env
echo # 사용자 설정 (필요시 수정) >> .env
echo ALLOWED_USERS= >> .env
echo ADMIN_USERS= >> .env

:: 서비스 계정 파일 확인
if not exist "..\config\service_account.json" (
    echo [WARNING] ..\config\service_account.json 파일이 없습니다.
    echo Google Sheets 기능을 사용하려면 이 파일을 추가해주세요.
)

:: 실행 스크립트 생성
echo @echo off > start_server.bat
echo cd /d "%INSTALL_DIR%" >> start_server.bat
echo call venv\Scripts\activate.bat >> start_server.bat
echo echo ======================================== >> start_server.bat
echo echo    부동산 관리 시스템 서버 시작 >> start_server.bat
echo echo ======================================== >> start_server.bat
echo echo. >> start_server.bat
echo echo 서버 주소: http://localhost:5000 >> start_server.bat
echo echo 외부 접속: http://[컴퓨터IP]:5000 >> start_server.bat
echo echo. >> start_server.bat
echo echo 서버를 중지하려면 Ctrl+C를 누르세요. >> start_server.bat
echo echo. >> start_server.bat
echo python run.py >> start_server.bat
echo pause >> start_server.bat

:: 방화벽 규칙 추가 (포트 5000 허용)
echo [INFO] Windows 방화벽에 포트 5000 허용 규칙 추가 중...
netsh advfirewall firewall add rule name="RealEstate Management System" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1

:: 설치 완료 메시지
echo.
echo ========================================
echo           설치 완료!
echo ========================================
echo.
echo 설치 위치: %INSTALL_DIR%
echo 서버 포트: 5000
echo.
echo 서버를 시작하려면:
echo 1. %INSTALL_DIR%\start_server.bat 파일을 실행하거나
echo 2. 아래 명령어를 실행하세요:
echo.
echo    cd "%INSTALL_DIR%"
echo    start_server.bat
echo.
echo 웹 브라우저에서 http://localhost:5000 으로 접속하세요.
echo.
echo 주의사항:
echo - Google Sheets 기능을 사용하려면 ..\config\service_account.json 파일을 추가하세요.
echo - Naver API 기능을 사용하려면 .env 파일의 API 키를 설정하세요.
echo - 외부에서 접속하려면 방화벽에서 포트 5000을 허용해야 합니다.
echo.

:: 바로 서버 시작할지 묻기
set /p START_NOW="지금 서버를 시작하시겠습니까? (y/n): "
if /i "%START_NOW%"=="y" (
    echo.
    echo 서버를 시작합니다...
    start_server.bat
) else (
    echo.
    echo 설치가 완료되었습니다. 나중에 start_server.bat 파일을 실행하여 서버를 시작하세요.
)

pause


