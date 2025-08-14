/* -----------------------------------------
 * map-core.js - 지도 핵심 기능
 * ----------------------------------------- */

/**************************************
 * ===== 지도 초기화 =====
 **************************************/

function initMap() {
  console.log("🔍 initMap 호출됨");
  
  // 이미 초기화된 경우 early return
  if (typeof MAP !== 'undefined' && MAP && MAP_READY) {
    console.log("✅ 지도가 이미 초기화됨");
    return;
  }
  
  console.log("window.naver:", window.naver);
  console.log("window.naver.maps:", window.naver?.maps);
  
  // 네이버 지도 API가 완전히 로드되었는지 확인
  if (!window.naver || !window.naver.maps || typeof naver.maps.Map !== 'function' || typeof naver.maps.LatLng !== 'function') {
    console.log("[initMap] window.naver.maps가 아직 완전히 로드되지 않았습니다. 500ms 후 재시도");
    console.log('🔍 naver:', !!window.naver);
    console.log('🔍 naver.maps:', !!window.naver?.maps);
    console.log('🔍 naver.maps.Map:', typeof window.naver?.maps?.Map);
    console.log('🔍 naver.maps.LatLng:', typeof window.naver?.maps?.LatLng);
    
    // 무한 루프 방지: 최대 10번만 재시도
    if (!window.initMapRetryCount) {
      window.initMapRetryCount = 0;
    }
    
    if (window.initMapRetryCount < 10) {
      window.initMapRetryCount++;
      console.log(`🔄 재시도 ${window.initMapRetryCount}/10`);
      setTimeout(initMap, 500);
    } else {
      console.error("❌ 네이버 지도 API 로드 실패 - 최대 재시도 횟수 초과");
      showToast("네이버 지도 API를 로드할 수 없습니다. 페이지를 새로고침해주세요.", "error");
      // 재시도 카운터 리셋
      window.initMapRetryCount = 0;
    }
    return;
  }
  
  // 성공적으로 로드되면 재시도 카운터 리셋
  window.initMapRetryCount = 0;

  dbg("initMap 호출");
  
  // MarkerClustering.js 동적 로드
  if (typeof loadMarkerClustering === 'function') {
    loadMarkerClustering();
  } else {
    console.log('⚠️ loadMarkerClustering 함수가 아직 로드되지 않았습니다.');
  }

  try {
    console.log('🗺️ 지도 객체 생성 시작...');
    
    // 지도 컨테이너 확인
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('❌ 지도 컨테이너(#map)를 찾을 수 없습니다.');
      showToast('지도 컨테이너를 찾을 수 없습니다.', 'error');
      return;
    }
    
    MAP = new naver.maps.Map('map', {
      center: new naver.maps.LatLng(37.4933485, 126.7225676),
      zoom: 18,
      mapTypeControl: false
    });
    console.log('✅ 지도 객체 생성 완료:', MAP);
    
    // 지도가 성공적으로 생성되었는지 확인
    if (!MAP) {
      throw new Error('지도 객체 생성 실패');
    }
    
  } catch (error) {
    console.error('❌ 지도 객체 생성 실패:', error);
    showToast('지도를 초기화할 수 없습니다: ' + error.message, 'error');
    return;
  }

  naver.maps.Event.addListener(MAP, 'click', (e) => {
    // 거리제기 모드일 때는 다른 동작 수행
    if (IS_DISTANCE_MODE) {
      handleDistanceClick(e);
      return;
    }
    
    // 거리뷰 레이어가 활성화된 경우 클릭 이벤트 처리
    if (MAP._streetLayer) {
      console.log('📍 지도 클릭 (거리뷰 레이어 활성화됨):', e.coord);
      console.log('🔄 거리뷰 레이어 클릭 이벤트 시뮬레이션');
      
      // 거리뷰 레이어 클릭 이벤트를 직접 호출
      if (e.coord) {
        console.log('🔄 openPanorama 함수 호출 시작');
        openPanorama(e.coord);
      }
      return;
    }
    
    // 기존 동작
    hideClusterList();
    const secondaryPanel = document.getElementById('secondaryPanel');
    if (secondaryPanel) {
      secondaryPanel.classList.add('hidden');
      secondaryPanel.classList.remove('visible');
    }
    clearSelection();
  });
  
  // 거리제기 더블클릭 이벤트
  naver.maps.Event.addListener(MAP, 'dblclick', (e) => {
    if (IS_DISTANCE_MODE) {
      handleDistanceDoubleClick(e);
    }
  });
  
  // 거리제기 우클릭 이벤트 (삭제)
  naver.maps.Event.addListener(MAP, 'rightclick', (e) => {
    if (IS_DISTANCE_MODE && DISTANCE_POINTS.length > 0) {
      handleDistanceRightClick(e);
    }
  });

  // CSS Grid 레이아웃을 사용하므로 setLayoutHeight 호출 제거
  // 대신 지도 리사이즈만 트리거
  requestAnimationFrame(() => {
    naver.maps.Event.trigger(MAP, 'resize');
  });

  MAP_READY = true;
  if (typeof MAP_READY_QUEUE !== 'undefined' && MAP_READY_QUEUE && MAP_READY_QUEUE.length > 0) {
    while (MAP_READY_QUEUE.length > 0) {
      try {
        const fn = MAP_READY_QUEUE.shift();
        fn && fn();
      } catch (err) {
        console.error('[MAP_READY_QUEUE] 실행 중 오류', err);
      }
    }
  }

  naver.maps.Event.addListener(MAP, 'idle', () => {
    if (!MAP_READY) return;

    const zoom = MAP.getZoom();
    const THRESHOLD = 14;
    if (zoom < THRESHOLD) {
      if (typeof UI_STATE !== 'undefined' && UI_STATE && UI_STATE.isBriefingListMode) {
        if (typeof renderBriefingList === 'function') {
          renderBriefingList();
        }
      } else {
        if (typeof renderListingList === 'function') {
          renderListingList([]);
        }
      }
      if (typeof updateCountsDisplay === 'function' && typeof LISTINGS !== 'undefined') {
        updateCountsDisplay(LISTINGS.length, 0);
      }
      return;
    }

    const bounds = MAP.getBounds();
    if (typeof FILTERED_LISTINGS !== 'undefined' && FILTERED_LISTINGS) {
      const visibleItems = FILTERED_LISTINGS.filter(item => {
        const { lat, lng } = item.coords || {};
        if (lat == null || lng == null) return false;
        
        // naver.maps.LatLng 생성 시 더 강력한 안전장치
        try {
          // naver.maps API가 완전히 로드되었는지 확인
          if (!window.naver || !window.naver.maps || typeof naver.maps.LatLng !== 'function') {
            console.error('❌ naver.maps.LatLng이 사용할 수 없습니다.');
            return false;
          }
          
          // 좌표 값이 유효한지 확인
          const latNum = parseFloat(lat);
          const lngNum = parseFloat(lng);
          
          if (isNaN(latNum) || isNaN(lngNum)) {
            return false;
          }
          
          const latLng = new naver.maps.LatLng(latNum, lngNum);
          
          // 생성된 객체가 유효한지 확인
          if (!latLng || typeof latLng.lat !== 'function' || typeof latLng.lng !== 'function') {
            console.error('❌ 생성된 LatLng 객체가 유효하지 않습니다.');
            return false;
          }
          
          return bounds.hasLatLng(latLng);
        } catch (error) {
          console.error(`❌ LatLng 생성 실패: lat=${lat}, lng=${lng}`, error);
          return false;
        }
      });
      
      if (typeof sortListingsInPlace === 'function') {
        sortListingsInPlace(visibleItems);
      }
      
      // 브리핑리스트 모드일 때는 브리핑리스트를 렌더링, 아니면 일반 매물리스트
      if (typeof UI_STATE !== 'undefined' && UI_STATE && UI_STATE.isBriefingListMode) {
        if (typeof renderBriefingList === 'function') {
          renderBriefingList();
        }
      } else {
        if (typeof renderListingList === 'function') {
          renderListingList(visibleItems);
        }
      }
      
      if (typeof updateCountsDisplay === 'function') {
        updateCountsDisplay(FILTERED_LISTINGS.length, visibleItems.length);
      }
    }
  });

  document.dispatchEvent(new Event('map-ready'));
  
  // 클러스터 클릭 위임 바인딩
  setTimeout(() => {
    if (typeof bindClusterClickDelegation === 'function') {
      bindClusterClickDelegation();
    }
  }, 500);
  
  // 추가로 마커가 배치된 후에도 바인딩
  setTimeout(() => {
    if (typeof bindClusterClickDelegation === 'function') {
      bindClusterClickDelegation();
    }
  }, 1000);
  
  // 지도 컨트롤 초기화
  if (typeof initMapControls === 'function') {
    initMapControls();
  }
}

/**************************************
 * ===== 세션 사용자 동기화 =====
 **************************************/

async function syncUserFromSession() {
  try {
    console.log("🔄 사용자 세션 동기화 시작...");
    
    // 현재 사용자 정보 가져오기
    const currentUserEmail = localStorage.getItem("X-USER");
    
    const headers = { "Accept": "application/json" };
    if (currentUserEmail) {
      headers["X-User"] = currentUserEmail;
      console.log("🔐 X-User 헤더 설정:", currentUserEmail);
    }
    
    const res = await fetch("/api/me", { 
      headers: headers, 
      credentials: 'include' 
    });
    
    console.log("📡 /api/me 응답 상태:", res.status, res.statusText);
    
    if (!res.ok) {
      console.warn("⚠️ /api/me 응답 실패:", res.status);
      // 세션이 없지만 localStorage에 사용자 정보가 있는 경우
      if (currentUserEmail) {
        console.log("ℹ️ 세션 없음, localStorage 사용자 정보 사용:", currentUserEmail);
        if (typeof setCurrentUser === 'function') {
          setCurrentUser(currentUserEmail);
        }
        return true;
      }
      return false;
    }
    
    const data = await res.json();
    console.log("📦 /api/me 응답 데이터:", data);

    // /api/me 응답은 두 가지 케이스를 지원한다:
    // 1) { user: { email, role, ... } }
    // 2) { logged_in: true, email: "...", is_admin: bool }
    let userPayload = null;
    if (data && data.user) {
      userPayload = data.user;
    } else if (data && (data.email || data.logged_in)) {
      userPayload = {
        email: data.email || "",
        role: data.is_admin ? "admin" : "user"
      };
    }
    
    if (userPayload && userPayload.email) {
      console.log("✅ 사용자 정보 확인됨:", userPayload.email);
      
      if (typeof setCurrentUser === 'function') {
        setCurrentUser(userPayload.email);
      }

      // 어드민 권한 정보 저장
      if (userPayload.role === 'admin') {
        localStorage.setItem("X-USER-ADMIN", "true");
        console.log("✅ 어드민 권한 확인됨:", userPayload.email);
      } else {
        localStorage.removeItem("X-USER-ADMIN");
        console.log("ℹ️ 일반 사용자:", userPayload.email);
      }

      const usEl = document.getElementById('userStatus');
      if (usEl) {
        const roleText = userPayload.role === 'admin' ? `어드민: ${userPayload.email}` : `사용자: ${userPayload.email}`;
        usEl.textContent = roleText;
      }
      
      const lo = document.getElementById('logoutBtn');
      const mu = document.getElementById('manualUserWrap');
      if (lo) lo.classList.remove('hidden');
      if (mu) mu.classList.add('hidden');

      if (typeof hideLoginScreen === 'function') {
        hideLoginScreen();
      }
      
      // 어드민 UI 토글
      if (typeof toggleAdminUI === 'function') {
        toggleAdminUI(userPayload.role === 'admin');
      }
      
      console.log("✅ 사용자 세션 동기화 완료");
      return true;
    } else {
      console.warn("⚠️ 사용자 정보가 없음");
      // 세션이 없지만 localStorage에 사용자 정보가 있는 경우
      if (currentUserEmail) {
        console.log("ℹ️ 세션 없음, localStorage 사용자 정보 사용:", currentUserEmail);
        if (typeof setCurrentUser === 'function') {
          setCurrentUser(currentUserEmail);
        }
        return true;
      }
    }
  } catch (e) {
    console.error("❌ 사용자 세션 로드 실패", e);
    // 에러 발생 시 localStorage 사용자 정보 사용
    const currentUserEmail = localStorage.getItem("X-USER");
    if (currentUserEmail) {
      console.log("ℹ️ 에러 발생, localStorage 사용자 정보 사용:", currentUserEmail);
      if (typeof setCurrentUser === 'function') {
        setCurrentUser(currentUserEmail);
      }
      return true;
    }
  }
  
  console.log("❌ 사용자 세션 동기화 실패");
  return false;
}

// 지도 핵심 함수들을 전역으로 export
window.initMap = initMap;
window.syncUserFromSession = syncUserFromSession; 