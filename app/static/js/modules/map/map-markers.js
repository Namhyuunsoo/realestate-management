/* -----------------------------------------
 * map-markers.js - 마커 관리
 * ----------------------------------------- */

/**************************************
 * ===== 마커 관리 =====
 **************************************/

// 마커 재사용을 위한 캐시 (listingId -> Marker객체)
let MARKER_MAP = new Map();

function placeMarkers(arr) {
  if (PLACING_MARKERS || window.PLACING_MARKERS) return;

  PLACING_MARKERS = true;
  window.PLACING_MARKERS = true;

  try {
    if (!MAP) {
      console.error("❌ MAP 객체가 없습니다.");
      return;
    }
    if (!Array.isArray(arr)) {
      console.error("❌ arr가 배열이 아닙니다:", typeof arr);
      return;
    }

    if (!window.naver || !window.naver.maps || typeof naver.maps.LatLng !== 'function') {
      console.error('❌ naver.maps.LatLng이 사용할 수 없습니다.');
      return;
    }

    // 1. 기존 CLUSTERER 제거 (매번 새로 생성해야 하거나 업데이트해야 함)
    if (CLUSTERER) {
      try {
        CLUSTERER.setMap(null);
      } catch (e) { }
      CLUSTERER = null;
    }

    const bounds = MAP.getBounds();
    const isZoomLarge = MAP.getZoom() >= 14;

    // 현재 표시해야 할 마커 ID 목록
    const targetIds = new Set(arr.map(item => item.id));

    // 2. 캐시된 마커들 중 현재 리스트에 없는 것은 지도에서 제거 (메모리 해제는 하지 않음)
    MARKER_MAP.forEach((marker, id) => {
      if (!targetIds.has(id)) {
        marker.setMap(null);
      }
    });

    const activeMarkers = [];
    let validMarkers = 0;
    let invalidCoords = 0;

    // 3. 현재 리스트 순회하며 마커 생성 또는 재사용
    arr.forEach(item => {
      const { lat, lng } = item.coords || {};
      if (lat == null || lng == null) {
        invalidCoords++;
        return;
      }

      let marker = MARKER_MAP.get(item.id);

      if (!marker) {
        let pos;
        try {
          const latNum = parseFloat(lat);
          const lngNum = parseFloat(lng);
          if (isNaN(latNum) || isNaN(lngNum)) {
            invalidCoords++;
            return;
          }
          pos = new naver.maps.LatLng(latNum, lngNum);
        } catch (error) {
          invalidCoords++;
          return;
        }

        const color = STATUS_COLORS[item.status_raw] || "#007AFF";
        marker = new naver.maps.Marker({
          position: pos,
          map: null,
          icon: { content: createMarkerIcon(color, item.id === SELECTED_MARKER_ID, getBriefingStatus(item.id), (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) ? window.USER_RECOMMENDATIONS.has(item.id) : false) }
        });
        marker._listingId = item.id;

        naver.maps.Event.addListener(marker, "click", () => {
          hideClusterList();
          setActiveMarker(item.id);
          scrollToListing(item.id);
          renderDetailPanel(item);
        });

        MARKER_MAP.set(item.id, marker);
      } else {
        // 이미 존재하는 마커인 경우 아이콘 업데이트 (상태가 변했을 수 있음)
        const color = STATUS_COLORS[item.status_raw] || "#007AFF";
        const isActive = (item.id === SELECTED_MARKER_ID);
        const briefingStatus = getBriefingStatus(item.id);
        const isRecommended = (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) ? window.USER_RECOMMENDATIONS.has(item.id) : false;

        // 아이콘 내용이 달라졌을 때만 업데이트하여 성능 최적화
        const newIconContent = createMarkerIcon(color, isActive, briefingStatus, isRecommended);
        if (marker.getIcon().content !== newIconContent) {
          marker.setIcon({ content: newIconContent });
        }
      }

      activeMarkers.push(marker);
      validMarkers++;
    });

    // MARKERS 배열 업데이트 (다른 함수에서 참조하므로)
    MARKERS = activeMarkers;

    if (typeof MarkerClustering !== "undefined" && MarkerClustering) {
      CLUSTERER = new MarkerClustering({
        minClusterSize: 2,
        maxZoom: MAP.getMaxZoom(),
        map: MAP,
        markers: MARKERS,
        disableClickZoom: true,
        gridSize: 80,
        stylingFunction: function (clusterMarker, count) {
          let cls = count >= 50 ? "cluster-big" : (count >= 10 ? "cluster-mid" : "cluster-small");
          const bubbleHtml = `<div class="cluster-bubble ${cls}">${count}</div>`;
          clusterMarker.getElement().innerHTML = bubbleHtml;
          try { clusterMarker.setZIndex(8000 + count); } catch (e) { }
        }
      });
      window.CLUSTERER = CLUSTERER;

      // 클러스터 변경 리스너 등록
      if (window._clusterChangedListener) {
        try { CLUSTERER.removeListener('cluster_changed', window._clusterChangedListener); } catch (e) { }
      }
      window._clusterChangedListener = () => {
        if (window.updateClusterBubblesRecommendationStatus) window.updateClusterBubblesRecommendationStatus();
        if (typeof bindClusterClickDelegation === 'function') bindClusterClickDelegation();
      };
      CLUSTERER.addListener('cluster_changed', window._clusterChangedListener);

      setTimeout(() => {
        if (window.updateClusterBubblesRecommendationStatus) window.updateClusterBubblesRecommendationStatus();
        if (typeof bindClusterClickDelegation === 'function') bindClusterClickDelegation();
        if (typeof window.updateClusterBubbles === 'function') window.updateClusterBubbles();
      }, 500);

    } else {
      MARKERS.forEach(m => m.setMap(MAP));
    }

    // console.log(`✅ placeMarkers 완료: 유효한 마커 ${validMarkers}개, 좌표 없는 매물 ${invalidCoords}개 (재사용 마커 포함)`);
  } catch (err) {
    console.error("❌ placeMarkers 실행 중 오류:", err);
  } finally {
    PLACING_MARKERS = false;
    window.PLACING_MARKERS = false;
  }
}

function setActiveMarker(id) {
  SELECTED_MARKER_ID = id;
  MARKERS.forEach(m => {
    const color = STATUS_COLORS[LISTINGS.find(x => x.id === m._listingId)?.status_raw] || "#007AFF";
    const isActive = (m._listingId === id);
    const briefingStatus = getBriefingStatus(m._listingId);

    // 🔥 추천 상태 확인 강화
    let isRecommended = false;
    if (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) {
      isRecommended = window.USER_RECOMMENDATIONS.has(m._listingId);
    }

    m.setIcon({ content: createMarkerIcon(color, isActive, briefingStatus, isRecommended) });
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
        // 🔥 추천 상태 확인 강화
        let isRecommended = false;
        if (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) {
          isRecommended = window.USER_RECOMMENDATIONS.has(m._listingId);
        }

        m.setIcon({ content: createMarkerIcon(color, isActive, briefingStatus, isRecommended) });
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
    try { MAP.panTo(marker.getPosition()); } catch (e) { }
  }
}

function createMarkerIcon(color = "#007AFF", active = false, briefingStatus = BRIEFING_STATUS.NORMAL, isRecommended = false) {
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
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
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
  const isRecommended = (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) ? window.USER_RECOMMENDATIONS.has(listingId) : false;

  marker.setIcon({ content: createMarkerIcon(color, isActive, briefingStatus, isRecommended) });
}

/**
 * 모든 마커의 추천 상태 강제 업데이트
 */
function updateAllMarkersRecommendationStatus() {
  if (!MARKERS || MARKERS.length === 0) return;

  // console.log('🔄 모든 마커의 추천 상태 업데이트 시작...');

  MARKERS.forEach(marker => {
    if (!marker || !marker._listingId) return;

    const color = STATUS_COLORS[LISTINGS.find(x => x.id === marker._listingId)?.status_raw] || "#007AFF";
    const isActive = (marker._listingId === SELECTED_MARKER_ID);
    const briefingStatus = getBriefingStatus(marker._listingId);
    const isRecommended = (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) ? window.USER_RECOMMENDATIONS.has(marker._listingId) : false;

    try {
      marker.setIcon({ content: createMarkerIcon(color, isActive, briefingStatus, isRecommended) });
    } catch (error) {
      console.warn(`⚠️ 마커 ${marker._listingId} 업데이트 실패:`, error);
    }
  });

  // console.log('✅ 모든 마커의 추천 상태 업데이트 완료');
}

/**
 * 클러스터 버블의 추천 상태 업데이트 (추천 데이터 로드 후 호출)
 */
function updateClusterBubblesRecommendationStatus() {
  const clusterer = window.CLUSTERER || CLUSTERER;
  if (!clusterer || !clusterer._clusters) {
    console.log('⚠️ CLUSTERER 또는 _clusters가 없습니다:', { clusterer, clusters: clusterer?._clusters });
    return;
  }

  // 🔥 추천 데이터 로드 상태 확인 (더 관대하게)
  if (!window.USER_RECOMMENDATIONS) {
    console.log('⚠️ 추천 데이터가 아직 로드되지 않음, 업데이트 건너뜀');
    return;
  }

  // console.log('🔄 클러스터 버블 추천 상태 업데이트 시작...');

  clusterer._clusters.forEach(cluster => {
    if (!cluster || !cluster._clusterMarker) return;

    const clusterMembers = cluster.getClusterMember();
    if (!clusterMembers || clusterMembers.length === 0) return;

    // 추천매물 개수 확인
    let recommendedCount = 0;
    clusterMembers.forEach(marker => {
      if (window.USER_RECOMMENDATIONS.has && window.USER_RECOMMENDATIONS.has(marker._listingId)) {
        recommendedCount++;
      }
    });

    // 추천매물이 있으면 빨간색으로 업데이트
    if (recommendedCount > 0) {
      const clusterElement = cluster._clusterMarker.getElement();

      // 클러스터 요소 자체가 버블인지 확인
      let bubble = clusterElement.classList.contains('cluster-bubble') ? clusterElement : null;

      // 클러스터 요소 내부에서 버블 찾기
      if (!bubble) {
        bubble = clusterElement.querySelector('.cluster-bubble');
      }

      if (bubble) {
        // 🔥 이중 보안: 속성과 클래스 모두 설정
        bubble.setAttribute('data-recommended', 'true');
        bubble.classList.add('recommended');

        // 🔥 강제 스타일 적용 (CSS 로딩 지연 대비)
        bubble.style.setProperty('background-color', '#FF3B30', 'important');
        bubble.style.setProperty('border', '2px solid white', 'important');
        bubble.style.setProperty('box-shadow', '0 2px 8px rgba(255,59,48,0.3)', 'important');

        console.log(`✅ 클러스터 버블 색상 업데이트됨: ${recommendedCount}개 추천매물`, bubble);
      } else {
        console.log(`❌ 클러스터 버블을 찾을 수 없음:`, clusterElement);
      }
    }
  });

  // console.log('✅ 클러스터 버블 추천 상태 업데이트 완료');
}

// 전역 함수로 export
window.updateMapMarkerRecommendation = updateMapMarkerRecommendation;
window.updateAllMarkersRecommendationStatus = updateAllMarkersRecommendationStatus;
window.updateClusterBubblesRecommendationStatus = updateClusterBubblesRecommendationStatus;
window.fixMapLayoutAfterShow = fixMapLayoutAfterShow;
window.calcHaversineMeters = calcHaversineMeters;
window.getDistanceMeters = getDistanceMeters;
window.assignTempCoords = assignTempCoords;
window.CLUSTERER = CLUSTERER; // 클러스터 객체 전역 노출 