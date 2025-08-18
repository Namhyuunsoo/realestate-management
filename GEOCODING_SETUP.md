# 지오코딩 자동화 서비스 설정 가이드

## 개요

이 서비스는 상가임대차.xlsx에서 주소를 자동으로 파싱하고, 네이버 지오코딩 API를 사용하여 좌표를 변환한 후 지도캐시.xlsx에 자동으로 저장하는 기능을 제공합니다.

## 주요 기능

1. **자동 주소 파싱**: 상가임대차.xlsx에서 지역2 + 지역 + 지번 조합으로 주소 생성
2. **스마트 지오코딩**: 기존에 좌표가 있는 주소는 재사용, 새 주소만 API 호출
3. **자동 업데이트**: 30분마다 자동으로 실행 (설정 가능)
4. **백업 생성**: 지도캐시 업데이트 시 자동 백업 생성

## 환경변수 설정

`.env` 파일에 다음 환경변수를 추가하세요:

```bash
# 네이버 지오코딩 API 키 (필수)
NAVER_MAPS_NCP_CLIENT_ID=your_client_id_here
NAVER_MAPS_NCP_CLIENT_SECRET=your_client_secret_here

# 기존 네이버 지도 API 키 (선택사항)
NAVER_MAPS_NCP_KEY_ID=your_key_id_here
```

## 네이버 클라우드 플랫폼 API 키 발급

1. [네이버 클라우드 플랫폼](https://www.ncloud.com/) 접속
2. 애플리케이션 등록
3. Maps > Geocoding 서비스 활성화
4. API 인증 정보에서 Client ID와 Client Secret 발급

## 사용법

### 1. 자동 실행 (권장)

서버 시작 시 자동으로 지오코딩 스케줄러가 시작됩니다.

### 2. 수동 실행

```bash
# 테스트 스크립트 실행
python test_geocoding.py

# 또는 Python 인터프리터에서
python
>>> from app.services.geocoding_service import GeocodingService
>>> service = GeocodingService()
>>> result = service.run_geocoding_update()
>>> print(result)
```

### 3. API 엔드포인트

- `GET /api/geocoding/status`: 지오코딩 상태 조회
- `POST /api/geocoding/run-now`: 즉시 지오코딩 실행 (관리자만)
- `POST /api/geocoding/start`: 지오코딩 스케줄러 시작 (관리자만)
- `POST /api/geocoding/stop`: 지오코딩 스케줄러 중지 (관리자만)

## 동작 원리

1. **상가임대차.xlsx 읽기**: 모든 매물의 주소 정보 추출
2. **지도캐시.xlsx 읽기**: 기존에 저장된 좌표 정보 로드
3. **새 주소 식별**: 상가임대차에 있지만 지도캐시에 없는 주소 찾기
4. **지오코딩 실행**: 새 주소만 네이버 API로 좌표 변환
5. **지도캐시 업데이트**: 새 좌표를 Excel 파일에 추가/업데이트
6. **백업 생성**: 기존 파일을 백업으로 보존

## 설정 옵션

### 실행 간격 변경

`app/services/geocoding_scheduler.py`에서 `interval_minutes` 값을 수정:

```python
def __init__(self, interval_minutes: int = 30):  # 30분 → 원하는 값으로 변경
```

### API 호출 제한

`app/services/geocoding_service.py`에서 `time.sleep(1)` 값 수정:

```python
# API 호출 제한 방지 (초당 1회)
if i < len(new_addresses):
    time.sleep(1)  # 1초 → 원하는 값으로 변경
```

## 주의사항

1. **API 호출 제한**: 네이버 지오코딩 API는 호출 제한이 있으므로 과도한 사용을 피하세요
2. **백업 파일**: 지도캐시 업데이트 시 자동으로 백업이 생성되므로 안전합니다
3. **중복 주소**: 같은 주소에 여러 매물이 있어도 좌표는 공유됩니다
4. **한국 지역**: 한국 지역 범위(위도 33-39, 경도 124-132)를 벗어나는 좌표는 제외됩니다

## 문제 해결

### 지오코딩이 실행되지 않는 경우

1. 환경변수 확인: `NAVER_MAPS_NCP_CLIENT_ID`, `NAVER_MAPS_NCP_CLIENT_SECRET` 설정 여부
2. API 키 유효성: 네이버 클라우드 플랫폼에서 API 키 상태 확인
3. 로그 확인: 서버 로그에서 오류 메시지 확인

### 좌표가 정확하지 않은 경우

1. 주소 형식 확인: 지역2 + 지역 + 지번이 올바르게 구성되었는지 확인
2. 지도캐시 백업: 이전 백업 파일에서 정확한 좌표 복원
3. 수동 지오코딩: `POST /api/geocoding/run-now`로 즉시 실행

## 성능 최적화

1. **실행 간격 조정**: 업데이트 빈도에 따라 30분 → 1시간 또는 2시간으로 조정
2. **배치 처리**: 대량의 새 주소가 있을 때는 수동 실행 권장
3. **캐시 활용**: 기존 좌표는 재사용하여 API 호출 최소화

