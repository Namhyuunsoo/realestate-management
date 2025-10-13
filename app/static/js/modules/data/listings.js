/* -----------------------------------------
 * listings.js - 매물 데이터 관리
 * ----------------------------------------- */

/**************************************
 * ===== 매물 데이터 관리 =====
 **************************************/

function updateCountsDisplay(total, filtered) {
  const totalEl    = document.getElementById("countTotal");
  const filteredEl = document.getElementById("countFiltered");
  if (totalEl)    totalEl.textContent    = total;
  if (filteredEl) filteredEl.textContent = filtered;
} 

/**************************************
 * ===== 서버에서 매물 로드 =====
 **************************************/

async function fetchListings(force = false) {
  // currentUser가 없으면 localStorage에서 복원 시도
  if (!currentUser) {
    const savedUser = localStorage.getItem('X-USER');
    if (savedUser) {
      currentUser = savedUser;
      window.currentUser = savedUser;
      console.log('🔄 fetchListings에서 currentUser 복원:', savedUser);
    } else {
      console.warn('⚠️ fetchListings: currentUser가 없어서 실행 중단');
      return;
    }
  }

  // 기존 마커들 제거
  if (MARKERS && MARKERS.length > 0) {
    MARKERS.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    MARKERS = [];
  }

  // 클러스터 그룹 초기화
  if (CLUSTER_GROUP && typeof CLUSTER_GROUP.clear === 'function') {
    CLUSTER_GROUP.clear();
  }

  const ul = document.getElementById("listingList");
  if (ul) ul.innerHTML = "<li>로딩...</li>";
  updateCountsDisplay(0, 0);

  const label = "fetchListings";
  timeStart(label);
  try {
    console.log("🔍 fetchListings: getCachedListings 호출 시작");
    // 캐싱된 API 호출 사용 (더 빠른 응답)
    const data = await getCachedListings(force);
    console.log("🔍 fetchListings: getCachedListings 응답:", data);
    
    if (!data) throw new Error("매물 데이터를 가져올 수 없습니다.");

    // 🔥 핵심 수정: API 응답 구조 확인 및 수정
    console.log("🔍 fetchListings: API 응답 구조 확인:", data);
    
    // API 응답이 배열인 경우와 객체인 경우 모두 처리
    let items = [];
    if (Array.isArray(data)) {
      items = data;
      console.log("🔍 fetchListings: API 응답이 배열입니다");
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
      console.log("🔍 fetchListings: API 응답이 객체이고 items 배열을 포함합니다");
    } else if (data.listings && Array.isArray(data.listings)) {
      items = data.listings;
      console.log("🔍 fetchListings: API 응답이 객체이고 listings 배열을 포함합니다");
    } else {
      console.error("❌ fetchListings: API 응답 구조를 파악할 수 없습니다:", data);
      throw new Error("API 응답 구조가 예상과 다릅니다.");
    }

    ORIGINAL_LIST = items;
    LISTINGS = ORIGINAL_LIST.map(x => ({ ...x }));
    
    // 🔥 핵심 수정: 전역 변수 동기화 보장
    window.LISTINGS = LISTINGS;
    window.ORIGINAL_LIST = ORIGINAL_LIST;
    
    console.log(`🔍 fetchListings: 매물 ${LISTINGS.length}개 로드됨`);
    console.log(`🔍 fetchListings: window.LISTINGS 동기화 완료, 개수: ${window.LISTINGS.length}`);

    // 좌표 할당과 거리 계산을 동기적으로 처리
    await assignTempCoords();
    await computeDistancesIfNeeded();
    
  // 필터 적용
  applyAllFilters();
  
  // 🔥 핵심 수정: FILTERED_LISTINGS도 전역 변수로 동기화
  window.FILTERED_LISTINGS = FILTERED_LISTINGS;
  console.log(`🔍 fetchListings: window.FILTERED_LISTINGS 동기화 완료, 개수: ${window.FILTERED_LISTINGS.length}`);

  } catch (e) {
    if (ul) ul.innerHTML = `<li style="color:red;">에러: ${escapeHtml(e.message)}</li>`;
    console.error("❌ fetchListings 오류:", e);
  } finally {
    timeEnd(label, { count: LISTINGS.length });
  }
}

/**************************************
 * ===== 필터 처리 =====
 **************************************/

function readTopFilterInputs() {
  const gv = id => (document.getElementById(id)?.value.trim() || "");
  
  // 모바일 환경에서는 모달 필터 입력을 우선 사용
  if (window.MOBILE_APP) {
    TOP_FILTERS.region   = gv("modal_tf_region") || gv("tf_region");
    TOP_FILTERS.jibun    = gv("modal_tf_jibun") || gv("tf_jibun");
    TOP_FILTERS.building = gv("modal_tf_building") || gv("tf_building");
    TOP_FILTERS.floor    = gv("modal_tf_floor") || gv("tf_floor");
    TOP_FILTERS.store    = gv("modal_tf_store") || gv("tf_store");
    TOP_FILTERS.area_sale = gv("modal_tf_area_sale") || gv("tf_area_sale");
    TOP_FILTERS.area_real = gv("modal_tf_area_real") || gv("tf_area_real");
    TOP_FILTERS.deposit   = gv("modal_tf_deposit") || gv("tf_deposit");
    TOP_FILTERS.rent      = gv("modal_tf_rent") || gv("tf_rent");
    TOP_FILTERS.premium   = gv("modal_tf_premium") || gv("tf_premium");
    TOP_FILTERS.note      = gv("modal_tf_note") || gv("tf_note");
    TOP_FILTERS.manager   = gv("modal_tf_manager") || gv("tf_manager");
    TOP_FILTERS.region2   = gv("modal_tf_region2") || gv("tf_region2");
    TOP_FILTERS.phone     = gv("modal_tf_phone") || gv("tf_phone");
    TOP_FILTERS.client    = gv("modal_tf_client") || gv("tf_client");
    TOP_FILTERS.note3     = gv("modal_tf_note3") || gv("tf_note3");
  } else {
    // PC 환경에서는 기존 상단바 필터 입력 사용
    TOP_FILTERS.region   = gv("tf_region");
    TOP_FILTERS.jibun    = gv("tf_jibun");
    TOP_FILTERS.building = gv("tf_building");
    TOP_FILTERS.floor    = gv("tf_floor");
    TOP_FILTERS.store    = gv("tf_store");
    TOP_FILTERS.area_sale = gv("tf_area_sale");
    TOP_FILTERS.area_real = gv("tf_area_real");
    TOP_FILTERS.deposit   = gv("tf_deposit");
    TOP_FILTERS.rent      = gv("tf_rent");
    TOP_FILTERS.premium   = gv("tf_premium");
    TOP_FILTERS.note      = gv("tf_note");
    TOP_FILTERS.manager   = gv("tf_manager");
    TOP_FILTERS.region2   = gv("tf_region2");
    TOP_FILTERS.phone     = gv("tf_phone");
    TOP_FILTERS.client    = gv("tf_client");
    TOP_FILTERS.note3     = gv("tf_note3");
  }
}

function buildEffectiveFilters() {
  Object.keys(EFFECTIVE_FILTERS).forEach(k => {
    delete EFFECTIVE_FILTERS[k];
  });
  
  // 1. 고객 필터를 기본값으로 설정
  Object.assign(EFFECTIVE_FILTERS, CUSTOMER_FILTERS);
  
  // 2. 상단 필터가 활성화된 경우에만 고객 필터를 덮어씀
  Object.keys(TOP_FILTERS).forEach(k => {
    const v = TOP_FILTERS[k];
    if (v && v.trim() !== "") {
      EFFECTIVE_FILTERS[k] = v.trim();
    }
  });
}

function applyUserRoleFilter() {
  const userRole = localStorage.getItem("X-USER-ROLE") || "user";
  // console.log(`🔍 사용자 역할별 필터링 적용: ${userRole}`);
  
  if (userRole === "user") {
    // 일반 사용자는 서버에서 이미 필터링된 데이터를 받으므로 추가 필터링 불필요
    // 보안 강화: 일반 사용자 로깅 제거
    // console.log(`✅ 일반 사용자: 서버에서 이미 필터링된 데이터 수신 (${LISTINGS.length}개)`);
  } else {
    // 어드민과 매니저는 모든 매물 표시 (필터링 없음)
    // 보안 강화: 사용자 역할 로깅 제거
    // console.log(`✅ ${userRole} 역할: 모든 매물 표시`);
  }
}


function applyAllFilters() {
  dbg("applyAllFilters start");

  readTopFilterInputs();
  buildEffectiveFilters();
  
  // 필터 적용 시 정렬 상태 초기화
  resetSortCycles();
  
  // 사용자 역할별 필터링 적용
  applyUserRoleFilter();
  
  // 디버깅: 현재 적용된 필터 확인
  // console.log('현재 적용된 필터:', EFFECTIVE_FILTERS);
  // console.log('총 매물 수:', LISTINGS.length);
  
  // 디버깅: 지역명 확인 (지역 + 지역2)
  const allRegions = [...new Set(LISTINGS.map(item => item.fields?.지역 || '').filter(r => r))];
  const allRegions2 = [...new Set(LISTINGS.map(item => item.fields?.지역2 || '').filter(r => r))];
  // console.log('전체 지역명 목록 (지역, 상위 20개):', allRegions.slice(0, 20));
  // console.log('전체 지역명 목록 (지역2, 상위 20개):', allRegions2.slice(0, 20));
  
  // 부평구 관련 디버그 로그 제거됨

  const FIELDS = {
    region:   "지역",
    jibun:    "지번",
    building: "건물명",
    floor:    "층수",
    store:    "가게명",
    area_sale:"분양",
    area_real:"실평수",
    deposit:  "보증금",
    rent:     "월세",
    premium:  "권리금",
    note:     "비고",
    manager:  "담당자",
    region2:  "지역2",
    phone:    "연락처",
    client:   "의뢰인",
    note3:    "비고3"
  };

  const TEXT_KEYS = ["region","jibun","building","store","note","manager","region2","phone","client","note3"];
  const NUM_CONFIG = {
    area_sale:"gte",
    area_real:"gte",
    deposit:  "lte",
    rent:     "lte",
    premium:  "lte"
  };

  const parsedText = {};
  TEXT_KEYS.forEach(k => {
    parsedText[k] = parseTextTokens(EFFECTIVE_FILTERS[k] || "");
  });

  const parsedNum = {};
  Object.keys(NUM_CONFIG).forEach(k => {
    parsedNum[k] = buildNumFilter(EFFECTIVE_FILTERS[k] || "", NUM_CONFIG[k]);
  });

  const floorFilter = buildFloorFilter(EFFECTIVE_FILTERS.floor || "");

  let arr = LISTINGS.filter(item => {
    const fields = item.fields || {};

    for (const tk of TEXT_KEYS) {
      const v = fields[FIELDS[tk]] || "";
      if (!matchesTextTokens(v, parsedText[tk])) return false;
    }

    const fVal = parseFloorValue(fields[FIELDS.floor]);
    if (!checkNumFilter(fVal, floorFilter)) return false;

    const asVal = parseNumber(fields[FIELDS.area_sale]);
    if (!checkNumFilter(asVal, parsedNum.area_sale)) return false;

    const arVal = parseNumber(fields[FIELDS.area_real]);
    if (!checkNumFilter(arVal, parsedNum.area_real)) return false;

    const dVal = parseNumber(fields[FIELDS.deposit]);
    if (!checkNumFilter(dVal, parsedNum.deposit)) return false;

    const rVal = parseNumber(fields[FIELDS.rent]);
    if (!checkNumFilter(rVal, parsedNum.rent)) return false;

    const pVal = parseNumber(fields[FIELDS.premium]);
    if (!checkNumFilter(pVal, parsedNum.premium)) return false;

    return true;
  });

  // 🔥 핵심 수정: 지도 영역 필터링 추가 (모바일에서도 활성화)
  if (MAP_READY && MAP) {
    const bounds = MAP.getBounds();
    if (bounds) {
      arr = arr.filter(item => {
        const { lat, lng } = item.coords || {};
        if (lat == null || lng == null) return false;
        
        try {
          const latNum = parseFloat(lat);
          const lngNum = parseFloat(lng);
          
          if (isNaN(latNum) || isNaN(lngNum)) return false;
          
          const latLng = new naver.maps.LatLng(latNum, lngNum);
          return bounds.hasLatLng(latLng);
        } catch (error) {
          console.warn(`⚠️ 지도 영역 필터링 실패: lat=${lat}, lng=${lng}`, error);
          return false;
        }
      });
      
      console.log(`🗺️ 지도 영역 필터링 적용: ${arr.length}개 매물`);
    }
  } else {
    console.log(`📱 지도가 준비되지 않음: MAP_READY=${MAP_READY}, MAP=${!!MAP}`);
  }

  sortListingsInPlace(arr);
  FILTERED_LISTINGS = arr;
  
  // 🔥 핵심 수정: 전역 변수 동기화 보장
  window.FILTERED_LISTINGS = FILTERED_LISTINGS;
  
  // 디버깅: 필터링 결과 확인
  // console.log('필터링된 매물 수:', arr.length);
  if (arr.length === 0) {

  }
  
  // 디버깅: 각 필터 조건별 매물 수 확인
  if (EFFECTIVE_FILTERS.region2) {
    const region2Matches = LISTINGS.filter(item => {
      const region2 = item.fields?.지역2 || '';
      return region2.includes(EFFECTIVE_FILTERS.region2);
    });
  }
  
  if (EFFECTIVE_FILTERS.floor) {
    const floorMatches = LISTINGS.filter(item => {
      const floor = item.fields?.층수 || '';
      return floor.includes(EFFECTIVE_FILTERS.floor);
    });
  }
  
  if (EFFECTIVE_FILTERS.area_real) {
    const areaMatches = LISTINGS.filter(item => {
      const area = parseNumber(item.fields?.실평수) || 0;
      return area >= parseNumber(EFFECTIVE_FILTERS.area_real);
    });
  }
  
  if (EFFECTIVE_FILTERS.deposit) {
    const depositFilter = buildNumFilter(EFFECTIVE_FILTERS.deposit, "lte");
    const depositMatches = LISTINGS.filter(item => {
      const deposit = parseNumber(item.fields?.보증금) || 0;
      return checkNumFilter(deposit, depositFilter);
    });

  }
  
  dbg("applyAllFilters end");
  
  // 브리핑 필터 적용
  applyBriefingFilters();

  // CSS Grid 레이아웃을 사용하므로 setLayoutHeight 호출 제거
  // 대신 지도가 준비된 경우에만 리사이즈 트리거
  if (MAP_READY && MAP) {
    requestAnimationFrame(() => {
      naver.maps.Event.trigger(MAP, 'resize');
    });
  }

  // 마커 표시
  if (MAP_READY && MAP && typeof placeMarkers === 'function') {
    // console.log(`🔍 applyAllFilters: 마커 표시 시작 - ${FILTERED_LISTINGS.length}개 매물`);
    placeMarkers(FILTERED_LISTINGS);
  }

  // 지도 이벤트 트리거는 초기 로드 시에만 실행
  if (MAP_READY && FETCH_CALLED_ONCE) {
    MAP.trigger('idle');
  }
}

function resetSortCycles() {
  Object.keys(CURRENT_SORT_CYCLES).forEach(k => {
    CURRENT_SORT_CYCLES[k] = 0;
  });
}

function sortListingsInPlace(arr) {
  if (!arr || arr.length === 0) return;

  const sortMode = CURRENT_SORT_MODE;

  arr.sort((a, b) => {
    const fieldsA = a.fields || {};
    const fieldsB = b.fields || {};

    // 🔥 추천매물 최상단 정렬
    const isRecommendedA = (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) ? window.USER_RECOMMENDATIONS.has(a.id) : false;
    const isRecommendedB = (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) ? window.USER_RECOMMENDATIONS.has(b.id) : false;
    
    // 추천매물이 아닌 경우에만 기존 정렬 로직 적용
    if (isRecommendedA && !isRecommendedB) return -1; // A가 추천, B가 비추천 → A가 위로
    if (!isRecommendedA && isRecommendedB) return 1;  // A가 비추천, B가 추천 → B가 위로
    if (isRecommendedA && isRecommendedB) {
      // 둘 다 추천매물인 경우 기존 정렬 로직 적용
    } else {
      // 둘 다 비추천매물인 경우 기존 정렬 로직 적용
    }

    switch (sortMode) {
      case "latest":
        return (b.id || 0) - (a.id || 0);
      case "oldest":
        return (a.id || 0) - (b.id || 0);
      case "area_high":
        return (parseNumber(fieldsB.실평수) || 0) - (parseNumber(fieldsA.실평수) || 0);
      case "area_low":
        return (parseNumber(fieldsA.실평수) || 0) - (parseNumber(fieldsB.실평수) || 0);
      case "deposit_high":
        return (parseNumber(fieldsB.보증금) || 0) - (parseNumber(fieldsA.보증금) || 0);
      case "deposit_low":
        return (parseNumber(fieldsA.보증금) || 0) - (parseNumber(fieldsB.보증금) || 0);
      case "rent_high":
        return (parseNumber(fieldsB.월세) || 0) - (parseNumber(fieldsA.월세) || 0);
      case "rent_low":
        return (parseNumber(fieldsA.월세) || 0) - (parseNumber(fieldsB.월세) || 0);
      default:
        return 0;
    }
  });
}

// 매물 데이터 관련 함수들을 전역으로 export
window.updateCountsDisplay = updateCountsDisplay;
window.fetchListings = fetchListings;
window.readTopFilterInputs = readTopFilterInputs;
window.buildEffectiveFilters = buildEffectiveFilters;
window.applyAllFilters = applyAllFilters;
window.resetSortCycles = resetSortCycles;
window.sortListingsInPlace = sortListingsInPlace; 