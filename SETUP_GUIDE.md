# 다른 컴퓨터로 옮기기 가이드

## 📦 옮기기 전 준비사항

### 1. 옮길 파일 목록

다음 파일/폴더를 **전체**로 복사하세요:

```
realestate-management/
├── app/                    # 전체 폴더
├── data/                   # 전체 폴더 (데이터 포함)
├── logs/                   # 전체 폴더 (선택사항)
├── scripts/                # 전체 폴더 (있는 경우)
├── .env                    # ⚠️ 중요: 환경변수 파일
├── service_account.json    # ⚠️ 중요: Google 서비스 계정
├── requirements.txt        # Python 패키지 목록
├── run.py                  # 메인 실행 파일
├── start_server.bat        # 서버 시작 스크립트
└── setup_new_computer.bat  # 초기 설정 스크립트
```

### 2. 옮기면 안 되는 것

다음은 **옮기지 마세요** (자동으로 생성됨):

- `venv/` - 가상환경 (다른 컴퓨터에서 재생성 필요)
- `__pycache__/` - Python 캐시
- `*.pyc` - 컴파일된 Python 파일
- `logs/*.log` - 로그 파일 (선택사항)

---

## 🚀 새 컴퓨터에서 설정하기

### 방법 1: 자동 설정 (추천)

1. **프로젝트 폴더를 새 컴퓨터로 복사**
   - `venv` 폴더는 제외하고 복사

2. **Python 설치 확인**
   - Python 3.8 이상이 설치되어 있어야 합니다
   - 설치되어 있지 않으면: https://www.python.org/downloads/

3. **자동 설정 스크립트 실행**
   ```cmd
   setup_new_computer.bat
   ```
   
   이 스크립트가 자동으로:
   - Python 버전 확인
   - 가상환경 생성
   - 필요한 패키지 설치
   - .env 파일 생성 (없는 경우)
   - 필요한 디렉토리 생성

4. **환경변수 설정**
   - `.env` 파일을 열어서 실제 값으로 수정
   - 특히 다음 항목은 **반드시** 수정:
     ```env
     SECRET_KEY=랜덤한-긴-문자열-생성
     NAVER_MAPS_NCP_CLIENT_ID=실제_네이버_클라이언트_ID
     NAVER_MAPS_NCP_CLIENT_SECRET=실제_네이버_시크릿
     ADMIN_EMAIL=관리자_이메일
     ADMIN_PASSWORD=관리자_비밀번호
     ```

5. **서버 시작**
   ```cmd
   start_server.bat
   ```

### 방법 2: 수동 설정

#### 1단계: Python 설치
- Python 3.8 이상 설치: https://www.python.org/downloads/
- 설치 시 "Add Python to PATH" 체크

#### 2단계: 가상환경 생성
```cmd
python -m venv venv
```

#### 3단계: 가상환경 활성화
```cmd
venv\Scripts\activate.bat
```

#### 4단계: 패키지 설치
```cmd
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### 5단계: 환경변수 설정
```cmd
copy env_example.txt .env
```
그리고 `.env` 파일을 열어서 실제 값으로 수정

#### 6단계: 서버 시작
```cmd
start_server.bat
```

---

## ⚠️ 필수 확인사항

### 1. .env 파일 설정

`.env` 파일에서 다음 항목을 반드시 확인/수정하세요:

```env
# 보안 (반드시 변경!)
SECRET_KEY=여기에-랜덤한-긴-문자열-입력

# 네이버 지도 API (필수)
NAVER_MAPS_NCP_CLIENT_ID=실제_클라이언트_ID
NAVER_MAPS_NCP_CLIENT_SECRET=실제_시크릿

# 관리자 계정 (필수)
ADMIN_EMAIL=관리자@이메일.com
ADMIN_PASSWORD=비밀번호

# Google Sheets (선택사항 - 사용하는 경우만)
SPREADSHEET_ID=스프레드시트_ID
```

### 2. service_account.json 파일

Google Sheets 기능을 사용하는 경우:
- Google Cloud Console에서 서비스 계정 키 다운로드
- 프로젝트 루트에 `service_account.json`으로 저장

### 3. 데이터 파일

`data/` 폴더의 내용:
- `data/raw/` - Excel 파일들 (매물 데이터)
- `data/state/` - JSON 파일들 (고객, 브리핑 데이터)
- `data/cache/` - 캐시 파일들

**중요**: 이 파일들을 함께 옮겨야 기존 데이터를 사용할 수 있습니다.

---

## 🔧 문제 해결

### Python을 찾을 수 없습니다
- Python이 설치되어 있는지 확인: `python --version`
- PATH에 Python이 추가되어 있는지 확인
- Python 재설치 시 "Add Python to PATH" 체크

### 패키지 설치 실패
```cmd
# pip 업그레이드 후 재시도
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 가상환경 활성화 실패
```cmd
# 가상환경 재생성
rmdir /s /q venv
python -m venv venv
venv\Scripts\activate.bat
```

### 서버 시작 실패
1. `.env` 파일이 있는지 확인
2. `service_account.json` 파일이 있는지 확인 (Google Sheets 사용 시)
3. 포트 5000이 사용 중인지 확인
4. 방화벽 설정 확인

### 데이터가 보이지 않음
- `data/` 폴더가 제대로 복사되었는지 확인
- `data/raw/` 폴더에 Excel 파일이 있는지 확인
- `data/state/` 폴더에 JSON 파일이 있는지 확인

---

## 📝 체크리스트

옮기기 전:
- [ ] Python 3.8 이상 설치 확인
- [ ] 프로젝트 폴더 전체 복사 (venv 제외)
- [ ] .env 파일 복사
- [ ] service_account.json 파일 복사 (있는 경우)
- [ ] data/ 폴더 전체 복사

옮긴 후:
- [ ] setup_new_computer.bat 실행
- [ ] .env 파일 수정 (SECRET_KEY, API 키 등)
- [ ] service_account.json 확인
- [ ] start_server.bat 실행
- [ ] 브라우저에서 http://localhost:5000 접속 확인

---

## 💡 팁

### SECRET_KEY 생성 방법
```python
import secrets
print(secrets.token_hex(32))
```

또는 온라인 도구 사용:
- https://randomkeygen.com/

### 포트 변경
`.env` 파일에서:
```env
PORT=8000
```

### HTTPS 사용
`.env` 파일에서:
```env
USE_HTTPS=true
SSL_CERT_PATH=인증서_경로
SSL_KEY_PATH=개인키_경로
```

---

## 🆘 도움이 필요하신가요?

문제가 발생하면:
1. 에러 메시지를 확인하세요
2. 로그 파일 확인: `logs/app.log`
3. Python 버전 확인: `python --version`
4. 가상환경 활성화 확인: 프롬프트에 `(venv)` 표시되는지 확인
