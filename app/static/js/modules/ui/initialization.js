/* -----------------------------------------
 * initialization.js - 초기화 관련 함수들
 * ----------------------------------------- */

/**************************************
 * ===== 초기화 관련 함수들 =====
 **************************************/

// DOMContentLoaded 초기화 함수
window.initializeApp = async function() {
  dbg("DOMContentLoaded");

  // CSS Grid 레이아웃을 사용하므로 setLayoutHeight 호출 제거
  // 대신 resize 이벤트 리스너만 등록
  window.addEventListener("resize", () => {
    // 지도가 준비된 경우에만 리사이즈 트리거
    if (MAP_READY && MAP) {
      requestAnimationFrame(() => {
        naver.maps.Event.trigger(MAP, 'resize');
      });
    }
  });

  if (typeof ENABLE_TEMP_LOGIN !== 'undefined' && !ENABLE_TEMP_LOGIN) {
    const tempSection = document.getElementById("tempLoginSection");
    if (tempSection) tempSection.remove();
  }

  // 사용자 세션 동기화 (다른 컴퓨터에서 접속 시에도 작동)
  try {
    if (window.syncUserFromSession) {
      await window.syncUserFromSession();
      console.log('✅ 사용자 세션 동기화 완료');
    } else if (window.loadUserFromStorage) {
      window.loadUserFromStorage();
      console.log('ℹ️ localStorage에서 사용자 정보 로드');
    }
  } catch (error) {
    console.warn('⚠️ 사용자 세션 동기화 실패:', error);
  }

  // 고객 패널 관련 DOM 요소들
  const customerListBtn    = document.getElementById("customerListBtn");
  const newCustomerBtn     = document.getElementById("newCustomerBtn");
  const detailTitleEl      = document.getElementById("secondaryPanelTitle");
  const viewCustomerList   = document.getElementById("viewCustomerList");
  const viewCustomerForm   = document.getElementById("viewCustomerForm");
  const viewCustomerDetail = document.getElementById("viewCustomerDetail");
  const saveCustomerBtn    = document.getElementById("saveCustomerBtn");
  const cancelCustomerBtn  = document.getElementById("cancelCustomerBtn");
  const secondaryPanel     = document.getElementById("secondaryPanel");

  // null 체크 함수
  function checkElements() {
    if (!customerListBtn || !newCustomerBtn || !detailTitleEl || 
        !viewCustomerList || !viewCustomerForm || !viewCustomerDetail || 
        !secondaryPanel) {
      console.error("필요한 DOM 요소를 찾을 수 없습니다.");
      return false;
    }
    return true;
  }

  // 1) 통합된 뷰 숨김 함수
  function hideAllSecondaryViews() {
    document.querySelectorAll('#secondaryPanel .panel-view')
            .forEach(v => v.classList.add('hidden'));
  }

  // 2) 일괄 뷰 전환 함수
  function showSecondaryPanel(viewId) {
    hideAllSecondaryViews();
    const panel = document.getElementById('secondaryPanel');
    const view  = document.getElementById(viewId);
    
    if (view) view.classList.remove('hidden');
    
    // CSS transform만 사용하여 표시 (UI 변동 방지)
    // panel.style.display = 'block'; // UI 변동 방지를 위해 제거
    panel.classList.remove('hidden');
    panel.classList.add('visible');
    
    // 1차 사이드바는 그대로 유지 (크기나 위치 변경하지 않음)
    // 기존 UI 요소들의 크기나 위치는 절대 변경하지 않음
    
    console.log('🔍 2차 사이드바 열기:', viewId);
  }
  
  // 전역 함수로 노출
  window.showSecondaryPanel = showSecondaryPanel;
  window.hideAllSecondaryViews = hideAllSecondaryViews;
  window.closeSecondaryPanel = closeSecondaryPanel;
  
  // 2차 사이드바 닫기 함수
  function closeSecondaryPanel() {
    console.log('🔍 closeSecondaryPanel 함수 호출됨!');
    
    const secondaryPanel = document.getElementById('secondaryPanel');
    
    if (secondaryPanel) {
      // CSS transform만 사용하여 숨김 (UI 변동 방지)
      // secondaryPanel.style.display = 'none'; // UI 변동 방지를 위해 제거
      secondaryPanel.classList.add('hidden');
      secondaryPanel.classList.remove('visible');
      
      // transform 초기화
      secondaryPanel.style.transform = 'translateX(100%)';
      
      hideAllSecondaryViews();
      
      // 1차 사이드바는 항상 보이도록 유지 (크기나 위치 변경하지 않음)
      // 기존 UI 요소들의 크기나 위치는 절대 변경하지 않음
      
      const customerListButtonArea = document.getElementById('customerListButtonArea');
      if (customerListButtonArea) {
        customerListButtonArea.remove();
      }
      
      console.log('✅ 2차 사이드바 닫기 완료');
    } else {
      console.error('❌ 2차 사이드바를 찾을 수 없습니다');
    }
  }

  // 문서 전체에 이벤트 위임 추가 (동적 요소 대응)
  document.addEventListener('click', function(event) {
    // 전체브리핑리스트 닫기 버튼 클릭 감지
    if (event.target && event.target.id === 'fullBriefingListCloseBtn') {
      console.log('🔍 전체브리핑리스트 닫기 버튼 클릭 감지');
      event.preventDefault();
      event.stopPropagation();
      toggleFullBriefingList(false);
      return;
    }
    
    // 전체리스트 닫기 버튼 클릭 감지
    if (event.target && event.target.id === 'fullListCloseBtn') {
      console.log('🔍 전체리스트 닫기 버튼 클릭 감지');
      event.preventDefault();
      event.stopPropagation();
      toggleFullList(false);
      return;
    }
  });

  // 4) 고객목록/신규등록/매물상세 등 진입점에서 showSecondaryPanel만 사용하도록 리팩토링
  // 고객List 버튼
  if (customerListBtn) {
    // 모듈 로딩 완료 후 이벤트 리스너 등록
    const setupCustomerListButton = () => {
      if (typeof window.loadCustomerList === 'function') {
        customerListBtn.addEventListener('click', () => {
          clearSelection();
          hideClusterList();
          // 1차 사이드바의 고객목록 컨테이너 숨기기
          const customerListContainer = document.getElementById('customerListContainer');
          if (customerListContainer) {
            customerListContainer.classList.add('hidden');
          }
          showSecondaryPanel('viewCustomerList');
          const detailTitleEl = document.getElementById('secondaryPanelTitle');
          if (detailTitleEl) detailTitleEl.textContent = '내 고객 목록';
          
          console.log('✅ loadCustomerList 함수 호출 시작');
          window.loadCustomerList(currentUser === 'admin' ? 'all' : 'own');
        });
        console.log('✅ 고객List 버튼 이벤트 리스너 등록 완료');
      } else {
        console.log('⏳ loadCustomerList 함수 대기 중...');
        setTimeout(setupCustomerListButton, 100);
      }
    };
    setupCustomerListButton();
  }
  // 신규등록 버튼
  if (newCustomerBtn) {
    // 모듈 로딩 완료 후 이벤트 리스너 등록
    const setupNewCustomerButton = () => {
      if (typeof window.renderCustomerForm === 'function') {
        newCustomerBtn.addEventListener('click', () => {
          clearSelection();
          hideClusterList();
          // 1차 사이드바의 고객목록 컨테이너 숨기기
          const customerListContainer = document.getElementById('customerListContainer');
          if (customerListContainer) {
            customerListContainer.classList.add('hidden');
          }
          showSecondaryPanel('viewCustomerForm');
          const detailTitleEl = document.getElementById('secondaryPanelTitle');
          if (detailTitleEl) detailTitleEl.textContent = '고객 신규등록';
          window.renderCustomerForm();
        });
        console.log('✅ 신규등록 버튼 이벤트 리스너 등록 완료');
      } else {
        console.log('⏳ renderCustomerForm 함수 대기 중...');
        setTimeout(setupNewCustomerButton, 100);
      }
    };
    setupNewCustomerButton();
  }

  // 버튼/입력 이벤트 바인딩
  const btnApplyUser = document.getElementById("applyUser");
  if (btnApplyUser) btnApplyUser.addEventListener("click", applyUser);

  const userEmailInp = document.getElementById("userEmail");
  if (userEmailInp) userEmailInp.addEventListener("keydown", e => { if (e.key === "Enter") applyUser(); });

  const loginEmailBtn = document.getElementById("loginEmailApply");
  if (loginEmailBtn) loginEmailBtn.addEventListener("click", applyUser);
  const loginEmailInp = document.getElementById("loginEmail");
  if (loginEmailInp) loginEmailInp.addEventListener("keydown", e => { if (e.key === "Enter") applyUser(); });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogoutClick);

  ["customerName", "customerPhone"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", applyCustomerInputs);
  });

  const btnSort = document.getElementById("applySortBtn");
  if (btnSort) btnSort.addEventListener("click", () => {
    sortListingsInPlace(LISTINGS);
    renderListingList(LISTINGS);
  });

  // 상단 필터바 버튼
  const topApply = document.getElementById("topFilterApplyBtn");
  if (topApply) topApply.addEventListener("click", applyAllFilters);
  const topReset = document.getElementById("topFilterResetBtn");
  if (topReset) topReset.addEventListener("click", () => {
    document.querySelectorAll("#topFilterBar input").forEach(inp => inp.value = "");
    applyAllFilters();
  });
  
  // 상단 필터 Enter 키
  document.querySelectorAll("#topFilterBar input").forEach(inp => {
    inp.addEventListener("keydown", e => { if (e.key === "Enter") applyAllFilters(); });
  });

  // 2차 패널/전체보기 버튼 바인딩
  const fullListBtn = document.getElementById("viewAllBtn");
  if (fullListBtn) fullListBtn.addEventListener("click", () => {
    if (UI_STATE.isBriefingListMode) {
      // 브리핑 리스트 모드일 때는 전체 브리핑 리스트 열기
      toggleFullBriefingList(true);
    } else {
      // 일반 모드일 때는 전체 매물 리스트 열기
      toggleFullList(true);
    }
  });

  const fullListCloseBtn = document.getElementById("fullListCloseBtn");
  if (fullListCloseBtn) fullListCloseBtn.addEventListener("click", () => toggleFullList(false));
  
  // 매물리스트/브리핑리스트 버튼 이벤트 리스너
  const propertyListBtn = document.getElementById("propertyListBtn");
  const briefingListBtn = document.getElementById("briefingListBtn");
  
  if (propertyListBtn) {
    propertyListBtn.addEventListener("click", () => switchToListingMode('property'));
  }
  
  if (briefingListBtn) {
    briefingListBtn.addEventListener("click", () => switchToListingMode('briefing'));
  }
  
  // 전체 브리핑 리스트 닫기 버튼 이벤트 리스너
  const fullBriefingListCloseBtn = document.getElementById("fullBriefingListCloseBtn");
  if (fullBriefingListCloseBtn) fullBriefingListCloseBtn.addEventListener("click", () => toggleFullBriefingList(false));

  // 정렬 버튼 초기화 및 이벤트 등록
  const sortButtons = document.querySelectorAll(".sortBtn");
  
  // 정렬 버튼 이벤트 등록
  if (sortButtons.length > 0) {
    sortButtons.forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        
        const sortType = btn.dataset.sort;
        
        // 색인 정렬은 아직 구현하지 않음
        if (sortType === "index") {
          // 색인 정렬은 아직 구현되지 않았습니다.
          return;
        }
        
        // 순환 정렬 처리
        if (SORT_CYCLES[sortType]) {
          // 현재 순환 인덱스 증가
          CURRENT_SORT_CYCLES[sortType] = (CURRENT_SORT_CYCLES[sortType] + 1) % SORT_CYCLES[sortType].length;
          
          // 새로운 정렬 모드 설정
          CURRENT_SORT_MODE = SORT_CYCLES[sortType][CURRENT_SORT_CYCLES[sortType]];
          
          // 버튼 텍스트는 변경하지 않음 (UI 안정성을 위해)
        } else {
          // 기존 방식 (색인 등)
          CURRENT_SORT_MODE = sortType;
        }
        
        // 모든 버튼에서 active 클래스 제거
        sortButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        if (MAP_READY) {
          naver.maps.Event.trigger(MAP, 'idle');
        }
      });
    });
  }

  // 클러스터 목록 닫기 버튼
  const clusterListClose = document.getElementById("clusterListClose");
  if (clusterListClose) clusterListClose.addEventListener("click", hideClusterList);

  // 3) 화면 상태 설정
  if (currentUser) {
    hideLoginScreen();
    console.log("✅ 사용자 로그인됨:", currentUser);
  } else {
    showLoginScreen("");
    console.log("✅ 로그인 화면 표시");
  }

  // 3) 지도 준비 후 fetchListings
  document.addEventListener('map-ready', () => {
    if (currentUser && !FETCH_CALLED_ONCE) {
      FETCH_CALLED_ONCE = true;
      fetchListings();
    }
  });
  if (MAP_READY && currentUser && !FETCH_CALLED_ONCE) {
    FETCH_CALLED_ONCE = true;
    fetchListings();
  }
  
  // 4) 브리핑 필터 초기화
  initializeBriefingFilters();
  
  // 5) 모든 패널 강제 숨김
  const panels = [
    "fullBriefingListPanel",
    "fullListPanel", 
    "secondaryPanel"
  ];
  
  panels.forEach(panelId => {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.add("hidden");
      panel.style.display = "none";
    }
  });
  
  // 6) UI 상태 초기화
  UI_STATE.showFullBriefingList = false;
  UI_STATE.showFullList = false;
  UI_STATE.isBriefingListMode = false;
  
  // 7) 사용자 관리 기능 초기화 (어드민 전용)
  if (typeof initUserManagement === 'function') {
    try {
      await initUserManagement();
      console.log('✅ 사용자 관리 기능 초기화 완료');
    } catch (error) {
      console.error('사용자 관리 초기화 실패:', error);
    }
  }
  
  // 8) 사용자별 개별매물장 기능 초기화
  if (typeof initUserSheets === 'function') {
    try {
      await initUserSheets();
      console.log('✅ 사용자별 개별매물장 기능 초기화 완료');
    } catch (error) {
      console.error('사용자별 개별매물장 초기화 실패:', error);
    }
  }
  
  // 9) 상태카운트바 매물장 컨트롤 초기화
  if (typeof initStatusBarSheets === 'function') {
    try {
      await initStatusBarSheets();
      console.log('✅ 상태카운트바 매물장 컨트롤 초기화 완료');
    } catch (error) {
      console.error('상태카운트바 매물장 컨트롤 초기화 실패:', error);
    }
  }
  
  
};

// 초기화 관련 함수들을 전역으로 export
window.initializeApp = window.initializeApp; 