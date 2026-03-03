# Caddy 웹서버 설정 가이드

## 개요

Caddy는 자동 HTTPS를 지원하는 웹서버로, DuckDNS 도메인을 HTTPS로 접속할 수 있게 해줍니다.

## 사전 요구사항

1. **포트 포워딩 설정**
   - 라우터에서 포트 80 (HTTP)과 443 (HTTPS)을 개발 컴퓨터로 포워딩
   - 사무실 내부 네트워크에서는 이미 설정되어 있을 수 있음

2. **DuckDNS 도메인 설정**
   - `.env` 파일에 `DUCKDNS_DOMAIN`과 `DUCKDNS_TOKEN` 설정 필요

## 설치 방법

### 1단계: Caddy 다운로드 및 설치

```bash
setup_caddy.bat
```

이 스크립트가 자동으로:
- Caddy 다운로드
- `caddy` 폴더에 설치
- 설정 확인

### 2단계: 환경변수 설정

`.env` 파일에 다음 설정 추가:

```env
DUCKDNS_DOMAIN=skrealestate.duckdns.org
DUCKDNS_TOKEN=your-duckdns-token
```

### 3단계: Caddyfile 확인

`Caddyfile` 파일에서 도메인 이름이 올바른지 확인:
- 기본값: `skrealestate.duckdns.org`
- 다른 도메인 사용 시 `Caddyfile` 수정

### 4단계: 서버 실행

```bash
start_server_with_caddy.bat
```

이 스크립트가 자동으로:
- Flask 서버 시작 (`localhost:5000`)
- Caddy 웹서버 시작 (HTTPS)
- 브라우저 자동 열기

## 접속 URL

- **로컬 접속**: `http://localhost:5000`
- **HTTPS 접속**: `https://skrealestate.duckdns.org`

## 문제 해결

### 인증서 발급 실패

**원인**: 포트 80이 열려있지 않음

**해결**:
1. 라우터에서 포트 80 포워딩 확인
2. 방화벽에서 포트 80 허용 확인
3. Windows 방화벽 설정 확인

### 연결 시간 초과

**원인**: 포트 포워딩이 설정되지 않음

**해결**:
1. 라우터 설정에서 포트 80, 443 포워딩 확인
2. DuckDNS에서 현재 IP 주소 확인
3. `duckdns_updater.py`가 정상 실행 중인지 확인

### Caddy 실행 오류

**원인**: Caddyfile 구문 오류

**해결**:
1. `Caddyfile` 구문 확인
2. Caddy 로그 확인: `logs/caddy.log`

## 파일 구조

```
realestate-management/
├── Caddyfile              # Caddy 설정 파일
├── caddy/
│   └── caddy.exe          # Caddy 실행 파일
├── setup_caddy.bat        # Caddy 설치 스크립트
├── start_server_with_caddy.bat  # 서버 + Caddy 실행 스크립트
└── logs/
    └── caddy.log          # Caddy 로그 파일
```

## 참고사항

- Caddy는 Let's Encrypt를 사용하여 자동으로 SSL 인증서를 발급합니다
- 첫 실행 시 인증서 발급에 몇 분이 걸릴 수 있습니다
- 인증서는 자동으로 갱신됩니다
- 포트 80과 443이 열려있어야 인증서 발급이 가능합니다
