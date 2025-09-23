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
    console.log('상태카운트바를 찾을 수 없습니다.');
    return;
  }

  // 기존 매물등록 버튼 찾기
  const existingAddBtn = statusCounts.querySelector('.btn-add-listing');
  if (!existingAddBtn) {
    console.log('기존 매물등록 버튼을 찾을 수 없습니다.');
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
  propertyListBtn.addEventListener('click', async function() {
    console.log('📱 매물LIST 버튼 클릭됨');
    
    // 중복 클릭 방지
    if (this.disabled) {
      console.log('📱 버튼이 이미 처리 중입니다');
      return;
    }
    this.disabled = true;
    
    try {
      // 매물리스트 모달 열기
      if (window.listingListModalManager) {
        console.log('📱 매물리스트 모달 열기 시도');
        await window.listingListModalManager.openModal();
        console.log('📱 매물리스트 모달 열기 완료');
      } else {
        console.error('❌ listingListModalManager를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('❌ 매물리스트 모달 열기 실패:', error);
    } finally {
      // 버튼 활성화 복원 (1초 후)
      setTimeout(() => {
        this.disabled = false;
        console.log('📱 버튼 활성화 복원');
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
  customerListBtn.addEventListener('click', async function() {
    console.log('📱 고객LIST 버튼 클릭됨');
    
    // 중복 클릭 방지
    if (this.disabled) {
      console.log('📱 버튼이 이미 처리 중입니다');
      return;
    }
    this.disabled = true;
    
    try {
      // 고객리스트 모달 열기
      if (window.customerListModalManager) {
        console.log('📱 고객리스트 모달 열기 시도');
        await window.customerListModalManager.openModal();
        console.log('📱 고객리스트 모달 열기 완료');
      } else {
        console.error('❌ customerListModalManager를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('❌ 고객리스트 모달 열기 실패:', error);
    } finally {
      // 버튼 활성화 복원 (1초 후)
      setTimeout(() => {
        this.disabled = false;
        console.log('📱 버튼 활성화 복원');
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
  customerAddBtn.addEventListener('click', function() {
    console.log('고객등록 버튼 클릭됨');
    // 고객등록 모달 열기
    if (window.customerAddManager) {
      window.customerAddManager.openModal();
    } else {
      console.error('customerAddManager를 찾을 수 없습니다.');
    }
  });

  // 모든 버튼을 컨테이너에 추가
  allButtonsContainer.appendChild(existingAddBtn);
  allButtonsContainer.appendChild(propertyListBtn);
  allButtonsContainer.appendChild(customerListBtn);
  allButtonsContainer.appendChild(customerAddBtn);

  // 기존 count-info를 새로운 컨테이너로 교체
  const countInfo = statusCounts.querySelector('.count-info');
  if (countInfo) {
    countInfo.innerHTML = '';
    countInfo.appendChild(allButtonsContainer);
  }

  console.log('모든 버튼이 동일한 크기로 통일되었습니다.');
}

// 모바일 버튼 초기화는 main-new.js에서 통합 관리됨 (중복 제거)

// 전역 함수로 등록
window.addMobileButtons = addMobileButtons;
