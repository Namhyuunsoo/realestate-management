# Google Sheets → Supabase 연동 가이드

## 📋 개요

Google Sheets를 **데이터 소스**로 유지하면서 Supabase에 자동 동기화하고, 프로젝트에서 Supabase 데이터를 사용하는 방법입니다.

**핵심 개념:**
- Google Sheets = **진실의 단일 소스 (Single Source of Truth)**
- Supabase = **애플리케이션 데이터베이스 (Read/Write)**
- 자동 동기화 = **Google Sheets → Supabase**

---

## 🏗️ 아키텍처 설계

### 현재 구조
```
Google Sheets → Excel 파일 다운로드 → 프로젝트에서 Excel 읽기
```

### 새로운 구조 (제안)
```
Google Sheets → Supabase 동기화 → 프로젝트에서 Supabase 읽기/쓰기
                ↓ (병행)
            Excel 파일 (백업/호환성)
```

---

## ✅ 구현 방법

### 방법 1: Google Sheets → Supabase 직접 동기화 (권장)

#### 1.1 Sheet Download Service 수정

```python
# app/services/sheet_sync_service.py

import os
import logging
from typing import Dict, Any, Optional
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from supabase import create_client, Client
from flask import current_app

class SheetSyncService:
    """Google Sheets를 Supabase에 동기화하는 서비스"""
    
    def __init__(self):
        # Google API 인증
        self.service_account_file = os.getenv("SERVICE_ACCOUNT_FILE", "../config/service_account.json")
        self.spreadsheet_id = os.getenv("SPREADSHEET_ID", "1D14iWPeTuHAMf9m_LrtsILYEd2Z8dpjAbIfpx-WR8eY")
        
        # Supabase 클라이언트
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Google API 서비스
        self.sheets_service = None
        self._authenticate()
    
    def _authenticate(self):
        """Google 서비스 계정 인증"""
        try:
            scopes = ['https://www.googleapis.com/auth/spreadsheets']
            credentials = Credentials.from_service_account_file(
                self.service_account_file, 
                scopes=scopes
            )
            self.sheets_service = build('sheets', 'v4', credentials=credentials)
            logging.info("Google API 인증 성공")
        except Exception as e:
            logging.error(f"Google API 인증 실패: {e}")
            raise
    
    def sync_sheet_to_supabase(self, sheet_name: str, table_name: str) -> bool:
        """
        Google Sheets 시트를 Supabase 테이블에 동기화
        
        Args:
            sheet_name: Google Sheets의 시트 이름 (예: '상가임대차')
            table_name: Supabase 테이블 이름 (예: 'listings')
        """
        try:
            # 1. Google Sheets에서 데이터 읽기
            logging.info(f"Google Sheets에서 데이터 읽기: {sheet_name}")
            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=sheet_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                logging.warning(f"시트 데이터가 비어있습니다: {sheet_name}")
                return False
            
            # 2. 헤더와 데이터 분리
            headers = values[0]
            rows = values[1:]
            
            # 3. 데이터 정규화 (현재 listings_loader.py 로직 재사용)
            normalized_data = self._normalize_listings_data(headers, rows, sheet_name)
            
            # 4. Supabase에 저장 (Upsert)
            logging.info(f"Supabase에 {len(normalized_data)}개 데이터 동기화 중...")
            
            # 배치로 저장 (Supabase는 한 번에 최대 1000개 권장)
            batch_size = 1000
            for i in range(0, len(normalized_data), batch_size):
                batch = normalized_data[i:i + batch_size]
                
                # Upsert (ID 기준으로 존재하면 업데이트, 없으면 삽입)
                result = self.supabase.table(table_name).upsert(
                    batch,
                    on_conflict='id'  # ID 충돌 시 업데이트
                ).execute()
                
                logging.info(f"배치 {i//batch_size + 1} 완료: {len(batch)}개")
            
            logging.info(f"✅ 동기화 완료: {sheet_name} → {table_name}")
            return True
            
        except Exception as e:
            logging.error(f"동기화 실패 ({sheet_name}): {e}")
            return False
    
    def _normalize_listings_data(self, headers: list, rows: list, sheet_name: str) -> list:
        """
        시트 데이터를 정규화된 형식으로 변환
        (현재 listings_loader.py의 로직 재사용)
        """
        from ..listings_loader import normalize_listing_row
        
        normalized = []
        for row in rows:
            # 빈 행 건너뛰기
            if not row or all(not cell for cell in row):
                continue
            
            # 딕셔너리로 변환 (헤더를 키로)
            row_dict = {}
            for i, header in enumerate(headers):
                row_dict[header] = row[i] if i < len(row) else ""
            
            # 정규화
            normalized_row = normalize_listing_row(row_dict, sheet_name)
            if normalized_row:
                normalized.append(normalized_row)
        
        return normalized
    
    def sync_all_sheets(self) -> Dict[str, bool]:
        """
        모든 시트를 Supabase에 동기화
        
        Returns:
            {시트명: 성공여부} 딕셔너리
        """
        results = {}
        
        # 시트 → 테이블 매핑
        sheet_mapping = {
            '상가임대차': 'listings_rent',  # 임대차 매물
            '구분상가매매': 'listings_sale',  # 매매 매물
            '건물토지매매': 'listings_building'  # 건물/토지 매매
        }
        
        for sheet_name, table_name in sheet_mapping.items():
            results[sheet_name] = self.sync_sheet_to_supabase(sheet_name, table_name)
        
        return results
```

---

#### 1.2 스케줄러 통합

```python
# app/services/sheet_sync_scheduler.py

import time
import threading
import logging
from typing import Optional
from .sheet_sync_service import SheetSyncService

class SheetSyncScheduler:
    """Google Sheets → Supabase 동기화 스케줄러"""
    
    def __init__(self, sync_service: SheetSyncService, interval_minutes: int = 5):
        self.sync_service = sync_service
        self.interval_minutes = interval_minutes
        self.interval_seconds = interval_minutes * 60
        
        self.is_running = False
        self.scheduler_thread = None
        self.last_run_time = 0
        self.run_count = 0
        
        self.logger = logging.getLogger(__name__)
    
    def start(self):
        """스케줄러 시작"""
        if self.is_running:
            self.logger.warning("스케줄러가 이미 실행 중입니다.")
            return
        
        self.is_running = True
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        self.logger.info(f"Sheet → Supabase 동기화 스케줄러 시작 (간격: {self.interval_minutes}분)")
    
    def stop(self):
        """스케줄러 중지"""
        self.is_running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        self.logger.info("동기화 스케줄러 중지됨")
    
    def _run_scheduler(self):
        """스케줄러 메인 루프"""
        while self.is_running:
            try:
                current_time = time.time()
                
                if self.last_run_time == 0 or (current_time - self.last_run_time) >= self.interval_seconds:
                    self._execute_sync()
                    self.last_run_time = current_time
                    self.run_count += 1
                
                time.sleep(1)
                
            except Exception as e:
                self.logger.error(f"스케줄러 실행 중 오류: {e}")
                time.sleep(10)
    
    def _execute_sync(self):
        """동기화 실행"""
        try:
            self.logger.info(f"Google Sheets → Supabase 동기화 시작 (실행 횟수: {self.run_count + 1})")
            
            results = self.sync_service.sync_all_sheets()
            
            success_count = sum(results.values())
            total_count = len(results)
            
            if success_count == total_count:
                self.logger.info(f"✅ 모든 시트 동기화 성공 ({success_count}/{total_count})")
            else:
                failed_sheets = [name for name, success in results.items() if not success]
                self.logger.warning(f"⚠️ 일부 시트 동기화 실패: {failed_sheets}")
            
        except Exception as e:
            self.logger.error(f"동기화 실행 실패: {e}")
    
    def get_status(self) -> dict:
        """스케줄러 상태 조회"""
        return {
            'is_running': self.is_running,
            'interval_minutes': self.interval_minutes,
            'last_run_time': self.last_run_time,
            'run_count': self.run_count,
            'next_run_in': max(0, self.interval_seconds - (time.time() - self.last_run_time))
        }
    
    def force_sync(self) -> bool:
        """강제로 즉시 동기화 실행"""
        try:
            self.logger.info("강제 동기화 실행")
            self._execute_sync()
            self.last_run_time = time.time()
            return True
        except Exception as e:
            self.logger.error(f"강제 동기화 실패: {e}")
            return False
```

---

#### 1.3 Supabase 스키마 설계

```sql
-- app/migrations/supabase_schema.sql

-- 매물 테이블 (임대차)
CREATE TABLE listings_rent (
    id TEXT PRIMARY KEY,
    sheet_name TEXT NOT NULL,
    status_raw TEXT,
    region TEXT,
    address TEXT,
    building_name TEXT,
    floor TEXT,
    shop_name TEXT,
    sale_type TEXT,
    area REAL,
    deposit TEXT,
    monthly_rent TEXT,
    premium TEXT,
    notes TEXT,
    manager TEXT,
    region2 TEXT,
    contact TEXT,
    client TEXT,
    notes3 TEXT,
    violation TEXT,
    banner_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 매물 테이블 (매매)
CREATE TABLE listings_sale (
    -- listings_rent와 동일한 구조
    -- ...
);

-- 매물 테이블 (건물/토지)
CREATE TABLE listings_building (
    -- listings_rent와 동일한 구조
    -- ...
);

-- 인덱스 생성
CREATE INDEX idx_listings_rent_region ON listings_rent(region);
CREATE INDEX idx_listings_rent_manager ON listings_rent(manager);
CREATE INDEX idx_listings_rent_status ON listings_rent(status_raw);

-- 업데이트 시간 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_listings_rent_updated_at 
    BEFORE UPDATE ON listings_rent
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 방법 2: 기존 Excel 다운로드 유지 + Supabase 동기화 (병행)

현재 `SheetDownloadService`를 유지하면서 Supabase 동기화를 추가하는 방법입니다.

```python
# app/services/sheet_download_service.py (수정)

class SheetDownloadService:
    """Google Sheets를 Excel로 다운로드하고 Supabase에 동기화하는 서비스"""
    
    def __init__(self, service_account_file: str = None):
        # ... 기존 코드 ...
        
        # Supabase 클라이언트 추가
        self.sync_to_supabase = os.getenv('SYNC_TO_SUPABASE', 'false').lower() == 'true'
        if self.sync_to_supabase:
            from supabase import create_client
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_KEY")
            self.supabase = create_client(supabase_url, supabase_key)
    
    def download_sheet_as_excel(self, sheet_name: str, file_name: str) -> bool:
        """시트를 Excel로 다운로드하고 Supabase에 동기화"""
        try:
            # ... 기존 Excel 다운로드 코드 ...
            
            # Excel 파일 저장
            file_path = os.path.join(self.download_dir, file_name)
            df.to_excel(file_path, index=False)
            
            # Supabase 동기화 (옵션)
            if self.sync_to_supabase:
                self._sync_to_supabase(sheet_name, df)
            
            logging.info(f"시트 다운로드 성공: {sheet_name} → {file_path}")
            return True
            
        except Exception as e:
            logging.error(f"시트 다운로드 실패 {sheet_name}: {str(e)}")
            return False
    
    def _sync_to_supabase(self, sheet_name: str, df):
        """DataFrame을 Supabase에 동기화"""
        try:
            # DataFrame을 딕셔너리 리스트로 변환
            data = df.to_dict('records')
            
            # 정규화
            normalized_data = [self._normalize_row(row, sheet_name) for row in data]
            
            # 테이블 이름 결정
            table_mapping = {
                '상가임대차': 'listings_rent',
                '구분상가매매': 'listings_sale',
                '건물토지매매': 'listings_building'
            }
            table_name = table_mapping.get(sheet_name)
            
            if table_name:
                # Upsert
                self.supabase.table(table_name).upsert(
                    normalized_data,
                    on_conflict='id'
                ).execute()
                
                logging.info(f"Supabase 동기화 완료: {sheet_name} → {table_name}")
        
        except Exception as e:
            logging.error(f"Supabase 동기화 실패: {e}")
```

---

### 방법 3: 프로젝트에서 Supabase 사용

```python
# app/services/listings_loader.py (수정)

from supabase import create_client, Client
from flask import current_app

def load_listings_from_supabase(force_reload: bool = False) -> List[dict]:
    """Supabase에서 매물 데이터 로드"""
    try:
        # Supabase 클라이언트
        supabase_url = current_app.config.get('SUPABASE_URL')
        supabase_key = current_app.config.get('SUPABASE_KEY')
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # 캐시 확인 (옵션)
        if not force_reload:
            # Redis 또는 메모리 캐시 확인
            cached_data = get_cached_listings()
            if cached_data:
                return cached_data
        
        # Supabase에서 데이터 조회
        all_listings = []
        
        # 임대차 매물
        rent_result = supabase.table('listings_rent').select('*').execute()
        all_listings.extend(rent_result.data)
        
        # 매매 매물
        sale_result = supabase.table('listings_sale').select('*').execute()
        all_listings.extend(sale_result.data)
        
        # 건물/토지 매매
        building_result = supabase.table('listings_building').select('*').execute()
        all_listings.extend(building_result.data)
        
        # 캐시 저장
        set_cached_listings(all_listings)
        
        return all_listings
        
    except Exception as e:
        logging.error(f"Supabase에서 매물 데이터 로드 실패: {e}")
        # 폴백: 기존 Excel 파일 읽기
        return load_listings_from_excel()

def load_listings(force_reload: bool = False) -> List[dict]:
    """매물 데이터 로드 (Supabase 우선)"""
    use_supabase = current_app.config.get('USE_SUPABASE_FOR_LISTINGS', False)
    
    if use_supabase:
        return load_listings_from_supabase(force_reload)
    else:
        # 기존 Excel 파일 읽기
        return load_listings_from_excel(force_reload)
```

---

## ⚙️ 환경변수 설정

```bash
# .env 파일

# Google Sheets 설정 (기존)
SPREADSHEET_ID=1D14iWPeTuHAMf9m_LrtsILYEd2Z8dpjAbIfpx-WR8eY
SERVICE_ACCOUNT_FILE=../config/service_account.json
SHEET_DOWNLOAD_DIR=./data/raw

# Supabase 설정 (추가)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# 동기화 모드 선택
SYNC_TO_SUPABASE=true  # Excel 다운로드 시 Supabase에도 동기화
USE_SUPABASE_FOR_LISTINGS=true  # 프로젝트에서 Supabase 사용

# 동기화 간격 (분)
SHEET_SYNC_INTERVAL=5
```

---

## 📊 데이터 흐름도

### Option 1: Supabase만 사용 (권장)
```
Google Sheets 
    ↓ (5분마다)
SheetSyncService 
    ↓
Supabase (listings_rent, listings_sale, listings_building)
    ↓
프로젝트 (load_listings_from_supabase)
```

### Option 2: 병행 운영 (전환 기간)
```
Google Sheets
    ↓ (5분마다)
SheetDownloadService
    ├─→ Excel 파일 (기존 방식, 백업)
    └─→ Supabase (새 방식)
    ↓
프로젝트
    ├─→ Excel 파일 (USE_SUPABASE_FOR_LISTINGS=false)
    └─→ Supabase (USE_SUPABASE_FOR_LISTINGS=true)
```

---

## 🔧 DataManager 통합

```python
# app/services/data_manager.py (수정)

class DataManager:
    def __init__(self, data_dir: str = "./data"):
        # ... 기존 코드 ...
        
        # Sheet 동기화 서비스 (Supabase)
        self.sheet_sync_service: Optional[SheetSyncService] = None
        self.sheet_sync_scheduler: Optional[SheetSyncScheduler] = None
    
    def _ensure_sheet_sync_services(self):
        """Sheet → Supabase 동기화 서비스 초기화"""
        if 'sheet_sync_services' not in self._initialized_services:
            try:
                from .sheet_sync_service import SheetSyncService
                from .sheet_sync_scheduler import SheetSyncScheduler
                
                sync_service = SheetSyncService()
                self.sheet_sync_scheduler = SheetSyncScheduler(
                    sync_service, 
                    interval_minutes=int(os.getenv('SHEET_SYNC_INTERVAL', 5))
                )
                
                self._initialized_services.add('sheet_sync_services')
                print("✅ SheetSyncServices 지연 초기화 완료")
            except Exception as e:
                print(f"⚠️ SheetSyncServices 초기화 실패: {e}")
    
    def start_sheet_sync(self):
        """Sheet → Supabase 동기화 시작"""
        self._ensure_sheet_sync_services()
        if self.sheet_sync_scheduler:
            self.sheet_sync_scheduler.start()
            return True
        return False
```

---

## ✅ 장점

### 1. **데이터 일관성**
- Google Sheets가 진실의 단일 소스
- 모든 변경사항이 Supabase에 자동 반영

### 2. **성능 향상**
- Supabase 쿼리는 Excel 파일 읽기보다 **10-100배 빠름**
- 인덱스 활용 가능
- 페이지네이션 지원

### 3. **기존 시스템 유지**
- Excel 다운로드 기능 유지 (백업용)
- 점진적 전환 가능
- 롤백 가능

### 4. **확장성**
- 실시간 기능 추가 가능 (Supabase Realtime)
- 복잡한 쿼리 가능
- 다른 시스템과 연동 용이

---

## ⚠️ 주의사항

### 1. **데이터 동기화 지연**
- Google Sheets 변경 후 Supabase 반영까지 최대 5분 지연
- 실시간이 필요한 경우 **강제 동기화 API** 제공

### 2. **양방향 동기화 복잡도**
- Google Sheets → Supabase: 쉬움
- Supabase → Google Sheets: 복잡 (웹훅 필요)
- **권장**: Google Sheets만 수정, Supabase는 읽기 전용

### 3. **데이터 형식 변환**
- Google Sheets 형식 → Supabase 타입 변환 필요
- NULL 값 처리
- 날짜/시간 형식 변환

---

## 📝 구현 체크리스트

### Phase 1: Supabase 구축
- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 스키마 설계
- [ ] 테이블 생성 (listings_rent, listings_sale, listings_building)
- [ ] 인덱스 생성
- [ ] RLS 정책 설정 (선택사항)

### Phase 2: 동기화 서비스 구현
- [ ] SheetSyncService 구현
- [ ] SheetSyncScheduler 구현
- [ ] 데이터 정규화 로직 구현
- [ ] 에러 처리 및 로깅

### Phase 3: 프로젝트 통합
- [ ] load_listings_from_supabase 구현
- [ ] 환경변수 설정
- [ ] DataManager 통합
- [ ] 테스트

### Phase 4: 병행 운영
- [ ] Excel 다운로드 + Supabase 동기화 병행
- [ ] 데이터 일관성 검증
- [ ] 성능 모니터링

### Phase 5: 전환
- [ ] 프로젝트에서 Supabase 사용 활성화
- [ ] Excel 다운로드 옵션으로 변경 (백업용)
- [ ] 최종 테스트

---

## 🎯 최종 권장 구조

```
Google Sheets (진실의 단일 소스)
    ↓ 자동 동기화 (5분마다)
Supabase (애플리케이션 DB)
    ↓ 빠른 쿼리
프로젝트 (API)
    ↓
프론트엔드
```

**Excel 파일은 백업/호환성 목적으로만 유지**

---

*이 방법으로 Google Sheets를 Supabase에 연결하고 프로젝트에서 효율적으로 사용할 수 있습니다.*
