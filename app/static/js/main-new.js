/* -----------------------------------------
 * main-new.js - 모듈화된 메인 진입점
 * -----------------------------------------
 * 이 파일은 모든 모듈을 순서대로 로드하고 초기화하는 메인 진입점입니다.
 * 기존 기능과 UI를 그대로 유지하면서 모듈화된 구조로 개선되었습니다.
 * ----------------------------------------- */

/*******************************
 * ===== 모듈 로드 시스템 =====
 *******************************/

// 모듈 로드 함수
function loadModule(modulePath) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = modulePath;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 모듈들을 순서대로 로드
async function loadModules() {
  try {
    console.log('🚀 모듈 로딩 시작...');
    
    // 1. 전역 변수/상수 (가장 먼저 로드)
    await loadModule('/static/js/modules/core/globals.js');
    console.log('✅ globals.js 로드 완료');
    
    // 2. 모드 전환 관리자
    await loadModule('/static/js/modules/core/mode-switcher.js');
    console.log('✅ mode-switcher.js 로드 완료');
    
    // 3. 유틸리티 함수들
    await loadModule('/static/js/modules/core/utils.js');
    console.log('✅ utils.js 로드 완료');
    
    // 모바일 앱 높이 조정
    if (window.adjustMobileAppHeight) {
      window.adjustMobileAppHeight();
    }
    
    // 4. 터치 제스처 관리 (모바일 환경)
    await loadModule('/static/js/modules/core/touch-gestures.js');
    console.log('✅ touch-gestures.js 로드 완료');
    
    // 5. 인증 관련 함수들 (전역 변수에 의존)
    await loadModule('/static/js/modules/auth/auth.js');
    console.log('✅ auth.js 로드 완료');
    
    // 4. 브리핑 관련 함수들
    await loadModule('/static/js/modules/filters/briefing.js');
    console.log('✅ briefing.js 로드 완료');
    
    // 5. 매물 데이터 관련 함수들
    await loadModule('/static/js/modules/data/listings.js');
    
    
    // 6. 클러스터링 관리 (map-core.js보다 먼저 로드)
    await loadModule('/static/js/modules/map/map-clustering.js');
    console.log('✅ map-clustering.js 로드 완료');
    
    // 7. 지도 컨트롤 관리 (map-core.js보다 먼저 로드)
    await loadModule('/static/js/modules/map/map-controls.js');
    console.log('✅ map-controls.js 로드 완료');
    
    // 8. 지도 핵심 기능 (map-controls.js 로드 후)
    await loadModule('/static/js/modules/map/map-core.js');
    console.log('✅ map-core.js 로드 완료');
    
    // 9. 마커 관리
    await loadModule('/static/js/modules/map/map-markers.js');
    console.log('✅ map-markers.js 로드 완료');
    
    // 10. 토스트 메시지 UI 관리
    await loadModule('/static/js/modules/ui/toast.js');
    console.log('✅ toast.js 로드 완료');
    
    // 11. 매물 리스트 UI 관리
    await loadModule('/static/js/modules/ui/listing-list.js');
    console.log('✅ listing-list.js 로드 완료');
    
    // 12. 패널 관리 UI 관리
    await loadModule('/static/js/modules/ui/panels.js');
    console.log('✅ panels.js 로드 완료');
    
    // 13. 전체 리스트 UI 관리
    await loadModule('/static/js/modules/ui/full-list.js');
    console.log('✅ full-list.js 로드 완료');
    
    // 14. 전체 브리핑 리스트 UI 관리
    await loadModule('/static/js/modules/ui/full-briefing-list.js');
    console.log('✅ full-briefing-list.js 로드 완료');
    
    // 15. 상세 패널 UI 관리
    await loadModule('/static/js/modules/ui/detail-panel.js');
    console.log('✅ detail-panel.js 로드 완료');
    
    // 16. 브리핑 리스트 UI 관리
    await loadModule('/static/js/modules/ui/briefing-list.js');
    console.log('✅ briefing-list.js 로드 완료');
    
    // 17. 고객 폼 관련 함수들 관리
    await loadModule('/static/js/modules/ui/customer-forms.js');
    console.log('✅ customer-forms.js 로드 완료');
    
    // 18. 고객 관리 UI 관리
    await loadModule('/static/js/modules/ui/customer-management.js');
    console.log('✅ customer-management.js 로드 완료');
    
    // 19. 고객 목록+상세 관련 함수들 관리
    await loadModule('/static/js/modules/ui/customer-list-detail.js');
    console.log('✅ customer-list-detail.js 로드 완료');
    
    // 20. 사용자 관리 관련 함수들 관리
    await loadModule('/static/js/modules/ui/user-management.js');
    console.log('✅ user-management.js 로드 완료');
    
    // 21. 사용자 시트 관련 함수들 관리
    await loadModule('/static/js/modules/ui/user-sheets.js');
    console.log('✅ user-sheets.js 로드 완료');
    
    // 22. 상태바 시트 관련 함수들 관리
    await loadModule('/static/js/modules/ui/status-bar-sheets.js');
    console.log('✅ status-bar-sheets.js 로드 완료');
    
    // 23. 이벤트 핸들러 관련 함수들 관리
    await loadModule('/static/js/modules/ui/event-handlers.js');
    console.log('✅ event-handlers.js 로드 완료');
    
    // 24. 초기화 관련 함수들 관리 (마지막에 로드)
    await loadModule('/static/js/modules/ui/initialization.js');
    console.log('✅ initialization.js 로드 완료');
    
    // 25. 사이드바 토글 초기화
    setupSidebarToggles();
    console.log('✅ 사이드바 토글 기능 초기화 완료');
    
    console.log('🎉 모든 모듈 로딩 완료!');
    
    // 모든 모듈 로드 완료 후 앱 초기화
    await initializeApplication();
    
  } catch (error) {
    console.error('❌ 모듈 로딩 실패:', error);
    showToast('모듈 로딩 중 오류가 발생했습니다. 페이지를 새로고침해주세요.', 'error');
  }
}

/*******************************
 * ===== 앱 초기화 =====
 *******************************/

// 앱 초기화 함수
async function initializeApplication() {
  try {
    console.log('🚀 앱 초기화 시작...');
    
    // 1. DOM이 준비될 때까지 대기
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
    
    // 2. 네이버 지도 API 로드 확인
    await waitForNaverMaps();
    
    // 3. 앱 초기화 실행 (모바일에서는 실행하지 않음)
    if (!window.MOBILE_APP && window.initializeApp) {
      await window.initializeApp();
      console.log('✅ 앱 초기화 완료');
    } else if (window.MOBILE_APP) {
      console.log('📱 모바일 앱이므로 PC 초기화 건너뜀');
    } else {
      console.error('❌ initializeApp 함수를 찾을 수 없습니다.');
    }
    
    // 4. 터치 제스처 초기화 (모바일 환경)
    if (window.initTouchGestures) {
      window.initTouchGestures();
      console.log('✅ 터치 제스처 초기화 완료');
    }
    
    // 5. 히스토리 관리 초기화 (모바일 뒤로가기 방지)
    if (window.initializeHistory) {
      window.initializeHistory();
      console.log('✅ 히스토리 관리 초기화 완료');
    }
    
    // 6. 화면 크기 변경 이벤트 리스너 설정
    window.addEventListener('resize', () => {
      if (window.handleResize) {
        window.handleResize();
      }
    });
    
  } catch (error) {
    console.error('❌ 앱 초기화 실패:', error);
    showToast('앱 초기화 중 오류가 발생했습니다.', 'error');
  }
}

// 네이버 지도 API 로드 대기 함수
function waitForNaverMaps() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 100; // 최대 10초 대기 (100ms * 100)
    
    const checkNaverMaps = () => {
      attempts++;
      
      if (window.naver && window.naver.maps && typeof naver.maps.Map === 'function') {
        console.log('✅ 네이버 지도 API 로드 완료');
        resolve();
      } else if (attempts >= maxAttempts) {
        console.error('❌ 네이버 지도 API 로드 실패 - 최대 대기 시간 초과');
        reject(new Error('네이버 지도 API를 로드할 수 없습니다.'));
      } else {
        setTimeout(checkNaverMaps, 100);
      }
    };
    
    // 이미 로드된 경우 즉시 resolve
    if (window.naver && window.naver.maps && typeof naver.maps.Map === 'function') {
      console.log('✅ 네이버 지도 API가 이미 로드됨');
      resolve();
      return;
    }
    
    checkNaverMaps();
  });
}

/*******************************
 * ===== 토스트 메시지 =====
 *******************************/

// 토스트 알림 함수 (간단한 버전)
function showToast(message, type = 'info') {
  // 기존 토스트 제거
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  // 토스트 컨테이너 생성
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // 3초 후 자동 제거
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 3000);
}

/*******************************
 * ===== 브리핑 필터 상태 =====
 *******************************/

// 브리핑 필터 상태는 globals.js에서 이미 정의됨
// 중복 선언 방지를 위해 여기서는 제거

/*******************************
 * ===== 사이드바 토글 기능 =====
 *******************************/

// 사이드바 토글 상태 관리
const sidebarState = {
  primaryCollapsed: false, // 기본값: 펼쳐진 상태
  secondaryCollapsed: false
};

// 1차 사이드바 토글
function togglePrimarySidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const mainContent = document.getElementById('mainContent');
  const layout = document.getElementById('layout');
  const secondaryPanel = document.getElementById('secondaryPanel');
  
  // 모바일 환경에서는 collapsed가 열린 상태를 의미
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // 모바일 모드: collapsed = 열린 상태, !collapsed = 닫힌 상태
    if (sidebar.classList.contains('collapsed')) {
      // 닫기 (화면 절반 크기에서 노치만 보이게)
      sidebar.classList.remove('collapsed');
      sidebar.style.transform = 'translateY(calc(100% - 40px))';
      sidebar.style.height = '40px';
      sidebar.style.maxHeight = '40px';
      toggleBtn.textContent = '▲';
      sidebarState.primaryCollapsed = false;
      localStorage.setItem('sidebar-primary-collapsed', 'false');
    } else {
      // 열기 (노치 상태에서 화면 절반 크기로)
      sidebar.classList.add('collapsed');
      sidebar.style.transform = 'translateY(0)';
      sidebar.style.height = '50vh';
      sidebar.style.maxHeight = '50vh';
      toggleBtn.textContent = '▼';
      sidebarState.primaryCollapsed = true;
      localStorage.setItem('sidebar-primary-collapsed', 'true');
    }
  } else {
    // PC 모드: 기존 로직 유지
    if (sidebar.classList.contains('collapsed')) {
      // 펼치기
      sidebar.classList.remove('collapsed');
      toggleBtn.textContent = '◀';
      sidebarState.primaryCollapsed = false;
      localStorage.setItem('sidebar-primary-collapsed', 'false');
    } else {
      // 접기
      sidebar.classList.add('collapsed');
      toggleBtn.textContent = '▶';
      sidebarState.primaryCollapsed = true;
      localStorage.setItem('sidebar-primary-collapsed', 'true');
    }
  }
  
  // 지도 크기 변경 후 리사이즈 및 마커 재표시
  setTimeout(() => {
    resizeMapAndRefreshMarkers();
  }, 300);
}

// 2차 사이드바 토글
function toggleSecondarySidebar() {
  const secondaryPanel = document.getElementById('secondaryPanel');
  const toggleBtn = document.getElementById('secondaryPanelToggleBtn');
  
  if (secondaryPanel.classList.contains('collapsed')) {
    // 펼치기
    secondaryPanel.classList.remove('collapsed');
    toggleBtn.textContent = '◀';
    sidebarState.secondaryCollapsed = false;
    localStorage.setItem('sidebar-secondary-collapsed', 'false');
  } else {
    // 접기
    secondaryPanel.classList.add('collapsed');
    toggleBtn.textContent = '▶';
    sidebarState.secondaryCollapsed = true;
    localStorage.setItem('sidebar-secondary-collapsed', 'true');
  }
}

// 지도 크기 변경 후 리사이즈 및 마커 재표시
function resizeMapAndRefreshMarkers() {
  console.log('🔄 지도 리사이즈 및 마커 재표시 시작');
  
  // 네이버 지도 객체가 있는지 확인
  if (window.MAP && window.naver && window.naver.maps) {
    try {
      // 지도 리사이즈 (여러 방법 시도)
      if (window.MAP.refresh) {
        window.MAP.refresh();
      }
      
      // 네이버 지도 이벤트 트리거로 리사이즈
      if (window.naver && window.naver.maps && window.naver.maps.Event) {
        window.naver.maps.Event.trigger(window.MAP, 'resize');
      }
      
      console.log('✅ 지도 리사이즈 완료');
      
      // 마커 클러스터링이 있는 경우 재계산
      if (window.markerClustering) {
        window.markerClustering.redraw();
        console.log('✅ 마커 클러스터링 재계산 완료');
      }
      
      // 마커들 재표시 (모바일 환경에서 더 긴 지연시간)
      if (window.placeMarkers && typeof window.placeMarkers === 'function') {
        const delay = window.innerWidth <= 768 ? 200 : 100; // 모바일에서는 더 긴 지연시간
        
        // 모바일 환경에서 리사이즈 플래그 설정
        if (window.innerWidth <= 768) {
          window.isMobileResizeFlag = true;
          console.log('📱 모바일 리사이즈 플래그 설정됨');
        }
        
        setTimeout(() => {
          window.placeMarkers();
          console.log('✅ 마커 재표시 완료');
          
          // 플래그 제거
          if (window.isMobileResizeFlag) {
            window.isMobileResizeFlag = false;
            console.log('📱 모바일 리사이즈 플래그 제거됨');
          }
        }, delay);
      }
      
      // 지도 중심점 유지
      const center = window.MAP.getCenter();
      if (center) {
        window.MAP.setCenter(center);
        console.log('✅ 지도 중심점 유지 완료');
      }
      
      // 추가로 한 번 더 리사이즈 트리거 (모바일 환경)
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          if (window.naver && window.naver.maps && window.naver.maps.Event) {
            window.naver.maps.Event.trigger(window.MAP, 'resize');
            console.log('✅ 모바일 환경 추가 리사이즈 완료');
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ 지도 리사이즈 중 오류:', error);
    }
  } else {
    console.log('⚠️ 네이버 지도 객체가 아직 로드되지 않음');
  }
}

// 사이드바 상태 복원
function restoreSidebarState() {
  // localStorage에서 상태 가져오기 (기본값: 펼쳐진 상태)
  // 기존 저장된 값이 있으면 제거하고 기본 펼쳐진 상태로 시작
  localStorage.removeItem('sidebar-primary-collapsed');
  
  const primaryCollapsed = localStorage.getItem('sidebar-primary-collapsed') === 'true';
  const secondaryCollapsed = localStorage.getItem('sidebar-secondary-collapsed') === 'true';
  const mainContent = document.getElementById('mainContent');
  const layout = document.getElementById('layout');
  const secondaryPanel = document.getElementById('secondaryPanel');
  
  // 모바일 환경에서는 기본적으로 닫힌 상태로 시작
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // 모바일 모드: 기본적으로 노치만 보이는 상태
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    if (sidebar && toggleBtn) {
      sidebar.classList.remove('collapsed');
      sidebar.style.transform = 'translateY(calc(100% - 40px))';
      toggleBtn.textContent = '▼';
      sidebarState.primaryCollapsed = false;
      
      // 지도 크기 변경 후 리사이즈 및 마커 재표시
      setTimeout(() => {
        resizeMapAndRefreshMarkers();
      }, 500);
    }
  } else {
    // PC 모드: 기본값: 1차 사이드바는 펼쳐진 상태
    if (!primaryCollapsed) {
      const sidebar = document.getElementById('sidebar');
      const toggleBtn = document.getElementById('sidebarToggleBtn');
      if (sidebar && toggleBtn) {
        sidebar.classList.remove('collapsed');
        toggleBtn.textContent = '◀';
        sidebarState.primaryCollapsed = false;
        
        // 지도 크기 변경 후 리사이즈 및 마커 재표시
        setTimeout(() => {
          resizeMapAndRefreshMarkers();
        }, 500);
      }
    } else {
      const sidebar = document.getElementById('sidebar');
      const toggleBtn = document.getElementById('sidebarToggleBtn');
      if (sidebar && toggleBtn) {
        sidebar.classList.add('collapsed');
        toggleBtn.textContent = '▶';
        sidebarState.primaryCollapsed = true;
        
        // 지도 크기 변경 후 리사이즈 및 마커 재표시
        setTimeout(() => {
          resizeMapAndRefreshMarkers();
        }, 500);
      }
    }
  }
  
  if (secondaryCollapsed) {
    const secondaryPanel = document.getElementById('secondaryPanel');
    const toggleBtn = document.getElementById('secondaryPanelToggleBtn');
    if (secondaryPanel && toggleBtn) {
      secondaryPanel.classList.add('collapsed');
      toggleBtn.textContent = '▶';
      sidebarState.secondaryCollapsed = true;
    }
  }
}

// 사이드바 토글 이벤트 리스너 설정
function setupSidebarToggles() {
  // 1차 사이드바 토글
  const primaryToggleBtn = document.getElementById('sidebarToggleBtn');
  if (primaryToggleBtn) {
    primaryToggleBtn.addEventListener('click', togglePrimarySidebar);
  }
  
  // 2차 사이드바 토글
  const secondaryToggleBtn = document.getElementById('secondaryPanelToggleBtn');
  if (secondaryToggleBtn) {
    secondaryToggleBtn.addEventListener('click', toggleSecondarySidebar);
  }
  
  // 상태 복원
  restoreSidebarState();
}

/*******************************
 * ===== 전역 함수 export =====
 *******************************/

// 사이드바 토글 함수를 전역으로 노출 (터치 제스처에서 사용)
window.togglePrimarySidebar = togglePrimarySidebar;
window.toggleSecondarySidebar = toggleSecondarySidebar;

// 전역으로 export
window.showToast = showToast;
window.togglePrimarySidebar = togglePrimarySidebar;
window.toggleSecondarySidebar = toggleSecondarySidebar;
window.setupSidebarToggles = setupSidebarToggles;
window.resizeMapAndRefreshMarkers = resizeMapAndRefreshMarkers;

/*******************************
 * ===== 모듈 로드 시작 =====
 *******************************/

// 페이지 로드 시 모듈 로드 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadModules);
} else {
  loadModules();
} 