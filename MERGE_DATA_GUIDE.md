# store.json 데이터 통합 가이드

각 PC에서 독립적으로 사용하던 데이터를 웹 배포 시 통합하는 방법입니다.

## 📋 통합 대상 데이터

- `data/store.json`: 고객 및 브리핑 정보
- `data/users.json`: 사용자 정보 (각 PC별로 이미 준비됨)
- `data/user_sheets.json`: 사용자 시트 정보
- `data/state/recommendations.json`: 추천 매물 정보

## 🔧 통합 방법

### 1단계: 각 PC의 store.json 수집

각 PC에서 `data/store.json` 파일을 수집합니다.

```
pc_stores/
├── pc1_store.json  (유 PC)
├── pc2_store.json  (진 PC)
└── pc3_store.json  (장 PC)
```

### 2단계: 통합 스크립트 실행

```bash
python merge_store_data.py
```

### 3단계: 통합 결과 확인

통합된 파일이 `output/merged_store.json`에 생성됩니다.

### 4단계: 웹 서버에 적용

통합된 `merged_store.json` 파일을 웹 서버의 `data/store.json`으로 복사합니다.

## ⚠️ 주의사항

### ID 충돌 처리

- **고객 ID**: 같은 이름+전화번호가 여러 PC에 있으면 PC 접미사 추가
  - 예: `홍길동_01012345678_pc1`, `홍길동_01012345678_pc2`
- **브리핑 ID**: 순차 번호로 재생성하여 충돌 방지
  - 예: `brf_000001`, `brf_000002`, ...

### 데이터 무결성

- 브리핑의 `customer_id`는 자동으로 새로운 고객 ID로 매핑됩니다
- 원본 정보는 `_original_id`, `_merged_from` 필드에 보존됩니다

### 중복 고객 처리

같은 이름+전화번호의 고객이 여러 PC에 있으면:
- 각각 별도 고객으로 유지 (PC 접미사로 구분)
- 필요시 수동으로 병합 가능

## 📝 다른 JSON 파일 통합

### users.json
- 각 PC별로 이미 준비되어 있음
- 웹 서버에 배포 시 모든 사용자를 하나의 `users.json`에 합치면 됨
- 이메일 중복 확인 필요

### user_sheets.json
- 사용자 시트 정보는 중복 가능성이 낮음
- 각 PC의 파일을 합치면 됨

### recommendations.json
- 추천 매물 정보
- 각 PC의 파일을 합치면 됨
- 매물 ID는 동일하므로 충돌 없음

## 🔄 통합 후 확인 사항

1. 고객 데이터가 모두 포함되었는지 확인
2. 브리핑의 고객 참조가 올바른지 확인
3. 사용자별로 자신의 데이터가 보이는지 확인
4. 관리자/매니저가 전체 데이터를 볼 수 있는지 확인
