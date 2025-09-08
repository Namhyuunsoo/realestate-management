/* -----------------------------------------
 * map-markers.js - 마커 관리
 * ----------------------------------------- */

/**************************************
 * ===== 마커 관리 =====
 **************************************/

function placeMarkers(arr) {
  console.log("🔍 placeMarkers 호출됨, 매물 수:", arr?.length);
  
  if (!MAP) {
    console.error("❌ MAP 객체가 없습니다.");
    return;
  }
  if (!Array.isArray(arr)) {
    console.error("❌ arr가 배열이 아닙니다:", typeof arr);
    return;
  }

  // naver.maps API가 완전히 로드되었는지 확인
  if (!window.naver || !window.naver.maps || typeof naver.maps.LatLng !== 'function') {
    console.error('❌ naver.maps.LatLng이 사용할 수 없습니다.');
    console.log('🔍 naver 객체 상태:', !!window.naver);
    console.log('🔍 naver.maps 객체 상태:', !!window.naver?.maps);
    console.log('🔍 naver.maps.LatLng 함수 상태:', typeof window.naver?.maps?.LatLng);
    return;
  }

  console.log("🔍 placeMarkers: API 확인 완료, 마커 생성 시작");

  // 모바일 환경에서는 기존 마커 제거만 차단 (새 마커 생성은 허용)
  // 단, 사이드바 토글 후 리사이즈 시에는 기존 마커 제거 허용
  const isMobileResize = window.innerWidth <= 768 && window.MARKERS && window.MARKERS.length > 0 && window.isMobileResizeFlag;
  
  if (window.isMobileView && window.MARKERS && window.MARKERS.length > 0 && !isMobileResize) {
    console.log('📱 모바일 환경: 기존 마커 제거 차단됨 - 새 마커 생성 허용');
    
    // 기존 마커는 제거하지 않고, 새 마커만 추가
    if (arr && arr.length > 0) {
      console.log('📱 모바일 환경: 새 마커 생성 시작');
      
      // 기존 마커와 새 데이터 비교하여 추가할 마커만 생성
      const existingIds = new Set(window.MARKERS.map(m => m._listingId));
      const newItems = arr.filter(item => !existingIds.has(item.id));
      
      if (newItems.length > 0) {
        console.log(`📱 모바일 환경: ${newItems.length}개 새 마커 생성`);
        
        newItems.forEach(item => {
          const { lat, lng } = item.coords || {};
          if (lat == null || lng == null) return;
          
          try {
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            
            if (isNaN(latNum) || isNaN(lngNum)) return;
            if (latNum < 33 || latNum > 39 || lngNum < 124 || lngNum > 132) return;
            
            const pos = new naver.maps.LatLng(latNum, lngNum);
            const color = STATUS_COLORS[item.status_raw] || "#007AFF";
            
            const marker = new naver.maps.Marker({
              position: pos,
              map: MAP,
              icon: { content: createMarkerIcon(color, item.id === SELECTED_MARKER_ID, getBriefingStatus(item.id), window.isRecommended ? window.isRecommended(item.id) : false) }
            });
            marker._listingId = item.id;
            
            naver.maps.Event.addListener(marker, "click", () => {
              setActiveMarker(item.id);
              scrollToListing(item.id);
              renderDetailPanel(item);
            });
            
            window.MARKERS.push(marker);
          } catch (error) {
            console.error(`📱 마커 생성 실패:`, error);
          }
        });
        
        console.log(`📱 모바일 환경: 총 ${window.MARKERS.length}개 마커 유지`);
        return; // 새 마커 생성 완료 후 함수 종료
      } else {
        console.log('📱 모바일 환경: 새 마커 없음 - 기존 마커 유지');
        return; // 새 마커가 없으면 함수 종료
      }
    }
    
    return; // 기존 마커가 있으면 함수 종료
  }

  // 모바일 환경에서 마커가 없을 때만 기존 마커 제거 허용
  if (MARKERS && MARKERS.length) {
    if (window.isMobileView) {
      console.log('📱 모바일 환경: 기존 마커 제거 허용 (마커가 없음)');
    }
    MARKERS.forEach(m => m.setMap && m.setMap(null));
    MARKERS = [];
  }
  if (CLUSTERER) {
    try { CLUSTERER.setMap(null); } catch (e) {}
    CLUSTERER = null;
  }

  const bounds = new naver.maps.LatLngBounds();
  let validMarkers = 0;
  let invalidCoords = 0;

  console.log("🔍 placeMarkers: 마커 생성 루프 시작");

  arr.forEach(item => {
    const { lat, lng } = item.coords || {};
    if (lat == null || lng == null) {
      invalidCoords++;
      return;
    }
    
    // naver.maps.LatLng 생성 시 더 강력한 안전장치
    let pos;
    try {
      // 좌표 값이 유효한지 확인
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      if (isNaN(latNum) || isNaN(lngNum)) {
        console.warn(`⚠️ 유효하지 않은 좌표: lat=${lat}, lng=${lng}`);
        return;
      }
      
      // 좌표 범위 확인 (한국 지역)
      if (latNum < 33 || latNum > 39 || lngNum < 124 || lngNum > 132) {
        console.warn(`⚠️ 한국 지역 범위를 벗어난 좌표: lat=${latNum}, lng=${lngNum}`);
        return;
      }
      
      // naver.maps.LatLng 생성 전에 API 확인
      if (typeof naver.maps.LatLng !== 'function') {
        console.error('❌ naver.maps.LatLng이 함수가 아닙니다.');
        return;
      }
      
      pos = new naver.maps.LatLng(latNum, lngNum);
      
      // 생성된 객체가 유효한지 확인
      if (!pos || typeof pos.lat !== 'function' || typeof pos.lng !== 'function') {
        console.error('❌ 생성된 LatLng 객체가 유효하지 않습니다.');
        return;
      }
      
    } catch (error) {
      console.error(`❌ LatLng 생성 실패: lat=${lat}, lng=${lng}`, error);
      return;
    }
    
    const color = STATUS_COLORS[item.status_raw] || "#007AFF";

    const marker = new naver.maps.Marker({
      position: pos,
      map: null,
      icon: { content: createMarkerIcon(color, item.id === SELECTED_MARKER_ID, getBriefingStatus(item.id), window.isRecommended ? window.isRecommended(item.id) : false) }
    });
    marker._listingId = item.id;
    validMarkers++;

    naver.maps.Event.addListener(marker, "click", () => {
      setActiveMarker(item.id);
      scrollToListing(item.id);
      renderDetailPanel(item);
    });

    MARKERS.push(marker);
    bounds.extend(pos);
  });

  // 클러스터 변경 이벤트 리스너 추가
  if (CLUSTERER) {
    CLUSTERER.addListener('cluster_changed', () => {
    
      setTimeout(() => {
        if (typeof bindClusterClickDelegation === 'function') {
          bindClusterClickDelegation();
        }
      }, 100);
    });
    
    // 초기 클러스터 생성 후에도 이벤트 바인딩
    setTimeout(() => {
      if (typeof bindClusterClickDelegation === 'function') {
        bindClusterClickDelegation();
      }
    }, 500);
  }

  // MarkerClustering이 로드될 때까지 대기
  if (typeof MarkerClustering !== "undefined" && MarkerClustering) {
    CLUSTERER = new MarkerClustering({
      minClusterSize: 2,
      maxZoom: MAP.getMaxZoom(),
      map: MAP,
      markers: MARKERS,
      disableClickZoom: true,
      gridSize: 80,

      stylingFunction: function(clusterMarker, count) {
        let cls = "cluster-small";
        if (count >= 50)      cls = "cluster-big";
        else if (count >= 10) cls = "cluster-mid";

        // 클러스터 객체 찾기 (안전하게 처리)
        let clusterObj = null;
        if (CLUSTERER && CLUSTERER._clusters) {
          clusterObj = CLUSTERER._clusters.find(
            c => c._clusterMarker === clusterMarker
          );
        }
        
        // 브리핑 상태 분석
        let bubbleStyle = "";
        let bubbleContent = count;
        
        if (clusterObj && clusterObj.getClusterMember) {
          const clusterMembers = clusterObj.getClusterMember();
          const briefingStats = {
            normal: 0,
            pending: 0,
            completed: 0,
            onhold: 0
          };
          
          // 추천매물 개수 확인
          let recommendedCount = 0;
          
          clusterMembers.forEach(marker => {
            const status = getBriefingStatus(marker._listingId);
            briefingStats[status]++;
            
            // 추천매물 확인
            if (window.isRecommended && window.isRecommended(marker._listingId)) {
              recommendedCount++;
            }
          });
          
          // 추천매물이 있으면 빨간색으로 표시 (최우선)
          if (recommendedCount > 0) {
            bubbleStyle = `background-color: #FF3B30 !important; border: 2px solid white; box-shadow: 0 2px 8px rgba(255,59,48,0.3);`;
          }
          // 브리핑 상태가 있는 매물이 있으면 색상 변경
          else {
            const hasBriefingItems = briefingStats.pending > 0 || briefingStats.completed > 0 || briefingStats.onhold > 0;
            
            if (hasBriefingItems) {
              // 주요 브리핑 상태 결정 (우선순위: 완료 > 예정 > 보류)
              let primaryStatus = BRIEFING_STATUS.NORMAL;
              if (briefingStats.completed > 0) {
                primaryStatus = BRIEFING_STATUS.COMPLETED;
              } else if (briefingStats.pending > 0) {
                primaryStatus = BRIEFING_STATUS.PENDING;
              } else if (briefingStats.onhold > 0) {
                primaryStatus = BRIEFING_STATUS.ONHOLD;
              }
              
              // 브리핑 상태별 색상
              const statusColors = {
                [BRIEFING_STATUS.NORMAL]: '#007AFF',
                [BRIEFING_STATUS.PENDING]: '#FF3B30',
                [BRIEFING_STATUS.COMPLETED]: '#34C759',
                [BRIEFING_STATUS.ONHOLD]: '#AF52DE'
              };
              
              bubbleStyle = `background-color: ${statusColors[primaryStatus]} !important; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);`;
            }
          }
        }

        const bubbleHtml = `<div class="cluster-bubble ${cls}" style="${bubbleStyle}">${bubbleContent}</div>`;
        const wrapper = clusterMarker.getElement();
        wrapper.innerHTML = bubbleHtml;

        try { clusterMarker.setZIndex(8000 + count); } catch (e) {}
      }
    });
    
    // 클러스터 생성 후 이벤트 바인딩
    setTimeout(() => {
      if (typeof bindClusterClickDelegation === 'function') {
        bindClusterClickDelegation();
      }
    }, 500);
  } else {
    // MarkerClustering이 로드되지 않은 경우 개별 마커로 표시
    console.log('⚠️ MarkerClustering이 로드되지 않아 개별 마커로 표시합니다.');
    MARKERS.forEach(m => m.setMap(MAP));
  }
  
  console.log(`✅ placeMarkers 완료: 유효한 마커 ${validMarkers}개, 좌표 없는 매물 ${invalidCoords}개`);
}

function setActiveMarker(id){
  SELECTED_MARKER_ID = id;
  MARKERS.forEach(m => {
    const color = STATUS_COLORS[LISTINGS.find(x => x.id === m._listingId)?.status_raw] || "#007AFF";
    const isActive = (m._listingId === id);
    const briefingStatus = getBriefingStatus(m._listingId);
    m.setIcon({ content: createMarkerIcon(color, isActive, briefingStatus, window.isRecommended ? window.isRecommended(m._listingId) : false) });
    // UI 변동 방지를 위해 z-index 변경 최소화
    // m.setZIndex(isActive ? 9999 : 1);
    m.setZIndex(isActive ? 100 : 1); // 더 낮은 z-index 사용
  });
}

function highlightMarkerTemp(id, on) {
  MARKERS.forEach(m => {
    if (m._listingId === id) {
      const color = STATUS_COLORS[LISTINGS.find(x => x.id === id)?.status_raw] || "#007AFF";
      const isActive = (m._listingId === SELECTED_MARKER_ID);
      const briefingStatus = getBriefingStatus(m._listingId);
      
      if (on) {
        // 마우스오버 시 더 큰 크기와 밝은 색상
        const cls = "marker-dot active";
        m.setIcon({ 
          content: `<div class="${cls}" style="background:${color}; transform: scale(1.5); box-shadow: 0 0 10px ${color};"></div>` 
        });
        // UI 변동 방지를 위해 z-index 변경 최소화
        // m.setZIndex(5000);
        m.setZIndex(50); // 더 낮은 z-index 사용
      } else {
        // 마우스아웃 시 원래 상태로 복원 (브리핑 상태 포함)
        m.setIcon({ content: createMarkerIcon(color, isActive, briefingStatus, window.isRecommended ? window.isRecommended(m._listingId) : false) });
        // UI 변동 방지를 위해 z-index 변경 최소화
        // m.setZIndex(isActive ? 9999 : 1);
        m.setZIndex(isActive ? 100 : 1); // 더 낮은 z-index 사용
      }
    }
  });
}

function focusMarker(id, panTo = true) {
  const marker = MARKERS.find(m => m._listingId === id);
  if (!marker) return;
  setActiveMarker(id);
  if (panTo) {
    try { MAP.panTo(marker.getPosition()); } catch(e){}
  }
}

function createMarkerIcon(color = "#007AFF", active = false, briefingStatus = BRIEFING_STATUS.NORMAL, isRecommended = false){
  // 브리핑 상태에 따른 색상 결정
  let markerColor = color;
  if (briefingStatus !== BRIEFING_STATUS.NORMAL) {
    const statusColors = {
      [BRIEFING_STATUS.PENDING]: '#FF3B30',    // 빨간색 (예정)
      [BRIEFING_STATUS.COMPLETED]: '#34C759',  // 초록색 (완료)
      [BRIEFING_STATUS.ONHOLD]: '#AF52DE'      // 보라색 (보류)
    };
    markerColor = statusColors[briefingStatus] || color;
  }
  
  // 추천된 매물인 경우 색상과 스타일 변경
  if (isRecommended) {
    markerColor = '#FF3B30'; // 빨간색
  }
  
  let cls = active ? "marker-dot active" : "marker-dot";
  if (isRecommended) {
    cls += " recommended";
  }
  
  return `<div class="${cls}" style="background:${markerColor};"></div>`;
}

function fixMapLayoutAfterShow() {
  const doFix = () => {
    // CSS Grid 레이아웃을 사용하므로 setLayoutHeight 호출 제거
    // 대신 지도 리사이즈만 트리거
    if (MAP && MAP_READY) {
      naver.maps.Event.trigger(MAP, 'resize');
    }
  };
  requestAnimationFrame(doFix);
  setTimeout(doFix, 350);
}

function calcHaversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function getDistanceMeters(centerLatLng, targetLatLng) {
  if (window.naver && naver.maps &&
      naver.maps.GeometryUtil && naver.maps.GeometryUtil.getDistance) {
    return naver.maps.GeometryUtil.getDistance(centerLatLng, targetLatLng);
  }
  return calcHaversineMeters(
    centerLatLng.lat(), centerLatLng.lng(),
    targetLatLng.lat(), targetLatLng.lng()
  );
}

function computeDistancesIfNeeded() {
  if (!MAP) return;
  const c = MAP.getCenter();
  if (!c) return;

  // naver.maps API가 완전히 로드되었는지 확인
  if (!window.naver || !window.naver.maps || typeof naver.maps.LatLng !== 'function') {
    console.error('❌ naver.maps.LatLng이 사용할 수 없습니다.');
    console.log('🔍 naver 객체 상태:', !!window.naver);
    console.log('🔍 naver.maps 객체 상태:', !!window.naver?.maps);
    console.log('🔍 naver.maps.LatLng 함수 상태:', typeof window.naver?.maps?.LatLng);
    return;
  }

  const cx = c.x, cy = c.y;
  if (LAST_DISTANCE_CENTER && LAST_DISTANCE_CENTER.x === cx && LAST_DISTANCE_CENTER.y === cy) {
    return;
  }
  LAST_DISTANCE_CENTER = { x: cx, y: cy };

  LISTINGS.forEach(item => {
    const { lat, lng } = item.coords || {};
    if (lat == null || lng == null) return;
    
    // naver.maps.LatLng 생성 시 더 강력한 안전장치
    let targetLatLng;
    try {
      // 좌표 값이 유효한지 확인
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      if (isNaN(latNum) || isNaN(lngNum)) {
        console.warn(`⚠️ 유효하지 않은 좌표: lat=${lat}, lng=${lng}`);
        return;
      }
      
      // naver.maps.LatLng 생성 전에 API 확인
      if (typeof naver.maps.LatLng !== 'function') {
        console.error('❌ naver.maps.LatLng이 함수가 아닙니다.');
        return;
      }
      
      targetLatLng = new naver.maps.LatLng(latNum, lngNum);
      
      // 생성된 객체가 유효한지 확인
      if (!targetLatLng || typeof targetLatLng.lat !== 'function' || typeof targetLatLng.lng !== 'function') {
        console.error('❌ 생성된 LatLng 객체가 유효하지 않습니다.');
        return;
      }
      
    } catch (error) {
      console.error(`❌ LatLng 생성 실패: lat=${lat}, lng=${lng}`, error);
      return;
    }
    
    const distance = getDistanceMeters(c, targetLatLng);
    item.distance = distance;
  });
}

function assignTempCoords() {
  if (!Array.isArray(LISTINGS)) {
    console.warn('⚠️ LISTINGS가 배열이 아닙니다.');
    return;
  }
  
  console.log("🔍 assignTempCoords 시작, 매물 수:", LISTINGS.length);
  
  let validCoords = 0;
  let invalidCoords = 0;
  
  // 좌표가 없는 매물들은 지도에 표시하지 않음
  LISTINGS.forEach((item, index) => {
    if (!item.coords || !item.coords.lat || !item.coords.lng) {
      // 좌표가 없는 경우 null로 설정하여 지도에 표시하지 않음
      item.coords = { lat: null, lng: null };
      invalidCoords++;
    } else {
      // 기존 좌표가 있는 경우 유효성 검사만 수행
      const lat = parseFloat(item.coords.lat);
      const lng = parseFloat(item.coords.lng);
      
      if (isNaN(lat) || isNaN(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
        console.warn(`⚠️ 유효하지 않은 기존 좌표 발견: ${item.id || index} -> (${item.coords.lat}, ${item.coords.lng})`);
        // 유효하지 않은 좌표는 null로 설정
        item.coords = { lat: null, lng: null };
        invalidCoords++;
      } else {
        validCoords++;
      }
    }
  });
  
  console.log(`✅ assignTempCoords 완료: 유효한 좌표 ${validCoords}개, 좌표 없는 매물 ${invalidCoords}개`);
}

// 마커 관련 함수들을 전역으로 export
window.placeMarkers = placeMarkers;
window.setActiveMarker = setActiveMarker;
window.highlightMarkerTemp = highlightMarkerTemp;
window.focusMarker = focusMarker;
/**
 * 추천 상태 변경 시 마커 업데이트
 */
function updateMapMarkerRecommendation(listingId) {
  if (!MARKERS) return;
  
  const marker = MARKERS.find(m => m._listingId === listingId);
  if (!marker) return;
  
  const color = STATUS_COLORS[LISTINGS.find(x => x.id === listingId)?.status_raw] || "#007AFF";
  const isActive = (marker._listingId === SELECTED_MARKER_ID);
  const briefingStatus = getBriefingStatus(listingId);
  const isRecommended = window.isRecommended ? window.isRecommended(listingId) : false;
  
  marker.setIcon({ content: createMarkerIcon(color, isActive, briefingStatus, isRecommended) });
}

/**
 * 모든 마커의 추천 상태 강제 업데이트
 */
function updateAllMarkersRecommendationStatus() {
  if (!MARKERS || MARKERS.length === 0) return;
  
  console.log('🔄 모든 마커의 추천 상태 업데이트 시작...');
  
  MARKERS.forEach(marker => {
    if (!marker || !marker._listingId) return;
    
    const color = STATUS_COLORS[LISTINGS.find(x => x.id === marker._listingId)?.status_raw] || "#007AFF";
    const isActive = (marker._listingId === SELECTED_MARKER_ID);
    const briefingStatus = getBriefingStatus(marker._listingId);
    const isRecommended = window.isRecommended ? window.isRecommended(marker._listingId) : false;
    
    try {
      marker.setIcon({ content: createMarkerIcon(color, isActive, briefingStatus, isRecommended) });
    } catch (error) {
      console.warn(`⚠️ 마커 ${marker._listingId} 업데이트 실패:`, error);
    }
  });
  
  console.log('✅ 모든 마커의 추천 상태 업데이트 완료');
}

/**
 * 클러스터 버블의 추천 상태 업데이트 (추천 데이터 로드 후 호출)
 */
function updateClusterBubblesRecommendationStatus() {
  if (!CLUSTERER || !CLUSTERER._clusters) return;
  
  console.log('🔄 클러스터 버블 추천 상태 업데이트 시작...');
  
  CLUSTERER._clusters.forEach(cluster => {
    if (!cluster || !cluster._clusterMarker) return;
    
    const clusterMembers = cluster.getClusterMember();
    if (!clusterMembers || clusterMembers.length === 0) return;
    
    // 추천매물 개수 확인
    let recommendedCount = 0;
    clusterMembers.forEach(marker => {
      if (window.isRecommended && window.isRecommended(marker._listingId)) {
        recommendedCount++;
      }
    });
    
    // 추천매물이 있으면 빨간색으로 업데이트
    if (recommendedCount > 0) {
      const bubble = cluster._clusterMarker.getElement().querySelector('.cluster-bubble');
      if (bubble) {
        bubble.style.backgroundColor = '#FF3B30';
        bubble.style.border = '2px solid white';
        bubble.style.boxShadow = '0 2px 8px rgba(255,59,48,0.3)';
      }
    }
  });
  
  console.log('✅ 클러스터 버블 추천 상태 업데이트 완료');
}

// 전역 함수로 export
window.updateMapMarkerRecommendation = updateMapMarkerRecommendation;
window.updateAllMarkersRecommendationStatus = updateAllMarkersRecommendationStatus;
window.updateClusterBubblesRecommendationStatus = updateClusterBubblesRecommendationStatus;
window.fixMapLayoutAfterShow = fixMapLayoutAfterShow;
window.calcHaversineMeters = calcHaversineMeters;
window.getDistanceMeters = getDistanceMeters;
window.computeDistancesIfNeeded = computeDistancesIfNeeded;
window.assignTempCoords = assignTempCoords; 