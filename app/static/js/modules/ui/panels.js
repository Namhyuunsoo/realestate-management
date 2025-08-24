/* -----------------------------------------
 * panels.js - 패널 관리 UI
 * ----------------------------------------- */

/**************************************
 * ===== 패널 관리 UI =====
 **************************************/

function showCustomerDetail(c) {
  // 2차 사이드바에 고객 상세정보 표시
  const detailTitleEl = document.getElementById('secondaryPanelTitle');
  
  if (detailTitleEl) {
    detailTitleEl.textContent = '고객 상세정보';
  }
  
  // 현재 선택된 고객 저장
  window.selectedCustomer = c;
  
  // 브리핑 상태 로드
  loadBriefingStates(c.id);
  
  // 현재 고객 ID 저장
  UI_STATE.currentCustomerId = c.id;
  
  // 고객 상세정보 화면 표시
  showSecondaryPanel('viewCustomerDetail');
  
  // 고객 상세정보 렌더링
  renderCustomerDetail(c);
}

// 고객 상세정보 렌더링 함수
function renderCustomerDetail(c) {
  console.log('renderCustomerDetail 호출됨:', c);
  
  const customerDetailContent = document.getElementById('customerDetailContent');
  
  console.log('customerDetailContent 요소:', customerDetailContent);
  
  if (!customerDetailContent) {
    console.error('고객 상세정보 컨테이너를 찾을 수 없습니다.');
    return;
  }
  
  console.log('HTML 렌더링 시작');
  customerDetailContent.innerHTML = `
    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px; margin-bottom: 8px;">
      <div class="detail-row" style="margin-bottom: 6px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">담당자</label>
        <div style="padding: 4px 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333;">${escapeHtml(c.manager || '담당자 없음')}</div>
      </div>
      
      <div class="detail-row" style="margin-bottom: 6px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">고객명</label>
        <div style="padding: 4px 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333;">${escapeHtml(c.name || '이름 없음')}</div>
      </div>
      
      <div class="detail-row" style="margin-bottom: 6px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">연락처</label>
        <div style="padding: 4px 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333;">${escapeHtml(c.phone || '연락처 없음')}</div>
      </div>
      
      <div class="detail-row" style="margin-bottom: 6px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">희망지역</label>
        <div style="padding: 4px 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333;">${escapeHtml(c.regions || '희망지역 없음')}</div>
      </div>
      
             <div class="detail-row" style="margin-bottom: 6px;">
         <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">희망층수</label>
         <div style="padding: 4px 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333;">${escapeHtml(c.floor_pref || c.floor || '희망층수 없음')}</div>
       </div>
       
       <div class="detail-row" style="margin-bottom: 6px;">
         <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">희망면적</label>
         <div style="padding: 4px 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333;">${escapeHtml(c.area_pref || c.area || '희망면적 없음')}</div>
       </div>
       
       <div class="detail-row" style="margin-bottom: 6px;">
         <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">희망보증금</label>
         <div style="padding: 4px 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333;">${escapeHtml(c.deposit_pref || c.deposit || '희망보증금 없음')}</div>
       </div>
       
       <div class="detail-row" style="margin-bottom: 6px;">
         <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">희망월세</label>
         <div style="padding: 4px 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333;">${escapeHtml(c.rent_pref || c.rent || '희망월세 없음')}</div>
       </div>
       
       <div class="detail-row" style="margin-bottom: 6px;">
         <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">희망권리금</label>
         <div style="padding: 4px 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333;">${escapeHtml(c.premium_pref || c.premium || '희망권리금 없음')}</div>
       </div>
       
       <div class="detail-row" style="margin-bottom: 6px;">
         <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">참고사항</label>
         <div style="padding: 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333; min-height: 60px; white-space: pre-wrap; line-height: 1.4;">${escapeHtml(c.notes || c.note || '참고사항 없음')}</div>
       </div>
      
      <div class="detail-row" style="margin-bottom: 6px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 2px; font-size: 12px;">상태</label>
        <div style="padding: 4px 6px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #333;">${escapeHtml(c.status || '생')}</div>
      </div>
    </div>
    
    <div class="detail-actions" style="display: flex; justify-content: space-between; gap: 8px; margin-top: 8px;">
      <div style="display: flex; gap: 4px;">
        <button id="selectCustomerBtn" class="btn" style="padding: 8px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">선택</button>
        <button id="backToListBtn" class="btn" style="padding: 8px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">이전화면</button>
      </div>
      <div style="display: flex; gap: 4px;">
        <button id="editCustomerDetailBtn" class="btn" style="padding: 8px 12px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">수정</button>
        <button id="deleteCustomerDetailBtn" class="btn" style="padding: 8px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">삭제</button>
      </div>
    </div>
  `;
  
  console.log('HTML 렌더링 완료');
  
  // 버튼 이벤트 리스너 추가
  const selectBtn = document.getElementById('selectCustomerBtn');
  const backBtn = document.getElementById('backToListBtn');
  const editBtn = document.getElementById('editCustomerDetailBtn');
  const deleteBtn = document.getElementById('deleteCustomerDetailBtn');
  
  if (selectBtn) selectBtn.addEventListener('click', () => {
    // 1차사이드바에 고객정보 입력
    console.log('선택 버튼 클릭:', c);
    
    // 1차사이드바에 고객정보 표시
    const selectedCustomerInfo = document.getElementById("selectedCustomerInfo");
    const customerInfoContent = document.getElementById("customerInfoContent");
    const customerListContainer = document.getElementById("customerListContainer");
    
    if (selectedCustomerInfo && customerInfoContent) {
      // 고객 목록 숨기고 고객 정보 표시
      if (customerListContainer) customerListContainer.classList.add("hidden");
      selectedCustomerInfo.classList.remove("hidden");
      
      // 현재 선택된 고객 저장
      window.selectedCustomer = c;
      
      // 고객정보 내용 렌더링
      customerInfoContent.innerHTML = `
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="font-weight: bold; color: #333; font-size: 14px;">${escapeHtml(c.name || '이름 없음')}</div>
            <div style="color: #666; font-size: 11px;">👤 ${escapeHtml(c.manager || '담당자 없음')}</div>
          </div>
          <div style="color: #666; font-size: 12px; margin-bottom: 3px;">📞 ${escapeHtml(c.phone || '연락처 없음')}</div>
                     <div style="color: #666; font-size: 11px; line-height: 1.2; margin-bottom: 3px;">
             ${(() => {
               const summary = [];
               if (c.regions) summary.push(`📍 ${c.regions}`);
               if (c.floor_pref || c.floor) summary.push(`🏢 ${c.floor_pref || c.floor}층`);
               if (c.area_pref || c.area) summary.push(`📐 ${c.area_pref || c.area}평`);
               if (c.deposit_pref || c.deposit) summary.push(`💰 보:${c.deposit_pref || c.deposit}`);
               if (c.rent_pref || c.rent) summary.push(`💵 월:${c.rent_pref || c.rent}`);
               if (c.premium_pref || c.premium) summary.push(`🔑 권:${c.premium_pref || c.premium}`);
               return summary.length > 0 ? summary.join(' | ') : '희망 조건 없음';
             })()}
           </div>
          ${c.notes && c.notes.trim() ? `<div style="color: #888; font-size: 10px; line-height: 1.1; font-style: italic;">📝 ${escapeHtml(c.notes.trim())}</div>` : ''}
        </div>
        
        <div class="detail-actions" style="display: flex; gap: 4px; margin-bottom: 12px;">
          <button id="applyCustomerFilterBtn" class="btn" style="flex: 1; padding: 4px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">선택</button>
          <button id="editCustomerBtn" class="btn" style="flex: 1; padding: 4px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">수정</button>
          <button id="deleteCustomerBtn" class="btn" style="flex: 1; padding: 4px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">삭제</button>
          <button id="clearCustomerSelectionBtn" class="btn" style="flex: 1; padding: 4px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">초기화</button>
        </div>
      `;
      
      // 버튼 이벤트 리스너 추가
      const applyFilterBtn = document.getElementById('applyCustomerFilterBtn');
      const editBtn = document.getElementById('editCustomerBtn');
      const deleteBtn = document.getElementById('deleteCustomerBtn');
      const clearBtn = document.getElementById('clearCustomerSelectionBtn');
      
      if (applyFilterBtn) applyFilterBtn.addEventListener('click', () => applyCustomerFilter(c));
      if (editBtn) editBtn.addEventListener('click', () => window.editCustomerById(c.id));
      if (deleteBtn) deleteBtn.addEventListener('click', () => {
        if (confirm('정말로 이 고객을 삭제하시겠습니까?')) {
          window.deleteCustomerById(c.id);
        }
      });
      if (clearBtn) clearBtn.addEventListener('click', clearCustomerSelection);
    }
    
    // 2차사이드바 닫기
    const secondaryPanel = document.getElementById('secondaryPanel');
    if (secondaryPanel) {
      secondaryPanel.classList.add('hidden');
      secondaryPanel.classList.remove('visible');
    }
  });
  
  if (backBtn) backBtn.addEventListener('click', () => {
    // 고객목록으로 돌아가기
    showSecondaryPanel('viewCustomerList');
    const detailTitleEl = document.getElementById('secondaryPanelTitle');
    if (detailTitleEl) detailTitleEl.textContent = currentUser === 'admin' ? '고객 목록' : '내 고객 목록';
  });
  
  if (editBtn) editBtn.addEventListener('click', () => {
    // 수정 화면으로 이동
    console.log('수정 버튼 클릭:', c);
    
    // 현재 선택된 고객 저장 (취소 버튼용)
    window.selectedCustomer = c;
    
    // 수정 전용 패널 열기
    showSecondaryPanel('viewCustomerEdit');
    renderCustomerEditForm(c);
    
    // 제목 변경
    const detailTitleEl = document.getElementById("secondaryPanelTitle");
    if (detailTitleEl) {
      detailTitleEl.textContent = "고객 정보 수정";
    }
  });
  
  if (deleteBtn) deleteBtn.addEventListener('click', () => {
    // 삭제 확인 후 실행
    if (confirm('정말로 이 고객을 삭제하시겠습니까?')) {
      window.deleteCustomerById(c.id).then(() => {
        // 삭제 완료 후 상세정보창 닫고 고객목록으로 돌아가기
        showSecondaryPanel('viewCustomerList');
        const detailTitleEl = document.getElementById('secondaryPanelTitle');
        if (detailTitleEl) detailTitleEl.textContent = currentUser === 'admin' ? '고객 목록' : '내 고객 목록';
      });
    }
  });
}

function renderCustomerForm(c = {}) {
  showSecondaryPanel('viewCustomerForm');

  const detailTitleEl = document.getElementById("secondaryPanelTitle");
  const viewCustomerForm = document.getElementById("viewCustomerForm");
  
  if (!detailTitleEl || !viewCustomerForm) return;

  detailTitleEl.textContent = c.id ? "고객 정보 수정" : "고객 신규등록";

  viewCustomerForm.innerHTML = `
    <div style="background: #f8f9fa; padding: 8px; border-radius: 8px; margin-bottom: 10px;">
      <div style="font-size: 14px; font-weight: bold; color: #333;">${c.id ? '고객 정보 수정' : '새 고객 등록'}</div>
      <div style="color: #666; font-size: 12px; margin-top: 2px;">고객 정보를 입력해주세요</div>
    </div>
    
    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px;">
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">담당자 *</label>
        <input class="form-control" id="frmManager" 
               value="${escapeHtml(c.manager || '')}" 
               placeholder="담당자명을 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">고객명 *</label>
        <input class="form-control" id="frmName" 
               value="${escapeHtml(c.name || '')}"
               placeholder="고객명을 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">연락처 *</label>
        <input class="form-control" id="frmPhone" 
               value="${escapeHtml(c.phone || '')}" 
               placeholder="연락처를 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망지역</label>
        <input class="form-control" id="frmRegions" 
               value="${escapeHtml(c.regions || '')}" 
               placeholder="희망지역을 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망층수</label>
        <input class="form-control" id="frmFloor" 
               value="${escapeHtml(c.floor_pref || '')}" 
               placeholder="희망층수를 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망면적</label>
        <input class="form-control" id="frmArea" 
               value="${escapeHtml(c.area_pref || '')}" 
               placeholder="예: 20 (20평 이상) 또는 10-20 (10~20평 범위)"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망보증금</label>
        <input class="form-control" id="frmDeposit" 
               value="${escapeHtml(c.deposit_pref || '')}"
               placeholder="희망보증금을 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망월세</label>
        <input class="form-control" id="frmRent" 
               value="${escapeHtml(c.rent_pref || '')}"
               placeholder="희망월세를 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망권리금</label>
        <input class="form-control" id="frmPremium" 
               value="${escapeHtml(c.premium_pref || '')}"
               placeholder="희망권리금을 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">참고사항</label>
        <textarea class="form-control" id="frmNotes" 
                  placeholder="참고사항을 입력하세요"
                  style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px; min-height: 80px; resize: vertical;">${escapeHtml(c.notes || '')}</textarea>
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">상태</label>
        <select class="form-control" id="frmStatus" 
                style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
          <option value="생" ${c.status === '생' ? 'selected' : ''}>생성</option>
          <option value="완" ${c.status === '완' ? 'selected' : ''}>완료</option>
          <option value="보류" ${c.status === '보류' ? 'selected' : ''}>보류</option>
          <option value="포기" ${c.status === '포기' ? 'selected' : ''}>포기</option>
        </select>
      </div>
    </div>
    
    <div class="detail-actions" style="display: flex; justify-content: space-between; gap: 8px; margin-top: 12px;">
      <div style="display: flex; gap: 4px;">
        <button id="submitCustomerFormBtn" class="btn" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">${c.id ? '수정' : '등록'}</button>
        <button id="cancelCustomerFormBtn" class="btn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">취소</button>
      </div>
    </div>
  `;
  
  // 버튼 이벤트 리스너 추가
  const submitBtn = document.getElementById('submitCustomerFormBtn');
  const cancelBtn = document.getElementById('cancelCustomerFormBtn');
  
  if (submitBtn) submitBtn.addEventListener('click', () => {
    if (c.id) {
      submitCustomerEditForm(c.id);
    } else {
      submitCustomerForm();
    }
  });
  
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    // 고객목록으로 돌아가기
    showSecondaryPanel('viewCustomerList');
    const detailTitleEl = document.getElementById('secondaryPanelTitle');
    if (detailTitleEl) detailTitleEl.textContent = currentUser === 'admin' ? '고객 목록' : '내 고객 목록';
  });
}

function renderCustomerEditForm(c = {}) {
  showSecondaryPanel('viewCustomerEdit');

  const detailTitleEl = document.getElementById("secondaryPanelTitle");
  const viewCustomerEdit = document.getElementById("viewCustomerEdit");
  
  if (!detailTitleEl || !viewCustomerEdit) return;

  detailTitleEl.textContent = "고객 정보 수정";
  
  // 디버깅: 고객 데이터 확인
  console.log('🔍 renderCustomerEditForm - 고객 데이터:', c);
  console.log('🔍 floor 관련:', c.floor, c.floor_pref);
  console.log('🔍 area 관련:', c.area, c.area_pref);
  console.log('🔍 deposit 관련:', c.deposit, c.deposit_pref);
  console.log('🔍 rent 관련:', c.rent, c.rent_pref);
  console.log('🔍 premium 관련:', c.premium, c.premium_pref);
  console.log('🔍 note 관련:', c.note, c.notes);

  viewCustomerEdit.innerHTML = `
    <div style="background: #f8f9fa; padding: 8px; border-radius: 8px; margin-bottom: 10px;">
      <div style="font-size: 14px; font-weight: bold; color: #333;">고객 정보 수정</div>
      <div style="color: #666; font-size: 12px; margin-top: 2px;">고객 정보를 수정해주세요</div>
    </div>
    
    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px;">
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">담당자 *</label>
        <input class="form-control" id="editManager" 
               value="${escapeHtml(c.manager || '')}" 
               placeholder="담당자명을 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">고객명 *</label>
        <input class="form-control" id="editName" 
               value="${escapeHtml(c.name || '')}"
               placeholder="고객명을 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">연락처 *</label>
        <input class="form-control" id="editPhone" 
               value="${escapeHtml(c.phone || '')}" 
               placeholder="연락처를 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망지역</label>
        <input class="form-control" id="editRegions" 
               value="${escapeHtml(c.regions || '')}" 
               placeholder="희망지역을 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망층수</label>
        <input class="form-control" id="editFloor" 
               value="${escapeHtml(c.floor_pref || c.floor || '')}" 
               placeholder="희망층수를 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망면적</label>
        <input class="form-control" id="editArea" 
               value="${escapeHtml(c.area_pref || c.area || '')}" 
               placeholder="예: 20 (20평 이상) 또는 10-20 (10~20평 범위)"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망보증금</label>
        <input class="form-control" id="editDeposit" 
               value="${escapeHtml(c.deposit_pref || c.deposit || '')}"
               placeholder="희망보증금을 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망월세</label>
        <input class="form-control" id="editRent" 
               value="${escapeHtml(c.rent_pref || c.rent || '')}"
               placeholder="희망월세를 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">희망권리금</label>
        <input class="form-control" id="editPremium" 
               value="${escapeHtml(c.premium_pref || c.premium || '')}"
               placeholder="희망권리금을 입력하세요"
               style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">참고사항</label>
        <textarea class="form-control" id="editNotes" 
                  placeholder="참고사항을 입력하세요"
                  style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px; min-height: 80px; resize: vertical;">${escapeHtml(c.notes || c.note || '')}</textarea>
      </div>
      
      <div class="detail-row" style="margin-bottom: 8px;">
        <label style="display: block; font-weight: 600; color: #333; margin-bottom: 3px; font-size: 12px;">상태</label>
        <select class="form-control" id="editStatus" 
                style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-left: -8px;">
          <option value="생" ${c.status === '생' ? 'selected' : ''}>생성</option>
          <option value="완" ${c.status === '완' ? 'selected' : ''}>완료</option>
          <option value="보류" ${c.status === '보류' ? 'selected' : ''}>보류</option>
          <option value="포기" ${c.status === '포기' ? 'selected' : ''}>포기</option>
        </select>
      </div>
    </div>
    
    <div class="detail-actions" style="display: flex; justify-content: space-between; gap: 8px; margin-top: 12px;">
      <div style="display: flex; gap: 4px;">
        <button id="submitCustomerEditFormBtn" class="btn" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">수정</button>
        <button id="cancelCustomerEditFormBtn" class="btn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">취소</button>
      </div>
    </div>
  `;
  
  // 버튼 이벤트 리스너 추가
  const submitBtn = document.getElementById('submitCustomerEditFormBtn');
  const cancelBtn = document.getElementById('cancelCustomerEditFormBtn');
  
  if (submitBtn) submitBtn.addEventListener('click', () => {
    submitCustomerEditForm(c.id);
  });
  
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    // 고객 상세정보로 돌아가기
    showCustomerDetail(c);
  });
}

// 패널 관리 UI 관련 함수들을 전역으로 export
window.showCustomerDetail = showCustomerDetail;
window.renderCustomerDetail = renderCustomerDetail;
window.renderCustomerForm = renderCustomerForm;
window.renderCustomerEditForm = renderCustomerEditForm; 