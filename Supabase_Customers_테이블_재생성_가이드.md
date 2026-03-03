# Supabase Customers 테이블 재생성 및 코드 수정 가이드

## 📋 목차
1. [현재 상황 요약](#현재-상황-요약)
2. [해결 방안 개요](#해결-방안-개요)
3. [단계별 실행 가이드](#단계별-실행-가이드)
4. [코드 수정 상세](#코드-수정-상세)
5. [테스트 방법](#테스트-방법)
6. [주의사항 및 롤백](#주의사항-및-롤백)

---

## 현재 상황 요약

### 문제점
- **Supabase `customers` 테이블에 필수 필드 누락**
  - 누락된 필드: `floor`, `area`, `deposit`, `rent`, `premium`, `filter_data`
  - 코드(`store.py`, `customer-add.js`)에서는 이 필드들을 사용하지만 Supabase 테이블에 컬럼이 없음
  - `SupabaseCustomerRepository._map_customer_fields()`가 이 필드들을 무시하여 데이터 손실 발생

### 영향
- 신규 고객 등록 시 `floor`, `area`, `deposit`, `rent`, `premium`, `filter_data` 필드가 저장되지 않음
- 이후 조회 시 빈 값으로 반환됨
- 프론트엔드에서 전송하는 `floor_pref`, `budget`, `type_pref`, `size_pref` 등 필드도 손실됨

### 결정 사항
- 기존 Excel 데이터는 무시해도 되는 테스트 데이터
- Supabase 테이블을 완전히 새로 생성하여 모든 필드를 포함하도록 재설계

---

## 해결 방안 개요

### 접근 방법
1. **기존 테이블 삭제 후 재생성** (권장)
   - `briefings` 테이블이 `customers` 테이블을 참조하므로 순서 중요
   - 외래키 제약조건 때문에 `briefings` 먼저 삭제 필요

2. **코드 수정**
   - `SupabaseCustomerRepository._map_customer_fields()` 함수 수정
   - 누락된 필드 매핑 추가
   - 프론트엔드 필드명과 Supabase 필드명 매핑 정리

3. **테스트 및 검증**
   - 신규 고객 등록 테스트
   - 모든 필드가 정상 저장되는지 확인

---

## 단계별 실행 가이드

### Step 1: Supabase 대시보드 접속

1. 브라우저에서 Supabase 프로젝트 대시보드 접속
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. 새 쿼리 작성 준비

### Step 2: 기존 데이터 백업 (선택사항)

**⚠️ 주의**: 기존 브리핑 데이터가 있다면 백업 필요

```sql
-- 기존 데이터 확인
SELECT COUNT(*) FROM briefings;
SELECT COUNT(*) FROM customers;

-- 데이터 백업 (필요시)
-- CSV로 내보내기 또는 아래 쿼리로 데이터 확인
SELECT * FROM briefings;
SELECT * FROM customers;
```

### Step 3: 기존 테이블 삭제

**⚠️ 중요**: 외래키 제약조건 때문에 `briefings` 테이블을 먼저 삭제해야 함

```sql
-- 1단계: briefings 테이블 삭제 (CASCADE로 외래키 제약조건도 함께 삭제)
DROP TABLE IF EXISTS briefings CASCADE;

-- 2단계: customers 테이블 삭제
DROP TABLE IF EXISTS customers CASCADE;

-- 확인: 테이블이 삭제되었는지 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('customers', 'briefings');
-- 결과가 없어야 정상
```

### Step 4: 새 customers 테이블 생성

```sql
-- customers 테이블 생성 (모든 필수 필드 포함)
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    created_by TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    manager TEXT DEFAULT '',
    region TEXT DEFAULT '',
    region2 TEXT DEFAULT '',
    note TEXT DEFAULT '',
    note2 TEXT DEFAULT '',
    note3 TEXT DEFAULT '',
    status TEXT DEFAULT '',
    -- 새로 추가된 필드들
    floor TEXT DEFAULT '',
    area TEXT DEFAULT '',
    deposit TEXT DEFAULT '',
    rent TEXT DEFAULT '',
    premium TEXT DEFAULT '',
    filter_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 테이블 생성 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
```

### Step 5: 새 briefings 테이블 생성

```sql
-- briefings 테이블 재생성 (customer_id 외래키 포함)
CREATE TABLE briefings (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL,
    listing_ids JSONB DEFAULT '[]',
    overrides JSONB DEFAULT '{}',
    tags JSONB DEFAULT '{}',
    status TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 테이블 생성 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'briefings'
ORDER BY ordinal_position;
```

### Step 6: RLS (Row Level Security) 정책 설정

**⚠️ 중요**: 프로젝트 코드를 확인한 결과, **서비스 역할 키(`SUPABASE_SERVICE_ROLE_KEY`)**를 사용하고 있습니다.
- 서비스 역할 키를 사용하면 RLS 정책을 우회하여 모든 데이터에 접근 가능합니다
- RLS를 활성화해도 서비스 역할 키로 접근하면 정책이 적용되지 않습니다
- 향후 JWT 기반 인증으로 전환할 경우를 대비하여 RLS 정책을 설정합니다

**실제 코드에서 사용하는 인증 방식:**
- `app/services/repositories/supabase/customer_repository.py`: `SUPABASE_SERVICE_ROLE_KEY` 사용
- `app/services/repositories/supabase/briefing_repository.py`: `SUPABASE_SERVICE_ROLE_KEY` 사용
- `app/services/repositories/supabase/recommendation_repository.py`: `SUPABASE_SERVICE_ROLE_KEY` 사용

**기존 스키마 파일(`scripts/supabase_schema.sql`)의 RLS 정책을 기반으로 작성:**

```sql
-- RLS 활성화
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

-- customers 테이블 RLS 정책
DROP POLICY IF EXISTS "Users can view own customers" ON customers;
CREATE POLICY "Users can view own customers" ON customers
  FOR SELECT USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email' OR
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') IN ('manager', 'admin')
  );

DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
CREATE POLICY "Users can insert own customers" ON customers
  FOR INSERT WITH CHECK (
    created_by = current_setting('request.jwt.claims', true)::json->>'email'
  );

DROP POLICY IF EXISTS "Users can update own customers" ON customers;
CREATE POLICY "Users can update own customers" ON customers
  FOR UPDATE USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email' OR
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') IN ('manager', 'admin')
  );

DROP POLICY IF EXISTS "Users can delete own customers" ON customers;
CREATE POLICY "Users can delete own customers" ON customers
  FOR DELETE USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email' OR
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') = 'admin'
  );

-- briefings 테이블 RLS 정책
DROP POLICY IF EXISTS "Users can view own briefings" ON briefings;
CREATE POLICY "Users can view own briefings" ON briefings
  FOR SELECT USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email' OR
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') IN ('manager', 'admin')
  );

DROP POLICY IF EXISTS "Users can manage own briefings" ON briefings;
CREATE POLICY "Users can manage own briefings" ON briefings
  FOR ALL USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email' OR
    (SELECT role FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') IN ('manager', 'admin')
  );
```

**정책 설명:**

1. **SELECT (조회)**: 
   - 본인이 생성한 데이터(`created_by`가 본인 이메일) 또는
   - 매니저/어드민 역할인 경우 모든 데이터 조회 가능

2. **INSERT (생성)**: 
   - 고객을 생성할 때 `created_by` 필드에 본인의 이메일을 넣어야만 생성 가능
   - 다른 사람의 이메일을 넣으려고 하면 차단됨
   - **실제 코드 동작**: `customer_repository.py`의 `create_customer()` 함수에서 자동으로 `created_by = user_email`로 설정하므로, 로그인한 사용자의 이메일이 자동으로 들어감

3. **UPDATE (수정)**: 
   - 본인이 생성한 데이터(`created_by`가 본인 이메일) 또는
   - 매니저/어드민 역할인 경우 수정 가능

4. **DELETE (삭제)**: 
   - 본인이 생성한 데이터(`created_by`가 본인 이메일) 또는
   - 어드민 역할인 경우 삭제 가능

**현재 상황:**
- **서비스 역할 키를 사용하므로 위 정책은 현재는 적용되지 않습니다**
- 서비스 역할 키는 RLS 정책을 우회하므로, 코드에서 어떤 값을 넣어도 모두 허용됨
- 향후 JWT 기반 인증으로 전환할 경우를 대비하여 설정해 둡니다
- 서비스 역할 키 사용을 계속할 경우 RLS를 비활성화해도 되지만, 보안상 활성화해 두는 것을 권장합니다

### Step 7: 인덱스 생성 (성능 최적화)

```sql
-- customers 테이블 인덱스
CREATE INDEX idx_customers_created_by ON customers(created_by);
CREATE INDEX idx_customers_manager ON customers(manager);
CREATE INDEX idx_customers_region ON customers(region);

-- briefings 테이블 인덱스
CREATE INDEX idx_briefings_customer_id ON briefings(customer_id);
CREATE INDEX idx_briefings_created_by ON briefings(created_by);
```

---

## 코드 수정 상세

### 파일: `app/services/repositories/supabase/customer_repository.py`

#### 수정 위치: `_map_customer_fields()` 함수 (52-87줄)

**기존 코드:**
```python
def _map_customer_fields(payload: Dict[str, Any], user_email: str) -> Dict[str, Any]:
    """프론트엔드 필드명을 Supabase 테이블 필드명으로 매핑"""
    # regions 필드 정규화
    regions = payload.get("regions", "")
    normalized_region = normalize_region(regions)
    
    # region과 region2 분리 (예: "부평구, 계양구" -> region="부평구", region2="계양구")
    region_parts = [r.strip() for r in normalized_region.split(",") if r.strip()]
    region = region_parts[0] if len(region_parts) > 0 else ""
    region2 = region_parts[1] if len(region_parts) > 1 else ""
    
    # Supabase 테이블 구조에 맞게 매핑
    record = {
        'id': _generate_customer_id(payload.get("name", ""), payload.get("phone", "")),
        'created_by': user_email,
        'name': payload.get("name", ""),
        'phone': payload.get("phone", ""),
        'email': payload.get("email", ""),
        'region': region,
        'region2': region2,
        'manager': payload.get("manager", ""),
        'note': payload.get("notes", ""),  # 프론트엔드의 notes -> note
        'note2': payload.get("note2", ""),
        'note3': payload.get("note3", ""),
        'status': payload.get("status", ""),
    }
    
    # created_at이 있으면 사용, 없으면 현재 시간
    if payload.get("created_at"):
        try:
            # 문자열 형식의 날짜를 ISO 형식으로 변환
            record['created_at'] = payload.get("created_at")
        except:
            record['created_at'] = datetime.now().isoformat()
    
    return record
```

**수정된 코드:**
```python
def _map_customer_fields(payload: Dict[str, Any], user_email: str) -> Dict[str, Any]:
    """프론트엔드 필드명을 Supabase 테이블 필드명으로 매핑"""
    # regions 필드 정규화
    regions = payload.get("regions", "")
    normalized_region = normalize_region(regions)
    
    # region과 region2 분리 (예: "부평구, 계양구" -> region="부평구", region2="계양구")
    region_parts = [r.strip() for r in normalized_region.split(",") if r.strip()]
    region = region_parts[0] if len(region_parts) > 0 else ""
    region2 = region_parts[1] if len(region_parts) > 1 else ""
    
    # filter_data 처리 (JSONB 형식)
    filter_data = payload.get("filter_data", {})
    if isinstance(filter_data, str):
        try:
            import json
            filter_data = json.loads(filter_data)
        except:
            filter_data = {}
    elif not isinstance(filter_data, dict):
        filter_data = {}
    
    # Supabase 테이블 구조에 맞게 매핑 (모든 필드 포함)
    record = {
        'id': _generate_customer_id(payload.get("name", ""), payload.get("phone", "")),
        'created_by': user_email,
        'name': payload.get("name", ""),
        'phone': payload.get("phone", ""),
        'email': payload.get("email", ""),
        'region': region,
        'region2': region2,
        'manager': payload.get("manager", ""),
        'note': payload.get("notes", "") or payload.get("note", ""),  # 프론트엔드의 notes -> note
        'note2': payload.get("note2", ""),
        'note3': payload.get("note3", ""),
        'status': payload.get("status", ""),
        # 새로 추가된 필드들
        'floor': payload.get("floor", "") or payload.get("floor_pref", ""),
        'area': payload.get("area", "") or payload.get("size_pref", ""),
        'deposit': payload.get("deposit", "") or payload.get("budget", ""),
        'rent': payload.get("rent", ""),
        'premium': payload.get("premium", ""),
        'filter_data': filter_data,
    }
    
    # created_at이 있으면 사용, 없으면 현재 시간
    if payload.get("created_at"):
        try:
            # 문자열 형식의 날짜를 ISO 형식으로 변환
            record['created_at'] = payload.get("created_at")
        except:
            record['created_at'] = datetime.now().isoformat()
    
    return record
```

#### 수정 위치: `_map_customer_to_response()` 함수 (89-125줄)

**기존 코드:**
```python
def _map_customer_to_response(customer: Dict[str, Any]) -> Dict[str, Any]:
    """Supabase 데이터를 프론트엔드 형식으로 변환"""
    result = {
        'id': customer.get('id'),
        'name': customer.get('name'),
        'phone': customer.get('phone'),
        'email': customer.get('email', ''),
        'manager': customer.get('manager', ''),
        'notes': customer.get('note', ''),  # note -> notes
        'note2': customer.get('note2', ''),
        'note3': customer.get('note3', ''),
        'status': customer.get('status', ''),
        'created_by': customer.get('created_by'),
        'created_at': customer.get('created_at'),
    }
    
    # region과 region2를 regions로 합치기
    region = customer.get('region', '')
    region2 = customer.get('region2', '')
    if region2:
        result['regions'] = f"{region}, {region2}"
    else:
        result['regions'] = region
    
    # 추가 필드들 (필요한 경우)
    if 'floor' in customer:
        result['floor'] = customer['floor']
    if 'area' in customer:
        result['area'] = customer['area']
    if 'deposit' in customer:
        result['deposit'] = customer['deposit']
    if 'rent' in customer:
        result['rent'] = customer['rent']
    if 'premium' in customer:
        result['premium'] = customer['premium']
    
    return result
```

**수정된 코드:**
```python
def _map_customer_to_response(customer: Dict[str, Any]) -> Dict[str, Any]:
    """Supabase 데이터를 프론트엔드 형식으로 변환"""
    result = {
        'id': customer.get('id'),
        'name': customer.get('name'),
        'phone': customer.get('phone'),
        'email': customer.get('email', ''),
        'manager': customer.get('manager', ''),
        'notes': customer.get('note', ''),  # note -> notes
        'note2': customer.get('note2', ''),
        'note3': customer.get('note3', ''),
        'status': customer.get('status', ''),
        'created_by': customer.get('created_by'),
        'created_at': customer.get('created_at'),
        # 새로 추가된 필드들
        'floor': customer.get('floor', ''),
        'area': customer.get('area', ''),
        'deposit': customer.get('deposit', ''),
        'rent': customer.get('rent', ''),
        'premium': customer.get('premium', ''),
        'filter_data': customer.get('filter_data', {}),
    }
    
    # region과 region2를 regions로 합치기
    region = customer.get('region', '')
    region2 = customer.get('region2', '')
    if region2:
        result['regions'] = f"{region}, {region2}"
    else:
        result['regions'] = region
    
    return result
```

#### 수정 위치: `update_customer()` 메서드 (184-225줄)

**기존 코드의 업데이트 부분에 추가:**
```python
def update_customer(self, customer_id: str, updates: Dict[str, Any], user_email: str) -> Optional[Dict[str, Any]]:
    """고객 수정"""
    # updates를 Supabase 형식으로 변환
    update_data = {}
    
    # 필드 매핑
    if 'name' in updates:
        update_data['name'] = updates['name']
    if 'phone' in updates:
        update_data['phone'] = updates['phone']
    if 'email' in updates:
        update_data['email'] = updates['email']
    if 'manager' in updates:
        update_data['manager'] = updates['manager']
    if 'notes' in updates:
        update_data['note'] = updates['notes']  # notes -> note
    if 'note2' in updates:
        update_data['note2'] = updates['note2']
    if 'note3' in updates:
        update_data['note3'] = updates['note3']
    if 'status' in updates:
        update_data['status'] = updates['status']
    if 'regions' in updates:
        # regions를 region, region2로 분리
        normalized_region = normalize_region(updates['regions'])
        region_parts = [r.strip() for r in normalized_region.split(",") if r.strip()]
        update_data['region'] = region_parts[0] if len(region_parts) > 0 else ""
        update_data['region2'] = region_parts[1] if len(region_parts) > 1 else ""
    
    # 새로 추가된 필드들
    if 'floor' in updates:
        update_data['floor'] = updates['floor']
    if 'area' in updates:
        update_data['area'] = updates['area']
    if 'deposit' in updates:
        update_data['deposit'] = updates['deposit']
    if 'rent' in updates:
        update_data['rent'] = updates['rent']
    if 'premium' in updates:
        update_data['premium'] = updates['premium']
    if 'filter_data' in updates:
        filter_data = updates['filter_data']
        if isinstance(filter_data, str):
            try:
                import json
                filter_data = json.loads(filter_data)
            except:
                filter_data = {}
        elif not isinstance(filter_data, dict):
            filter_data = {}
        update_data['filter_data'] = filter_data
    
    # 빈 값이나 None인 경우 제외
    update_data = {k: v for k, v in update_data.items() if v is not None and v != '' and v != 'undefined'}
    
    if not update_data:
        # 업데이트할 데이터가 없으면 조회만
        return self.get_customer(customer_id, user_email)
    
    # Supabase 업데이트
    result = self.supabase.table('customers').update(update_data).eq('id', customer_id).execute()
    
    if result.data and len(result.data) > 0:
        return _map_customer_to_response(result.data[0])
    return None
```

---

## 테스트 방법

### 1. 테이블 생성 확인

Supabase SQL Editor에서 실행:
```sql
-- customers 테이블 컬럼 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- briefings 테이블 컬럼 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'briefings'
ORDER BY ordinal_position;
```

예상 결과:
- `customers` 테이블에 `floor`, `area`, `deposit`, `rent`, `premium`, `filter_data` 컬럼이 있어야 함
- `briefings` 테이블이 정상적으로 생성되어 있어야 함

### 2. 신규 고객 등록 테스트

**프론트엔드에서 테스트:**
1. 브라우저에서 애플리케이션 접속
2. 고객 등록 모달 열기
3. 다음 필드들을 입력:
   - 담당자: 테스트 담당자
   - 고객명: 테스트 고객
   - 연락처: 010-1234-5678
   - 지역: 부평구, 계양구
   - 층수: 1층
   - 면적: 30평
   - 보증금: 1000만원
   - 월세: 50만원
   - 권리금: 500만원
   - 비고: 테스트 비고
4. 등록 버튼 클릭

**Supabase에서 확인:**
```sql
-- 최근 등록된 고객 확인
SELECT * FROM customers 
ORDER BY created_at DESC 
LIMIT 1;

-- 모든 필드가 정상적으로 저장되었는지 확인
SELECT 
    id, name, phone, manager, region, region2,
    floor, area, deposit, rent, premium, filter_data, note
FROM customers 
ORDER BY created_at DESC 
LIMIT 1;
```

**예상 결과:**
- 모든 필드가 정상적으로 저장되어 있어야 함
- `region` = "부평구", `region2` = "계양구"
- `floor` = "1층", `area` = "30평", `deposit` = "1000만원", `rent` = "50만원", `premium` = "500만원"
- `note` = "테스트 비고"

### 3. 고객 조회 테스트

**프론트엔드에서 테스트:**
1. 고객 목록 페이지 접속
2. 방금 등록한 고객이 목록에 표시되는지 확인
3. 고객 상세 정보 확인
4. 모든 필드가 정상적으로 표시되는지 확인

**API 테스트 (선택사항):**
```bash
# 고객 목록 조회
curl -X GET "http://localhost:5000/api/customers" \
  -H "X-User: test@example.com"

# 고객 상세 조회
curl -X GET "http://localhost:5000/api/customers/{customer_id}" \
  -H "X-User: test@example.com"
```

### 4. 고객 수정 테스트

**프론트엔드에서 테스트:**
1. 고객 목록에서 고객 선택
2. 수정 모달 열기
3. 필드 수정 (예: 층수 변경)
4. 저장 버튼 클릭
5. Supabase에서 변경사항 확인

**Supabase에서 확인:**
```sql
-- 수정된 고객 확인
SELECT id, name, floor, updated_at 
FROM customers 
WHERE id = '{customer_id}';
```

### 5. 브리핑 생성 테스트

**프론트엔드에서 테스트:**
1. 고객 선택
2. 매물 선택하여 브리핑 생성
3. 브리핑이 정상적으로 생성되는지 확인

**Supabase에서 확인:**
```sql
-- 브리핑 확인
SELECT * FROM briefings 
ORDER BY created_at DESC 
LIMIT 1;

-- 외래키 제약조건 확인
SELECT 
    b.id as briefing_id,
    b.customer_id,
    c.name as customer_name
FROM briefings b
JOIN customers c ON b.customer_id = c.id
ORDER BY b.created_at DESC
LIMIT 1;
```

---

## 주의사항 및 롤백

### 주의사항

1. **데이터 손실**
   - 기존 `customers`와 `briefings` 테이블의 모든 데이터가 삭제됩니다
   - 중요한 데이터가 있다면 반드시 백업하세요

2. **RLS 정책**
   - 프로젝트의 실제 인증 방식을 확인하고 RLS 정책을 적절히 수정해야 합니다
   - 서비스 역할 키를 사용하는 경우 RLS를 비활성화할 수도 있습니다

3. **외래키 제약조건**
   - `briefings` 테이블이 `customers` 테이블을 참조하므로 삭제 순서가 중요합니다
   - `CASCADE` 옵션을 사용하면 자동으로 처리됩니다

4. **코드 배포**
   - Supabase 테이블 재생성 후 코드를 배포해야 합니다
   - 코드 배포 전에 테이블만 재생성하면 에러가 발생할 수 있습니다

### 롤백 방법

**만약 문제가 발생하여 롤백이 필요한 경우:**

1. **코드 롤백**
   ```bash
   # Git을 사용하는 경우
   git checkout HEAD -- app/services/repositories/supabase/customer_repository.py
   ```

2. **환경변수 롤백**
   ```bash
   # .env 파일에서 플래그를 false로 변경
   USE_SUPABASE_CUSTOMERS=false
   USE_SUPABASE_BRIEFINGS=false
   ```

3. **테이블 롭백 (복구 불가능)**
   - 테이블을 삭제한 경우 데이터 복구는 불가능합니다
   - 백업이 있다면 백업에서 복구하세요

### 문제 해결

**문제: 테이블 삭제 후 생성 시 에러 발생**
```sql
-- 에러 메시지 확인
-- 일반적으로 외래키 제약조건 관련 에러일 수 있음
-- CASCADE 옵션을 사용했는지 확인

-- 강제로 모든 관련 객체 삭제
DROP TABLE IF EXISTS briefings CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP SEQUENCE IF EXISTS customers_id_seq CASCADE;
DROP SEQUENCE IF EXISTS briefings_id_seq CASCADE;
```

**문제: 코드 수정 후에도 필드가 저장되지 않음**
- Supabase 테이블에 컬럼이 실제로 추가되었는지 확인
- 코드의 `_map_customer_fields()` 함수가 수정되었는지 확인
- 서버를 재시작했는지 확인

**문제: RLS 정책으로 인해 데이터 조회 불가**
```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'customers';

-- RLS 임시 비활성화 (테스트용)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE briefings DISABLE ROW LEVEL SECURITY;

-- 프로덕션에서는 적절한 정책을 설정해야 함
```

---

## 체크리스트

실행 전 확인:
- [ ] 기존 데이터 백업 완료 (필요한 경우)
- [ ] Supabase 대시보드 접속 가능
- [ ] SQL Editor 접근 권한 확인

실행 중:
- [ ] Step 3: 기존 테이블 삭제 완료
- [ ] Step 4: 새 customers 테이블 생성 완료
- [ ] Step 5: 새 briefings 테이블 생성 완료
- [ ] Step 6: RLS 정책 설정 완료
- [ ] Step 7: 인덱스 생성 완료

코드 수정:
- [ ] `_map_customer_fields()` 함수 수정 완료
- [ ] `_map_customer_to_response()` 함수 수정 완료
- [ ] `update_customer()` 메서드 수정 완료
- [ ] 코드 저장 및 서버 재시작

테스트:
- [ ] 테이블 생성 확인 완료
- [ ] 신규 고객 등록 테스트 완료
- [ ] 고객 조회 테스트 완료
- [ ] 고객 수정 테스트 완료
- [ ] 브리핑 생성 테스트 완료

---

## 완료 후 확인사항

모든 작업이 완료되면 다음을 확인하세요:

1. **Supabase 대시보드**
   - `customers` 테이블에 모든 필드가 정상적으로 생성되었는지 확인
   - `briefings` 테이블이 정상적으로 생성되었는지 확인
   - RLS 정책이 적절히 설정되었는지 확인

2. **애플리케이션**
   - 신규 고객 등록이 정상적으로 작동하는지 확인
   - 모든 필드가 정상적으로 저장되는지 확인
   - 고객 조회 시 모든 필드가 정상적으로 표시되는지 확인

3. **로그**
   - 서버 로그에서 에러가 없는지 확인
   - Supabase 연결 관련 에러가 없는지 확인

---

## 추가 참고사항

### 필드 매핑 정리

| 프론트엔드 필드명 | Supabase 컬럼명 | 비고 |
|-----------------|----------------|------|
| `regions` | `region`, `region2` | 쉼표로 분리 |
| `notes` | `note` | 단수형 |
| `floor_pref` | `floor` | 우선순위: `floor` > `floor_pref` |
| `size_pref` | `area` | 우선순위: `area` > `size_pref` |
| `budget` | `deposit` | 우선순위: `deposit` > `budget` |
| `filter_data` | `filter_data` | JSONB 형식 |

### 향후 확장 고려사항

- `filter_data`는 JSONB 형식이므로 향후 복잡한 필터 조건을 저장할 수 있습니다
- 필요시 추가 필드를 쉽게 추가할 수 있도록 설계되었습니다
- 인덱스는 성능 최적화를 위해 추가되었으며, 실제 사용 패턴에 따라 조정 가능합니다

---

**작성일**: 2026-01-29  
**작성자**: AI Assistant  
**버전**: 1.0
