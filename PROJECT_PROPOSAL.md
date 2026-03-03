# 부동산 매물 관리 시스템 개발 기획안

## 📋 프로젝트 개요

### 프로젝트명
**부동산 매물 관리 시스템 (Real Estate Management System)**

### 프로젝트 목적
부동산 중개사무소의 매물 관리, 고객 관리, 브리핑 생성 및 추천 매물 관리를 통합적으로 수행할 수 있는 웹 기반 관리 시스템 구축

### 프로젝트 범위
- Google Sheets 기반 매물 데이터 자동 동기화
- 네이버 지도 API를 활용한 매물 지도 표시 및 관리
- 고객 정보 관리 및 브리핑 시스템
- 사용자 인증 및 권한 관리
- 모바일/PC 반응형 웹 애플리케이션

---

## 🏗️ 시스템 아키텍처

### 기술 스택

#### 백엔드
- **프레임워크**: Flask 3.1.1 (Python)
- **데이터 처리**: pandas, openpyxl, xlrd, odfpy
- **인증**: 세션 기반 인증, 네이버 로그인 API 연동
- **압축**: Flask-Compress (Gzip 압축)
- **보안**: CSRF 보호, XSS 방지, IP 기반 접근 제어

#### 프론트엔드
- **기술**: 순수 JavaScript (Vanilla JS), HTML5, CSS3
- **지도 API**: 네이버 지도 API (NCP)
- **UI/UX**: 반응형 디자인 (PC/모바일 대응)
- **모듈화**: ES6 모듈 시스템

#### 데이터 저장
- **파일 기반**: JSON, Excel 파일
- **캐시 시스템**: 파일 기반 캐시 (pickle, JSON)
- **Google Sheets**: 외부 데이터 소스 연동

#### 인프라
- **서버**: Python Flask 서버
- **배포**: Windows 실행 파일 (.exe) 패키징 지원
- **동적 IP**: DuckDNS 자동 업데이트
- **SSL**: Let's Encrypt 인증서 지원 (선택사항)

---

## 🎯 핵심 기능 상세

### 1. 매물 관리 시스템

#### 1.1 Google Sheets 자동 동기화
- **기능**: Google Sheets에서 Excel 파일로 자동 다운로드
- **동기화 주기**: 5분마다 자동 실행 (설정 가능)
- **지원 시트**: 
  - 상가임대차
  - 구분상가매매
  - 건물토지매매
- **상태 모니터링**: 동기화 상태 및 다음 실행 시간 표시
- **강제 동기화**: 관리자가 수동으로 즉시 동기화 실행 가능
- **API 최적화**: Google Drive API 할당량 효율적 사용

#### 1.2 매물 데이터 로딩 및 캐싱
- **캐시 시스템**: 매물 데이터를 JSON 파일로 캐싱하여 성능 최적화
- **강제 새로고침**: 필요 시 캐시 무시하고 최신 데이터 로드
- **데이터 정규화**: Excel 데이터를 표준화된 JSON 형식으로 변환
- **상태 필터링**: 매물 상태별 필터링 (생, 계, 완, 보류 등)

#### 1.3 네이버 지도 통합
- **지도 표시**: 매물 위치를 네이버 지도에 마커로 표시
- **마커 클러스터링**: 많은 매물을 효율적으로 표시
- **지도 컨트롤**:
  - 로드뷰 (거리뷰)
  - 로드뷰 미니맵
  - 지적도 보기
  - 거리 측정 도구
- **지오코딩**: 주소를 좌표로 변환하여 지도에 표시
- **지오코딩 캐시**: 지오코딩 결과를 캐싱하여 API 호출 최소화
- **자동 지오코딩**: 주기적으로 주소가 없는 매물 자동 지오코딩

#### 1.4 매물 필터링 및 검색
- **다중 필터**: 
  - 지역 (시/구/동)
  - 매물 유형
  - 상태
  - 가격대
  - 면적
- **거리 기반 필터**: 특정 위치 기준 반경 검색
- **고급 검색**: 복합 조건 검색 지원

#### 1.5 매물 상세 정보
- **상세 패널**: 매물 클릭 시 상세 정보 표시
- **매물 정보**: 주소, 가격, 면적, 상태 등 모든 정보 표시
- **고객 연결**: 해당 매물을 추천한 고객 정보 표시

### 2. 고객 관리 시스템

#### 2.1 고객 정보 관리 (CRUD)
- **고객 등록**: 이름, 전화번호, 지역, 매니저 등록
- **고객 수정**: 고객 정보 업데이트
- **고객 삭제**: 고객 정보 삭제
- **고객 조회**: 고객 목록 및 상세 정보 조회
- **Excel 기반 저장**: 사용자별 Excel 파일로 고객 데이터 저장

#### 2.2 고객 필터링
- **매니저별 필터**: 담당 매니저별 고객 조회
- **지역별 필터**: 지역명으로 고객 검색
- **상태별 필터**: 고객 상태별 필터링

#### 2.3 지역명 자동 정규화
- **자동 정규화**: 입력된 지역명을 표준 형식으로 변환
- **지역 검색 최적화**: 정규화된 지역명으로 검색 성능 향상

### 3. 브리핑 시스템

#### 3.1 브리핑 생성 및 관리
- **브리핑 생성**: 고객별로 매물 브리핑 생성
- **브리핑 목록**: 고객별 브리핑 목록 조회
- **브리핑 상세**: 브리핑에 포함된 매물 목록 및 상태 확인

#### 3.2 매물 오버라이드
- **오버라이드 설정**: 브리핑 내 특정 매물 정보 수정
- **오버라이드 해제**: 수정된 정보를 원본으로 복원
- **브리핑별 독립 관리**: 각 브리핑의 오버라이드 정보 독립 관리

#### 3.3 매물 태그 관리
- **태그 추가**: 브리핑 내 매물에 태그 추가
- **태그 삭제**: 매물에서 태그 제거
- **태그별 필터링**: 태그로 매물 필터링

#### 3.4 브리핑 상태 관리
- **상태 종류**:
  - normal: 일반
  - pending: 대기 중
  - completed: 완료
  - onhold: 보류
- **상태 변경**: 브리핑 상태 업데이트
- **상태별 필터링**: 상태로 브리핑 필터링

### 4. 추천 매물 시스템

#### 4.1 추천 매물 등록
- **추천 등록**: 특정 매물을 고객에게 추천
- **추천 이유**: 추천 이유 입력 및 저장
- **추천 이력**: 사용자별 추천 매물 이력 관리

#### 4.2 추천 매물 조회
- **전체 추천 목록**: 모든 추천 매물 조회
- **사용자별 추천**: 특정 사용자가 추천한 매물 조회
- **매물별 추천 정보**: 특정 매물의 추천 정보 및 댓글 조회

#### 4.3 추천 댓글 시스템
- **댓글 추가**: 추천 매물에 댓글 추가
- **댓글 조회**: 추천 매물의 댓글 목록 조회
- **댓글 관리**: 댓글 수정 및 삭제

### 5. 사용자 인증 및 권한 관리

#### 5.1 인증 시스템
- **이메일/비밀번호 로그인**: 기본 로그인 방식
- **네이버 로그인**: 네이버 계정으로 로그인 (선택사항)
- **세션 관리**: 안전한 세션 기반 인증
- **자동 로그아웃**: 비활성 시 자동 로그아웃

#### 5.2 사용자 관리
- **회원가입**: 새 사용자 등록
- **사용자 승인**: 관리자가 새 사용자 승인/거부
- **사용자 상태 관리**:
  - pending: 승인 대기
  - approved: 승인됨
  - rejected: 거부됨
  - inactive: 비활성화
- **비밀번호 관리**: 비밀번호 변경, 초기화

#### 5.3 권한 관리
- **역할 구분**:
  - admin: 관리자 (모든 권한)
  - manager: 매니저 (제한된 관리 권한)
  - user: 일반 사용자 (기본 권한)
- **권한별 접근 제어**:
  - 일반 사용자: 자신의 데이터만 접근
  - 매니저: 담당 고객 데이터 접근
  - 관리자: 모든 데이터 접근 및 관리

#### 5.4 사용자 프로필
- **프로필 정보**: 이름, 이메일, 직책, 담당자명 등
- **시트 URL**: 개인 Google Sheets URL 설정
- **프로필 수정**: 사용자 정보 업데이트

### 6. 사용자 시트 관리

#### 6.1 시트 등록 및 관리
- **시트 등록**: 사용자별 Google Sheets 등록
- **시트 목록**: 사용자의 모든 시트 조회
- **시트 수정**: 시트 정보 업데이트
- **시트 삭제**: 시트 제거

#### 6.2 시트 동기화 설정
- **자동 동기화**: 시트별 자동 동기화 활성화/비활성화
- **동기화 주기**: 시트별 동기화 주기 설정 (기본 5분)
- **수동 동기화**: 필요 시 즉시 동기화 실행
- **동기화 상태**: 시트별 동기화 상태 모니터링

#### 6.3 시트 통계
- **시트별 통계**: 시트별 매물 수, 동기화 횟수 등
- **전체 통계**: 모든 시트의 통계 정보

### 7. 관리자 기능

#### 7.1 사용자 관리
- **사용자 목록**: 모든 사용자 조회
- **사용자 승인/거부**: 새 사용자 승인 처리
- **사용자 비활성화**: 사용자 계정 비활성화
- **역할 변경**: 사용자 역할 변경 (user/manager/admin)
- **비밀번호 초기화**: 사용자 비밀번호 초기화

#### 7.2 통계 대시보드
- **전체 통계**: 
  - 총 사용자 수
  - 활성 사용자 수
  - 총 고객 수
  - 총 매물 수
  - 총 브리핑 수
- **사용자별 통계**: 사용자별 활동 통계
- **시트 통계**: 시트별 동기화 및 데이터 통계

#### 7.3 시스템 설정
- **환경변수 관리**: 시스템 설정 변경
- **API 키 관리**: 네이버 API, Google API 키 관리
- **동기화 설정**: Google Sheets 동기화 주기 설정
- **지오코딩 설정**: 지오코딩 스케줄러 설정

### 8. 보안 기능

#### 8.1 인증 보안
- **비밀번호 해싱**: SHA-256 해시화
- **로그인 시도 제한**: 5회 실패 시 계정 잠금 (설정 가능)
- **세션 보안**: 안전한 세션 관리
- **CSRF 보호**: CSRF 토큰 기반 보호

#### 8.2 접근 제어
- **IP 기반 차단**: 의심스러운 IP 자동 차단
- **IP 허용 목록**: 특정 IP만 접근 허용 (설정 가능)
- **요청 빈도 제한**: 분당 요청 수 제한 (기본 100회)
- **권한 기반 접근**: 역할별 데이터 접근 제어

#### 8.3 입력 검증
- **XSS 방지**: 모든 사용자 입력 XSS 패턴 검사
- **입력 정규화**: 위험한 문자 자동 제거
- **파일 업로드 보안**: 파일 크기 및 형식 검증

#### 8.4 보안 모니터링
- **보안 이벤트 로깅**: 모든 보안 관련 이벤트 기록
- **접근 로그**: API 접근 기록
- **에러 로깅**: 보안 관련 에러 상세 기록

### 9. UI/UX 기능

#### 9.1 반응형 디자인
- **PC 레이아웃**: 데스크톱 최적화 레이아웃
- **모바일 레이아웃**: 모바일 기기 최적화 레이아웃
- **자동 감지**: 디바이스 자동 감지 및 레이아웃 전환
- **터치 제스처**: 모바일 터치 제스처 지원

#### 9.2 지도 인터페이스
- **지도 컨트롤**: 줌, 팬, 마커 클릭 등
- **사이드바**: 고객/매물 목록 사이드바
- **상세 패널**: 매물 상세 정보 패널
- **필터 패널**: 필터 옵션 패널

#### 9.3 모드 전환
- **중개사 모드**: 일반 매물 관리 모드
- **고객 모드**: 고객별 브리핑 모드
- **모드 전환 버튼**: 상단바에서 모드 전환

#### 9.4 사용자 인터페이스
- **상태 카운트바**: 매물 상태별 개수 표시
- **고객 컨트롤**: 고객 목록 및 등록 버튼
- **매물 리스트**: 매물 목록 표시
- **브리핑 리스트**: 브리핑 목록 표시

### 10. 성능 최적화

#### 10.1 캐싱 시스템
- **매물 데이터 캐싱**: JSON 파일 기반 캐싱
- **지오코딩 캐싱**: 지오코딩 결과 캐싱
- **API 응답 캐싱**: 자주 사용되는 API 응답 캐싱

#### 10.2 압축
- **Gzip 압축**: HTTP 응답 Gzip 압축
- **압축 레벨 최적화**: 모바일/PC별 압축 레벨 조정
- **정적 파일 캐싱**: CSS/JS 파일 브라우저 캐싱

#### 10.3 비동기 처리
- **백그라운드 서비스**: 지오코딩, 동기화 등 백그라운드 실행
- **지연 초기화**: 필요 시에만 서비스 초기화
- **비동기 로딩**: 모듈 비동기 로딩

---

## 📊 데이터 구조

### 데이터 모델

#### 사용자 (User)
```json
{
  "id": "string",
  "email": "string",
  "password_hash": "string",
  "name": "string",
  "role": "user|manager|admin",
  "status": "pending|approved|rejected|inactive",
  "job_title": "string",
  "sheet_url": "string",
  "manager_name": "string",
  "created_at": "timestamp",
  "approved_at": "timestamp",
  "approved_by": "string",
  "last_login": "timestamp",
  "failed_login_attempts": "number",
  "locked_until": "timestamp"
}
```

#### 고객 (Customer)
```json
{
  "id": "string",
  "name": "string",
  "phone": "string",
  "region": "string",
  "manager": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### 브리핑 (Briefing)
```json
{
  "id": "string",
  "customer_id": "string",
  "created_by": "string",
  "status": "normal|pending|completed|onhold",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "listings": [
    {
      "listing_id": "string",
      "override": {},
      "tags": ["string"],
      "status": "string"
    }
  ]
}
```

#### 매물 (Listing)
```json
{
  "id": "string",
  "address": "string",
  "latitude": "number",
  "longitude": "number",
  "price": "string",
  "area": "string",
  "status": "string",
  "status_raw": "string",
  "type": "string",
  "geocoded": "boolean",
  "source": "string"
}
```

#### 추천 매물 (Recommendation)
```json
{
  "listing_id": "string",
  "recommended_by": "string",
  "reason": "string",
  "created_at": "timestamp",
  "comments": [
    {
      "id": "string",
      "user": "string",
      "content": "string",
      "created_at": "timestamp"
    }
  ]
}
```

### 데이터 저장 구조

```
data/
├── raw/                    # 원본 Excel 파일
│   ├── 상가임대차.xlsx
│   ├── 구분상가매매.xlsx
│   └── 건물토지매매.xlsx
├── cache/                  # 캐시 파일
│   ├── listings_normalized.json
│   ├── listing_sheet_cache.pkl
│   └── geocode_cache.json
└── state/                  # 상태 파일
    ├── customers.json
    ├── briefings.json
    ├── recommendations.json
    └── users.json
```

---

## 🔌 API 명세

### 인증 API

#### POST /api/auth/register
회원가입
```json
{
  "email": "string",
  "password": "string",
  "name": "string"
}
```

#### POST /api/auth/login
로그인
```json
{
  "email": "string",
  "password": "string"
}
```

#### POST /api/auth/logout
로그아웃

#### GET /api/auth/me
현재 사용자 정보 조회

#### PUT /api/auth/change-password
비밀번호 변경
```json
{
  "current_password": "string",
  "new_password": "string"
}
```

### 고객 API

#### GET /api/customers
고객 목록 조회
- Query Parameters: `manager`, `region`, `limit`, `offset`

#### POST /api/customers
고객 생성
```json
{
  "name": "string",
  "phone": "string",
  "region": "string",
  "manager": "string"
}
```

#### GET /api/customers/<id>
고객 상세 조회

#### PUT /api/customers/<id>
고객 정보 수정

#### DELETE /api/customers/<id>
고객 삭제

#### GET /api/customers/managers
매니저 목록 조회

### 매물 API

#### GET /api/listings
매물 목록 조회
- Query Parameters: `force`, `status_raw`, `limit`, `offset`

#### POST /api/listings/clear-cache
매물 캐시 초기화 (관리자만)

### 브리핑 API

#### GET /api/briefings
브리핑 목록 조회

#### POST /api/briefings
브리핑 생성
```json
{
  "customer_id": "string"
}
```

#### GET /api/briefings/<id>
브리핑 상세 조회

#### POST /api/briefings/<id>/listing/<lid>/override
매물 오버라이드 설정
```json
{
  "field": "string",
  "value": "any"
}
```

#### DELETE /api/briefings/<id>/listing/<lid>/override
매물 오버라이드 해제

#### POST /api/briefings/<id>/listing/<lid>/tag
매물 태그 추가
```json
{
  "tag": "string"
}
```

#### DELETE /api/briefings/<id>/listing/<lid>/tag
매물 태그 삭제

### 추천 매물 API

#### GET /api/recommendations
추천 매물 목록 조회

#### POST /api/recommendations/<listing_id>
추천 매물 등록
```json
{
  "reason": "string"
}
```

#### DELETE /api/recommendations/<listing_id>
추천 매물 삭제

#### POST /api/recommendations/<listing_id>/comments
댓글 추가
```json
{
  "content": "string"
}
```

#### GET /api/recommendations/<listing_id>/comments
댓글 목록 조회

### 사용자 시트 API

#### GET /api/user-sheets
사용자 시트 목록 조회

#### POST /api/user-sheets
시트 생성
```json
{
  "name": "string",
  "url": "string",
  "sync_interval": "number"
}
```

#### GET /api/user-sheets/<sheet_id>
시트 상세 조회

#### PUT /api/user-sheets/<sheet_id>
시트 정보 수정

#### DELETE /api/user-sheets/<sheet_id>
시트 삭제

#### POST /api/user-sheets/<sheet_id>/toggle-active
시트 활성화/비활성화

#### POST /api/user-sheets/<sheet_id>/toggle-sync
동기화 활성화/비활성화

#### PUT /api/user-sheets/<sheet_id>/sync-interval
동기화 주기 설정
```json
{
  "interval": "number"
}
```

#### POST /api/user-sheets/<sheet_id>/test-api
API 연결 테스트

### 지오코딩 API

#### GET /api/geocoding/status
지오코딩 동기화 상태 조회

#### POST /api/geocoding/run-now
즉시 지오코딩 실행 (관리자만)

#### POST /api/geocoding/start
지오코딩 스케줄러 시작 (관리자만)

#### POST /api/geocoding/stop
지오코딩 스케줄러 중지 (관리자만)

### 관리자 API

#### GET /api/admin/users
모든 사용자 목록 조회

#### GET /api/admin/users/pending
승인 대기 사용자 목록

#### POST /api/admin/users/<id>/approve
사용자 승인

#### POST /api/admin/users/<id>/reject
사용자 거부

#### POST /api/admin/users/<id>/deactivate
사용자 비활성화

#### POST /api/admin/users/<id>/reset-password
비밀번호 초기화

#### PUT /api/admin/users/<id>/role
사용자 역할 변경
```json
{
  "role": "user|manager|admin"
}
```

#### GET /api/admin/stats
관리자 통계 조회

### 보안 API

#### GET /api/security/status
보안 상태 조회

#### GET /api/security/blocked-ips
차단된 IP 목록

#### POST /api/security/block-ip
IP 수동 차단
```json
{
  "ip": "string",
  "reason": "string"
}
```

#### DELETE /api/security/unblock-ip/<ip>
IP 차단 해제

#### GET /api/security/login-attempts
로그인 시도 기록

#### GET /api/security/request-stats
요청 통계

---

## 🎨 UI/UX 요구사항 및 화면 구성

### 디자인 원칙
- **직관적 인터페이스**: 사용자가 쉽게 이해하고 사용할 수 있는 UI
- **반응형 디자인**: PC와 모바일 모두 최적화
- **빠른 로딩**: 최소한의 로딩 시간
- **명확한 피드백**: 사용자 액션에 대한 명확한 피드백

### 전체 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────┐
│ 상단바 (Header)                                              │
│ [사무소명] [모드전환] [사용자정보] [관리자메뉴] [로그아웃]  │
├─────────────────────────────────────────────────────────────┤
│ 상태카운트바 (Status Bar)                                    │
│ [총건수/필터건수] [매물등록] [시트버튼들] [새로고침]        │
├─────────────────────────────────────────────────────────────┤
│ 상단 필터바 (PC만 표시)                                      │
│ [지역] [지번] [건물명] ... [적용] [초기화]                  │
├──────────┬──────────────────────────────┬──────────────────┤
│          │                              │                  │
│ 1차      │        메인 지도 영역        │   2차 사이드바   │
│ 사이드바 │                              │   (상세정보)     │
│          │                              │                  │
│ [고객]   │   [지도 컨트롤]               │   [패널 내용]    │
│ [매물]   │   [마커들]                    │                  │
│          │                              │                  │
└──────────┴──────────────────────────────┴──────────────────┘
```

**참고**: 각 화면의 스크린샷 이미지는 다음 위치에 저장되어야 합니다:
- `docs/images/ui/login-screen.png` - 로그인 화면
- `docs/images/ui/main-dashboard.png` - 메인 대시보드
- `docs/images/ui/customer-management.png` - 고객 관리 화면
- `docs/images/ui/briefing-screen.png` - 브리핑 화면
- `docs/images/ui/admin-screen.png` - 관리자 화면
- `docs/images/ui/mobile-view.png` - 모바일 화면

### 1. 로그인 화면

**위치**: `app/static/login.html`, 인라인 로그인 폼 (`#loginRequiredScreen`)

**화면 구성**:
```
┌─────────────────────────────┐
│   로그인이 필요합니다        │
│                             │
│   이메일: [____________]    │
│   비밀번호: [_________]     │
│                             │
│   [로그인 버튼]             │
│                             │
│   [회원가입] [비밀번호찾기] │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `inlineLoginEmail` | 이메일 입력 필드 | 사용자 이메일 입력 | `docs/images/ui/login-email-field.png` |
| `inlineLoginPassword` | 비밀번호 입력 필드 | 비밀번호 입력 (마스킹) | `docs/images/ui/login-password-field.png` |
| `inlineLoginForm` (submit) | 로그인 버튼 | 이메일/비밀번호로 로그인 | `docs/images/ui/login-button.png` |
| `/register` 링크 | 회원가입 링크 | 회원가입 페이지로 이동 | `docs/images/ui/register-link.png` |
| 비밀번호 찾기 링크 | 비밀번호 찾기 | 관리자 문의 안내 | `docs/images/ui/password-reset-link.png` |

**동작 흐름**:
1. 사용자가 이메일과 비밀번호 입력
2. "로그인" 버튼 클릭
3. 서버에 인증 요청
4. 성공 시 메인 대시보드로 이동
5. 실패 시 에러 메시지 표시

---

### 2. 메인 대시보드

**위치**: `app/static/index.html` - `#appRoot`

#### 2.1 상단바 (Header)

**위치**: `#topbar`

**화면 구성**:
```
┌────────────────────────────────────────────────────────────┐
│ SK공인중개사사무소  [중개사👥]  직책/사용자명  [사용자관리] [통계] [로그아웃] │
└────────────────────────────────────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `officeName` | 사무소명 표시 | "SK공인중개사사무소" 표시 (수정 불가) | `docs/images/ui/header-office-name.png` |
| `modeToggleBtn` | 모드 전환 버튼 | "중개사" ↔ "고객" 모드 전환 | `docs/images/ui/mode-toggle-button.png` |
| `modeText` | 모드 텍스트 | 현재 모드 표시 ("중개사" 또는 "고객") | `docs/images/ui/mode-text.png` |
| `modeIcon` | 모드 아이콘 | 모드별 아이콘 표시 (👥 또는 👤) | `docs/images/ui/mode-icon.png` |
| `userRoleName` | 사용자 정보 표시 | "직책 / 사용자명" 형식으로 표시 | `docs/images/ui/user-info.png` |
| `userManagementBtn` | 사용자 관리 버튼 | 관리자만 표시, 사용자 관리 모달 열기 | `docs/images/ui/user-management-button.png` |
| `adminStatsBtn` | 통계 버튼 | 관리자만 표시, 통계 모달 열기 | `docs/images/ui/admin-stats-button.png` |
| `logoutBtn` | 로그아웃 버튼 (PC) | PC에서 표시, 로그아웃 실행 | `docs/images/ui/logout-button-pc.png` |
| `mobileLogoutBtn` | 로그아웃 버튼 (모바일) | 모바일에서 표시, 로그아웃 실행 | `docs/images/ui/logout-button-mobile.png` |

**동작 흐름**:
- **모드 전환**: 클릭 시 중개사 모드 ↔ 고객 모드 전환
- **사용자 관리**: 관리자만 보임, 클릭 시 사용자 관리 모달 열기
- **통계**: 관리자만 보임, 클릭 시 통계 모달 열기
- **로그아웃**: 클릭 시 로그아웃 확인 후 로그인 화면으로 이동

#### 2.2 상태 카운트바 (Status Bar)

**위치**: `#statusCounts`

**화면 구성**:
```
┌────────────────────────────────────────────────────────────┐
│ 총 0건 / 필터 후 0건  [📝 매물등록]  [시트1] [시트2] ... [선택된 시트 열기] [🔄 새로고침] 마지막 업데이트: 00:00:00 │
└────────────────────────────────────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `countTotal` | 총 건수 표시 | 전체 매물 개수 표시 | `docs/images/ui/total-count.png` |
| `countFiltered` | 필터 후 건수 표시 | 필터 적용 후 매물 개수 표시 | `docs/images/ui/filtered-count.png` |
| `addListingBtn` | 매물등록 버튼 | 매물 등록 모달 열기 | `docs/images/ui/add-listing-button.png` |
| `.sheet-button` | 시트 버튼들 | 사용자별 시트 선택 버튼 (동적 생성) | `docs/images/ui/sheet-buttons.png` |
| `openGoogleSheetBtn` | 선택된 시트 열기 | 현재 선택된 시트를 새 탭에서 열기 | `docs/images/ui/open-sheet-button.png` |
| `refreshDataBtn` | 새로고침 버튼 | 매물 데이터 강제 새로고침 | `docs/images/ui/refresh-button.png` |
| `lastUpdateTime` | 마지막 업데이트 시간 | 마지막 데이터 업데이트 시간 표시 | `docs/images/ui/last-update-time.png` |

**동작 흐름**:
- **매물등록**: 클릭 시 매물 등록 모달 열기
- **시트 선택**: 시트 버튼 클릭 시 해당 시트의 매물만 표시
- **시트 열기**: 클릭 시 선택된 시트를 Google Sheets에서 새 탭으로 열기
- **새로고침**: 클릭 시 캐시 무시하고 최신 데이터 로드

#### 2.3 상단 필터바 (PC 전용)

**위치**: `#topFilterBar` (모바일에서는 숨김)

**화면 구성**:
```
┌────────────────────────────────────────────────────────────┐
│ 지역 │ 지번 │ 건물명 │ 층수 │ 가게명 │ 분양 │ 실평수 │ ... │
│ [__] │ [__] │ [___] │ [__] │ [___] │ [__] │ [___] │ ... │
│                                                      [적용] [초기화] │
└────────────────────────────────────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `tf_region` | 지역 필터 | 지역명으로 검색 (쉼표로 복수 검색) | `docs/images/ui/filter-region.png` |
| `tf_jibun` | 지번 필터 | 지번으로 검색 (예: 123-45, 12-3) | `docs/images/ui/filter-jibun.png` |
| `tf_building` | 건물명 필터 | 건물명으로 검색 | `docs/images/ui/filter-building.png` |
| `tf_floor` | 층수 필터 | 층수로 검색 (단일 또는 a-b 범위) | `docs/images/ui/filter-floor.png` |
| `tf_store` | 가게명 필터 | 가게명으로 검색 | `docs/images/ui/filter-store.png` |
| `tf_area_sale` | 분양 필터 | 분양평으로 검색 (>=값 또는 a-b) | `docs/images/ui/filter-area-sale.png` |
| `tf_area_real` | 실평수 필터 | 실평수로 검색 (>=값 또는 a-b) | `docs/images/ui/filter-area-real.png` |
| `tf_deposit` | 보증금 필터 | 보증금으로 검색 (<=값 또는 a-b) | `docs/images/ui/filter-deposit.png` |
| `tf_rent` | 월세 필터 | 월세로 검색 (<=값 또는 a-b) | `docs/images/ui/filter-rent.png` |
| `tf_premium` | 권리금 필터 | 권리금으로 검색 (<=값 또는 a-b) | `docs/images/ui/filter-premium.png` |
| `tf_note` | 비고 필터 | 비고 내용으로 검색 | `docs/images/ui/filter-note.png` |
| `tf_manager` | 담당자 필터 | 담당자명으로 검색 | `docs/images/ui/filter-manager.png` |
| `tf_region2` | 지역2 필터 | 지역2로 검색 | `docs/images/ui/filter-region2.png` |
| `tf_phone` | 연락처 필터 | 연락처로 검색 | `docs/images/ui/filter-phone.png` |
| `tf_client` | 의뢰인 필터 | 의뢰인명으로 검색 | `docs/images/ui/filter-client.png` |
| `tf_note3` | 비고3 필터 | 비고3 내용으로 검색 | `docs/images/ui/filter-note3.png` |
| `topFilterApplyBtn` | 적용 버튼 | 필터 조건 적용 | `docs/images/ui/filter-apply-button.png` |
| `topFilterResetBtn` | 초기화 버튼 | 모든 필터 초기화 | `docs/images/ui/filter-reset-button.png` |

**동작 흐름**:
1. 필터 입력 필드에 조건 입력
2. "적용" 버튼 클릭 또는 Enter 키 입력
3. 필터 조건에 맞는 매물만 지도와 목록에 표시
4. "초기화" 버튼 클릭 시 모든 필터 초기화

#### 2.4 1차 사이드바 (Primary Sidebar)

**위치**: `#sidebar`

**화면 구성**:
```
┌─────────────────┐
│ [◀] 접기/펼치기 │
├─────────────────┤
│ 고객 컨트롤      │
│ [고객List]      │
│ [신규등록]      │
│                 │
│ (고객 목록)     │
│ (선택 고객 정보) │
├─────────────────┤
│ 매물 리스트      │
│ [매물리스트]    │
│ [브리핑리스트]   │
│                 │
│ [전체보기]      │
│ [최신] [면적]   │
│ [보증금] [월세] │
│ [색인]          │
│                 │
│ (매물 목록)     │
└─────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `sidebarToggleBtn` | 사이드바 토글 | 사이드바 접기/펼치기 | `docs/images/ui/sidebar-toggle.png` |
| `customerListBtn` | 고객List 버튼 | 고객 목록 표시/숨김 | `docs/images/ui/customer-list-button.png` |
| `newCustomerBtn` | 신규등록 버튼 | 새 고객 등록 폼 열기 | `docs/images/ui/new-customer-button.png` |
| `customerListContainer` | 고객 목록 영역 | 고객 목록이 동적으로 표시됨 | `docs/images/ui/customer-list-container.png` |
| `selectedCustomerInfo` | 선택 고객 정보 | 선택된 고객의 상세 정보 표시 | `docs/images/ui/selected-customer-info.png` |
| `propertyListBtn` | 매물리스트 버튼 | 매물 리스트 모드로 전환 | `docs/images/ui/property-list-button.png` |
| `briefingListBtn` | 브리핑리스트 버튼 | 브리핑 리스트 모드로 전환 | `docs/images/ui/briefing-list-button.png` |
| `viewAllBtn` | 전체보기 버튼 | 전체 매물 목록 패널 열기 | `docs/images/ui/view-all-button.png` |
| `.sortBtn[data-sort="latest"]` | 최신 정렬 | 최신순으로 정렬 | `docs/images/ui/sort-latest-button.png` |
| `.sortBtn[data-sort="area"]` | 면적 정렬 | 면적순으로 정렬 | `docs/images/ui/sort-area-button.png` |
| `.sortBtn[data-sort="deposit"]` | 보증금 정렬 | 보증금순으로 정렬 | `docs/images/ui/sort-deposit-button.png` |
| `.sortBtn[data-sort="rent"]` | 월세 정렬 | 월세순으로 정렬 | `docs/images/ui/sort-rent-button.png` |
| `.sortBtn[data-sort="index"]` | 색인 정렬 | 색인순으로 정렬 | `docs/images/ui/sort-index-button.png` |
| `listingList` | 매물 목록 | 매물 목록이 동적으로 표시됨 | `docs/images/ui/listing-list.png` |

**동작 흐름**:
- **고객List**: 클릭 시 고객 목록 표시, 다시 클릭 시 숨김
- **신규등록**: 클릭 시 2차 사이드바에 고객 등록 폼 표시
- **매물리스트/브리핑리스트**: 모드 전환 버튼, 클릭 시 해당 모드로 전환
- **정렬 버튼들**: 클릭 시 해당 기준으로 매물 목록 정렬
- **전체보기**: 클릭 시 전체 매물 목록 패널 열기

#### 2.5 메인 지도 영역

**위치**: `#mainContent` > `#mapWrap` > `#map`

**화면 구성**:
```
┌─────────────────────────────────────┐
│                                     │
│         네이버 지도                  │
│                                     │
│    [브리핑필터] [로드뷰] [위성]     │
│    [필터] [고객필터해제]            │
│                                     │
│    (마커들)                         │
│                                     │
└─────────────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `map` | 네이버 지도 | 매물 위치를 마커로 표시하는 지도 | `docs/images/ui/map-area.png` |
| `briefingFilterBtn` | 브리핑 필터 버튼 | 브리핑 상태별 필터 드롭다운 열기 | `docs/images/ui/briefing-filter-button.png` |
| `filterNormal` | 일반 체크박스 | 일반 상태 브리핑 표시/숨김 | `docs/images/ui/briefing-filter-normal.png` |
| `filterPending` | 예정 체크박스 | 예정 상태 브리핑 표시/숨김 | `docs/images/ui/briefing-filter-pending.png` |
| `filterCompleted` | 완료 체크박스 | 완료 상태 브리핑 표시/숨김 | `docs/images/ui/briefing-filter-completed.png` |
| `filterOnHold` | 보류 체크박스 | 보류 상태 브리핑 표시/숨김 | `docs/images/ui/briefing-filter-onhold.png` |
| `roadviewBtn` | 로드뷰 버튼 | 현재 위치의 로드뷰(거리뷰) 열기 | `docs/images/ui/roadview-button.png` |
| `cadastralBtn` | 위성지도 버튼 | 위성지도/일반지도 전환 | `docs/images/ui/cadastral-button.png` |
| `filterBtn` | 필터 버튼 | 필터 모달 열기 (모바일) | `docs/images/ui/filter-button.png` |
| `clearCustomerFilterBtn` | 고객필터해제 버튼 | 고객 필터 해제 (고객 선택 시 표시) | `docs/images/ui/clear-customer-filter-button.png` |
| `mapCenterCross` | 지도 중심 십자가 | 지도 중심 위치 표시 | `docs/images/ui/map-center-cross.png` |

**동작 흐름**:
- **지도**: 마커 클릭 시 매물 상세 정보 표시
- **브리핑 필터**: 클릭 시 드롭다운 열기, 체크박스로 상태별 필터링
- **로드뷰**: 클릭 시 로드뷰 컨테이너 열기
- **위성지도**: 클릭 시 위성지도/일반지도 전환
- **필터**: 모바일에서 클릭 시 필터 모달 열기

#### 2.6 2차 사이드바 (Secondary Sidebar)

**위치**: `#secondaryPanel`

**화면 구성**:
```
┌─────────────────┐
│ 상세정보    [◀][×]│
├─────────────────┤
│                 │
│ (고객 목록)     │
│ (고객 상세)     │
│ (고객 등록 폼)  │
│ (매물 상세)     │
│                 │
└─────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `secondaryPanelTitle` | 패널 제목 | 현재 표시 중인 뷰의 제목 | `docs/images/ui/secondary-panel-title.png` |
| `secondaryPanelToggleBtn` | 패널 접기 버튼 | 2차 사이드바 접기/펼치기 | `docs/images/ui/secondary-panel-toggle.png` |
| `secondaryPanelClose` | 패널 닫기 버튼 | 2차 사이드바 닫기 | `docs/images/ui/secondary-panel-close.png` |
| `viewCustomerList` | 고객 목록 뷰 | 고객 목록 표시 | `docs/images/ui/view-customer-list.png` |
| `viewCustomerDetail` | 고객 상세 뷰 | 선택된 고객의 상세 정보 | `docs/images/ui/view-customer-detail.png` |
| `viewCustomerForm` | 고객 등록 폼 뷰 | 새 고객 등록 폼 | `docs/images/ui/view-customer-form.png` |
| `viewListingDetail` | 매물 상세 뷰 | 선택된 매물의 상세 정보 | `docs/images/ui/view-listing-detail.png` |

**동작 흐름**:
- 매물 또는 고객 클릭 시 해당 상세 정보가 2차 사이드바에 표시됨
- "×" 버튼 클릭 시 패널 닫기
- "◀" 버튼 클릭 시 패널 접기/펼치기

---

### 3. 모달 화면

#### 3.1 매물 등록 모달

**위치**: `#listingAddModal`

**화면 구성**:
```
┌─────────────────────────────┐
│ 매물등록                [×] │
├─────────────────────────────┤
│ 접수일: [자동입력]          │
│ 지역: [________]            │
│ 지번: [________]            │
│ 건물명: [_______]           │
│ ... (기타 필드들)           │
├─────────────────────────────┤
│        [등록] [취소]        │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `closeListingModal` | 닫기 버튼 | 모달 닫기 | `docs/images/ui/modal-close-button.png` |
| `submitListing` | 등록 버튼 | 매물 정보 등록 | `docs/images/ui/submit-listing-button.png` |
| `cancelListing` | 취소 버튼 | 등록 취소 및 모달 닫기 | `docs/images/ui/cancel-listing-button.png` |

**입력 필드**:
- 접수일 (자동입력, 수정 불가)
- 지역, 지번, 건물명, 층수, 가게명
- 분양, 실평수
- 보증금, 월세, 권리금
- 비고, 담당자, 연락처
- 의뢰인, 비고3, 위반여부, 현수막번호

#### 3.2 고객 등록 모달

**위치**: `#customerAddModal`

**화면 구성**:
```
┌─────────────────────────────┐
│ 고객등록                [×] │
├─────────────────────────────┤
│ 이름: [________]            │
│ 전화번호: [_______]         │
│ 지역: [________]            │
│ 매니저: [_______]           │
│ ... (기타 필드들)           │
├─────────────────────────────┤
│        [등록] [취소]        │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `closeCustomerModal` | 닫기 버튼 | 모달 닫기 | `docs/images/ui/customer-modal-close.png` |
| `submitCustomer` | 등록 버튼 | 고객 정보 등록 | `docs/images/ui/submit-customer-button.png` |
| `cancelCustomer` | 취소 버튼 | 등록 취소 및 모달 닫기 | `docs/images/ui/cancel-customer-button.png` |

#### 3.3 필터 모달 (모바일)

**위치**: `#filterModal`

**화면 구성**:
```
┌─────────────────────────────┐
│ 매물 필터                [×] │
├─────────────────────────────┤
│ 지역: [________]            │
│ 지번: [________]            │
│ 건물명: [_______]           │
│ ... (모든 필터 필드들)      │
├─────────────────────────────┤
│   [적용] [초기화] [취소]    │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `closeFilterModal` | 닫기 버튼 | 모달 닫기 | `docs/images/ui/filter-modal-close.png` |
| `applyFilterBtn` | 적용 버튼 | 필터 조건 적용 | `docs/images/ui/filter-apply-button-modal.png` |
| `resetFilterBtn` | 초기화 버튼 | 모든 필터 초기화 | `docs/images/ui/filter-reset-button-modal.png` |
| `cancelFilterBtn` | 취소 버튼 | 변경사항 취소 및 모달 닫기 | `docs/images/ui/filter-cancel-button.png` |

#### 3.4 매물 리스트 모달 (모바일)

**위치**: `#listingListModal`

**화면 구성**:
```
┌─────────────────────────────┐
│ [━━━] 드래그 핸들           │
│ 매물리스트              [×] │
├─────────────────────────────┤
│ (매물 목록)                 │
│                             │
│ [매물1]                     │
│ [매물2]                     │
│ ...                         │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `listingListDragHandle` | 드래그 핸들 | 모달 위치 조정 (드래그) | `docs/images/ui/listing-modal-drag-handle.png` |
| `closeListingListModal` | 닫기 버튼 | 모달 닫기 | `docs/images/ui/listing-modal-close.png` |

#### 3.5 사용자 관리 모달 (관리자 전용)

**위치**: `#userManagementModal`

**화면 구성**:
```
┌─────────────────────────────────────────────┐
│ 사용자 관리                            [×] │
├─────────────────────────────────────────────┤
│ ID │ 이메일 │ 이름 │ 직책 │ 역할 │ ... │ 작업 │
│ 1  │ ...   │ ... │ ... │ ... │ ... │ [수정]│
│ 2  │ ...   │ ... │ ... │ ... │ ... │ [수정]│
│ ...                                        │
└─────────────────────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| 모달 닫기 버튼 | 닫기 버튼 | 모달 닫기 | `docs/images/ui/user-management-modal-close.png` |
| 사용자 행의 수정 버튼 | 수정 버튼 | 사용자 정보 수정 모달 열기 | `docs/images/ui/user-edit-button.png` |

#### 3.6 사용자 추가/편집 모달

**위치**: `#userFormModal`

**화면 구성**:
```
┌─────────────────────────────┐
│ 사용자 추가             [×] │
├─────────────────────────────┤
│ 이메일: [________]          │
│ 이름: [________]            │
│ 역할: [드롭다운]            │
│ 담당자명: [_______]         │
│ 상태: ( ) 활성 ( ) 비활성   │
│ 비밀번호: [____] [재설정]   │
├─────────────────────────────┤
│        [저장] [취소]        │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| 모달 닫기 버튼 | 닫기 버튼 | 모달 닫기 | `docs/images/ui/user-form-modal-close.png` |
| `resetPasswordBtn` | 비밀번호 재설정 버튼 | 사용자 비밀번호 재설정 | `docs/images/ui/reset-password-button.png` |
| 폼 submit | 저장 버튼 | 사용자 정보 저장 | `docs/images/ui/save-user-button.png` |
| `userFormCancelBtn` | 취소 버튼 | 변경사항 취소 및 모달 닫기 | `docs/images/ui/cancel-user-button.png` |

#### 3.7 통계 모달 (관리자 전용)

**위치**: `#adminStatsModal`

**화면 구성**:
```
┌─────────────────────────────┐
│ 관리자 통계             [×] │
├─────────────────────────────┤
│ 총 사용자 수: 10            │
│ 활성 사용자 수: 8           │
│ 총 고객 수: 150             │
│ 총 매물 수: 500             │
│ 총 브리핑 수: 200           │
│ ... (기타 통계)             │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| 모달 닫기 버튼 | 닫기 버튼 | 모달 닫기 | `docs/images/ui/stats-modal-close.png` |

#### 3.8 시트 지정 모달

**위치**: `#sheetUrlModal`

**화면 구성**:
```
┌─────────────────────────────┐
│ 시트지정                [×] │
├─────────────────────────────┤
│ Google Sheets URL:          │
│ [________________________] │
│                             │
│        [확인] [취소]        │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `closeSheetUrlModal` | 닫기 버튼 | 모달 닫기 | `docs/images/ui/sheet-url-modal-close.png` |
| `sheetUrlForm` (submit) | 확인 버튼 | 시트 URL 저장 | `docs/images/ui/sheet-url-confirm-button.png` |
| `sheetUrlCancelBtn` | 취소 버튼 | 변경사항 취소 및 모달 닫기 | `docs/images/ui/sheet-url-cancel-button.png` |

---

### 4. 전체보기 패널

**위치**: `#fullListPanel`

**화면 구성**:
```
┌─────────────────────────────┐
│ 전체보기              [닫기] │
├─────────────────────────────┤
│ (전체 매물 목록)            │
│                             │
│ [매물1] [매물2] [매물3] ... │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `fullListCloseBtn` | 닫기 버튼 | 전체보기 패널 닫기 | `docs/images/ui/full-list-close-button.png` |

---

### 5. 전체 브리핑 리스트 패널

**위치**: `#fullBriefingListPanel`

**화면 구성**:
```
┌─────────────────────────────┐
│ 전체 브리핑 리스트    [닫기] │
├─────────────────────────────┤
│ (전체 브리핑 목록)           │
│                             │
│ [브리핑1] [브리핑2] ...     │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `fullBriefingListCloseBtn` | 닫기 버튼 | 전체 브리핑 리스트 패널 닫기 | `docs/images/ui/full-briefing-list-close-button.png` |

---

### 6. 로드뷰 컨테이너

**위치**: `#roadviewContainer`

**화면 구성**:
```
┌─────────────────────────────┐
│ [×]                         │
│                             │
│      로드뷰 영역            │
│                             │
│ [📍 주소 정보]              │
│                             │
│ [🗺️ 미니맵]                 │
│   [☰] [⤢] [+][-]           │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `roadviewCloseBtn` | 닫기 버튼 | 로드뷰 닫기 | `docs/images/ui/roadview-close-button.png` |
| `roadview` | 로드뷰 영역 | 네이버 로드뷰 표시 | `docs/images/ui/roadview-area.png` |
| `roadviewMiniMap` | 미니맵 영역 | 로드뷰 위치를 지도로 표시 | `docs/images/ui/roadview-minimap.png` |
| 미니맵 메뉴 버튼 | 메뉴 버튼 | 미니맵 메뉴 열기 | `docs/images/ui/minimap-menu-button.png` |
| 미니맵 확장 버튼 | 확장 버튼 | 미니맵 확장 | `docs/images/ui/minimap-expand-button.png` |
| 줌 인 버튼 | + 버튼 | 미니맵 확대 | `docs/images/ui/minimap-zoom-in.png` |
| 줌 아웃 버튼 | - 버튼 | 미니맵 축소 | `docs/images/ui/minimap-zoom-out.png` |

---

### 7. 모바일 전용 기능

#### 7.1 모바일 버튼

**위치**: 모바일 환경에서 하단에 고정 표시

**화면 구성**:
```
┌─────────────────────────────┐
│                             │
│         (지도 영역)          │
│                             │
├─────────────────────────────┤
│ [매물리스트] [필터] [고객]  │
└─────────────────────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| 모바일 매물리스트 버튼 | 매물리스트 버튼 | 매물 리스트 모달 열기 | `docs/images/ui/mobile-listing-list-button.png` |
| 모바일 필터 버튼 | 필터 버튼 | 필터 모달 열기 | `docs/images/ui/mobile-filter-button.png` |
| 모바일 고객 버튼 | 고객 버튼 | 고객 목록 표시 | `docs/images/ui/mobile-customer-button.png` |

#### 7.2 모바일 노치

**위치**: `#layout` > `.mobile-notch`

**설명**: 모바일 기기의 하단 노치 영역을 고려한 공간 확보

**이미지 참조**: `docs/images/ui/mobile-notch.png`

---

### 8. 컨텍스트 메뉴

**위치**: 우클릭 시 표시되는 메뉴

**화면 구성**:
```
┌─────────────┐
│ ✏️ 수정     │
├─────────────┤
│ 🗑️ 삭제     │
└─────────────┘
```

**버튼 및 기능**:

| 요소 ID | 버튼명/기능 | 설명 | 이미지 참조 |
|---------|------------|------|------------|
| `contextMenu` | 컨텍스트 메뉴 | 우클릭 시 표시되는 메뉴 | `docs/images/ui/context-menu.png` |
| `[data-action="edit"]` | 수정 메뉴 | 항목 수정 | `docs/images/ui/context-menu-edit.png` |
| `[data-action="delete"]` | 삭제 메뉴 | 항목 삭제 | `docs/images/ui/context-menu-delete.png` |

---

### 모바일 최적화
- 터치 제스처 지원
- 모바일 전용 버튼 배치
- 모달 기반 인터페이스
- 하단 노치 영역 고려
- 드래그 제스처 지원 (매물 리스트 모달)

---

## 🔒 보안 요구사항

### 인증 및 권한
- 세션 기반 인증
- CSRF 토큰 보호
- 역할 기반 접근 제어 (RBAC)
- 비밀번호 해싱 (SHA-256)

### 데이터 보안
- 민감한 정보 암호화
- API 키 환경변수 관리
- 입력 데이터 검증 및 정규화
- XSS 및 SQL Injection 방지

### 네트워크 보안
- HTTPS 지원 (선택사항)
- IP 기반 접근 제어
- 요청 빈도 제한
- 보안 헤더 설정

### 로깅 및 모니터링
- 보안 이벤트 로깅
- 접근 로그 기록
- 에러 로깅 및 추적

---

## 📦 배포 및 운영

### 배포 방식
1. **개발 환경**: Python 가상환경에서 직접 실행
2. **프로덕션 환경**: Windows 실행 파일 (.exe) 패키징
3. **설치 파일**: Inno Setup 기반 설치 파일 생성

### 환경 요구사항
- **운영체제**: Windows 10 이상
- **Python**: 3.8 이상 (개발 환경)
- **메모리**: 최소 4GB RAM
- **디스크**: 최소 1GB 여유 공간

### 운영 관리
- **로그 관리**: 로그 파일 자동 로테이션
- **백업**: 데이터 파일 정기 백업
- **모니터링**: 시스템 상태 모니터링
- **업데이트**: 정기적인 보안 업데이트

### 외부 서비스 연동
- **Google Sheets API**: 매물 데이터 동기화
- **네이버 지도 API**: 지도 및 지오코딩 서비스
- **네이버 로그인 API**: 소셜 로그인 (선택사항)
- **DuckDNS**: 동적 IP 업데이트 (선택사항)

---

## 📅 개발 일정 (예상)

### Phase 1: 기반 구축 (2-3주)
- 프로젝트 구조 설정
- 기본 인증 시스템 구현
- 데이터 모델 설계 및 구현
- 기본 API 엔드포인트 구현

### Phase 2: 핵심 기능 개발 (4-5주)
- Google Sheets 동기화 구현
- 매물 관리 시스템 구현
- 고객 관리 시스템 구현
- 브리핑 시스템 구현

### Phase 3: 지도 및 UI 개발 (3-4주)
- 네이버 지도 API 통합
- 지도 마커 및 클러스터링 구현
- 프론트엔드 UI 개발
- 반응형 디자인 구현

### Phase 4: 고급 기능 개발 (2-3주)
- 추천 매물 시스템 구현
- 사용자 시트 관리 구현
- 관리자 기능 구현
- 보안 기능 강화

### Phase 5: 테스트 및 최적화 (2주)
- 단위 테스트 작성
- 통합 테스트 수행
- 성능 최적화
- 버그 수정

### Phase 6: 배포 준비 (1주)
- 실행 파일 패키징
- 설치 파일 생성
- 문서화
- 최종 테스트

**총 예상 기간: 14-18주 (약 3.5-4.5개월)**

---

## 💰 예산 산정 기준

### 개발 비용 항목
1. **기획 및 설계**: 프로젝트 기획, 요구사항 분석, 설계
2. **백엔드 개발**: Flask 서버, API 개발, 데이터 처리 로직
3. **프론트엔드 개발**: UI/UX 개발, 지도 통합, 반응형 디자인
4. **통합 및 테스트**: 시스템 통합, 테스트, 버그 수정
5. **배포 및 문서화**: 배포 준비, 문서 작성, 사용자 가이드

### 추가 비용 항목
- **외부 API 비용**: 네이버 지도 API, Google Sheets API (무료 티어 사용 가능)
- **인프라 비용**: 서버 호스팅 (선택사항, 로컬 실행 가능)
- **유지보수**: 버그 수정, 기능 추가, 보안 업데이트

---

## ✅ 검수 기준

### 기능 검수
- [ ] 모든 API 엔드포인트 정상 동작
- [ ] 인증 및 권한 관리 정상 동작
- [ ] Google Sheets 동기화 정상 동작
- [ ] 지도 표시 및 마커 정상 동작
- [ ] 고객/브리핑 관리 정상 동작
- [ ] 모바일/PC 반응형 정상 동작

### 성능 검수
- [ ] 페이지 로딩 시간 3초 이내
- [ ] API 응답 시간 1초 이내
- [ ] 동시 사용자 10명 이상 지원
- [ ] 메모리 사용량 최적화

### 보안 검수
- [ ] 인증 보안 검증 완료
- [ ] XSS/SQL Injection 방지 검증
- [ ] CSRF 보호 검증
- [ ] 입력 데이터 검증 완료

### 호환성 검수
- [ ] Windows 10 이상 정상 동작
- [ ] Chrome, Edge, Firefox 브라우저 지원
- [ ] 모바일 브라우저 지원
- [ ] 다양한 화면 해상도 지원

---

## 📝 기타 사항

### 개발 환경
- **버전 관리**: Git
- **코드 스타일**: PEP 8 (Python), ESLint (JavaScript)
- **문서화**: 코드 주석, API 문서, 사용자 가이드

### 유지보수
- **버그 수정**: 발견 즉시 수정
- **기능 추가**: 요구사항에 따른 기능 추가
- **보안 업데이트**: 정기적인 보안 패치
- **성능 최적화**: 지속적인 성능 개선

### 지원 및 교육
- **사용자 교육**: 시스템 사용법 교육
- **기술 지원**: 기술적 문제 해결 지원
- **문서 제공**: 사용자 매뉴얼, 관리자 가이드 제공

---

## 📞 연락처 및 문의

프로젝트 관련 문의사항은 개발팀에 연락 바랍니다.

---

**문서 버전**: 1.0  
**최종 수정일**: 2024년  
**작성자**: 개발팀

