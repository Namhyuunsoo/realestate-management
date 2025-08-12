/* -----------------------------------------
 * map-controls.js - 지도 컨트롤 관리
 * ----------------------------------------- */

/**************************************
 * ===== 지도 컨트롤 관리 =====
 **************************************/

function initMapControls() {
  // 로드뷰 버튼
  const roadviewBtn = document.getElementById('roadviewBtn');
  if (roadviewBtn) {
    roadviewBtn.addEventListener('click', toggleRoadview);
  }
  
  // 지적편집도 버튼
  const cadastralBtn = document.getElementById('cadastralBtn');
  if (cadastralBtn) {
    cadastralBtn.addEventListener('click', toggleCadastralMap);
  }
  
  // 거리제기 버튼
  const distanceBtn = document.getElementById('distanceBtn');
  if (distanceBtn) {
    distanceBtn.addEventListener('click', toggleDistanceMeasure);
  }
  
  // 로드뷰 닫기 버튼
  const roadviewCloseBtn = document.getElementById('roadviewCloseBtn');
  if (roadviewCloseBtn) {
    roadviewCloseBtn.addEventListener('click', function() {
      console.log('🔄 로드뷰 닫기 버튼 클릭됨');
      closePanorama();
    });
  } else {
    console.error('❌ roadviewCloseBtn을 찾을 수 없습니다.');
  }
  
  // 거리제기 핸들러는 이미 initMap에서 추가됨
  
  // ESC 키로 거리제기 모드 해제
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && IS_DISTANCE_MODE) {
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
  // 거리뷰 레이어가 이미 표시되어 있는지 확인
  if (MAP._streetLayer) {
    // 레이어 제거
    MAP._streetLayer.setMap(null);
    MAP._streetLayer = null;
    // showToast 제거 - 불필요한 안내 메시지
    return;
  }
  
  // 거리뷰 레이어 생성 및 표시
  try {
    MAP._streetLayer = new naver.maps.StreetLayer();
    MAP._streetLayer.setMap(MAP);
    
    // 거리뷰 레이어 클릭 이벤트 - 가장 가까운 거리뷰 지점으로 자동 이동
    naver.maps.Event.addListener(MAP._streetLayer, 'click', function(e) {
      // 클릭한 위치에서 가장 가까운 거리뷰 지점으로 자동 이동
      if (e.coord) {
        openPanorama(e.coord);
      }
    });
    
    // 지도 클릭 이벤트에서도 거리뷰 레이어 클릭 처리
    naver.maps.Event.addListener(MAP, 'click', function(e) {
      if (MAP._streetLayer) {
        // 거리뷰 레이어 클릭 이벤트를 직접 호출
        if (e.coord) {
          openPanorama(e.coord);
        }
      }
    });
    
    // 거리뷰 레이어 에러 이벤트 (에러만 로그)
    naver.maps.Event.addListener(MAP._streetLayer, 'error', function(error) {
      console.error('❌ 거리뷰 레이어 에러:', error);
    });
    
  } catch (error) {
    console.error('❌ 거리뷰 레이어 생성 실패:', error);
    showToast('거리뷰 레이어를 생성할 수 없습니다.', 'error');
  }
}

// 거리뷰 레이어에서 클릭 시 파노라마 열기
function openPanorama(position) {
  if (typeof naver.maps.Panorama === 'undefined') {
    console.error('❌ Panorama API가 정의되지 않음');
    return;
  }
  
  const container = document.getElementById('roadviewContainer');
  const roadviewDiv = document.getElementById('roadview');
  const minimapContent = document.querySelector('.minimap-content');
  
  if (!container || !roadviewDiv || !minimapContent) {
    console.error('❌ 필요한 DOM 요소를 찾을 수 없습니다.');
    return;
  }
  
  try {
    // 파노라마 초기화 시작
    
    // 컨테이너 크기 확인 (안전한 방식)
    const containerWidth = roadviewDiv.offsetWidth || window.innerWidth || 800;
    const containerHeight = roadviewDiv.offsetHeight || window.innerHeight || 600;
    console.log('📏 컨테이너 크기:', containerWidth, 'x', containerHeight);
    
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
            console.log('✅ naver.maps.Size 생성 성공:', size);
          } else {
            console.warn('⚠️ 생성된 Size 객체가 유효하지 않음');
            delete panoramaOptions.size;
          }
        } else {
          console.warn('⚠️ 컨테이너 크기가 유효하지 않음:', containerWidth, 'x', containerHeight);
          delete panoramaOptions.size;
        }
      } catch (error) {
        console.warn('⚠️ naver.maps.Size 생성 실패:', error);
        // size 옵션을 제거하고 기본값 사용
        delete panoramaOptions.size;
      }
    } else {
      console.warn('⚠️ naver.maps.Size가 사용할 수 없음');
      delete panoramaOptions.size;
    }
    
    ROADVIEW = new naver.maps.Panorama(roadviewDiv, panoramaOptions);
    
    console.log('✅ Panorama 객체 생성 완료:', ROADVIEW);
    
    // 미니맵 생성
    ROADVIEW_MINIMAP = new naver.maps.Map(minimapContent, {
      center: position,
      zoom: 15,
      mapTypeControl: false,
      scaleControl: false,
      logoControl: false,
      mapDataControl: false,
      zoomControl: false,
      streetViewControl: false
    });
    
    // 미니맵이 제대로 로드되었는지 확인
    console.log('🔍 미니맵 생성 완료:', ROADVIEW_MINIMAP);
    console.log('🔍 minimapContent 크기:', minimapContent.offsetWidth, 'x', minimapContent.offsetHeight);
    
    // 미니맵이 로드되지 않을 경우를 대비해서 즉시 대체 메시지 표시
    if (minimapContent.children.length === 0) {
      console.log('🔄 미니맵 로드 대기 중 - 임시 메시지 표시');
      minimapContent.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #333;
          text-align: center;
          padding: 10px;
          font-size: 12px;
          background: #f8f9fa;
          border: 2px solid #007AFF;
          border-radius: 6px;
        ">
          <div>
            <div style="font-size: 24px; margin-bottom: 8px;">🗺️</div>
            <div style="font-weight: bold; margin-bottom: 4px;">미니맵 로딩 중...</div>
            <div style="font-size: 10px; color: #666;">잠시만 기다려주세요</div>
          </div>
        </div>
      `;
    }
    
    // 미니맵 로드 확인 (더 빠른 확인)
    setTimeout(() => {
      console.log('🔍 미니맵 로드 상태 확인 중...');
      console.log('🔍 minimapContent 자식 요소 수:', minimapContent.children.length);
      console.log('🔍 minimapContent 크기:', minimapContent.offsetWidth, 'x', minimapContent.offsetHeight);
      
      if (minimapContent.children.length === 0) {
        console.warn('⚠️ 미니맵이 로드되지 않음 - 대체 메시지 표시');
        minimapContent.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #333;
            text-align: center;
            padding: 10px;
            font-size: 12px;
            background: #f8f9fa;
            border: 2px solid #007AFF;
            border-radius: 6px;
          ">
            <div>
              <div style="font-size: 24px; margin-bottom: 8px;">🗺️</div>
              <div style="font-weight: bold; margin-bottom: 4px;">미니맵</div>
              <div style="font-size: 10px; color: #666;">클릭하여 이동</div>
            </div>
          </div>
        `;
        
        // 대체 미니맵 클릭 이벤트
        minimapContent.addEventListener('click', function() {
          console.log('🔄 대체 미니맵 클릭됨');
          showToast('미니맵을 클릭하여 다른 위치로 이동할 수 있습니다.', 'info');
        });
      } else {
        console.log('✅ 미니맵이 정상적으로 로드됨');
      }
    }, 100);
    
    // 현재 위치 마커 (회전하는 녹색 점)
    const positionMarker = new naver.maps.Marker({
      position: position,
      map: ROADVIEW_MINIMAP,
      icon: {
        content: `
          <div style="
            width: 16px; 
            height: 16px; 
            background: #34C759; 
            border: 2px solid white; 
            border-radius: 50%; 
            position: relative;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transform: rotate(0deg);
          ">
            <div style="
              position: absolute;
              top: 2px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 3px solid transparent;
              border-right: 3px solid transparent;
              border-bottom: 6px solid white;
            "></div>
          </div>
        `,
        anchor: naver.maps && naver.maps.Point ? new naver.maps.Point(8, 8) : undefined
      }
    });
    
    // 미니맵 클릭 이벤트 - 파노라마 이동
    naver.maps.Event.addListener(ROADVIEW_MINIMAP, 'click', function(e) {
      console.log('🔄 미니맵 클릭됨:', e.coord);
      
      // 클릭한 위치로 파노라마 이동
      if (ROADVIEW) {
        ROADVIEW.setPosition(e.coord);
        
        // 마커 위치 업데이트
        positionMarker.setPosition(e.coord);
        
        // 미니맵 중심 이동
        ROADVIEW_MINIMAP.setCenter(e.coord);
        
        // 위치 정보 업데이트 (간단한 좌표 표시)
        updateRoadviewLocationInfo(e.coord);
        
        console.log('✅ 파노라마가 새로운 위치로 이동했습니다:', e.coord);
        showToast('새로운 위치로 이동했습니다.', 'info');
      }
    });
    
    // 미니맵 줌 컨트롤 이벤트
    const zoomInBtn = document.querySelector('.minimap-zoom .zoom-in');
    const zoomOutBtn = document.querySelector('.minimap-zoom .zoom-out');
    
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', function() {
        const currentZoom = ROADVIEW_MINIMAP.getZoom();
        ROADVIEW_MINIMAP.setZoom(currentZoom + 1);
      });
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', function() {
        const currentZoom = ROADVIEW_MINIMAP.getZoom();
        ROADVIEW_MINIMAP.setZoom(currentZoom - 1);
      });
    }
    
    // 미니맵 확장 버튼 이벤트
    const expandBtn = document.querySelector('.minimap-expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', function() {
        const minimap = document.getElementById('roadviewMiniMap');
        if (minimap) {
          minimap.classList.toggle('expanded');
        }
      });
    }
    
    // 파노라마 위치 변경 시 미니맵 동기화
    naver.maps.Event.addListener(ROADVIEW, 'position_changed', function() {
      const currentPosition = ROADVIEW.getPosition();
      ROADVIEW_MINIMAP.setCenter(currentPosition);
      positionMarker.setPosition(currentPosition);
      
      // 위치 정보 업데이트
      updateRoadviewLocationInfo(currentPosition);
      
      // 방향 업데이트 - 점 자체가 회전
      const pov = ROADVIEW.getPov();
      const rotation = pov.pan;
      positionMarker.setIcon({
        content: `
          <div style="
            width: 16px; 
            height: 16px; 
            background: #34C759; 
            border: 2px solid white; 
            border-radius: 50%; 
            position: relative;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transform: rotate(${rotation}deg);
          ">
            <div style="
              position: absolute;
              top: 2px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 3px solid transparent;
              border-right: 3px solid transparent;
              border-bottom: 6px solid white;
            "></div>
          </div>
        `,
        anchor: naver.maps && naver.maps.Point ? new naver.maps.Point(8, 8) : undefined
      });
    });
    
    // 파노라마 POV 변경 시 방향 표시 업데이트 - 점 자체가 회전
    naver.maps.Event.addListener(ROADVIEW, 'pov_changed', function() {
      const pov = ROADVIEW.getPov();
      const rotation = pov.pan;
      positionMarker.setIcon({
        content: `
          <div style="
            width: 16px; 
            height: 16px; 
            background: #34C759; 
            border: 2px solid white; 
            border-radius: 50%; 
            position: relative;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transform: rotate(${rotation}deg);
          ">
            <div style="
              position: absolute;
              top: 2px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 3px solid transparent;
              border-right: 3px solid transparent;
              border-bottom: 6px solid white;
            "></div>
          </div>
        `,
        anchor: naver.maps && naver.maps.Point ? new naver.maps.Point(8, 8) : undefined
      });
    });
    
    // 파노라마 로드 완료 이벤트
    naver.maps.Event.once(ROADVIEW, 'init', function() {
      console.log('✅ 파노라마 초기화 완료');
      
      // 파노라마 크기 재조정 (100px 문제 해결)
      setTimeout(() => {
        if (ROADVIEW && naver.maps && naver.maps.Size) {
          try {
            // 컨테이너 실제 크기 확인
            const actualWidth = roadviewDiv.offsetWidth || containerWidth;
            const actualHeight = roadviewDiv.offsetHeight || containerHeight;
            
            console.log('🔍 실제 컨테이너 크기:', actualWidth, 'x', actualHeight);
            
            // 너비가 100px 이하인 경우 강제로 100% 설정
            if (actualWidth <= 100) {
              roadviewDiv.style.width = '100%';
              roadviewDiv.style.minWidth = '100%';
              console.log('⚠️ 너비가 100px 이하 - 강제로 100% 설정');
            }
            
            const newSize = new naver.maps.Size(actualWidth, actualHeight);
            ROADVIEW.setSize(newSize);
            naver.maps.Event.trigger(ROADVIEW, 'resize');
            
            console.log('✅ 파노라마 크기 재조정 완료:', newSize);
          } catch (error) {
            console.warn('⚠️ 파노라마 크기 재조정 실패:', error);
          }
        }
      }, 100);
    });
    
    // 파노라마 로드 타임아웃 (3초 후 체크)
    setTimeout(() => {
      if (ROADVIEW && roadviewDiv.children.length === 0) {
        console.warn('⚠️ 파노라마 로드 타임아웃 - 대체 메시지 표시');
        roadviewDiv.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: white;
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          ">
            <div style="font-size: 48px; margin-bottom: 20px;">🏙️</div>
            <h3>거리뷰를 사용할 수 없습니다</h3>
            <p>이 지역에서는 네이버 거리뷰 데이터가 제공되지 않습니다.</p>
            <p>다른 위치를 선택하거나 지도로 돌아가세요.</p>
            <button onclick="closePanorama()" style="
              margin-top: 20px;
              padding: 10px 20px;
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              border-radius: 5px;
              cursor: pointer;
            ">지도로 돌아가기</button>
          </div>
        `;
      }
    }, 3000);
    
    // 파노라마 에러 이벤트
    naver.maps.Event.once(ROADVIEW, 'error', function(error) {
      console.error('❌ 파노라마 에러:', error);
      showToast('이 지역에서는 거리뷰를 사용할 수 없습니다.', 'error');
      
      // 에러 시 대체 메시지 표시
      roadviewDiv.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: white;
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        ">
          <div style="font-size: 48px; margin-bottom: 20px;">🏙️</div>
          <h3>거리뷰를 사용할 수 없습니다</h3>
          <p>이 지역에서는 네이버 거리뷰 데이터가 제공되지 않습니다.</p>
          <p>다른 위치를 선택하거나 지도로 돌아가세요.</p>
          <button onclick="closePanorama()" style="
            margin-top: 20px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            border-radius: 5px;
            cursor: pointer;
          ">지도로 돌아가기</button>
        </div>
      `;
    });
    
    // 컨테이너 표시 - 인라인 스타일 초기화 후 표시
    container.style.display = '';
    container.style.visibility = '';
    container.style.opacity = '';
    container.style.pointerEvents = '';
    container.classList.remove('hidden');
    
    // 로드뷰 너비 강제 설정 (100px 문제 해결)
    roadviewDiv.style.width = '100%';
    roadviewDiv.style.height = '100%';
    roadviewDiv.style.minWidth = '100%';
    roadviewDiv.style.minHeight = '100%';
    
    // 강제로 컨테이너 표시 상태 확인
    console.log('🔍 컨테이너 표시 상태:', !container.classList.contains('hidden'));
    
    // 불필요한 메시지 제거
    
  } catch (error) {
    console.error('❌ 파노라마 초기화 실패:', error);
    console.error('❌ 에러 상세:', error.message, error.stack);
    showToast('이 지역에서는 거리뷰를 사용할 수 없습니다.', 'error');
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
  console.log('🔄 closePanorama 함수 호출됨');
  try {
    const container = document.getElementById('roadviewContainer');
    console.log('🔍 roadviewContainer 찾음:', !!container);
    
    // ROADVIEW 객체 타입 확인 및 안전한 정리
    if (ROADVIEW) {
      console.log('🔄 ROADVIEW 정리 중...');
      console.log('🔍 ROADVIEW 타입:', typeof ROADVIEW);
      console.log('🔍 ROADVIEW 객체:', ROADVIEW);
      
      try {
        if (typeof ROADVIEW.setMap === 'function') {
          ROADVIEW.setMap(null);
        } else if (typeof ROADVIEW.destroy === 'function') {
          ROADVIEW.destroy();
        } else if (ROADVIEW.remove) {
          ROADVIEW.remove();
        }
      } catch (e) {
        console.warn('⚠️ ROADVIEW 정리 중 오류:', e);
      }
      ROADVIEW = null;
    }
    
    // ROADVIEW_MINIMAP 객체 타입 확인 및 안전한 정리
    if (ROADVIEW_MINIMAP) {
      console.log('🔄 ROADVIEW_MINIMAP 정리 중...');
      console.log('🔍 ROADVIEW_MINIMAP 타입:', typeof ROADVIEW_MINIMAP);
      
      try {
        if (typeof ROADVIEW_MINIMAP.setMap === 'function') {
          ROADVIEW_MINIMAP.setMap(null);
        } else if (typeof ROADVIEW_MINIMAP.destroy === 'function') {
          ROADVIEW_MINIMAP.destroy();
        }
      } catch (e) {
        console.warn('⚠️ ROADVIEW_MINIMAP 정리 중 오류:', e);
      }
      ROADVIEW_MINIMAP = null;
    }
    
    // 컨테이너 숨기기 - 여러 방법으로 강제 숨김
    if (container) {
      container.classList.add('hidden');
      container.style.display = 'none';
      container.style.visibility = 'hidden';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      console.log('✅ roadviewContainer 숨김 처리 완료');
      console.log('🔍 컨테이너 스타일:', container.style.display, container.style.visibility);
    } else {
      console.error('❌ roadviewContainer를 찾을 수 없습니다.');
    }
    
    // 지도 다시 초기화
    if (MAP) {
      naver.maps.Event.trigger(MAP, 'resize');
    }
    
    // 불필요한 메시지 제거
  } catch (error) {
    console.error('❌ 파노라마 닫기 중 오류:', error);
    showToast('닫기 중 오류가 발생했습니다.', 'error');
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
      MAP.setMapTypeId(naver.maps.MapTypeId.NORMAL);
      showToast('일반지도로 변경되었습니다.', 'info');
    } else {
      // 위성지도 활성화
      cadastralBtn.classList.add('active');
      MAP.setMapTypeId(naver.maps.MapTypeId.SATELLITE);
      showToast('위성지도로 변경되었습니다.', 'info');
    }
  } catch (error) {
    console.error('❌ 위성지도 변경 중 오류:', error);
    cadastralBtn.classList.remove('active');
    MAP.setMapTypeId(naver.maps.MapTypeId.NORMAL);
    showToast('위성지도 변경 중 오류가 발생했습니다.', 'error');
  }
}

// 거리제기 토글
function toggleDistanceMeasure() {
  const distanceBtn = document.getElementById('distanceBtn');
  if (!distanceBtn) return;
  
  if (IS_DISTANCE_MODE) {
    // 거리제기 모드 비활성화
    IS_DISTANCE_MODE = false;
    distanceBtn.classList.remove('active');
    clearDistanceMeasure();
    showToast('거리제기 모드가 비활성화되었습니다.', 'info');
  } else {
    // 거리제기 모드 활성화
    IS_DISTANCE_MODE = true;
    distanceBtn.classList.add('active');
    showToast('거리제기 모드가 활성화되었습니다. 지도를 클릭하여 거리를 측정하세요.', 'info');
  }
}

// 거리제기 초기화
function clearDistanceMeasure() {
  DISTANCE_POINTS = [];
  
  // 폴리라인 제거
  if (DISTANCE_POLYLINE) {
    DISTANCE_POLYLINE.setMap(null);
    DISTANCE_POLYLINE = null;
  }
  
  // 정보창 제거
  if (DISTANCE_INFO_WINDOW) {
    DISTANCE_INFO_WINDOW.close();
    DISTANCE_INFO_WINDOW = null;
  }
  
  // 거리제기 관련 마커들 제거
  if (MAP._distanceMarkers) {
    MAP._distanceMarkers.forEach(marker => {
      marker.setMap(null);
    });
    MAP._distanceMarkers = [];
  }
  
  // 전역 마커 배열도 정리
  DISTANCE_MARKERS.forEach(marker => {
    marker.setMap(null);
  });
  DISTANCE_MARKERS = [];
  
  DISTANCE_LABELS.forEach(label => {
    label.setMap(null);
  });
  DISTANCE_LABELS = [];
}

// 거리제기 클릭 이벤트 처리
function handleDistanceClick(e) {
  if (!IS_DISTANCE_MODE) return;
  
  const coord = e.coord;
  DISTANCE_POINTS.push(coord);
  
  // 거리제기 마커 배열 초기화
  if (!MAP._distanceMarkers) {
    MAP._distanceMarkers = [];
  }
  
  // 클릭한 지점에 마커 표시
  const marker = new naver.maps.Marker({
    position: coord,
    map: MAP,
    icon: {
      content: `<div style="width: 8px; height: 8px; background: #FF3B30; border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
      anchor: naver.maps && naver.maps.Point ? new naver.maps.Point(4, 4) : undefined
    }
  });
  
  // 마커에 번호 표시
  const label = new naver.maps.Marker({
    position: coord,
    map: MAP,
    icon: {
      content: `<div style="background: #FF3B30; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">${DISTANCE_POINTS.length}</div>`,
      anchor: naver.maps && naver.maps.Point ? new naver.maps.Point(10, 10) : undefined
    }
  });
  
  // 마커들을 배열에 저장
  MAP._distanceMarkers.push(marker, label);
  DISTANCE_MARKERS.push(marker, label);
  
  // 두 점 이상이면 선 그리기
  if (DISTANCE_POINTS.length >= 2) {
    if (DISTANCE_POLYLINE) {
      DISTANCE_POLYLINE.setMap(null);
    }
    
    DISTANCE_POLYLINE = new naver.maps.Polyline({
      path: DISTANCE_POINTS,
      strokeColor: '#FF3B30',
      strokeWeight: 3,
      strokeOpacity: 0.8,
      map: MAP
    });
    
    // 총 거리 계산 및 정보창 표시
    updateDistanceInfo();
  }
}

// 거리 정보 업데이트 및 표시
function updateDistanceInfo() {
  if (DISTANCE_POINTS.length < 2) return;
  
  let totalDistance = 0;
  let segmentDistances = [];
  
  for (let i = 1; i < DISTANCE_POINTS.length; i++) {
    const segmentDistance = getDistanceMeters(DISTANCE_POINTS[i-1], DISTANCE_POINTS[i]);
    totalDistance += segmentDistance;
    segmentDistances.push(segmentDistance);
  }
  
  // 기존 정보창 제거
  if (DISTANCE_INFO_WINDOW) {
    DISTANCE_INFO_WINDOW.close();
  }
  
  // 새로운 정보창 생성
  const infoContent = `
    <div style="padding: 10px; min-width: 200px;">
      <h4 style="margin: 0 0 8px 0; color: #FF3B30;">📏 거리 측정 결과</h4>
      <div style="font-size: 12px; line-height: 1.4;">
        <div><strong>총 거리:</strong> ${(totalDistance / 1000).toFixed(2)}km</div>
        <div><strong>측정 지점:</strong> ${DISTANCE_POINTS.length}개</div>
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
  const lastPoint = DISTANCE_POINTS[DISTANCE_POINTS.length - 1];
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
  
  DISTANCE_INFO_WINDOW = new naver.maps.InfoWindow(infoWindowOptions);
  
  DISTANCE_INFO_WINDOW.open(MAP);
  
  showToast(`총 거리: ${(totalDistance / 1000).toFixed(2)}km (${DISTANCE_POINTS.length}개 지점)`, 'info');
}

// 거리제기 더블클릭 이벤트 처리 (측정 완료)
function handleDistanceDoubleClick(e) {
  if (!IS_DISTANCE_MODE) return;
  
  e.preventDefault();
  
  if (DISTANCE_POINTS.length >= 2) {
    let totalDistance = 0;
    for (let i = 1; i < DISTANCE_POINTS.length; i++) {
      totalDistance += getDistanceMeters(DISTANCE_POINTS[i-1], DISTANCE_POINTS[i]);
    }
    
    showToast(`측정 완료! 총 거리: ${(totalDistance / 1000).toFixed(2)}km`, 'success');
    toggleDistanceMeasure(); // 모드 해제
  }
}

// 거리제기 우클릭 이벤트 처리 (삭제)
function handleDistanceRightClick(e) {
  if (!IS_DISTANCE_MODE || DISTANCE_POINTS.length === 0) return;
  
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
    showToast('거리 측정이 삭제되었습니다.', 'info');
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