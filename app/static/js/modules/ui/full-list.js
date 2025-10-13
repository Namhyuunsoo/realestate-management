/* -----------------------------------------
 * full-list.js - 전체 리스트 UI
 * ----------------------------------------- */

/**************************************
 * ===== 전체 리스트 UI =====
 **************************************/

function toggleFullList(show) {
  UI_STATE.showFullList = (show !== undefined) ? show : !UI_STATE.showFullList;
  const panel = document.getElementById("fullListPanel");
  if (!panel) {
    console.error("❌ fullListPanel을 찾을 수 없습니다.");
    return;
  }
  
  console.log("🔍 toggleFullList 호출됨:", UI_STATE.showFullList);
  console.log("🔍 패널 요소:", panel);
  
  
  if (UI_STATE.showFullList) {
    // 패널 열 때 히스토리 상태 추가
    window.history.pushState({ panel: 'fullList' }, '', '/');
    console.log('📱 전체보기 패널 열기 - 히스토리 상태 추가');
    
    panel.classList.remove("hidden");
    console.log("🔍 hidden 클래스 제거됨, 새로운 클래스:", panel.className);
    console.log("🔍 패널 스타일:", panel.style.display);
    renderFullList();
    console.log("🔍 전체리스트 열기 완료");
  } else {
    panel.classList.add("hidden");
    console.log("🔍 hidden 클래스 추가됨, 새로운 클래스:", panel.className);
    console.log("🔍 전체리스트 닫기 완료");
  }
}

function renderFullList() {
  const content = document.getElementById("fullListContent");
  if (!content) return;
  
  // 전체 매물 데이터 사용 (필터링되지 않은 원본)
  const allListings = LISTINGS || [];
  
  // 현재 상단 필터 적용
  const effectiveFilters = buildEffectiveFilters();
  let filteredListings = allListings;
  
  if (effectiveFilters && Object.keys(effectiveFilters).length > 0) {
    filteredListings = allListings.filter(item => {
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
  
  // 브리핑 필터 적용
  if (BRIEFING_FILTERS) {
    filteredListings = filteredListings.filter(item => {
      const status = getBriefingStatus(item.id);
      return BRIEFING_FILTERS[status];
    });
  }
  
  // 정렬 적용
  if (CURRENT_SORT_MODE) {
    sortListingsInPlace(filteredListings);
  }
  
  // 헤더 렌더링 (간단한 정보만)
  const headerHtml = `
    <div style="background: #f8f9fa; padding: 12px 16px; border-bottom: 1px solid #e0e0e0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #666; font-size: 14px;">
          총 ${allListings.length}건 / 필터 후 ${filteredListings.length}건
        </span>
      </div>
    </div>
  `;
  
  // 매물 리스트 렌더링 (테이블 형태로 모든 정보 표시)
  const listHtml = `
    <div style="height: calc(100vh - 234px); overflow-y: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 10;">
          <tr style="border-bottom: 2px solid #dee2e6;">
            <th style="padding:8px;min-width:60px;">접수일</th>
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
            return `
              <tr style="border-bottom:1px solid #eee;cursor:pointer;background:white;"
                  onclick="selectFullListItem('${item.id}')"
                  onmouseenter="highlightFullListItem('${item.id}', true); this.style.backgroundColor='#f8f9fa';"
                  onmouseleave="highlightFullListItem('${item.id}', false); this.style.backgroundColor='white';">
                <td style="padding:6px 8px;">${escapeHtml(fields['접수일'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['지역'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['지번'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['건물명'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['층수'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['가게명'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['분양'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['실평수'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['보증금'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['월세'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['권리금'] || '-')}</td>
                <td style="padding:6px 8px;max-width:300px;word-wrap:break-word;">${escapeHtml(fields['비고'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['담당자'] || fields['manager'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['현황'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['지역2'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['연락처'] || '-')}</td>
                <td style="padding:6px 8px;">${escapeHtml(fields['의뢰인'] || '-')}</td>
                <td style="padding:6px 8px;max-width:120px;word-wrap:break-word;">${escapeHtml(fields['비고3'] || '-')}</td>
                <td style="padding:6px 8px;text-align:center;">
                  <div style="padding:2px 6px;border-radius:8px;font-size:12px;font-weight:600;color:white;background:${briefingColor};display:inline-block;"
                       class="briefing-status-cell" data-listing-id="${item.id}">
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
  
  // 브리핑 상태 셀에 클릭 이벤트 설정
  setupBriefingStatusCells();
}

function setupBriefingStatusCells() {
  const briefingCells = document.querySelectorAll('.briefing-status-cell');
  const hasSelectedCustomer = window.SELECTED_CUSTOMER && window.SELECTED_CUSTOMER.id;
  
  briefingCells.forEach(cell => {
    if (hasSelectedCustomer) {
      // 고객선택 시: 클릭 기능 활성화
      cell.style.cursor = 'pointer';
      cell.style.display = 'inline-block';
      cell.style.opacity = '1';
      cell.onclick = (e) => {
        e.stopPropagation();
        cycleBriefingStatus(cell.dataset.listingId);
      };
    } else {
      // 고객선택 안됨: 완전히 숨김
      cell.style.cursor = 'default';
      cell.style.display = 'none';
      cell.style.opacity = '0';
      cell.onclick = null;
    }
  });
}

function selectFullListItem(listingId) {
  // 매물 상세정보 패널 열기
  const item = LISTINGS.find(l => l.id === listingId);
  if (item) {
    renderDetailPanel(item);
    setActiveMarker(listingId);
  }
}

function highlightFullListItem(listingId, on) {
  // 마커 하이라이트
  highlightMarkerTemp(listingId, on);
}

function refreshFullList() {
  if (UI_STATE.showFullList) {
    renderFullList();
  }
}

// 전체 리스트 UI 관련 함수들을 전역으로 export
window.toggleFullList = toggleFullList;
window.renderFullList = renderFullList;
window.selectFullListItem = selectFullListItem;
window.highlightFullListItem = highlightFullListItem;
window.refreshFullList = refreshFullList; 