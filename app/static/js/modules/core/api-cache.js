/* -----------------------------------------
 * api-cache.js - API 호출 캐싱 및 최적화
 * -----------------------------------------
 * 중복 API 호출 방지 및 캐싱으로 성능 최적화
 * ----------------------------------------- */

/*******************************
 * ===== CSRF 토큰 관리 =====
 *******************************/

// CSRF 토큰 가져오기
function getCsrfToken() {
  // 메타 태그에서 토큰 가져오기
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  if (metaToken) {
    const token = metaToken.getAttribute('content');
    // 보안 강화: CSRF 토큰 로깅 제거
    // console.log('🔑 CSRF 토큰 발견 (메타 태그):', token);
    return token;
  }

  // 세션 스토리지에서 토큰 가져오기
  const sessionToken = sessionStorage.getItem('csrf_token');
  if (sessionToken) {
    // 보안 강화: CSRF 토큰 로깅 제거
    // console.log('🔑 CSRF 토큰 발견 (세션 스토리지):', sessionToken);
    return sessionToken;
  }

  console.warn('⚠️ CSRF 토큰을 찾을 수 없습니다');
  return null;
}

// CSRF 토큰이 포함된 헤더 생성
function getCsrfHeaders() {
  const token = getCsrfToken();
  if (!token) {
    console.warn('⚠️ CSRF 토큰이 없어서 요청이 실패할 수 있습니다');
    return {};
  }

  return {
    'X-CSRF-Token': token
  };
}

// API 응답 캐시 (메모리 기반)
const API_CACHE = new Map();
const CACHE_DURATION = 30000; // 30초

// 캐시 키 생성 함수
function generateCacheKey(url, options = {}) {
  const headers = options.headers || {};
  const user = headers['X-User'] || 'anonymous';
  return `${url}:${user}`;
}

// 캐시된 API 호출 함수
async function cachedFetch(url, options = {}) {
  const signal = options.signal;
  const cacheKey = generateCacheKey(url, options);
  const now = Date.now();

  // 캐시 확인
  if (API_CACHE.has(cacheKey)) {
    const cached = API_CACHE.get(cacheKey);
    if (now - cached.timestamp < CACHE_DURATION) {
      // 캐시된 응답 사용
      return cached.data;
    } else {
      // 캐시 만료
      API_CACHE.delete(cacheKey);
    }
  }

  // CSRF 토큰 자동 포함
  const csrfHeaders = getCsrfHeaders();
  const mergedOptions = {
    ...options,
    headers: {
      ...csrfHeaders,
      ...options.headers
    }
  };

  // API 호출
  const response = await fetch(url, mergedOptions);

  if (!response.ok) {
    if (response.status === 401) {
      // 세션 만료 처리 (로그인 페이지로 이동)
      if (!window._isRedirectingToLogin) {
        window._isRedirectingToLogin = true;
        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
    throw new Error(`API 실패: ${response.status}`);
  }

  const data = await response.json();

  // 캐시에 저장
  API_CACHE.set(cacheKey, {
    data: data,
    timestamp: now
  });

  return data;
}

// 캐시 무효화 함수
function invalidateCache(pattern = null) {
  if (pattern) {
    // 특정 패턴의 캐시만 무효화
    for (const key of API_CACHE.keys()) {
      if (key.includes(pattern)) {
        API_CACHE.delete(key);
      }
    }
    // console.log(`🗑️ 캐시 무효화: ${pattern}`);
  } else {
    // 모든 캐시 무효화
    API_CACHE.clear();
    // console.log('🗑️ 모든 캐시 무효화');
  }
}

/*******************************
 * ===== 최적화된 API 함수들 =====
 *******************************/

// 사용자 정보 조회 (캐싱 적용)
let userInfoCache = null;
let userInfoCacheTime = 0;

async function getCurrentUserInfo() {
  const now = Date.now();

  // 캐시 확인 (5분간 유효)
  if (userInfoCache && (now - userInfoCacheTime) < 300000) {
    return userInfoCache;
  }

  try {
    const data = await cachedFetch('/api/auth/me', {
      credentials: 'include'
    });

    userInfoCache = data;
    userInfoCacheTime = now;

    return data;
  } catch (error) {
    console.error('사용자 정보 로드 실패:', error);
    return null;
  }
}

// 상가 매물 목록 조회 (캐싱 적용)
let listingsCache = {}; // subtype별 캐시
let listingsCacheTime = {}; // subtype별 캐시 시간

async function getCachedListings(status_raw = "생", force = false, format = null, bbox = null, signal = null) {
  const now = Date.now();
  const subtype = UI_STATE.commercialSubtype || "lease";
  
  // BBox가 있으면 캐시 키에 포함
  let bboxKey = "";
  if (bbox) {
    bboxKey = `_bb_${bbox.min_lat.toFixed(4)}_${bbox.max_lat.toFixed(4)}_${bbox.min_lng.toFixed(4)}_${bbox.max_lng.toFixed(4)}`;
  }
  
  const cacheKey = `${subtype}_${status_raw}${format ? '_' + format : ''}${bboxKey}`;

  // 강제 새로고침이 아니고 캐시가 유효한 경우
  if (!force && listingsCache[cacheKey] && (now - listingsCacheTime[cacheKey]) < 60000) { // 1분간 유효
    return listingsCache[cacheKey];
  }

  try {
    let url = `/api/listings?limit=100000&subtype=${subtype}&status_raw=${status_raw}&compact=1`;
    if (force) url += "&force=1";
    if (format) url += `&format=${format}`;
    if (bbox) {
      url += `&min_lat=${bbox.min_lat}&max_lat=${bbox.max_lat}&min_lng=${bbox.min_lng}&max_lng=${bbox.max_lng}`;
    }

    const data = await cachedFetch(url, {
      credentials: 'include',
      signal: signal
    });

    listingsCache[cacheKey] = data;
    listingsCacheTime[cacheKey] = now;

    return data;
  } catch (error) {
    console.error('상가 매물 목록 로드 실패:', error);
    return null;
  }
}

// 주택 매물 목록 조회 (캐싱 적용)
let housingListingsCache = {}; // subtype별 캐시
let housingListingsCacheTime = {}; // subtype별 캐시 시간

async function getCachedHousingListings(subtype = "sale", status_raw = "생", force = false, signal = null) {
  const now = Date.now();
  const cacheKey = `${subtype}_${status_raw}`;

  // 강제 새로고침이 아니고 캐시가 유효한 경우
  if (!force && housingListingsCache[cacheKey] && housingListingsCacheTime[cacheKey] && (now - housingListingsCacheTime[cacheKey]) < 60000) { // 1분간 유효
    // 캐시된 주택 매물 목록 사용
    return housingListingsCache[cacheKey];
  }

  try {
    const url = `/api/listings/housing?subtype=${subtype}&status_raw=${status_raw}&limit=100000&compact=1`;
    const data = await cachedFetch(url, {
      credentials: 'include'
    });

    housingListingsCache[cacheKey] = data;
    housingListingsCacheTime[cacheKey] = now;

    return data;
  } catch (error) {
    console.error('주택 매물 목록 로드 실패:', error);
    // 403 에러(권한 없음)인 경우 빈 데이터 반환
    if (error.message && error.message.includes('403')) {
      return { items: [], total: 0, limit: 100000, offset: 0 };
    }
    return null;
  }
}

// 고객 목록 조회 (캐싱 적용)
let customersCache = null;
let customersCacheTime = 0;

async function getCachedCustomers(filter = 'own') {
  const now = Date.now();

  // 캐시 확인 (2분간 유효)
  if (customersCache && (now - customersCacheTime) < 120000) {
    // 캐시된 고객 목록 사용
    return customersCache;
  }

  try {
    const data = await cachedFetch(`/api/customers?filter=${filter}`, {
      headers: { 'X-User': currentUser },
      credentials: 'include'
    });

    customersCache = data;
    customersCacheTime = now;

    return data;
  } catch (error) {
    console.error('고객 목록 로드 실패:', error);
    return null;
  }
}

// 추천 목록 조회 (캐싱 적용)
let recommendationsCache = null;
let recommendationsCacheTime = 0;

async function getCachedRecommendations() {
  const now = Date.now();

  // 캐시 확인 (1분간 유효)
  if (recommendationsCache && (now - recommendationsCacheTime) < 60000) {
    // 캐시된 추천 목록 사용
    return recommendationsCache;
  }

  try {
    const data = await cachedFetch('/api/recommendations', {
      headers: { 'X-User': currentUser },
      credentials: 'include'
    });

    recommendationsCache = data;
    recommendationsCacheTime = now;

    return data;
  } catch (error) {
    console.error('추천 목록 로드 실패:', error);
    return null;
  }
}

/*******************************
 * ===== 캐시 관리 함수들 =====
 *******************************/

// 사용자 변경 시 캐시 무효화
function clearUserCache() {
  userInfoCache = null;
  userInfoCacheTime = 0;
  invalidateCache();
}

// 매물 데이터 변경 시 관련 캐시 무효화
function clearListingsCache() {
  listingsCache = {};
  listingsCacheTime = {};
  invalidateCache('/api/listings');
}

// 주택 매물 데이터 변경 시 관련 캐시 무효화
function clearHousingListingsCache() {
  housingListingsCache = {};
  housingListingsCacheTime = {};
  invalidateCache('/api/listings/housing');
}

// 고객 데이터 변경 시 관련 캐시 무효화
function clearCustomersCache() {
  customersCache = null;
  customersCacheTime = 0;
  invalidateCache('/api/customers');
}

// 추천 데이터 변경 시 관련 캐시 무효화
function clearRecommendationsCache() {
  recommendationsCache = null;
  recommendationsCacheTime = 0;
  invalidateCache('/api/recommendations');
}

/*******************************
 * ===== 전역 함수 등록 =====
 *******************************/

// 전역 함수로 등록
window.cachedFetch = cachedFetch;
window.getCurrentUserInfo = getCurrentUserInfo;
window.getCachedListings = getCachedListings;
window.getCachedHousingListings = getCachedHousingListings;
window.getCachedCustomers = getCachedCustomers;
window.getCachedRecommendations = getCachedRecommendations;
window.clearUserCache = clearUserCache;
window.clearListingsCache = clearListingsCache;
window.clearHousingListingsCache = clearHousingListingsCache;
window.clearCustomersCache = clearCustomersCache;
window.clearRecommendationsCache = clearRecommendationsCache;
window.invalidateCache = invalidateCache;
window.getCsrfToken = getCsrfToken;
window.getCsrfHeaders = getCsrfHeaders;

