# 부동산 관리 시스템 설치 가이드

## 🚀 자동 설치 (권장)

### 1단계: 설치 파일 다운로드
- `install_realestate_system.bat` 파일을 다운로드합니다.

### 2단계: 관리자 권한으로 실행
1. `install_realestate_system.bat` 파일을 마우스 우클릭
2. "관리자 권한으로 실행" 선택
3. 설치 과정을 기다립니다 (약 5-10분 소요)

### 3단계: 서버 시작
설치 완료 후 자동으로 서버가 시작되거나, 수동으로 시작하려면:
- `C:\realestate-management\start_server.bat` 파일 실행

## 📋 설치 과정에서 자동으로 처리되는 항목

### 필수 소프트웨어 설치
- ✅ Python 3.12 (자동 다운로드 및 설치)
- ✅ Git (자동 다운로드 및 설치)
- ✅ Python 패키지들 (Flask, pandas, openpyxl 등)

### 프로젝트 설정
- ✅ GitHub에서 최신 코드 다운로드
- ✅ Python 가상환경 생성
- ✅ 의존성 패키지 설치
- ✅ 환경변수 파일 (.env) 생성
- ✅ Windows 방화벽 포트 5000 허용

## 🌐 접속 방법

### 로컬 접속
- http://localhost:5000

### 외부 접속
- http://[컴퓨터IP]:5000
- 예: http://192.168.1.100:5000

## ⚙️ 추가 설정 (선택사항)

### Google Sheets 연동
1. `C:\realestate-management\config\service_account.json` 파일 추가
2. Google Cloud Console에서 서비스 계정 키 다운로드
3. 파일명을 `service_account.json`으로 변경하여 `config` 폴더에 배치

### Naver API 연동
1. `C:\realestate-management\.env` 파일 편집
2. 다음 항목들에 실제 API 키 입력:
   ```
   NAVER_MAPS_NCP_CLIENT_ID=your_client_id
   NAVER_MAPS_NCP_CLIENT_SECRET=your_client_secret
   NAVER_LOGIN_CLIENT_ID=your_login_client_id
   NAVER_LOGIN_CLIENT_SECRET=your_login_client_secret
   ```

### 사용자 권한 설정
1. `C:\realestate-management\.env` 파일 편집
2. 다음 항목들에 사용자 정보 입력:
   ```
   ALLOWED_USERS=user1,user2,user3
   ADMIN_USERS=admin1,admin2
   ```

## 🔧 문제 해결

### Python 설치 실패
- 수동으로 Python 3.12 설치: https://www.python.org/downloads/
- 설치 시 "Add Python to PATH" 옵션 체크

### Git 설치 실패
- 수동으로 Git 설치: https://git-scm.com/download/win

### 포트 5000 사용 중
- 다른 프로그램이 포트 5000을 사용 중일 수 있습니다
- `.env` 파일에서 `PORT=5001`로 변경 후 서버 재시작

### 방화벽 문제
- Windows 방화벽에서 포트 5000 허용
- 또는 `netsh advfirewall firewall add rule name="RealEstate" dir=in action=allow protocol=TCP localport=5000` 명령어 실행

## 📁 설치된 파일 구조

```
C:\realestate-management\
├── app\                    # 애플리케이션 소스코드
├── data\                   # 데이터 파일들
├── venv\                   # Python 가상환경
├── .env                    # 환경변수 설정
├── requirements.txt        # Python 패키지 목록
├── run.py                  # 서버 실행 파일
├── start_server.bat        # 서버 시작 스크립트
└── config/
    └── service_account.json    # Google API 키 (수동 추가)
```

## 🆘 지원

문제가 발생하면 다음을 확인해주세요:
1. 관리자 권한으로 설치했는지 확인
2. 인터넷 연결 상태 확인
3. Windows 방화벽 설정 확인
4. 포트 5000 사용 여부 확인

## 📝 라이선스

이 프로젝트는 개인 사용을 위한 부동산 관리 시스템입니다.


