/* -----------------------------------------
 * globals.js - 전역 변수/상수 정의
 * ----------------------------------------- */

/*******************************
 * ===== 전역 변수/상수 =====
 *******************************/

// 지도 관련 전역 변수
let MAP = null;
let MAP_READY = false;
let FETCH_CALLED_ONCE = false;

// 매물 데이터 관련 전역 변수
let MARKERS = [];
let LISTINGS = [];
let ORIGINAL_LIST = [];
let FILTERED_LISTINGS = [];

// 사용자 관련 전역 변수
let currentUser = null; // 이메일

// 정렬 관련 전역 변수
let CURRENT_SORT_MODE = "latest";
let SELECTED_MARKER_ID = null;

// 정렬 순환 상태 관리
const SORT_CYCLES = {
  latest: ["latest", "oldest", "default"], // 최신순 -> 오래된순 -> 기본정렬
  area: ["area_high", "area_low", "default"], // 면적 높은순 -> 낮은순 -> 기본정렬
  deposit: ["deposit_low", "deposit_high", "default"], // 보증금 낮은순 -> 높은순 -> 기본정렬
  rent: ["rent_low", "rent_high", "default"] // 월세 낮은순 -> 높은순 -> 기본정렬
};

let CURRENT_SORT_CYCLES = {
  latest: 0,
  area: 0,
  deposit: 0,
  rent: 0
};

// UI 관련 전역 변수
let CURRENT_SELECTED_LI_ID = null;
let LAST_DISTANCE_CENTER = null;
let CROSS_FLASH_TIMER = null;
let _clusterClickDelegationBound = false;

// 상태 관련 상수
const FIXED_STATUS = "생";
const STATUS_COLORS = { "생": "#007AFF" };

// 현황 표시를 위한 상태 매핑 (속도 최적화)
const STATUS_DISPLAY = {
  "생": "생",
  "완": "완", 
  "보류": "보류",
  "포기": "포기"
};
const ENABLE_TEMP_LOGIN = true;

// 필터 관련 전역 변수
const TOP_FILTERS = {};
const CUSTOMER_FILTERS = {};
const EFFECTIVE_FILTERS = {};

// UI 상태
const UI_STATE = {
  showCustomerPanel: false,
  showFullList: false,
  showFullBriefingList: false,
  isBriefingListMode: false, // true: 브리핑리스트 모드, false: 일반 매물리스트 모드
  selectedCustomerId: null,
  currentCustomerView: "detail"
};

// 지도 준비 큐
const MAP_READY_QUEUE = [];

// 클러스터러
let CLUSTERER = null;
let CLUSTER_GROUP = null;

// 지도 컨트롤 관련 변수
let ROADVIEW = null;
let ROADVIEW_MINIMAP = null;
let CADASTRAL_MAP = null;
let DISTANCE_MEASURE = null;
let IS_DISTANCE_MODE = false;
let DISTANCE_POINTS = [];
let DISTANCE_POLYLINE = null;
let DISTANCE_MARKERS = [];
let DISTANCE_LABELS = [];
let DISTANCE_INFO_WINDOW = null;

// 고객 입력(로컬만)
const CURRENT_CUSTOMER = { name: "", phone: "" };

// 브리핑 상태 관리
const BRIEFING_STATUS = {
  NORMAL: 'normal',
  PENDING: 'pending', 
  COMPLETED: 'completed',
  ONHOLD: 'onhold'
};

// 현재 선택된 고객의 브리핑 매물 상태 (로컬스토리지 키: `briefing_${customerId}`)
let CURRENT_BRIEFING_STATES = {};

// 브리핑 필터 상태
let BRIEFING_FILTERS = {
  normal: true,
  pending: true,
  completed: true,
  onhold: true
};

// 전체 브리핑 리스트 수정 데이터 관리
let FULL_BRIEFING_EDITED_DATA = {}; // 수정된 데이터 저장소
let FULL_BRIEFING_VIEW_MODE = 'original'; // 'original' 또는 'edited'

// 현황 표시 함수 (속도 최적화)
function getStatusDisplay(status) {
  return STATUS_DISPLAY[status] || status || "생";
}

// 전역 변수들을 외부에서 접근할 수 있도록 export
window.getStatusDisplay = getStatusDisplay;
window.MAP = MAP;
window.MAP_READY = MAP_READY;
window.FETCH_CALLED_ONCE = FETCH_CALLED_ONCE;
window.MARKERS = MARKERS;
window.LISTINGS = LISTINGS;
window.ORIGINAL_LIST = ORIGINAL_LIST;
window.FILTERED_LISTINGS = FILTERED_LISTINGS;
window.currentUser = currentUser;
window.CURRENT_SORT_MODE = CURRENT_SORT_MODE;
window.SELECTED_MARKER_ID = SELECTED_MARKER_ID;
window.SORT_CYCLES = SORT_CYCLES;
window.CURRENT_SORT_CYCLES = CURRENT_SORT_CYCLES;
window.CURRENT_SELECTED_LI_ID = CURRENT_SELECTED_LI_ID;
window.LAST_DISTANCE_CENTER = LAST_DISTANCE_CENTER;
window.CROSS_FLASH_TIMER = CROSS_FLASH_TIMER;
window._clusterClickDelegationBound = _clusterClickDelegationBound;
window.FIXED_STATUS = FIXED_STATUS;
window.STATUS_COLORS = STATUS_COLORS;
window.STATUS_DISPLAY = STATUS_DISPLAY;
window.ENABLE_TEMP_LOGIN = ENABLE_TEMP_LOGIN;
window.TOP_FILTERS = TOP_FILTERS;
window.CUSTOMER_FILTERS = CUSTOMER_FILTERS;
window.EFFECTIVE_FILTERS = EFFECTIVE_FILTERS;
window.UI_STATE = UI_STATE;
window.MAP_READY_QUEUE = MAP_READY_QUEUE;
window.CLUSTERER = CLUSTERER;
window.CLUSTER_GROUP = CLUSTER_GROUP;
window.ROADVIEW = ROADVIEW;
window.ROADVIEW_MINIMAP = ROADVIEW_MINIMAP;
window.CADASTRAL_MAP = CADASTRAL_MAP;
window.DISTANCE_MEASURE = DISTANCE_MEASURE;
window.IS_DISTANCE_MODE = IS_DISTANCE_MODE;
window.DISTANCE_POINTS = DISTANCE_POINTS;
window.DISTANCE_POLYLINE = DISTANCE_POLYLINE;
window.DISTANCE_MARKERS = DISTANCE_MARKERS;
window.DISTANCE_LABELS = DISTANCE_LABELS;
window.DISTANCE_INFO_WINDOW = DISTANCE_INFO_WINDOW;
window.CURRENT_CUSTOMER = CURRENT_CUSTOMER;
window.BRIEFING_STATUS = BRIEFING_STATUS;
window.CURRENT_BRIEFING_STATES = CURRENT_BRIEFING_STATES;
window.BRIEFING_FILTERS = BRIEFING_FILTERS;
window.FULL_BRIEFING_EDITED_DATA = FULL_BRIEFING_EDITED_DATA;
window.FULL_BRIEFING_VIEW_MODE = FULL_BRIEFING_VIEW_MODE; 