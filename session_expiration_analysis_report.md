# 세션 만료 현상 심층 분석 및 최종 해결 방안 (V4)

## 1. 개요
`SECRET_KEY` 및 쿠키 보안 설정을 완료했음에도 사용 도중 세션이 만료되는 현상의 **근본적인 논리적 결함**을 발견했습니다. 이는 세션 자체의 문제가 아니라, **데이터베이스 조회 실패를 '로그아웃'으로 오판하는 코드 로직** 때문입니다.

---

## 2. 세션 단절의 핵심 원인 (Logic Proof)

### 2.1. 일시적 DB 오류의 세션 파기 오판 (Critical)
*   **현상**: 사용자가 활동하는 동안 많은 API 요청이 발생하며, Vercel과 Supabase 사이의 일시적인 네트워크 지연이나 연결 유실은 서버리스 환경에서 필연적입니다.
*   **코드 결함 1 (저장소)**: `SupabaseUserRepository.get_user_by_id`는 Supabase 조회 중 에러가 발생하면 로그만 남기고 **`None`을 반환**합니다. (파일: `user_repository.py:32-40`)
*   **코드 결함 2 (데코레이터)**: `require_user` 데코레이터는 위 결과를 받고 `None`일 경우(실제 사용자가 없거나, **시스템 에러가 발생한 경우 모두 포함**) 즉시 **`session.clear()`를 수행**합니다. (파일: `decorators.py:38-46`)
*   **결과**: 사용 중 단 한 번만 DB 연결이 지연되어도, 시스템은 "유효하지 않은 사용자"로 간주하여 멀쩡한 브라우저 세션 쿠키를 서버 스스로 날려버리고 로그아웃 시킵니다.

### 2.2. 사용자 인증 실패와 시스템 오류의 혼동
*   현재 코드는 "사용자가 DB에 존재하지 않음"과 "DB 서버에 접속할 수 없음"을 동일하게 처리하고 있습니다. 전자는 로그아웃이 맞지만, 후자는 500 에러를 반환하고 세션은 유지해야 합니다.

---

## 3. Opus 추가 의견 (코드 전수 추적 결과)

> **결론: 보고서의 핵심 분석은 정확합니다.** 단, 보고서가 지적한 `require_user` 데코레이터는 문제의 일부일 뿐이며, 동일한 결함이 **최소 4곳**에 분산되어 있습니다.

### 3.1. `session.clear()`가 호출되는 전체 경로 (5곳)

| # | 파일 | 라인 | 트리거 조건 | 위험도 |
|---|------|------|-------------|--------|
| 1 | `decorators.py` | 40 | `require_user()`에서 user 조회 실패 시 | **치명적** — 거의 모든 API가 이 데코레이터를 사용 |
| 2 | `decorators.py` | 45 | `require_user()`에서 예외 발생 시 | **치명적** — 위와 동일 경로 |
| 3 | `auth.py` | 317 | `GET /api/auth/me`에서 user 조회 실패 시 | **높음** — 클라이언트가 사용자 정보 조회 시 호출 |
| 4 | `auth.py` | 185 | 로그인 시 기존 세션 정리 (정상 동작) | 정상 |
| 5 | `auth.py` | 301 | 로그아웃 (정상 동작) | 정상 |

**1, 2, 3번이 문제입니다.** 4, 5번은 의도된 동작이므로 수정 불필요합니다.

### 3.2. `session.clear()`는 안 하지만 클라이언트를 속이는 경로 (1곳)

| 파일 | 라인 | 동작 |
|------|------|------|
| `auth.py` | 241-242 | `GET /api/auth/check-session`에서 DB 에러 시 세션은 안 지우지만 `{"logged_in": false}`를 반환 |

이 경우 세션 쿠키 자체는 브라우저에 남아있으나, **클라이언트(`auth.js:615`)가 `logged_in: false`를 받으면 로그인 화면을 표시**합니다. 사용자 입장에서는 로그아웃된 것과 동일한 경험입니다.

### 3.3. 클라이언트 측 401 핸들러의 과잉 반응

`api-cache.js:90-96`에서 **어떤 API든 401을 받으면 즉시 `alert('세션이 만료되었습니다')` + `/login`으로 리다이렉트**합니다.
- 재시도(retry) 로직이 전혀 없음
- 일시적 오류인지 판단하는 유예 시간(grace period)이 없음
- 한 번의 401이 곧바로 "세션 만료" 알림으로 이어짐

### 3.4. 실행 경로 요약 (DB 1회 지연 → 강제 로그아웃)

```
[사용자가 매물 검색 중]
    ↓
[API 호출] → require_user() 데코레이터 진입
    ↓
SupabaseUserRepository.get_user_by_id(user_id)
    ↓  ← Supabase 연결 일시 지연/타임아웃
except Exception → return None  (에러를 삼킴)
    ↓
decorators.py:39  if not current_user:  → True (None이므로)
    ↓
decorators.py:40  session.clear()  ← ★ 세션 파기
    ↓
HTTP 401 응답 반환
    ↓
api-cache.js:90  if (response.status === 401)
    ↓
alert('세션이 만료되었습니다')  → /login 리다이렉트
```

### 3.5. 보고서에서 제안한 해결 방향에 대한 평가

보고서의 해결 방향(에러 전파 + 세션 보호)은 **올바릅니다.** 다만 수정 범위가 부족합니다.

**수정이 필요한 전체 목록:**
1. `SupabaseUserRepository.get_user_by_id` — 에러 시 `None` 대신 예외 전파
2. `SupabaseUserRepository.get_user_by_email` — 동일
3. `decorators.py:require_user()` — except 블록에서 `session.clear()` 제거, 500 반환
4. `auth.py:get_current_user()` — DB 에러 시 `session.clear()` 제거, 500 반환
5. `auth.py:check_session()` — DB 에러 시 `logged_in: false` 대신 에러 상태 구분
6. `api-cache.js` — 401 수신 시 1회 재시도 로직 추가 (선택적이나 권장)

---

## 4. 즉시 적용을 위한 수정 프롬프트 (V4)

아래 내용을 Antigravity에 명령하여 코드를 수정하십시오.

```markdown
### [Execution] 세션 안정성 근본 해결을 위한 로직 수정

**1. 리포지토리 에러 처리 수정 (`app/services/repositories/supabase/user_repository.py`):**
- `get_user_by_id` 및 `get_user_by_email` 함수의 `except` 블록에서 `return None`을 제거하고, 에러를 기록한 후 `raise`를 통해 예외를 상위로 전파해라.

**2. 인증 데코레이터 세션 보호 (`app/core/decorators.py`):**
- `require_user` 함수 내 `except Exception as e:` 블록에서 **`session.clear()` 호출을 제거**해라.
- 시스템 오류 시에는 세션을 파기하지 않고 `jsonify({"error": "시스템 오류"}), 500`을 반환하여 사용자가 새로고침 시 로그인이 유지되게 해라.
- 오직 `current_user`가 정상적으로 조회되었으나 `None`인 경우에만 `session.clear()`를 수행해라.

**3. auth.py 엔드포인트 보호:**
- `get_current_user` (`/api/auth/me`)에서 DB 에러 시 `session.clear()` 대신 500 반환.
- `check_session` (`/api/auth/check-session`)에서 DB 에러 시 `{"logged_in": false}` 대신 `{"error": "시스템 오류"}` + 500 반환.

**4. (선택) 클라이언트 측 재시도 로직 (`api-cache.js`):**
- 401 수신 시 1회 재시도 후에도 401이면 그때 로그인 페이지로 이동.
```

---
**보고서 업데이트**: 2026-04-14
**분석 방식**: 코드 전수 추적 (저장소 → 서비스 → 데코레이터 → 라우트 → 클라이언트 JS)
**Opus 검토**: 핵심 분석 정확함 확인. 추가 취약 경로 3곳 발견하여 반영.
**상태**: 논리적 결함 발견 및 해결책 수립 완료
