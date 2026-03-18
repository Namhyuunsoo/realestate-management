/* -----------------------------------------
 * realtime.js - Supabase 실시간 동기화 관리
 * ----------------------------------------- */

let _supabase = null;

/**
 * Supabase 실시간 구독 초기화
 */
window.initRealtimeSync = function(url, key) {
  if (!url || !key) {
    console.warn("⚠️ Supabase 설정 누락으로 실시간 동기화 시작 불가");
    return;
  }
  if (typeof supabase === "undefined") {
    // SDK가 아직 로드되지 않은 경우 잠시 대기
    setTimeout(() => window.initRealtimeSync(url, key), 500);
    return;
  }

  try {
    _supabase = supabase.createClient(url, key);
    dbg("🚀 Supabase Realtime 초기화 완료");

    // 상가 임대차, 구분상가, 건물토지 테이블 구독 시작
    const tables = ["listings_rent", "listings_sale_unit", "listings_sale_land"];
    
    tables.forEach(table => {
      _supabase.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table }, payload => {
          handleRealtimeEvent(table, payload);
        })
        .subscribe();
    });

  } catch (err) {
    console.error("❌ Realtime 초기화 중 오류:", err);
  }
};

/**
 * 실시간 변경 이벤트 처리 핸들러
 */
function handleRealtimeEvent(table, payload) {
  const { eventType, new: newRow, old: oldRow } = payload;
  dbg(`📡 [Realtime] ${table} ${eventType} 감지: ID ${prefix + (payload.new?.id || payload.old?.id)}`);

  // 테이블별 ID 접두사 매핑
  const prefixMap = {
    "listings_rent": "r_",
    "listings_sale_unit": "u_",
    "listings_sale_land": "l_"
  };
  const prefix = prefixMap[table] || "";
  const listingId = prefix + (newRow?.id || oldRow?.id);

  if (eventType === 'INSERT' || eventType === 'UPDATE') {
    // 1. 데이터 정규화 (프론트엔드 포맷으로 변환)
    const normalized = normalizeRealtimeRow(newRow, prefix);
    
    // 2. 전역 데이터 배열 업데이트
    updateGlobalListings(listingId, normalized);
    
    // 3. 지도 마커 업데이트
    if (window.updateSingleMarker) {
      window.updateSingleMarker(listingId, normalized);
    }
    
    // 4. 리스트 UI 업데이트
    if (window.updateSingleListingUI) {
      window.updateSingleListingUI(listingId, normalized);
    }

    showToast(`매물 정보가 실시간으로 반영되었습니다.`, 'info');
  } 
  else if (eventType === 'DELETE') {
    // 1. 전역 데이터에서 삭제
    removeGlobalListing(listingId);
    
    // 2. 지도에서 제거
    if (window.removeSingleMarker) {
      window.removeSingleMarker(listingId);
    }
    
    showToast(`매물이 삭제되었습니다.`, 'warning');
  }
}

/**
 * 실시간 수신 데이터를 앱 포맷으로 정규화
 */
function normalizeRealtimeRow(row, prefix) {
  return {
    id: prefix + row.id,
    user_id: row.user_id,
    address_full: row.address_full,
    fields: row.fields || {},
    coords: row.coords || { lat: null, lng: null },
    numeric_cache: row.numeric_cache || {},
    status_raw: row.status_raw || "",
    slot_id: row.slot_id || "",
    manager_name: row.manager_name || ""
  };
}

/**
 * 전역 LISTINGS 배열 업데이트
 */
function updateGlobalListings(id, data) {
  if (!window.LISTINGS) return;
  const idx = window.LISTINGS.findIndex(item => item.id === id);
  if (idx !== -1) {
    window.LISTINGS[idx] = { ...window.LISTINGS[idx], ...data };
  } else {
    window.LISTINGS.unshift(data); // 새로 추가된 경우 맨 앞에 삽입
  }
  
  if (window.ORIGINAL_LIST) {
    const oIdx = window.ORIGINAL_LIST.findIndex(item => item.id === id);
    if (oIdx !== -1) {
      window.ORIGINAL_LIST[oIdx] = { ...window.ORIGINAL_LIST[oIdx], ...data };
    } else {
      window.ORIGINAL_LIST.unshift(data);
    }
  }
}

/**
 * 전역 LISTINGS 배열에서 삭제
 */
function removeGlobalListing(id) {
  if (window.LISTINGS) {
    window.LISTINGS = window.LISTINGS.filter(item => item.id !== id);
  }
  if (window.ORIGINAL_LIST) {
    window.ORIGINAL_LIST = window.ORIGINAL_LIST.filter(item => item.id !== id);
  }
}

// 페이지 로드 시 기존 보관된 설정이 있으면 자동 초기화
if (window._supabaseConfig) {
  const { url, key } = window._supabaseConfig;
  window.initRealtimeSync(url, key);
}
