/* -----------------------------------------
 * map-controls.js - 지도 컨트롤 관리
 * ----------------------------------------- */

/**************************************
 * ===== 지도 컨트롤 관리 =====
 **************************************/

function initMapControls() {
  // MAP 객체가 준비되지 않은 경우 경고
  if (!window.MAP || !window.MAP.getCenter || !window.MAP.setMapTypeId) {
  }
  
  // 로드뷰 버튼
  const roadviewBtn = document.getElementById('roadviewBtn');
  if (roadviewBtn) {
    roadviewBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      // 성능 최적화: 즉시 실행
      requestAnimationFrame(() => {
        toggleRoadview();
      });
    });
  } else {
    console.error('❌ roadviewBtn을 찾을 수 없습니다.');
  }
  
  // 지적편집도 버튼
  const cadastralBtn = document.getElementById('cadastralBtn');
  if (cadastralBtn) {
    cadastralBtn.addEventListener('click', function(e) {
      e.preventDefault();
      requestAnimationFrame(() => {
        toggleCadastralMap();
      });
    });
  }
  
  // 거리제기 버튼
  const distanceBtn = document.getElementById('distanceBtn');
  if (distanceBtn) {
    distanceBtn.addEventListener('click', function(e) {
      e.preventDefault();
      requestAnimationFrame(() => {
        toggleDistanceMeasure();
      });
    });
  }
  
  // 로드뷰 닫기 버튼
  const roadviewCloseBtn = document.getElementById('roadviewCloseBtn');
  if (roadviewCloseBtn) {
    roadviewCloseBtn.addEventListener('click', function(e) {
      e.preventDefault();
      requestAnimationFrame(() => {
        closePanorama();
      });
    });
  } else {
    console.error('❌ roadviewCloseBtn을 찾을 수 없습니다.');
  }
  
  // 거리제기 핸들러는 이미 initMap에서 추가됨
  
  // 고객 필터 해제 버튼
  const clearCustomerFilterBtn = document.getElementById('clearCustomerFilterBtn');
  if (clearCustomerFilterBtn) {
    clearCustomerFilterBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔧 고객 필터 해제 버튼 클릭됨');
      
      // PC의 clearCustomerFilter 함수 호출
      if (typeof window.clearCustomerFilter === 'function') {
        window.clearCustomerFilter();
        console.log('✅ 고객 필터 해제 완료');
      } else {
        console.error('❌ clearCustomerFilter 함수를 찾을 수 없습니다');
      }
    });
  } else {
    console.error('❌ clearCustomerFilterBtn을 찾을 수 없습니다.');
  }
  
  // ESC 키로 거리제기 모드 해제
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && window.IS_DISTANCE_MODE) {
      toggleDistanceMeasure();
    }
  });
  
}

// 로드뷰 토글
function toggleRoadview() {
  const container = document.getElementById('roadviewContainer');
  if (!container) {
    console.error('❌ roadviewContainer를 찾을 수 없습니다.');
    return;
  }
  
  if (container.classList.contains('hidden')) {
    openRoadview();
  } else {
    closeRoadview();
  }
}

// 거리뷰 레이어 토글
function openRoadview() {
  
  // MAP 객체 확인 - 네이버 지도 객체인지 정확히 확인
  if (!window.MAP || !window.MAP.getCenter || !window.MAP.setMapTypeId) {
    console.error('❌ MAP 객체가 아직 준비되지 않았습니다.');
    console.error('❌ MAP 객체 상태:', {
      'window.MAP': !!window.MAP,
      'typeof window.MAP': typeof window.MAP,
      'window.MAP.getCenter': typeof window.MAP?.getCenter,
      'window.MAP.setMapTypeId': typeof window.MAP?.setMapTypeId,
      'window.MAP.constructor': window.MAP?.constructor?.name
    });
    
    if (typeof window.showToast === 'function') {
      window.showToast('지도가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.', 'warning');
    }
    
    // MAP 객체가 준비되지 않은 경우 1초 후 재시도
    setTimeout(() => {
      if (window.MAP && window.MAP.getCenter && window.MAP.setMapTypeId) {
        openRoadview();
      } else {
        console.error('❌ MAP 객체 재시도 실패');
        console.error('❌ 재시도 시 MAP 객체 상태:', {
          'window.MAP': !!window.MAP,
          'typeof window.MAP': typeof window.MAP,
          'window.MAP.getCenter': typeof window.MAP?.getCenter,
          'window.MAP.setMapTypeId': typeof window.MAP?.setMapTypeId
        });
      }
    }, 1000);
    
    return;
  }
  
  // 거리뷰 레이어가 이미 표시되어 있는지 확인
  if (window.MAP._streetLayer) {
    // 레이어 제거
    window.MAP._streetLayer.setMap(null);
    window.MAP._streetLayer = null;
    return;
  }
  
  // 거리뷰 레이어 생성 및 표시
  try {
    
    // StreetLayer 생성
    window.MAP._streetLayer = new naver.maps.StreetLayer();
    
    // 지도에 레이어 추가
    window.MAP._streetLayer.setMap(window.MAP);
    
    // 거리뷰 레이어 클릭 이벤트 - 가장 가까운 거리뷰 지점으로 자동 이동
    naver.maps.Event.addListener(window.MAP._streetLayer, 'click', function(e) {
      // 클릭한 위치에서 가장 가까운 거리뷰 지점으로 자동 이동
      if (e.coord) {
        openPanorama(e.coord);
      }
    });
    
    // 지도 클릭 이벤트에서도 거리뷰 레이어 클릭 처리
    naver.maps.Event.addListener(window.MAP, 'click', function(e) {
      if (window.MAP._streetLayer) {
        // 거리뷰 레이어 클릭 이벤트를 직접 호출
        if (e.coord) {
          openPanorama(e.coord);
        }
      }
    });
    
    // 거리뷰 레이어 에러 이벤트 (에러만 로그)
    naver.maps.Event.addListener(window.MAP._streetLayer, 'error', function(error) {
      console.error('❌ 거리뷰 레이어 에러:', error);
    });
    
    // 거리뷰 레이어 로드 완료 이벤트
    naver.maps.Event.addListener(window.MAP._streetLayer, 'load', function() {
      console.log('✅ 거리뷰 레이어 로드 완료');
    });
    
    // 거리뷰 레이어가 제대로 생성되었는지 확인
    setTimeout(() => {
      if (window.MAP._streetLayer) {
        
        // 지도 타입 확인
        
        // 레이어가 지도에 제대로 추가되었는지 확인
        if (window.MAP._streetLayer.getMap() === window.MAP) {
          console.log('✅ 거리뷰 레이어가 지도에 제대로 추가됨');
        } else {
          console.warn('⚠️ 거리뷰 레이어가 지도에 제대로 추가되지 않음');
        }
      } else {
        console.error('❌ 거리뷰 레이어가 생성되지 않음');
      }
    }, 500);
    
  } catch (error) {
    console.error('❌ 거리뷰 레이어 생성 실패:', error);
    console.error('❌ 에러 상세:', error.message, error.stack);
    if (typeof window.showToast === 'function') {
      window.showToast('거리뷰 레이어를 생성할 수 없습니다: ' + error.message, 'error');
    }
  }
}

// 거리뷰 레이어에서 클릭 시 파노라마 열기
function openPanorama(position) {
  const container = document.getElementById('roadviewContainer');
  const roadviewDiv = document.getElementById('roadview');
  const minimapContent = document.querySelector('.minimap-content');
  
  if (!container || !roadviewDiv) {
    console.error('❌ 필요한 DOM 요소를 찾을 수 없습니다.');
    return;
  }
  
  try {
    
    // 컨테이너 표시
    container.classList.remove('hidden');
    container.style.display = 'flex';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    container.style.pointerEvents = 'auto';
    
    // 컨테이너 크기 확인 (안전한 방식)
    const containerWidth = roadviewDiv.offsetWidth || window.innerWidth || 800;
    const containerHeight = roadviewDiv.offsetHeight || window.innerHeight || 600;
    
    // 파노라마를 roadview div에 생성 - 위치 정확성 향상
    const panoramaOptions = {
      position: position,
      pov: {
        pan: 0,
        tilt: 0,
        fov: 90
      },
      zoom: 1,
      enableWheel: true,
      enableKeyboard: true,
      enableDoubleClick: true,
      // 위치 정확성 향상을 위한 추가 옵션
      enableDoubleTap: true,
      enablePinch: true
    };
    
    // naver.maps.Size가 사용 가능한 경우에만 size 옵션 추가 (더 안전한 방식)
    if (naver && naver.maps && typeof naver.maps.Size === 'function') {
      try {
        // 컨테이너 크기가 유효한지 확인
        if (containerWidth > 0 && containerHeight > 0) {
          const size = new naver.maps.Size(containerWidth, containerHeight);
          // 생성된 객체가 유효한지 확인
          if (size && typeof size.width === 'function' && typeof size.height === 'function') {
            panoramaOptions.size = size;
          } else {
            delete panoramaOptions.size;
          }
        } else {
          delete panoramaOptions.size;
        }
      } catch (error) {
        delete panoramaOptions.size;
      }
    } else {
      delete panoramaOptions.size;
    }
    
    // 전역 변수에 저장
    window.ROADVIEW = new naver.maps.Panorama(roadviewDiv, panoramaOptions);
    
    // 미니맵 생성 (minimapContent가 있는 경우에만)
    if (minimapContent) {
      try {
        window.ROADVIEW_MINIMAP = new naver.maps.Map(minimapContent, {
          center: position,
          zoom: 15,
          mapTypeControl: false,
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          zoomControl: false,
          streetViewControl: false
        });
        
        // 현재 로드뷰 위치 및 방향 마커 (두꺼운 빨간 화살표)
        const currentLocationMarker = new naver.maps.Marker({
          position: position,
          map: window.ROADVIEW_MINIMAP,
          icon: {
            content: `<div style="color: #FF3B30; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.7);">↑</div>`,
            anchor: new naver.maps.Point(10, 10)
          }
        });
        
        // 파노라마 방향 변경 이벤트 리스너 추가
        naver.maps.Event.addListener(window.ROADVIEW, 'view_changed', function() {
          console.log('🔄 파노라마 방향 변경 이벤트 발생!');
          const pov = window.ROADVIEW.getPov();
          const rotation = pov.pan; // 파노라마 회전각
          console.log('📐 현재 회전각:', rotation);
          
          // 방향 화살표 회전
          if (window.ROADVIEW_CURRENT_MARKER) {
            currentLocationMarker.setIcon({
              content: `<div style="color: #FF3B30; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.7); transform: rotate(${rotation}deg);">↑</div>`,
              anchor: new naver.maps.Point(10, 10)
            });
            console.log('✅ 화살표 회전 완료:', rotation + '도');
          }
          
          // 미니맵 중심도 파노라마 방향에 따라 이동
          const currentPos = window.ROADVIEW.getPosition();
          if (currentPos) {
            window.ROADVIEW_MINIMAP.setCenter(currentPos);
          }
        });
        
        // 추가 이벤트 리스너들 (더 확실하게)
        naver.maps.Event.addListener(window.ROADVIEW, 'pov_changed', function() {
          console.log('🔄 POV 변경 이벤트 발생!');
          const pov = window.ROADVIEW.getPov();
          const rotation = pov.pan;
          
                                if (window.ROADVIEW_CURRENT_MARKER) {
             currentLocationMarker.setIcon({
               content: `<div style="color: #FF3B30; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.7); transform: rotate(${rotation}deg);">↑</div>`,
               anchor: new naver.maps.Point(10, 10)
             });
           }
        });
        
        naver.maps.Event.addListener(window.ROADVIEW, 'position_changed', function() {
          console.log('🔄 위치 변경 이벤트 발생!');
          const currentPos = window.ROADVIEW.getPosition();
          if (currentPos && window.ROADVIEW_CURRENT_MARKER) {
            window.ROADVIEW_CURRENT_MARKER.setPosition(currentPos);
            window.ROADVIEW_MINIMAP.setCenter(currentPos);
          }
        });
        
        // 파노라마 로드 완료 이벤트 - 초기 방향 설정
        naver.maps.Event.addListener(window.ROADVIEW, 'load', function() {
          console.log('✅ 파노라마 로드 완료!');
          const pov = window.ROADVIEW.getPov();
          const rotation = pov.pan;
          console.log('📐 초기 회전각:', rotation);
          
                                if (window.ROADVIEW_CURRENT_MARKER) {
             currentLocationMarker.setIcon({
               content: `<div style="color: #FF3B30; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.7); transform: rotate(${rotation}deg);">↑</div>`,
               anchor: new naver.maps.Point(10, 10)
             });
             console.log('✅ 초기 화살표 방향 설정 완료:', rotation + '도');
           }
        });
        
        window.ROADVIEW_CURRENT_MARKER = currentLocationMarker;
        
        // 미니맵 클릭 이벤트 - 로드뷰 위치 변경
        naver.maps.Event.addListener(window.ROADVIEW_MINIMAP, 'click', function(e) {
          if (e.coord && window.ROADVIEW) {
            window.ROADVIEW.setPosition(e.coord);
            
            // 마커도 새 위치로 이동
            if (window.ROADVIEW_CURRENT_MARKER) {
              window.ROADVIEW_CURRENT_MARKER.setPosition(e.coord);
            }
          }
        });
        
      } catch (error) {
        console.error('❌ 미니맵 생성 실패:', error);
      }
    } else {
      console.warn('⚠️ minimapContent를 찾을 수 없어 미니맵을 생성하지 않습니다.');
    }
    
    // 로드뷰 위치 정보 업데이트
    updateRoadviewLocationInfo(position);
    
  } catch (error) {
    console.error('❌ 파노라마 생성 실패:', error);
    if (typeof window.showToast === 'function') {
      window.showToast('로드뷰를 열 수 없습니다: ' + error.message, 'error');
    }
    
    // 에러 발생 시 컨테이너 숨기기
    if (container) {
      container.classList.add('hidden');
      container.style.display = 'none';
    }
  }
}

// 거리뷰 레이어 닫기
function closeRoadview() {
  
  // MAP 객체 확인 - 네이버 지도 객체인지 정확히 확인
  if (!window.MAP || !window.MAP.getCenter || !window.MAP.setMapTypeId) {
    console.error('❌ MAP 객체가 아직 준비되지 않았습니다.');
    return;
  }
  
  // 거리뷰 레이어가 표시되어 있는지 확인
  if (window.MAP._streetLayer) {
    // 레이어 제거
    window.MAP._streetLayer.setMap(null);
    window.MAP._streetLayer = null;
    if (typeof window.showToast === 'function') {
      window.showToast('거리뷰 레이어가 비활성화되었습니다.', 'info');
    }
  } else {
    console.log('ℹ️ 거리뷰 레이어가 이미 비활성화되어 있습니다.');
  }
}

// 로드뷰 위치 정보 업데이트
function updateRoadviewLocationInfo(position) {
  try {
    const roadNameEl = document.querySelector('.roadview-address-box .road-name');
    const addressEl = document.querySelector('.roadview-address-box .address');
    
    if (roadNameEl) {
      roadNameEl.textContent = '부평대로';
    }
    
    if (addressEl) {
      addressEl.textContent = '인천 부평구 부평동';
    }
  } catch (error) {
    console.error('❌ 위치 정보 업데이트 중 오류:', error);
  }
}

// 파노라마 닫기 (지도로 돌아가기)
function closePanorama() {
  try {
    const container = document.getElementById('roadviewContainer');
    
    // ROADVIEW 객체 타입 확인 및 안전한 정리
    if (window.ROADVIEW) {
      
      try {
        if (typeof window.ROADVIEW.setMap === 'function') {
          window.ROADVIEW.setMap(null);
        } else if (typeof window.ROADVIEW.destroy === 'function') {
          window.ROADVIEW.destroy();
        } else if (window.ROADVIEW.remove) {
          window.ROADVIEW.remove();
        }
      } catch (e) {
        console.warn('⚠️ ROADVIEW 정리 중 오류:', e);
      }
      window.ROADVIEW = null;
    }
    
    // ROADVIEW_MINIMAP 객체 타입 확인 및 안전한 정리
    if (window.ROADVIEW_MINIMAP) {
      
      try {
        if (typeof window.ROADVIEW_MINIMAP.setMap === 'function') {
          window.ROADVIEW_MINIMAP.setMap(null);
        } else if (typeof window.ROADVIEW_MINIMAP.destroy === 'function') {
          window.ROADVIEW_MINIMAP.destroy();
        }
      } catch (e) {
        console.warn('⚠️ ROADVIEW_MINIMAP 정리 중 오류:', e);
      }
      window.ROADVIEW_MINIMAP = null;
    }
    
    // 미니맵 마커 정리
    if (window.ROADVIEW_CURRENT_MARKER) {
      try {
        window.ROADVIEW_CURRENT_MARKER.setMap(null);
      } catch (e) {
        console.warn('⚠️ ROADVIEW_CURRENT_MARKER 정리 중 오류:', e);
      }
      window.ROADVIEW_CURRENT_MARKER = null;
    }
    
    // 컨테이너 숨기기 - 여러 방법으로 강제 숨김
    if (container) {
      container.classList.add('hidden');
      container.style.display = 'none';
      container.style.visibility = 'hidden';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
    } else {
      console.error('❌ roadviewContainer를 찾을 수 없습니다.');
    }
    
    // 지도 다시 초기화
    if (window.MAP) {
      naver.maps.Event.trigger(window.MAP, 'resize');
    }
    
  } catch (error) {
    console.error('❌ 파노라마 닫기 중 오류:', error);
    if (typeof window.showToast === 'function') {
      window.showToast('닫기 중 오류가 발생했습니다.', 'error');
    }
  }
}

// 위성지도 토글 (지적편집도는 네이버에서 지원하지 않음)
function toggleCadastralMap() {
  const cadastralBtn = document.getElementById('cadastralBtn');
  if (!cadastralBtn) return;
  
  try {
    if (cadastralBtn.classList.contains('active')) {
      // 위성지도 비활성화
      cadastralBtn.classList.remove('active');
      window.MAP.setMapTypeId(naver.maps.MapTypeId.NORMAL);
      if (typeof window.showToast === 'function') {
        window.showToast('일반지도로 변경되었습니다.', 'info');
      }
    } else {
      // 위성지도 활성화
      cadastralBtn.classList.add('active');
      window.MAP.setMapTypeId(naver.maps.MapTypeId.SATELLITE);
      if (typeof window.showToast === 'function') {
        window.showToast('위성지도로 변경되었습니다.', 'info');
      }
    }
  } catch (error) {
    console.error('❌ 위성지도 변경 중 오류:', error);
    cadastralBtn.classList.remove('active');
    window.MAP.setMapTypeId(naver.maps.MapTypeId.NORMAL);
    if (typeof window.showToast === 'function') {
      window.showToast('위성지도 변경 중 오류가 발생했습니다.', 'error');
    }
  }
}

// 거리제기 토글
function toggleDistanceMeasure() {
  const distanceBtn = document.getElementById('distanceBtn');
  if (!distanceBtn) return;
  
  if (window.IS_DISTANCE_MODE) {
    // 거리제기 모드 비활성화
    window.IS_DISTANCE_MODE = false;
    distanceBtn.classList.remove('active');
    clearDistanceMeasure();
    if (typeof window.showToast === 'function') {
      window.showToast('거리제기 모드가 비활성화되었습니다.', 'info');
    }
  } else {
    // 거리제기 모드 활성화
    window.IS_DISTANCE_MODE = true;
    distanceBtn.classList.add('active');
    if (typeof window.showToast === 'function') {
      window.showToast('거리제기 모드가 활성화되었습니다. 지도를 클릭하여 거리를 측정하세요.', 'info');
    }
  }
}

// 거리제기 초기화
function clearDistanceMeasure() {
  window.DISTANCE_POINTS = [];
  
  // 폴리라인 제거
  if (window.DISTANCE_POLYLINE) {
    window.DISTANCE_POLYLINE.setMap(null);
    window.DISTANCE_POLYLINE = null;
  }
  
  // 정보창 제거
  if (window.DISTANCE_INFO_WINDOW) {
    window.DISTANCE_INFO_WINDOW.close();
    window.DISTANCE_INFO_WINDOW = null;
  }
  
  // 거리제기 관련 마커들 제거
  if (window.MAP._distanceMarkers) {
    window.MAP._distanceMarkers.forEach(marker => {
      marker.setMap(null);
    });
    window.MAP._distanceMarkers = [];
  }
  
  // 전역 마커 배열도 정리
  window.DISTANCE_MARKERS.forEach(marker => {
    marker.setMap(null);
  });
  window.DISTANCE_MARKERS = [];
  
  window.DISTANCE_LABELS.forEach(label => {
    label.setMap(null);
  });
  window.DISTANCE_LABELS = [];
}

// 거리제기 클릭 이벤트 처리
function handleDistanceClick(e) {
  if (!window.IS_DISTANCE_MODE) return;
  
  const coord = e.coord;
  window.DISTANCE_POINTS.push(coord);
  
  // 거리제기 마커 배열 초기화
  if (!window.MAP._distanceMarkers) {
    window.MAP._distanceMarkers = [];
  }
  
  // 클릭한 지점에 마커 표시
  const marker = new naver.maps.Marker({
    position: coord,
    map: window.MAP,
    icon: {
      content: `<div style="width: 8px; height: 8px; background: #FF3B30; border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
      anchor: naver.maps && naver.maps.Point ? new naver.maps.Point(4, 4) : undefined
    }
  });
  
  // 마커에 번호 표시
  const label = new naver.maps.Marker({
    position: coord,
    map: window.MAP,
    icon: {
      content: `<div style="background: #FF3B30; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">${window.DISTANCE_POINTS.length}</div>`,
      anchor: naver.maps && naver.maps.Point ? new naver.maps.Point(10, 10) : undefined
    }
  });
  
  // 마커들을 배열에 저장
  window.MAP._distanceMarkers.push(marker, label);
  window.DISTANCE_MARKERS.push(marker, label);
  
  // 두 점 이상이면 선 그리기
  if (window.DISTANCE_POINTS.length >= 2) {
    if (window.DISTANCE_POLYLINE) {
      window.DISTANCE_POLYLINE.setMap(null);
    }
    
    window.DISTANCE_POLYLINE = new naver.maps.Polyline({
      path: window.DISTANCE_POINTS,
      strokeColor: '#FF3B30',
      strokeWeight: 3,
      strokeOpacity: 0.8,
      map: window.MAP
    });
    
    // 총 거리 계산 및 정보창 표시
    updateDistanceInfo();
  }
}

// 거리 정보 업데이트 및 표시
function updateDistanceInfo() {
  if (window.DISTANCE_POINTS.length < 2) return;
  
  let totalDistance = 0;
  let segmentDistances = [];
  
  for (let i = 1; i < window.DISTANCE_POINTS.length; i++) {
    const segmentDistance = getDistanceMeters(window.DISTANCE_POINTS[i-1], window.DISTANCE_POINTS[i]);
    totalDistance += segmentDistance;
    segmentDistances.push(segmentDistance);
  }
  
  // 기존 정보창 제거
  if (window.DISTANCE_INFO_WINDOW) {
    window.DISTANCE_INFO_WINDOW.close();
  }
  
  // 새로운 정보창 생성
  const infoContent = `
    <div style="padding: 10px; min-width: 200px;">
      <h4 style="margin: 0 0 8px 0; color: #FF3B30;">📏 거리 측정 결과</h4>
      <div style="font-size: 12px; line-height: 1.4;">
        <div><strong>총 거리:</strong> ${(totalDistance / 1000).toFixed(2)}km</div>
        <div><strong>측정 지점:</strong> ${window.DISTANCE_POINTS.length}개</div>
        ${segmentDistances.map((dist, idx) => 
          `<div style="color: #666;">${idx + 1}→${idx + 2}: ${(dist / 1000).toFixed(2)}km</div>`
        ).join('')}
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: #999;">
        우클릭으로 삭제 가능
      </div>
    </div>
  `;
  
  // 마지막 지점에 정보창 표시
  const lastPoint = window.DISTANCE_POINTS[window.DISTANCE_POINTS.length - 1];
  const infoWindowOptions = {
    content: infoContent,
    position: lastPoint,
    maxWidth: 250,
    backgroundColor: "#fff",
    borderColor: "#FF3B30",
    borderWidth: 2,
    anchorColor: "#fff"
  };
  
  // naver.maps.Size와 naver.maps.Point가 사용 가능한 경우에만 추가
  if (naver.maps && naver.maps.Size) {
    try {
      infoWindowOptions.anchorSize = new naver.maps.Size(10, 10);
    } catch (error) {
      console.warn('⚠️ anchorSize 생성 실패:', error);
    }
  }
  
  if (naver.maps && naver.maps.Point) {
    try {
      infoWindowOptions.pixelOffset = new naver.maps.Point(0, -10);
    } catch (error) {
      console.warn('⚠️ pixelOffset 생성 실패:', error);
    }
  }
  
  window.DISTANCE_INFO_WINDOW = new naver.maps.InfoWindow(infoWindowOptions);
  
  window.DISTANCE_INFO_WINDOW.open(window.MAP);
  
  if (typeof window.showToast === 'function') {
    window.showToast(`총 거리: ${(totalDistance / 1000).toFixed(2)}km (${window.DISTANCE_POINTS.length}개 지점)`, 'info');
  }
}

// 거리제기 더블클릭 이벤트 처리 (측정 완료)
function handleDistanceDoubleClick(e) {
  if (!window.IS_DISTANCE_MODE) return;
  
  e.preventDefault();
  
  if (window.DISTANCE_POINTS.length >= 2) {
    let totalDistance = 0;
    for (let i = 1; i < window.DISTANCE_POINTS.length; i++) {
      totalDistance += getDistanceMeters(window.DISTANCE_POINTS[i-1], window.DISTANCE_POINTS[i]);
    }
    
    if (typeof window.showToast === 'function') {
      window.showToast(`측정 완료! 총 거리: ${(totalDistance / 1000).toFixed(2)}km`, 'success');
    }
    toggleDistanceMeasure(); // 모드 해제
  }
}

// 거리제기 우클릭 이벤트 처리 (삭제)
function handleDistanceRightClick(e) {
  if (!window.IS_DISTANCE_MODE || window.DISTANCE_POINTS.length === 0) return;
  
  // 네이버 지도 API 이벤트 객체 구조에 맞게 처리
  try {
    if (e.preventDefault && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
  } catch (error) {
    console.log('⚠️ preventDefault 호출 실패 (무시됨):', error);
  }
  
  if (confirm('현재 측정된 거리를 삭제하시겠습니까?')) {
    clearDistanceMeasure();
    if (typeof window.showToast === 'function') {
      window.showToast('거리 측정이 삭제되었습니다.', 'info');
    }
  }
}

// 지도 컨트롤 관련 함수들을 전역으로 export
window.initMapControls = initMapControls;
window.toggleRoadview = toggleRoadview;
window.openRoadview = openRoadview;
window.openPanorama = openPanorama;
window.updateRoadviewLocationInfo = updateRoadviewLocationInfo;
window.closePanorama = closePanorama;
window.toggleCadastralMap = toggleCadastralMap;
window.toggleDistanceMeasure = toggleDistanceMeasure;
window.clearDistanceMeasure = clearDistanceMeasure;
window.handleDistanceClick = handleDistanceClick;
window.updateDistanceInfo = updateDistanceInfo;
window.handleDistanceDoubleClick = handleDistanceDoubleClick;
window.handleDistanceRightClick = handleDistanceRightClick; 