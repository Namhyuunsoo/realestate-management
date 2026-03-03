# Supabase MCP 설정 가이드 (최신 버전)

## 📋 개요

이 가이드는 Cursor AI에서 Supabase MCP(Model Context Protocol)를 설정하는 방법을 설명합니다.

**Supabase MCP란?**
- Cursor AI가 Supabase 프로젝트에 직접 연결되어 데이터베이스, 스키마, 쿼리 등을 관리할 수 있게 해주는 프로토콜
- SQL 실행, 테이블 생성/수정, 스키마 관리, 마이그레이션 등이 가능
- **최신 버전**: 브라우저 기반 OAuth 인증 사용 (PAT 불필요)

**공식 문서**: https://supabase.com/docs/guides/getting-started/mcp

---

## 🔧 설정 단계 (최신 방법)

### 1단계: Cursor 전역 MCP 설정 파일 확인/생성

**⚠️ 중요**: Cursor MCP 설정은 **전역 설정 파일**에 있어야 합니다. 프로젝트 내부가 아닙니다!

**전역 설정 파일 위치:**
- Windows: `C:\Users\<사용자명>\.cursor\mcp.json`
- macOS: `~/.cursor/mcp.json`
- Linux: `~/.cursor/mcp.json`

**프로젝트 내부 설정 (`.cursor/mcp.json`)은 선택사항이며, 전역 설정이 우선됩니다.**

**기본 설정 (프로젝트 스코핑 없음 - 모든 프로젝트 접근 가능):**
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

**프로젝트 스코핑 설정 (특정 프로젝트만 접근 - 권장):**
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF"
    }
  }
}
```

**읽기 전용 모드 설정 (보안 강화):**
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&read_only=true"
    }
  }
}
```

**설정 설명:**
- `url`: Supabase 호스팅 MCP 서버 URL
- `project_ref` (선택): 특정 프로젝트만 접근하도록 제한 (권장)
- `read_only` (선택): 읽기 전용 모드 (보안 강화)

---

### 2단계: Supabase 프로젝트 Reference ID 확인 (선택사항)

프로젝트 스코핑을 사용하려면:

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard 접속
   - 로그인

2. **프로젝트 Reference ID 확인**
   - 프로젝트 선택
   - Settings → General
   - "Reference ID" 확인 (예: `abcdefghijklmnop`)

3. **전역 설정 파일 (`C:\Users\<사용자명>\.cursor\mcp.json`)에 프로젝트 Reference ID 추가**
   - 위의 "프로젝트 스코핑 설정" 예제 참고

---

### 3단계: Cursor에서 인증 및 연결

1. **Cursor 재시작**
   - Cursor를 완전히 종료하고 다시 시작
   - 또는 Cursor Settings → Tools & MCP에서 MCP 서버 새로고침

2. **브라우저 인증**
   - Cursor가 자동으로 브라우저 창을 열어 Supabase 로그인을 요청합니다
   - Supabase 계정으로 로그인
   - **조직(Organization) 선택**: 작업할 프로젝트가 포함된 조직 선택
   - MCP 클라이언트에 대한 접근 권한 승인

3. **연결 확인**
   - Cursor Settings → Cursor Settings → Tools & MCP에서 MCP 서버 연결 상태 확인
   - 연결이 확인되면 Cursor에서 Supabase 관련 질문을 해보세요
   - 예: "Supabase 프로젝트의 테이블 목록을 보여줘"
   - 또는: "users 테이블의 스키마를 확인해줘"

---

## 🔒 보안 설정

### 읽기 전용 모드 (권장)

초기 설정 시 읽기 전용 모드로 시작하는 것을 강력히 권장합니다:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&read_only=true"
    }
  }
}
```

### 프로젝트 스코핑 (권장)

특정 프로젝트만 접근하도록 제한:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF"
    }
  }
}
```

### 쓰기 권한 활성화 (개발 환경에서만)

개발 환경에서만 쓰기 권한을 활성화하려면 `read_only` 파라미터를 제거:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF"
    }
  }
}
```

⚠️ **주의**: 
- 프로덕션 환경에서는 절대 쓰기 권한을 주지 마세요!
- 프로덕션 데이터에 연결하지 마세요!
- 개발/테스트 프로젝트만 사용하세요!

---

## 🧪 테스트 방법

### 1. 기본 연결 테스트

Cursor에서 다음 명령어를 시도해보세요:

```
"Supabase 프로젝트의 테이블 목록을 보여줘"
```

또는:

```
"users 테이블의 스키마를 확인해줘"
```

### 2. 쿼리 테스트 (읽기 전용 모드)

```
"users 테이블에서 최근 5명의 사용자를 조회해줘"
```

### 3. 스키마 확인 테스트

```
"현재 Supabase 프로젝트의 모든 테이블과 컬럼을 보여줘"
```

---

## ⚠️ 문제 해결

### 문제 1: MCP 서버 연결 실패

**증상:**
- Cursor에서 Supabase 관련 질문 시 연결 오류 발생
- `list_mcp_resources`에서 리소스가 보이지 않음

**해결 방법:**
1. **전역 설정 파일**이 올바른 위치에 있는지 확인 (`C:\Users\<사용자명>\.cursor\mcp.json`)
2. JSON 형식이 올바른지 확인 (쉼표, 따옴표 등)
3. Cursor 완전 재시작 (종료 후 다시 시작)
4. Cursor Settings → Tools & MCP에서 MCP 서버 상태 확인
5. 브라우저 인증이 완료되었는지 확인

### 문제 2: 브라우저 인증 실패

**증상:**
- 브라우저 창이 열리지 않음
- 인증 후에도 연결되지 않음

**해결 방법:**
1. Cursor를 완전히 종료하고 다시 시작
2. 브라우저에서 수동으로 Supabase에 로그인되어 있는지 확인
3. 올바른 조직(Organization)을 선택했는지 확인
4. MCP 클라이언트에 대한 권한이 승인되었는지 확인

### 문제 3: 프로젝트를 찾을 수 없음

**증상:**
- "Project not found" 오류

**해결 방법:**
1. 프로젝트 Reference ID가 정확한지 확인
2. 해당 프로젝트가 선택한 조직에 속해 있는지 확인
3. 프로젝트 스코핑 없이 모든 프로젝트 접근 모드로 시도:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "url": "https://mcp.supabase.com/mcp"
       }
     }
   }
   ```

### 문제 4: 리소스가 보이지 않음

**증상:**
- `list_mcp_resources`에서 아무것도 나오지 않음

**해결 방법:**
1. Cursor Settings → Tools & MCP에서 MCP 서버가 연결되어 있는지 확인
2. MCP 서버 이름이 "supabase"로 표시되는지 확인
3. Cursor 재시작
4. 브라우저 인증 다시 시도

---

## 📝 다음 단계

MCP 설정이 완료되면:

1. **Supabase 프로젝트 생성**
   - `SUPABASE_IMPLEMENTATION_PLAN.md` 참고
   - Phase 0: 준비 단계부터 시작

2. **테이블 스키마 생성**
   - Cursor에서 "Supabase에 users 테이블을 생성해줘" 같은 명령으로 진행 가능
   - 또는 SQL 직접 실행

3. **데이터 마이그레이션**
   - 기존 JSON 파일 데이터를 Supabase로 마이그레이션

---

## 🔗 참고 자료

- [Supabase MCP 공식 문서](https://supabase.com/mcp)
- [Supabase MCP GitHub](https://github.com/supabase-community/supabase-mcp)
- [Model Context Protocol 문서](https://modelcontextprotocol.io/)

---

## ✅ 체크리스트

설정 완료 확인:

- [ ] 전역 설정 파일 (`C:\Users\<사용자명>\.cursor\mcp.json`) 생성/수정 완료
- [ ] 프로젝트 Reference ID 확인 (선택사항)
- [ ] Cursor 재시작 완료
- [ ] 브라우저 인증 완료 (Supabase 로그인 및 권한 승인)
- [ ] Cursor Settings → Tools & MCP에서 연결 상태 확인
- [ ] 기본 연결 테스트 성공 ("테이블 목록 보여줘" 등)
- [ ] 테이블 목록 조회 테스트 성공

---

*설정 중 문제가 발생하면 이 가이드의 "문제 해결" 섹션을 참고하세요.*
