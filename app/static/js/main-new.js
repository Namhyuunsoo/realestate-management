/* -----------------------------------------
 * main-new.js - 모듈화된 메인 진입점
 * -----------------------------------------
 * 이 파일은 모든 모듈을 순서대로 로드하고 초기화하는 메인 진입점입니다.
 * 기존 기능과 UI를 그대로 유지하면서 모듈화된 구조로 개선되었습니다.
 * ----------------------------------------- */

/*******************************
 * ===== 모듈 로드 시스템 =====
 *******************************/

// 모듈 로드 함수 (성능 측정 포함)
function loadModule(modulePath) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const script = document.createElement('script');
    script.src = modulePath;
    
    script.onload = () => {
      const endTime = performance.now();
      const loadTime = (endTime - startTime).toFixed(2);
      // 로그 제거로 성능 최적화
      resolve();
    };
    
    script.onerror = (error) => {
      console.error(`❌ ${modulePath.split('/').pop()} 로드 실패:`, error);
      reject(error);
    };
    
    document.head.appendChild(script);
  });
}

// 우선순위 기반 모듈 로드 함수
function loadModuleWithPriority(modulePath, priority = 'normal') {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const script = document.createElement('script');
    script.src = modulePath;
    
    // 우선순위에 따른 로딩 전략
    if (priority === 'critical') {
      script.setAttribute('data-priority', 'critical');
    } else if (priority === 'low') {
      script.setAttribute('data-priority', 'low');
    }
    
    script.onload = () => {
      const endTime = performance.now();
      const loadTime = (endTime - startTime).toFixed(2);
      // 로그 제거로 성능 최적화
      resolve();
    };
    
    script.onerror = (error) => {
      console.error(`❌ [${priority.toUpperCase()}] ${modulePath.split('/').pop()} 로드 실패:`, error);
      reject(error);
    };
    
    document.head.appendChild(script);
  });
}

// 지연 로딩 함수 (실제로 필요한 경우에만 사용)
function loadModuleLazy(modulePath, trigger = 'idle') {
  return new Promise((resolve, reject) => {
    const loadLazyModule = () => {
      loadModule(modulePath)
        .then(() => {
          console.log(`🔄 [LAZY] ${modulePath.split('/').pop()} 지연 로드 완료`);
          resolve();
        })
        .catch(reject);
    };
    
    if (trigger === 'user-interaction') {
      // 사용자 상호작용 시 로드
      const events = ['click', 'scroll', 'mousemove', 'keydown'];
      const loadOnce = () => {
        loadLazyModule();
        events.forEach(event => document.removeEventListener(event, loadOnce));
      };
      
      events.forEach(event => document.addEventListener(event, loadOnce, { once: true }));
    } else if (trigger === 'idle') {
      // 브라우저 유휴 시간에 로드
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadLazyModule);
      } else {
        setTimeout(loadLazyModule, 100);
      }
    } else if (trigger === 'immediate') {
      // 즉시 로드
      loadLazyModule();
    }
  });
}

// 병렬 모듈 로딩 시스템
async function loadModules() {
  try {
    // console.log('🚀 병렬 모듈 로딩 시작...');
    const startTime = performance.now();
    
    // 1단계: 핵심 모듈 (순차 로딩 - 의존성 있음)
    // console.log('📦 1단계: 핵심 모듈 로딩...');
    await loadModule('/static/js/modules/core/globals.js');
    // console.log('✅ globals.js 로드 완료');
    
    // 모바일 앱 높이 조정
    if (window.adjustMobileAppHeight) {
      window.adjustMobileAppHeight();
    }
    
    // 2단계: 독립적인 모듈들 (병렬 로딩)
    // console.log('📦 2단계: 독립 모듈 병렬 로딩...');
    const independentModules = [
      '/static/js/modules/core/user-utils.js',
      '/static/js/modules/core/api-cache.js',
      '/static/js/modules/core/mode-switcher.js',
      '/static/js/modules/core/utils.js',
      '/static/js/modules/core/touch-gestures.js',
      '/static/js/modules/ui/toast.js'
    ];
    
    await Promise.all(independentModules.map(async (modulePath) => {
      await loadModule(modulePath);
      // console.log(`✅ ${modulePath.split('/').pop()} 로드 완료`);
    }));
    
    // 3단계: 인증 및 데이터 모듈 (병렬 로딩)
    console.log('📦 3단계: 인증/데이터 모듈 병렬 로딩...');
    const authDataModules = [
      '/static/js/modules/auth/auth.js',
      '/static/js/modules/filters/briefing.js',
      '/static/js/modules/data/listings.js',
      '/static/js/modules/data/recommendations.js'
    ];
    
    await Promise.all(authDataModules.map(async (modulePath) => {
      await loadModule(modulePath);
      // console.log(`✅ ${modulePath.split('/').pop()} 로드 완료`);
    }));
    
    // 4단계: 지도 관련 모듈 (순차 로딩 - 의존성 있음)
    console.log('📦 4단계: 지도 모듈 순차 로딩...');
    const mapModules = [
      '/static/js/modules/map/map-clustering.js',
      '/static/js/modules/map/map-controls.js',
      '/static/js/modules/map/map-core.js',
      '/static/js/modules/map/map-markers.js'
    ];
    
    for (const modulePath of mapModules) {
      await loadModule(modulePath);
      // console.log(`✅ ${modulePath.split('/').pop()} 로드 완료`);
    }
    
    // 5단계: 핵심 UI 모듈들 (우선 로딩)
    console.log('📦 5단계: 핵심 UI 모듈 우선 로딩...');
    const criticalUIModules = [
      '/static/js/modules/ui/listing-list.js',
      '/static/js/modules/ui/panels.js',
      '/static/js/modules/ui/detail-panel.js',
      '/static/js/modules/ui/event-handlers.js',
      '/static/js/listing-list-modal.js'
    ];
    
    await Promise.all(criticalUIModules.map(async (modulePath) => {
      await loadModuleWithPriority(modulePath, 'critical');
    }));
    
    // 6단계: 일반 UI 모듈들 (병렬 로딩)
    console.log('📦 6단계: 일반 UI 모듈 병렬 로딩...');
    const normalUIModules = [
      '/static/js/modules/ui/full-list.js',
      '/static/js/modules/ui/full-briefing-list.js',
      '/static/js/modules/ui/briefing-list.js',
      '/static/js/modules/ui/customer-forms.js',
      '/static/js/modules/ui/customer-management.js',
      '/static/js/modules/ui/customer-list-detail.js',
      '/static/js/modules/ui/filter-modal.js'
    ];
    
    await Promise.all(normalUIModules.map(async (modulePath) => {
      await loadModule(modulePath);
    }));
    
    // 7단계: 관리자 전용 모듈들 (조건부 로딩)
    console.log('📦 7단계: 관리자 모듈 조건부 로딩...');
    const adminModules = [
      '/static/js/modules/ui/user-management.js',
      '/static/js/modules/ui/user-sheets.js',
      '/static/js/modules/ui/status-bar-sheets.js'
    ];
    
    // 관리자 모듈들은 즉시 로드 (이벤트 리스너 등록을 위해)
    await Promise.all(adminModules.map(async (modulePath) => {
      await loadModule(modulePath);
      // console.log(`✅ ${modulePath.split('/').pop()} 로드 완료`);
    }));
    
    // 8단계: 초기화 모듈 (마지막에 로드)
    console.log('📦 8단계: 초기화 모듈 로딩...');
    await loadModule('/static/js/modules/ui/initialization.js');
    // console.log('✅ initialization.js 로드 완료');
    
    // 매물리스트 모달 초기화 (이미 즉시 초기화됨)
    if (window.listingListModalManager) {
        console.log('✅ 매물리스트 모달이 이미 초기화됨');
    } else {
        console.warn('⚠️ 매물리스트 모달이 초기화되지 않음');
    }
    
    // 사이드바 토글 초기화
    setupSidebarToggles();
    // console.log('✅ 사이드바 토글 기능 초기화 완료');
    
    // 데이터 로딩은 initializeApplication()에서 통합 관리됨 (중복 제거)
    
    const endTime = performance.now();
    const loadTime = (endTime - startTime).toFixed(2);
    // console.log(`🎉 모든 모듈 로딩 완료! (총 ${loadTime}ms)`);
    
    // 성능 메트릭 수집
    const performanceMetrics = {
      totalLoadTime: loadTime,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connectionType: navigator.connection?.effectiveType || 'unknown'
    };
    
    // 성능 데이터를 localStorage에 저장 (선택적)
    if (window.DEBUG) {
      localStorage.setItem('moduleLoadPerformance', JSON.stringify(performanceMetrics));
      console.log('📊 성능 메트릭 저장됨:', performanceMetrics);
    }
    
    // 모든 모듈 로드 완료 후 앱 초기화 (모바일/PC 통합)
    await initializeApplication();
    
    // 9단계: 선택적 모듈 지연 로딩 (성능 최적화)
    console.log('📦 9단계: 선택적 모듈 지연 로딩...');
    const optionalModules = [
      // 향후 추가될 선택적 기능들
    ];
    
    // 선택적 모듈들을 브라우저 유휴 시간에 로드
    optionalModules.forEach(modulePath => {
      loadModuleLazy(modulePath, 'idle');
    });
    
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
    
    // 3. 모바일 감지 (안정화)
    const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    window.MOBILE_APP = isMobile;
    console.log(`📱 모바일 감지: ${window.MOBILE_APP}`);
    
    // 4. 사용자 세션 동기화 (모바일/PC 공통) - 통합된 초기화 로직
    try {
      if (window.checkSessionAndAutoLogin) {
        await window.checkSessionAndAutoLogin();
        console.log('✅ 세션 체크 및 자동 로그인 완료, currentUser:', window.currentUser);
      } else if (window.syncUserFromSession) {
        await window.syncUserFromSession();
        console.log('✅ 사용자 세션 동기화 완료, currentUser:', window.currentUser);
      } else if (window.loadUserFromStorage) {
        window.loadUserFromStorage();
        console.log('ℹ️ localStorage에서 사용자 정보 로드, currentUser:', window.currentUser);
      }
      
      // 모든 초기화 방법이 실패한 경우 localStorage에서 직접 복원
      if (!window.currentUser) {
        const savedUser = localStorage.getItem('X-USER');
        if (savedUser) {
          window.currentUser = savedUser;
          currentUser = savedUser;
          console.log('🔄 localStorage에서 currentUser 복원:', savedUser);
        }
      }
      
      // 전역 변수 동기화 보장
      if (window.currentUser && !currentUser) {
        currentUser = window.currentUser;
        console.log('🔄 currentUser 전역 변수 동기화:', currentUser);
      }
      
    } catch (error) {
      console.warn('⚠️ 사용자 세션 동기화 실패:', error);
      
      // 에러 발생 시에도 localStorage에서 사용자 정보 복원 시도
      const savedUser = localStorage.getItem('X-USER');
      if (savedUser) {
        window.currentUser = savedUser;
        currentUser = savedUser;
        console.log('🔄 에러 후 localStorage에서 currentUser 복원:', savedUser);
      }
    }
    
    // 5. 지도 초기화 (모바일/PC 공통)
    if (typeof window.initMap === 'function') {
      window.initMap();
      console.log('✅ 지도 초기화 완료');
    } else {
      console.error('❌ initMap 함수를 찾을 수 없습니다');
    }
    
    // 6. 앱 초기화 (모바일/PC 공통)
    if (window.initializeApp) {
      await window.initializeApp();
      console.log('✅ 앱 초기화 완료 (모바일/PC 공통)');
    }
    
    // 7. 모바일 전용 추가 초기화
    if (window.MOBILE_APP) {
      console.log('📱 모바일 전용 추가 초기화');
      
      // 모바일 버튼 초기화
      if (window.addMobileButtons) {
        window.addMobileButtons();
        console.log('✅ 모바일 버튼 초기화 완료');
      }
    }
    
    // 7. 모바일 필터 모달 초기화
    if (window.MOBILE_APP) {
      console.log('📱 모바일 환경: 필터 모달 초기화');
      if (typeof window.initializeFilterModal === 'function') {
        window.initializeFilterModal();
        console.log('✅ 모바일 필터 모달 초기화 완료');
      }
      if (typeof window.setupMobileFilterReplacement === 'function') {
        window.setupMobileFilterReplacement();
        console.log('✅ 모바일 필터 대체 설정 완료');
      }
    }
    
    // 8. 데이터 로드 (모바일/PC 공통)
    console.log('📊 데이터 로드 시작, currentUser:', window.currentUser);
    
    if (window.currentUser) {
      // 추천 데이터 먼저 로드
      if (typeof window.loadRecommendations === 'function') {
        await window.loadRecommendations();
        console.log('✅ 추천 데이터 로드 완료');
      }
      
      // 매물 데이터 로드
      if (typeof window.fetchListings === 'function') {
        await window.fetchListings();
        console.log('✅ 매물 데이터 로드 완료, FILTERED_LISTINGS:', window.FILTERED_LISTINGS?.length);
        
        // 모바일 환경에서 applyAllFilters 직접 호출
        if (window.MOBILE_APP && typeof window.applyAllFilters === 'function') {
          window.applyAllFilters();
          console.log('📱 모바일 환경: applyAllFilters 직접 호출 완료, FILTERED_LISTINGS:', window.FILTERED_LISTINGS?.length);
        }
      }
      
      // 마커 배치
      if (typeof window.placeMarkers === 'function' && window.FILTERED_LISTINGS && window.FILTERED_LISTINGS.length > 0) {
        window.placeMarkers(window.FILTERED_LISTINGS);
        console.log('✅ 마커 배치 완료, MARKERS:', window.MARKERS?.length);
      }
    } else {
      console.warn('⚠️ currentUser가 없어서 데이터 로드 건너뜀');
    }
    
    // 8. 터치 제스처 및 히스토리 초기화 (모바일 환경)
    if (window.MOBILE_APP) {
      if (window.initTouchGestures) {
        window.initTouchGestures();
        console.log('✅ 터치 제스처 초기화 완료');
      }
      
      if (window.initializeHistory) {
        window.initializeHistory();
        console.log('✅ 히스토리 관리 초기화 완료');
      }
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

// 2차 사이드바 토글 - 제거됨 (showSecondaryPanel/closeSecondaryPanel 함수 사용)

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
      
      // 마커들 재표시 (모바일 환경에서는 마커 재생성하지 않음)
      if (window.placeMarkers && typeof window.placeMarkers === 'function') {
        if (window.innerWidth <= 768) {
          console.log('📱 모바일 환경: 마커 재생성 건너뛰기 - 기존 마커 유지');
          return; // 모바일에서는 마커 재생성하지 않음
        }
        
        const delay = 100;
        
        setTimeout(() => {
          // 현재 필터링된 매물로 마커 재표시
          if (typeof window.FILTERED_LISTINGS !== 'undefined' && Array.isArray(window.FILTERED_LISTINGS)) {
            window.placeMarkers(window.FILTERED_LISTINGS);
          } else if (typeof window.LISTINGS !== 'undefined' && Array.isArray(window.LISTINGS)) {
            window.placeMarkers(window.LISTINGS);
          } else {
            console.warn('⚠️ 마커 재표시: 매물 데이터를 찾을 수 없습니다.');
          }
          console.log('✅ 마커 재표시 완료');
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
    // toggleSecondarySidebar 함수는 제거됨 (showSecondaryPanel/closeSecondaryPanel 사용)
    // secondaryToggleBtn.addEventListener('click', toggleSecondarySidebar);
  }
  
  // 상태 복원
  restoreSidebarState();
}

/*******************************
 * ===== 전역 함수 export =====
 *******************************/

// 사이드바 토글 함수를 전역으로 노출 (터치 제스처에서 사용)
window.togglePrimarySidebar = togglePrimarySidebar;
// toggleSecondarySidebar 함수는 제거됨 (showSecondaryPanel/closeSecondaryPanel 사용)

// 전역으로 export
window.showToast = showToast;
window.togglePrimarySidebar = togglePrimarySidebar;
// window.toggleSecondarySidebar = toggleSecondarySidebar; // 함수 제거됨
window.setupSidebarToggles = setupSidebarToggles;
window.resizeMapAndRefreshMarkers = resizeMapAndRefreshMarkers;

// 병렬 로딩 시스템 export
window.loadModule = loadModule;
window.loadModuleWithPriority = loadModuleWithPriority;
window.loadModuleLazy = loadModuleLazy;
window.loadModules = loadModules;

/*******************************
 * ===== 모듈 로드 시작 =====
 *******************************/

// 페이지 로드 시 모듈 로드 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadModules);
} else {
  loadModules();
} 