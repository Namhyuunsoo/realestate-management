# Cloudflare Tunnel 설정 가이드

## 1단계: Cloudflare 계정 준비

1. **Cloudflare 계정 생성** (없는 경우)
   - https://dash.cloudflare.com/sign-up 에서 무료 계정 생성

2. **도메인 추가** (선택사항)
   - Cloudflare에서 관리하는 도메인이 있으면 사용 가능
   - 없어도 Cloudflare가 제공하는 무료 서브도메인 사용 가능 (예: `your-tunnel-name.trycloudflare.com`)

## 2단계: Cloudflare Tunnel 인증

프로젝트 루트 디렉토리에서 다음 명령어 실행:

```bash
cloudflared.exe tunnel login
```

- 브라우저가 자동으로 열리며 Cloudflare 로그인 요청
- 로그인 후 권한 승인
- 인증 완료 후 `C:\Users\[사용자명]\.cloudflared\cert.pem` 파일이 생성됨

## 3단계: 터널 생성

```bash
cloudflared.exe tunnel create realestate-tunnel
```

- `realestate-tunnel`은 터널 이름 (원하는 이름으로 변경 가능)
- 터널 ID가 생성되며 출력됨 (예: `xxxx-xxxx-xxxx-xxxx`)

## 4단계: 터널 설정 파일 생성

### 방법 1: 자동 설정 스크립트 사용 (권장)

```bash
setup_cloudflare_tunnel.bat
```

이 스크립트가 자동으로:
- Cloudflare 로그인
- 터널 생성
- 설정 파일 생성 안내

### 방법 2: 수동 설정

1. 프로젝트 루트에 `.cloudflared` 폴더 생성
2. `.cloudflared/config.yml.example` 파일을 `.cloudflared/config.yml`로 복사
3. 다음 정보 수정:
   - `YOUR_USERNAME`: Windows 사용자명
   - `YOUR_TUNNEL_ID`: 3단계에서 생성된 터널 ID (확인: `cloudflared.exe tunnel list`)
   - 포트 번호: `.env` 파일의 `PORT` 값과 일치 (기본값: 5000)

**설정 파일 예시:**
```yaml
tunnel: realestate-tunnel
credentials-file: C:\Users\YourUsername\.cloudflared\xxxx-xxxx-xxxx-xxxx.json

ingress:
  - hostname: your-domain.trycloudflare.com
    service: http://localhost:5000
  - service: http_status:404
```

**터널 ID 확인:**
```bash
cloudflared.exe tunnel list
```

## 5단계: 터널 실행 및 도메인 확인

터널을 실행하면 Cloudflare가 자동으로 도메인을 할당합니다:

```bash
cloudflared.exe tunnel run realestate-tunnel
```

출력에서 `https://xxxx-xxxx-xxxx.trycloudflare.com` 형태의 URL을 확인하세요.

## 6단계: 커스텀 도메인 설정 (선택사항)

Cloudflare에서 관리하는 도메인이 있는 경우:

1. Cloudflare Dashboard → Zero Trust → Networks → Tunnels
2. 생성한 터널 선택 → Configure
3. Public Hostname 추가:
   - Subdomain: `realestate` (원하는 이름)
   - Domain: `yourdomain.com` (Cloudflare에서 관리하는 도메인)
   - Service: `http://localhost:5000`

## 7단계: 서버와 터널 실행

### 방법 1: 통합 스크립트 사용 (권장)

```bash
start_server_with_cloudflare.bat
```

이 스크립트가 자동으로:
- Flask 서버 시작
- Cloudflare Tunnel 시작
- 브라우저 자동 열기

### 방법 2: 수동 실행

**터미널 1 - Flask 서버:**
```bash
start_server.bat
```

**터미널 2 - Cloudflare Tunnel:**
```bash
cloudflared.exe tunnel run realestate-tunnel
```

터널 실행 시 출력되는 HTTPS URL을 확인하세요.

## 문제 해결

### 터널이 연결되지 않는 경우
- 방화벽에서 `cloudflared.exe` 허용 확인
- 서버가 `localhost:5000`에서 실행 중인지 확인

### 인증 파일을 찾을 수 없는 경우
- `cloudflared.exe tunnel login` 다시 실행
- 인증 파일 경로 확인: `C:\Users\[사용자명]\.cloudflared\cert.pem`

### 터널 ID를 모르는 경우
```bash
cloudflared.exe tunnel list
```
