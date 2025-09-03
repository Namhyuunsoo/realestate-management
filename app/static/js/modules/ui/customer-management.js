/* -----------------------------------------
 * customer-management.js - 고객 관리 UI
 * ----------------------------------------- */

/**************************************
 * ===== 고객 관리 UI =====
 **************************************/

async function loadCustomerList(filter = 'own') {
  try {
    if (!currentUser) {
      console.error('사용자가 로그인되지 않았습니다.');
      return;
    }
    
    let url = '/api/customers';
    
    // 필터링 파라미터 추가
    if (filter === 'own') {
      url += '?filter=own';
    } else if (filter === 'all') {
      url += '?filter=all';
    } else if (filter.startsWith('manager:')) {
      const manager = filter.split(':')[1];
      url += `?filter=manager&manager=${encodeURIComponent(manager)}`;
    }
    
    console.log('🌐 고객 목록 요청:', url);
    
    const res = await fetch(url, {
      headers: {
        'X-User': currentUser
      }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    const customerList = data.items || data.itema || [];
    
    console.log('✅ 고객 목록 로드 완료:', customerList.length + '개');
    
    renderCustomerList(customerList);
  } catch (err) {
    console.error('고객 목록 요청 중 예외 발생:', err);
  }
}

function renderCustomerList(list) {
  console.log('🔍 renderCustomerList 호출:', list);
  console.log('🔍 renderCustomerList 매개변수 타입:', typeof list);
  console.log('🔍 renderCustomerList 매개변수 길이:', list ? list.length : 'undefined');
  console.log('🔍 고객 ID 목록:', list.map(c => c.id));
  console.log('🔍 첫 번째 고객 상세:', list[0]);
  console.log('🔍 첫 번째 고객 타입:', typeof list[0]);
  console.log('🔍 첫 번째 고객 키들:', list[0] ? Object.keys(list[0]) : 'undefined');
  
  // 전역 변수에 고객 목록 저장 (수정/삭제 기능용)
  window.currentCustomerList = list;
  console.log('🔍 window.currentCustomerList 설정 후:', window.currentCustomerList);
  console.log('🔍 window.currentCustomerList 첫 번째 고객:', window.currentCustomerList[0]);
  
  // 2차 사이드바의 고객 목록 컨테이너를 찾기
  let customerListContent = document.getElementById("customerListContent2");
  if (!customerListContent) {
    // viewCustomerList 내부에서 찾기
    const viewCustomerList = document.getElementById("viewCustomerList");
    if (viewCustomerList) {
      customerListContent = viewCustomerList.querySelector(".customer-list-container div");
    }
  }
  if (!customerListContent) {
    customerListContent = document.getElementById("customerListContent");
  }
  
  if (!customerListContent) {
    console.error("고객 목록 컨테이너를 찾을 수 없습니다.");
    return;
  }
  
  // 고객 목록을 카드 형태로 렌더링
  customerListContent.innerHTML = '';
  
  if (list.length === 0) {
    customerListContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">등록된 고객이 없습니다.</div>';
    return;
  }
  
  // 필터 영역을 같은 줄에 배치
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;';
  
  // 필터 영역
  const filterContainer = document.createElement('div');
  filterContainer.style.cssText = 'display: flex; gap: 8px; align-items: center;';
  
  // 담당자 필터 (어드민인 경우만)
  if (currentUser === 'darkbirth@naver.com' || currentUser === 'darkbirth1@gmail.com' || currentUser === 'jeonghannah@naver.com') {
    const managerFilter = document.createElement('select');
    managerFilter.id = 'customerFilterSelect';
    managerFilter.style.cssText = 'padding: 4px 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; min-width: 100px;';
    managerFilter.innerHTML = '<option value="all">전체 고객</option>';
    
    // 담당자 목록을 동적으로 가져오기
    fetch('/api/customers/managers', {
      headers: { 'X-User': currentUser }
    })
    .then(response => response.json())
    .then(data => {
      if (data.managers && data.managers.length > 0) {
        data.managers.forEach(manager => {
          const option = document.createElement('option');
          option.value = `manager:${manager}`;
          option.textContent = `${manager} 고객`;
          managerFilter.appendChild(option);
        });
      }
    })
    .catch(error => {
      console.error('담당자 목록 가져오기 실패:', error);
    });
    
    managerFilter.addEventListener('change', handleCustomerFilterChange);
    filterContainer.appendChild(managerFilter);
  }
  
  // 상태 필터 (모든 사용자)
  const statusFilter = document.createElement('select');
  statusFilter.id = 'customerStatusFilter';
  statusFilter.style.cssText = 'padding: 4px 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; min-width: 70px;';
  statusFilter.innerHTML = `
    <option value="all">전체 상태</option>
    <option value="생">생성</option>
    <option value="완">완료</option>
    <option value="보류">보류</option>
    <option value="포기">포기</option>
  `;
  statusFilter.addEventListener('change', handleStatusFilterChange);
  filterContainer.appendChild(statusFilter);
  
  titleContainer.appendChild(filterContainer);
  customerListContent.appendChild(titleContainer);
  
  // 고객 목록 렌더링
  renderCustomerListItems(list);
}

// 필터링된 고객 목록만 렌더링 (필터는 유지)
function renderFilteredCustomerList(filteredList) {
  // 고객 목록 컨테이너를 찾기
  let customerListContent = document.getElementById("customerListContent2");
  if (!customerListContent) {
    const viewCustomerList = document.getElementById("viewCustomerList");
    if (viewCustomerList) {
      customerListContent = viewCustomerList.querySelector(".customer-list-container div");
    }
  }
  if (!customerListContent) {
    customerListContent = document.getElementById("customerListContent");
  }
  
  if (!customerListContent) {
    console.error("고객 목록 컨테이너를 찾을 수 없습니다.");
    return;
  }
  
  // 기존 고객 목록 컨테이너 제거 (필터는 유지)
  const existingListContainer = customerListContent.querySelector('.customer-list-items');
  if (existingListContainer) {
    existingListContainer.remove();
  }
  
  // 필터링된 목록 렌더링
  renderCustomerListItems(filteredList);
}

// 고객 목록 아이템만 렌더링
function renderCustomerListItems(list) {
  // 고객 목록 컨테이너를 찾기
  let customerListContent = document.getElementById("customerListContent2");
  if (!customerListContent) {
    const viewCustomerList = document.getElementById("viewCustomerList");
    if (viewCustomerList) {
      customerListContent = viewCustomerList.querySelector(".customer-list-container div");
    }
  }
  if (!customerListContent) {
    customerListContent = document.getElementById("customerListContent");
  }
  
  if (!customerListContent) {
    console.error("고객 목록 컨테이너를 찾을 수 없습니다.");
    return;
  }
  
  // 고객 목록 컨테이너
  const listContainer = document.createElement('div');
  listContainer.className = 'customer-list-items';
  listContainer.style.cssText = 'height: auto; overflow: visible; padding-right: 4px;';
  
  list.forEach((c, index) => {
    console.log(`🔍 고객 ${index + 1} 렌더링:`, c);
    console.log(`🔍 고객 ${index + 1} 이름:`, c.name);
    console.log(`🔍 고객 ${index + 1} 전화번호:`, c.phone);
    
    const customerCard = document.createElement('div');
    customerCard.className = 'customer-card';
    customerCard.style.cssText = `
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    `;
    
    // 더블클릭 안내 툴팁 추가
    customerCard.title = "클릭: 상세보기 | 더블클릭: 필터적용 | 우클릭: 메뉴 (수정/상태변경/삭제)";
    
    // 고객 정보 요약 (_pref 필드 우선, 기존 필드 fallback)
    const summary = [];
    if (c.regions) summary.push(`📍 ${c.regions}`);
    if (c.floor_pref || c.floor) summary.push(`🏢 ${c.floor_pref || c.floor}층`);
    if (c.area_pref || c.area) summary.push(`📐 ${c.area_pref || c.area}평`);
    if (c.deposit_pref || c.deposit) summary.push(`💰 보:${c.deposit_pref || c.deposit}`);
    if (c.rent_pref || c.rent) summary.push(`💵 월:${c.rent_pref || c.rent}`);
    if (c.premium_pref || c.premium) summary.push(`🔑 권:${c.premium_pref || c.premium}`);
    
    // 참고사항 처리 (긴 경우 줄임)
    let notesDisplay = '';
    if (c.notes && c.notes.trim()) {
      const notes = c.notes.trim();
      notesDisplay = notes.length > 30 ? notes.substring(0, 30) + '...' : notes;
    }
    
    // 상태 표시 (클릭 가능한 드롭다운)
    const status = c.status || '생';
    const statusConfig = {
      '생': { label: '생성', color: '#28a745', bgColor: '#d4edda' },
      '완': { label: '완료', color: '#0c5460', bgColor: '#d1ecf1' },
      '보류': { label: '보류', color: '#856404', bgColor: '#fff3cd' },
      '포기': { label: '포기', color: '#721c24', bgColor: '#f8d7da' }
    };
    const statusInfo = statusConfig[status] || statusConfig['생'];
    
    customerCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
        <div style="font-weight: bold; color: #333; font-size: 14px;">${escapeHtml(c.name || '이름 없음')}</div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="color: #666; font-size: 11px;">👤 ${escapeHtml(c.manager || '담당자 없음')}</span>
          <span class="status-badge" 
                style="background: ${statusInfo.bgColor}; color: ${statusInfo.color}; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold; cursor: pointer; transition: all 0.2s ease;"
                onclick="event.stopPropagation(); showStatusDropdown(event, '${c.id}', '${status}')"
                title="클릭하여 상태 변경">${statusInfo.label}</span>
        </div>
      </div>
      <div style="color: #666; font-size: 12px; margin-bottom: 3px;">📞 ${escapeHtml(c.phone || '연락처 없음')}</div>
      <div style="color: #666; font-size: 11px; line-height: 1.2; margin-bottom: 3px;">
        ${summary.length > 0 ? summary.join(' | ') : '희망 조건 없음'}
      </div>
      ${notesDisplay ? `<div style="color: #888; font-size: 10px; line-height: 1.1; font-style: italic;">📝 ${escapeHtml(notesDisplay)}</div>` : ''}
    `;
    
    customerCard.addEventListener('click', (e) => {
      // 상태 배지 클릭이 아닌 경우에만 고객 상세보기 실행
      if (!e.target.classList.contains('status-badge')) {
        showCustomerDetail(c);
      }
    });
    
    // 더블클릭 시 필터 적용
    customerCard.addEventListener('dblclick', () => {
      applyCustomerFilter(c);
    });
    
    // 우클릭 컨텍스트 메뉴 추가
    customerCard.addEventListener('contextmenu', (e) => {
      console.log('🖱️ 우클릭 이벤트 발생:', e);
      console.log('🖱️ 우클릭한 고객:', c);
      e.preventDefault();
      showCustomerContextMenu(e, c);
    });
    
    customerCard.addEventListener('mouseenter', () => {
      customerCard.style.backgroundColor = '#f0f8ff';
      customerCard.style.borderColor = '#1976d2';
      customerCard.style.boxShadow = '0 2px 4px rgba(25, 118, 210, 0.1)';
    });
    
    customerCard.addEventListener('mouseleave', () => {
      customerCard.style.backgroundColor = 'white';
      customerCard.style.borderColor = '#e0e0e0';
      customerCard.style.boxShadow = 'none';
    });
    
    // 상태 배지 호버 효과 추가
    const statusBadge = customerCard.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.addEventListener('mouseenter', () => {
        statusBadge.style.transform = 'scale(1.05)';
        statusBadge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      });
      
      statusBadge.addEventListener('mouseleave', () => {
        statusBadge.style.transform = 'scale(1)';
        statusBadge.style.boxShadow = 'none';
      });
    }
    
    listContainer.appendChild(customerCard);
  });
  
  customerListContent.appendChild(listContainer);
}

// 고객 컨텍스트 메뉴 표시
function showCustomerContextMenu(e, customer) {
  console.log('📋 showCustomerContextMenu 호출:', customer);
  console.log('📋 고객 ID:', customer.id);
  
  // 기존 컨텍스트 메뉴 제거
  const existingMenu = document.getElementById('customerContextMenu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // 새 컨텍스트 메뉴 생성
  const contextMenu = document.createElement('div');
  contextMenu.id = 'customerContextMenu';
  contextMenu.style.cssText = `
    position: fixed;
    top: ${e.clientY}px;
    left: ${e.clientX}px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 999999;
    min-width: 120px;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  `;
  
  console.log('📋 컨텍스트 메뉴 HTML 생성 중...');
  contextMenu.innerHTML = `
    <div class="context-menu-item" data-action="edit" data-customer-id="${customer.id}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 13px;">✏️ 수정</div>
    <div class="context-menu-item" data-action="status" data-customer-id="${customer.id}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 13px;">🔄 상태변경</div>
    <div class="context-menu-item" data-action="delete" data-customer-id="${customer.id}" style="padding: 8px 12px; cursor: pointer; font-size: 13px; color: #dc3545;">🗑️ 삭제</div>
  `;
  console.log('📋 컨텍스트 메뉴 HTML 생성 완료');
  
  // 호버 효과 및 클릭 이벤트
  const menuItems = contextMenu.querySelectorAll('.context-menu-item');
  menuItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f5f5f5';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'white';
    });
    
    // 클릭 이벤트 추가
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = item.getAttribute('data-action');
      const customerId = item.getAttribute('data-customer-id');
      console.log('🖱️ 컨텍스트 메뉴 클릭:', action, customerId);
      
      if (action === 'edit') {
        console.log('🔧 editCustomerById 함수 호출 시도:', customerId);
        console.log('🔧 editCustomerById 함수 존재 여부:', typeof window.editCustomerById);
        if (typeof window.editCustomerById === 'function') {
          console.log('🔧 editCustomerById 함수 호출 직전');
          console.log('🔧 customerId 값:', customerId);
          console.log('🔧 window.editCustomerById 함수:', window.editCustomerById);
          try {
            const result = await window.editCustomerById(customerId);
            console.log('🔧 editCustomerById 함수 호출 완료, 결과:', result);
          } catch (error) {
            console.error('❌ editCustomerById 함수 실행 중 오류:', error);
          }
        } else {
          console.error('❌ editCustomerById 함수를 찾을 수 없습니다!');
        }
      } else if (action === 'status') {
        console.log('🔄 changeCustomerStatusById 함수 호출 시도:', customerId);
        if (typeof window.changeCustomerStatusById === 'function') {
          window.changeCustomerStatusById(customerId);
        } else {
          console.error('❌ changeCustomerStatusById 함수를 찾을 수 없습니다!');
        }
      } else if (action === 'delete') {
        console.log('🗑️ deleteCustomerById 함수 호출 시도:', customerId);
        if (typeof window.deleteCustomerById === 'function') {
          window.deleteCustomerById(customerId);
        } else {
          console.error('❌ deleteCustomerById 함수를 찾을 수 없습니다!');
        }
      }
      
      contextMenu.remove();
    });
  });
  
  document.body.appendChild(contextMenu);
  console.log('📋 컨텍스트 메뉴 DOM에 추가 완료');
  console.log('📋 컨텍스트 메뉴 위치:', e.clientX, e.clientY);
  
  // 다른 곳 클릭 시 메뉴 닫기
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      contextMenu.remove();
      document.removeEventListener('click', closeMenu);
    });
  }, 100);
}

// 고객 수정 함수
window.editCustomerById = async function(customerId) {
  console.log('🔧 editCustomer 호출:', customerId);
  
  try {
    // 현재 로드된 고객 목록에서 고객 데이터 찾기
    const customer = window.currentCustomerList.find(c => c.id === customerId);

    
    if (!customer) {
      console.error('❌ 고객을 찾을 수 없습니다:', customerId);
      alert('고객 정보를 찾을 수 없습니다.');
      return;
    }
    
    console.log('✅ 고객 데이터 찾음:', customer);
    
    // 현재 선택된 고객 저장 (취소 버튼용)
    window.selectedCustomer = customer;
    
    // 수정 전용 패널 열기
    showSecondaryPanel('viewCustomerEdit');
    renderCustomerEditForm(customer);
    
    // 제목 변경
    const detailTitleEl = document.getElementById("secondaryPanelTitle");
    if (detailTitleEl) {
      detailTitleEl.textContent = "고객 정보 수정";
    }
  } catch (error) {
    console.error('고객 정보 가져오기 중 오류:', error);
    alert('고객 정보를 가져오는 중 오류가 발생했습니다.');
  }
}

// 고객 삭제 함수
window.deleteCustomerById = async function(customerId) {
  console.log('🗑️ deleteCustomer 호출:', customerId);
  
  if (!confirm('정말로 이 고객을 삭제하시겠습니까?')) {
    return;
  }
  
  try {
    const url = `/api/customers/${customerId}`;
    console.log('🌐 요청 URL:', url);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-User': currentUser
      }
    });
    
    console.log('📡 응답 상태:', response.status, response.statusText);
    
    if (response.ok) {
      showToast('고객이 삭제되었습니다.', 'success');
      // 고객 목록 새로고침
      loadCustomerList();
    } else {
      const error = await response.text();
      console.error('❌ 삭제 실패:', error);
      alert(`삭제 실패: ${error}`);
    }
  } catch (error) {
    console.error('고객 삭제 중 오류:', error);
    alert('고객 삭제 중 오류가 발생했습니다.');
  }
}

// 고객 ID로 고객 데이터 가져오기
function getCustomerById(customerId) {
  return window.currentCustomerList ? window.currentCustomerList.find(c => c.id === customerId) : null;
}

// 고객 선택 초기화
function clearCustomerSelection() {
  // 고객 목록에서 선택 상태 제거
  const customerCards = document.querySelectorAll('.customer-card');
  customerCards.forEach(card => {
    card.style.backgroundColor = 'white';
    card.style.borderColor = '#e0e0e0';
    card.style.boxShadow = 'none';
  });
  
  // 전역 변수 초기화
  window.selectedCustomer = null;
  
  // 브리핑 상태 초기화
  loadBriefingStates(null);
  
  // 브리핑 필터 초기화
  if (typeof resetBriefingFilters === 'function') {
    resetBriefingFilters();
  }
  
  // 고객 필터도 함께 초기화
  clearCustomerFilter();
}

// 고객 필터 해제
function clearCustomerFilter() {
  console.log('🔧 clearCustomerFilter 호출됨');
  
  // CUSTOMER_FILTERS 초기화
  Object.keys(CUSTOMER_FILTERS).forEach(k => delete CUSTOMER_FILTERS[k]);
  console.log('🔧 CUSTOMER_FILTERS 초기화 완료:', CUSTOMER_FILTERS);
  
  // EFFECTIVE_FILTERS 재구성
  buildEffectiveFilters();
  console.log('🔧 buildEffectiveFilters 호출 완료');
  
  // 필터 적용
  applyAllFilters();
  console.log('🔧 applyAllFilters 호출 완료');
  
  // 매물리스트 타이틀 원래대로 복원
  const listingTitle = document.querySelector(".listing-title");
  if (listingTitle) {
    listingTitle.style.cursor = "default";
    listingTitle.style.color = "";
    listingTitle.style.textDecoration = "";
    listingTitle.onclick = null;
  }
  
  // 고객 선택 시 버튼들 숨기기
  const modeButtons = document.querySelector('.listing-mode-buttons');
  if (modeButtons) {
    modeButtons.classList.add('hidden');
  }
  
  // UI 상태 초기화
  UI_STATE.currentCustomerId = null;
  
  // 1차 사이드바의 고객정보 패널 닫기 (올바른 ID 사용)
  const selectedCustomerInfo = document.getElementById('selectedCustomerInfo');
  if (selectedCustomerInfo) {
    selectedCustomerInfo.classList.add('hidden');
    console.log('🔧 1차 사이드바 고객정보 패널 닫기 완료');
  }
  
  // 고객 목록 컨테이너도 닫기
  const customerListContainer = document.getElementById('customerListContainer');
  if (customerListContainer) {
    customerListContainer.classList.add('hidden');
    console.log('🔧 고객 목록 컨테이너 닫기 완료');
  }
  
  // 2차 사이드바도 닫기
  const secondaryPanel = document.getElementById('secondaryPanel');
  if (secondaryPanel) {
    secondaryPanel.classList.add('hidden');
    secondaryPanel.classList.remove('visible');
    console.log('🔧 2차 사이드바 닫기 완료');
  }
  
  showToast('고객 필터가 해제되었습니다.', 'info');
}

// 고객의 저장된 필터데이터로 매물 필터링 적용
function applyCustomerFilter(customer) {
  console.log('applyCustomerFilter 호출:', customer);
  
  // 현재 선택된 고객 저장
  window.selectedCustomer = customer;
  
  // 브리핑 상태 로드
  loadBriefingStates(customer.id);
  
  // 매물리스트 타이틀을 버튼으로 변경
  const listingTitle = document.querySelector(".listing-title");
  if (listingTitle) {
    listingTitle.style.cursor = "pointer";
    listingTitle.style.color = "#007bff";
    listingTitle.style.textDecoration = "underline";
    listingTitle.onclick = () => {
      UI_STATE.isBriefingListMode = false;
      applyAllFilters();
    };
  }
  
  // 고객 선택 시 버튼들 표시
  const modeButtons = document.querySelector('.listing-mode-buttons');
  if (modeButtons) {
    modeButtons.classList.remove('hidden');
    console.log('버튼들 표시됨:', modeButtons.className);
  } else {
    console.log('버튼 요소를 찾을 수 없음');
  }
  
  // 고객 선택 시 매물리스트 모드로 기본 설정
  switchToListingMode('property');
  
  // 현재 고객 ID 저장
  UI_STATE.currentCustomerId = customer.id;
  
  try {
    // 지역명 정규화 함수 (서버의 normalize_region 함수와 동일한 로직)
    function normalizeRegion(region) {
      if (!region) return region;
      
      region = region.trim();
      
      // "구 전체", "구 전부" 패턴 처리
      if (region.includes("구 전체") || region.includes("구 전부")) {
        return region.split("구")[0] + "구";
      }
      
      // "구전체", "구전부" 패턴 처리 (공백 없는 경우)
      if (region.includes("구전체") || region.includes("구전부")) {
        return region.split("구전체")[0] + "구";
      }
      
      // "시 전체", "시 전부" 패턴 처리
      if (region.includes("시 전체") || region.includes("시 전부")) {
        return region.split("시")[0] + "시";
      }
      
      // "시전체", "시전부" 패턴 처리 (공백 없는 경우)
      if (region.includes("시전체") || region.includes("시전부")) {
        return region.split("시전체")[0] + "시";
      }
      
      return region;
    }
    
    // 고객의 저장된 필터데이터 파싱
    let filterData = {};
    if (customer.filter_data) {
      filterData = JSON.parse(customer.filter_data);
    } else {
      // 기존 방식 호환성 (filter_data가 없는 경우)
      filterData = {
        region: customer.regions || '',
        floor: customer.floor || '',
        area_real: customer.area || '',
        deposit: customer.deposit || '',
        rent: customer.rent || '',
        premium: customer.premium || ''
      };
    }
    
    // 공란으로 입력된 필드는 필터에서 제외 (빈 문자열, null, undefined 처리)
    Object.keys(filterData).forEach(key => {
      if (filterData[key] === '' || filterData[key] === null || filterData[key] === undefined) {
        delete filterData[key];
      }
    });

    // CUSTOMER_FILTERS 초기화
    Object.keys(CUSTOMER_FILTERS).forEach(k => delete CUSTOMER_FILTERS[k]);
    
    // 고객 필터에만 사용할 필드들 (필요한 필드만)
    const customerFilterKeys = ['region', 'region2', 'floor', 'area_real', 'deposit', 'rent', 'premium'];
    
    // 빈 값이 아닌 필드만 필터에 추가 (지역명 정규화 포함, notes 제외)
    Object.keys(filterData).forEach(key => {
      if (customerFilterKeys.includes(key) && filterData[key] && filterData[key].toString().trim() !== '') {
        let value = filterData[key].toString().trim();
        
        // region 필드인 경우 정규화 및 다중 지역 처리
        if (key === 'region') {
          // 쉼표로 구분된 여러 지역 처리
          const regions = value.split(',').map(r => r.trim()).filter(r => r);
          const regionList = [];
          const region2List = [];
          
          regions.forEach(region => {
            const normalizedRegion = normalizeRegion(region);
            
            // 시군구 단위인지 확인 (구, 시로 끝나는 경우)
            if (normalizedRegion.includes('구') || normalizedRegion.includes('시')) {
              region2List.push(normalizedRegion);
            } else {
              regionList.push(normalizedRegion);
            }
          });
          
          // 결과 설정
          if (regionList.length > 0) {
            CUSTOMER_FILTERS['region'] = regionList.join(',');
            console.log('읍면동리 단위 지역을 region에 설정:', regionList.join(','));
          }
          if (region2List.length > 0) {
            CUSTOMER_FILTERS['region2'] = region2List.join(',');
            console.log('시군구 단위 지역을 region2에 설정:', region2List.join(','));
          }
        } else {
          // floor 필드 특별 처리 (지역명이 잘못 들어간 경우 처리)
          if (key === 'floor') {
            // 지역명 패턴인지 확인 (구, 시로 끝나는 경우)
            if (value.includes('구') || value.includes('시')) {
              // 지역명이 잘못 들어간 경우 region2로 이동
              const normalizedRegion = normalizeRegion(value);
              CUSTOMER_FILTERS['region2'] = normalizedRegion;
              console.log('floor 필드에 지역명이 들어있어 region2로 이동:', value);
            } else {
              // 숫자나 층수 정보인 경우 그대로 사용
              CUSTOMER_FILTERS[key] = value;
            }
          }
          // 면적 필드 특별 처리 (단일값은 이상 검색, 범위는 그대로)
          else if (key === 'area_real') {
            if (value.includes('-')) {
              // 범위가 지정된 경우 그대로 사용
              CUSTOMER_FILTERS[key] = value;
            } else {
              // 단일값인 경우 이상 검색으로 처리
              const numValue = parseFloat(value);
              if (!isNaN(numValue) && numValue > 0) {
                CUSTOMER_FILTERS[key] = `${numValue}-`;
              } else {
                CUSTOMER_FILTERS[key] = value;
              }
            }
          }
          // 보증금, 월세, 권리금은 범위로 처리 (0 ~ 입력값)
          else if (key === 'deposit' || key === 'rent' || key === 'premium') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue > 0) {
              CUSTOMER_FILTERS[key] = `0-${numValue}`;
            } else {
              CUSTOMER_FILTERS[key] = value;
            }
          } else {
            CUSTOMER_FILTERS[key] = value;
          }
        }
      }
    });

    // 디버깅을 위한 로그 추가
    console.log('고객 필터 적용:', {
      customerName: customer.name,
      originalFilterData: filterData,
      normalizedFilters: CUSTOMER_FILTERS
    });
    
    // 필터 적용
    applyAllFilters();
    
    // 2차 사이드바 닫기
    const secondaryPanel = document.getElementById('secondaryPanel');
    if (secondaryPanel) {
      secondaryPanel.classList.add('hidden');
      secondaryPanel.classList.remove('visible');
    }
    
    // ${customer.name} 고객의 필터가 적용되었습니다.
    
  } catch (error) {
    console.error('고객 필터 적용 중 오류:', error);
    alert('필터 적용 중 오류가 발생했습니다.');
  }
}

// 고객 관리 UI 관련 함수들을 전역으로 export
window.loadCustomerList = loadCustomerList;
window.renderCustomerList = renderCustomerList;
window.renderFilteredCustomerList = renderFilteredCustomerList;
window.renderCustomerListItems = renderCustomerListItems;
window.showCustomerContextMenu = showCustomerContextMenu;
window.getCustomerById = getCustomerById;
window.clearCustomerSelection = clearCustomerSelection;
window.clearCustomerFilter = clearCustomerFilter;
window.applyCustomerFilter = applyCustomerFilter; 