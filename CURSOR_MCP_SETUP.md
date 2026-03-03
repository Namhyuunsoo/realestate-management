# Cursor MCP 설정 수동 가이드

## 📁 파일 생성 방법

### 1단계: .cursor 디렉토리 생성

프로젝트 루트 디렉토리에서:

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Path .cursor -Force
```

**또는 Windows 탐색기에서:**
- 프로젝트 루트 폴더에서 새 폴더 생성
- 폴더 이름: `.cursor` (점으로 시작)

### 2단계: mcp.json 파일 생성

`.cursor` 디렉토리 안에 `mcp.json` 파일을 생성하고 다음 내용을 복사:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "headers": {
        "Authorization": "Bearer ${SUPABASE_MCP_ACCESS_TOKEN}"
      },
      "args": [
        "--project-ref",
        "${SUPABASE_PROJECT_REF}",
        "--read-only",
        "true"
      ]
    }
  }
}
```

### 3단계: 환경변수 설정

프로젝트 루트의 `.env` 파일에 다음 추가:

```bash
# Supabase MCP 설정
SUPABASE_MCP_ACCESS_TOKEN=your_personal_access_token_here
SUPABASE_PROJECT_REF=your_project_reference_id_here
```

**⚠️ 중요:**
- `your_personal_access_token_here`를 실제 PAT 토큰으로 교체
- `your_project_reference_id_here`를 실제 프로젝트 Reference ID로 교체
- `.env` 파일은 Git에 커밋하지 마세요 (이미 .gitignore에 포함됨)

---

## 🔑 Supabase PAT 토큰 생성 방법

1. https://supabase.com/dashboard 접속
2. Settings → Access Tokens 이동
3. "Generate new token" 클릭
4. 이름: `Cursor MCP`
5. Scope: 프로젝트 단위 선택
6. 권한: 읽기 전용 권장
7. 토큰 복사 및 `.env` 파일에 저장

---

## 📋 프로젝트 Reference ID 확인 방법

1. Supabase 대시보드에서 프로젝트 선택
2. Settings → General 이동
3. "Reference ID" 확인 (예: `abcdefghijklmnop`)

---

## ✅ 설정 완료 확인

1. Cursor 완전히 재시작
2. Cursor에서 테스트:
   ```
   "Supabase 프로젝트의 테이블 목록을 보여줘"
   ```

---

자세한 내용은 `SUPABASE_MCP_SETUP_GUIDE.md` 파일을 참고하세요.
