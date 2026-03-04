/* -----------------------------------------
 * map-core.js - 지도 핵심 기능
 * ----------------------------------------- */

/**************************************
 * ===== 지도 초기화 =====
 **************************************/

function initMap() {
  console.log("🔍 initMap 호출됨");
  if (typeof MAP !== 'undefined' && MAP && MAP_READY) {
    console.log("✅ 지도가 이미 초기화됨");
    return;
  }
  if (!window.naver || !window.naver.maps || typeof naver.maps.Map !== 'function' || typeof naver.maps.LatLng !== 'function') {
    if (!window.initMapRetryCount) window.initMapRetryCount = 0;
    if (window.initMapRetryCount < 10) {
      window.initMapRetryCount++;
      setTimeout(initMap, 500);
    } else {
      console.error("❌ 네이버 지도 API 로드 실패");
      showToast("지도 API 로드 실패로 지도가 표시되지 않습니다. 데이터 목록만 확인 가능합니다.", "warning");

      // 지도 없이도 앱이 동작할 수 있도록 강제 이벤트 발생
      window.MAP = null;
      window.MAP_READY = false;
      document.dispatchEvent(new CustomEvent('map-ready'));
    }
    return;
  }
  window.initMapRetryCount = 0;

  if (typeof loadMarkerClustering === 'function') loadMarkerClustering();

  try {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    // 모바일인 경우에만 위치 정보를 가져와 중심점 설정
    if (window.MOBILE_APP && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const center = new naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
          setupMapInstance(center, 17);
        },
        () => setupMapInstance(new naver.maps.LatLng(37.4931458, 126.7227149), 19),
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      // PC나 위치 정보 미지원 시 즉시 기본 좌표로 초기화
      setupMapInstance(new naver.maps.LatLng(37.4931458, 126.7227149), 19);
    }

    function setupMapInstance(center, zoom) {
      MAP = new naver.maps.Map('map', { center, zoom, mapTypeControl: false });

      // 브라우저 기본 컨텍스트 메뉴 차단
      const mapContainer = document.getElementById('map');
      if (mapContainer) {
        mapContainer.addEventListener('contextmenu', (e) => {
          e.preventDefault();
        });
      }

      window.MAP = MAP;
      MAP_READY = true;
      window.MAP_READY = true;
      document.dispatchEvent(new CustomEvent('map-ready'));

      registerMapEvents();
      setupMapControls();
      startLocationTracking(); // 실시간 추적 시작
    }

    function setupMapControls() {
      let retry = 0;
      const wait = () => {
        if (typeof window.initMapControls === 'function') window.initMapControls();
        else if (retry++ < 30) setTimeout(wait, 200);
      };
      wait();
    }
  } catch (e) {
    console.error('❌ 지도 초기화 실패:', e);
  }
}

function registerMapEvents() {
  naver.maps.Event.addListener(MAP, 'click', (e) => {
    if (window._LAST_LONG_TAP_AT && Date.now() - window._LAST_LONG_TAP_AT < 450) return;
    if (typeof window.hideMapContextMenu === 'function') window.hideMapContextMenu();
    if (typeof window.closeAddressPopup === 'function') window.closeAddressPopup();
    if (window.IS_DISTANCE_MODE) { handleDistanceClick(e); return; }
    if (window.IS_RADIUS_MODE) { handleRadiusClick(e); return; }
    if (MAP._streetLayer && e.coord) { openPanorama(e.coord); return; }

    hideClusterList();
    const sp = document.getElementById('secondaryPanel');
    if (sp) { sp.classList.add('hidden'); sp.classList.remove('visible'); }
    clearSelection();
  });

  naver.maps.Event.addListener(MAP, 'idle', () => {
    if (!MAP_READY) return;
    if (window.isProcessingIdle) return;

    const zoom = MAP.getZoom();
    const bounds = MAP.getBounds();

    // 성능 최적화: 지도 영역 변경 감지 (백업 로직 기반)
    if (LAST_MAP_BOUNDS &&
      window.LAST_MAP_ZOOM === zoom &&
      typeof LAST_MAP_BOUNDS.getNorthEast === 'function' &&
      LAST_MAP_BOUNDS.getNorthEast().equals(bounds.getNorthEast()) &&
      LAST_MAP_BOUNDS.getSouthWest().equals(bounds.getSouthWest())) {
      return;
    }

    window.isProcessingIdle = true;
    LAST_MAP_BOUNDS = bounds;
    window.LAST_MAP_ZOOM = zoom;

    try {
      if (zoom < 14) {
        if (typeof renderBriefingList === 'function' && UI_STATE?.isBriefingListMode) {
          renderBriefingList();
        } else if (typeof renderListingList === 'function') {
          renderListingList([]);
        }
      }

      if (typeof applyAllFilters === 'function') {
        applyAllFilters();
      }
    } catch (err) {
      console.error("❌ idle 이벤트 처리 중 오류:", err);
    } finally {
      setTimeout(() => {
        window.isProcessingIdle = false;
      }, 150);
    }
  });

  // 기타 이벤트 리스너 (dblclick, rightclick, longtap 등 기존 로직 유지)
  naver.maps.Event.addListener(MAP, 'dblclick', e => window.IS_DISTANCE_MODE && handleDistanceDoubleClick(e));
  naver.maps.Event.addListener(MAP, 'mousemove', e => {
    if (window.IS_RADIUS_MODE && window.RADIUS_CENTER && typeof handleRadiusMouseMove === 'function') {
      handleRadiusMouseMove(e);
    }
  });
  naver.maps.Event.addListener(MAP, 'rightclick', e => {
    if (window.IS_DISTANCE_MODE && window.DISTANCE_POINTS?.length > 0) return handleDistanceRightClick(e);
    if (window.IS_RADIUS_MODE) return handleRadiusRightClick(e);
    if (!window.MOBILE_APP && typeof window.showMapContextMenu === 'function') window.showMapContextMenu(e.coord);
  });
  naver.maps.Event.addListener(MAP, 'longtap', e => {
    if (window.MOBILE_APP && typeof window.showAddressAtCoord === 'function') window.showAddressAtCoord(e.coord, { isMobile: true });
  });
}

/* -----------------------------------------
 * 현재 위치 및 방향 표시 실시간 연동
 * ----------------------------------------- */
let CURRENT_LOCATION_MARKER = null;
let WATCH_ID = null;

async function startLocationTracking() {
  // 모바일 앱이 아니면 위치 추적 및 방향 표시를 하지 않음
  if (!window.MOBILE_APP) return;
  if (!navigator.geolocation) return;
  if (WATCH_ID) navigator.geolocation.clearWatch(WATCH_ID);

  WATCH_ID = navigator.geolocation.watchPosition(
    (pos) => {
      if (!MAP) return;
      const latLng = new naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      updateCurrentLocationMarker(latLng);
    },
    (err) => console.error("⚠️ 위치 추적 오류:", err),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
  window.WATCH_ID = WATCH_ID;
  setupOrientationListener();
}

function updateCurrentLocationMarker(latLng) {
  if (!MAP) return;
  const content = `
    <div class="current-location-marker-container">
      <div class="current-location-dot"></div>
      <div class="current-location-arrow" id="currentLocationArrow"></div>
    </div>`;

  if (!CURRENT_LOCATION_MARKER) {
    CURRENT_LOCATION_MARKER = new naver.maps.Marker({
      position: latLng,
      map: MAP,
      icon: { content, anchor: new naver.maps.Point(20, 20) },
      zIndex: 9999
    });
  } else {
    CURRENT_LOCATION_MARKER.setPosition(latLng);
  }
}

function setupOrientationListener() {
  if (!window.MOBILE_APP) return;

  const handler = (e) => {
    let heading = e.webkitCompassHeading || (e.alpha ? 360 - e.alpha : null);
    if (heading !== null) {
      const el = document.getElementById('currentLocationArrow');
      if (el) el.style.transform = `rotate(${heading}deg)`;
    }
  };

  // iOS 13+ 권한 요청 처리
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(s => {
      if (s === 'granted') {
        window.addEventListener('deviceorientation', handler);
      }
    }).catch(() => { });
  } else {
    // 기타 기기
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handler, true);
    } else {
      window.addEventListener('deviceorientation', handler, true);
    }
  }
}

async function syncUserFromSession() {
  try {
    const res = await fetch("/api/auth/me", { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    const user = data?.user;
    if (user?.email) {
      if (typeof setCurrentUser === 'function') setCurrentUser(user.email);
      const usEl = document.getElementById('userStatus');
      if (usEl) usEl.textContent = user.role === 'admin' ? `어드민: ${user.email}` : `사용자: ${user.email}`;
      const lo = document.getElementById('logoutBtn'), mu = document.getElementById('manualUserWrap');
      if (lo) lo.classList.remove('hidden'); if (mu) mu.classList.add('hidden');
      if (typeof hideLoginScreen === 'function') hideLoginScreen();
      if (typeof toggleAdminUI === 'function') toggleAdminUI(user.role === 'admin' || user.role === 'manager');
      return true;
    }
    return false;
  } catch (e) { return false; }
}

window.initMap = initMap;
window.syncUserFromSession = syncUserFromSession;
window.startLocationTracking = startLocationTracking;