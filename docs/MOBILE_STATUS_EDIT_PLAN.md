# 모바일 현황 수정 기능 미작동 - 원인 분석 및 해결방안 보고서

## . 문제 현상
모바일 매물 상세정보에서 현황 필드(예: "생 진행중")를 클릭해도 상태 변경 시트가 표시되지 않음
   - 파란색 텍스트로 표시
   - 📝 아이콘이 없음
   - 권한이 있는 경우에도 파란색 + 📝으로 변경됨
- **아무 표시가 없음**: 권한이 없음 (일반 사용자) 경우)

## 2. 원인 분석

### 2.1 권한 체크 로직 문제
`rowStatus` 함수가 `canEditStatus`를 인자로 받지만, 실제로는 **함수 내부에서 계산** 않고, `rowStatus(canEditStatus)` 형태로 호출** 뒤 권한 체크를 수행:

```javascript
const rowStatus = (canEditStatus) => {
    const statusValue = statusDisplay || '-';
    
    if (canEditStatus) {
        // ⚠️ 권한 체크를 함수 내부에서 실행됨 }
    
    // 🔥 문제: rowStatus 함수가 canEditStatus 파라미터를 받지만만,
    // rowStatus(canEditStatus)를 호출할 때 canEditStatus 변수를 전달하지 않음
    return row('현황', statusValue);
}
```
            if (isHousingDetail) {
                rows = row('접수일', fields['접수일']) + row('지역', fields['지역']) + row('지번', fields['지번']) + row('유형', fields['유형']) + row('건물명', fields['건물명']) + row('동', fields['동']) + row('층수', fields['층수']) + row('호수', fields['호수']) + row('향', fields['향']) + row('공급/전용', formatSupplyExclDetail(fields['공급'], fields['전용'])) + row('보증금', fields['보증금']) + row('월세', fields['월세']) + row('관리비', fields['관리비']) + row('매매가', fields['매매가']) + row('방', fields['방']) + row('화장실', fields['화장실']) + row('거래유형', fields['거래유형']) + row('소유자', fields['의뢰인']) + row('소유자관계', fields['관계']) + rowPhone('연락처', fields['연락처']) + rowPhone('임차인 연락처', fields['임차인 연락처']) + row('비고', fields['비고']) + rowStatus() + row('지역2', fields['지역2']);
            } else {
                rows = row('접수일', fields['접수일']) + row('지역', fields['지역']) + row('지번', fields['지번']) + row('건물명', fields['건물명']) + row('가게명', fields['가게명']) + row('층수', fields['층수']) + row('실평수', fields['실평수'] ? fields['실평수'] + '평' : '') + row('보증금', fields['보증금']) + row('월세', fields['월세']) + row('권리금', fields['권리금']) + row('비고', fields['비고']) + rowStatus() + row('담당자', fields['담당자'] || fields['manager']);
            }
        }
```

**분석:**
1. **`rowStatus` 함수 호출 방식**: `rowStatus(canEditStatus)` 형태로 호출되고 있지만, **`canEditStatus` 파라미터가 실제로는 전달되지 않는다. 때문에 `rowStatus` 함수는 항상 `false`를 반환하여 일반 텍스트만 표시됨

**원인:**
1. `rowStatus` 함수의 `canEditStatus` 파라미터가 쓸모리가 있지만, 실제로 호출할 때 **`canEditStatus` 변수가 없다.** (undefined**)
2. `rowStatus` 함수 내부에서 `userRole`, `isAdmin`, `isManager`를 다시 계산하여 `canEditStatus`를 평가하지만, 이때도 `canEditStatus`는 `false`가 됩니다.

**해결 방안:**
`rowStatus` 함수를 **`rowStatusInline`로 변경** - 권한 체크 로직을 함수 내부로 이동
2. `rowStatusInline` 함수 내부에서 `canEditStatus`를 평가하지 않고, 파란색+ 📝 스타일을 적용할지 `true`를 반환하고, 그 외에는 일반 `row()` 함수를 사용합니다.```javascript
// 🆕 권한 체크 로직을 함수 내부로 이동
const rowStatusInline = () => {
    const statusValue = statusDisplay || '-';
    const userRole = (localStorage.getItem("X-USER-ROLE") || "user").toLowerCase();
    const isAdmin = userRole === "admin";
    const isManager = userRole === "manager";
    const canEditStatus = isAdmin || isManager;
    
    if (canEditStatus) {
        // 파란색 + 📝 아이콘을 적용한 클릭 가능한 스타일로 렌더링
        return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">현황</span>
            <span style="color: #007bff; cursor: pointer; text-decoration: underline; font-weight: bold; font-size: 13px;"
                  onclick="changeListingStatus('${listing.id}', '${listing.status_raw || ''}')">${escapeHtml(String(statusValue))} 📝</span>
        </div>`;
    } else {
        // 권한이 없으면 일반 텍스트
        return row('현황', statusValue);
    }
};
```

**변경 사항:**
1. `rowStatus` 함수 제거
2. `rowStatusInline` 함수 생성 (내부에서 권한 체크)
3. `rows` 변수에 실제로 할당할 때 `rowStatusInline()`를 호출하여 파란색 스타일이 적용되도록 변경됨.