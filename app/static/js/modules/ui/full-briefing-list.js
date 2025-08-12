/* -----------------------------------------
 * full-briefing-list.js - 전체 브리핑 리스트 UI
 * ----------------------------------------- */

/**************************************
 * ===== 전체 브리핑 리스트 UI =====
 **************************************/

function toggleFullBriefingList(show) {
  UI_STATE.showFullBriefingList = (show !== undefined) ? show : !UI_STATE.showFullBriefingList;
  const panel = document.getElementById("fullBriefingListPanel");
  if (!panel) {
    console.error("❌ fullBriefingListPanel을 찾을 수 없습니다.");
    return;
  }
  
  console.log("🔍 toggleFullBriefingList 호출됨:", UI_STATE.showFullBriefingList);
  console.log("🔍 패널 요소:", panel);
  
  
  if (UI_STATE.showFullBriefingList) {
    panel.classList.remove("hidden");
    console.log("🔍 hidden 클래스 제거됨, 새로운 클래스:", panel.className);
    console.log("🔍 패널 스타일:", panel.style.display);
    renderFullBriefingList();
    console.log("🔍 전체브리핑리스트 열기 완료");
  } else {
    panel.classList.add("hidden");
    console.log("🔍 hidden 클래스 추가됨, 새로운 클래스:", panel.className);
    console.log("🔍 전체브리핑리스트 닫기 완료");
  }
}

function renderFullBriefingList() {
  const content = document.getElementById("fullBriefingListContent");
  if (!content) return;
  
  // 브리핑 현황이 체크된 매물만 필터링
  const briefingListings = LISTINGS.filter(item => {
    const status = getBriefingStatus(item.id);
    return status !== BRIEFING_STATUS.NORMAL; // 일반이 아닌 모든 상태 (예정, 완료, 보류)
  });
  
  // 현재 상단 필터 적용
  const effectiveFilters = buildEffectiveFilters();
  let filteredListings = briefingListings;
  
  if (effectiveFilters && Object.keys(effectiveFilters).length > 0) {
    filteredListings = briefingListings.filter(item => {
      const fields = item.fields || {};
      
      // 지역 필터
      if (effectiveFilters.region && effectiveFilters.region.length > 0) {
        const itemRegion = fields['지역'] || '';
        if (!effectiveFilters.region.some(r => itemRegion.includes(r))) {
          return false;
        }
      }
      
      // 지번 필터
      if (effectiveFilters.jibun && effectiveFilters.jibun.length > 0) {
        const itemJibun = fields['지번'] || '';
        if (!effectiveFilters.jibun.some(j => itemJibun.includes(j))) {
          return false;
        }
      }
      
      // 건물명 필터
      if (effectiveFilters.building && effectiveFilters.building.length > 0) {
        const itemBuilding = fields['건물명'] || '';
        if (!effectiveFilters.building.some(b => itemBuilding.includes(b))) {
          return false;
        }
      }
      
      // 층수 필터
      if (effectiveFilters.floor && effectiveFilters.floor.length > 0) {
        const itemFloor = fields['층수'] || '';
        if (!effectiveFilters.floor.some(f => itemFloor.includes(f))) {
          return false;
        }
      }
      
      // 실평수 필터
      if (effectiveFilters.area && effectiveFilters.area.length > 0) {
        const itemArea = parseFloat(fields['실평수']) || 0;
        const areaFilter = effectiveFilters.area[0];
        if (areaFilter.min !== null && itemArea < areaFilter.min) return false;
        if (areaFilter.max !== null && itemArea > areaFilter.max) return false;
      }
      
      // 보증금 필터
      if (effectiveFilters.deposit && effectiveFilters.deposit.length > 0) {
        const itemDeposit = parseFloat(fields['보증금']) || 0;
        const depositFilter = effectiveFilters.deposit[0];
        if (depositFilter.min !== null && itemDeposit < depositFilter.min) return false;
        if (depositFilter.max !== null && itemDeposit > depositFilter.max) return false;
      }
      
      // 월세 필터
      if (effectiveFilters.rent && effectiveFilters.rent.length > 0) {
        const itemRent = parseFloat(fields['월세']) || 0;
        const rentFilter = effectiveFilters.rent[0];
        if (rentFilter.min !== null && itemRent < rentFilter.min) return false;
        if (rentFilter.max !== null && itemRent > rentFilter.max) return false;
      }
      
      // 권리금 필터
      if (effectiveFilters.premium && effectiveFilters.premium.length > 0) {
        const itemPremium = parseFloat(fields['권리금']) || 0;
        const premiumFilter = effectiveFilters.premium[0];
        if (premiumFilter.min !== null && itemPremium < premiumFilter.min) return false;
        if (premiumFilter.max !== null && itemPremium > premiumFilter.max) return false;
      }
      
      // 키워드 필터
      if (effectiveFilters.keyword && effectiveFilters.keyword.length > 0) {
        const itemText = [
          fields['가게명'] || '',
          fields['건물명'] || '',
          fields['지번'] || '',
          fields['비고'] || '',
          fields['비고3'] || ''
        ].join(' ').toLowerCase();
        
        if (!effectiveFilters.keyword.every(k => itemText.includes(k.toLowerCase()))) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  // 정렬 적용
  if (CURRENT_SORT_MODE) {
    sortListingsInPlace(filteredListings);
  }
  
  // 헤더 렌더링 (원본/수정본 버튼 포함)
  const headerHtml = `
    <div style="background: #f8f9fa; padding: 12px 16px; border-bottom: 1px solid #e0e0e0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #666; font-size: 14px;">
          총 ${LISTINGS.length}건 / 브리핑 ${briefingListings.length}건 / 필터 후 ${filteredListings.length}건
        </span>
        <div style="display: flex; gap: 8px;">
          <button id="originalViewBtn" type="button" 
                  style="background: ${FULL_BRIEFING_VIEW_MODE === 'original' ? '#007bff' : '#6c757d'}; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;"
                  onclick="switchFullBriefingViewMode('original')">
            원본
          </button>
          <button id="editedViewBtn" type="button" 
                  style="background: ${FULL_BRIEFING_VIEW_MODE === 'edited' ? '#28a745' : '#6c757d'}; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;"
                  onclick="switchFullBriefingViewMode('edited')">
            수정본
          </button>
        </div>
      </div>
    </div>
  `;
  
  // 매물 리스트 렌더링 (테이블 형태로 모든 정보 표시)
  const listHtml = `
    <div style="height: calc(100vh - 234px); overflow-y: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 10;">
          <tr style="border-bottom: 2px solid #dee2e6;">
            <th style="padding:8px;min-width:60px;">접수날짜</th>
            <th style="padding:8px;min-width:50px;">지역</th>
            <th style="padding:8px;min-width:50px;">지번</th>
            <th style="padding:8px;min-width:60px;">건물명</th>
            <th style="padding:8px;min-width:40px;">층수</th>
            <th style="padding:8px;min-width:60px;">가게명</th>
            <th style="padding:8px;min-width:40px;">분양</th>
            <th style="padding:8px;min-width:40px;">실평수</th>
            <th style="padding:8px;min-width:50px;">보증금</th>
            <th style="padding:8px;min-width:50px;">월세</th>
            <th style="padding:8px;min-width:50px;">권리금</th>
            <th style="padding:8px;min-width:300px;">비고</th>
            <th style="padding:8px;min-width:50px;">담당자</th>
            <th style="padding:8px;min-width:40px;">현황</th>
            <th style="padding:8px;min-width:50px;">지역2</th>
            <th style="padding:8px;min-width:60px;">연락처</th>
            <th style="padding:8px;min-width:50px;">의뢰인</th>
            <th style="padding:8px;min-width:120px;">비고3</th>
            <th style="padding:8px;min-width:60px;">브리핑</th>
          </tr>
        </thead>
        <tbody>
          ${filteredListings.map(item => {
            const fields = item.fields || {};
            const briefingStatus = getBriefingStatus(item.id);
            const briefingText = getBriefingStatusText(briefingStatus);
            const briefingColor = {
              [BRIEFING_STATUS.NORMAL]: '#1976d2',
              [BRIEFING_STATUS.PENDING]: '#ff9800',
              [BRIEFING_STATUS.COMPLETED]: '#4caf50',
              [BRIEFING_STATUS.ONHOLD]: '#9e9e9e'
            }[briefingStatus];
            
            // 수정된 데이터가 있으면 사용, 없으면 원본 사용
            const displayFields = FULL_BRIEFING_VIEW_MODE === 'edited' && FULL_BRIEFING_EDITED_DATA[item.id] 
              ? { ...fields, ...FULL_BRIEFING_EDITED_DATA[item.id] }
              : fields;
            
            // 수정된 필드 확인
            const modifiedFields = FULL_BRIEFING_EDITED_DATA[item.id] || {};
            const isModified = (fieldName) => modifiedFields.hasOwnProperty(fieldName);
            
            return `
              <tr style="border-bottom:1px solid #eee;cursor:pointer;background:white;"
                  onclick="selectFullBriefingListItem('${item.id}')"
                  onmouseenter="highlightFullBriefingListItem('${item.id}', true); this.style.backgroundColor='#f8f9fa';"
                  onmouseleave="highlightFullBriefingListItem('${item.id}', false); this.style.backgroundColor='white';">
                <td data-field="접수날짜" class="${isModified('접수날짜') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '접수날짜', event)">${escapeHtml(displayFields['접수날짜'] || '-')}</td>
                <td data-field="지역" class="${isModified('지역') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '지역', event)">${escapeHtml(displayFields['지역'] || '-')}</td>
                <td data-field="지번" class="${isModified('지번') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '지번', event)">${escapeHtml(displayFields['지번'] || '-')}</td>
                <td data-field="건물명" class="${isModified('건물명') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '건물명', event)">${escapeHtml(displayFields['건물명'] || '-')}</td>
                <td data-field="층수" class="${isModified('층수') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '층수', event)">${escapeHtml(displayFields['층수'] || '-')}</td>
                <td data-field="가게명" class="${isModified('가게명') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '가게명', event)">${escapeHtml(displayFields['가게명'] || '-')}</td>
                <td data-field="분양" class="${isModified('분양') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '분양', event)">${escapeHtml(displayFields['분양'] || '-')}</td>
                <td data-field="실평수" class="${isModified('실평수') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '실평수', event)">${escapeHtml(displayFields['실평수'] || '-')}</td>
                <td data-field="보증금" class="${isModified('보증금') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '보증금', event)">${escapeHtml(displayFields['보증금'] || '-')}</td>
                <td data-field="월세" class="${isModified('월세') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '월세', event)">${escapeHtml(displayFields['월세'] || '-')}</td>
                <td data-field="권리금" class="${isModified('권리금') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '권리금', event)">${escapeHtml(displayFields['권리금'] || '-')}</td>
                <td data-field="비고" class="${isModified('비고') ? 'modified' : ''}" style="padding:6px 8px;max-width:300px;word-wrap:break-word;white-space:pre-wrap;" ondblclick="editFullBriefingCell('${item.id}', '비고', event)">${escapeHtml(displayFields['비고'] || '-')}</td>
                <td data-field="담당자" class="${isModified('담당자') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '담당자', event)">${escapeHtml(displayFields['담당자'] || displayFields['manager'] || '-')}</td>
                <td data-field="현황" class="${isModified('현황') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '현황', event)">${escapeHtml(displayFields['현황'] || '-')}</td>
                <td data-field="지역2" class="${isModified('지역2') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '지역2', event)">${escapeHtml(displayFields['지역2'] || '-')}</td>
                <td data-field="연락처" class="${isModified('연락처') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '연락처', event)">${escapeHtml(displayFields['연락처'] || '-')}</td>
                <td data-field="의뢰인" class="${isModified('의뢰인') ? 'modified' : ''}" style="padding:6px 8px;" ondblclick="editFullBriefingCell('${item.id}', '의뢰인', event)">${escapeHtml(displayFields['의뢰인'] || '-')}</td>
                <td data-field="비고3" class="${isModified('비고3') ? 'modified' : ''}" style="padding:6px 8px;max-width:120px;word-wrap:break-word;white-space:pre-wrap;" ondblclick="editFullBriefingCell('${item.id}', '비고3', event)">${escapeHtml(displayFields['비고3'] || '-')}</td>
                <td style="padding:6px 8px;text-align:center;">
                  <div style="padding:2px 6px;border-radius:8px;font-size:12px;font-weight:600;color:white;background:${briefingColor};cursor:pointer;display:inline-block;"
                       onclick="event.stopPropagation(); cycleBriefingStatus('${item.id}')">
                    ${briefingText}
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  content.innerHTML = headerHtml + listHtml;
}

function selectFullBriefingListItem(listingId) {
  // 매물 상세 정보 표시
  const item = LISTINGS.find(l => l.id === listingId);
  if (item) {
    // 지도에서 해당 매물 선택
    setActiveMarker(listingId);
    // 매물 상세 정보 표시
    renderDetailPanel(item);
  }
}

function highlightFullBriefingListItem(listingId, on) {
  // 지도에서 해당 매물 하이라이트
  highlightMarkerTemp(listingId, on);
}

function switchFullBriefingViewMode(mode) {
  FULL_BRIEFING_VIEW_MODE = mode;
  renderFullBriefingList();
}

function editFullBriefingCell(listingId, fieldName, event) {
  event.stopPropagation();
  
  const cell = event.target;
  const currentValue = cell.textContent === '-' ? '' : cell.textContent;
  
  // 편집 모드일 때만 수정 가능
  if (FULL_BRIEFING_VIEW_MODE !== 'edited') {
    showToast('수정본 모드에서만 편집할 수 있습니다.', 'warning');
    return;
  }
  
  // 입력 필드 생성
  const input = document.createElement('textarea');
  input.value = currentValue;
  input.style.width = '100%';
  input.style.height = '100%';
  input.style.border = 'none';
  input.style.outline = 'none';
  input.style.fontSize = '14px';
  input.style.fontFamily = 'inherit';
  input.style.padding = '6px 8px';
  input.style.boxSizing = 'border-box';
  input.style.resize = 'none';
  input.style.overflow = 'hidden';
  
  // 자동 높이 조정
  input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.max(this.scrollHeight, 40) + 'px';
  });
  
  // 초기 높이 설정
  input.style.height = Math.max(input.scrollHeight, 40) + 'px';
  
  // 셀 내용 교체
  cell.innerHTML = '';
  cell.appendChild(input);
  cell.classList.add('editing');
  input.focus();
  input.select();
  
  // 저장 함수
  const saveEdit = () => {
    try {
      const newValue = input.value.trim();
      
      // 수정된 데이터 저장
      if (!FULL_BRIEFING_EDITED_DATA[listingId]) {
        FULL_BRIEFING_EDITED_DATA[listingId] = {};
      }
      
      if (newValue === '') {
        delete FULL_BRIEFING_EDITED_DATA[listingId][fieldName];
        if (Object.keys(FULL_BRIEFING_EDITED_DATA[listingId]).length === 0) {
          delete FULL_BRIEFING_EDITED_DATA[listingId];
        }
      } else {
        FULL_BRIEFING_EDITED_DATA[listingId][fieldName] = newValue;
      }
      
      // 셀 내용 복원 (textContent 사용)
      cell.textContent = newValue || '-';
      cell.classList.remove('editing');
      
      showToast('수정되었습니다.', 'success');
    } catch (error) {
      console.error('저장 중 오류 발생:', error);
      showToast('저장 중 오류가 발생했습니다.', 'error');
    }
  };
  
  // 취소 함수
  const cancelEdit = () => {
    try {
      cell.textContent = currentValue || '-';
      cell.classList.remove('editing');
    } catch (error) {
      console.error('취소 중 오류 발생:', error);
    }
  };
  
  // 이벤트 리스너
  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  });
}

function refreshFullBriefingList() {
  if (UI_STATE.showFullBriefingList) {
    renderFullBriefingList();
  }
}

// 전체 브리핑 리스트 UI 관련 함수들을 전역으로 export
window.toggleFullBriefingList = toggleFullBriefingList;
window.renderFullBriefingList = renderFullBriefingList;
window.selectFullBriefingListItem = selectFullBriefingListItem;
window.highlightFullBriefingListItem = highlightFullBriefingListItem;
window.switchFullBriefingViewMode = switchFullBriefingViewMode;
window.editFullBriefingCell = editFullBriefingCell;
window.refreshFullBriefingList = refreshFullBriefingList; 