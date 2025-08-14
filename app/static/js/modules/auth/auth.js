/* -----------------------------------------
 * auth.js - 인증 관련 함수들
 * ----------------------------------------- */

// 원래 fetch 함수 저장 (X-User 헤더 자동 추가를 위해)
if (!window._originalFetch) {
  window._originalFetch = window.fetch;
}

/**************************************
 * ===== 로그인 화면 토글 =====
 **************************************/

function showLoginScreen(msg = "") {
  console.log("🔍 showLoginScreen 호출됨:", msg);
  
  const loginRequired = document.getElementById("loginRequiredScreen");
  const appRoot = document.getElementById("appRoot");
  
  if (loginRequired) {
    loginRequired.classList.remove("hidden");
    // style.display 직접 조작 제거 - CSS의 flexbox가 작동하도록 함
    console.log("✅ 로그인 필요 화면 표시");
  }
  
  if (appRoot) {
    appRoot.classList.add("hidden");
    appRoot.style.display = "none";
    console.log("✅ 앱 화면 숨김");
  }
}

function hideLoginScreen() {
  console.log("🔍 hideLoginScreen 호출됨");
  
  const loginRequired = document.getElementById("loginRequiredScreen");
  const appRoot = document.getElementById("appRoot");
  
  if (loginRequired) {
    loginRequired.classList.add("hidden");
    // style.display 직접 조작 제거 - CSS의 flexbox가 작동하도록 함
    console.log("✅ 로그인 필요 화면 숨김");
  }
  
  if (appRoot) {
    appRoot.classList.remove("hidden");
    appRoot.style.display = "block";
    console.log("✅ 앱 화면 표시");
  }

  toggleLoginLogoutUI(!!currentUser);
  fixMapLayoutAfterShow();
}

/**************************************
 * ===== 사용자(세션/수동) 처리 =====
 **************************************/

function setCurrentUser(email) {
  currentUser = email;
  localStorage.setItem("X-USER", email);
  
  // 어드민 권한 확인
  const isAdmin = localStorage.getItem("X-USER-ADMIN") === "true";
  
  const stat = document.getElementById("userStatus");
  if (stat) {
    const roleText = isAdmin ? `어드민: ${email}` : `사용자: ${email}`;
    stat.textContent = roleText;
  }
  
  toggleLoginLogoutUI(!!email);
  
  // 어드민 전용 UI 요소들 토글
  toggleAdminUI(isAdmin);
  
  // X-User 헤더를 모든 fetch 요청에 자동으로 추가 (더 안전한 방식)
  if (email) {
    // 기존 fetch 함수를 오버라이드하여 X-User 헤더 자동 추가
    const originalFetch = window._originalFetch || window.fetch;
    window.fetch = function(url, options = {}) {
      // options가 없거나 headers가 없는 경우 초기화
      if (!options) {
        options = {};
      }
      if (!options.headers) {
        options.headers = {};
      }
      
      // X-User 헤더가 없거나 현재 사용자와 다른 경우 업데이트
      if (email && (!options.headers['X-User'] || options.headers['X-User'] !== email)) {
        options.headers['X-User'] = email;
        console.log('🔐 X-User 헤더 추가:', email);
      }
      
      return originalFetch(url, options);
    };
    
    console.log('✅ X-User 헤더 자동 설정 완료:', email);
  } else {
    // 사용자가 없는 경우 원래 fetch 함수로 복원
    if (window._originalFetch) {
      window.fetch = window._originalFetch;
      console.log('🔄 fetch 함수 원래대로 복원');
    }
  }
}

function loadUserFromStorage() {
  const u = localStorage.getItem("X-USER");
  if (u) {
    setCurrentUser(u);
    // 어드민 권한 정보도 함께 로드
    const isAdmin = localStorage.getItem("X-USER-ADMIN") === "true";
    toggleAdminUI(isAdmin);
  }
}

function toggleLoginLogoutUI(isLoggedIn) {
  const logoutBtn = document.getElementById("logoutBtn");
  const manualWrap = document.getElementById("manualUserWrap");

  if (logoutBtn) logoutBtn.classList.toggle("hidden", !isLoggedIn);
  if (manualWrap) manualWrap.classList.toggle("hidden", isLoggedIn);
}

function toggleAdminUI(isAdmin) {
  // 어드민 전용 UI 요소들
  const adminElements = document.querySelectorAll(".admin-only");
  adminElements.forEach(el => {
    if (isAdmin) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
  
  console.log(isAdmin ? "✅ 어드민 UI 활성화" : "ℹ️ 일반 사용자 UI");
}

async function applyUser() {
  console.log("🔍 applyUser 함수 호출됨");
  
  const loginInp  = document.getElementById("loginEmail");
  const manualInp = document.getElementById("userEmail");

  let email = "";
  if (loginInp && loginInp.value.trim()) {
    email = loginInp.value.trim();
    console.log("🔍 로그인 이메일 입력:", email);
  } else if (manualInp && manualInp.value.trim()) {
    email = manualInp.value.trim();
    console.log("🔍 수동 이메일 입력:", email);
  }

  if (!email) {
    const m = document.getElementById("loginErrorMsg");
    if (m) m.textContent = "이메일을 입력하세요.";
    console.log("❌ 이메일이 입력되지 않음");
    return;
  }

  const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!EMAIL_RE.test(email)) {
    const m = document.getElementById("loginErrorMsg");
    if (m) m.textContent = "올바른 이메일 형식이 아닙니다.";
    console.log("❌ 이메일 형식 오류:", email);
    return;
  }

  console.log("✅ 이메일 검증 통과:", email);
  
  // 사용자 설정
  setCurrentUser(email);
  
  // 서버에서 어드민 권한 확인
  try {
    const response = await fetch("/api/check-admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User": email
      },
      body: JSON.stringify({ email: email })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.is_admin) {
        console.log("✅ 어드민 권한 확인됨:", email);
        // 어드민 권한 정보를 localStorage에 저장
        localStorage.setItem("X-USER-ADMIN", "true");
      } else {
        console.log("ℹ️ 일반 사용자:", email);
        localStorage.removeItem("X-USER-ADMIN");
      }
    } else {
      console.log("⚠️ 어드민 권한 확인 실패, 일반 사용자로 처리");
      localStorage.removeItem("X-USER-ADMIN");
    }
  } catch (error) {
    console.error("어드민 권한 확인 중 오류:", error);
    localStorage.removeItem("X-USER-ADMIN");
  }
  
  // 로그인 화면 강제 숨김
  const loginScreen = document.getElementById("loginScreen");
  const appRoot = document.getElementById("appRoot");
  
  if (loginScreen) {
    loginScreen.classList.add("hidden");
    loginScreen.style.display = "none";
    console.log("✅ 로그인 화면 숨김");
  }
  
  if (appRoot) {
    appRoot.classList.remove("hidden");
    appRoot.style.display = "block";
    console.log("✅ 앱 화면 표시");
  }

  // 매물 데이터 로드
  runAfterMapReady(() => {
    // 재로그인 시에는 항상 데이터를 다시 로드
    FETCH_CALLED_ONCE = true;
    fetchListings();
    console.log("✅ 매물 데이터 로드 시작");
  });
  
  console.log("✅ 로그인 완료:", email);
}

// 새로운 이메일/비밀번호 로그인 처리 함수
// 로그인 폼 관련 함수들은 제거됨 (별도 로그인 페이지에서 처리)

function handleLogoutClick(e) {
  e.preventDefault();
  console.log("🔍 로그아웃 시작");

  try {
    localStorage.removeItem("X-USER");
    localStorage.removeItem("X-USER-ADMIN");
    currentUser = null;
    console.log("✅ localStorage에서 사용자 정보 제거");
  } catch (err) {
    console.error("localStorage 제거 실패", err);
  }

  // 전역 상태 초기화
  FETCH_CALLED_ONCE = false;
  ORIGINAL_LIST = [];
  LISTINGS = [];
  
  // 지도 마커들 제거
  if (MAP && MARKERS) {
    MARKERS.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    MARKERS = [];
    console.log("✅ 지도 마커들 제거");
  }
  
  // 클러스터 그룹 초기화
  if (CLUSTER_GROUP && typeof CLUSTER_GROUP.clear === 'function') {
    CLUSTER_GROUP.clear();
  }
  
  // 어드민 UI 비활성화
  toggleAdminUI(false);
  
  // 매물 리스트 초기화
  const ul = document.getElementById("listingList");
  if (ul) {
    ul.innerHTML = "";
    console.log("✅ 매물 리스트 초기화");
  }
  
  // 카운트 초기화
  updateCountsDisplay(0, 0);
  
  // 모든 패널 숨기기
  const panels = ["fullBriefingListPanel", "fullListPanel", "secondaryPanel"];
  panels.forEach(panelId => {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.add("hidden");
      panel.style.display = "none";
    }
  });
  
  // UI 상태 초기화
  UI_STATE.showFullBriefingList = false;
  UI_STATE.showFullList = false;
  UI_STATE.isBriefingListMode = false;

  showLoginScreen("");

  fetch("/auth/logout", { method: "GET", credentials: "include" })
    .finally(() => {
      console.log("✅ 로그아웃 완료");
    });
}

function applyCustomerInputs() {
  const nameInp = document.getElementById("customerName");
  const phoneInp = document.getElementById("customerPhone");
  CURRENT_CUSTOMER.name  = nameInp ? nameInp.value.trim() : "";
  CURRENT_CUSTOMER.phone = phoneInp ? phoneInp.value.trim() : "";
}

// 인증 관련 함수들을 전역으로 export
window.showLoginScreen = showLoginScreen;
window.hideLoginScreen = hideLoginScreen;
window.setCurrentUser = setCurrentUser;
window.loadUserFromStorage = loadUserFromStorage;
window.toggleLoginLogoutUI = toggleLoginLogoutUI;
window.toggleAdminUI = toggleAdminUI;
window.applyUser = applyUser;
window.handleLogoutClick = handleLogoutClick;
window.applyCustomerInputs = applyCustomerInputs; 