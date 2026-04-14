# 세션 만료 현상 추가 심층 분석 및 최종 해결 방안 (V3)

## 1. 개요
`SECRET_KEY`가 이미 설정되어 있음에도 불구하고, Vercel 프로덕션 환경에서 사용 도중 세션이 끊기는 현상은 **쿠키 보안 설정(Secure Flag)** 및 **서버리스 인스턴스 전파 과정의 데이터 불일치**에서 기인합니다. 시크릿 키는 이미 잘 설정되어 있으므로, 이를 활용하는 방식과 브라우저 쿠키 전달 정책을 수정해야 합니다.

---

## 2. 세션 단절의 핵심 원인 (Secret Key 외 분석)

### 2.1. HTTPS 환경에서 Secure 플래그 누락 (가장 유력)
- **현재 상황**: `.env`에 `REQUIRE_HTTPS=false`로 설정되어 있어 Flask 세션 쿠키에 `Secure` 플래그가 붙지 않습니다.
- **Vercel 특성**: Vercel은 100% HTTPS 환경입니다. 최신 브라우저는 보안상의 이유로 HTTPS 사이트에서 `Secure` 플래그가 없는 쿠키를 매우 불안정하게 취급하며, 특히 백그라운드 요청(매물 검색 등) 시 쿠키 전송을 거부하거나 세션을 즉시 파기할 수 있습니다.

### 2.2. 기본 쿠키 이름 (`session`) 사용에 따른 충돌
- **문제점**: 현재 세션 쿠키 이름이 Flask 기본값인 `session`으로 설정되어 있습니다.
- **결과**: `*.vercel.app` 하위 도메인이나 동일 계정의 다른 프로젝트가 있을 경우, 브라우저가 타 프로젝트의 `session` 쿠키와 혼동하여 덮어쓰거나 무효화할 가능성이 큽니다.

### 2.3. DB 연결 일시 오류 시의 위험한 폴백(Fallback) 로직
- **현재 구조**: `repositories/__init__.py` 코드를 보면, Supabase 연결에 일시적인 지연이나 오류가 발생할 경우 곧바로 **파일 기반 저장소(FileUserRepository)**로 넘어갑니다.
- **결과**: Vercel의 파일 시스템은 일회성(Ephemeral)이므로, DB 연결이 아주 잠깐만 끊겨도 서버는 "유형성 파일"에서 사용자를 찾으려 하고, 당연히 사용자가 없으므로 세션을 강제 종료(session.clear) 시켜버립니다.

---

## 3. 최종 해결을 위한 실행 계획

### 3.1. 쿠키 설정 및 이름 명시화
- `SESSION_COOKIE_NAME = 'realestate_session_v1'` 와 같이 고유 이름을 부여합니다.
- Vercel 환경에서는 `REQUIRE_HTTPS` 설정과 무관하게 `SESSION_COOKIE_SECURE = True`를 강제 적용합니다.

### 3.2. 저장소 폴백 로직 제거
- `USE_SUPABASE_USERS=true`인 경우, 일시적인 오류로 인해 파일 저장소로 넘어가는 대신 에러를 반환하게 하여 세션이 파기되는 것을 방지합니다.

---

## 4. 즉시 적용을 위한 수정 프롬프트

아래 내용을 Antigravity에 명령하여 코드를 수정하십시오.

```markdown
### [Execution] 세션 안정성 강화를 위한 쿠키 및 저장소 로직 수정

**1. 쿠키 설정 강화 (`app/__init__.py`):**
- `SESSION_COOKIE_NAME`을 `'re_mgmt_session_secure'`로 설정해라.
- `is_vercel()`을 사용하여 Vercel 환경일 경우 `SESSION_COOKIE_SECURE = True`를 강제로 적용해라.
- `SESSION_COOKIE_SAMESITE`를 `'Lax'`로 유지하되, 모든 응답에서 쿠키가 확실히 갱신되도록 해라.

**2. 저장소 무결성 확보 (`app/services/repositories/__init__.py`):**
- `get_user_repository()` 함수에서 Supabase 사용 설정(`USE_SUPABASE_USERS`)이 되어 있음에도 불구하고 클라이언트 생성에 실패하거나 오류가 발생할 경우, **파일 저장소로 폴백(Fallback)하지 말고 즉시 예외(Exception)를 발생**시켜라. (파일 저장소로 넘어가서 세션이 파기되는 현상 방지)

**3. 환경 설정 점검 (`app/config.py`):**
- `AppConfig` 클래스에서 `SESSION_COOKIE_NAME` 속성을 추가하고 기본값을 설정해라.
```

---
**보고서 업데이트**: 2026-04-14
**상태**: 시크릿 키 설정 완료 확인 후 추가 분석 결과 반영됨.
