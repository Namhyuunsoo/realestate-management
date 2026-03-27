/* -----------------------------------------
 * listings.js - 매물 데이터 관리
 * ----------------------------------------- */

/**************************************
 * ===== 매물 데이터 관리 =====
 **************************************/

function updateCountsDisplay(total, filtered) {
  const totalEl = document.getElementById("countTotal");
  const filteredEl = document.getElementById("countFiltered");
  if (totalEl) totalEl.textContent = total;
  if (filteredEl) filteredEl.textContent = filtered;
}

/**
 * 전역 프로그레스 바 업데이트
 */
function updateAppProgressBar(percent, active = true, label = "") {
  const bar = document.getElementById("appProgressBar");
  if (!bar) return;

  if (active) {
    bar.classList.add("active");
    const fill = bar.querySelector(".progress-fill");
    const text = bar.querySelector(".progress-text");
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = label ? `${label} (${Math.round(percent)}%)` : `${Math.round(percent)}%`;
  } else {
    // 100% 도달 후 부드럽게 사라짐
    const fill = bar.querySelector(".progress-fill");
    const text = bar.querySelector(".progress-text");
    if (fill) fill.style.width = "100%";
    if (text) text.textContent = label || "완료";
    setTimeout(() => {
      bar.classList.remove("active");
    }, 800);
  }
}

/**
 * 🔥 Tabular JSON 압축 데이터를 기존 객체 형식으로 복원
 */
function decompactListings(data) {
  if (!data || !data.rows) return data;
  if (!data.compressed && !data.cols) return data; // 최소한의 구조 확인

  const { cols, f_keys, n_keys, rows } = data;
  const latIdx = cols.indexOf("lat");
  const lngIdx = cols.indexOf("lng");
  const fIdx = cols.length; // fields 데이터는 cols 뒤에 위치
  const nIdx = fIdx + 1;    // numeric_cache 데이터는 fields 뒤에 위치
  const gIdx = nIdx + 1;    // geocoded 플래그 위치

  return rows.map(row => {
    const item = {};
    
    // 1. 기본 컬럼 복원
    cols.forEach((col, i) => {
      if (col !== "lat" && col !== "lng") {
        item[col] = row[i];
      }
    });

    // 2. 좌표 복원
    item.coords = {
      lat: row[latIdx],
      lng: row[lngIdx]
    };

    // 3. fields 복원 (k: v 매핑)
    const fields = {};
    const fValues = row[fIdx] || [];
    f_keys.forEach((key, i) => {
      if (fValues[i] !== null) {
        fields[key] = fValues[i];
      }
    });
    item.fields = fields;

    // 4. numeric_cache 복원
    const numeric = {};
    const nValues = row[nIdx] || [];
    n_keys.forEach((key, i) => {
      if (nValues[i] !== null) {
        numeric[key] = nValues[i];
      }
    });
    item.numeric_cache = numeric;

    // 5. 추가 플래그 (geocoded)
    if (row[gIdx] !== undefined) {
      item.geocoded = row[gIdx];
    }

    return item;
  });
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
    } else {
      console.warn('⚠️ fetchListings: currentUser가 없어서 실행 중단');
      return;
    }
  }

  // 상가 모드인 경우 하이브리드 로딩 적용 여부 결정
  const isHybridMode = UI_STATE.listingMode === "commercial";

  // 기본 UI 초기화
  if (MARKERS && MARKERS.length > 0) {
    MARKERS.forEach(marker => { if (marker && marker.setMap) marker.setMap(null); });
    MARKERS = [];
  }
  if (CLUSTER_GROUP && typeof CLUSTER_GROUP.clear === 'function') {
    CLUSTER_GROUP.clear();
  }

  const ul = document.getElementById("listingList");
  if (ul) ul.innerHTML = isHybridMode ? "<li>빠른 로딩 중...</li>" : "<li>로딩...</li>";
  updateCountsDisplay(0, 0);

  // 프로그레스 바 시작
  if (isHybridMode) updateAppProgressBar(10, true, "매물 위치 파악 중...");

  const label = "fetchListings";
  timeStart(label);
  try {
    let data = null;
    let items = [];

    if (UI_STATE.listingMode === "housing") {
      // [주택 모드] 기존 방식 유지
      const subtype = UI_STATE.housingSubtype || "sale";
      const statusEl = document.getElementById("modal_tf_h_status") || document.getElementById("tf_h_status");
      const status_raw = (statusEl && statusEl.value && statusEl.value.trim()) ? statusEl.value.trim() : "생";
      _lastHousingStatusRaw = status_raw;
      data = await getCachedHousingListings(subtype, status_raw, force);
      items = await processListingData(data);
    } else {
      // [상가 모드] 하이브리드(2단계) 로딩
      const statusEl = document.getElementById("modal_tf_status") || document.getElementById("tf_status");
      const status_raw = (statusEl && statusEl.value && statusEl.value.trim()) ? statusEl.value.trim() : "생";
      _lastCommercialStatusRaw = status_raw;

      // 1단계: 스켈레톤(검색용 핵심 필드) 데이터 먼저 로드
      dbg("🚀 [Hybrid Phase 1] 스켈레톤 데이터 요청...");
      data = await getCachedListings(status_raw, force, "search_skeleton");
      items = await processListingData(data);
      
      // 1단계 데이터 즉시 렌더링
      ORIGINAL_LIST = items;
      LISTINGS = ORIGINAL_LIST.map(x => ({ ...x }));
      window.LISTINGS = LISTINGS;
      window.ORIGINAL_LIST = ORIGINAL_LIST;

      if (window.assignTempCoords) await window.assignTempCoords();
      window.applyAllFilters();
      
      updateAppProgressBar(50, true, "마커 표시 완료, 상세 정보 로드 중...");
      dbg(`✅ [Hybrid Phase 1] 완료: ${items.length}개 마커 즉시 표시됨`);

      // 1.5단계: 현재 화면 영역(BBox)의 상세 데이터 우선 로드
      loadBBoxData(status_raw);

      // 2단계: 백그라운드 전체 상세 데이터 로드 (비동기)
      loadFullDataInBackground(status_raw, force);
    }

    if (!items || items.length === 0) {
      if (!isHybridMode) throw new Error("매물 데이터를 가져올 수 없습니다.");
    }

    // 주택 모드인 경우에만 여기서 나머지 처리 (상가는 이미 위에서 처리함)
    if (UI_STATE.listingMode === "housing") {
      ORIGINAL_LIST = items;
      LISTINGS = ORIGINAL_LIST.map(x => ({ ...x }));
      window.LISTINGS = LISTINGS;
      window.ORIGINAL_LIST = ORIGINAL_LIST;
      if (window.assignTempCoords) await window.assignTempCoords();
      window.applyAllFilters();
    }

  } catch (e) {
    if (ul) ul.innerHTML = `<li style="color:red;">에러: ${escapeHtml(e.message)}</li>`;
    console.error("❌ fetchListings 오류:", e);
    updateAppProgressBar(0, false);
  } finally {
    timeEnd(label, { count: LISTINGS.length });
    if (UI_STATE.listingMode === "housing") updateAppProgressBar(100, false);
  }
}

/**
 * API 응답 데이터를 아이템 배열로 공통 처리
 */
async function processListingData(data) {
  if (!data) return [];
  let items = [];
  const hasCompactStructure = data.cols && data.rows;
  const itemsHasCompactStructure = data.items && data.items.cols && data.items.rows;
  const isCompact = data.compressed || (data.items && data.items.compressed) || hasCompactStructure || itemsHasCompactStructure;
  
  if (isCompact) {
    const compactData = (data.cols && data.rows) ? data : data.items;
    items = decompactListings(compactData);
  } else {
    if (Array.isArray(data)) items = data;
    else if (data.items && Array.isArray(data.items)) items = data.items;
    else if (data.listings && Array.isArray(data.listings)) items = data.listings;
  }
  return items;
}

/**
 * 현재 화면 영역(BBox)의 상세 데이터를 로드하여 즉시 병합
 */
async function loadBBoxData(status_raw) {
  if (!MAP || !MAP_READY || UI_STATE.listingMode !== "commercial") return;
  
  // status_raw가 전달되지 않으면 현재 필터 값 사용
  if (!status_raw) {
    status_raw = _lastCommercialStatusRaw || "생";
  }
  const bounds = MAP.getBounds();
  if (!bounds) return;
  
  const sw = bounds.getSW();
  const ne = bounds.getNE();
  
  const bbox = {
    min_lat: sw.lat(),
    max_lat: ne.lat(),
    min_lng: sw.lng(),
    max_lng: ne.lng()
  };

  try {
    dbg("🚀 [Hybrid Phase 1.5] 현재 영역 상세 데이터 우선 로드 시작...");
    const data = await getCachedListings(status_raw, false, null, bbox);
    const items = await processListingData(data);
    
    if (items && items.length > 0) {
      mergeListingsData(items, "Phase 1.5 (BBox)");
    }
  } catch (error) {
    console.warn("⚠️ BBox 데이터 로드 실패:", error);
  }
}

/**
 * 백그라운드에서 상세 데이터를 로드하고 기존 리스트에 병합
 */
async function loadFullDataInBackground(status_raw, force) {
  try {
    dbg("🚀 [Hybrid Phase 2] 상세 데이터 백그라운드 로드 시작...");
    const fullData = await getCachedListings(status_raw, force, null, null); // format 및 bbox 없이 호출
    const fullItems = await processListingData(fullData);
    
    updateAppProgressBar(85, true, "전체 상세 데이터 병합 중...");

    // 병합 작업 (메인 스레드 점유 최소화를 위해 requestIdleCallback 사용)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => mergeListingsData(fullItems, "Phase 2 (Global)"));
    } else {
      setTimeout(() => mergeListingsData(fullItems, "Phase 2 (Global)"), 100);
    }

  } catch (error) {
    console.warn("⚠️ 백그라운드 데이터 로드 실패 (기능상 문제는 없음):", error);
    updateAppProgressBar(100, false);
  }
}

/**
 * 상세 데이터를 기존 리스트에 병합 (매핑)
 */
function mergeListingsData(fullItems, label = "Data Merge") {
  dbg(`🧬 [Hybrid ${label}] 데이터 병합 중... (${fullItems.length}개)`);
  
  // 만약 1단계(스켈레톤)에서 데이터가 없었거나 리스트가 비어있다면, 2단계 데이터를 전체 리스트로 설정
  if (!LISTINGS || LISTINGS.length === 0) {
    console.log("ℹ️ [Hybrid Phase 2] 기존 리스트가 비어있어 상세 데이터를 전체 리스트로 교체합니다.");
    ORIGINAL_LIST = fullItems;
    LISTINGS = ORIGINAL_LIST.map(x => ({ ...x }));
    window.LISTINGS = LISTINGS;
    window.ORIGINAL_LIST = ORIGINAL_LIST;
    
    // 좌표 할당 및 필터/마커 업데이트 강제 실행
    if (window.assignTempCoords) window.assignTempCoords();
    window.applyAllFilters();
    updateAppProgressBar(100, false);
    return;
  }

  const itemMap = new Map();
  fullItems.forEach(item => itemMap.set(item.id, item));

  let mergedCount = 0;
  // 기존 리스트 순회하며 상세 정보 보강
  LISTINGS.forEach(item => {
    const full = itemMap.get(item.id);
    if (full) {
      // skeleton에 없던 필드들 병합 (기존 좌표 등은 유지)
      item.fields = { ...full.fields, ...item.fields };
      item.numeric_cache = { ...full.numeric_cache, ...item.numeric_cache };
      mergedCount++;
    }
  });

  // ORIGINAL_LIST도 동기화
  const originalMap = new Map();
  ORIGINAL_LIST.forEach(item => originalMap.set(item.id, item));
  fullItems.forEach(full => {
    const orig = originalMap.get(full.id);
    if (orig) {
      orig.fields = { ...full.fields, ...orig.fields };
      orig.numeric_cache = { ...full.numeric_cache, ...orig.numeric_cache };
    }
  });

  dbg(`✅ [Hybrid Phase 2] 병합 완료: ${mergedCount}개 매물 상세 정보 업데이트됨`);
  
  // 병합된 상세 정보를 리스트 UI에 반영하기 위해 필터 재적용 (마커는 그대로 둠)
  if (typeof applyAllFilters === 'function') {
      // 마커를 새로 그리지 않도록 로직을 분리하는 것이 좋으나, 
      // 현재 구조에서는 마커도 새로 그려짐. 데이터가 바뀌었으므로 안전한 선택.
      applyAllFilters(); 
  }
  
  updateAppProgressBar(100, false, "모든 데이터 로드 완료");
}

/**************************************
 * ===== 필터 처리 =====
 **************************************/

function readTopFilterInputs() {
  const gv = id => (document.getElementById(id)?.value.trim() || "");
  const getRawVal = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : null;
  };

  if (UI_STATE.listingMode === "housing") {
    // 주택 필터 (모바일: modal_tf_h_*, PC: tf_h_*)
    const gr = (modalId, pcId) => gv(modalId) || gv(pcId);
    TOP_FILTERS.region = gr("modal_tf_h_region", "tf_h_region");
    TOP_FILTERS.jibun = gr("modal_tf_h_jibun", "tf_h_jibun");
    TOP_FILTERS.region2 = gr("modal_tf_h_region2", "tf_h_region2");
    TOP_FILTERS.type = gr("modal_tf_h_type", "tf_h_type");
    TOP_FILTERS.building = gr("modal_tf_h_building", "tf_h_building");
    TOP_FILTERS.dong = gr("modal_tf_h_dong", "tf_h_dong");
    TOP_FILTERS.ho = gr("modal_tf_h_ho", "tf_h_ho");
    TOP_FILTERS.direction = gr("modal_tf_h_direction", "tf_h_direction");
    TOP_FILTERS.floor = gr("modal_tf_h_floor", "tf_h_floor");
    TOP_FILTERS.supply = gr("modal_tf_h_supply", "tf_h_supply");
    TOP_FILTERS.exclusive = gr("modal_tf_h_exclusive", "tf_h_exclusive");
    TOP_FILTERS.deposit = gr("modal_tf_h_deposit", "tf_h_deposit");
    TOP_FILTERS.rent = gr("modal_tf_h_rent", "tf_h_rent");
    TOP_FILTERS.rooms = gr("modal_tf_h_rooms", "tf_h_rooms");
    TOP_FILTERS.bath = gr("modal_tf_h_bath", "tf_h_bath");
    const hStatus = getRawVal("modal_tf_h_status") ?? getRawVal("tf_h_status");
    TOP_FILTERS.status = hStatus !== null ? hStatus : "생";
    TOP_FILTERS.client = gr("modal_tf_h_client", "tf_h_client");
    TOP_FILTERS.phone = gr("modal_tf_h_phone", "tf_h_phone");
    TOP_FILTERS.tenant = gr("modal_tf_h_tenant", "tf_h_tenant");
    TOP_FILTERS.note = gr("modal_tf_h_note", "tf_h_note");
  } else {
    // 상가 필터
    if (window.MOBILE_APP) {
      TOP_FILTERS.region = gv("modal_tf_region") || gv("tf_region");
      TOP_FILTERS.jibun = gv("modal_tf_jibun") || gv("tf_jibun");
      TOP_FILTERS.building = gv("modal_tf_building") || gv("tf_building");
      TOP_FILTERS.floor = gv("modal_tf_floor") || gv("tf_floor");
      TOP_FILTERS.store = gv("modal_tf_store") || gv("tf_store");
      TOP_FILTERS.area_sale = gv("modal_tf_area_sale") || gv("tf_area_sale");
      TOP_FILTERS.area_real = gv("modal_tf_area_real") || gv("tf_area_real");
      TOP_FILTERS.deposit = gv("modal_tf_deposit") || gv("tf_deposit");
      TOP_FILTERS.rent = gv("modal_tf_rent") || gv("tf_rent");
      TOP_FILTERS.premium = gv("modal_tf_premium") || gv("tf_premium");
      const cStatus = getRawVal("modal_tf_status") ?? getRawVal("tf_status");
      TOP_FILTERS.status = cStatus !== null ? cStatus : "생";
      TOP_FILTERS.note = gv("modal_tf_note") || gv("tf_note");
      TOP_FILTERS.manager = gv("modal_tf_manager") || gv("tf_manager");
      TOP_FILTERS.region2 = gv("modal_tf_region2") || gv("tf_region2");
      TOP_FILTERS.phone = gv("modal_tf_phone") || gv("tf_phone");
      TOP_FILTERS.client = gv("modal_tf_client") || gv("tf_client");
      TOP_FILTERS.note3 = gv("modal_tf_note3") || gv("tf_note3");
    } else {
      TOP_FILTERS.region = gv("tf_region");
      TOP_FILTERS.jibun = gv("tf_jibun");
      TOP_FILTERS.building = gv("tf_building");
      TOP_FILTERS.floor = gv("tf_floor");
      TOP_FILTERS.store = gv("tf_store");
      TOP_FILTERS.area_sale = gv("tf_area_sale");
      TOP_FILTERS.area_real = gv("tf_area_real");
      TOP_FILTERS.deposit = gv("tf_deposit");
      TOP_FILTERS.rent = gv("tf_rent");
      TOP_FILTERS.premium = gv("tf_premium");
      const cStatus = getRawVal("tf_status");
      TOP_FILTERS.status = cStatus !== null ? cStatus : "생";
      TOP_FILTERS.sale_price = gv("tf_sale_price");
      TOP_FILTERS.yield = gv("tf_yield");
      TOP_FILTERS.area_land = gv("tf_area_land_py");
      TOP_FILTERS.note = gv("tf_note");
      TOP_FILTERS.manager = gv("tf_manager");
      TOP_FILTERS.region2 = gv("tf_region2");
      TOP_FILTERS.phone = gv("tf_phone");
      TOP_FILTERS.client = gv("tf_client");
      TOP_FILTERS.note3 = gv("tf_note3");
    }
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


// 주택/상가 모드: 마지막 fetch 시 사용한 status_raw (현황 필터 변경 시 refetch용)
let _lastHousingStatusRaw = "생";
let _lastCommercialStatusRaw = "생";

function applyAllFilters() {
  dbg("applyAllFilters start");

  readTopFilterInputs();
  buildEffectiveFilters();

  // 주택 모드: 현황 필터 변경 시 API 재호출 필요
  if (UI_STATE.listingMode === "housing") {
    const newStatus = TOP_FILTERS.status || "생";
    if (newStatus !== _lastHousingStatusRaw) {
      _lastHousingStatusRaw = newStatus;
      if (typeof fetchListings === "function") {
        fetchListings(true);
      }
      return;
    }
  } else {
    // 상가 모드: 현황 필터 변경 시 API 재호출 필요
    const newStatus = TOP_FILTERS.status || "생";
    if (newStatus !== _lastCommercialStatusRaw) {
      _lastCommercialStatusRaw = newStatus;
      if (typeof fetchListings === "function") {
        fetchListings(true);
      }
      return;
    }
  }

  // 필터 적용 시 정렬 상태 초기화
  resetSortCycles();

  // 사용자 역할별 필터링 적용
  applyUserRoleFilter();

  // 디버깅: 현재 적용된 필터 확인
  // console.log('현재 적용된 필터:', EFFECTIVE_FILTERS);
  // console.log('총 매물 수:', LISTINGS.length);

  // 🔥 성능 최적화: 불필요한 지역명 추출 제거
  // 이 코드는 결과를 사용하지 않으면서 매번 6,000개를 map/filter하여 성능 저하 발생
  // 디버깅이 필요할 때만 주석을 해제하여 사용
  /*
  // 디버깅: 지역명 확인 (지역 + 지역2)
  const allRegions = [...new Set(LISTINGS.map(item => item.fields?.지역 || '').filter(r => r))];
  const allRegions2 = [...new Set(LISTINGS.map(item => item.fields?.지역2 || '').filter(r => r))];
  // console.log('전체 지역명 목록 (지역, 상위 20개):', allRegions.slice(0, 20));
  // console.log('전체 지역명 목록 (지역2, 상위 20개):', allRegions2.slice(0, 20));
  */

  // 부평구 관련 디버그 로그 제거됨

  const FIELDS = UI_STATE.listingMode === "housing" ? {
    region: "지역",
    jibun: "지번",
    region2: "지역2",
    type: "유형",
    building: "건물명",
    dong: "동",
    ho: "호수",
    direction: "향",
    floor: "층수",
    supply: "공급",
    exclusive: ["실평수", "전용"],
    deposit: "보증금",
    rent: "월세",
    rooms: "방",
    bath: "화장실",
    client: "의뢰인",
    phone: "연락처",
    tenant: ["임차인 연락처", "임차인연락처"],
    status: "현황",
    note: "비고"
  } : {
    region: "지역",
    jibun: "지번",
    building: "건물명",
    floor: ["층수", "층\n수"],
    store: ["가게명", "상호"],
    area_sale: ["분양", "분양(평)", "분양\n(평)"],
    area_real: ["실평수", "전용(평)", "전용", "전용\n(평)"],
    area_land: ["대지(평)", "대지면적"],
    deposit: "보증금",
    rent: "월세",
    premium: "권리금",
    sale_price: "매매가",
    yield: "수익율",
    note: "비고",
    manager: "담당자",
    status: "현황",
    region2: "지역2",
    phone: "연락처",
    client: "의뢰인",
    note3: "비고3"
  };

  const TEXT_KEYS = UI_STATE.listingMode === "housing"
    ? ["region", "jibun", "region2", "type", "building", "dong", "ho", "direction", "client", "phone", "tenant", "note", "status"]
    : ["region", "jibun", "building", "store", "note", "manager", "region2", "phone", "client", "note3", "status"];
  const NUM_CONFIG = UI_STATE.listingMode === "housing"
    ? { supply: "gte", exclusive: "gte", deposit: "lte", rent: "lte", rooms: "gte", bath: "gte" }
    : { area_sale: "gte", area_real: "gte", area_land: "gte", deposit: "lte", rent: "lte", premium: "lte", sale_price: "lte", yield: "gte" };


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
      const fieldNames = Array.isArray(FIELDS[tk]) ? FIELDS[tk] : [FIELDS[tk]];
      let v = "";
      for (const name of fieldNames) {
        if (!name) continue;
        if (fields[name]) {
          v = fields[name];
          break;
        }
      }
      if (tk === "status") {
        // 🚀 현황(status) 필터는 공백에 민감하므로 엄격하게 trim() 후 비교
        // 현황이 '생'인 경우 공백("") 매물도 유효한 매물로 취급하여 표시함 (사용자 요청)
        const cleanedV = (v || "").toString().trim();
        const filterStr = (EFFECTIVE_FILTERS[tk] || "").trim();
        
        if (filterStr === "생") {
          if (cleanedV !== "생" && cleanedV !== "") return false;
        } else {
          if (!matchesTextTokens(cleanedV, parsedText[tk])) return false;
        }
      } else {
        if (!matchesTextTokens(v, parsedText[tk])) return false;
      }
    }

    const floorFieldNames = Array.isArray(FIELDS.floor) ? FIELDS.floor : [FIELDS.floor];
    let fVal = null;
    for (const name of floorFieldNames) {
      if (!name) continue;
      if (fields[name]) {
        fVal = parseFloorValue(fields[name]);
        if (fVal !== null) break;
      }
    }
    if (!checkNumFilter(fVal, floorFilter)) return false;

    for (const nk of Object.keys(NUM_CONFIG)) {
      const fieldNames = Array.isArray(FIELDS[nk]) ? FIELDS[nk] : [FIELDS[nk]];
      let val = null;
      for (const name of fieldNames) {
        if (!name) continue;
        if (fields[name]) {
          val = parseNumber(fields[name]);
          if (val !== null) break;
        }
      }
      if (!checkNumFilter(val, parsedNum[nk])) return false;
    }

    return true;
  });

  // 🔥 핵심 수정: 지도 영역 필터링 고도화 (버퍼 영역 추가 및 줌 제약 완화)
  if (MAP_READY && MAP) {
    const zoom = MAP.getZoom();
    const bounds = MAP.getBounds();

    if (bounds) {
      const sw = bounds.getSW();
      const ne = bounds.getNE();
      const isValidBounds = sw && ne && Math.abs(sw.lat() - ne.lat()) > 0.0001;

      if (isValidBounds) {
        // 버퍼 영역 계산 (화면 영역의 30% 상하좌우 확장)
        const latSpan = Math.abs(ne.lat() - sw.lat());
        const lngSpan = Math.abs(ne.lng() - sw.lng());
        const latBuffer = latSpan * 0.3;
        const lngBuffer = lngSpan * 0.3;

        const expandedBounds = new naver.maps.LatLngBounds(
          new naver.maps.LatLng(sw.lat() - latBuffer, sw.lng() - lngBuffer),
          new naver.maps.LatLng(ne.lat() + latBuffer, ne.lng() + lngBuffer)
        );

        // 줌 레벨에 관계없이 버퍼링된 뷰포트 내 매물만 필터링
        // (저배율에서도 클러스터링을 위해 데이터를 유지하되, 지나치게 먼 데이터는 제외)
        arr = arr.filter(item => {
          const { lat, lng } = item.coords || {};
          if (lat == null || lng == null) return false;

          try {
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            if (isNaN(latNum) || isNaN(lngNum)) return false;

            const latLng = new naver.maps.LatLng(latNum, lngNum);
            return expandedBounds.hasLatLng(latLng);
          } catch (error) {
            return false;
          }
        });
      }
    }
  }

  sortListingsInPlace(arr);
  FILTERED_LISTINGS = arr;

  // 🔥 핵심 수정: 전역 변수 동기화 보장
  window.FILTERED_LISTINGS = FILTERED_LISTINGS;

  // 디버깅: 필터링 결과 확인
  // console.log('필터링된 매물 수:', arr.length);
  if (arr.length === 0) {

  }

  // 🔥 성능 최적화: 불필요한 디버깅 코드 제거
  // 이 코드들은 결과를 사용하지 않으면서 매번 6,000개를 필터링하여 성능 저하 발생
  // 디버깅이 필요할 때만 주석을 해제하여 사용
  /*
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
  */

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
    dbg(`📍 placeMarkers 호출: ${FILTERED_LISTINGS.length}개`);
    placeMarkers(FILTERED_LISTINGS);
  }

  // 모바일/하이브리드 필터 요약 업데이트
  if (typeof window.updateMobileFilterSummary === 'function') {
    window.updateMobileFilterSummary();
  }
  if (window.HybridFilter && typeof window.HybridFilter.updateSummary === 'function') {
    window.HybridFilter.updateSummary();
  }

  // 🔥 무한 루프 방지: idle 이벤트 트리거 제거
  // idle 이벤트 리스너 내에서 idle 이벤트를 트리거하면 무한 루프 발생
  // 지도 이벤트 트리거는 제거 (idle 이벤트는 지도 이동 시 자동 발생)
  // if (MAP_READY && FETCH_CALLED_ONCE) {
  //   MAP.trigger('idle'); // 제거됨 - 무한 루프 원인
  // }
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
        // 주택 ID는 문자열(h_xxx)이므로 raw_row_index 사용, 없으면 문자열 비교
        if (typeof a.id === 'string' && a.id.startsWith('h_')) {
          const idxA = a.raw_row_index !== undefined ? a.raw_row_index : 0;
          const idxB = b.raw_row_index !== undefined ? b.raw_row_index : 0;
          return idxB - idxA; // 최신순: 큰 인덱스가 위로
        }
        return (b.id || 0) - (a.id || 0);
      case "oldest":
        // 주택 ID는 문자열(h_xxx)이므로 raw_row_index 사용, 없으면 문자열 비교
        if (typeof a.id === 'string' && a.id.startsWith('h_')) {
          const idxA = a.raw_row_index !== undefined ? a.raw_row_index : 0;
          const idxB = b.raw_row_index !== undefined ? b.raw_row_index : 0;
          return idxA - idxB; // 오래된순: 작은 인덱스가 위로
        }
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
window.loadBBoxData = loadBBoxData;
 