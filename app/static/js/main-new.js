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
    
    // 3. 인증 관련 함수들 (전역 변수에 의존)
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
    
    // 7. 지도 핵심 기능
    await loadModule('/static/js/modules/map/map-core.js');
    console.log('✅ map-core.js 로드 완료');
    
    // 8. 마커 관리
    await loadModule('/static/js/modules/map/map-markers.js');
    console.log('✅ map-markers.js 로드 완료');
    
    // 9. 지도 컨트롤 관리
    await loadModule('/static/js/modules/map/map-controls.js');
    console.log('✅ map-controls.js 로드 완료');
    
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
    
    // 3. 앱 초기화 실행
    if (window.initializeApp) {
      await window.initializeApp();
      console.log('✅ 앱 초기화 완료');
    } else {
      console.error('❌ initializeApp 함수를 찾을 수 없습니다.');
    }
    
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
 * ===== 전역 함수 export =====
 *******************************/

// 전역으로 export
window.showToast = showToast;

/*******************************
 * ===== 모듈 로드 시작 =====
 *******************************/

// 페이지 로드 시 모듈 로드 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadModules);
} else {
  loadModules();
} 