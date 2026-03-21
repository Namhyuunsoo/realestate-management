// app/static/js/modules/ui/mobile-buttons.js
// 모바일 전용 버튼들 추가

async function addMobileButtons() {
  // 모바일 디바이스인지 확인
  function isMobileDevice() {
    const ua = navigator.userAgent;
    const isMobileOS = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isMobileBrowser = ua.includes('Mobile') || ua.includes('NAVER(inapp');
    return isMobileOS || isMobileBrowser;
  }

  // 모바일이 아니면 실행하지 않음
  if (!isMobileDevice()) {
    return;
  }

  // 상태카운트바 찾기
  const statusCounts = document.getElementById('statusCounts');
  if (!statusCounts) {
    return;
  }

  // 기존 매물등록 버튼 찾기
  const existingAddBtn = statusCounts.querySelector('.btn-add-listing');
  if (!existingAddBtn) {
    return;
  }

  // 모든 버튼을 담을 새로운 컨테이너 생성
  const allButtonsContainer = document.createElement('div');
  allButtonsContainer.className = 'all-buttons-container';
  allButtonsContainer.style.cssText = `
    display: flex;
    gap: 4px;
    width: 100%;
    align-items: stretch;
  `;

  // 매물등록 버튼 스타일 수정
  existingAddBtn.style.cssText = `
    flex: 1;
    padding: 8px 4px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    border: none;
    box-sizing: border-box;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    background: #007bff;
    color: white;
    margin: 0;
  `;

  // 매물LIST 버튼
  const propertyListBtn = document.createElement('button');
  propertyListBtn.className = 'btn-property-list';
  propertyListBtn.textContent = '매물LIST';
  propertyListBtn.style.cssText = `
    flex: 1;
    padding: 8px 4px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    border: none;
    box-sizing: border-box;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    background: #28a745;
    color: white;
  `;
  // 모바일 전용 매물리스트 버튼 이벤트
  propertyListBtn.addEventListener('click', async function () {
    // 중복 클릭 방지
    if (this.disabled) {
      return;
    }
    this.disabled = true;

    try {
      // 🔥 토글 기능: 이미 열려있으면 닫기 (openModal 내부에서 처리됨)
      if (window.listingListModalManager) {
        await window.listingListModalManager.openModal('toggle');
      } else {
        console.error('❌ listingListModalManager를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('❌ 매물리스트 모달 열기/닫기 실패:', error);
    } finally {
      // 버튼 활성화 복원 (1초 후)
      setTimeout(() => {
        this.disabled = false;
      }, 1000);
    }
  });

  // 고객LIST 버튼
  const customerListBtn = document.createElement('button');
  customerListBtn.className = 'btn-customer-list';
  customerListBtn.textContent = '고객LIST';
  customerListBtn.style.cssText = `
    flex: 1;
    padding: 8px 4px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    border: none;
    box-sizing: border-box;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    background: #ffc107;
    color: black;
  `;
  customerListBtn.addEventListener('click', async function () {
    // 중복 클릭 방지
    if (this.disabled) {
      return;
    }
    this.disabled = true;

    try {
      // 🔥 토글 기능: 이미 열려있으면 닫기 (openModal 내부에서 처리됨)
      if (window.customerListModalManager) {
        await window.customerListModalManager.openModal('toggle');
      } else {
        console.error('❌ customerListModalManager를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('❌ 고객리스트 모달 열기/닫기 실패:', error);
    } finally {
      // 버튼 활성화 복원 (1초 후)
      setTimeout(() => {
        this.disabled = false;
      }, 1000);
    }
  });

  // 고객등록 버튼
  const customerAddBtn = document.createElement('button');
  customerAddBtn.className = 'btn-customer-add';
  customerAddBtn.textContent = '고객등록';
  customerAddBtn.style.cssText = `
    flex: 1;
    padding: 8px 4px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    border: none;
    box-sizing: border-box;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    background: #dc3545;
    color: white;
  `;
  customerAddBtn.addEventListener('click', function () {
    // 🔥 토글 기능: 이미 열려있으면 닫기 (openModal 내부에서 처리됨)
    if (window.customerAddManager) {
      window.customerAddManager.openModal();
    } else {
      console.error('❌ customerAddManager를 찾을 수 없습니다.');
    }
  });

  // 모든 버튼을 컨테이너에 추가
  allButtonsContainer.appendChild(existingAddBtn);
  allButtonsContainer.appendChild(propertyListBtn);
  allButtonsContainer.appendChild(customerListBtn);
  allButtonsContainer.appendChild(customerAddBtn);

  // 필터 버튼과 필터 요약을 담을 첫 번째 행 컨테이너 생성
  const filterRowContainer = document.createElement('div');
  filterRowContainer.className = 'filter-row-container';
  filterRowContainer.style.cssText = `
    display: flex;
    gap: 4px;
    width: 100%;
    align-items: stretch;
    margin-bottom: 4px;
  `;

  // 필터 버튼 생성
  const filterBtn = document.createElement('button');
  filterBtn.id = 'mobileFilterBtn';
  filterBtn.className = 'btn-filter';
  filterBtn.textContent = '🔍 필터';
  filterBtn.style.cssText = `
    flex: 0 0 25%;
    padding: 8px 4px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    border: none;
    box-sizing: border-box;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    background: #6c757d;
    color: white;
  `;
  filterBtn.addEventListener('click', function () {
    if (window.openFilterModal) {
      window.openFilterModal();
    } else {
      console.error('❌ openFilterModal 함수를 찾을 수 없습니다.');
    }
  });

  // 필터 요약 표시 영역 생성
  const filterSummaryEl = document.createElement('div');
  filterSummaryEl.id = 'mobileFilterSummary';
  filterSummaryEl.className = 'filter-summary';
  filterSummaryEl.style.cssText = `
    flex: 1;
    padding: 8px 4px;
    font-size: 10px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    background: #f8f9fa;
    border-radius: 4px;
  `;
  filterSummaryEl.textContent = '';

  // 필터 행 컨테이너에 필터 버튼과 요약 추가
  filterRowContainer.appendChild(filterBtn);
  filterRowContainer.appendChild(filterSummaryEl);

  // 기존 count-info를 새로운 컨테이너로 교체
  const countInfo = statusCounts.querySelector('.count-info');
  if (countInfo) {
    countInfo.innerHTML = '';
    countInfo.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 0;
      width: 100%;
      padding: 8px 16px;
      box-sizing: border-box;
    `;
    countInfo.appendChild(filterRowContainer);
    countInfo.appendChild(allButtonsContainer);
  }

  // 필터 요약 초기 업데이트
  updateMobileFilterSummary();

}

// 필터 요약 업데이트 함수 - 모든 적용된 필터 표시
function updateMobileFilterSummary() {
  const filterSummaryEl = document.getElementById('mobileFilterSummary');
  if (!filterSummaryEl) return;

  // EFFECTIVE_FILTERS에서 필터 값 읽기
  const filters = window.EFFECTIVE_FILTERS || {};

  const summaryParts = [];

  // 필터 필드명 매핑 (hybrid-filter.js와 동기화)
  const filterLabels = {
    region: '지역',
    jibun: '지번',
    region2: '지역2',
    building: '건물',
    floor: '층',
    store: '가게',
    status: '현황',
    deposit: '보증',
    rent: '월세',
    premium: '권리',
    area_sale: '분양',
    area_real: '전용',
    manager: '담당',
    phone: '연락처',
    client: '의뢰인',
    note: '비고',
    note3: '비고3',
    type: '유형',
    dong: '동',
    ho: '호수',
    direction: '향',
    supply: '공급',
    exclusive: '전용',
    rooms: '방',
    bath: '화장실',
    tenant: '임차인',
    sale_price: '매매',
    yield: '수익'
  };

  // 모든 필터를 순회하면서 값이 있는 것만 요약에 추가
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    if (value !== undefined && value !== null && value.toString().trim() !== '' && value !== '전체') {
      // 주택 필터(tf_h_...) 또는 상가 필터(tf_...) 접두사 제거
      const cleanKey = key.replace(/^modal_/, '').replace(/^tf_h_/, '').replace(/^tf_/, '');
      const label = filterLabels[cleanKey] || cleanKey;

      // 숫자 필터의 경우 단위 표시 고려 (기존 로직 유지하며 라벨만 보완)
      if (cleanKey === 'floor') {
        summaryParts.push(value + label);
      } else if (['deposit', 'rent', 'premium', 'area_sale', 'area_real'].includes(cleanKey)) {
        summaryParts.push(label + ' ' + value);
      } else {
        summaryParts.push(label + ':' + value);
      }
    }
  });

  // 필터 요약 텍스트 설정
  if (summaryParts.length > 0) {
    filterSummaryEl.textContent = summaryParts.join(' ');
    filterSummaryEl.style.display = 'flex';
  } else {
    filterSummaryEl.textContent = '';
    filterSummaryEl.style.display = 'none';
  }
}

// 전역 함수로 등록
window.updateMobileFilterSummary = updateMobileFilterSummary;

// 모바일 버튼 초기화는 main-new.js에서 통합 관리됨 (중복 제거)

// 전역 함수로 등록
window.addMobileButtons = addMobileButtons;

/**
 * 모바일 매물 모드 선택 버튼 초기화
 */
function initMobileListingModeButton() {
  // 모바일 디바이스인지 확인
  function isMobileDevice() {
    const ua = navigator.userAgent;
    const isMobileOS = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isMobileBrowser = ua.includes('Mobile') || ua.includes('NAVER(inapp');
    return isMobileOS || isMobileBrowser;
  }

  // 모바일이 아니면 실행하지 않음
  if (!isMobileDevice()) {
    return;
  }

  const btnWrap = document.getElementById('mobileListingModeBtnWrap');
  const btn = document.getElementById('mobileListingModeBtn');
  const dropdown = document.getElementById('mobileListingModeDropdown');
  const btnText = document.getElementById('mobileListingModeText');

  if (!btnWrap || !btn || !dropdown || !btnText) {
    return;
  }

  // 현재 모드에 따라 버튼 텍스트 업데이트
  function updateButtonText() {
    if (!window.UI_STATE) return;

    const mode = window.UI_STATE.listingMode || 'commercial';
    const subtype = mode === 'housing'
      ? (window.UI_STATE.housingSubtype || 'sale')
      : (window.UI_STATE.commercialSubtype || 'lease');

    let text = '';
    if (mode === 'commercial') {
      if (subtype === 'unit') text = '구분상가';
      else if (subtype === 'land') text = '건물토지';
      else if (subtype === 'sale') text = '상가매매'; // Fallback
      else text = '상가임대차';
    } else {
      if (subtype === 'sale') text = '주택 매매';
      else if (subtype === 'jeonse') text = '주택 전세';
      else if (subtype === 'monthly') text = '주택 월세';
      else text = '주택 매매';
    }

    btnText.textContent = text;
  }

  // 드롭다운 열기/닫기
  function toggleDropdown() {
    btnWrap.classList.toggle('open');
    dropdown.classList.toggle('hidden');
  }

  // 드롭다운 닫기
  function closeDropdown() {
    btnWrap.classList.remove('open');
    dropdown.classList.add('hidden');
  }

  // 버튼 클릭 시 드롭다운 토글
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // 드롭다운 항목 클릭 처리
  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();

      // 비활성화된 항목은 무시
      if (item.classList.contains('disabled')) {
        return;
      }

      const mode = item.dataset.mode;
      const subtype = item.dataset.subtype;

      // 모드 전환
      if (mode === 'commercial') {
        if (typeof window.switchListingMode === 'function') {
          await window.switchListingMode('commercial');
        }
        if (typeof window.switchCommercialSubtype === 'function') {
          window.switchCommercialSubtype(subtype);
        }
      } else if (mode === 'housing') {
        if (typeof window.switchListingMode === 'function') {
          await window.switchListingMode('housing');
        }
        if (typeof window.switchHousingSubtype === 'function') {
          window.switchHousingSubtype(subtype);
        }
      }

      // 버튼 텍스트 업데이트
      updateButtonText();

      // 드롭다운 닫기
      closeDropdown();
    });
  });

  // 외부 클릭 시 드롭다운 닫기
  document.addEventListener('click', (e) => {
    if (!btnWrap.contains(e.target)) {
      closeDropdown();
    }
  });

  // 권한 체크 및 주택 메뉴 항목 비활성화
  async function checkPermissions() {
    try {
      // getCurrentUserInfo 함수 확인 (전역 함수)
      if (typeof window.getCurrentUserInfo !== 'function') {
        console.warn('getCurrentUserInfo 함수를 찾을 수 없습니다.');
        return;
      }

      const userInfo = await window.getCurrentUserInfo();
      if (!userInfo) return;

      const role = userInfo?.user?.role ?? userInfo?.role ?? 'user';
      const isManagerOrAdmin = role === 'manager' || role === 'admin';

      // 주택 관련 메뉴 항목 처리
      dropdown.querySelectorAll('.dropdown-item[data-mode="housing"]').forEach(item => {
        if (!isManagerOrAdmin) {
          item.classList.add('disabled');
          item.title = '매니저·어드민만 이용 가능합니다';
        } else {
          item.classList.remove('disabled');
          item.title = '';
        }
      });
    } catch (error) {
      console.error('권한 확인 실패:', error);
    }
  }

  // 초기 버튼 텍스트 설정
  updateButtonText();

  // 권한 체크
  checkPermissions();

  // UI_STATE 변경 감지하여 버튼 텍스트 업데이트
  // 주기적으로 체크 (간단한 방법)
  setInterval(() => {
    updateButtonText();
  }, 1000);

}

// 전역 함수로 등록
window.initMobileListingModeButton = initMobileListingModeButton;
