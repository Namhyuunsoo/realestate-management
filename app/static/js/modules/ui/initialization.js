/* -----------------------------------------
 * initialization.js - 초기화 관련 함수들
 * ----------------------------------------- */

/**************************************
 * ===== 초기화 관련 함수들 =====
 **************************************/

// 권한 확인 헬퍼 함수들은 user-utils.js 모듈로 이동됨
// 이제 전역 함수로 사용 가능

// DOMContentLoaded 초기화 함수
window.initializeApp = async function () {
  try {
    dbg("DOMContentLoaded");

    // CSS Grid 레이아웃을 사용하므로 setLayoutHeight 호출 제거
    // 대신 resize 이벤트 리스너만 등록 (실제 창 크기 변경만 감지)
    // 🔥 성능 최적화: 중복 등록 방지
    // 🔥 성능 최적화: 모든 리사이즈 관리는 utils.js의 handleMobileAppResize에서 수행함
    // 중복 등록 방지 로직만 유지하거나, 아예 제거
    if (!window._resizeListenerRegistered) {
      window._resizeListenerRegistered = true;
    }

    if (typeof ENABLE_TEMP_LOGIN !== 'undefined' && !ENABLE_TEMP_LOGIN) {
      const tempSection = document.getElementById("tempLoginSection");
      if (tempSection) tempSection.remove();
    }

    // 옵션 1: 사용자 세션 동기화는 main-new.js의 initializeApplication()에서 이미 처리됨
    // 중복 호출 방지를 위해 여기서는 제거
    // currentUser가 이미 설정되어 있는지 확인만 함
    if (!currentUser && window.currentUser) {
      currentUser = window.currentUser;
    }

    // 고객 패널 관련 DOM 요소들
    const customerListBtn = document.getElementById("customerListBtn");
    const newCustomerBtn = document.getElementById("newCustomerBtn");
    const detailTitleEl = document.getElementById("secondaryPanelTitle");
    const viewCustomerList = document.getElementById("viewCustomerList");
    const viewCustomerForm = document.getElementById("viewCustomerForm");
    const viewCustomerDetail = document.getElementById("viewCustomerDetail");
    const saveCustomerBtn = document.getElementById("saveCustomerBtn");
    const cancelCustomerBtn = document.getElementById("cancelCustomerBtn");
    const secondaryPanel = document.getElementById("secondaryPanel");

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
      const view = document.getElementById(viewId);

      if (!panel) {
        console.error('❌ secondaryPanel 요소를 찾을 수 없습니다');
        return;
      }

      if (!view) {
        console.error('❌ view 요소를 찾을 수 없습니다 - viewId:', viewId);
        return;
      }

      // 뷰 표시
      view.classList.remove('hidden');
      // 패널 열 때 히스토리 상태 추가
      window.history.pushState({ panel: 'secondaryPanel', view: viewId }, '', '/');
      // CSS 클래스 변경
      panel.classList.remove('hidden');
      panel.classList.add('visible');

      // 강제로 display와 transform 설정 (다른 스크립트가 방해하는 경우 대비)
      panel.style.display = 'block';
      panel.style.transform = 'translateX(280px)';
      panel.style.visibility = 'visible';
      panel.style.opacity = '1';
      // 1차 사이드바는 그대로 유지 (크기나 위치 변경하지 않음)
      // 기존 UI 요소들의 크기나 위치는 절대 변경하지 않음

      // PC 환경에서 레이아웃 재계산 후 높이 재설정
      if (window.innerWidth > 768 && typeof window.setPCLayoutHeight === 'function') {
        requestAnimationFrame(() => {
          window.setPCLayoutHeight();
        });
      }
    }

    // 전역 함수로 노출
    window.showSecondaryPanel = showSecondaryPanel;
    window.hideAllSecondaryViews = hideAllSecondaryViews;
    window.closeSecondaryPanel = closeSecondaryPanel;

    // 2차 사이드바 닫기 함수
    function closeSecondaryPanel() {
      const secondaryPanel = document.getElementById('secondaryPanel');

      if (!secondaryPanel) {
        console.error('❌ secondaryPanel 요소를 찾을 수 없습니다');
        return;
      }

      // CSS 클래스 변경
      secondaryPanel.classList.add('hidden');
      secondaryPanel.classList.remove('visible');

      // 강제로 스타일 초기화 (다른 스크립트가 방해하는 경우 대비)
      secondaryPanel.style.display = 'none';
      secondaryPanel.style.transform = 'translateX(-100%)';
      secondaryPanel.style.visibility = 'hidden';
      secondaryPanel.style.opacity = '0';
      hideAllSecondaryViews();
      // 1차 사이드바는 항상 보이도록 유지 (크기나 위치 변경하지 않음)
      // 기존 UI 요소들의 크기나 위치는 절대 변경하지 않음

      const customerListButtonArea = document.getElementById('customerListButtonArea');
      if (customerListButtonArea) {
        customerListButtonArea.remove();
      }

      // console.log('✅ 2차 사이드바 닫기 완료');
    }

    // 문서 전체에 이벤트 위임 추가 (동적 요소 대응)
    document.addEventListener('click', function (event) {
      // 전체브리핑리스트 닫기 버튼 클릭 감지
      if (event.target && event.target.id === 'fullBriefingListCloseBtn') {
        event.preventDefault();
        event.stopPropagation();
        toggleFullBriefingList(false);
        return;
      }

      // 전체리스트 닫기 버튼 클릭 감지
      if (event.target && event.target.id === 'fullListCloseBtn') {
        event.preventDefault();
        event.stopPropagation();
        toggleFullList(false);
        return;
      }
    });

    // 4) 고객목록/신규등록/매물상세 등 진입점에서 showSecondaryPanel만 사용하도록 리팩토링
    // 고객List 버튼
    if (customerListBtn) {
      // 즉시 이벤트 리스너 등록 (함수 로딩 대기 없이)
      customerListBtn.addEventListener('click', () => {
        clearSelection();
        hideClusterList();

        // 1차 사이드바의 고객목록 컨테이너 숨기기
        const customerListContainer = document.getElementById('customerListContainer');
        if (customerListContainer) {
          customerListContainer.classList.add('hidden');
        }

        // 2차 사이드바 열기
        showSecondaryPanel('viewCustomerList');
        const detailTitleEl = document.getElementById('secondaryPanelTitle');
        if (detailTitleEl) detailTitleEl.textContent = '내 고객 목록';

        // 고객 목록 로드 (함수가 있으면 호출)
        if (typeof window.loadCustomerList === 'function') {
          window.loadCustomerList(isUserAdmin() ? 'all' : 'own');
        }
      });

      // console.log('✅ 고객List 버튼 이벤트 리스너 등록 완료');
    }
    // 신규등록 버튼
    if (newCustomerBtn) {
      // 즉시 이벤트 리스너 등록 (함수 로딩 대기 없이)
      newCustomerBtn.addEventListener('click', () => {
        // 🔥 모바일 토글 기능: 이미 열려있으면 닫기
        if (window.MOBILE_APP || (window.innerWidth <= 768)) {
          if (window.customerAddManager && window.customerAddManager.modal && !window.customerAddManager.modal.classList.contains('hidden')) {
            window.customerAddManager.closeModal();
            return;
          }
        }

        clearSelection();
        hideClusterList();

        // 1차 사이드바의 고객목록 컨테이너 숨기기
        const customerListContainer = document.getElementById('customerListContainer');
        if (customerListContainer) {
          customerListContainer.classList.add('hidden');
        }

        // 2차 사이드바 열기
        showSecondaryPanel('viewCustomerForm');
        const detailTitleEl = document.getElementById('secondaryPanelTitle');
        if (detailTitleEl) detailTitleEl.textContent = '고객 신규등록';

        // 고객 폼 렌더링 (함수가 있으면 호출)
        if (typeof window.renderCustomerForm === 'function') {
          window.renderCustomerForm();
        }
      });

      // console.log('✅ 신규등록 버튼 이벤트 리스너 등록 완료');
    }

    // 버튼/입력 이벤트 바인딩
    const btnApplyUser = document.getElementById("applyUser");
    if (btnApplyUser) btnApplyUser.addEventListener("click", applyUser);

    const userEmailInp = document.getElementById("userEmail");
    if (userEmailInp) userEmailInp.addEventListener("keydown", e => { if (e.key === "Enter") applyUser(); }, { passive: false });

    const loginEmailBtn = document.getElementById("loginEmailApply");
    if (loginEmailBtn) loginEmailBtn.addEventListener("click", applyUser);
    const loginEmailInp = document.getElementById("loginEmail");
    if (loginEmailInp) loginEmailInp.addEventListener("keydown", e => { if (e.key === "Enter") applyUser(); }, { passive: false });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogoutClick);

    // 모바일 로그아웃 버튼 이벤트 리스너 추가
    const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", handleLogoutClick);

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
    if (topApply) topApply.addEventListener("click", window.applyAllFilters);
    const topReset = document.getElementById("topFilterResetBtn");
    if (topReset) topReset.addEventListener("click", () => {
      if (UI_STATE.listingMode === "housing") {
        document.querySelectorAll("#housingFilterSection input, #housingFilterSection select").forEach(el => {
          el.value = (el.id === "tf_h_status") ? "생" : "";
        });
        document.querySelectorAll("#modalHousingFilter input, #modalHousingFilter select").forEach(el => {
          el.value = (el.id === "modal_tf_h_status") ? "생" : "";
        });
      } else {
        document.querySelectorAll("#commercialFilterSection input, #commercialFilterSection select").forEach(el => {
          el.value = (el.id === "tf_status") ? "생" : "";
        });
        document.querySelectorAll("#modalCommercialFilter input, #modalCommercialFilter select").forEach(el => {
          el.value = (el.id === "modal_tf_status") ? "생" : "";
        });
      }
      window.applyAllFilters();
    });

    // 상단 필터 Enter 키
    document.querySelectorAll("#topFilterBar input").forEach(inp => {
      inp.addEventListener("keydown", e => { if (e.key === "Enter") window.applyAllFilters(); }, { passive: false });
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

    // 매물리스트/브리핑리스트 버튼 이벤트 리스너 (PC에서만 실행)
    const propertyListBtn = document.getElementById("propertyListBtn");
    const briefingListBtn = document.getElementById("briefingListBtn");

    if (propertyListBtn && !window.MOBILE_APP) {
      propertyListBtn.addEventListener("click", () => switchToListingMode('property'));
    }

    if (briefingListBtn && !window.MOBILE_APP) {
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

    // 3) 화면 상태 설정 (모바일/PC 공통)
    if (currentUser) {
      hideLoginScreen();
      // 보안 강화: 사용자 정보 로깅 제거
      // console.log("✅ 사용자 로그인됨:", currentUser);
    } else {
      showLoginScreen("");
    }

    // 상단바 사용자 정보 설정
    const officeNameEl = document.getElementById('officeName');
    const userRoleNameEl = document.getElementById('userRoleName');

    if (officeNameEl) {
      officeNameEl.textContent = 'SK공인중개사사무소';
    }

    if (userRoleNameEl && currentUser) {
      // 사용자 정보 가져오기 (동기 방식)
      const userInfo = getCurrentUserInfo();
      if (userInfo && userInfo.email) {
        let displayText = '';

        // 직책이 있으면 직책과 이름 표시
        if (userInfo.job_title && userInfo.job_title.trim()) {
          if (userInfo.name && userInfo.name.trim()) {
            displayText = `${userInfo.job_title} ${userInfo.name}`;
          } else {
            displayText = userInfo.job_title;
          }
        } else {
          // 직책이 없으면 이름만 표시
          if (userInfo.name && userInfo.name.trim()) {
            displayText = userInfo.name;
          } else {
            displayText = '사용자';
          }
        }

        userRoleNameEl.textContent = displayText;
      } else {
        userRoleNameEl.textContent = currentUser;
      }
    }

    // 3) 지도 준비 후 fetchListings
    // FETCH_CALLED_ONCE는 globals.js에서 전역 변수로 관리됨

    document.addEventListener('map-ready', async () => {
      // 보안 강화: 사용자 정보 로깅 제거
      // console.log('🗺️ map-ready 이벤트 발생, currentUser:', currentUser, 'FETCH_CALLED_ONCE:', window.FETCH_CALLED_ONCE);
      if (currentUser && !window.FETCH_CALLED_ONCE) {
        window.FETCH_CALLED_ONCE = true;
        FETCH_CALLED_ONCE = true; // 전역 변수 동기화

        // 추천 데이터가 로드되었는지 확인하고, 없으면 로드
        if (typeof window.loadRecommendations === 'function' && (!window.USER_RECOMMENDATIONS || window.USER_RECOMMENDATIONS.size === 0)) {
          // 🔥 성능 최적화: console.log 최소화
          // console.log('🔄 추천 데이터가 없어서 로드 중...');
          await window.loadRecommendations();
          // console.log('✅ 추천 데이터 로드 완료, USER_RECOMMENDATIONS:', window.USER_RECOMMENDATIONS?.size);
        }

        // 🔥 성능 최적화: console.log 최소화
        // console.log('🚀 fetchListings 호출 시작');
        await fetchListings();

        // 모바일 환경에서도 지도 영역 필터링 적용
        if (window.MOBILE_APP) {
          // applyAllFilters가 실행되어 FILTERED_LISTINGS가 설정되었는지 확인
          if (window.FILTERED_LISTINGS && window.FILTERED_LISTINGS.length > 0) {
            // 🔥 성능 최적화: console.log 최소화
            // console.log('📱 모바일 환경: FILTERED_LISTINGS 설정 완료, 개수:', window.FILTERED_LISTINGS.length);
          } else if (window.LISTINGS && window.LISTINGS.length > 0) {
            // FILTERED_LISTINGS가 없으면 LISTINGS 사용 (지도 영역 필터링 적용됨)
            window.FILTERED_LISTINGS = [...window.LISTINGS];
            // 🔥 성능 최적화: console.log 최소화
            // console.log('📱 모바일 환경: LISTINGS에서 FILTERED_LISTINGS 설정 완료, 개수:', window.FILTERED_LISTINGS.length);
          } else {
            // LISTINGS가 없으면 빈 배열로 설정
            window.FILTERED_LISTINGS = [];
            // 🔥 성능 최적화: console.log 최소화
            // console.log('📱 모바일 환경: LISTINGS 없음 - FILTERED_LISTINGS 빈 배열 설정');
          }
        }

        // 마커 배치 (옵션 1: 이벤트 기반 통합)
        if (typeof window.placeMarkers === 'function' && window.FILTERED_LISTINGS && window.FILTERED_LISTINGS.length > 0) {
          window.placeMarkers(window.FILTERED_LISTINGS);
          // 🔥 성능 최적화: console.log 최소화
          // console.log('✅ 마커 배치 완료 (map-ready 이벤트), MARKERS:', window.MARKERS?.length);
        }

        // 5. 초기 로딩 완료 후 실시간 동기화 시작 (성능 최적화: 초기 로딩 완료 후 구독)
        if (window._supabaseConfig && typeof window.initRealtimeSync === 'function') {
          const { url, key } = window._supabaseConfig;
          window.initRealtimeSync(url, key);
        }

        // 초기 로딩 완료 후 추천 상태 동기화 (한 번만)
        setTimeout(() => {
          if (window.syncAllRecommendationUI) {
            window.syncAllRecommendationUI();
          }
        }, 500);
      }
    });

    if (MAP_READY && currentUser && !window.FETCH_CALLED_ONCE) {
      window.FETCH_CALLED_ONCE = true;
      FETCH_CALLED_ONCE = true; // 전역 변수 동기화

      // 추천 데이터가 로드되었는지 확인하고, 없으면 로드
      if (typeof window.loadRecommendations === 'function' && (!window.USER_RECOMMENDATIONS || window.USER_RECOMMENDATIONS.size === 0)) {
        // 🔥 성능 최적화: console.log 최소화
        // console.log('🔄 추천 데이터가 없어서 로드 중...');
        await window.loadRecommendations();
        // console.log('✅ 추천 데이터 로드 완료, USER_RECOMMENDATIONS:', window.USER_RECOMMENDATIONS?.size);
      }

      // 🔥 성능 최적화: console.log 최소화
      // console.log('🚀 fetchListings 호출 시작 (MAP_READY)');
      await fetchListings();

      // 마커 배치 (옵션 1: 이벤트 기반 통합)
      if (typeof window.placeMarkers === 'function' && window.FILTERED_LISTINGS && window.FILTERED_LISTINGS.length > 0) {
        window.placeMarkers(window.FILTERED_LISTINGS);
        // 🔥 성능 최적화: console.log 최소화
        // console.log('✅ 마커 배치 완료 (MAP_READY 체크), MARKERS:', window.MARKERS?.length);
      }

      // 초기 로딩 완료 후 추천 상태 동기화 (한 번만)
      setTimeout(() => {
        if (window.syncAllRecommendationUI) {
          window.syncAllRecommendationUI();
        }
      }, 500);
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
        // console.log('✅ 사용자 관리 기능 초기화 완료');
      } catch (error) {
        console.error('사용자 관리 초기화 실패:', error);
      }
    }

    // 8) 사용자별 개별매물장 기능 초기화
    if (typeof initUserSheets === 'function') {
      try {
        await initUserSheets();
        // console.log('✅ 사용자별 개별매물장 기능 초기화 완료');
      } catch (error) {
        console.error('사용자별 개별매물장 초기화 실패:', error);
      }
    }

    // 9) 상태카운트바 매물장 컨트롤 초기화
    if (typeof initStatusBarSheets === 'function') {
      try {
        await initStatusBarSheets();
        // console.log('✅ 상태카운트바 매물장 컨트롤 초기화 완료');
      } catch (error) {
        console.error('상태카운트바 매물장 컨트롤 초기화 실패:', error);
      }
    }

    // 9-1) 상가/주택 모드 컨트롤 초기화
    if (typeof initListingModeControls === 'function') {
      try {
        initListingModeControls();
        // console.log('✅ 상가/주택 모드 컨트롤 초기화 완료');
      } catch (error) {
        console.error('상가/주택 모드 컨트롤 초기화 실패:', error);
      }
    }

    // 10) 새로고침 컨트롤 초기화
    initializeRefreshControls();

  } catch (error) {
    console.error("initializeApp 도중 치명적 오류 발생:", error);
  } finally {
    // 11) 어떤 상황에서도 초기 로딩 가림막 제거 (v8.3)
    hideLoadingShield();
  }
};

// 로딩 가림막 제거 함수 (v8.3)
function hideLoadingShield() {
  const shield = document.getElementById('loadingShield');
  if (shield) {
    shield.style.opacity = '0';
    shield.style.visibility = 'hidden';
    setTimeout(() => {
      shield.remove();
    }, 400); // transition 시간(0.4s)에 맞춰 제거
  }
}

/**************************************
 * ===== 새로고침 컨트롤 초기화 =====
 **************************************/

function initializeRefreshControls() {
  // 새로고침 버튼 초기화
  if (typeof initRefreshButton === 'function') {
    initRefreshButton();
  } else {
    console.warn('⚠️ initRefreshButton 함수를 찾을 수 없습니다.');
  }

  // 초기 마지막 업데이트 시간 설정
  if (typeof updateLastUpdateTime === 'function') {
    updateLastUpdateTime();
  } else {
    console.warn('⚠️ updateLastUpdateTime 함수를 찾을 수 없습니다.');
  }

  // console.log('✅ 새로고침 컨트롤 초기화 완료');
}

// 초기화 관련 함수들을 전역으로 export
window.initializeApp = window.initializeApp;

// 고객선택 상태 변경 시 브리핑 상태 표시기 업데이트
function onCustomerSelectionChanged() {
  if (window.updateAllBriefingStatusIndicators) {
    window.updateAllBriefingStatusIndicators();
  }
}

window.onCustomerSelectionChanged = onCustomerSelectionChanged;

window.onCustomerSelectionChanged = onCustomerSelectionChanged;