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

  // 지도 부가기능 상태 기본값
  if (typeof window.IS_RADIUS_MODE === 'undefined') window.IS_RADIUS_MODE = false;
  if (typeof window.RADIUS_CENTER === 'undefined') window.RADIUS_CENTER = null;
  if (typeof window.RADIUS_CIRCLE === 'undefined') window.RADIUS_CIRCLE = null;
  if (typeof window.MAP_ADDRESS_INFO_WINDOW === 'undefined') window.MAP_ADDRESS_INFO_WINDOW = null;

  // 로드뷰 버튼
  const roadviewBtn = document.getElementById('roadviewBtn');
  if (roadviewBtn) {
    roadviewBtn.addEventListener('click', function (e) {
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
    cadastralBtn.addEventListener('click', function (e) {
      e.preventDefault();
      requestAnimationFrame(() => {
        toggleCadastralMap();
      });
    });
  }

  // 거리제기 버튼 (존재하는 레이아웃에서만)
  const distanceBtn = document.getElementById('distanceBtn');
  if (distanceBtn) {
    distanceBtn.addEventListener('click', function (e) {
      e.preventDefault();
      requestAnimationFrame(() => {
        toggleDistanceMeasure();
      });
    });
  }

  // 로드뷰 닫기 버튼
  const roadviewCloseBtn = document.getElementById('roadviewCloseBtn');
  if (roadviewCloseBtn) {
    roadviewCloseBtn.addEventListener('click', function (e) {
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
    clearCustomerFilterBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      // PC의 clearCustomerFilter 함수 호출
      if (typeof window.clearCustomerFilter === 'function') {
        window.clearCustomerFilter();
      } else {
        console.error('❌ clearCustomerFilter 함수를 찾을 수 없습니다');
      }
    });
  } else {
    console.error('❌ clearCustomerFilterBtn을 찾을 수 없습니다.');
  }

  // ESC 키로 측정 모드 해제
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (window.IS_DISTANCE_MODE || window.IS_RADIUS_MODE)) {
      deactivateAllMeasureModes();
    }
  });

  document.addEventListener('click', function (e) {
    const menu = document.getElementById('mapContextMenu');
    if (!menu) return;
    if (!menu.contains(e.target)) {
      hideMapContextMenu();
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
    naver.maps.Event.addListener(window.MAP._streetLayer, 'click', function (e) {
      // 클릭한 위치에서 가장 가까운 거리뷰 지점으로 자동 이동
      if (e.coord) {
        openPanorama(e.coord);
      }
    });

    // 지도 클릭 이벤트에서도 거리뷰 레이어 클릭 처리
    naver.maps.Event.addListener(window.MAP, 'click', function (e) {
      if (window.MAP._streetLayer) {
        // 거리뷰 레이어 클릭 이벤트를 직접 호출
        if (e.coord) {
          openPanorama(e.coord);
        }
      }
    });

    // 거리뷰 레이어 에러 이벤트 (에러만 로그)
    naver.maps.Event.addListener(window.MAP._streetLayer, 'error', function (error) {
      console.error('❌ 거리뷰 레이어 에러:', error);
    });

    // 거리뷰 레이어 로드 완료 이벤트
    naver.maps.Event.addListener(window.MAP._streetLayer, 'load', function () {
    });

    // 거리뷰 레이어가 제대로 생성되었는지 확인
    setTimeout(() => {
      if (window.MAP._streetLayer) {

        // 지도 타입 확인

        // 레이어가 지도에 제대로 추가되었는지 확인
        if (window.MAP._streetLayer.getMap() === window.MAP) {
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
        fov: 120
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
        naver.maps.Event.addListener(window.ROADVIEW, 'view_changed', function () {
          const pov = window.ROADVIEW.getPov();
          const rotation = pov.pan; // 파노라마 회전각

          // 방향 화살표 회전
          if (window.ROADVIEW_CURRENT_MARKER) {
            currentLocationMarker.setIcon({
              content: `<div style="color: #FF3B30; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.7); transform: rotate(${rotation}deg);">↑</div>`,
              anchor: new naver.maps.Point(10, 10)
            });
          }

          // 미니맵 중심도 파노라마 방향에 따라 이동
          const currentPos = window.ROADVIEW.getPosition();
          if (currentPos) {
            window.ROADVIEW_MINIMAP.setCenter(currentPos);
          }
        });

        // 추가 이벤트 리스너들 (더 확실하게)
        naver.maps.Event.addListener(window.ROADVIEW, 'pov_changed', function () {
          const pov = window.ROADVIEW.getPov();
          const rotation = pov.pan;

          if (window.ROADVIEW_CURRENT_MARKER) {
            currentLocationMarker.setIcon({
              content: `<div style="color: #FF3B30; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.7); transform: rotate(${rotation}deg);">↑</div>`,
              anchor: new naver.maps.Point(10, 10)
            });
          }
        });

        naver.maps.Event.addListener(window.ROADVIEW, 'position_changed', function () {
          const currentPos = window.ROADVIEW.getPosition();
          if (currentPos && window.ROADVIEW_CURRENT_MARKER) {
            window.ROADVIEW_CURRENT_MARKER.setPosition(currentPos);
            window.ROADVIEW_MINIMAP.setCenter(currentPos);
          }
        });

        // 파노라마 로드 완료 이벤트 - 초기 방향 설정
        naver.maps.Event.addListener(window.ROADVIEW, 'load', function () {
          const pov = window.ROADVIEW.getPov();
          const rotation = pov.pan;
          console.log('📐 초기 회전각:', rotation);

          if (window.ROADVIEW_CURRENT_MARKER) {
            currentLocationMarker.setIcon({
              content: `<div style="color: #FF3B30; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.7); transform: rotate(${rotation}deg);">↑</div>`,
              anchor: new naver.maps.Point(10, 10)
            });
          }
        });

        window.ROADVIEW_CURRENT_MARKER = currentLocationMarker;

        // 미니맵 클릭 이벤트 - 로드뷰 위치 변경
        naver.maps.Event.addListener(window.ROADVIEW_MINIMAP, 'click', function (e) {
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
  } else {
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
    } else {
      // 위성지도 활성화
      cadastralBtn.classList.add('active');
      window.MAP.setMapTypeId(naver.maps.MapTypeId.SATELLITE);
    }
  } catch (error) {
    console.error('❌ 위성지도 변경 중 오류:', error);
    cadastralBtn.classList.remove('active');
    window.MAP.setMapTypeId(naver.maps.MapTypeId.NORMAL);
  }
}

// 거리제기 토글
function toggleDistanceMeasure() {
  const distanceBtn = document.getElementById('distanceBtn');

  // 반경측정 중이면 먼저 정리
  if (window.IS_RADIUS_MODE) {
    clearRadiusMeasure();
    window.IS_RADIUS_MODE = false;
  }

  if (window.IS_DISTANCE_MODE) {
    // 거리제기 모드 비활성화
    window.IS_DISTANCE_MODE = false;
    if (distanceBtn) distanceBtn.classList.remove('active');
    clearDistanceMeasure();
  } else {
    // 거리제기 모드 활성화
    window.IS_DISTANCE_MODE = true;
    if (distanceBtn) distanceBtn.classList.add('active');
  }
}

function activateDistanceMeasureFromPoint(startCoord) {
  if (!window.IS_DISTANCE_MODE) {
    toggleDistanceMeasure();
  }

  if (startCoord) {
    handleDistanceClick({ coord: startCoord });
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
    const segmentDistance = getDistanceMeters(window.DISTANCE_POINTS[i - 1], window.DISTANCE_POINTS[i]);
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

}

// 거리제기 더블클릭 이벤트 처리 (측정 완료)
function handleDistanceDoubleClick(e) {
  if (!window.IS_DISTANCE_MODE) return;

  e.preventDefault();

  if (window.DISTANCE_POINTS.length >= 2) {
    let totalDistance = 0;
    for (let i = 1; i < window.DISTANCE_POINTS.length; i++) {
      totalDistance += getDistanceMeters(window.DISTANCE_POINTS[i - 1], window.DISTANCE_POINTS[i]);
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
  }

  if (confirm('현재 측정된 거리를 삭제하시겠습니까?')) {
    clearDistanceMeasure();
  }
}

function clearRadiusMeasure() {
  if (window.RADIUS_CIRCLE) {
    window.RADIUS_CIRCLE.setMap(null);
    window.RADIUS_CIRCLE = null;
  }

  if (window.RADIUS_CENTER_MARKER) {
    window.RADIUS_CENTER_MARKER.setMap(null);
    window.RADIUS_CENTER_MARKER = null;
  }

  if (window.RADIUS_EDGE_MARKER) {
    window.RADIUS_EDGE_MARKER.setMap(null);
    window.RADIUS_EDGE_MARKER = null;
  }

  if (window.RADIUS_INFO_WINDOW) {
    window.RADIUS_INFO_WINDOW.close();
    window.RADIUS_INFO_WINDOW = null;
  }

  window.RADIUS_CENTER = null;
  window._RADIUS_FIXED = false;
}

function deactivateAllMeasureModes() {
  const distanceBtn = document.getElementById('distanceBtn');
  const radiusBtn = document.getElementById('radiusBtn');

  if (window.IS_DISTANCE_MODE) {
    window.IS_DISTANCE_MODE = false;
    if (distanceBtn) distanceBtn.classList.remove('active');
    clearDistanceMeasure();
  }

  if (window.IS_RADIUS_MODE) {
    window.IS_RADIUS_MODE = false;
    if (radiusBtn) radiusBtn.classList.remove('active');
    clearRadiusMeasure();
  }
}

function activateRadiusMeasureFromPoint(centerCoord) {
  deactivateAllMeasureModes();
  window.IS_RADIUS_MODE = true;
  window.RADIUS_CENTER = centerCoord;

  window.RADIUS_CENTER_MARKER = new naver.maps.Marker({
    position: centerCoord,
    map: window.MAP,
    icon: {
      content: '<div style="width: 10px; height: 10px; background:#1e88e5; border:2px solid #fff; border-radius:50%; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>',
      anchor: naver.maps.Point ? new naver.maps.Point(5, 5) : undefined
    }
  });

  // 중심점 설정 시점에 측정 완료 플래그 초기화
  window._RADIUS_FIXED = false;
}

function handleRadiusMouseMove(e) {
  if (!window.IS_RADIUS_MODE || !window.RADIUS_CENTER || window._RADIUS_FIXED) return;

  const edgeCoord = e.coord;
  const radiusMeters = getDistanceMeters(window.RADIUS_CENTER, edgeCoord);

  // 원 업데이트 또는 생성
  if (window.RADIUS_CIRCLE) {
    window.RADIUS_CIRCLE.setRadius(radiusMeters);
  } else {
    window.RADIUS_CIRCLE = new naver.maps.Circle({
      map: window.MAP,
      center: window.RADIUS_CENTER,
      radius: radiusMeters,
      strokeColor: '#1e88e5',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#1e88e5',
      fillOpacity: 0.12
    });
  }

  // 외곽 마커 업데이트 또는 생성
  if (window.RADIUS_EDGE_MARKER) {
    window.RADIUS_EDGE_MARKER.setPosition(edgeCoord);
  } else {
    window.RADIUS_EDGE_MARKER = new naver.maps.Marker({
      position: edgeCoord,
      map: window.MAP,
      icon: {
        content: '<div style="width: 8px; height: 8px; background:#ff3b30; border:2px solid #fff; border-radius:50%; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>',
        anchor: naver.maps.Point ? new naver.maps.Point(4, 4) : undefined
      }
    });
  }

  // 정보창 업데이트 또는 생성
  const infoContent = `
    <div style="padding:10px; min-width:180px;">
      <h4 style="margin:0 0 6px 0; color:#1e88e5;">⭕ 반경 측정 중</h4>
      <div style="font-size:12px; line-height:1.4;">
        <div><strong>반경:</strong> ${(radiusMeters / 1000).toFixed(2)}km</div>
        <div><strong>직선거리:</strong> ${Math.round(radiusMeters)}m</div>
        <div style="margin-top:5px; color:#666; font-size:11px;">클릭하여 종료</div>
      </div>
    </div>
  `;

  if (window.RADIUS_INFO_WINDOW) {
    window.RADIUS_INFO_WINDOW.setContent(infoContent);
    window.RADIUS_INFO_WINDOW.setPosition(edgeCoord);
  } else {
    window.RADIUS_INFO_WINDOW = new naver.maps.InfoWindow({
      content: infoContent,
      position: edgeCoord,
      backgroundColor: '#fff',
      borderColor: '#1e88e5',
      borderWidth: 2
    });
    window.RADIUS_INFO_WINDOW.open(window.MAP);
  }
}

function handleRadiusClick(e) {
  if (!window.IS_RADIUS_MODE || !window.RADIUS_CENTER) return;

  // 이미 고정된 상태면 무시
  if (window._RADIUS_FIXED) return;

  const edgeCoord = e.coord;
  const radiusMeters = getDistanceMeters(window.RADIUS_CENTER, edgeCoord);

  // 최종 위치로 업데이트
  if (window.RADIUS_CIRCLE) window.RADIUS_CIRCLE.setRadius(radiusMeters);
  if (window.RADIUS_EDGE_MARKER) window.RADIUS_EDGE_MARKER.setPosition(edgeCoord);

  // 정보창 최종 텍스트 업데이트
  const finalContent = `
    <div style="padding:10px; min-width:180px;">
      <h4 style="margin:0 0 6px 0; color:#1e88e5;">⭕ 반경 측정 결과</h4>
      <div style="font-size:12px; line-height:1.4;">
        <div><strong>반경:</strong> ${(radiusMeters / 1000).toFixed(2)}km</div>
        <div><strong>직선거리:</strong> ${Math.round(radiusMeters)}m</div>
      </div>
    </div>
  `;

  if (window.RADIUS_INFO_WINDOW) {
    window.RADIUS_INFO_WINDOW.setContent(finalContent);
    window.RADIUS_INFO_WINDOW.setPosition(edgeCoord);
  }

  // 측정 완료 플래그 설정
  window._RADIUS_FIXED = true;

  // 모드 종료 (mousemove에서 업데이트를 멈춤)
  // window.IS_RADIUS_MODE = false; // 바로 false로 하면 mousemove 리스너에서 handleRadiusMouseMove가 아예 안불릴 수 있음. _RADIUS_FIXED로 제어.
}

function handleRadiusRightClick() {
  if (!window.IS_RADIUS_MODE) return;

  if (confirm('현재 반경 측정을 삭제하시겠습니까?')) {
    clearRadiusMeasure();
    window.IS_RADIUS_MODE = false;
  }
}

function showAddressAtCoord(coord, options = {}) {
  const { isMobile = false } = options;

  if (!window.naver?.maps?.Service?.reverseGeocode) return;

  naver.maps.Service.reverseGeocode({
    coords: coord,
    orders: `${naver.maps.Service.OrderType.ADDR},${naver.maps.Service.OrderType.ROAD_ADDR}`
  }, function (status, response) {
    if (status !== naver.maps.Service.Status.OK || !response?.v2) return;

    const addr = response.v2.address || {};
    const jibunAddress = (addr.jibunAddress || '').trim();
    const roadAddress = (addr.roadAddress || '').trim();
    const displayAddress = jibunAddress || roadAddress;

    if (!displayAddress) return;

    if (window.MAP_ADDRESS_INFO_WINDOW) {
      window.MAP_ADDRESS_INFO_WINDOW.close();
    }

    window.MAP_ADDRESS_INFO_WINDOW = new naver.maps.InfoWindow({
      content: `
        <div style="padding:10px; min-width:220px;">
          <h4 style="margin:0 0 6px 0; color:#333;">📍 이 위치의 주소</h4>
          <div style="font-size:12px; line-height:1.5; color:#333;">${displayAddress}</div>
          <div style="margin-top:6px; font-size:11px; color:#666;">${jibunAddress ? '지번주소' : '도로명주소(지번 없음)'}</div>
          <div style="margin-top:10px; padding-top:10px; border-top:1px solid #eee;">
            <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.addListingFromInfoBtn(${coord.lat()}, ${coord.lng()});" style="width:100%; padding:8px 0; background:#007bff; color:#fff; border:none; border-radius:4px; font-size:12px; cursor:pointer;">📝 이 위치에 매물등록</button>
          </div>
        </div>
      `,
      position: coord,
      backgroundColor: '#fff',
      borderColor: '#666',
      borderWidth: 1
    });
    window.MAP_ADDRESS_INFO_WINDOW.open(window.MAP);

    if (isMobile) {
      window._LAST_LONG_TAP_AT = Date.now();
    }
  });
}

function addListingAtCoord(coord, options = {}) {
  const { isMobile = false } = options;
  console.log('addListingAtCoord 실행:', { coord, isMobile });

  if (!window.naver?.maps?.Service?.reverseGeocode) {
    console.error('역지오코딩 실패: window.naver.maps.Service.reverseGeocode 모듈 부재');
    alert('지도 주소 변환 서비스를 불러올 수 없습니다.');
    return;
  }

  console.log('reverseGeocode API 호출 시도');
  naver.maps.Service.reverseGeocode({
    coords: coord,
    orders: `${naver.maps.Service.OrderType.ADDR},${naver.maps.Service.OrderType.ROAD_ADDR}`
  }, function (status, response) {
    console.log('reverseGeocode 응답 상태:', status);
    if (status !== naver.maps.Service.Status.OK || !response?.v2) {
      console.error('reverseGeocode 실패 응답:', response);
      alert('해당 위치의 주소를 찾지 못했습니다.');
      return;
    }

    const addr = response.v2.address || {};
    console.log('추출된 주소 데이터:', addr);

    // 법정동 구조물 파싱 (문자열 기반 스마트 파싱)
    let sigugun = '';
    let dong = '';
    let jibunCode = '';

    const fullJibun = (addr.jibunAddress || '').trim();
    const parts = fullJibun.split(' ').filter(Boolean);

    if (parts.length >= 3) {
      // 마지막 요소가 지번인지 확인 (숫자 포함 여부)
      const lastPart = parts[parts.length - 1];
      const hasNumber = /[0-9]/.test(lastPart);
      
      if (hasNumber) {
        jibunCode = lastPart;
        parts.pop(); // 지번 제거
      }

      // 남은 배열 분석 (시/도 부분 제외)
      const middle = parts.slice(1); 
      
      if (middle.length === 1) {
        // 예: 세종특별자치시 나성동
        dong = middle[0];
        sigugun = parts[0]; 
      } else if (middle.length >= 3 && middle[0].endsWith('시') && middle[1].endsWith('구')) {
        // 예: 경기도 부천시 원미구 중동
        sigugun = middle[1];
        dong = middle[middle.length - 1]; // 마지막 읍면동리 추출
      } else if (middle.length >= 2) {
        // 예: 인천광역시 부평구 부평동, 제주특별자치도 제주시 애월읍
        sigugun = middle[0];
        dong = middle[middle.length - 1];
      }
    } else {
      // 매우 짧은 주소의 경우 fallback
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (/[0-9]/.test(lastPart)) jibunCode = lastPart;
      }
    }

    // 추출된 지번 정보가 진짜 지번 형식이 맞는지 검증
    if (!jibunCode || jibunCode.endsWith('동') || jibunCode.endsWith('도') || jibunCode.endsWith('시') || jibunCode.endsWith('구') || jibunCode === fullJibun) {
      jibunCode = '';
    }

    const autoFillData = {
      '지역2': sigugun, // 부평구
      '지역': dong,     // 부평동
      '지번': jibunCode  // 123-45
    };

    console.log('폼 자동 주입 데이터 구성:', autoFillData);

    // 주소 정보창 닫기
    closeAddressPopup();

    // listing-add.js 에 정의될 전역 함수 호출 (초기화 및 자동 데이터 주입)
    if (typeof window.openListingModalWithData === 'function') {
      console.log('window.openListingModalWithData 호출');
      window.openListingModalWithData(autoFillData);
    } else {
      console.error('CRITICAL: window.openListingModalWithData 함수를 찾을 수 없습니다.');
      // Fallback: 기존 모달 열기 메커니즘
      const modalObj = document.getElementById('listingAddModal');
      if (modalObj) {
        modalObj.classList.remove('hidden');
        console.log('Fallback 모달 오픈 처리');
      } else {
        console.error('Fallback 모달 DOM마저 찾을 수 없음');
      }
    }
  });
}

window.addListingFromInfoBtn = function (lat, lng) {
  if (window.naver && window.naver.maps) {
    const coord = new window.naver.maps.LatLng(lat, lng);
    addListingAtCoord(coord, { isMobile: true });
  }
};

function closeAddressPopup() {
  if (window.MAP_ADDRESS_INFO_WINDOW) {
    window.MAP_ADDRESS_INFO_WINDOW.close();
    window.MAP_ADDRESS_INFO_WINDOW = null;
  }
}

function ensureMapContextMenu() {
  let menu = document.getElementById('mapContextMenu');
  if (menu) return menu;

  const mapWrap = document.getElementById('mapWrap');
  if (!mapWrap) return null;

  menu = document.createElement('div');
  menu.id = 'mapContextMenu';
  menu.style.cssText = `
    position:absolute;
    min-width:180px;
    background:#fff;
    border:1px solid #d9d9d9;
    border-radius:8px;
    box-shadow:0 6px 18px rgba(0,0,0,0.16);
    z-index:5000;
    display:none;
    overflow:hidden;
    font-size:13px;
  `;

  menu.innerHTML = `
    <button type="button" data-action="address" style="width:100%; text-align:left; padding:10px 12px; border:0; background:#fff; cursor:pointer;">📍 이 위치의 주소는?</button>
    <button type="button" data-action="addListing" style="width:100%; text-align:left; padding:10px 12px; border:0; border-top:1px solid #eee; background:#fff; cursor:pointer;">📝 이 위치에 매물등록</button>
    <button type="button" data-action="distance" style="width:100%; text-align:left; padding:10px 12px; border:0; border-top:1px solid #eee; background:#fff; cursor:pointer;">📏 거리측정</button>
    <button type="button" data-action="radius" style="width:100%; text-align:left; padding:10px 12px; border:0; border-top:1px solid #eee; background:#fff; cursor:pointer;">⭕ 반경측정</button>
  `;

  menu.addEventListener('click', (ev) => {
    // 버튼 내 이모지나 글자, 혹은 여백을 클릭해도 버튼 자체의 action을 안정적으로 인식하도록 수정
    const btn = ev.target.closest('button');
    if (!btn) return;

    const action = btn.dataset?.action;
    if (!action || !window._MAP_CONTEXT_COORD) return;

    if (action === 'address') {
      showAddressAtCoord(window._MAP_CONTEXT_COORD);
    } else if (action === 'addListing') {
      addListingAtCoord(window._MAP_CONTEXT_COORD, { isMobile: false });
    } else if (action === 'distance') {
      activateDistanceMeasureFromPoint(window._MAP_CONTEXT_COORD);
    } else if (action === 'radius') {
      activateRadiusMeasureFromPoint(window._MAP_CONTEXT_COORD);
    }

    hideMapContextMenu();
  });

  mapWrap.appendChild(menu);
  return menu;
}

function showMapContextMenu(coord) {
  const menu = ensureMapContextMenu();
  if (!menu || !window.MAP?.getProjection) return;

  window._MAP_CONTEXT_COORD = coord;

  const offset = window.MAP.getProjection().fromCoordToOffset(coord);
  menu.style.left = `${Math.max(8, offset.x)}px`;
  menu.style.top = `${Math.max(8, offset.y)}px`;
  menu.style.display = 'block';
}

function hideMapContextMenu() {
  const menu = document.getElementById('mapContextMenu');
  if (menu) menu.style.display = 'none';
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
window.activateDistanceMeasureFromPoint = activateDistanceMeasureFromPoint;
window.clearRadiusMeasure = clearRadiusMeasure;
window.deactivateAllMeasureModes = deactivateAllMeasureModes;
window.activateRadiusMeasureFromPoint = activateRadiusMeasureFromPoint;

window.handleRadiusMouseMove = handleRadiusMouseMove;
window.handleRadiusClick = handleRadiusClick;
window.handleRadiusRightClick = handleRadiusRightClick;
window.showAddressAtCoord = showAddressAtCoord;
window.closeAddressPopup = closeAddressPopup;
window.showMapContextMenu = showMapContextMenu;
window.hideMapContextMenu = hideMapContextMenu;