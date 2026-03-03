# Google Sheets → Supabase 실시간 동기화 가능 여부

## 📋 결론

**✅ 가능합니다!** 하지만 완전한 "실시간"은 아니고 **거의 실시간 (Near Real-Time)**입니다.

---

## 🔍 가능한 방법들

### 방법 1: Google Drive API Push Notifications (웹훅) ⭐ 권장

**가능 여부**: ✅ 가능

**원리:**
- Google Sheets는 Google Drive의 파일이므로 **Drive API의 `files.watch`** 사용 가능
- 파일이 변경되면 Google이 **웹훅으로 알림** 전송
- 웹훅 수신 시 Supabase에 동기화

**장점:**
- ✅ 진짜 "푸시" 방식 (폴링 불필요)
- ✅ API 편집, UI 편집 모두 감지
- ✅ Google 공식 지원

**단점:**
- ⚠️ "뭔가 변경됨"만 알려줌 → 실제 변경 내용은 별도로 가져와야 함
- ⚠️ 약간의 지연 가능 (몇 초~몇 분)
- ⚠️ 채널 만료 관리 필요 (최대 1일)

**구현 예시:**
```python
# Google Drive API로 웹훅 등록
POST https://www.googleapis.com/drive/v3/files/{spreadsheet_id}/watch

{
  "id": "unique-channel-id",
  "type": "web_hook",
  "address": "https://your-server.com/webhook/sheets-changed"
}

# 웹훅 수신 시
@app.route('/webhook/sheets-changed', methods=['POST'])
def handle_sheets_change():
    # X-Goog-Resource-State 헤더 확인
    resource_state = request.headers.get('X-Goog-Resource-State')
    
    if resource_state == 'update':
        # Google Sheets에서 최신 데이터 가져오기
        sync_sheet_to_supabase()
    
    return 'OK', 200
```

---

### 방법 2: Google Apps Script onEdit/onChange 트리거 + 웹훅

**가능 여부**: ✅ 가능 (제한적)

**원리:**
- Google Apps Script의 `onEdit` 또는 `onChange` 트리거 사용
- 편집 발생 시 **자동으로 웹훅 호출**
- 웹훅에서 Supabase 동기화

**장점:**
- ✅ 변경된 셀 정보를 바로 알 수 있음 (`e.range`, `e.value` 등)
- ✅ 즉시 실행 (거의 실시간)
- ✅ 구현이 비교적 간단

**단점:**
- ⚠️ **UI 편집만 감지** (API로 변경한 것은 감지 안됨)
- ⚠️ Apps Script 실행 시간 제한 (약 30초)
- ⚠️ 할당량 제한 (분당/일당 실행 횟수)

**구현 예시:**
```javascript
// Google Apps Script (시트에 바인딩)
function onEdit(e) {
  const payload = {
    sheetName: e.source.getActiveSheet().getName(),
    range: e.range.getA1Notation(),
    newValue: e.value,
    oldValue: e.oldValue,
    row: e.range.getRow(),
    col: e.range.getColumn()
  };
  
  // 웹훅 호출
  UrlFetchApp.fetch('https://your-server.com/webhook/sheets-edit', {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}
```

```python
# 백엔드 웹훅 수신
@app.route('/webhook/sheets-edit', methods=['POST'])
def handle_sheet_edit():
    data = request.json
    # 변경된 셀 정보로 Supabase 업데이트
    update_supabase_from_sheet_edit(data)
    return 'OK', 200
```

---

### 방법 3: 하이브리드 접근 (권장)

**방법 1 + 방법 2 조합**

**구조:**
```
Google Sheets 편집
    ├─ UI 편집 → Apps Script onEdit → 즉시 웹훅 → Supabase
    └─ API 편집 → Drive API watch → 웹훅 → Supabase
```

**장점:**
- ✅ 모든 변경 감지 (UI + API)
- ✅ 빠른 응답 (UI 편집은 즉시)
- ✅ 안정성 (Drive API로 백업)

---

## ⚙️ 구현 상세

### 1. Google Drive API Watch 설정

```python
# app/services/sheets_webhook_service.py

import os
import uuid
import time
import logging
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from flask import current_app

class SheetsWebhookService:
    """Google Sheets 변경 감지를 위한 웹훅 서비스"""
    
    def __init__(self):
        self.service_account_file = os.getenv("SERVICE_ACCOUNT_FILE")
        self.spreadsheet_id = os.getenv("SPREADSHEET_ID")
        self.webhook_url = os.getenv("WEBHOOK_URL")  # https://your-server.com/webhook/sheets
        self.drive_service = None
        self._authenticate()
    
    def _authenticate(self):
        """Google Drive API 인증"""
        scopes = ['https://www.googleapis.com/auth/drive']
        credentials = Credentials.from_service_account_file(
            self.service_account_file, 
            scopes=scopes
        )
        self.drive_service = build('drive', 'v3', credentials=credentials)
    
    def create_watch_channel(self, expiration_hours: int = 24) -> dict:
        """
        Google Sheets 파일에 대한 웹훅 채널 생성
        
        Args:
            expiration_hours: 채널 만료 시간 (최대 24시간)
        
        Returns:
            채널 정보 (resourceId 포함)
        """
        channel_id = str(uuid.uuid4())
        expiration_ms = int((time.time() + expiration_hours * 3600) * 1000)
        
        request_body = {
            'id': channel_id,
            'type': 'web_hook',
            'address': self.webhook_url,
            'expiration': expiration_ms,
            'token': 'your-secret-token'  # 웹훅 검증용
        }
        
        try:
            response = self.drive_service.files().watch(
                fileId=self.spreadsheet_id,
                body=request_body
            ).execute()
            
            logging.info(f"웹훅 채널 생성 성공: {channel_id}")
            return {
                'channel_id': channel_id,
                'resource_id': response.get('resourceId'),
                'expiration': response.get('expiration')
            }
        except Exception as e:
            logging.error(f"웹훅 채널 생성 실패: {e}")
            raise
    
    def stop_watch_channel(self, channel_id: str, resource_id: str):
        """웹훅 채널 중지"""
        try:
            self.drive_service.channels().stop(
                body={
                    'id': channel_id,
                    'resourceId': resource_id
                }
            ).execute()
            logging.info(f"웹훅 채널 중지: {channel_id}")
        except Exception as e:
            logging.error(f"웹훅 채널 중지 실패: {e}")
```

---

### 2. 웹훅 수신 엔드포인트

```python
# app/routes/webhooks.py

from flask import Blueprint, request, jsonify, current_app
from app.services.sheet_sync_service import SheetSyncService
import logging

bp = Blueprint("webhooks", __name__)

@bp.route("/webhook/sheets", methods=['POST'])
def handle_sheets_webhook():
    """
    Google Drive API에서 전송하는 웹훅 수신
    """
    # 웹훅 검증
    channel_token = request.headers.get('X-Goog-Channel-Token')
    if channel_token != 'your-secret-token':
        logging.warning("잘못된 웹훅 토큰")
        return jsonify({'error': 'Unauthorized'}), 401
    
    # 리소스 상태 확인
    resource_state = request.headers.get('X-Goog-Resource-State')
    resource_id = request.headers.get('X-Goog-Resource-ID')
    
    logging.info(f"웹훅 수신: state={resource_state}, resource_id={resource_id}")
    
    # 'sync'는 채널 생성 시 초기 알림 (무시)
    if resource_state == 'sync':
        return jsonify({'status': 'sync'}), 200
    
    # 'update'는 파일 변경 알림
    if resource_state == 'update':
        # 비동기로 동기화 실행 (백그라운드 작업)
        try:
            sync_service = SheetSyncService()
            # 즉시 동기화 또는 큐에 추가
            sync_service.sync_all_sheets()
            logging.info("Supabase 동기화 완료")
        except Exception as e:
            logging.error(f"동기화 실패: {e}")
            # 실패해도 200 반환 (재시도 방지)
        
        return jsonify({'status': 'ok'}), 200
    
    return jsonify({'status': 'ignored'}), 200

@bp.route("/webhook/sheets-edit", methods=['POST'])
def handle_sheets_edit_webhook():
    """
    Google Apps Script에서 전송하는 편집 웹훅 수신
    """
    try:
        data = request.json
        sheet_name = data.get('sheetName')
        range_notation = data.get('range')
        new_value = data.get('newValue')
        
        logging.info(f"시트 편집 감지: {sheet_name} {range_notation} = {new_value}")
        
        # 변경된 셀만 Supabase에 업데이트
        sync_service = SheetSyncService()
        sync_service.sync_specific_range(sheet_name, range_notation)
        
        return jsonify({'status': 'ok'}), 200
        
    except Exception as e:
        logging.error(f"편집 웹훅 처리 실패: {e}")
        return jsonify({'error': str(e)}), 500
```

---

### 3. Google Apps Script 코드

```javascript
// Google Sheets에 바인딩된 Apps Script
// 도구 → 스크립트 편집기에서 작성

/**
 * 시트 편집 시 자동 실행 (간단한 트리거)
 * 주의: API로 변경한 것은 감지 안됨
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const range = e.range.getA1Notation();
  
  const payload = {
    sheetName: sheetName,
    range: range,
    row: e.range.getRow(),
    col: e.range.getColumn(),
    newValue: e.value,
    oldValue: e.oldValue,
    timestamp: new Date().toISOString()
  };
  
  // 웹훅 호출
  const webhookUrl = 'https://your-server.com/webhook/sheets-edit';
  
  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (error) {
    Logger.log('웹훅 호출 실패: ' + error);
  }
}

/**
 * 시트 구조 변경 시 실행 (설치 가능한 트리거)
 * 행 추가/삭제, 시트 추가/삭제 등
 */
function onChange(e) {
  const changeType = e.changeType;
  const sheet = e.source.getActiveSheet();
  
  const payload = {
    changeType: changeType,
    sheetName: sheet.getName(),
    timestamp: new Date().toISOString()
  };
  
  const webhookUrl = 'https://your-server.com/webhook/sheets-change';
  
  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (error) {
    Logger.log('웹훅 호출 실패: ' + error);
  }
}
```

**트리거 설정:**
1. 스크립트 편집기에서 `onChange` 함수 선택
2. 편집 → 현재 프로젝트의 트리거
3. 트리거 추가:
   - 이벤트 소스: 스프레드시트에서
   - 이벤트 유형: 변경 시
   - 함수: onChange

---

## 📊 성능 및 제한사항

### 지연 시간

| 방법 | 평균 지연 | 최대 지연 |
|------|-----------|-----------|
| Apps Script onEdit | 1-5초 | 30초 |
| Drive API watch | 5-30초 | 몇 분 |
| 폴링 (5분 간격) | 0-5분 | 5분 |

### 할당량 제한

**Google Apps Script:**
- 실행 시간: 최대 30초 (간단한 트리거)
- 일일 실행: 20,000회 (무료 계정)
- 분당 실행: 제한 없음 (하지만 너무 많으면 제한)

**Google Drive API:**
- 채널 수: 제한 없음
- 채널 만료: 최대 24시간 (files.watch)
- 웹훅 재시도: 지수 백오프

---

## ✅ 최종 권장 구조

### 하이브리드 접근 (방법 1 + 방법 2)

```
Google Sheets 편집
    │
    ├─ UI 편집 (사용자가 직접 편집)
    │   └─ Apps Script onEdit
    │       └─ 즉시 웹훅 (1-5초)
    │           └─ Supabase 업데이트
    │
    └─ API 편집 (프로그램으로 편집)
        └─ Drive API watch
            └─ 웹훅 (5-30초)
                └─ Supabase 업데이트
```

**장점:**
- ✅ 모든 변경 감지
- ✅ 빠른 응답 (UI 편집)
- ✅ 안정성 (Drive API 백업)

---

## 🔧 구현 체크리스트

### Phase 1: 웹훅 인프라 구축
- [ ] HTTPS 웹훅 엔드포인트 구축
- [ ] Google Drive API 인증 설정
- [ ] 웹훅 채널 생성 로직
- [ ] 웹훅 수신 엔드포인트 구현

### Phase 2: Apps Script 설정
- [ ] Google Sheets에 Apps Script 추가
- [ ] onEdit/onChange 함수 작성
- [ ] 설치 가능한 트리거 설정
- [ ] 권한 승인

### Phase 3: 동기화 로직
- [ ] SheetSyncService 구현
- [ ] 변경 감지 시 Supabase 업데이트
- [ ] 에러 처리 및 재시도

### Phase 4: 모니터링
- [ ] 웹훅 수신 로깅
- [ ] 동기화 상태 모니터링
- [ ] 채널 만료 관리 (자동 갱신)

---

## ⚠️ 주의사항

### 1. 웹훅 보안
- ✅ HTTPS 필수
- ✅ 토큰 검증 (`X-Goog-Channel-Token`)
- ✅ 리소스 ID 검증

### 2. 채널 관리
- ⚠️ 채널은 최대 24시간 후 만료
- ⚠️ 만료 전 자동 갱신 필요
- ⚠️ 채널 중지 로직 필요

### 3. 순환 업데이트 방지
- ⚠️ Supabase → Google Sheets 업데이트 시 웹훅 재발생 가능
- ⚠️ 원인 플래그로 필터링 필요

### 4. 에러 처리
- ⚠️ 웹훅 실패 시 재시도 로직
- ⚠️ 폴백: 주기적 폴링 (5분)

---

## 📝 결론

**✅ 실시간 동기화 가능합니다!**

**권장 방법:**
1. **Google Drive API watch** (주요 방법)
   - 모든 변경 감지
   - 안정적
   
2. **Google Apps Script onEdit** (보조 방법)
   - UI 편집 즉시 감지
   - 빠른 응답

**예상 지연:**
- UI 편집: **1-5초**
- API 편집: **5-30초**

**완전한 실시간은 아니지만, 실용적으로는 충분히 빠릅니다!**

---

*이 방법으로 Google Sheets 변경 시 거의 실시간으로 Supabase에 동기화할 수 있습니다.*
