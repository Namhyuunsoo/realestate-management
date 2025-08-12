/* -----------------------------------------
 * briefing.js - 브리핑 상태 관리 및 필터링
 * ----------------------------------------- */

/**************************************
 * ===== 브리핑 상태 관리 =====
 **************************************/

function loadBriefingStates(customerId) {
  if (!customerId) {
    CURRENT_BRIEFING_STATES = {};
    return;
  }
  
  try {
    const stored = localStorage.getItem(`briefing_${customerId}`);
    CURRENT_BRIEFING_STATES = stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('브리핑 상태 로드 실패:', e);
    CURRENT_BRIEFING_STATES = {};
  }
}

function saveBriefingStates(customerId) {
  if (!customerId) return;
  
  try {
    localStorage.setItem(`briefing_${customerId}`, JSON.stringify(CURRENT_BRIEFING_STATES));
  } catch (e) {
    console.error('브리핑 상태 저장 실패:', e);
  }
}

function getBriefingStatus(listingId) {
  // 고객이 선택되지 않았으면 항상 NORMAL 반환
  if (!window.selectedCustomer || !window.selectedCustomer.id) {
    return BRIEFING_STATUS.NORMAL;
  }
  return CURRENT_BRIEFING_STATES[listingId] || BRIEFING_STATUS.NORMAL;
}

function setBriefingStatus(listingId, status) {
  if (status === BRIEFING_STATUS.NORMAL) {
    delete CURRENT_BRIEFING_STATES[listingId];
  } else {
    CURRENT_BRIEFING_STATES[listingId] = status;
  }
  
  // 현재 선택된 고객이 있으면 저장
  if (window.selectedCustomer && window.selectedCustomer.id) {
    saveBriefingStates(window.selectedCustomer.id);
  }
  
  // UI 업데이트
  updateBriefingStatusUI(listingId, status);
  updateMarkerBriefingStatus(listingId, status);
}

function updateBriefingStatusUI(listingId, status) {
  // 매물리스트 업데이트
  const listItem = document.querySelector(`#listingList li[data-id="${listingId}"]`);
  if (listItem) {
    updateListingItemBriefingStatus(listItem, status);
  }
  
  // 클러스터 목록 업데이트
  const clusterItem = document.querySelector(`#clusterItemList li[data-id="${listingId}"]`);
  if (clusterItem) {
    updateListingItemBriefingStatus(clusterItem, status);
  }
  
  // 매물 상세 정보 업데이트
  if (SELECTED_MARKER_ID === listingId) {
    updateDetailPanelBriefingStatus(status);
  }
  
  // 전체 브리핑 리스트 버튼 업데이트
  const fullBriefingButton = document.querySelector(`#fullBriefingListContent div[onclick*="cycleBriefingStatus('${listingId}')"]`);
  if (fullBriefingButton) {
    const briefingText = getBriefingStatusText(status);
    const briefingColor = {
      [BRIEFING_STATUS.NORMAL]: '#1976d2',
      [BRIEFING_STATUS.PENDING]: '#ff9800',
      [BRIEFING_STATUS.COMPLETED]: '#4caf50',
      [BRIEFING_STATUS.ONHOLD]: '#9e9e9e'
    }[status];
    
    fullBriefingButton.textContent = briefingText;
    fullBriefingButton.style.background = briefingColor;
  }
}

function updateListingItemBriefingStatus(listItem, status) {
  let indicator = listItem.querySelector('.briefing-status-indicator');
  
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'briefing-status-indicator';
    listItem.style.position = 'relative';
    listItem.appendChild(indicator);
  }
  
  // 기존 클래스 제거
  indicator.className = 'briefing-status-indicator';
  indicator.classList.add(`briefing-${status}`);
  
  // 클릭 이벤트
  indicator.onclick = (e) => {
    e.stopPropagation();
    cycleBriefingStatus(listItem.dataset.id);
  };
}

function updateDetailPanelBriefingStatus(status) {
  const detailPanel = document.getElementById('viewListingDetail');
  if (!detailPanel) return;
  
  let statusElement = detailPanel.querySelector('.listing-detail-briefing-status');
  
  if (!statusElement) {
    // 주소 정보 다음에 상태 표시 추가
    const addrElement = detailPanel.querySelector('.detail-row');
    if (addrElement) {
      statusElement = document.createElement('span');
      statusElement.className = 'listing-detail-briefing-status';
      statusElement.onclick = () => cycleBriefingStatus(SELECTED_MARKER_ID);
      addrElement.appendChild(statusElement);
    }
  }
  
  if (statusElement) {
    statusElement.className = 'listing-detail-briefing-status';
    statusElement.classList.add(`briefing-${status}`);
    statusElement.textContent = getBriefingStatusText(status);
  }
}

function updateMarkerBriefingStatus(listingId, status) {
  const marker = MARKERS.find(m => m._listingId === listingId);
  if (!marker) return;
  
  const color = STATUS_COLORS[LISTINGS.find(x => x.id === listingId)?.status_raw] || "#007AFF";
  const isActive = (marker._listingId === SELECTED_MARKER_ID);
  
  marker.setIcon({ 
    content: createMarkerIcon(color, isActive, status)
  });
  
  // 클러스터 버블도 업데이트
  updateClusterBubbles();
}

function updateClusterBubbles() {
  if (!CLUSTERER || !CLUSTERER._clusters) return;
  
  CLUSTERER._clusters.forEach(cluster => {
    const clusterMarker = cluster._clusterMarker;
    if (!clusterMarker || !cluster.getClusterMember) return;
    
    const clusterMembers = cluster.getClusterMember();
    if (!clusterMembers) return;
    
    const count = clusterMembers.length;
    let cls = "cluster-small";
    if (count >= 50)      cls = "cluster-big";
    else if (count >= 10) cls = "cluster-mid";

    // 클러스터 내 매물들의 브리핑 상태 분석
    const briefingStats = {
      normal: 0,
      pending: 0,
      completed: 0,
      onhold: 0
    };
    
    clusterMembers.forEach(marker => {
      if (marker && marker._listingId) {
        const status = getBriefingStatus(marker._listingId);
        briefingStats[status]++;
      }
    });
    
    // 브리핑 상태에 따른 버블 스타일 결정
    let bubbleStyle = "";
    let bubbleContent = count;
    
    // 브리핑 상태가 있는 매물이 있으면 색상 변경
    const hasBriefingItems = briefingStats.pending > 0 || briefingStats.completed > 0 || briefingStats.onhold > 0;
    
    if (hasBriefingItems) {
      // 주요 브리핑 상태 결정 (우선순위: 완료 > 예정 > 보류)
      let primaryStatus = BRIEFING_STATUS.NORMAL;
      if (briefingStats.completed > 0) {
        primaryStatus = BRIEFING_STATUS.COMPLETED;
      } else if (briefingStats.pending > 0) {
        primaryStatus = BRIEFING_STATUS.PENDING;
      } else if (briefingStats.onhold > 0) {
        primaryStatus = BRIEFING_STATUS.ONHOLD;
      }
      
      // 브리핑 상태별 색상
      const statusColors = {
        [BRIEFING_STATUS.NORMAL]: '#007AFF',
        [BRIEFING_STATUS.PENDING]: '#FF3B30',
        [BRIEFING_STATUS.COMPLETED]: '#34C759',
        [BRIEFING_STATUS.ONHOLD]: '#AF52DE'
      };
      
      bubbleStyle = `background-color: ${statusColors[primaryStatus]} !important; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);`;
    }

    const bubbleHtml = `<div class="cluster-bubble ${cls}" style="${bubbleStyle}">${bubbleContent}</div>`;
    const wrapper = clusterMarker.getElement();
    if (wrapper) {
      wrapper.innerHTML = bubbleHtml;
    }
  });
}

function cycleBriefingStatus(listingId) {
  const currentStatus = getBriefingStatus(listingId);
  const statusOrder = [BRIEFING_STATUS.NORMAL, BRIEFING_STATUS.PENDING, BRIEFING_STATUS.COMPLETED, BRIEFING_STATUS.ONHOLD];
  const currentIndex = statusOrder.indexOf(currentStatus);
  const nextIndex = (currentIndex + 1) % statusOrder.length;
  const nextStatus = statusOrder[nextIndex];
  
  setBriefingStatus(listingId, nextStatus);
}

function getBriefingStatusText(status) {
  const statusTexts = {
    [BRIEFING_STATUS.NORMAL]: '일반',
    [BRIEFING_STATUS.PENDING]: '예정',
    [BRIEFING_STATUS.COMPLETED]: '완료',
    [BRIEFING_STATUS.ONHOLD]: '보류'
  };
  return statusTexts[status] || '일반';
}

function applyBriefingFilters() {
  // 브리핑 필터가 체크된 상태들 확인
  const checkedStatuses = Object.keys(BRIEFING_FILTERS).filter(status => BRIEFING_FILTERS[status]);
  
  let listingsToShow;
  
  if (checkedStatuses.length > 0) {
    // 체크된 브리핑 상태의 매물들만 표시
    listingsToShow = FILTERED_LISTINGS.filter(item => {
      const status = getBriefingStatus(item.id);
      return checkedStatuses.includes(status);
    });
  } else {
    // 아무것도 체크되지 않았으면 모든 매물 표시
    listingsToShow = [...FILTERED_LISTINGS];
  }
  
  placeMarkers(listingsToShow);
  
  // 브리핑리스트 모드일 때는 브리핑리스트를 렌더링, 아니면 일반 매물리스트
  if (UI_STATE.isBriefingListMode) {
    renderBriefingList();
  } else {
    renderListingList(listingsToShow);
  }
  
  updateCountsDisplay(FILTERED_LISTINGS.length, listingsToShow.length);
}

function initializeBriefingFilters() {
  const filterIds = ['filterNormal', 'filterPending', 'filterCompleted', 'filterOnHold'];
  const filterKeys = ['normal', 'pending', 'completed', 'onhold'];
  
  filterIds.forEach((id, index) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = BRIEFING_FILTERS[filterKeys[index]];
      checkbox.addEventListener('change', (e) => {
        BRIEFING_FILTERS[filterKeys[index]] = e.target.checked;
        applyBriefingFilters();
      });
    }
  });
}

function resetBriefingFilters() {
  // 브리핑 필터 상태 초기화
  BRIEFING_FILTERS.normal = true;
  BRIEFING_FILTERS.pending = true;
  BRIEFING_FILTERS.completed = true;
  BRIEFING_FILTERS.onhold = true;
  
  // UI 체크박스 초기화
  const filterIds = ['filterNormal', 'filterPending', 'filterCompleted', 'filterOnHold'];
  filterIds.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = true;
    }
  });
}

/**************************************
 * ===== 브리핑 필터 UI 관리 =====
 **************************************/

function toggleBriefingFilter() {
  const dropdown = document.getElementById('briefingFilterDropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

// 브리핑 필터 드롭다운 외부 클릭 시 닫기
document.addEventListener('click', function(event) {
  const briefingFilter = document.getElementById('briefingFilter');
  const dropdown = document.getElementById('briefingFilterDropdown');
  
  if (briefingFilter && dropdown && !briefingFilter.contains(event.target)) {
    dropdown.classList.add('hidden');
  }
});

// 브리핑 관련 함수들을 전역으로 export
window.loadBriefingStates = loadBriefingStates;
window.saveBriefingStates = saveBriefingStates;
window.getBriefingStatus = getBriefingStatus;
window.setBriefingStatus = setBriefingStatus;
window.updateBriefingStatusUI = updateBriefingStatusUI;
window.updateListingItemBriefingStatus = updateListingItemBriefingStatus;
window.updateDetailPanelBriefingStatus = updateDetailPanelBriefingStatus;
window.updateMarkerBriefingStatus = updateMarkerBriefingStatus;
window.updateClusterBubbles = updateClusterBubbles;
window.cycleBriefingStatus = cycleBriefingStatus;
window.getBriefingStatusText = getBriefingStatusText;
window.applyBriefingFilters = applyBriefingFilters;
window.initializeBriefingFilters = initializeBriefingFilters;
window.resetBriefingFilters = resetBriefingFilters;
window.toggleBriefingFilter = toggleBriefingFilter; 