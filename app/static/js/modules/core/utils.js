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
    m.setIcon({ content: createMarkerIcon(color, false, briefingStatus) });
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

function dbg(...args) {
  if (window.DEBUG) console.log(...args);
}

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

// 동적 높이 계산 시스템
function calculateSecondaryPanelPosition() {
  const topbar = document.getElementById('topbar');
  const statusCounts = document.getElementById('statusCounts');
  const topFilterBar = document.getElementById('topFilterBar');
  const secondaryPanel = document.getElementById('secondaryPanel');
  
  if (!secondaryPanel) return;
  
  let totalHeight = 0;
  
  // 각 상단 요소의 실제 높이를 계산
  if (topbar) {
    totalHeight += topbar.offsetHeight;
  }
  
  if (statusCounts) {
    totalHeight += statusCounts.offsetHeight;
  }
  
  if (topFilterBar) {
    totalHeight += topFilterBar.offsetHeight;
  }
  
  // secondaryPanel 위치 조정
  secondaryPanel.style.top = totalHeight + 'px';
  secondaryPanel.style.height = `calc(100vh - ${totalHeight}px)`;
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

// 윈도우 리사이즈 시에도 위치 재계산
window.addEventListener('resize', () => {
  calculateSecondaryPanelPosition();
});

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