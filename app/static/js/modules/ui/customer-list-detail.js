/* -----------------------------------------
 * customer-list-detail.js - 고객 목록+상세 관련 함수들
 * ----------------------------------------- */

/**************************************
 * ===== 고객 목록+상세 관련 함수들 =====
 **************************************/

// 고객 목록+상세 렌더링
async function renderCustomerListAndDetail(selectedIdx = null) {
  dbg('renderCustomerListAndDetail 호출됨, currentUser:', currentUser);
  
  // 2차 사이드바의 customerListContent 요소를 찾기
  let customerListContent = document.getElementById('customerListContent2');
  if (!customerListContent) {
    // 대안으로 다른 ID 시도
    customerListContent = document.getElementById('customerListContent');
  }
  if (!customerListContent) {
    // viewCustomerList 내부에서 찾기
    const viewCustomerList = document.getElementById('viewCustomerList');
    if (viewCustomerList) {
      customerListContent = viewCustomerList.querySelector('.customer-list-content') || viewCustomerList;
    }
  }
  
  dbg('customerListContent 요소:', customerListContent);
  
  if (!customerListContent) {
    console.error('고객 목록을 표시할 요소를 찾을 수 없습니다!');
    return;
  }
  
  customerListContent.innerHTML = '<div style="padding:12px; color:#888;">고객 목록을 불러오는 중...</div>';
  let url = '/api/customers?filter=own';
  dbg('API 호출 URL:', url);
  const res = await fetch(url, { headers: { 'X-User': currentUser } });
  dbg('API 응답 상태:', res.status);
  if (!res.ok) {
    customerListContent.innerHTML = '<div style="padding:12px; color:#e00;">고객 목록을 불러올 수 없습니다.</div>';
    return;
  }
  const data = await res.json();
  dbg('API 응답 데이터:', data);
  const items = data.items || [];
  dbg('고객 목록 아이템 수:', items.length);
  
  // 고객 데이터를 전역 변수에 저장 (수정/삭제 기능용)
  window.currentCustomerData = items;
  
  if (items.length === 0) {
    customerListContent.innerHTML = '<div style="padding:12px; color:#888;">등록된 고객이 없습니다.</div>';
    return;
  }
  
  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.margin = '0';
  ul.style.padding = '0';
  
  items.forEach((c, idx) => {
    dbg('고객 데이터:', c);
    const li = document.createElement('li');
    
    // 고객 정보를 구조화된 형식으로 표시 (실제 저장 데이터 필드명 사용)
    const displayName = c.name || '';
    const displayManager = c.manager || '';
    const displayPhone = c.phone || '';
    const displayRegions = c.regions || '';
    const displayFloor = c.floor || '';
    const displayArea = c.area || '';
    const displayDeposit = c.deposit || '';
    const displayRent = c.rent || '';
    const displayPremium = c.premium || '';
    const displayNote = c.notes || '';
    
    // 구조화된 HTML 형식으로 고객 정보 표시
    li.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid #ddd; cursor: pointer; background: ${selectedIdx === idx ? '#f0f8ff' : 'white'};">
        <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #333;">고객명: ${displayName}</span>
          <span style="color: #666;">담당: ${displayManager}</span>
        </div>
        <div style="margin-bottom: 8px; color: #555;">
          연락처: ${displayPhone}
        </div>
        <div style="margin-bottom: 8px; color: #555;">
          ${displayRegions} ${displayFloor}층 ${displayArea}평
        </div>
        <div style="margin-bottom: 8px; color: #555;">
          ${displayDeposit} / ${displayRent} / ${displayPremium}
        </div>
        <div style="margin-bottom: 8px; color: #666; font-size: 13px;">
          참고사항: ${displayNote}
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
          <button onclick="editCustomer('${c.id}')" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">수정</button>
          <button onclick="deleteCustomer('${c.id}')" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">삭제</button>
        </div>
      </div>
    `;
    
    li.addEventListener('click', (e) => {
      // 버튼 클릭이 아닌 경우에만 고객 선택
      if (!e.target.matches('button')) {
        // 고객의 filter를 전역 CUSTOMER_FILTERS에 할당
        if (c.filter) {
          Object.keys(CUSTOMER_FILTERS).forEach(k => delete CUSTOMER_FILTERS[k]);
          Object.assign(CUSTOMER_FILTERS, c.filter);
          applyAllFilters();
        }
        renderCustomerListAndDetail(idx);
      }
    });
    ul.appendChild(li);
  });
  
  // 기존 내용 완전 제거
  customerListContent.innerHTML = '';
  
  // appendChild 방식으로 추가
  try {
    customerListContent.appendChild(ul);
    dbg('고객 목록 렌더링 완료');
  } catch (error) {
    console.error('고객 목록 렌더링 실패:', error);
  }
}

// 고객 저장 후 목록 갱신 (submitCustomerForm 내부에서 호출 필요)
window.afterCustomerSaved = function() {
  hideAllSecondaryViews();
  showSecondaryPanel('viewCustomerList');
  const detailTitleEl = document.getElementById('secondaryPanelTitle');
  if (detailTitleEl) detailTitleEl.textContent = '내 고객 목록';
  loadCustomerList(currentUser === 'admin' ? 'all' : 'own');
};

// 고객 목록+상세 관련 함수들을 전역으로 export
window.renderCustomerListAndDetail = renderCustomerListAndDetail;
window.afterCustomerSaved = window.afterCustomerSaved; 