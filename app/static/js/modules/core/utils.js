/* -----------------------------------------
 * utils.js - 유틸리티 함수들
 * ----------------------------------------- */

/**************************************
 * ===== 유틸리티 함수들 =====
 **************************************/

function runAfterMapReady(fn) {
  if (MAP_READY) {
    fn();
  } else {
    MAP_READY_QUEUE.push(fn);
  }
}

function clearSelection() {
  SELECTED_MARKER_ID = null;
  MARKERS.forEach(m => {
    const listing = LISTINGS.find(x => x.id === m._listingId);
    const color = STATUS_COLORS[listing?.status_raw] || "#007AFF";
    const briefingStatus = getBriefingStatus(m._listingId);

    // 🔥 추천 상태 확인 강화
    let isRecommended = false;
    if (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) {
      isRecommended = window.USER_RECOMMENDATIONS.has(m._listingId);
    }

    m.setIcon({ content: createMarkerIcon(color, false, briefingStatus, isRecommended) });
    m.setZIndex(1);
  });

  // 매물리스트 하이라이트 제거 (UI 크기나 위치는 변경하지 않음)
  document.querySelectorAll("#listingList .listing-item.selected")
    .forEach(el => el.classList.remove("selected"));

  // 클러스터 목록 하이라이트 제거 (더 강력한 선택자 사용, UI 크기나 위치는 변경하지 않음)
  document.querySelectorAll("#clusterItemList li.selected")
    .forEach(el => el.classList.remove("selected"));
  document.querySelectorAll("#clusterList li.selected")
    .forEach(el => el.classList.remove("selected"));

  // 클러스터 목록 닫기 제거 - UI 변동 방지를 위해
  // hideClusterList();
}

function setCenterWithOffset(latlng, offsetX, offsetY) {
  if (!MAP) return;
  MAP.setCenter(latlng);
  MAP.panBy(offsetX, offsetY);
}

function focusListing(listingId) {
  setActiveMarker(listingId);
  document.querySelectorAll('.listing-item.selected, .cluster-item.selected')
    .forEach(el => el.classList.remove('selected'));

  const li = document.querySelector(`#listingList li[data-id="${listingId}"]`);
  if (li) li.classList.add('selected');

  let clusterObj = null;
  if (CLUSTERER && CLUSTERER._clusters) {
    clusterObj = CLUSTERER._clusters.find(c =>
      c.getClusterMember().some(m => m._listingId == listingId)
    );
  }

  const vp = MAP.getSize();
  const yOffset = (vp.h / 2 - 200);

  if (clusterObj) {
    const cm = clusterObj._clusterMarker;
    const bubble = cm.getElement().querySelector('.cluster-bubble');
    if (bubble) {
      bubble.classList.remove('cluster-animate');
      void bubble.offsetWidth;
      bubble.classList.add('cluster-animate');
    }
  }
}

// dbg 함수는 index.html / globals.js로 이동됨

function timeStart(label) {
  if (window.DEBUG) console.time(label);
}

function timeEnd(label, extra = {}) {
  if (window.DEBUG) {
    console.timeEnd(label);
    if (Object.keys(extra).length > 0) {
      console.log(`${label} extra:`, extra);
    }
  }
}

function setLayoutHeight() {
  // CSS Grid 레이아웃을 사용하므로 JavaScript로 높이를 조정할 필요가 없음
  // 대신 지도 리사이즈만 트리거하고, 레이아웃 안정성을 위해 최소한의 조정만 수행

  // CSS Grid 레이아웃이 이미 올바르게 설정되어 있으므로 추가 조정 불필요
  // 단, 지도가 있는 경우에만 리사이즈 트리거
  if (typeof MAP !== 'undefined' && MAP && MAP_READY) {
    try {
      // requestAnimationFrame을 사용하여 레이아웃 계산 완료 후 리사이즈 트리거
      requestAnimationFrame(() => {
        naver.maps.Event.trigger(MAP, 'resize');
      });
    } catch (e) {
      console.log('지도 리사이즈 트리거 실패:', e);
    }
  }
}

function parseNumber(str) {
  if (!str) return null;
  const num = parseFloat(str.toString().replace(/[^\d.-]/g, ''));
  return isNaN(num) ? null : num;
}

function parseFloorInputToRange(str) {
  if (!str) return null;
  // Normalize "지하" and "B" to leading "-" for parsing
  let cleanedStr = str.toString().toLowerCase();
  cleanedStr = cleanedStr.replace(/지하(\d+)/g, '-$1'); // 지하1 -> -1
  cleanedStr = cleanedStr.replace(/b(\d+)/g, '-$1');    // B2 -> -2
  cleanedStr = cleanedStr.replace(/[^\d~-]/g, ''); // Remove other non-numeric/range chars

  // Try to match a range pattern: optional_minus_digit+ (range_separator) optional_minus_digit+
  const rangeMatch = cleanedStr.match(/^(-?\d+)[~-](-?\d+)$/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min: Math.min(min, max), max: Math.max(min, max) }; // Ensure min <= max
    }
  }

  // Try to match a single number pattern: optional_minus_digit+
  const singleMatch = cleanedStr.match(/^(-?\d+)$/);
  if (singleMatch) {
    const single = parseInt(singleMatch[1]);
    if (!isNaN(single)) {
      return { min: single, max: single };
    }
  }

  return null;
}

function buildFloorFilter(input) {
  return parseFloorInputToRange(input);
}

function parseFloorValue(raw) {
  if (!raw) return null;

  // If raw is already a number, return it directly
  if (typeof raw === 'number') {
    return raw;
  }

  const str = raw.toString().toLowerCase();

  // Check for "지하" or "B" indicating negative floors
  if (str.includes('지하') || str.includes('b')) {
    const match = str.match(/(\d+)/); // Find the first number
    if (match) {
      return -parseInt(match[1]); // Return as negative
    }
  }

  // Check if the string starts with a minus sign (negative number)
  if (str.startsWith('-')) {
    const match = str.match(/-(\d+)/);
    if (match) {
      return -parseInt(match[1]); // Return as negative
    }
  }

  // For positive floors, just extract the first number
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function parseRangeFlexible(str) {
  if (!str) return null;
  const clean = str.toString().replace(/[^\d~-]/g, '');
  if (clean.includes('~') || clean.includes('-')) {
    const parts = clean.split(/[~-]/);
    if (parts.length === 2) {
      const min = parseFloat(parts[0]);
      const max = parseFloat(parts[1]);
      if (!isNaN(min) && !isNaN(max)) {
        return { min, max };
      }
      // "20-" 같은 형식 처리 (최소값만 있고 최대값이 없는 경우)
      if (!isNaN(min) && parts[1] === '') {
        return { min, type: 'gte' };
      }
    }
  }
  const single = parseFloat(clean);
  return isNaN(single) ? null : { min: single, max: single };
}

function buildNumFilter(input, kind) {
  if (!input) return null;
  const range = parseRangeFlexible(input);
  if (range) {
    // parseRangeFlexible에서 이미 type이 설정된 경우 그대로 사용
    if (range.type) {
      return range;
    }
    // 범위 검색인 경우 type을 'range'로 설정
    return { ...range, type: 'range' };
  }
  const single = parseFloat(input);
  if (!isNaN(single)) {
    // 면적 필터의 경우 단일값은 '이상' 검색으로 처리
    if (kind === 'area_real' || kind === 'gte') {
      return { min: single, type: 'gte' };
    }
    return { min: single, max: single, type: kind };
  }
  return null;
}

function checkNumFilter(value, filter) {
  if (!filter || value == null) return true;
  if (filter.type === 'gte') return value >= filter.min;
  if (filter.type === 'lte') return value <= filter.max;
  if (filter.type === 'range') return value >= filter.min && value <= filter.max;
  return value >= filter.min && value <= filter.max;
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

function parseTextTokens(str) {
  if (!str) return [];
  return str.split(",").map(s => s.trim()).filter(Boolean);
}

function matchesTextTokens(value, tokens) {
  if (!tokens || tokens.length === 0) return true;
  const v = (value || "").toString();
  if (!v) return false;
  return tokens.some(t => v.includes(t));
}

function escapeHtml(str) {
  // 숫자나 다른 타입을 문자열로 변환
  const safeStr = String(str ?? "");
  return safeStr.replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

// NaN 값을 빈 문자열로 변환하는 함수
function cleanValue(value) {
  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
    return '';
  }
  return value;
}

// 객체에서 NaN 값을 제거하는 함수
function cleanObject(obj) {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
      cleaned[key] = '';
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// 동적 높이 계산 시스템 - CSS에서 이미 모든 위치가 고정되어 있으므로 비활성화
function calculateSecondaryPanelPosition() {
  // CSS에서 이미 모든 요소의 위치가 올바르게 설정되어 있으므로
  // JavaScript로 재설정하지 않음 (레이아웃 충돌 방지)
  return;
}

// ResizeObserver를 사용하여 레이아웃 변경 시 자동으로 위치 재계산
function setupLayoutObserver() {
  const topbar = document.getElementById('topbar');
  const statusCounts = document.getElementById('statusCounts');
  const topFilterBar = document.getElementById('topFilterBar');

  if (!topbar || !statusCounts || !topFilterBar) return;

  const resizeObserver = new ResizeObserver(() => {
    calculateSecondaryPanelPosition();
  });

  // 각 상단 요소들을 관찰
  resizeObserver.observe(topbar);
  resizeObserver.observe(statusCounts);
  resizeObserver.observe(topFilterBar);

  // 초기 위치 계산
  calculateSecondaryPanelPosition();
}

// 페이지 로드 시 레이아웃 관찰자 설정
document.addEventListener('DOMContentLoaded', () => {
  // 기존 초기화 코드가 실행된 후 레이아웃 관찰자 설정
  setTimeout(() => {
    setupLayoutObserver();
  }, 100);
});

// 윈도우 리사이즈 시에도 위치 재계산 (실제 창 크기 변경만 감지)
window.addEventListener('resize', () => {
  // 실제 창 크기 변경인지 확인 (스크롤바 등으로 인한 가짜 리사이즈 무시)
  if (isRealWindowResize()) {
    calculateSecondaryPanelPosition();
  }
});

/**
 * 모바일 앱 전체 높이를 조정하는 함수
 */
function adjustMobileAppHeight() {
  if (window.innerWidth <= 768) {
    // 모바일 앱 전체 높이를 화면 높이에 맞춤
    const screenHeight = window.innerHeight;
    const visualViewportHeight = window.visualViewport ? window.visualViewport.height : screenHeight;

    // 실제 사용 가능한 높이 계산 (브라우저 UI 제외)
    const availableHeight = Math.min(screenHeight, visualViewportHeight);

    // body와 layout에 화면 높이 적용
    document.body.style.height = `${availableHeight}px`;
    document.body.style.maxHeight = `${availableHeight}px`;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '0';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.bottom = '0';
    document.body.style.width = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    const layout = document.getElementById('layout');
    if (layout) {
      layout.style.height = `${availableHeight}px`;
      layout.style.maxHeight = `${availableHeight}px`;
      layout.style.position = 'relative';
      layout.style.overflow = 'hidden';
      layout.style.width = '100%';
      layout.style.margin = '0';
      layout.style.padding = '0';
    }

    // 메인 콘텐츠에 화면 높이 적용
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      mainContent.style.height = `${availableHeight}px`;
      mainContent.style.maxHeight = `${availableHeight}px`;
      mainContent.style.position = 'relative';
      mainContent.style.overflow = 'hidden';
      mainContent.style.margin = '0';
      mainContent.style.padding = '0';
    }

    // 지도에 화면 높이 적용
    const map = document.getElementById('map');
    if (map) {
      map.style.height = `${availableHeight}px`;
      map.style.maxHeight = `${availableHeight}px`;
      map.style.position = 'relative';
      map.style.margin = '0';
      map.style.padding = '0';
    }

    // 사이드바는 CSS에서 이미 올바르게 설정되어 있으므로 JavaScript로 재설정하지 않음
    // PC 환경에서는 사이드바 높이를 변경하면 안 됨

    // 모바일 노치에 화면 높이 적용
    const mobileNotch = document.querySelector('.mobile-notch');
    if (mobileNotch) {
      mobileNotch.style.bottom = '0';
    }

    // 2차 사이드바에 화면 높이 적용 - 정확한 버전
    const secondaryPanel = document.getElementById('secondaryPanel');
    if (secondaryPanel) {
      secondaryPanel.style.height = `${availableHeight}px`;
      secondaryPanel.style.maxHeight = `${availableHeight}px`;
      secondaryPanel.style.minHeight = `${availableHeight}px`;
      secondaryPanel.style.bottom = '0';
      secondaryPanel.style.top = '0';
      secondaryPanel.style.overflow = 'hidden';
      secondaryPanel.style.position = 'fixed';
      secondaryPanel.style.margin = '0';
      secondaryPanel.style.padding = '0';

      // 2차 사이드바 내부 컨테이너들도 높이 조정 - 정확한 버전
      const panelBody = secondaryPanel.querySelector('.panel-body');
      if (panelBody) {
        panelBody.style.height = `${availableHeight}px`;
        panelBody.style.maxHeight = `${availableHeight}px`;
        panelBody.style.overflow = 'auto';
        panelBody.style.padding = '15px';
        panelBody.style.paddingBottom = '10px'; // 최소한의 하단 여백만
        panelBody.style.margin = '0';
        panelBody.style.position = 'relative';
      }

      const panelView = secondaryPanel.querySelector('.panel-view');
      if (panelView) {
        panelView.style.height = `${availableHeight}px`;
        panelView.style.maxHeight = `${availableHeight}px`;
        panelView.style.overflow = 'auto';
        panelView.style.margin = '0';
        panelView.style.padding = '0';
      }

      // 폼 액션 버튼들을 하단에 고정 - 정확한 버전
      const formActions = secondaryPanel.querySelector('.form-actions');
      if (formActions) {
        formActions.style.position = 'sticky';
        formActions.style.bottom = '0';
        formActions.style.background = 'white';
        formActions.style.padding = '10px 0';
        formActions.style.borderTop = '1px solid #eee';
        formActions.style.marginTop = '10px';
        formActions.style.zIndex = '10';
        formActions.style.width = '100%';
        formActions.style.left = '0';
        formActions.style.right = '0';
      }

      const detailActions = secondaryPanel.querySelector('.detail-actions');
      if (detailActions) {
        detailActions.style.position = 'sticky';
        detailActions.style.bottom = '0';
        detailActions.style.background = 'white';
        detailActions.style.padding = '10px 0';
        detailActions.style.borderTop = '1px solid #eee';
        detailActions.style.zIndex = '10';
        detailActions.style.marginTop = '10px';
        detailActions.style.width = '100%';
        detailActions.style.left = '0';
        detailActions.style.right = '0';
      }

      // 클러스터 리스트 정확한 높이 조정
      const clusterList = secondaryPanel.querySelector('.cluster-list');
      if (clusterList) {
        clusterList.style.height = `${availableHeight - 100}px`; // 헤더와 버튼 영역 제외
        clusterList.style.maxHeight = `${availableHeight - 100}px`;
        clusterList.style.overflow = 'auto';
        clusterList.style.margin = '0';
        clusterList.style.padding = '0';
      }

      const clusterItemList = secondaryPanel.querySelector('#clusterItemList');
      if (clusterItemList) {
        clusterItemList.style.height = `${availableHeight - 120}px`; // 헤더와 버튼 영역 제외
        clusterItemList.style.maxHeight = `${availableHeight - 120}px`;
        clusterItemList.style.overflow = 'auto';
        clusterItemList.style.margin = '0';
        clusterItemList.style.padding = '0';
      }
    }

    // CSS 변수로 설정하여 CSS에서도 사용할 수 있도록 함
    document.documentElement.style.setProperty('--mobile-screen-height', `${availableHeight}px`);
  }
}

/**
 * visualViewport 변경 감지 및 대응
 */
function handleVisualViewportChange() {
  if (window.innerWidth <= 768 && window.visualViewport) {
    adjustMobileAppHeight();
  }
}

// 실제 창 크기 변경 감지를 위한 전역 변수
let lastWindowWidth = window.innerWidth;
let lastWindowHeight = window.innerHeight;

/**
 * 실제 창 크기 변경인지 확인하는 함수
 * @returns {boolean} 실제 창 크기가 변경되었으면 true
 */
function isRealWindowResize() {
  const currentWidth = window.innerWidth;
  const currentHeight = window.innerHeight;

  // 창 크기가 실제로 변경되었는지 확인
  const isResized = (currentWidth !== lastWindowWidth || currentHeight !== lastWindowHeight);

  if (isResized) {
    lastWindowWidth = currentWidth;
    lastWindowHeight = currentHeight;
  }

  return isResized;
}

/**
 * PC 환경에서 실제 상단바 높이를 계산하여 #layout과 #sidebar 높이를 정확히 설정하는 함수
 */
function setPCLayoutHeight() {
  const topbar = document.getElementById('topbar');
  const statusCounts = document.getElementById('statusCounts');
  const topFilterBar = document.getElementById('topFilterBar');
  const layout = document.getElementById('layout');
  const sidebar = document.getElementById('sidebar');

  if (!topbar || !statusCounts || !topFilterBar || !layout || !sidebar) {
    return;
  }

  // 실제 상단바 높이 계산
  const topbarHeight = parseFloat(window.getComputedStyle(topbar).height);
  const statusCountsHeight = parseFloat(window.getComputedStyle(statusCounts).height);
  const topFilterBarHeight = parseFloat(window.getComputedStyle(topFilterBar).height);

  const totalTopbarHeight = topbarHeight + statusCountsHeight + topFilterBarHeight;
  const viewportHeight = window.innerHeight;
  const layoutHeight = viewportHeight - totalTopbarHeight;

  // #layout 높이 정확히 설정
  layout.style.top = totalTopbarHeight + 'px';
  layout.style.height = layoutHeight + 'px';
  layout.style.maxHeight = layoutHeight + 'px';
  layout.style.bottom = '0';

  // #sidebar 높이를 레이아웃 높이와 정확히 맞춤
  sidebar.style.height = layoutHeight + 'px';
  sidebar.style.maxHeight = layoutHeight + 'px';
  sidebar.style.top = '0';
  sidebar.style.bottom = 'auto';

  // 설정 후 실제 계산된 값 확인
  const actualLayoutTop = parseFloat(window.getComputedStyle(layout).top);
  const actualLayoutHeight = parseFloat(window.getComputedStyle(layout).height);
  const actualSidebarHeight = parseFloat(window.getComputedStyle(sidebar).height);
}

/**
 * PC 환경에서 #layout의 높이를 CSS 값으로 복원하는 함수 (레거시 - setPCLayoutHeight 사용 권장)
 */
function restorePCLayoutHeight() {
  // 새로운 함수 사용
  setPCLayoutHeight();
}

/**
 * 윈도우 리사이즈 시 앱 높이 재조정
 * PC 환경에서는 실행하지 않음 (모바일 전용)
 * 실제 창 크기 변경만 감지 (스크롤바 등으로 인한 가짜 리사이즈 무시)
 * PC 환경에서는 리사이즈 발생 시 높이를 CSS 값으로 복원
 */
function handleMobileAppResize() {
  const isRealResize = isRealWindowResize();
  const isPC = window.innerWidth > 768;

  // PC 환경에서는 리사이즈 발생 시 높이 재설정 (가짜 리사이즈 포함)
  if (isPC) {
    // requestAnimationFrame을 사용하여 레이아웃 재계산 완료 후 재설정
    requestAnimationFrame(() => {
      setPCLayoutHeight();
    });
  }

  // 실제 창 크기 변경인지 확인 (스크롤바 등으로 인한 가짜 리사이즈 무시)
  if (!isRealResize) {
    return;
  }

  // 모바일 환경에서만 높이 조정 실행
  if (window.innerWidth <= 768) {
    adjustMobileAppHeight();
  }
}

// 페이지 로드 시 앱 높이 조정
document.addEventListener('DOMContentLoaded', () => {
  // 모바일에서만 실행
  if (window.innerWidth <= 768) {
    adjustMobileAppHeight();
  } else {
    // PC 환경: 실제 상단바 높이를 계산하여 정확히 설정
    setPCLayoutHeight();

    // PC 환경에서 #layout과 #sidebar 높이/위치 변경 감지 (디버깅용)
    const layout = document.getElementById('layout');
    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('topbar');
    const statusCounts = document.getElementById('statusCounts');
    const topFilterBar = document.getElementById('topFilterBar');

    if (layout) {
      let lastLayoutHeight = window.getComputedStyle(layout).height;
      let lastLayoutTop = window.getComputedStyle(layout).top;
      let lastLayoutBottom = window.getComputedStyle(layout).bottom;

      const layoutObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const currentHeight = layout.style.height;
            const computedHeight = window.getComputedStyle(layout).height;
            const computedTop = window.getComputedStyle(layout).top;
            const computedBottom = window.getComputedStyle(layout).bottom;

            if (currentHeight || computedHeight !== lastLayoutHeight ||
              computedTop !== lastLayoutTop || computedBottom !== lastLayoutBottom) {
              console.warn('⚠️ #layout 변경 감지:', {
                inlineHeight: currentHeight || '(CSS 값)',
                computedHeight: computedHeight,
                previousHeight: lastLayoutHeight,
                computedTop: computedTop,
                previousTop: lastLayoutTop,
                computedBottom: computedBottom,
                previousBottom: lastLayoutBottom,
                stackTrace: new Error().stack.split('\n').slice(2, 8).join('\n')
              });

              lastLayoutHeight = computedHeight;
              lastLayoutTop = computedTop;
              lastLayoutBottom = computedBottom;

              // PC 환경에서 인라인 스타일이 설정되면 즉시 재설정
              if (window.innerWidth > 768) {
                requestAnimationFrame(() => {
                  setPCLayoutHeight();
                });
              }
            }
          }
        });
      });

      layoutObserver.observe(layout, {
        attributes: true,
        attributeFilter: ['style']
      });

      // 상단바 영역 높이 추적
      if (topbar && statusCounts && topFilterBar) {
        let lastTopbarHeight = window.getComputedStyle(topbar).height;
        let lastStatusCountsHeight = window.getComputedStyle(statusCounts).height;
        let lastTopFilterBarHeight = window.getComputedStyle(topFilterBar).height;

        const topbarObserver = new MutationObserver(() => {
          const topbarHeight = window.getComputedStyle(topbar).height;
          const statusCountsHeight = window.getComputedStyle(statusCounts).height;
          const topFilterBarHeight = window.getComputedStyle(topFilterBar).height;
          const layoutTop = window.getComputedStyle(layout).top;

          if (topbarHeight !== lastTopbarHeight ||
            statusCountsHeight !== lastStatusCountsHeight ||
            topFilterBarHeight !== lastTopFilterBarHeight) {
            console.error('🚨 상단바 영역 높이 변경 감지:', {
              topbarHeight: topbarHeight,
              previousTopbarHeight: lastTopbarHeight,
              statusCountsHeight: statusCountsHeight,
              previousStatusCountsHeight: lastStatusCountsHeight,
              topFilterBarHeight: topFilterBarHeight,
              previousTopFilterBarHeight: lastTopFilterBarHeight,
              layoutTop: layoutTop,
              expectedTop: '166px',
              totalHeight: parseFloat(topbarHeight) + parseFloat(statusCountsHeight) + parseFloat(topFilterBarHeight) + 'px',
              stackTrace: new Error().stack.split('\n').slice(2, 10).join('\n')
            });

            lastTopbarHeight = topbarHeight;
            lastStatusCountsHeight = statusCountsHeight;
            lastTopFilterBarHeight = topFilterBarHeight;
          }
        });

        topbarObserver.observe(topbar, { attributes: true, attributeFilter: ['style'] });
        topbarObserver.observe(statusCounts, { attributes: true, attributeFilter: ['style'] });
        topbarObserver.observe(topFilterBar, { attributes: true, attributeFilter: ['style'] });
      }
    }

    if (sidebar) {
      let lastSidebarHeight = window.getComputedStyle(sidebar).height;

      const sidebarObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
            const currentHeight = sidebar.style.height;
            const computedHeight = window.getComputedStyle(sidebar).height;

            if (computedHeight !== lastSidebarHeight) {
              console.error('🚨 #sidebar 높이 변경 감지:', {
                inlineHeight: currentHeight || '(CSS 값)',
                computedHeight: computedHeight,
                previousHeight: lastSidebarHeight,
                heightDiff: parseFloat(computedHeight) - parseFloat(lastSidebarHeight),
                stackTrace: new Error().stack.split('\n').slice(2, 10).join('\n')
              });

              lastSidebarHeight = computedHeight;
            }
          }
        });
      });

      sidebarObserver.observe(sidebar, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      // #layout의 높이 변경도 감지 (sidebar는 layout의 100%이므로)
      if (layout) {
        const layoutHeightObserver = new MutationObserver(() => {
          const layoutHeight = window.getComputedStyle(layout).height;
          const sidebarHeight = window.getComputedStyle(sidebar).height;

          if (sidebarHeight !== lastSidebarHeight) {
            console.error('🚨 #sidebar 높이 변경 감지 (#layout 영향):', {
              layoutHeight: layoutHeight,
              sidebarHeight: sidebarHeight,
              previousSidebarHeight: lastSidebarHeight,
              heightDiff: parseFloat(sidebarHeight) - parseFloat(lastSidebarHeight),
              stackTrace: new Error().stack.split('\n').slice(2, 10).join('\n')
            });

            lastSidebarHeight = sidebarHeight;
          }
        });

        layoutHeightObserver.observe(layout, {
          attributes: true,
          attributeFilter: ['style'],
          childList: false,
          subtree: false
        });
      }
    }
  }
});

// 윈도우 리사이즈 시 앱 높이 재조정
window.addEventListener('resize', handleMobileAppResize);

// visualViewport 변경 시 앱 높이 재조정
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', handleVisualViewportChange);
  window.visualViewport.addEventListener('scroll', handleVisualViewportChange);
}

// 유틸리티 함수들을 전역으로 export
window.runAfterMapReady = runAfterMapReady;
window.clearSelection = clearSelection;
window.setCenterWithOffset = setCenterWithOffset;
window.focusListing = focusListing;
window.dbg = dbg;
window.timeStart = timeStart;
window.timeEnd = timeEnd;
window.setLayoutHeight = setLayoutHeight;
window.parseNumber = parseNumber;
window.parseFloorInputToRange = parseFloorInputToRange;
window.buildFloorFilter = buildFloorFilter;
window.parseFloorValue = parseFloorValue;
window.parseRangeFlexible = parseRangeFlexible;
window.buildNumFilter = buildNumFilter;
window.checkNumFilter = checkNumFilter;
window.parseTextTokens = parseTextTokens;
window.matchesTextTokens = matchesTextTokens;
window.escapeHtml = escapeHtml;
window.cleanValue = cleanValue;
window.cleanObject = cleanObject;
window.calculateSecondaryPanelPosition = calculateSecondaryPanelPosition;
window.adjustMobileAppHeight = adjustMobileAppHeight;
window.handleMobileAppResize = handleMobileAppResize;
window.handleVisualViewportChange = handleVisualViewportChange;
window.isRealWindowResize = isRealWindowResize; // 실제 창 크기 변경 감지 함수 export
window.setPCLayoutHeight = setPCLayoutHeight; // PC 환경 높이 설정 함수 export
window.restorePCLayoutHeight = restorePCLayoutHeight;
window.debounce = debounce;
// PC 환경 높이 복원 함수 export (레거시) 
window.debounce = debounce;
