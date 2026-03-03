# MCP 설정 후 스키마 진행

Supabase MCP를 먼저 연결한 뒤, AI가 SQL을 직접 실행해 스키마를 적용하는 흐름입니다.

---

## 스키마를 AI가 직접 알 수 있게 하기

DB 스키마(테이블·컬럼)를 **프로젝트에 파일로 내보내면**, AI가 그 파일을 읽어서 현재 구조를 파악하고 안전하게 코딩할 수 있습니다.

1. **.env에 DB 연결 정보 설정** (한 번만)
   - `SUPABASE_DB_PASSWORD=비밀번호` (Supabase 대시보드 → Settings → Database에서 확인)
   - 또는 `DATABASE_URL=postgresql://postgres:비밀번호@db.프로젝트ID.supabase.co:5432/postgres`

2. **스키마 내보내기 실행**
   ```bash
   pip install psycopg2-binary
   python scripts/export_supabase_schema.py
   ```
   - 성공 시 `scripts/current_schema.md`, `scripts/current_schema.json` 이 생성됩니다.

3. **스키마 변경 후**
   - 주택 스키마 적용, 테이블 추가/수정 등 한 뒤, 위 명령을 다시 실행해 두면  
     AI가 `current_schema.md`를 읽어 **현재 DB 구조를 그대로 기준으로** 코딩할 수 있습니다.

---

## 1. 적용해 둔 것

- **전역 MCP 설정** (`C:\Users\darkb\.cursor\mcp.json`)
  - Supabase MCP URL에 **project_ref=jwwdmtkwrejnwougcrod** 추가함 (이 프로젝트의 Supabase 연결용).
  - 스키마 생성(DDL)을 위해 **read_only는 넣지 않음**.

---

## 2. 사용자가 할 일 (한 번만)

1. **Cursor 완전 재시작**
   - Cursor를 종료했다가 다시 실행.

2. **Supabase 브라우저 인증**
   - Cursor가 Supabase 로그인 창을 띄우면:
     - Supabase 계정으로 로그인
     - **조직(Organization)** 선택 (이 프로젝트가 있는 조직)
     - MCP 클라이언트 접근 권한 **승인**

3. **연결 확인**
   - **Cursor Settings** → **Tools & MCP**
   - `supabase` 서버가 **연결됨** 상태인지 확인.

4. **이 채팅에 알려주기**
   - "MCP 인증 완료했어" 또는 "연결됐어"라고만 적어 주시면, 그다음에 제가:
     - 기존 스키마(`supabase_schema.sql`) 적용 여부 확인
     - 주택용 스키마(`supabase_schema_housing.sql`) **직접 실행** 시도
     - 실행 결과 확인 후 다음 단계 안내

---

## 3. 인증 후 제가 할 일

- Supabase MCP의 **execute_sql** 도구로:
  1. 필요하면 기존 스키마(트리거/정책 DROP 후 재생성) 실행
  2. 주택용 스키마(`address_geocode_cache`, `listings_housing`) 실행
  3. 에러가 나면 원인 확인 후 수정 제안 또는 재실행

---

## 4. 참고

- project_ref는 프로젝트 `.env`의 `SUPABASE_URL`에서 추린 값입니다. 다른 프로젝트를 쓰시면 `mcp.json`의 `project_ref`만 해당 프로젝트 ID로 바꾸시면 됩니다.
- 문제가 있으면 `SUPABASE_MCP_SETUP_GUIDE.md`의 "문제 해결" 섹션을 참고하세요.
