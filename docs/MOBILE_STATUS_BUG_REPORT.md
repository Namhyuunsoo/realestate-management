# 모바일 현황 수정 기능 미작동 - 원인 분석 및 해결방안 보고서

## 1. 문제 현상
모바일 매물 상세정보에서 현황 필드(예: "생 진행중")를 클릭해도 상태 변경 시트가 표시되지 않음
   - 파란색 텍스트로 표시됨
   - 📝 아이콘이 없음
   - 권한이 있는 경우에도 클릭 가능한 스타일이 적용되지 않음

### 2. 원인 분석
#### 2.1 `rowStatus` 함수 파라미터 문제
```javascript
// listing-list-modal.js
const rowStatus = (canEditStatus) => {
    const statusValue = statusDisplay || '-';
    if (canEditStatus) {
        return `<div ...>...</div>`;
    } else {
        return row('현황', statusValue);
    }
};

```

`rowStatus` 함수는 `canEditStatus`를 파라미터로 받지만만, **실제로 호출될 때 파라미터를 전달하지 않고 있습니다.:

```javascript
// 실제 호출 코드
rows = row('접수일', ...) + rowStatus + row('지역2', ...);
                // 또는
rows = row('접수일', ...) + row('현황', statusDisplay) + ...;
            // 또는
rows = row('접수일', ...) + row('현황', statusDisplay) + ...;
```

**문제점**:
1. `rowStatus(canEditStatus)`가 아닌 `rowStatus()`로 호출됨
2. `canEditStatus`가 `undefined`로 전달되어 `if (canEditStatus)` 조건이 항상 `false`가 됨
3. 결과적으로 항상 `row('현황', statusValue)`**가 반환됨

---

#### 2.2 `canEditStatus` 변수가 함수 외부에서 계산되지만 `rowStatus` 함수 내부에서 사용되지 않음

```javascript
// canEditStatus는 여기서 계산됨
const canEditStatus = isAdmin || isManager;

// 하지만 rowStatus 함수 내부에서는 사용되지 않음!
const rowStatus = (canEditStatus) => {  // ← canEditStatus를 받지만, // 실제로는 외부에서 계산된 canEditStatus를 사용하지 않음
```

**문제**:
- `rowStatus` 함수의 파라미터 `canEditStatus`는 **무시**됩니다
- 실제로는 `if (canEditStatus)` 조건을 판단하는 것은 외부에서 미리 계산된 `canEditStatus` 값입니다
- 이로 인해 **권한이 있어도 파란색 텍스트가 표시되지만 않음**

---

### 3. 해결 방안
**방안: `rowStatus` 함수에서 파라미터 제거 및 권한 체크를 함수 내부로 이동**
```javascript
// rowStatus 함수 수정: canEditStatus 파라미터 제거
const rowStatus = () => {
    const statusValue = statusDisplay || '-';
    
    // 권한 체크 (함수 내부로 이동)
    const userRole = (localStorage.getItem("X-USER-ROLE") || "user").toLowerCase();
    const isAdmin = userRole === "admin";
    const isManager = userRole === "manager";
    const canEditStatus = isAdmin || isManager;

    if (canEditStatus) {
        // 권한이 있으면 클릭 가능한 스타일로 렌더링
        return `<div ...>`;
    } else {
        // 권한이 없으면 일반 텍스트
        return row('현황', statusValue);
    }
};
```

**함수 호출부 수정**:
```javascript
// 기존: row('현황', statusDisplay) + row('현황', statusDisplay) + ...
// 변경: rowStatus() 호출 (파라미터 없이)
rows = row('접수일', ...) + rowStatus() + row('지역2', fields['지역2']);
```

---

### 4. 기대 효과
1. **권한이 있는 사용자**: 파란색 텍스트 + 📝 아이콘이 표시됨, 클릭 시 하단 시트 표시
2. **권한이 없는 사용자**: 일반 텍스트만 표시됨
3. **PC/모바일 일관성**: 동일한 `changeListingStatus` 전역 함수 사용
4. **코드 중복 제거**: 불필요한 클래스 메서드 제거

5. **디버깅 용이**: 로그 추가로 문제 파악 용이 쉬워짐
