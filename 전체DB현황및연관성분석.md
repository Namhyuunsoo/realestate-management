  전체 DB 현황 및 연관성 분석

  데이터 간 의존 관계

  users (인증/권한)
    ├── customers (manager_name으로 필터링)
    │     └── briefings (customer_id 참조)
    │           └── listing_ids (매물 참조)
    ├── recommendations (user_email + listing_id 참조)
    └── listings (담당자 필터링)
          └── geocoding_cache (주소→좌표)

  각 DB별 현황
  DB: Users
  로컬 저장 방식: data/users.json
  Supabase Repo: 없음
  Supabase 테이블: users (존재)
  전환 플래그: USE_SUPABASE_AUTH
  현재 상태: Repository 패턴 미적용
  ────────────────────────────────────────
  DB: Customers
  로컬 저장 방식: Excel ({user}_customerList.xlsx + all_customers.xlsx)
  Supabase Repo: 있음
  Supabase 테이블: customers (존재)
  전환 플래그: USE_SUPABASE_CUSTOMERS
  현재 상태: 전환 가능
  ────────────────────────────────────────
  DB: Briefings
  로컬 저장 방식: data/store.json (인메모리 dict)
  Supabase Repo: 있음
  Supabase 테이블: briefings (존재)
  전환 플래그: USE_SUPABASE_BRIEFINGS
  현재 상태: 전환 가능
  ────────────────────────────────────────
  DB: Recommendations
  로컬 저장 방식: data/recommendations.json
  Supabase Repo: 있음
  Supabase 테이블: recommendations (존재)
  전환 플래그: USE_SUPABASE_RECOMMENDATIONS
  현재 상태: 전환 가능
  ────────────────────────────────────────
  DB: Listings (상가)
  로컬 저장 방식: Excel → JSON 캐시
  Supabase Repo: 없음 (동기화만)
  Supabase 테이블: listings (존재)
  전환 플래그: USE_SUPABASE_LISTINGS
  현재 상태: Sheets→Supabase 동기화 존재
  ────────────────────────────────────────
  DB: Housing (주택)
  로컬 저장 방식: 없음 (직접 Supabase)
  Supabase Repo: -
  Supabase 테이블: 3개 테이블 (존재)
  전환 플래그: -
  현재 상태: 이미 Supabase
  ────────────────────────────────────────
  DB: Geocoding
  로컬 저장 방식: JSON + Excel 캐시
  Supabase Repo: -
  Supabase 테이블: address_geocode_cache (존재)
  전환 플래그: -
  현재 상태: 부분 전환
  핵심 문제점

  1. Users — Repository 패턴 자체가 없음
  - UserService가 직접 users.json 읽기/쓰기
  - 모든 다른 DB가 users에 의존 → 가장 먼저 전환해야 하지만 작업량이 가장 큼
  - 인증(세션), 권한(role), 고객 필터링(manager_name) 모두 여기서 나옴

  2. Customers — 이중 저장 구조
  - Excel 파일 2개에 동시 저장 (사용자별 + 관리자 통합)
  - Supabase repo는 있지만 필드 불일치: 로컬은 floor, area, deposit, rent, premium, filter_data
   저장하는데 Supabase customers 테이블에는 이 컬럼들이 없음

  3. Briefings — store.json 인메모리 방식
  - store.py에서 BRIEFINGS dict를 메모리에 들고 있다가 JSON으로 저장
  - 서버 재시작 시 로드, 멀티프로세스 환경에서 동시성 문제 가능
  - customer_id로 customers 참조, listing_ids로 매물 참조 → 두 DB 모두 Supabase여야 정합성 유지

  4. Listings — API 라우트가 Supabase를 직접 읽는 구조가 아님
  - 현재: Sheets → Excel → SheetFetcher → ListingsLoader → JSON 캐시 → API
  - Supabase 동기화는 있지만, API가 Supabase에서 직접 읽는 Repository가 없음
  - 읽기 경로를 Supabase로 바꾸려면 ListingsRepository 신규 구현 필요

  전환 순서 제안

  Phase 1: Users (기반)
    └→ UserRepository 인터페이스 생성
    └→ SupabaseUserRepository 구현
    └→ UserService가 Repository 사용하도록 수정

  Phase 2: Customers + Briefings (동시 전환)
    └→ Supabase customers 테이블에 누락 컬럼 추가
    └→ USE_SUPABASE_CUSTOMERS=true
    └→ USE_SUPABASE_BRIEFINGS=true
    └→ store.py의 Excel/JSON 로직 제거

  Phase 3: Recommendations (단독)
    └→ USE_SUPABASE_RECOMMENDATIONS=true
    └→ FileRecommendationRepository 제거

  Phase 4: Listings (가장 복잡)
    └→ ListingsRepository 인터페이스 + Supabase 구현 신규 생성
    └→ API 라우트가 Supabase에서 직접 조회하도록 수정
    └→ Excel/JSON 캐시 기반 로딩 제거
    └→ Geocoding도 Supabase 캐시만 사용하도록 정리

  Phase 2의 Customers와 Briefings를 동시에 전환하는 이유: Briefings가 customer_id를 참조하므로,
  한쪽만 Supabase이고 다른 쪽은 로컬이면 ID 불일치가 발생할 수 있음.

  Phase 4가 가장 복잡한 이유: 매물 데이터는 Google Sheets가 원본이고, 현재 Excel → JSON 캐시
  파이프라인이 깊게 박혀 있음. SheetFetcher, ListingsLoader, 캐시 시스템을 모두 걷어내고 Supabase
   직접 조회로 바꿔야 함.

  어떤 Phase부터 진행할지 결정해주시면 상세 구현 계획을 세우겠습니다.

✻ Sautéed for 2m 25s

● Agent "로컬 데이터 저장소 전체 분석" completed

● 로컬 데이터 분석도 완료되었습니다. 이미 위에서 종합 분석을 드렸으니, 추가로 확인된 내용만
  보충합니다.

  보충: 로컬 저장소 상세 맵

  파일 기반 저장소 전체:
  ┌────────────────────────────────────┬─────────────┬─────────────┬────────────────────────────┐
  │                파일                │    형식     │    용도     │       Supabase 대응        │
  ├────────────────────────────────────┼─────────────┼─────────────┼────────────────────────────┤
  │ data/users.json                    │ JSON        │ 사용자      │ users 테이블 있음,         │
  │                                    │             │ 계정/권한   │ Repository 없음            │
  ├────────────────────────────────────┼─────────────┼─────────────┼────────────────────────────┤
  │ data/store.json                    │ JSON        │ 브리핑      │ briefings 테이블 +         │
  │                                    │ (인메모리)  │ 데이터      │ Repository 있음            │
  ├────────────────────────────────────┼─────────────┼─────────────┼────────────────────────────┤
  │ data/state/recommendations.json    │ JSON        │ 추천매물    │ recommendations 테이블 +   │
  │                                    │             │             │ Repository 있음            │
  ├────────────────────────────────────┼─────────────┼─────────────┼────────────────────────────┤
  │ data/raw/all_customers.xlsx        │ Excel       │ 관리자용    │ customers 테이블 +         │
  │                                    │             │ 고객 통합   │ Repository 있음            │
  ├────────────────────────────────────┼─────────────┼─────────────┼────────────────────────────┤
  │ data/raw/{user}_customerList.xlsx  │ Excel       │ 사용자별    │ 위와 동일 테이블           │
  │                                    │             │ 고객        │                            │
  ├────────────────────────────────────┼─────────────┼─────────────┼────────────────────────────┤
  │ data/raw/상가임대차.xlsx           │ Excel       │ 상가매물    │ listings 테이블 (동기화만) │
  │                                    │             │ 원본        │                            │
  ├────────────────────────────────────┼─────────────┼─────────────┼────────────────────────────┤
  │ data/raw/지도캐시.xlsx             │ Excel       │ 지오코딩    │ address_geocode_cache      │
  │                                    │             │ 좌표        │ 테이블                     │
  ├────────────────────────────────────┼─────────────┼─────────────┼────────────────────────────┤
  │ data/cache/listing_sheet_cache.pkl │ Pickle      │ 매물 로딩   │ Supabase 직접 조회 시      │
  │                                    │             │ 캐시        │ 불필요                     │
  └────────────────────────────────────┴─────────────┴─────────────┴────────────────────────────┘
  이미 Supabase만 사용하는 것:
  - 주택매물 3개 테이블 (housing_listings_service.py)
  - 주소 좌표 캐시 (geocoding_service.py에서 이중 저장)

  핵심 포인트: store.py가 가장 복잡합니다. 고객(Excel)과 브리핑(JSON)을 한 파일에서 관리하면서,
  고객은 사용자파일+관리자파일 이중 저장. Supabase 전환 시 이 이중 저장 구조가 완전히 사라지므로
  코드가 대폭 단순해집니다.

  위에서 제안한 Phase 1(Users) → Phase 2(Customers+Briefings) → Phase 3(Recommendations) → Phase
  4(Listings) 순서로 진행하면 됩니다. 어떤 Phase부터 시작할까요?

---

## AI 검토 의견

### 1. 전환 순서 동의
제안된 Phase 순서(Users → Customers+Briefings → Recommendations → Listings)에 동의합니다. Users가 모든 인증·권한·필터링의 기반이므로 가장 먼저 전환해야 합니다.

### 2. 추가로 고려할 사항

**데이터 마이그레이션**
- Phase별 전환 시 기존 JSON/Excel 데이터를 Supabase로 이전하는 절차가 필요합니다.
- Users 전환: `data/users.json` → `users` 테이블
- Customers 전환: `all_customers.xlsx` + `{user}_customerList.xlsx` → `customers` 테이블
- Briefings 전환: `store.json`의 BRIEFINGS → `briefings` 테이블
- 마이그레이션 스크립트를 Phase별로 준비하고, 전환 전 백업·검증 절차를 두는 것이 안전합니다.

**ID 정합성**
- Briefings의 `listing_ids`는 현재 로컬 매물 ID 체계를 참조합니다.
- Phase 4(Listings) 전환 시 Supabase `listings`의 ID(UUID 등)와 기존 ID 체계가 다를 수 있으므로, Briefings의 `listing_ids` 매핑 전략을 미리 정해야 합니다.

**롤백 전략**
- 각 Phase마다 `USE_SUPABASE_*` 플래그로 즉시 로컬 저장소로 되돌릴 수 있는 구조가 좋습니다.
- 전환 직후 오류 시 로컬 모드로 복귀 가능해야 합니다.

### 3. Phase 1(Users) 우선 작업 권장
Users Repository 패턴이 없으면 이후 Phase의 권한·필터링 로직이 까다로워집니다. Phase 1을 먼저 완료한 뒤 Phase 2로 진행하는 것을 권장합니다.

---

## 실제 코드 검증 결과 (2026-01-29)

### 환경변수 플래그 현황
사용자 확인 결과 `.env` 파일에 다음 플래그가 `true`로 설정되어 있음:
- `USE_SUPABASE_CUSTOMERS=true`
- `USE_SUPABASE_BRIEFINGS=true`
- `USE_SUPABASE_RECOMMENDATIONS=true`

### Repository 패턴 적용 현황

**✅ 정상 작동하는 부분:**
1. **Customers API** (`app/routes/customers.py`):
   - 모든 CRUD 엔드포인트가 `get_customer_repository()` 사용
   - 플래그가 `true`이면 `SupabaseCustomerRepository` 사용
   - 플래그가 `false`이면 `FileCustomerRepository` 사용 (Excel 저장)

2. **Briefings Service** (`app/services/briefing_service.py`):
   - `BriefingService`가 `get_briefing_repository()` 사용
   - 플래그가 `true`이면 `SupabaseBriefingRepository` 사용
   - 플래그가 `false`이면 `FileBriefingRepository` 사용 (store.json 저장)

3. **Recommendations Service** (`app/services/recommendation_service.py`):
   - `RecommendationService`가 `get_recommendation_repository()` 사용
   - 플래그가 `true`이면 `SupabaseRecommendationRepository` 사용
   - 플래그가 `false`이면 `FileRecommendationRepository` 사용 (JSON 저장)

**⚠️ Repository 패턴 우회 문제:**
1. **Briefings API** (`app/routes/briefings.py` 39-40줄):
   ```python
   from app.services import store
   customers = store.list_customers(user, 'own', '')
   ```
   - `store.list_customers()` 직접 호출로 Repository 패턴 우회
   - 이 부분은 항상 로컬 Excel 파일을 읽음
   - **수정 필요**: `get_customer_repository()` 사용하도록 변경

2. **Customers API** (`app/routes/customers.py` 189줄):
   ```python
   from app.services import store
   managers = store.get_managers(user)
   ```
   - `store.get_managers()` 직접 호출로 Repository 패턴 우회
   - **수정 필요**: Repository를 통해 담당자 목록 조회하도록 변경

### 실제 작동 여부 분석

**✅ 대부분 정상 작동:**
- 플래그가 `true`이면 Factory 함수(`get_*_repository()`)가 Supabase Repository를 반환
- 따라서 Customers, Briefings, Recommendations의 주요 CRUD 작업은 Supabase에 저장됨
- Excel/JSON 파일 저장은 발생하지 않음 (플래그가 `true`인 경우)

**⚠️ 부분적 문제:**
- `briefings.py`의 `list_briefings_api()`에서 고객 필터링 시 `store.list_customers()` 직접 호출
- 이 부분은 플래그와 무관하게 항상 Excel 파일을 읽음
- Supabase에 저장된 고객 데이터와 불일치 가능성 있음

### 보고서와 실제 코드의 차이점

| 항목 | 보고서 내용 | 실제 코드 상태 |
|------|------------|---------------|
| **Customers 전환 상태** | "전환 가능" | ✅ **실제로 전환됨** (플래그 true 시) |
| **Briefings 전환 상태** | "전환 가능" | ✅ **실제로 전환됨** (플래그 true 시) |
| **Recommendations 전환 상태** | "전환 가능" | ✅ **실제로 전환됨** (플래그 true 시) |
| **Repository 패턴 적용** | "전환 가능" | ✅ **대부분 적용됨** (일부 우회 존재) |
| **Excel/JSON 저장** | "이중 저장 구조" | ✅ **플래그 true 시 저장 안 함** |

### 결론 및 권장사항

**현재 상태:**
- 환경변수 플래그가 `true`로 설정되어 있으므로, **Customers, Briefings, Recommendations는 실제로 Supabase를 사용 중**입니다.
- 보고서의 "전환 가능" 상태는 **"전환 완료"**로 업데이트해야 합니다.

**수정 필요 사항:**
1. `app/routes/briefings.py` 39-40줄: `store.list_customers()` → `get_customer_repository().list_customers()` 변경
2. `app/routes/customers.py` 189줄: `store.get_managers()` → Repository를 통한 담당자 목록 조회로 변경

**검증 방법:**
- Supabase 대시보드에서 `customers`, `briefings`, `recommendations` 테이블에 데이터가 실제로 저장되는지 확인
- Excel/JSON 파일의 수정 시간이 최근인지 확인 (플래그 true 시 수정되지 않아야 함)
- 서버 로그에서 "Supabase Repository 사용" 관련 메시지 확인

**보고서 업데이트 필요:**
- "현재 상태"를 "전환 완료"로 변경
- "전환 가능" → "전환 완료 (플래그 활성화됨)"로 수정
- 일부 코드에서 `store` 직접 호출 문제 추가

---

## Supabase 테이블 스키마 vs 코드 필드명 불일치 분석 (2026-01-29)

### 🔴 심각한 문제 발견: Customers 테이블 필드 불일치

**Supabase `customers` 테이블 실제 컬럼:**
```
id, created_by, name, phone, email, region, region2, manager, 
note, note2, note3, status, created_at, updated_at
```

**코드에서 사용하는 필드 (store.py, customer-add.js):**
```
floor, area, deposit, rent, premium, filter_data, 
regions (프론트엔드), notes (프론트엔드), 
floor_pref, budget, type_pref, size_pref (프론트엔드)
```

**❌ 누락된 필드:**
- `floor`, `area`, `deposit`, `rent`, `premium` → **Supabase 테이블에 없음**
- `filter_data` → **Supabase 테이블에 없음**
- `floor_pref`, `budget`, `type_pref`, `size_pref` → **Supabase 테이블에 없음**

**⚠️ 필드명 차이:**
- 코드: `regions` (단일 문자열, 쉼표로 구분) → Supabase: `region`, `region2` (분리된 컬럼)
- 코드: `notes` → Supabase: `note` (단수형)

### 신규 고객 등록 실패 원인 분석

**문제 발생 시나리오:**
1. 프론트엔드(`customer-add.js`)에서 `floor_pref`, `budget`, `type_pref`, `size_pref` 등 필드 전송
2. `SupabaseCustomerRepository._map_customer_fields()`에서 이 필드들을 **무시** (Supabase 테이블에 없으므로)
3. 하지만 `store.py`의 `create_customer()`는 이 필드들을 Excel에 저장하려고 시도
4. 플래그가 `true`일 때는 Supabase만 사용하므로, 이 필드들이 **손실됨**

**실제 코드 동작:**
- `SupabaseCustomerRepository._map_customer_fields()` (52-87줄):
  - `floor`, `area`, `deposit`, `rent`, `premium`, `filter_data` 필드를 **매핑하지 않음**
  - `regions`만 `region`, `region2`로 분리하여 저장
  - `notes`를 `note`로 변환

**결과:**
- 신규 고객 등록 시 `floor`, `area`, `deposit`, `rent`, `premium`, `filter_data` 필드가 **Supabase에 저장되지 않음**
- 이후 조회 시 이 필드들이 **빈 값으로 반환됨**

### Briefings 테이블 검증

**✅ Briefings 테이블: 정상**
- Supabase 컬럼: `id`, `customer_id`, `created_by`, `listing_ids`, `overrides`, `tags`, `status`, `created_at`, `updated_at`
- 코드 사용 필드: 모두 일치
- `created_by` ↔ `user` 필드명 변환은 `_map_briefing_to_response()`에서 처리됨

### Recommendations 테이블 검증

**✅ Recommendations 테이블: 정상**
- Supabase 컬럼: `listing_id`, `recommended_by`, `comments`, `created_at`, `updated_at`
- 코드 사용 필드: 모두 일치

### 해결 방안

**옵션 1: Supabase 테이블에 컬럼 추가 (권장)**
```sql
ALTER TABLE customers 
ADD COLUMN floor TEXT,
ADD COLUMN area TEXT,
ADD COLUMN deposit TEXT,
ADD COLUMN rent TEXT,
ADD COLUMN premium TEXT,
ADD COLUMN filter_data JSONB;
```

**옵션 2: 코드에서 필드 제거**
- 프론트엔드에서 `floor`, `area`, `deposit`, `rent`, `premium`, `filter_data` 필드 제거
- 기존 Excel 데이터와의 호환성 문제 발생 가능

**옵션 3: JSONB 필드로 통합**
- `preferences` JSONB 컬럼 추가하여 `floor`, `area`, `deposit`, `rent`, `premium`, `filter_data` 저장
- 코드 수정 필요

### 권장 조치사항

1. **즉시 조치**: Supabase `customers` 테이블에 누락된 컬럼 추가
2. **코드 수정**: `SupabaseCustomerRepository._map_customer_fields()`에서 누락 필드 매핑 추가
3. **데이터 마이그레이션**: 기존 Excel 데이터의 `floor`, `area`, `deposit`, `rent`, `premium`, `filter_data`를 Supabase로 이전
4. **테스트**: 신규 고객 등록 후 모든 필드가 정상 저장되는지 확인

### 결론

**신규 고객 등록 실패의 근본 원인:**
- Supabase `customers` 테이블에 필수 필드(`floor`, `area`, `deposit`, `rent`, `premium`, `filter_data`)가 없음
- `SupabaseCustomerRepository`가 이 필드들을 무시하여 데이터 손실 발생
- 보고서의 "필드 불일치" 문제가 실제로 발생 중

**보고서 수정 필요:**
- "2. Customers — 이중 저장 구조" 섹션에 "Supabase 테이블에 필수 필드 누락" 추가
- "전환 완료" 상태를 "전환 완료 (필드 불일치 문제 존재)"로 수정