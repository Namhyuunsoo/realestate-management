# Supabase 적용 통합 계획

## 📋 개요

Flask 백엔드를 Supabase로 점진적으로 마이그레이션하는 통합 계획입니다.

**목표:**
- Google Sheets → Supabase 실시간 동기화 (웹훅 기반)
- Flask 백엔드 코드 40-50% 감소
- 성능 5-10배 향상
- 기존 서버 운영 중 마이그레이션 (하이브리드 운영)
- 안전한 점진적 전환 (롤백 가능)

**예상 기간:** 6-8주 (단계별 진행)

---

## 🎯 핵심 전략

### 1. Repository 패턴 도입
- **추상화 레이어**로 데이터 소스 전환 가능
- 기존 코드 **최소 변경**
- 환경변수로 **전환 제어** (기능 플래그)

### 2. 하이브리드 운영
- Flask와 Supabase **병행 사용**
- 기능별로 **선택적 전환**
- 문제 발생 시 **즉시 롤백** 가능

### 3. 점진적 마이그레이션
- 한 번에 하나씩, 안정적으로 전환
- 각 단계별 **충분한 검증**
- 기존 기능 **100% 유지**

### 4. 실시간 동기화
- Google Sheets 웹훅 기반 자동 동기화
- 스케줄러 제거
- 1-30초 지연으로 실시간 반영

---

## 🏗️ 아키텍처 설계

### Repository 패턴 구조

```
app/services/
├── repositories/
│   ├── __init__.py              # Factory 함수
│   ├── base.py                  # 추상 기본 클래스
│   ├── customer_repository.py
│   ├── briefing_repository.py
│   ├── listing_repository.py
│   └── user_repository.py
├── repositories/
│   ├── file/
│   │   ├── __init__.py
│   │   ├── file_customer_repository.py    # 기존 Excel/JSON 로직
│   │   ├── file_briefing_repository.py
│   │   ├── file_listing_repository.py
│   │   └── file_user_repository.py
│   └── supabase/
│       ├── __init__.py
│       ├── supabase_customer_repository.py
│       ├── supabase_briefing_repository.py
│       ├── supabase_listing_repository.py
│       └── supabase_user_repository.py
└── store.py                     # 기존 코드 유지 (호환성)
```

### 환경변수 기반 전환 제어

```bash
# .env 파일

# 데이터 저장소 모드
# 'file': 파일 시스템만 사용 (기존 방식)
# 'supabase': Supabase만 사용
# 'dual': 양쪽 모두에 저장 (병행 운영)
DATA_STORAGE_MODE=file

# 기능별 전환 제어 (기능 플래그)
USE_SUPABASE_CUSTOMERS=false
USE_SUPABASE_BRIEFINGS=false
USE_SUPABASE_LISTINGS=false
USE_SUPABASE_AUTH=false

# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 📅 단계별 마이그레이션 계획

### Phase 0: 준비 단계 (1주)

#### 0.1 Supabase 프로젝트 설정
- [ ] Supabase 프로젝트 생성
- [ ] 환경변수 설정 (`.env`)
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Python Supabase 클라이언트 설치
  ```bash
  pip install supabase
  ```

#### 0.2 데이터베이스 스키마 설계 및 생성

**테이블 설계:**

1. **users 테이블**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- 'user', 'manager', 'admin'
  manager_name TEXT,
  job_title TEXT,
  sheet_url TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'approved', -- 'pending', 'approved', 'rejected', 'inactive'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. **customers 테이블**
```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  region TEXT,
  manager TEXT,
  notes TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. **briefings 테이블**
```sql
CREATE TABLE briefings (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  created_by TEXT NOT NULL,
  listing_ids JSONB NOT NULL DEFAULT '[]',
  overrides JSONB DEFAULT '{}',
  tags JSONB DEFAULT '[]',
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

4. **recommendations 테이블**
```sql
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  reason TEXT,
  comments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

5. **listings 테이블 (매물)**
```sql
CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  sheet_name TEXT NOT NULL,
  raw_row_index INTEGER,
  status_raw TEXT,
  address_full TEXT,
  address_comp JSONB,
  fields JSONB NOT NULL, -- 모든 매물 필드 저장
  coords JSONB, -- {lat, lng}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_listings_sheet_name ON listings(sheet_name);
CREATE INDEX idx_listings_manager ON listings((fields->>'담당자'));
CREATE INDEX idx_listings_region ON listings((fields->>'지역'));
CREATE INDEX idx_listings_status ON listings(status_raw);
CREATE INDEX idx_listings_coords ON listings USING GIN(coords);
```

#### 0.3 Row Level Security (RLS) 정책 설정

**customers 테이블 RLS:**
```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 정책: 자신이 생성한 고객만 조회/수정/삭제 가능, 매니저/어드민은 모든 고객 조회 가능
CREATE POLICY "Users can view own customers" ON customers
  FOR SELECT USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email' OR
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') IN ('manager', 'admin')
  );

CREATE POLICY "Users can insert own customers" ON customers
  FOR INSERT WITH CHECK (
    created_by = current_setting('request.jwt.claims', true)::json->>'email'
  );

CREATE POLICY "Users can update own customers" ON customers
  FOR UPDATE USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email' OR
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') IN ('manager', 'admin')
  );

CREATE POLICY "Users can delete own customers" ON customers
  FOR DELETE USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email' OR
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') = 'admin'
  );
```

**briefings 테이블 RLS:**
```sql
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefings" ON briefings
  FOR SELECT USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email' OR
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') IN ('manager', 'admin')
  );

CREATE POLICY "Users can manage own briefings" ON briefings
  FOR ALL USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email' OR
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') IN ('manager', 'admin')
  );
```

**listings 테이블 RLS:**
```sql
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- 일반 사용자는 자신의 담당자 매물만 조회 가능
CREATE POLICY "Users can view assigned listings" ON listings
  FOR SELECT USING (
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') IN ('manager', 'admin') OR
    (fields->>'담당자') = (SELECT manager_name FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
  );
```

#### 0.4 Repository 패턴 구현
- [ ] Repository 인터페이스 정의 (`base.py`)
- [ ] File Repository 구현 (기존 코드 래핑)
- [ ] Supabase Repository 구현
- [ ] Repository Factory 구현 (환경변수 기반 선택)
- [ ] 기존 라우트 코드 수정 (Repository 사용)

#### 0.5 기존 데이터 마이그레이션 스크립트 작성
- [ ] `data/state/customers.json` → Supabase `customers` 테이블
- [ ] `data/state/briefings.json` → Supabase `briefings` 테이블
- [ ] `data/state/recommendations.json` → Supabase `recommendations` 테이블
- [ ] `data/state/users.json` → Supabase `users` 테이블

**검증:**
- `DATA_STORAGE_MODE=file`로 설정하여 기존 동작 확인
- 모든 테스트 통과

---

### Phase 1: 단순 CRUD 전환 (1-2주)

#### 1.1 고객 관리 (customers) 전환

**대상:**
- `app/routes/customers.py` (5개 엔드포인트)
- `app/services/store.py` (고객 관련 함수)

**작업 내용:**

1. **Repository 패턴 적용**
   ```python
   # app/routes/customers.py
   from app.services.repositories import get_customer_repository
   
   @bp.post("/")
   def create_customer_api():
       repo = get_customer_repository()
       record = repo.create_customer(user.email, payload)
       return jsonify(record), 201
   ```

2. **환경변수로 전환 제어**
   ```bash
   # .env
   USE_SUPABASE_CUSTOMERS=false  # 시작은 false (Flask 사용)
   ```

3. **테스트 및 전환**
   - [ ] 코드 배포 (기능 플래그 false)
   - [ ] 테스트 환경에서 `USE_SUPABASE_CUSTOMERS=true` 테스트
   - [ ] 프로덕션에서 `USE_SUPABASE_CUSTOMERS=true` 전환
   - [ ] 문제 발생 시 즉시 `false`로 롤백

**완료 조건:**
- [ ] 고객 CRUD가 Supabase로 완전히 전환됨
- [ ] 기존 기능 100% 동작 확인
- [ ] RLS 정책 정상 작동 확인

---

#### 1.2 브리핑 관리 (briefings) 전환

**대상:**
- `app/routes/briefings.py` (8개 엔드포인트)
- `app/services/briefing_service.py`

**작업 내용:**

1. **Repository 패턴 적용**
2. **JSONB 필드 활용** (`listing_ids`, `overrides`, `tags`)
3. **환경변수로 전환 제어** (`USE_SUPABASE_BRIEFINGS`)

**완료 조건:**
- [ ] 브리핑 기능이 Supabase로 전환됨
- [ ] JSONB 필드 정상 작동 확인

---

#### 1.3 추천 시스템 (recommendations) 전환

**대상:**
- `app/routes/recommendations.py` (4개 엔드포인트)
- `app/services/recommendation_service.py`

**작업 내용:**

1. **Repository 패턴 적용**
2. **환경변수로 전환 제어**

**완료 조건:**
- [ ] 추천 시스템이 Supabase로 전환됨

---

### Phase 2: 인증 시스템 전환 (1주)

#### 2.1 Supabase Auth 도입 (선택적)

**옵션 1: Supabase Auth 사용**
- [ ] Supabase Auth 활성화
- [ ] 프론트엔드에서 Supabase Auth 사용
- [ ] JWT 검증 데코레이터 작성

**옵션 2: Flask 세션 유지 (권장)**
- 기존 Flask 세션 기반 인증 유지
- Supabase는 데이터 저장소로만 사용
- 사용자 정보는 Supabase `users` 테이블에 저장

**작업 내용:**

1. **사용자 정보를 Supabase에 저장**
   - 로그인/회원가입 시 Supabase `users` 테이블에도 저장
   - Flask 세션은 유지 (호환성)

2. **환경변수로 전환 제어** (`USE_SUPABASE_AUTH`)

**완료 조건:**
- [ ] 사용자 정보가 Supabase에 저장됨
- [ ] 기존 인증 시스템 정상 작동

---

### Phase 3: 매물 관리 전환 (2주) ⭐ 핵심 단계

#### 3.1 Google Sheets 웹훅 설정

**작업 내용:**

1. **Google Apps Script 작성**
   ```javascript
   // Google Sheets에 바인딩된 Apps Script
   function onEdit(e) {
     const payload = {
       sheetName: e.source.getActiveSheet().getName(),
       range: e.range.getA1Notation(),
       timestamp: new Date().toISOString()
     };
     
     UrlFetchApp.fetch('https://your-server.com/api/webhooks/sheets-changed', {
       method: 'POST',
       contentType: 'application/json',
       payload: JSON.stringify(payload)
     });
   }
   ```
   - [ ] Apps Script 작성 및 배포
   - [ ] 웹훅 URL 설정

2. **Google Drive API Watch 설정** (선택적)
   - [ ] `files.watch` API로 변경 감지
   - [ ] 웹훅 엔드포인트 구현

3. **Flask 웹훅 엔드포인트 구현**
   ```python
   # app/routes/webhooks.py (새로 생성)
   @bp.route("/webhooks/sheets-changed", methods=['POST'])
   def handle_sheets_changed():
       # Google Sheets에서 데이터 읽기
       # 데이터 정규화 (기존 로직 재사용)
       # Supabase에 Upsert
   ```

**완료 조건:**
- [ ] Google Sheets 편집 시 웹훅 수신 확인
- [ ] Supabase 자동 동기화 확인

---

#### 3.2 데이터 정규화 로직 이전

**대상:**
- `app/services/listings_loader.py` (정규화 로직)
- `normalize_listing()` 함수

**작업 내용:**

1. **웹훅 핸들러에서 정규화 수행**
   ```python
   # app/routes/webhooks.py
   def handle_sheets_changed():
       # Google Sheets API로 데이터 읽기
       sheet_data = read_google_sheet(sheet_name)
       
       # 정규화 (기존 로직 재사용)
       normalized_data = normalize_listings(sheet_data, sheet_name)
       
       # Supabase에 Upsert
       supabase.table('listings').upsert(normalized_data).execute()
   ```

2. **기존 파일 읽기 로직 제거**
   - [ ] `sheet_download_service.py` 사용 중지
   - [ ] `sheet_scheduler.py` 사용 중지
   - [ ] `sheet_fetcher.py` (Excel 읽기 부분) 사용 중지

**완료 조건:**
- [ ] Google Sheets 변경 시 Supabase 자동 업데이트
- [ ] 정규화 로직 정상 작동
- [ ] 스케줄러 제거

---

#### 3.3 매물 조회 API 전환

**대상:**
- `app/routes/listings.py` (`/api/listings`)

**작업 내용:**

1. **Repository 패턴 적용**
   ```python
   # app/routes/listings.py
   from app.services.repositories import get_listing_repository
   
   @bp.get("/")
   def list_listings():
       repo = get_listing_repository()
       listings = repo.list_listings(user_email, filters)
       return jsonify({"items": listings})
   ```

2. **필터링 로직 최적화**
   - 서버 필터링: SQL WHERE 절 사용 (Supabase)
   - 클라이언트 필터링: 필요한 경우에만 사용

3. **환경변수로 전환 제어** (`USE_SUPABASE_LISTINGS`)

**완료 조건:**
- [ ] 매물 조회가 Supabase로 전환됨
- [ ] 필터링 성능 향상 확인 (5-10배)
- [ ] 역할별 필터링 (RLS) 정상 작동

---

### Phase 4: 복잡한 기능 전환 (1-2주)

#### 4.1 지오코딩 서비스 전환 (선택적)

**대상:**
- `app/routes/geocoding.py` (4개 엔드포인트)
- `app/services/geocoding_service.py`
- `app/services/geocoding_scheduler.py`

**옵션 1: Edge Function 사용**
- [ ] Edge Function으로 지오코딩 처리
- [ ] Supabase에 좌표 저장

**옵션 2: Flask 유지 (권장)**
- 지오코딩은 Flask에서 처리
- Supabase에 결과 저장

**완료 조건:**
- [ ] 지오코딩 기능 정상 작동

---

#### 4.2 나머지 기능 정리

**대상:**
- `app/routes/admin.py` (관리자 기능)
- `app/routes/user_sheets.py` (사용자 시트 관리)
- `app/routes/security.py` (보안 관리)

**전략:**
- 필요에 따라 Edge Function 또는 Flask 유지 결정
- 단순한 기능은 PostgREST로 전환
- 복잡한 로직은 Flask 유지

---

## 🔄 하이브리드 운영 전략

### 기능별 선택 방식 (Feature Flag)

환경변수로 각 기능을 Flask 또는 Supabase로 선택:

```bash
# .env 파일
USE_SUPABASE_CUSTOMERS=false    # 고객 관리: Flask 사용
USE_SUPABASE_BRIEFINGS=false     # 브리핑: Flask 사용
USE_SUPABASE_LISTINGS=false      # 매물: Flask 사용
USE_SUPABASE_AUTH=false          # 인증: Flask 사용
```

### 데이터 동기화 (전환 기간)

전환 기간 중에는 양쪽에 저장 (Dual Write):

```python
# app/services/repositories/dual_write_repository.py
class DualWriteCustomerRepository:
    def create_customer(self, user_email, payload):
        # Flask 저장 (기존 방식)
        customer = store.create_customer(user_email, payload)
        
        # Supabase에도 저장 (환경변수로 제어)
        if os.getenv("SYNC_TO_SUPABASE", "false") == "true":
            try:
                supabase.table('customers').insert(customer).execute()
            except Exception as e:
                # Supabase 저장 실패해도 Flask는 성공했으므로 계속 진행
                current_app.logger.warning(f"Supabase 동기화 실패: {e}")
        
        return customer
```

### 단계별 마이그레이션 예시

#### 예시: 고객 관리 전환

1. **Supabase 준비** (Flask 서버 운영 중)
   - Supabase 프로젝트 생성
   - 테이블 생성 및 데이터 마이그레이션
   - Flask 서버는 그대로 운영

2. **코드 준비** (Flask 유지)
   - Repository 패턴 도입
   - Supabase 코드 추가 (기능 플래그로 비활성)
   - Flask 라우트는 유지

3. **테스트** (내부/비프로덕션)
   ```bash
   USE_SUPABASE_CUSTOMERS=true  # 테스트 환경에서만 true
   ```

4. **프로덕션 전환**
   ```bash
   USE_SUPABASE_CUSTOMERS=true  # 프로덕션에서 true로 변경
   ```
   - 서버 재시작 (또는 코드가 실시간 감지하면 재시작 불필요)
   - 문제 발생 시 즉시 `false`로 복귀

5. **안정화 후 Flask 코드 제거**
   - 안정화 후 Flask 라우트 제거
   - 다음 기능으로 진행

---

## 🚨 위험 요소 및 대응 방안

### 위험 요소 1: Google Sheets 웹훅 실패

**위험:**
- Google Sheets 변경이 Supabase에 반영되지 않음
- 데이터 불일치 발생

**대응 방안:**
1. **웹훅 실패 감지 및 재시도**
   ```python
   @bp.route("/webhooks/sheets-changed", methods=['POST'])
   def handle_sheets_changed():
       try:
           sync_to_supabase()
       except Exception as e:
           # 실패 시 큐에 추가하여 나중에 재시도
           retry_queue.add(sync_task)
   ```

2. **주기적 동기화 (백업)**
   - 웹훅이 실패하는 경우를 대비해 1시간마다 한 번씩 동기화 확인
   - Supabase Cron 또는 외부 스케줄러 사용

3. **모니터링 및 알림**
   - 웹훅 실패 시 알림
   - 동기화 상태 대시보드

---

### 위험 요소 2: 데이터 마이그레이션 중 오류

**위험:**
- 기존 데이터가 손실되거나 불일치 발생

**대응 방안:**
1. **마이그레이션 전 백업**
   - [ ] 모든 JSON 파일 백업
   - [ ] Supabase 데이터베이스 백업

2. **검증 스크립트 작성**
   - [ ] 마이그레이션 전후 데이터 개수 비교
   - [ ] 샘플 데이터 검증

3. **단계별 마이그레이션**
   - 한 번에 하나의 테이블만 마이그레이션
   - 검증 완료 후 다음 단계 진행

---

### 위험 요소 3: RLS 정책 오류

**위험:**
- 사용자가 접근 권한이 없는 데이터 조회 가능
- 또는 접근 권한이 있는 데이터 조회 불가

**대응 방안:**
1. **RLS 정책 테스트**
   - [ ] 각 역할별 권한 테스트
   - [ ] 엣지 케이스 테스트

2. **로그 모니터링**
   - RLS 정책 위반 시 로그 기록
   - 정기적인 권한 검토

---

### 위험 요소 4: 성능 저하

**위험:**
- Supabase 쿼리가 예상보다 느림
- 네트워크 지연 발생

**대응 방안:**
1. **성능 테스트**
   - 마이그레이션 전후 성능 비교
   - 쿼리 최적화 (인덱스 활용)

2. **캐싱 전략**
   - Supabase 쿼리 결과 캐싱 (필요 시)
   - 클라이언트 측 캐싱

---

## 📝 테스트 계획

### 단계별 테스트 체크리스트

#### Phase 1 테스트

**고객 관리:**
- [ ] 고객 생성 (일반 사용자)
- [ ] 고객 생성 (매니저)
- [ ] 고객 조회 (자신의 고객만 조회 가능)
- [ ] 고객 조회 (매니저는 모든 고객 조회 가능)
- [ ] 고객 수정
- [ ] 고객 삭제

**브리핑 관리:**
- [ ] 브리핑 생성
- [ ] 브리핑 조회
- [ ] 매물 오버라이드 설정/해제
- [ ] 태그 추가/삭제

**추천 시스템:**
- [ ] 추천 매물 등록/삭제
- [ ] 댓글 추가/조회

---

#### Phase 2 테스트

**인증:**
- [ ] 이메일/비밀번호 로그인
- [ ] 로그아웃
- [ ] 세션 유지 (페이지 새로고침)

---

#### Phase 3 테스트

**Google Sheets 웹훅:**
- [ ] Google Sheets 편집 → 웹훅 수신 확인
- [ ] Supabase 자동 업데이트 확인
- [ ] 정규화 로직 정상 작동 확인

**매물 조회:**
- [ ] 매물 목록 조회 (일반 사용자)
- [ ] 매물 목록 조회 (매니저)
- [ ] 필터링 기능 정상 작동
- [ ] 성능 테스트 (1000개 이상 매물)

---

## 🔄 롤백 계획

### 각 Phase별 롤백 방법

#### Phase 1 롤백
1. 환경변수 변경: `USE_SUPABASE_CUSTOMERS=false`
2. 서버 재시작
3. Supabase 테이블 데이터를 JSON 파일로 Export (필요 시)

#### Phase 2 롤백
1. 환경변수 변경: `USE_SUPABASE_AUTH=false`
2. Flask 세션 기반 인증 복귀

#### Phase 3 롤백
1. 환경변수 변경: `USE_SUPABASE_LISTINGS=false`
2. 웹훅 비활성화
3. Excel 파일 다운로드 기능 복귀
4. 스케줄러 재시작

---

## 📈 성공 지표

### 마이그레이션 성공 기준

1. **기능적 성공**
   - [ ] 모든 기존 기능이 정상 작동
   - [ ] 성능 저하 없음 (또는 개선)
   - [ ] 데이터 정확성 유지

2. **기술적 성공**
   - [ ] Flask 코드 40-50% 감소
   - [ ] 스케줄러 제거
   - [ ] 실시간 동기화 구현

3. **사용자 경험**
   - [ ] 사용자 체감 성능 향상
   - [ ] 기능 사용 중 문제 없음

---

## 🗓️ 예상 일정

| Phase | 작업 내용 | 예상 기간 | 시작일 | 완료일 |
|-------|----------|----------|--------|--------|
| Phase 0 | 준비 단계 | 1주 | - | - |
| Phase 1 | 단순 CRUD 전환 | 1-2주 | - | - |
| Phase 2 | 인증 시스템 전환 | 1주 | - | - |
| Phase 3 | 매물 관리 전환 | 2주 | - | - |
| Phase 4 | 복잡한 기능 전환 | 1-2주 | - | - |
| **총계** | **전체 마이그레이션** | **6-8주** | - | - |

---

## 📋 체크리스트

### 전체 마이그레이션 체크리스트

#### 준비 단계
- [ ] Supabase 프로젝트 생성
- [ ] 환경변수 설정
- [ ] 데이터베이스 스키마 생성
- [ ] RLS 정책 설정
- [ ] Repository 패턴 구현
- [ ] 데이터 마이그레이션 스크립트 작성

#### Phase 1
- [ ] 고객 관리 전환
- [ ] 브리핑 관리 전환
- [ ] 추천 시스템 전환

#### Phase 2
- [ ] 사용자 정보 Supabase 저장
- [ ] 인증 시스템 전환 (선택적)

#### Phase 3
- [ ] Google Sheets 웹훅 설정
- [ ] 데이터 정규화 로직 이전
- [ ] 매물 조회 API 전환
- [ ] 스케줄러 제거

#### Phase 4
- [ ] 지오코딩 전환 (선택적)
- [ ] 나머지 기능 정리

#### 마무리
- [ ] 모든 테스트 통과
- [ ] 문서 업데이트
- [ ] 배포

---

## 💡 추가 고려사항

### 1. 하이브리드 운영 기간

**기간:** Phase 1-3 동안 (약 4-6주)

**전략:**
- Supabase와 Flask를 병행 운영
- 기능별로 전환 후 검증
- 안정화되면 기존 코드 제거

### 2. 데이터 동기화

**전환 기간 동안:**
- Supabase와 JSON 파일을 동시에 업데이트
- 또는 Supabase를 메인으로, JSON은 백업으로 사용

### 3. 모니터링

**필요한 모니터링:**
- Supabase 쿼리 성능
- 웹훅 수신 상태
- 에러 로그
- 사용자 피드백

---

## 🎯 최종 목표

### 마이그레이션 완료 후 예상 상태

1. **코드베이스**
   - Flask 코드: 40-50% 감소
   - 단순 CRUD 코드: 70-80% 감소
   - 스케줄러 코드: 제거

2. **성능**
   - API 응답 속도: 5-10배 향상
   - 필터링 성능: SQL 인덱스 활용으로 대폭 향상

3. **기능**
   - 실시간 동기화: Google Sheets → Supabase (1-30초 지연)
   - 스케줄러 불필요: 웹훅 기반 자동 동기화

4. **유지보수**
   - 코드 단순화로 유지보수 용이
   - 데이터베이스 중심으로 로직 집중

---

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgREST API 참조](https://postgrest.org/en/stable/api.html)
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Google Drive API Watch](https://developers.google.com/drive/api/v3/push)

---

*마이그레이션은 점진적으로 진행하며, 각 단계별로 충분한 테스트와 검증을 거친 후 다음 단계로 진행합니다.*
