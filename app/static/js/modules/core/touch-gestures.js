/* -----------------------------------------
 * touch-gestures.js - 터치 제스처 관리
 * -----------------------------------------
 * 모바일 환경에서 사이드바 스와이프 제스처 지원
 * ----------------------------------------- */

/**************************************
 * ===== 터치 제스처 관리 =====
 **************************************/

// 터치 제스처 상태 관리
const touchState = {
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  isSwiping: false,
  isDragging: false,
  startTime: 0,
  minSwipeDistance: 60, // 최소 스와이프 거리를 60px로 조정
  maxSwipeTime: 600,    // 최대 스와이프 시간을 600ms로 늘림
  isEnabled: false,     // 터치 제스처 활성화 여부
  isMobileMode: false,  // 모바일 모드 여부 (위로 스와이프)
  sidebarHeight: 0,     // 사이드바 현재 높이
  maxHeight: 0,         // 최대 높이
  minHeight: 40,        // 최소 높이 (노치만 보이는 상태)
  halfHeight: 0         // 화면 절반 높이
};

// 터치 제스처 초기화
function initTouchGestures() {
  console.log('📱 터치 제스처 초기화 시작...');
  
  // 모바일 환경에서만 활성화
  if (window.innerWidth <= 768) {
    touchState.isEnabled = true;
    touchState.isMobileMode = true; // 모바일 모드 활성화
    touchState.maxHeight = window.innerHeight; // 최대 높이 설정
    touchState.halfHeight = window.innerHeight * 0.5; // 화면 절반 높이 설정
    setupTouchEventListeners();
    console.log('✅ 터치 제스처 활성화됨 (모바일 환경 - 드래그 가능한 하단바)');
  } else {
    console.log('📱 터치 제스처 비활성화됨 (PC 환경)');
  }
}

// 터치 이벤트 리스너 설정
function setupTouchEventListeners() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const mobileNotch = document.querySelector('.mobile-notch');
  
  if (!sidebar || !mainContent) {
    console.error('❌ 사이드바 또는 메인 콘텐츠를 찾을 수 없습니다.');
    return;
  }
  
  // 노치에 직접 클릭 이벤트 추가
  if (mobileNotch) {
    mobileNotch.addEventListener('click', handleNotchClick);
    console.log('✅ 노치 클릭 이벤트 리스너 설정 완료');
  }
  
  // 사이드바 터치 이벤트 (모든 이벤트를 passive: true로 설정)
  sidebar.addEventListener('touchstart', handleTouchStart, { passive: true });
  sidebar.addEventListener('touchmove', handleTouchMove, { passive: true });
  sidebar.addEventListener('touchend', handleTouchEnd, { passive: true });
  
  // 메인 콘텐츠 터치 이벤트 (지도 영역)
  mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
  mainContent.addEventListener('touchmove', handleTouchMove, { passive: true });
  mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });
  
  console.log('✅ 터치 이벤트 리스너 설정 완료');
}

// 노치 클릭 처리
function handleNotchClick(event) {
  console.log('📱 노치 클릭 감지');
  event.preventDefault();
  event.stopPropagation();
  
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) {
    console.error('❌ 사이드바를 찾을 수 없습니다.');
    return;
  }
  
  // 노치 클릭 시 화면 절반 크기로 토글
  if (sidebar.classList.contains('collapsed')) {
    // 열린 상태 -> 닫기 (노치만 보이게)
    sidebar.classList.remove('collapsed');
    sidebar.style.transform = `translateY(calc(100% - 40px))`;
    sidebar.style.height = '40px';
    sidebar.style.maxHeight = '40px';
    console.log('📱 사이드바 닫힘 (노치만 보임)');
  } else {
    // 닫힌 상태 -> 열기 (화면 절반 크기)
    sidebar.classList.add('collapsed');
    sidebar.style.transform = 'translateY(0)';
    sidebar.style.height = '50vh';
    sidebar.style.maxHeight = '50vh';
    console.log('📱 사이드바 열림 (화면 절반 크기)');
  }
  
  // 지도 크기 변경 후 마커 재표시
  setTimeout(() => {
    if (window.resizeMapAndRefreshMarkers) {
      window.resizeMapAndRefreshMarkers();
    }
  }, 350);
}

// 터치 시작 처리
function handleTouchStart(event) {
  if (!touchState.isEnabled) return;
  
  const touch = event.touches[0];
  touchState.startX = touch.clientX;
  touchState.startY = touch.clientY;
  touchState.currentX = touch.clientX;
  touchState.currentY = touch.clientY;
  touchState.startTime = Date.now();
  touchState.isSwiping = false;
  touchState.isDragging = false;
  
  // 현재 사이드바 높이 계산
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const transform = window.getComputedStyle(sidebar).transform;
    const matrix = new DOMMatrix(transform);
    touchState.sidebarHeight = touchState.maxHeight - matrix.m42;
  }
  
  // 사이드바 내부 요소 터치 시에는 제스처 처리하지 않음
  const target = event.target;
  if (target.closest('#sidebar .listing-item') || 
      target.closest('#sidebar .scrollable-content') ||
      target.closest('#sidebar button') ||
      target.closest('#sidebar input') ||
      target.closest('#sidebar select') ||
      target.closest('#sidebar .listing-list') ||
      target.closest('#sidebar .filter-section')) {
    return;
  }
}

// 터치 이동 처리
function handleTouchMove(event) {
  if (!touchState.isEnabled) return;
  
  const touch = event.touches[0];
  touchState.currentX = touch.clientX;
  touchState.currentY = touch.clientY;
  
  const deltaX = Math.abs(touchState.currentX - touchState.startX);
  const deltaY = Math.abs(touchState.currentY - touchState.startY);
  
  if (touchState.isMobileMode) {
    // 모바일 모드: 수직 스와이프가 수평 스와이프보다 클 때만 처리
    if (deltaY > deltaX && deltaY > 15) { // 임계값을 15px로 낮춤
      touchState.isSwiping = true;
      touchState.isDragging = true;
      
      // 드래그 중일 때 실시간으로 사이드바 높이 조정
      const sidebar = document.getElementById('sidebar');
      if (sidebar && touchState.isDragging) {
        const deltaY = touchState.startY - touchState.currentY; // 위로 드래그하면 양수
        const newHeight = Math.max(touchState.minHeight, 
                                  Math.min(touchState.maxHeight, 
                                          touchState.sidebarHeight + deltaY));
        const translateY = touchState.maxHeight - newHeight;
        sidebar.style.transform = `translateY(${translateY}px)`;
        sidebar.style.transition = 'none'; // 드래그 중에는 애니메이션 비활성화
      }
    }
  } else {
    // PC 모드: 수평 스와이프가 수직 스와이프보다 클 때만 처리
    if (deltaX > deltaY && deltaX > 15) {
      touchState.isSwiping = true;
    }
  }
}

// 터치 종료 처리
function handleTouchEnd(event) {
  if (!touchState.isEnabled) return;
  
  // 사이드바 내부 요소 터치 시에는 제스처 처리하지 않음
  const target = event.target;
  if (target.closest('#sidebar .listing-item') || 
      target.closest('#sidebar .scrollable-content') ||
      target.closest('#sidebar button') ||
      target.closest('#sidebar input') ||
      target.closest('#sidebar select') ||
      target.closest('#sidebar .listing-list') ||
      target.closest('#sidebar .filter-section')) {
    return;
  }
  
  const deltaX = touchState.currentX - touchState.startX;
  const deltaY = touchState.currentY - touchState.startY;
  const deltaTime = Date.now() - touchState.startTime;
  
  if (touchState.isMobileMode) {
    // 드래그가 끝났을 때 애니메이션 복원
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.style.transition = 'transform 0.3s ease';
    }
    
    // 현재 사이드바 높이에 따라 상태 결정
    const currentTransform = window.getComputedStyle(sidebar).transform;
    const matrix = new DOMMatrix(currentTransform);
    const currentHeight = touchState.maxHeight - matrix.m42;
    
    // 높이의 50%를 기준으로 열림/닫힘 결정
    const threshold = touchState.maxHeight * 0.5;
    
         if (currentHeight > threshold) {
       // 대부분 열린 상태 -> 완전히 열기
       sidebar.style.transform = 'translateY(0)';
       sidebar.classList.add('collapsed');
       console.log('📱 사이드바 완전 열림');
     } else {
       // 대부분 닫힌 상태 -> 노치만 보이게
       sidebar.style.transform = 'translateY(calc(100% - 40px))';
       sidebar.classList.remove('collapsed');
       console.log('📱 사이드바 노치 상태');
     }
    
    // 지도 크기 변경 후 마커 재표시
    setTimeout(() => {
      if (window.resizeMapAndRefreshMarkers) {
        window.resizeMapAndRefreshMarkers();
      }
    }, 350);
  } else {
    // PC 모드: 수평 스와이프 조건 확인 (기존 로직)
    if (Math.abs(deltaX) >= touchState.minSwipeDistance && 
        deltaTime <= touchState.maxSwipeTime &&
        deltaY < Math.abs(deltaX) * 0.5) { // 수직 이동 제한을 50%로 완화
      
      // 스와이프 방향에 따라 사이드바 토글
      if (deltaX > 0) {
        // 오른쪽으로 스와이프 → 사이드바 펼치기
        console.log('📱 오른쪽 스와이프 감지: 사이드바 펼치기');
        if (window.togglePrimarySidebar && document.getElementById('sidebar').classList.contains('collapsed')) {
          window.togglePrimarySidebar();
          // 지도 크기 변경 후 마커 재표시
          setTimeout(() => {
            if (window.resizeMapAndRefreshMarkers) {
              window.resizeMapAndRefreshMarkers();
            }
          }, 350);
        }
      } else {
        // 왼쪽으로 스와이프 → 사이드바 접기
        console.log('📱 왼쪽 스와이프 감지: 사이드바 접기');
        if (window.togglePrimarySidebar && !document.getElementById('sidebar').classList.contains('collapsed')) {
          window.togglePrimarySidebar();
          // 지도 크기 변경 후 마커 재표시
          setTimeout(() => {
            if (window.resizeMapAndRefreshMarkers) {
              window.resizeMapAndRefreshMarkers();
            }
          }, 350);
        }
      }
    }
  }
  
  // 상태 초기화
  touchState.isSwiping = false;
  touchState.isDragging = false;
  touchState.startX = 0;
  touchState.startY = 0;
  touchState.currentX = 0;
  touchState.currentY = 0;
  touchState.startTime = 0;
}

// 터치 제스처 활성화/비활성화 토글
function toggleTouchGestures() {
  touchState.isEnabled = !touchState.isEnabled;
  console.log(`📱 터치 제스처 ${touchState.isEnabled ? '활성화' : '비활성화'}됨`);
  
  if (touchState.isEnabled) {
    setupTouchEventListeners();
  } else {
    removeTouchEventListeners();
  }
}

// 터치 이벤트 리스너 제거
function removeTouchEventListeners() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const mobileNotch = document.querySelector('.mobile-notch');
  
  if (sidebar) {
    sidebar.removeEventListener('touchstart', handleTouchStart);
    sidebar.removeEventListener('touchmove', handleTouchMove);
    sidebar.removeEventListener('touchend', handleTouchEnd);
  }
  
  if (mainContent) {
    mainContent.removeEventListener('touchstart', handleTouchStart);
    mainContent.removeEventListener('touchmove', handleTouchMove);
    mainContent.removeEventListener('touchend', handleTouchEnd);
  }
  
  if (mobileNotch) {
    mobileNotch.removeEventListener('click', handleNotchClick);
  }
}

// 화면 크기 변경 시 터치 제스처 재설정
function handleResize() {
  const wasEnabled = touchState.isEnabled;
  const shouldBeEnabled = window.innerWidth <= 768;
  
  if (wasEnabled !== shouldBeEnabled) {
    if (shouldBeEnabled) {
      touchState.isEnabled = true;
      setupTouchEventListeners();
      console.log('📱 터치 제스처 활성화됨 (화면 크기 변경)');
    } else {
      touchState.isEnabled = false;
      removeTouchEventListeners();
      console.log('📱 터치 제스처 비활성화됨 (화면 크기 변경)');
    }
  }
}

// 전역 함수로 노출
window.initTouchGestures = initTouchGestures;
window.toggleTouchGestures = toggleTouchGestures;
window.handleResize = handleResize;

console.log('📱 터치 제스처 모듈 로드 완료');
