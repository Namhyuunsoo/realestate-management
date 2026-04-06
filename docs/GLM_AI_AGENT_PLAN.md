# GLM AI Agent 연동 계획서

## 개요
Gemini AI를 GLM(Zhipu AI)으로 교체하고, GLM이 프로젝트의 매물 데이터를 검색/조회할 수 있는 AI Agent 시스템 구축

---

## 1. 목표

| 단계 | 목표 | 상태 |
|------|------|------|
| 1단계 | GLM API 연동 (Gemini 교체) | 대기 |
| 2단계 | 매물 검색 도구 구현 | 대기 |
| 3단계 | 프론트엔드 연동 | 대기 |
| 4단계 | 테스트 및 검증 | 대기 |

---

## 2. 사전 준비

### 2.1 GLM API 키 발급
- Zhipu AI(https://open.bigmodel.cn/) 가입
- API 키 발급
- 환경변수 `GLM_API_KEY` 등록

### 2.2 라이브러리 설치
```bash
pip install zhipuai
```

---

## 3. 상세 구현 계획

### 3.1 1단계: GLM API 연동 (예상 소요: 1-2시간)

#### 파일: `app/services/ai_service.py`

**현재 코드 (Gemini):**
```python
import google.generativeai as genai
genai.configure(api_key=self.api_key)
self.model = genai.GenerativeModel('gemini-3.0-flash')
```

**변경 코드 (GLM):**
```python
from zhipuai import ZhipuAI

class AIService:
    def __init__(self):
        self.client = None

    def _setup(self):
        self.api_key = current_app.config.get('GLM_API_KEY')
        self.client = ZhipuAI(api_key=self.api_key)

    def analyze_text(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model="glm-4-flash",  # 또는 "glm-4"
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
```

#### 체크리스트
- [ ] `zhipuai` 패키지 설치
- [ ] `requirements.txt` 업데이트
- [ ] 환경변수 `GLM_API_KEY` 추가 (Vercel)
- [ ] `ai_service.py` 수정
- [ ] 기존 기능 테스트 (주소 추출, 홍보 문구 생성)

---

### 3.2 2단계: 매물 검색 도구 구현 (예상 소요: 2-3시간)

#### 개념도
```
사용자 입력: "부평동에 5억 이하 매물 있어?"
    ↓
GLM이 의도 파악 → tool_calls 반환
    ↓
백엔드에서 tool 실행: search_listings(dong="부평동", max_price=50000)
    ↓
결과를 GLM에게 전달 → 자연어 응답 생성
    ↓
사용자에게 답변: "부평동에 5억 이하 매물이 3건 있습니다..."
```

#### 파일: `app/services/ai_tools.py` (신규)

```python
# AI가 호출할 수 있는 도구 정의

TOOLS_DEFINITION = [
    {
        "type": "function",
        "function": {
            "name": "search_listings",
            "description": "조건에 맞는 매물을 검색합니다",
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "지역명 (예: 부평동, 부천시)"
                    },
                    "listing_type": {
                        "type": "string",
                        "enum": ["상가임대차", "구분상가매매", "건물토지매매", "주택 매매", "주택임대차"],
                        "description": "매물 유형"
                    },
                    "min_price": {
                        "type": "number",
                        "description": "최소 가격 (만원 단위)"
                    },
                    "max_price": {
                        "type": "number",
                        "description": "최대 가격 (만원 단위)"
                    },
                    "status": {
                        "type": "string",
                        "description": "현황 (예: 생, 예정, 완료, 보류)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_listing_detail",
            "description": "특정 매물의 상세 정보를 조회합니다",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {
                        "type": "string",
                        "description": "매물 ID (UUID)"
                    }
                },
                "required": ["listing_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "count_listings",
            "description": "조건에 맞는 매물 개수를 반환합니다",
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {"type": "string"},
                    "listing_type": {"type": "string"},
                    "status": {"type": "string"}
                },
                "required": []
            }
        }
    }
]
```

#### 파일: `app/services/ai_tool_executor.py` (신규)

```python
# 실제 도구 실행 로직

from app.services.commercial_listings_service import fetch_all_commercial_listings
from app.services.housing_listings_service import fetch_housing_listings

def execute_tool(tool_name: str, arguments: dict) -> dict:
    """AI가 요청한 도구를 실행"""

    if tool_name == "search_listings":
        return search_listings(**arguments)
    elif tool_name == "get_listing_detail":
        return get_listing_detail(**arguments)
    elif tool_name == "count_listings":
        return count_listings(**arguments)
    else:
        return {"error": f"Unknown tool: {tool_name}"}

def search_listings(region=None, listing_type=None, min_price=None, max_price=None, status=None):
    """매물 검색"""
    results = []

    # 상가 매물 검색
    commercial = fetch_all_commercial_listings()
    for item in commercial:
        if matches_filter(item, region, listing_type, min_price, max_price, status):
            results.append(format_listing(item))

    # 주택 매물 검색
    housing = fetch_housing_listings()
    for item in housing:
        if matches_filter(item, region, listing_type, min_price, max_price, status):
            results.append(format_listing(item))

    return {
        "count": len(results),
        "listings": results[:20]  # 최대 20개만 반환
    }

def matches_filter(item, region, listing_type, min_price, max_price, status):
    """필터 조건 확인"""
    fields = item.get("fields", {})

    if region and region not in fields.get("지역", ""):
        return False
    if listing_type and listing_type != item.get("listing_type"):
        return False
    if status and status != fields.get("현황", ""):
        return False
    if min_price:
        price = parse_price(fields.get("매매가", fields.get("보증금", "0")))
        if price < min_price:
            return False
    if max_price:
        price = parse_price(fields.get("매매가", fields.get("보증금", "0")))
        if price > max_price:
            return False

    return True

def format_listing(item):
    """매물 정보 포맷팅"""
    fields = item.get("fields", {})
    return {
        "id": item.get("id"),
        "type": item.get("listing_type"),
        "region": fields.get("지역", ""),
        "address": f"{fields.get('지역', '')} {fields.get('지번', '')}",
        "price": fields.get("매매가") or fields.get("보증금", ""),
        "status": fields.get("현황", "")
    }
```

#### 파일: `app/services/ai_agent_service.py` (신규)

```python
# AI Agent 메인 로직

from zhipuai import ZhipuAI
from .ai_tools import TOOLS_DEFINITION
from .ai_tool_executor import execute_tool

class AIAgentService:
    def __init__(self):
        self.client = None

    def _setup(self):
        if not self.client:
            api_key = current_app.config.get('GLM_API_KEY')
            self.client = ZhipuAI(api_key=api_key)

    def chat(self, user_message: str, conversation_history: list = None) -> dict:
        """사용자 메시지 처리"""
        self._setup()

        messages = conversation_history or []
        messages.append({"role": "user", "content": user_message})

        # 1차 호출: 도구 사용 여부 확인
        response = self.client.chat.completions.create(
            model="glm-4-flash",
            messages=messages,
            tools=TOOLS_DEFINITION,
            tool_choice="auto"
        )

        assistant_message = response.choices[0].message

        # 도구 호출이 있으면 실행
        if assistant_message.tool_calls:
            # 도구 실행 결과 추가
            messages.append(assistant_message)

            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                result = execute_tool(tool_name, arguments)

                messages.append({
                    "role": "tool",
                    "content": json.dumps(result, ensure_ascii=False),
                    "tool_call_id": tool_call.id
                })

            # 2차 호출: 결과를 바탕으로 응답 생성
            final_response = self.client.chat.completions.create(
                model="glm-4-flash",
                messages=messages
            )

            return {
                "response": final_response.choices[0].message.content,
                "tool_used": tool_name if assistant_message.tool_calls else None,
                "data": result if assistant_message.tool_calls else None
            }

        # 도구 없이 바로 응답
        return {
            "response": assistant_message.content,
            "tool_used": None,
            "data": None
        }
```

#### 체크리스트
- [ ] `app/services/ai_tools.py` 생성
- [ ] `app/services/ai_tool_executor.py` 생성
- [ ] `app/services/ai_agent_service.py` 생성
- [ ] 기존 `ai_service.py`와 통합 또는 교체

---

### 3.3 3단계: API 엔드포인트 및 프론트엔드 연동 (예상 소요: 1-2시간)

#### 파일: `app/routes/ai.py` (신규 또는 수정)

```python
from flask import Blueprint, request, jsonify
from app.services.ai_agent_service import AIAgentService

bp = Blueprint("ai", __name__, url_prefix="/api/ai")

@bp.route("/chat", methods=["POST"])
def chat():
    """AI 채팅 엔드포인트"""
    data = request.json
    user_message = data.get("message")
    history = data.get("history", [])

    agent = AIAgentService()
    result = agent.chat(user_message, history)

    return jsonify({
        "success": True,
        "response": result["response"],
        "tool_used": result.get("tool_used"),
        "data": result.get("data")
    })
```

#### 프론트엔드 수정: `app/static/js/ai-chat.js`

기존 Gemini 채팅 UI에서 GLM API 호출하도록 수정

#### 체크리스트
- [ ] `/api/ai/chat` 엔드포인트 생성
- [ ] 프론트엔드에서 새 API 호출하도록 수정
- [ ] 채팅 UI에 검색 결과 표시 로직 추가

---

### 3.4 4단계: 테스트 및 검증 (예상 소요: 1시간)

#### 테스트 시나리오

| 시나리오 | 예상 입력 | 예상 결과 |
|----------|----------|----------|
| 일반 질문 | "안녕하세요" | 일반 인사 응답 |
| 지역 검색 | "부평동 매물 있어?" | 부평동 매물 목록 |
| 가격 필터 | "5억 이하 매물 찾아줘" | 5억 이하 매물 목록 |
| 복합 조건 | "부평동에 3억 이하 상가 매물" | 조건에 맞는 매물 |
| 개수 조회 | "전체 매물 몇 개야?" | 전체 매물 개수 |

#### 체크리스트
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 수행
- [ ] 모바일/PC 모두 테스트
- [ ] 에러 처리 확인

---

## 4. 환경변수 설정

### Vercel 환경변수 추가

| Key | Value | 설명 |
|-----|-------|------|
| `GLM_API_KEY` | `your_glm_api_key` | Zhipu AI API 키 |

### 로컬 `.env` 파일

```env
GLM_API_KEY=your_glm_api_key_here
```

---

## 5. 의존성 추가

### `requirements.txt`

```
zhipuai>=2.0.0
```

---

## 6. 예상 총 소요 시간

| 단계 | 소요 시간 |
|------|-----------|
| 1단계: GLM API 연동 | 1-2시간 |
| 2단계: 매물 검색 도구 | 2-3시간 |
| 3단계: 프론트엔드 연동 | 1-2시간 |
| 4단계: 테스트 | 1시간 |
| **총계** | **5-8시간** |

---

## 7. 주의사항

1. **API 비용**: GLM API는 사용량에 따라 과금됨
2. **속도**: Tool calling은 2번의 API 호출이 필요하여 응답 시간이 길어질 수 있음
3. **보안**: 읽기 전용 도구만 구현 (쓰기 도구는 향후 검토)
4. **에러 처리**: API 장애 시 fallback 로직 필요

---

## 8. 문제 해결 가이드

### 8.1 GLM 응답이 중간에 멈추는 현상

#### 원인 분석
| 원인 | 설명 |
|------|------|
| **네트워크 타임아웃** | 긴 응답 생성 중 연결 끊김 |
| **토큰 제한** | max_tokens 설정 초과 |
| **서버 부하** | GLM 서버 과부하 |
| **스트리밍 미사용** | 한 번에 전체 응답 받기 시도 |

#### 해결 방안

**A. 스트리밍 응답 사용 (권장)**
```python
def chat_stream(self, user_message: str):
    """스트리밍 응답 - 끊김 방지"""
    response = self.client.chat.completions.create(
        model="glm-4-flash",
        messages=[{"role": "user", "content": user_message}],
        stream=True  # 스트리밍 활성화
    )

    full_content = ""
    for chunk in response:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            full_content += content
            yield content  # 실시간 전송

    return full_content
```

**B. 타임아웃 및 재시도 설정**
```python
import httpx

# 커스텀 타임아웃
client = ZhipuAI(
    api_key=api_key,
    timeout=httpx.Timeout(60.0, connect=10.0)  # 60초 타임아웃
)

# 재시도 로직
def chat_with_retry(prompt, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(...)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # 지수 백오프
```

**C. 응답 길이 제한 설정**
```python
response = self.client.chat.completions.create(
    model="glm-4-flash",
    messages=messages,
    max_tokens=1024,  # 적절한 토큰 제한
    temperature=0.7
)
```

**D. 대안 모델 고려**
| 모델 | 특징 | 안정성 |
|------|------|--------|
| glm-4-flash | 빠름, 가벼움 | ⭐⭐⭐ |
| glm-4 | 정확함, 느림 | ⭐⭐⭐⭐ |
| glm-4-plus | 고성능 | ⭐⭐⭐⭐⭐ |

---

### 8.2 "매물 검색 도구" 상세 설명

#### 개념
**매물 검색 도구** = AI가 우리 프로젝트의 데이터베이스에 접근해서 매물을 찾을 수 있게 해주는 기능

#### 왜 필요한가?
- 기본 AI는 우리 프로젝트 데이터를 모름
- AI가 "부평동 매물 있어?"라고 물어봐도 답할 수 없음
- 도구를 연결하면 AI가 직접 데이터를 조회 가능

#### 동작 방식 (그림)

```
┌─────────────────────────────────────────────────────────────┐
│                        사용자                                │
│                   "부평동 매물 있어?"                         │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      GLM AI                                  │
│                                                              │
│  1. 사용자 의도 파악: "매물 검색 요청이네"                     │
│  2. 지역 추출: "부평동"                                       │
│  3. 도구 호출 결정: search_listings(region="부평동")          │
│                                                              │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   우리 백엔드                                │
│                                                              │
│  def search_listings(region="부평동"):                       │
│      # DB에서 부평동 매물 조회                                │
│      results = db.query("SELECT * FROM listings WHERE...")  │
│      return results                                          │
│                                                              │
│  결과: [                                                     │
│    {지역: "부평동", 가게명: "카페A", 보증금: 5000},            │
│    {지역: "부평동", 가게명: "식당B", 보증금: 3000},            │
│    ...                                                       │
│  ]                                                           │
│                                                              │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      GLM AI                                  │
│                                                              │
│  4. 데이터 받아서 자연어로 변환                               │
│                                                              │
│  "부평동에 현재 5개의 매물이 있습니다.                         │
│   - 카페A: 보증금 5,000만원                                   │
│   - 식당B: 보증금 3,000만원                                   │
│   ..."                                                       │
│                                                              │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                        사용자                                │
│              "부평동에 현재 5개의 매물이..."                   │
└─────────────────────────────────────────────────────────────┘
```

#### 구현 예시 (실제 코드)

**1단계: 도구 정의 (AI에게 메뉴판 제공)**
```python
# ai_tools.py
TOOLS = [
    {
        "name": "search_listings",
        "description": "매물을 검색합니다",
        "parameters": {
            "region": "지역명",
            "max_price": "최대 가격(만원)"
        }
    }
]
```

**2단계: 실제 실행 함수 (주방)**
```python
# ai_tool_executor.py
def search_listings(region=None, max_price=None):
    # 우리 DB에서 실제 조회
    results = fetch_from_supabase(region, max_price)
    return results
```

**3단계: AI와 연결 (웨이터)**
```python
# ai_agent_service.py
def chat(user_message):
    # AI에게 질문 + 도구 전달
    response = glm.chat(
        messages=[user_message],
        tools=TOOLS  # "이 도구들 사용 가능해"
    )

    # AI가 도구 사용 요청하면 실행
    if response.tool_calls:
        result = execute_tool(response.tool_calls)
        # 결과를 AI에게 다시 전달
        final_answer = glm.chat(messages + result)

    return final_answer
```

#### 실제 대화 예시

| 사용자 | AI 응답 | 내부 동작 |
|--------|---------|-----------|
| "부평동 매물 있어?" | "부평동에 12개 매물이 있습니다..." | `search_listings(region="부평동")` |
| "5억 이하만" | "5억 이하 매물 5개가 있습니다..." | `search_listings(max_price=50000)` |
| "전체 몇 개야?" | "총 847개 매물이 등록되어 있습니다" | `count_listings()` |
| "오늘 날씨 어때?" | "저는 매물 정보만 조회할 수 있습니다" | 도구 사용 안 함 |

#### 체크리스트
- [ ] 위 내용 이해 완료
- [ ] 실제 구현 시 이 문서 참조

---

### 8.3 AI → 지도 필터 연동 (핵심 기능)

#### 개념
GLM이 검색한 조건을 **실제 필터 UI에 자동 입력**하고, **지도에 해당 매물만 표시**. 사용자는 필터 UI를 열어 조건을 확인하고 수정 가능.

#### 동작 흐름
```
┌─────────────────────────────────────────────────────────────┐
│ 사용자: "보증금 5천이하 월세 300이하 상가매물 있어?"          │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ GLM AI                                                       │
│ 1. 의도 파악: 상가임대차 매물 검색                            │
│ 2. 조건 추출: 보증금≤5000, 월세≤300                          │
│ 3. apply_map_filter 도구 호출                                │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 백엔드 (ai_tool_executor.py)                                 │
│                                                              │
│ def apply_map_filter(conditions):                            │
│     return {                                                 │
│         "filter_values": {                                   │
│             "tf_deposit": "~5000",                           │
│             "tf_rent": "~300"                                │
│         },                                                   │
│         "listing_mode": "commercial"                         │
│     }                                                        │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 프론트엔드 (ai-chat.js)                                       │
│                                                              │
│ // 1. 필터 필드에 값 자동 입력                                 │
│ document.getElementById('tf_deposit').value = '~5000';       │
│ document.getElementById('tf_rent').value = '~300';           │
│                                                              │
│ // 2. 필터 적용 함수 호출                                      │
│ window.applyAllFilters();                                    │
│                                                              │
│ // 3. 지도에 해당 매물만 표시됨                                │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 사용자                                                        │
│ - 지도에서 필터링된 매물 확인                                  │
│ - 🔍 필터 버튼 클릭 → 조건 확인 및 수정 가능                   │
│ - 조건 수정 후 재검색 가능                                    │
└─────────────────────────────────────────────────────────────┘
```

#### 추가 도구 정의

```python
# ai_tools.py에 추가

{
    "type": "function",
    "function": {
        "name": "apply_map_filter",
        "description": "검색 조건을 지도 필터에 적용합니다. 사용자가 조건을 확인하고 수정할 수 있습니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "listing_mode": {
                    "type": "string",
                    "enum": ["commercial", "housing"],
                    "description": "매물 모드 (상가=commercial, 주택=housing)"
                },
                "filter_values": {
                    "type": "object",
                    "description": "필터 필드와 값",
                    "properties": {
                        "tf_region": {"type": "string", "description": "지역"},
                        "tf_deposit": {"type": "string", "description": "보증금 (예: ~5000, 3000~5000)"},
                        "tf_rent": {"type": "string", "description": "월세"},
                        "tf_premium": {"type": "string", "description": "권리금"},
                        "tf_sale_price": {"type": "string", "description": "매매가"},
                        "tf_status": {"type": "string", "description": "현황 (생, 예정, 완료, 보류)"},
                        "tf_h_region": {"type": "string", "description": "주택 지역"},
                        "tf_h_deposit": {"type": "string", "description": "주택 보증금"},
                        "tf_h_rent": {"type": "string", "description": "주택 월세"}
                    }
                },
                "message": {
                    "type": "string",
                    "description": "사용자에게 표시할 메시지"
                }
            },
            "required": ["listing_mode", "filter_values"]
        }
    }
}
```

#### 도구 실행 로직

```python
# ai_tool_executor.py에 추가

def apply_map_filter(listing_mode: str, filter_values: dict, message: str = None):
    """
    지도 필터 적용 - 프론트엔드에서 처리하도록 데이터 반환
    """
    return {
        "action": "apply_filter",
        "listing_mode": listing_mode,
        "filter_values": filter_values,
        "message": message or "필터가 적용되었습니다."
    }
```

#### 프론트엔드 처리 로직

```javascript
// ai-chat.js에 추가

function handleAIResponse(response) {
    // AI 응답 표시
    displayMessage(response.response, 'ai');

    // 필터 적용 요청이 있으면 처리
    if (response.tool_used === 'apply_map_filter' && response.data) {
        applyFilterFromAI(response.data);
    }
}

function applyFilterFromAI(filterData) {
    const { listing_mode, filter_values, message } = filterData;

    // 1. 매물 모드 전환 (필요시)
    if (listing_mode === 'housing' && window.UI_STATE.listingMode !== 'housing') {
        window.switchListingMode('housing');
    } else if (listing_mode === 'commercial' && window.UI_STATE.listingMode === 'housing') {
        window.switchListingMode('commercial');
    }

    // 2. 필터 필드에 값 입력
    Object.entries(filter_values).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
        }
    });

    // 3. 필터 적용
    if (typeof window.applyAllFilters === 'function') {
        window.applyAllFilters();
    }

    // 4. 토스트 메시지
    if (typeof window.showToast === 'function') {
        window.showToast(message + ' (필터 버튼으로 수정 가능)', 'success');
    }
}
```

#### 필터 필드 매핑 표

**상가 매물 (commercial)**
| AI 파라미터 | 필터 필드 ID | 설명 |
|------------|--------------|------|
| tf_region | tf_region | 지역 |
| tf_deposit | tf_deposit | 보증금 |
| tf_rent | tf_rent | 월세 |
| tf_premium | tf_premium | 권리금 |
| tf_sale_price | tf_sale_price | 매매가 |
| tf_status | tf_status | 현황 |
| tf_region2 | tf_region2 | 지역2 |
| tf_floor | tf_floor | 층수 |

**주택 매물 (housing)**
| AI 파라미터 | 필터 필드 ID | 설명 |
|------------|--------------|------|
| tf_h_region | tf_h_region | 지역 |
| tf_h_deposit | tf_h_deposit | 보증금 |
| tf_h_rent | tf_h_rent | 월세 |
| tf_h_status | tf_h_status | 현황 |
| tf_h_type | tf_h_type | 유형 |
| tf_h_supply | tf_h_supply | 공급면적 |
| tf_h_exclusive | tf_h_exclusive | 전용면적 |

#### 사용 예시

**예시 1: 상가 임대차 검색**
```
사용자: "부평동에 보증금 5천이하 월세 300이하 상가 있어?"
AI: "부평동에 조건에 맞는 상가임대차 매물이 8건 있습니다.
    필터를 적용해서 지도에 표시할까요?"
사용자: "응"
→ [필터 자동 입력 + 지도에 8개 매물만 표시]
→ 사용자가 🔍 버튼 클릭하면 조건 확인/수정 가능
```

**예시 2: 주택 매매 검색**
```
사용자: "3억 이하 주택매매 있어?"
AI: "3억 이하 주택매매가 15건 있습니다."
→ [tf_h_sale_price: ~30000 자동 입력 + 필터 적용]
```

**예시 3: 복합 조건**
```
사용자: "부평구에 생매물 중에 보증금 1억 이하만 보여줘"
AI: "부평구 생매물 중 보증금 1억 이하가 23건 있습니다."
→ [tf_region2: 부평구, tf_status: 생, tf_deposit: ~10000]
```

#### 체크리스트
- [ ] `apply_map_filter` 도구 정의 추가
- [ ] `ai_tool_executor.py`에 실행 로직 추가
- [ ] `ai-chat.js`에 필터 적용 함수 추가
- [ ] 필터 필드 매핑 테스트
- [ ] 사용자 수정 가능 여부 확인

---

## 8. 참고 자료

- Zhipu AI 공식 문서: https://open.bigmodel.cn/dev/api
- GLM-4 API 가이드: https://open.bigmodel.cn/dev/api#glm-4
- Tool Calling 문서: https://open.bigmodel.cn/dev/api#tool

---

## 9. 작업 재개 방법

내일 작업을 재개할 때:

1. 이 문서의 **체크리스트**를 확인하여 진행 상황 파악
2. **3.1 1단계**부터 순차적으로 진행
3. 완료된 항목은 체크 표시

```
작업 시작 커맨드:
"GLM AI Agent 계획서 보고 1단계부터 진행해줘"
```

---

*작성일: 2026-04-02*
*최종 수정: 2026-04-02*
