# Supabase DB 비밀번호 찾기 / 상가임대차 DB 폐기

---

## 1. DB 비밀번호 찾기

Supabase는 **보안상 이미 설정한 DB 비밀번호를 다시 보여주지 않습니다.**  
그래서 "찾기"는 불가능하고, **새 비밀번호로 재설정**만 할 수 있습니다.

### 비밀번호 재설정 절차

1. **Supabase 대시보드** 접속  
   - https://supabase.com/dashboard  
   - 해당 **프로젝트** 선택

2. **Database 설정** 이동  
   - 왼쪽 메뉴 **Settings** (톱니바퀴)  
   - **Database** 클릭  
   - 또는 직접: `https://supabase.com/dashboard/project/프로젝트ID/settings/database`

3. **Reset database password**  
   - 페이지에서 **"Reset database password"** (또는 "Database password" 섹션의 재설정) 클릭  
   - **새 비밀번호** 입력 후 저장

4. **.env 반영**  
   - 프로젝트 루트 `.env` 에 아래 중 하나로 새 비밀번호 넣기  
   - `SUPABASE_DB_PASSWORD=방금_설정한_비밀번호`  
   - 또는 Connection string 전체를 복사해 `DATABASE_URL=...` 로 넣기 (비밀번호 포함)

이후 `python scripts/export_supabase_schema.py` 등 DB 연결 스크립트는 새 비밀번호로 동작합니다.

---

## 2. 기존 상가임대차 DB "폐기"하는 방법

"폐기"는 두 가지로 생각할 수 있습니다.

### 방법 A: 같은 프로젝트 유지 + DB만 비우기 (추천)

- **Supabase 프로젝트(URL, API 키)는 그대로 두고**,  
  기존 테이블·데이터만 지우고 **처음부터 스키마 다시 적용**하는 방식입니다.

**장점**  
- `.env` 의 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 그대로 사용 가능  
- 앱 설정 변경 최소화  
- 주택 스키마만 새로 적용하면 됨  

**절차 요약**

1. Supabase 대시보드 → **SQL Editor**
2. 아래 SQL 로 **public 스키마의 모든 테이블 삭제** (필요하면 CASCADE 로 의존 관계까지 제거):

   ```sql
   -- 주의: 실행 시 public 스키마의 모든 테이블이 삭제됩니다.
   DO $$
   DECLARE
     r RECORD;
   BEGIN
     FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
     LOOP
       EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
     END LOOP;
   END $$;
   ```

3. 그다음 **스키마 다시 적용**  
   - 기존 `scripts/supabase_schema.sql` (users, customers, briefings 등 필요한 것만)  
   - `scripts/supabase_schema_housing.sql` (주택용)  
   - 원하는 순서대로 SQL Editor에서 실행

4. 필요하면 **스키마 내보내기**  
   - `python scripts/export_supabase_schema.py`  
   - `scripts/current_schema.md` 를 보고 이후 코딩

이렇게 하면 "상가임대차용으로 쓰던 DB"는 비워지고, 같은 프로젝트에서 새 스키마로 다시 시작하는 형태가 됩니다.

---

### 방법 B: 프로젝트 자체를 새로 만들기

- 상가임대차용 **Supabase 프로젝트를 아예 안 쓰고**,  
  **새 프로젝트**를 만들어서 주택·새 구조만 쓰는 방식입니다.

**절차 요약**

1. Supabase 대시보드에서 **New project** 로 새 프로젝트 생성  
2. 새 프로젝트의 **Settings → API / Database** 에서  
   - Project URL  
   - anon key / service_role key  
   - Database password (설정 후 .env 에 넣기)  
   확인 후 `.env` 전부 갱신  
3. 새 프로젝트 **SQL Editor** 에서  
   - `supabase_schema.sql`  
   - `supabase_schema_housing.sql`  
   순서대로 실행  
4. `python scripts/export_supabase_schema.py` 로 `current_schema.md` 갱신  

**장점**  
- 예전 상가임대차 DB와 완전 분리  
- 새 프로젝트에서 비밀번호를 처음부터 알고 있음  

**단점**  
- `.env` 와 배포/연동 설정을 새 프로젝트 기준으로 모두 바꿔야 함  

---

## 3. 정리

| 하고 싶은 일 | 추천 |
|-------------|------|
| DB 비밀번호를 모르겠다 | **Settings → Database → Reset database password** 로 새 비밀번호 설정 후 `.env` 에만 반영하면 됨. |
| 상가임대차 DB는 버리고, 같은 Supabase 프로젝트는 계속 쓰고 싶다 | **방법 A**: SQL Editor에서 public 테이블 전부 DROP 후, 스키마 SQL 다시 실행. |
| 상가임대차용 프로젝트 자체를 안 쓰고 새로 시작하고 싶다 | **방법 B**: 새 Supabase 프로젝트 생성 후, 거기에만 스키마 적용하고 `.env` 를 새 프로젝트로 갱신. |

원하시는 쪽(같은 프로젝트에서 DB만 비우기 vs 새 프로젝트) 정해 주시면, 그에 맞춰 실행 순서나 SQL만 더 구체적으로 적어 드리겠습니다.
