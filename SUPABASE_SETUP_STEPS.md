# Supabase 설정 단계별 가이드

## 📋 현재 상태

- [x] Supabase MCP 연결 완료
- [x] Python Supabase 클라이언트 설치 완료
- [x] 환경변수 설정 완료

---

## 🎯 다음 단계

### 1단계: Supabase에 테이블 생성 (뼈대 세우기)

#### 방법 1: Cursor AI MCP 사용 (권장)

Cursor 채팅에서 다음을 요청하세요:

```
"SUPABASE_IMPLEMENTATION_PLAN.md 파일의 테이블 스키마를 참고해서 
Supabase에 다음 테이블들을 생성해줘:
1. users 테이블
2. customers 테이블  
3. briefings 테이블
4. recommendations 테이블
5. listings 테이블

그리고 필요한 인덱스와 RLS 정책도 모두 설정해줘."
```

#### 방법 2: SQL 스크립트 직접 실행

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 좌측 메뉴에서 "SQL Editor" 클릭

3. **SQL 스크립트 실행**
   - `scripts/supabase_schema.sql` 파일 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭

4. **실행 결과 확인**
   - "Success. No rows returned" 메시지 확인
   - Table Editor에서 테이블 생성 확인

---

### 2단계: 기존 데이터 마이그레이션

#### Python 스크립트 실행

```powershell
# 1. 프로젝트 디렉토리로 이동
cd c:\code1\realestate-management

# 2. 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 3. 마이그레이션 스크립트 실행
python scripts/migrate_to_supabase.py
```

**마이그레이션 대상:**
- `data/state/users.json` → `users` 테이블
- `data/state/customers.json` → `customers` 테이블
- `data/state/briefings.json` → `briefings` 테이블
- `data/state/recommendations.json` → `recommendations` 테이블

**주의사항:**
- 기존 데이터가 있으면 upsert로 업데이트됩니다
- 데이터가 없으면 건너뜁니다

---

### 3단계: 데이터 확인

1. **Supabase 대시보드에서 확인**
   - Table Editor에서 각 테이블 데이터 확인
   - 데이터 개수 확인

2. **마이그레이션 결과 확인**
   - 스크립트 실행 시 출력된 로그 확인
   - 오류가 있으면 확인 및 수정

---

### 4단계: Google Sheets 동기화 설정 (다음 단계)

테이블 생성 및 데이터 마이그레이션이 완료된 후:
- Google Sheets 웹훅 설정
- 웹훅 핸들러 구현
- 실시간 동기화 테스트

---

## ✅ 체크리스트

### 테이블 생성
- [ ] users 테이블 생성 완료
- [ ] customers 테이블 생성 완료
- [ ] briefings 테이블 생성 완료
- [ ] recommendations 테이블 생성 완료
- [ ] listings 테이블 생성 완료
- [ ] 인덱스 생성 완료
- [ ] RLS 정책 설정 완료

### 데이터 마이그레이션
- [ ] users 데이터 마이그레이션 완료
- [ ] customers 데이터 마이그레이션 완료
- [ ] briefings 데이터 마이그레이션 완료
- [ ] recommendations 데이터 마이그레이션 완료
- [ ] 데이터 검증 완료

---

## 🚨 문제 해결

### 문제 1: 테이블 생성 실패

**증상:**
- SQL 실행 시 오류 발생

**해결 방법:**
1. SQL 문법 오류 확인
2. 테이블이 이미 존재하는지 확인
3. `CREATE TABLE IF NOT EXISTS` 사용 (스크립트에 포함됨)

### 문제 2: 마이그레이션 스크립트 실행 실패

**증상:**
- `SUPABASE_URL` 또는 `SUPABASE_SERVICE_ROLE_KEY` 오류

**해결 방법:**
1. `.env` 파일 확인
2. 환경변수가 올바른지 확인
3. 가상환경이 활성화되어 있는지 확인

### 문제 3: 데이터 마이그레이션 실패

**증상:**
- 특정 레코드만 실패

**해결 방법:**
1. 오류 메시지 확인
2. 데이터 형식 확인
3. 필수 필드 누락 확인

---

## 📝 다음 작업

테이블 생성 및 데이터 마이그레이션이 완료되면:

1. **Repository 패턴 구현**
   - `app/services/repositories/` 디렉토리 생성
   - File Repository 구현
   - Supabase Repository 구현

2. **기능별 전환**
   - 환경변수로 기능 플래그 설정
   - 단계별로 Flask → Supabase 전환

3. **Google Sheets 동기화**
   - 웹훅 설정
   - 실시간 동기화 구현

---

*각 단계를 완료한 후 다음 단계로 진행하세요.*
