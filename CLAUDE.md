# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

부동산 중개사무소용 매물·고객·브리핑 통합 관리 시스템. Flask 백엔드 + Vanilla JS 프론트엔드 + Google Sheets 연동 + 네이버 지도 API.

## 서버 실행

```bash
# Windows (가상환경 자동 활성화, DuckDNS 백그라운드 실행)
start_server.bat

# 직접 실행
python run.py   # host=0.0.0.0, port=5000
```

## 의존성 설치

```bash
pip install -r requirements.txt
```

## 아키텍처

**계층 구조**: Routes → Services → Repositories → Models → Data Store

- **Routes** (`app/routes/`): Flask Blueprint API 엔드포인트
- **Services** (`app/services/`): 비즈니스 로직
- **Repositories** (`app/services/repositories/`): 데이터 접근 추상화 (File ↔ Supabase 전환 가능)
- **Models** (`app/models/`): 데이터 검증 (BaseModel, TimestampMixin, ValidationMixin)
- **Core** (`app/core/`): 데코레이터(`@require_user`, `@require_admin`, `@validate_csrf_token`), 보안, ID 생성

**핵심 컴포넌트**:
- `app/__init__.py`: Flask 앱 팩토리 (`create_app()`). 보안 헤더, CSRF, Gzip 압축, DataManager 초기화
- `app/services/data_manager.py`: 모든 서비스의 중앙 관리자. `__getattr__` 기반 지연 초기화 패턴으로 서비스가 실제 사용 시점에 초기화됨
- `app/config.py`: `AppConfig` dataclass. 모든 설정은 환경변수 기반

**프론트엔드** (`app/static/`):
- `main-new.js`: 모듈 로드 시스템 (우선순위 기반: critical → normal → low)
- `modules/`: auth, core, data, map, ui, filters로 모듈 분리
- `modules/map/`: 네이버 지도 (map-core, map-markers, map-clustering, map-controls)
- `modules/core/globals.js`: 전역 상태 관리

**데이터 흐름 (매물)**:
Google Sheets → SheetDownloadService (5분 주기) → Excel (`data/raw/`) → SheetFetcher → ListingsLoader → JSON 캐시 (`data/cache/`) → API → 프론트엔드

**데이터 흐름 (고객/브리핑)**:
프론트엔드 → Routes → Services → Repositories → JSON 파일 (`data/state/`) 또는 Supabase

## 필수 규칙

- **한국어**: 모든 응답, 주석, 설명은 한국어로 작성
- **하드코딩 금지**: API 키, URL, 경로 등 모든 설정값은 환경변수 사용. `.env` 파일 존재하며 직접 수정 불가 — 수정 필요 시 사용자에게 제공
- **상대 경로**: 코드 내 모든 경로는 상대 경로로 작성 (Git 이동 대응)
- **임시 수정 금지**: "임시로", "일단" 식의 임시방편 수정 절대 금지. 근본적 해결만 허용
- **기존 기능 유지**: 사용자 요청 없이 기존 기능·UI를 변경하지 말 것
- **최소한의 수정**: 요청된 부분만 정확히 수정. 과도한 리팩토링이나 추가 작업 금지
- **CSS `!important` 최소화**: 디버깅 방해. 수정 CSS로 대체되는 기존 코드는 삭제
- **콘솔 로그 보안**: API 키, 토큰 등 민감 정보 콘솔 출력 금지
- **Excel 파일 커밋 금지**: 5분마다 최신화되므로 충돌 발생
- **환경변수 코드 수정 금지**: `NAVER_MAPS_NCP_CLIENT_ID`, `NAVER_MAPS_NCP_CLIENT_SECRET` 등 이미 설정됨

## 사용자 역할 체계

- `user`: 일반 사용자 (본인 담당 매물만 조회, manager_name 기반)
- `manager`: 매니저 (모든 매물 조회)
- `admin`: 관리자 (모든 기능 + 관리)

## Repository 패턴 (File ↔ Supabase)

`app/services/repositories/`에서 환경변수 기반으로 File/Supabase Repository를 선택. 고객, 브리핑, 추천 각각 이중 구현됨. 프로젝트는 파일 기반 → Supabase 단계적 마이그레이션 진행 중.

## 주요 환경변수

`env_example.txt` 참조. 핵심:
- `SPREADSHEET_ID`: Google Sheets ID
- `SERVICE_ACCOUNT_FILE`: Google API 서비스 계정 JSON 경로
- `NAVER_MAPS_NCP_CLIENT_ID/SECRET`: 네이버 지도 API
- `SUPABASE_DB_PASSWORD`: Supabase DB (선택)
- `SECRET_KEY`: Flask 세션 키
- `DUCKDNS_DOMAIN/TOKEN`: 동적 DNS (선택)
