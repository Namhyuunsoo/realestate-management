# 부동산 매물 관리 시스템

Flask 기반의 부동산 매물 관리 시스템입니다. 네이버 지도 API를 통합하여 매물을 지도상에 표시하고, 고객 관리 및 브리핑 기능을 제공합니다.

## 🏗️ 프로젝트 구조

```
run/
├── app/
│   ├── __init__.py              # Flask 앱 팩토리
│   ├── config.py                # 설정 관리
│   ├── extensions.py            # 확장 기능 초기화
│   ├── core/                    # 핵심 유틸리티
│   │   ├── auth.py             # 인증 관련
│   │   ├── decorators.py       # 공통 데코레이터
│   │   ├── ids.py              # ID 생성
│   │   └── utils.py            # 유틸리티 함수
│   ├── models/                  # 데이터 모델
│   │   ├── base.py             # 기본 모델 클래스
│   │   ├── customer.py         # 고객 모델
│   │   ├── briefing.py         # 브리핑 모델
│   │   └── listing_schema.py   # 매물 스키마
│   ├── routes/                  # API 라우트
│   │   ├── auth_naver.py       # 네이버 인증
│   │   ├── briefings.py        # 브리핑 API
│   │   ├── customers.py        # 고객 API
│   │   ├── health.py           # 헬스체크
│   │   └── listings.py         # 매물 API
│   ├── services/                # 비즈니스 로직
│   │   ├── data_manager.py     # 중앙 데이터 관리자
│   │   ├── customer_service.py # 고객 서비스
│   │   ├── briefing_service.py # 브리핑 서비스
│   │   ├── listings_loader.py  # 매물 로더
│   │   └── store.py            # 기존 저장소 (호환성)
│   └── static/                  # 정적 파일
│       ├── index.html          # 메인 페이지
│       ├── css/                # 스타일시트
│       └── js/                 # 자바스크립트
├── data/                        # 데이터 저장소
│   ├── raw/                    # Excel 파일들
│   ├── cache/                  # 캐시 파일들
│   └── state/                  # 상태 파일들
├── logs/                        # 로그 파일
├── venv/                        # 가상환경
├── run.py                       # 애플리케이션 실행
└── requirements.txt             # 의존성 목록
```

## 🔧 모듈화 개선사항

### 1. **계층별 분리**
- **모델 레이어**: 데이터 구조와 검증 로직
- **서비스 레이어**: 비즈니스 로직
- **라우트 레이어**: API 엔드포인트
- **데이터 레이어**: 저장소 관리

### 2. **의존성 주입**
- `DataManager`를 통한 중앙 집중식 데이터 관리
- 서비스 인스턴스들의 자동 초기화
- 기존 코드와의 호환성 유지

### 3. **공통 기능 모듈화**
- 데코레이터를 통한 인증/검증/에러 처리
- 기본 모델 클래스를 통한 공통 기능 제공
- 믹스인을 통한 기능 확장

### 4. **설정 관리 개선**
- 환경변수 기반 설정
- 개발/운영 환경 분리 지원
- 설정 검증 및 기본값 제공

## 🚀 주요 기능

### Google Sheets 자동 동기화
- **5분마다 자동 동기화**: Google Sheets → Excel 파일 자동 다운로드
- **3개 시트 지원**: 상가임대차, 구분상가매매, 건물토지매매
- **실시간 상태 모니터링**: 동기화 상태 및 다음 실행 시간 확인
- **강제 다운로드**: 필요시 즉시 동기화 실행
- **API 할당량 최적화**: Google Drive API 효율적 사용

### 고객 관리
- 고객 정보 CRUD
- Excel 파일 기반 데이터 저장
- 지역명 자동 정규화
- 권한 기반 접근 제어

### 브리핑 시스템
- 고객별 매물 브리핑 생성
- 매물 오버라이드 및 태그 관리
- 브리핑 상태 관리

### 매물 관리
- 네이버 지도 API 통합
- 마커 클러스터링
- 필터링 및 검색
- 거리 계산

### 인증 시스템
- 네이버 로그인 연동
- 임시 이메일 로그인
- 권한 기반 접근 제어

## 🛠️ 설치 및 실행

### 1. 의존성 설치
```bash
pip install -r requirements.txt
```

### 2. 환경변수 설정
```bash
# 방법 1: 자동 생성 스크립트 사용 (추천)
python create_env.py

# 방법 2: 수동으로 .env 파일 생성
# security.env.example을 참고하여 .env 파일을 직접 생성
```

### 3. 애플리케이션 실행
```bash
python run.py
```

## 📝 API 문서

### 고객 API
- `GET /api/customers` - 고객 목록 조회
- `POST /api/customers` - 고객 생성
- `GET /api/customers/<id>` - 고객 상세 조회
- `PUT /api/customers/<id>` - 고객 정보 수정
- `DELETE /api/customers/<id>` - 고객 삭제
- `GET /api/customers/managers` - 매니저 목록 조회

### 브리핑 API
- `GET /api/briefings` - 브리핑 목록 조회
- `POST /api/briefings` - 브리핑 생성
- `GET /api/briefings/<id>` - 브리핑 상세 조회
- `POST /api/briefings/<id>/listing/<lid>/override` - 매물 오버라이드 설정
- `DELETE /api/briefings/<id>/listing/<lid>/override` - 매물 오버라이드 해제
- `POST /api/briefings/<id>/listing/<lid>/tag` - 매물 태그 설정
- `DELETE /api/briefings/<id>/listing/<lid>/tag` - 매물 태그 해제

### 매물 API
- `GET /api/listings` - 매물 목록 조회

## 🔒 보안

- X-User 헤더를 통한 사용자 인증
- 관리자 권한 기반 접근 제어
- 입력 데이터 검증 및 정규화
- 에러 처리 및 로깅

## 📊 데이터 저장

- **고객 데이터**: Excel 파일 기반 (사용자별 파일)
- **브리핑 데이터**: JSON 파일 기반
- **매물 데이터**: 캐시된 JSON 파일
- **지오코딩 캐시**: JSON 파일 기반

## 🧪 테스트

```bash
# 단위 테스트 실행
python -m pytest tests/

# 통합 테스트 실행
python -m pytest tests/integration/
```

## 📈 성능 최적화

- 매물 데이터 캐싱
- 지오코딩 결과 캐싱
- 마커 클러스터링
- 비동기 데이터 로딩

## 🔄 기존 코드 호환성

모듈화 과정에서 기존 기능과 UI는 완전히 유지되었습니다:
- 기존 API 엔드포인트 유지
- 기존 데이터 구조 유지
- 기존 UI/UX 유지
- 기존 설정 파일 호환성 유지 

# 외부 접속 방법

## 1. 로컬 네트워크 접속

### 기본 설정
- `run.py`에서 `host="0.0.0.0"`으로 설정되어 있어 로컬 네트워크에서 접속 가능
- 기본 포트: 5000

### 접속 방법
1. **같은 네트워크 내에서 접속**
   ```bash
   # 서버 실행
   python run.py
   
   # 다른 기기에서 접속 (서버 IP 확인 후)
   http://[서버IP]:5000
   ```

2. **서버 IP 확인 방법**
   - Windows: `ipconfig` 명령어로 IP 주소 확인
   - Mac/Linux: `ifconfig` 또는 `ip addr` 명령어로 IP 주소 확인

## 2. 외부 인터넷 접속

### 방법 1: ngrok 사용 (추천)
```bash
# 1. ngrok 설치 (https://ngrok.com/)
# 2. 서버 실행
python run.py

# 3. 새 터미널에서 ngrok 실행
ngrok http 5000
```

### 방법 2: Cloudflare Tunnel 사용
```bash
# 1. cloudflared 설치
# 2. 터널 생성 및 실행
cloudflared tunnel --url http://localhost:5000
```

### 방법 3: localtunnel 사용
```bash
# 1. localtunnel 설치
npm install -g localtunnel

# 2. 서버 실행 후 터널 생성
lt --port 5000
```

## 3. 포트 포워딩 (라우터 설정)

### 공유기 포트 포워딩 설정
1. 공유기 관리 페이지 접속 (보통 192.168.1.1)
2. 포트 포워딩 설정에서 외부 포트 → 내부 IP:5000으로 설정
3. 외부에서 `http://[공인IP]:[외부포트]`로 접속

## 4. 보안 고려사항

### 개발 환경에서만 사용
- `debug=True`는 개발 환경에서만 사용
- 프로덕션에서는 `debug=False`로 설정

### 방화벽 설정
- Windows 방화벽에서 5000번 포트 허용
- 공유기 방화벽 설정 확인

### HTTPS 설정 (선택사항)
```python
# SSL 인증서가 있는 경우
app.run(host="0.0.0.0", port=5000, ssl_context='adhoc')
```

## 5. 환경변수 설정

### .env 파일 생성
```env
FLASK_ENV=development
FLASK_DEBUG=1
HOST=0.0.0.0
PORT=5000
```

### 환경변수 사용
```python
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    app.run(host=host, port=port, debug=True)
``` 

# 🔒 보안 기능

## 외부 침입자 방지 시스템

### 1. **IP 기반 보안**

#### IP 차단 시스템
- **자동 차단**: 로그인 실패 5회 초과 시 IP 자동 차단 (1시간)
- **수동 차단**: 관리자가 특정 IP 수동 차단 가능
- **허용 IP 목록**: 특정 IP 범위만 접속 허용 설정 가능

#### 요청 빈도 제한
- **분당 요청 제한**: IP당 분당 최대 100회 요청 제한
- **자동 제한**: 제한 초과 시 429 에러 반환

### 2. **인증 및 권한 관리**

#### 사용자 인증
- **X-User 헤더**: 모든 API 요청에 사용자 식별 헤더 필요
- **세션 관리**: 세션 기반 인증 지원
- **관리자 권한**: 관리자 전용 기능 접근 제어

#### 권한 기반 접근 제어
- **일반 사용자**: 자신의 데이터만 접근 가능
- **관리자**: 모든 데이터 접근 및 관리 기능 사용 가능

### 3. **입력 검증 및 보안**

#### XSS 방지
- **입력 검증**: 모든 사용자 입력에 대한 XSS 패턴 검사
- **HTML 이스케이프**: 위험한 HTML 태그 자동 필터링
- **스크립트 차단**: JavaScript 코드 실행 방지

#### 파일 업로드 보안
- **파일 크기 제한**: 최대 10MB 파일 업로드 제한
- **파일 형식 검증**: 허용된 확장자만 업로드 가능
- **파일명 정리**: 위험한 문자 자동 제거

### 4. **보안 모니터링**

#### 실시간 모니터링
- **보안 이벤트 로깅**: 모든 보안 관련 이벤트 자동 기록
- **접근 로그**: 모든 API 접근 기록
- **에러 로깅**: 보안 관련 에러 상세 기록

#### 관리자 대시보드
- **보안 상태 조회**: `/api/security/status`
- **차단된 IP 목록**: `/api/security/blocked-ips`
- **로그인 시도 기록**: `/api/security/login-attempts`
- **요청 통계**: `/api/security/request-stats`

### 5. **환경별 보안 설정**

#### 개발 환경
```bash
# .env 파일 설정
SECRET_KEY=your-secret-key-here
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=300
SESSION_TIMEOUT=3600
MAX_REQUESTS_PER_MINUTE=100
REQUIRE_HTTPS=false
CSRF_PROTECTION=true
ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
```

#### 운영 환경
```bash
# 운영 환경 보안 강화 설정
REQUIRE_HTTPS=true
CSRF_PROTECTION=true
MAX_LOGIN_ATTEMPTS=3
LOCKOUT_DURATION=600
MAX_REQUESTS_PER_MINUTE=50
ALLOWED_IPS=your-allowed-ip-ranges
```

### 6. **보안 API 엔드포인트**

#### 보안 상태 조회
```bash
GET /api/security/status
# 현재 IP의 보안 상태 조회
```

#### IP 관리
```bash
GET /api/security/blocked-ips
# 차단된 IP 목록 조회

POST /api/security/block-ip
# IP 수동 차단
{
  "ip": "192.168.1.100",
  "reason": "Suspicious activity"
}

DELETE /api/security/unblock-ip/<ip>
# IP 차단 해제
```

#### 보안 통계
```bash
GET /api/security/login-attempts
# 로그인 시도 기록 조회

GET /api/security/request-stats
# 요청 통계 조회

POST /api/security/clear-stats
# 보안 통계 초기화
```

### 7. **추가 보안 권장사항**

#### 네트워크 보안
- **방화벽 설정**: 5000번 포트만 외부 접속 허용
- **VPN 사용**: 외부 접속 시 VPN 통신 권장
- **HTTPS 적용**: 운영 환경에서는 반드시 HTTPS 사용

#### 시스템 보안
- **정기 업데이트**: 시스템 및 라이브러리 정기 업데이트
- **백업**: 중요 데이터 정기 백업
- **모니터링**: 시스템 리소스 및 로그 정기 모니터링

#### 사용자 교육
- **강력한 비밀번호**: 복잡한 비밀번호 사용 권장
- **정기 비밀번호 변경**: 3개월마다 비밀번호 변경
- **의심스러운 활동 신고**: 보안 관련 의심사항 즉시 신고

### 8. **보안 이벤트 대응**

#### 자동 대응
- **IP 차단**: 의심스러운 활동 자동 감지 및 차단
- **요청 제한**: 과도한 요청 자동 제한
- **세션 만료**: 비활성 세션 자동 만료

#### 수동 대응
- **관리자 알림**: 보안 이벤트 발생 시 관리자 알림
- **로그 분석**: 보안 로그 정기 분석
- **정책 업데이트**: 보안 정책 정기 검토 및 업데이트 

## 🔐 인증 시스템

### 이메일/비밀번호 기반 인증

작은 사무실 규모에 최적화된 간단하고 안전한 인증 시스템을 제공합니다.

#### 주요 기능
- **회원가입**: 이메일, 비밀번호, 이름으로 간단한 회원가입
- **관리자 승인**: 새 사용자는 관리자 승인 후 로그인 가능
- **비밀번호 보안**: SHA-256 해시화, 최소 6자 이상
- **계정 잠금**: 로그인 실패 5회 시 30분간 자동 잠금
- **세션 관리**: 안전한 세션 기반 인증

#### 사용자 상태
- **pending**: 승인 대기 중
- **approved**: 승인됨 (로그인 가능)
- **rejected**: 거부됨
- **inactive**: 비활성화됨

#### 관리자 기능
- 사용자 승인/거부/비활성화
- 비밀번호 초기화
- 사용자 역할 변경 (user/admin)
- 사용자 통계 조회

#### 기본 관리자 계정
```
이메일: admin@example.com
비밀번호: admin123
```
⚠️ 보안을 위해 로그인 후 반드시 비밀번호를 변경하세요!

### API 엔드포인트

#### 인증 API
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보
- `PUT /api/auth/change-password` - 비밀번호 변경
- `PUT /api/auth/profile` - 프로필 업데이트

#### 관리자 API
- `GET /api/admin/users` - 모든 사용자 목록
- `GET /api/admin/users/pending` - 승인 대기 사용자
- `POST /api/admin/users/<id>/approve` - 사용자 승인
- `POST /api/admin/users/<id>/reject` - 사용자 거부
- `POST /api/admin/users/<id>/deactivate` - 사용자 비활성화
- `POST /api/admin/users/<id>/reset-password` - 비밀번호 초기화
- `PUT /api/admin/users/<id>/role` - 사용자 역할 변경
- `GET /api/admin/stats` - 관리자 통계 