/* -----------------------------------------
 * auth.js - 인증 관련 함수들
 * ----------------------------------------- */

// 원래 fetch 함수 저장 (X-User 헤더 자동 추가를 위해)
if (!window._originalFetch) {
  window._originalFetch = window.fetch;
}

/**************************************
 * ===== 히스토리 관리 =====
 **************************************/

// 히스토리 상태 관리
let isHistoryInitialized = false;

// 히스토리 초기화 함수 (모바일에서만)
function initializeHistory() {
  if (isHistoryInitialized) return;
  
  console.log("🔍 히스토리 관리 초기화");
  
  // 모바일 환경에서만 히스토리 관리 적용
  if (isMobileApp()) {
    console.log("📱 모바일 환경 - 히스토리 관리 초기화");
    // popstate 이벤트 리스너 등록 (뒤로가기 버튼 감지)
    window.addEventListener('popstate', handlePopState);
    console.log("✅ 모바일 히스토리 관리 초기화 완료");
  } else {
    console.log("🖥️ 데스크톱 환경 - 히스토리 관리 건너뜀");
  }
  
  isHistoryInitialized = true;
}

// 뒤로가기 버튼 처리 함수 (모바일에서만 작동)
function handlePopState(event) {
  console.log("🔍 뒤로가기 버튼 감지됨");
  
  // 로그인 상태 확인
  const isLoggedIn = !!currentUser || !!localStorage.getItem('X-USER');
  
  if (isLoggedIn) {
    console.log("✅ 로그인된 상태 - 메인 페이지 유지");
    
    // 먼저 열려있는 패널들을 확인하고 닫기
    if (closeOpenPanels()) {
      return; // 패널이 닫혔다면 여기서 종료
    }
    
    // 로그인 화면이 보이는 경우 숨기기
    const loginScreen = document.getElementById("loginRequiredScreen");
    if (loginScreen && !loginScreen.classList.contains("hidden")) {
      hideLoginScreen();
    }
    
    // 앱 화면이 숨겨진 경우 보이기
    const appRoot = document.getElementById("appRoot");
    if (appRoot && appRoot.classList.contains("hidden")) {
      appRoot.classList.remove("hidden");
      appRoot.style.display = "block";
    }
    
    // 모바일 앱에서 뒤로가기 시 앱 종료 확인 다이얼로그 표시
    console.log("📱 모바일 환경 - 앱 종료 확인 다이얼로그 표시");
    showExitConfirmDialog();
    return; // 다이얼로그 표시 후 여기서 종료
  } else {
    console.log("❌ 로그인되지 않은 상태 - 로그인 화면으로 이동");
    showLoginScreen();
  }
}

// 모바일 앱 감지 함수
function isMobileApp() {
  // 1. window.MOBILE_APP 플래그 확인
  if (window.MOBILE_APP) {
    console.log("📱 모바일 앱 감지: window.MOBILE_APP 플래그");
    return true;
  }
  
  // 2. User-Agent 기반 모바일 감지 (더 엄격한 조건)
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  
  if (mobileRegex.test(userAgent)) {
    console.log("📱 모바일 앱 감지: User-Agent 기반");
    return true;
  }
  
  // 3. 화면 크기 기반 감지 (더 엄격한 조건)
  if (window.innerWidth <= 480) {
    console.log("📱 모바일 앱 감지: 화면 크기 기반 (480px 이하)");
    return true;
  }
  
  // 4. 터치 지원 여부는 제거 (PC에서도 터치스크린 지원 가능)
  
  console.log("🖥️ 데스크톱 환경 감지");
  return false;
}

// 열려있는 패널들을 닫는 함수
function closeOpenPanels() {
  // 모바일 환경에서 팝업 패널들이 열려있는지 확인
  const fullListPanel = document.getElementById('fullListPanel');
  const fullBriefingListPanel = document.getElementById('fullBriefingListPanel');
  const secondaryPanel = document.getElementById('secondaryPanel');
  const clusterList = document.getElementById('clusterList');
  const roadviewContainer = document.getElementById('roadviewContainer');
  
  // 열려있는 패널이 있으면 해당 패널을 닫고 true 반환
  if (fullListPanel && !fullListPanel.classList.contains('hidden')) {
    console.log('📱 전체보기 패널 닫기');
    if (typeof toggleFullList === 'function') {
      toggleFullList(false);
    }
    return true;
  }
  
  if (fullBriefingListPanel && !fullBriefingListPanel.classList.contains('hidden')) {
    console.log('📱 전체 브리핑 리스트 패널 닫기');
    if (typeof toggleFullBriefingList === 'function') {
      toggleFullBriefingList(false);
    }
    return true;
  }
  
  if (secondaryPanel && !secondaryPanel.classList.contains('hidden')) {
    console.log('📱 2차 사이드바 닫기');
    if (typeof closeSecondaryPanel === 'function') {
      closeSecondaryPanel();
    }
    return true;
  }
  
  if (clusterList && !clusterList.classList.contains('hidden')) {
    console.log('📱 클러스터 리스트 닫기');
    if (typeof hideClusterList === 'function') {
      hideClusterList();
    }
    return true;
  }
  
  if (roadviewContainer && !roadviewContainer.classList.contains('hidden')) {
    console.log('📱 로드뷰 닫기');
    if (typeof closeRoadview === 'function') {
      closeRoadview();
    } else {
      roadviewContainer.classList.add('hidden');
    }
    return true;
  }
  
  return false; // 닫을 패널이 없음
}

// 앱 종료 확인 다이얼로그 표시
function showExitConfirmDialog() {
  console.log("🔍 앱 종료 확인 다이얼로그 표시");
  
  const overlay = document.getElementById("exitConfirmOverlay");
  if (!overlay) {
    console.error("❌ 앱 종료 확인 다이얼로그 요소를 찾을 수 없습니다.");
    return;
  }
  
  // 다이얼로그 표시
  overlay.classList.remove("hidden");
  setTimeout(() => {
    overlay.classList.add("show");
  }, 10);
  
  // 기존 이벤트 리스너 제거 (중복 방지)
  const cancelBtn = document.getElementById("exitCancelBtn");
  const confirmBtn = document.getElementById("exitConfirmBtn");
  
  if (cancelBtn) {
    // 기존 이벤트 리스너 제거
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    const newCancelBtn = document.getElementById("exitCancelBtn");
    
    // 새로운 이벤트 리스너 추가
    newCancelBtn.addEventListener('click', function() {
      console.log("✅ 앱 종료 취소");
      hideExitConfirmDialog();
      // 취소 시 히스토리에 현재 상태 다시 추가하여 뒤로가기 방지
      window.history.pushState({ loggedIn: true, timestamp: Date.now() }, '', '/');
    });
  }
  
  if (confirmBtn) {
    // 기존 이벤트 리스너 제거
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    const newConfirmBtn = document.getElementById("exitConfirmBtn");
    
    // 새로운 이벤트 리스너 추가
    newConfirmBtn.addEventListener('click', function() {
      console.log("✅ 앱 종료 확인");
      hideExitConfirmDialog();
      // 확인 시 앱 종료 허용 (기본 브라우저 동작 수행)
      window.history.back();
    });
  }
}

// 앱 종료 확인 다이얼로그 숨기기
function hideExitConfirmDialog() {
  const overlay = document.getElementById("exitConfirmOverlay");
  if (overlay) {
    overlay.classList.remove("show");
    setTimeout(() => {
      overlay.classList.add("hidden");
    }, 300);
    console.log("📱 앱 종료 확인 다이얼로그 숨김");
  }
}

// 로그인 성공 시 히스토리 고정 (모바일에서만)
function fixHistoryAfterLogin() {
  console.log("🔍 로그인 후 히스토리 고정");
  
  // 모바일 환경에서만 히스토리 고정 적용
  if (isMobileApp()) {
    console.log("📱 모바일 환경 - 히스토리 고정 적용");
    // 현재 히스토리를 메인 페이지로 교체
    window.history.replaceState({ loggedIn: true, timestamp: Date.now() }, '', '/');
    
    // 추가 히스토리 엔트리 생성 (뒤로가기 시 메인 페이지 유지)
    window.history.pushState({ loggedIn: true, timestamp: Date.now() }, '', '/');
    
    console.log("✅ 모바일 히스토리 고정 완료");
  } else {
    console.log("🖥️ 데스크톱 환경 - 히스토리 고정 건너뜀");
  }
}

// 로그아웃 시 히스토리 정리
function clearHistoryOnLogout() {
  console.log("🔍 로그아웃 시 히스토리 정리");
  
  // 히스토리를 로그인 페이지로 교체
  window.history.replaceState({ loggedIn: false }, '', '/');
  
  console.log("✅ 히스토리 정리 완료");
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
  
  // 사용자 역할 확인 (서버에서 최신 정보 가져오기)
  fetch('/api/me', {
    headers: { 'X-User': email },
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    if (data.logged_in && data.role) {
      localStorage.setItem('X-USER-ROLE', data.role);
      console.log(`✅ 사용자 역할 설정: ${email} -> ${data.role}`);
      
      // 사용자 정보를 localStorage에 저장 (다른 모듈에서 사용)
      if (data.manager_name) {
        localStorage.setItem('X-USER-MANAGER-NAME', data.manager_name);
        console.log(`✅ 사용자 담당자명 설정: ${email} -> ${data.manager_name}`);
      }
      
      // UI 업데이트
      const userRole = data.role;
      const isAdmin = userRole === "admin";
      const isManager = userRole === "manager";
      
      const stat = document.getElementById("userStatus");
      if (stat) {
        let roleText = "";
        if (isAdmin) {
          roleText = `어드민: ${email}`;
        } else if (isManager) {
          roleText = `매니저: ${email}`;
        } else {
          roleText = `사용자: ${email}`;
        }
        stat.textContent = roleText;
      }
      
      toggleLoginLogoutUI(!!email);
      
      // 권한에 따른 UI 토글
      const isAdminOrManager = userRole === "admin" || userRole === "manager";
      toggleAdminUI(isAdminOrManager);
    }
  })
  .catch(error => {
    console.error('사용자 역할 확인 실패:', error);
    // 실패 시 기본값 사용
    const userRole = localStorage.getItem("X-USER-ROLE") || "user";
    const isAdmin = userRole === "admin";
    const isManager = userRole === "manager";
    
    const stat = document.getElementById("userStatus");
    if (stat) {
      let roleText = "";
      if (isAdmin) {
        roleText = `어드민: ${email}`;
      } else if (isManager) {
        roleText = `매니저: ${email}`;
      } else {
        roleText = `사용자: ${email}`;
      }
      stat.textContent = roleText;
    }
    
    toggleLoginLogoutUI(!!email);
    
    // 권한에 따른 UI 토글
    const isAdminOrManager = userRole === "admin" || userRole === "manager";
    toggleAdminUI(isAdminOrManager);
  });
  
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
  // 사용자 역할 확인
  const userRole = localStorage.getItem("X-USER-ROLE") || "user";
  console.log(`🔍 toggleAdminUI 호출: isAdmin=${isAdmin}, userRole=${userRole}`);
  console.log(`🔍 localStorage X-USER:`, localStorage.getItem("X-USER"));
  
  // 어드민 전용 UI 요소들 (전체 컨테이너)
  const adminContainer = document.querySelector(".admin-only");
  console.log(`🔍 adminContainer 찾음:`, adminContainer);
  
  if (adminContainer) {
    if (userRole === "admin" || userRole === "manager") {
      adminContainer.classList.remove("hidden");
      adminContainer.style.display = "flex"; // CSS의 display: none을 덮어쓰기
      console.log("✅ 어드민 컨테이너 표시 - 클래스:", adminContainer.className, "스타일:", adminContainer.style.display);
    } else {
      adminContainer.classList.add("hidden");
      adminContainer.style.display = "none";
      console.log("ℹ️ 어드민 컨테이너 숨김 - 클래스:", adminContainer.className, "스타일:", adminContainer.style.display);
    }
  } else {
    console.error("❌ adminContainer를 찾을 수 없습니다!");
  }
  
  // 통계 버튼은 어드민만 표시
  const statsBtn = document.getElementById("adminStatsBtn");
  console.log(`🔍 statsBtn 찾음:`, statsBtn);
  
  if (statsBtn) {
    if (userRole === "admin") {
      statsBtn.style.display = "inline-block";
      console.log("✅ 통계 버튼 표시 - 스타일:", statsBtn.style.display);
    } else {
      statsBtn.style.display = "none";
      console.log("ℹ️ 통계 버튼 숨김 - 스타일:", statsBtn.style.display);
    }
  } else {
    console.error("❌ adminStatsBtn을 찾을 수 없습니다!");
  }
  
  // 사용자 관리 버튼은 어드민과 매니저만 표시
  const userMgmtBtn = document.getElementById("userManagementBtn");
  console.log(`🔍 userMgmtBtn 찾음:`, userMgmtBtn);
  
  if (userMgmtBtn) {
    if (userRole === "admin" || userRole === "manager") {
      userMgmtBtn.style.display = "inline-block";
      console.log("✅ 사용자 관리 버튼 표시 - 스타일:", userMgmtBtn.style.display);
    } else {
      userMgmtBtn.style.display = "none";
      console.log("ℹ️ 사용자 관리 버튼 숨김 - 스타일:", userMgmtBtn.style.display);
    }
  } else {
    console.error("❌ userManagementBtn을 찾을 수 없습니다!");
  }
  
  console.log(`✅ UI 토글 완료: ${userRole} 역할`);
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
  
  // 서버에서 사용자 정보 및 권한 확인
  try {
    const response = await fetch("/api/me", {
      method: "GET",
      headers: {
        "X-User": email
      }
    });
    
    if (response.ok) {
      const userInfo = await response.json();
      console.log("🔍 사용자 정보:", userInfo);
      
      // 사용자 역할에 따른 권한 설정
      if (userInfo.is_admin || userInfo.role === 'admin') {
        console.log("✅ 어드민 권한 확인됨:", email);
        localStorage.setItem("X-USER-ADMIN", "true");
        localStorage.setItem("X-USER-ROLE", "admin");
      } else if (userInfo.role === 'manager') {
        console.log("ℹ️ 매니저 권한:", email);
        localStorage.removeItem("X-USER-ADMIN");
        localStorage.setItem("X-USER-ROLE", "manager");
      } else {
        console.log("ℹ️ 일반 사용자:", email);
        localStorage.removeItem("X-USER-ADMIN");
        localStorage.setItem("X-USER-ROLE", "user");
      }
      
      // 사용자 정보를 전역 변수에 저장
      window.currentUserInfo = userInfo;
    } else {
      console.log("⚠️ 사용자 정보 확인 실패, 일반 사용자로 처리");
      localStorage.removeItem("X-USER-ADMIN");
      localStorage.setItem("X-USER-ROLE", "user");
    }
  } catch (error) {
    console.error("사용자 정보 확인 중 오류:", error);
    localStorage.removeItem("X-USER-ADMIN");
    localStorage.setItem("X-USER-ROLE", "user");
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

  // 권한에 따른 UI 업데이트
  const finalUserRole = localStorage.getItem("X-USER-ROLE") || "user";
  const isAdminOrManagerForApply = finalUserRole === "admin" || finalUserRole === "manager";
  toggleAdminUI(isAdminOrManagerForApply);
  
  // 히스토리 초기화 및 고정
  initializeHistory();
  fixHistoryAfterLogin();

  // 매물 데이터 로드 (함수 존재 여부 확인 후 실행)
  if (typeof runAfterMapReady === 'function') {
    runAfterMapReady(() => {
      // 재로그인 시에는 항상 데이터를 다시 로드
      if (typeof FETCH_CALLED_ONCE !== 'undefined') {
        FETCH_CALLED_ONCE = true;
      }
      if (typeof fetchListings === 'function') {
        fetchListings();
        console.log("✅ 매물 데이터 로드 시작");
      }
    });
  }
  
  console.log("✅ 로그인 완료:", email);
}

// 세션 체크 및 자동 로그인 처리
async function checkSessionAndAutoLogin() {
  console.log("🔍 세션 체크 및 자동 로그인 시작");
  
  try {
    // 서버에 세션 상태 확인 요청
    const response = await fetch('/api/auth/check-session', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.logged_in && data.user) {
        console.log("✅ 서버 세션에서 사용자 정보 확인됨");
        
        // 사용자 정보 설정
        setCurrentUser(data.user.email);
        
        // localStorage에 사용자 정보 저장 (모바일 앱 재시작 시 사용)
        localStorage.setItem('X-USER', data.user.email);
        localStorage.setItem('X-USER-ROLE', data.user.role || 'user');
        if (data.user.role === 'admin') {
          localStorage.setItem('X-USER-ADMIN', 'true');
        } else {
          localStorage.removeItem('X-USER-ADMIN');
        }
        
        // 로그인 화면 숨기고 앱 화면 표시
        hideLoginScreen();
        
        // 히스토리 초기화 및 고정
        initializeHistory();
        fixHistoryAfterLogin();
        
        return true;
      }
    }
  } catch (error) {
    console.warn("⚠️ 세션 체크 실패:", error);
  }
  
  // 서버 세션이 없으면 localStorage에서 확인
  const savedUser = localStorage.getItem('X-USER');
  if (savedUser) {
    console.log("🔄 localStorage에서 사용자 정보 복원:", savedUser);
    
    // 서버에 자동 로그인 요청
    try {
      const response = await fetch('/api/auth/auto-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': savedUser
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ 자동 로그인 성공");
        
        setCurrentUser(savedUser);
        hideLoginScreen();
        
        // 히스토리 초기화 및 고정
        initializeHistory();
        fixHistoryAfterLogin();
        
        return true;
      }
    } catch (error) {
      console.warn("⚠️ 자동 로그인 실패:", error);
    }
  }
  
  // 모든 방법 실패 시 로그인 화면 표시
  console.log("❌ 로그인 필요");
  showLoginScreen();
  return false;
}

// 새로운 이메일/비밀번호 로그인 처리 함수
// 로그인 폼 관련 함수들은 제거됨 (별도 로그인 페이지에서 처리)

function handleLogoutClick(e) {
  e.preventDefault();
  console.log("🔍 로그아웃 시작");

  try {
    localStorage.removeItem("X-USER");
    localStorage.removeItem("X-USER-ADMIN");
    localStorage.removeItem("X-USER-ROLE");
    currentUser = null;
    console.log("✅ localStorage에서 사용자 정보 제거");
  } catch (err) {
    console.error("localStorage 제거 실패", err);
  }

  // 전역 상태 초기화
  if (typeof FETCH_CALLED_ONCE !== 'undefined') {
    FETCH_CALLED_ONCE = false;
  }
  if (typeof ORIGINAL_LIST !== 'undefined') {
    ORIGINAL_LIST = [];
  }
  if (typeof LISTINGS !== 'undefined') {
    LISTINGS = [];
  }
  
  // 지도 마커들 제거
  if (typeof MAP !== 'undefined' && MAP && typeof MARKERS !== 'undefined' && MARKERS) {
    MARKERS.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    MARKERS = [];
    console.log("✅ 지도 마커들 제거");
  }
  
  // 클러스터 그룹 초기화
  if (typeof CLUSTER_GROUP !== 'undefined' && CLUSTER_GROUP && typeof CLUSTER_GROUP.clear === 'function') {
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
  if (typeof updateCountsDisplay === 'function') {
    updateCountsDisplay(0, 0);
  }
  
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
  if (typeof UI_STATE !== 'undefined') {
    UI_STATE.showFullBriefingList = false;
    UI_STATE.showFullList = false;
    UI_STATE.isBriefingListMode = false;
  }

  // 로그아웃 시 브라우저 히스토리 정리
  clearHistoryOnLogout();

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
window.fixHistoryAfterLogin = fixHistoryAfterLogin;
window.clearHistoryOnLogout = clearHistoryOnLogout;
window.handlePopState = handlePopState;
window.showExitConfirmDialog = showExitConfirmDialog;
window.hideExitConfirmDialog = hideExitConfirmDialog;
window.isMobileApp = isMobileApp;
window.closeOpenPanels = closeOpenPanels;
window.handleLogoutClick = handleLogoutClick;
window.setCurrentUser = setCurrentUser;
window.toggleAdminUI = toggleAdminUI; 