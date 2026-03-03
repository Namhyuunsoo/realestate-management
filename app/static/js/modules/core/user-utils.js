/* -----------------------------------------
 * user-utils.js - 사용자 관련 공통 유틸리티
 * -----------------------------------------
 * 사용자 역할 확인, 권한 체크 등 공통 함수들을 모듈화
 * 중복 코드 제거 및 성능 최적화
 * ----------------------------------------- */

/*******************************
 * ===== 사용자 역할 확인 =====
 *******************************/

/**
 * 현재 사용자가 관리자인지 확인
 * @returns {boolean} 관리자 여부
 */
function isUserAdmin() {
  const userRole = localStorage.getItem("X-USER-ROLE") || "user";
  return userRole === "admin";
}

/**
 * 현재 사용자가 매니저인지 확인
 * @returns {boolean} 매니저 여부
 */
function isUserManager() {
  const userRole = localStorage.getItem("X-USER-ROLE") || "user";
  return userRole === "manager";
}

/**
 * 현재 사용자의 역할 반환
 * @returns {string} 사용자 역할 (admin, manager, user)
 */
function getUserRole() {
  return localStorage.getItem("X-USER-ROLE") || "user";
}

/**
 * 현재 사용자가 관리자 또는 매니저인지 확인
 * @returns {boolean} 관리자 또는 매니저 여부
 */
function isUserAdminOrManager() {
  const role = getUserRole();
  return role === "admin" || role === "manager";
}

/**
 * 현재 사용자가 사용자 관리 권한이 있는지 확인
 * @returns {boolean} 사용자 관리 권한 여부
 */
function canManageUsers() {
  const role = getUserRole();
  return role === "admin" || role === "manager";
}

/**
 * 현재 사용자가 통계 조회 권한이 있는지 확인
 * @returns {boolean} 통계 조회 권한 여부
 */
function canViewStats() {
  return isUserAdmin();
}

/*******************************
 * ===== 사용자 정보 조회 =====
 *******************************/

/**
 * 현재 사용자 이메일 반환
 * @returns {string|null} 사용자 이메일
 */
function getCurrentUserEmail() {
  return localStorage.getItem("X-USER");
}

/**
 * 현재 사용자 이름 반환
 * @returns {string|null} 사용자 이름
 */
function getCurrentUserName() {
  return localStorage.getItem("X-USER-NAME");
}

/**
 * 현재 사용자 정보 객체 반환
 * @returns {Object|null} 사용자 정보 객체
 */
function getCurrentUserInfo() {
  const email = getCurrentUserEmail();
  const name = getCurrentUserName();
  const role = getUserRole();
  
  if (!email) return null;
  
  return {
    email: email,
    name: name,
    role: role,
    isAdmin: isUserAdmin(),
    isManager: isUserManager(),
    canManageUsers: canManageUsers(),
    canViewStats: canViewStats()
  };
}

/*******************************
 * ===== UI 권한 제어 =====
 *******************************/

/**
 * 관리자 전용 UI 요소 표시/숨김
 * @param {boolean} show - 표시 여부
 */
function toggleAdminUI(show) {
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(element => {
    if (show) {
      element.classList.remove('hidden');
      element.style.display = '';
    } else {
      element.classList.add('hidden');
      element.style.display = 'none';
    }
  });
}

/**
 * 매니저 이상 권한 UI 요소 표시/숨김
 * @param {boolean} show - 표시 여부
 */
function toggleManagerUI(show) {
  const managerElements = document.querySelectorAll('.manager-only');
  managerElements.forEach(element => {
    if (show) {
      element.classList.remove('hidden');
      element.style.display = '';
    } else {
      element.classList.add('hidden');
      element.style.display = 'none';
    }
  });
}

/**
 * 사용자 역할에 따른 모든 UI 요소 업데이트
 */
function updateUIByUserRole() {
  const userInfo = getCurrentUserInfo();
  
  if (!userInfo) {
    // 로그인하지 않은 경우 모든 권한 UI 숨김
    toggleAdminUI(false);
    toggleManagerUI(false);
    return;
  }
  
  // 관리자 UI
  toggleAdminUI(userInfo.isAdmin);
  
  // 매니저 UI
  toggleManagerUI(userInfo.isManager || userInfo.isAdmin);
  
  // 특정 버튼들 개별 처리
  updateSpecificButtons(userInfo);
}

/**
 * 특정 버튼들의 표시/숨김 처리
 * @param {Object} userInfo - 사용자 정보 객체
 */
function updateSpecificButtons(userInfo) {
  // 통계 버튼 (관리자만)
  const statsBtn = document.getElementById("adminStatsBtn");
  if (statsBtn) {
    statsBtn.style.display = userInfo.isAdmin ? "inline-block" : "none";
  }
  
  // 사용자 관리 버튼 (관리자, 매니저)
  const userMgmtBtn = document.getElementById("userManagementBtn");
  if (userMgmtBtn) {
    userMgmtBtn.style.display = userInfo.canManageUsers ? "inline-block" : "none";
  }
}

/*******************************
 * ===== 권한 체크 헬퍼 =====
 *******************************/

/**
 * 특정 권한이 필요한 작업 실행 전 체크
 * @param {string} requiredRole - 필요한 역할
 * @param {Function} callback - 권한이 있을 때 실행할 함수
 * @param {Function} onDenied - 권한이 없을 때 실행할 함수
 */
function checkPermission(requiredRole, callback, onDenied) {
  const currentRole = getUserRole();
  
  let hasPermission = false;
  switch (requiredRole) {
    case 'admin':
      hasPermission = isUserAdmin();
      break;
    case 'manager':
      hasPermission = isUserManager() || isUserAdmin();
      break;
    case 'user':
      hasPermission = true; // 모든 로그인 사용자
      break;
    default:
      hasPermission = false;
  }
  
  if (hasPermission) {
    if (typeof callback === 'function') {
      callback();
    }
  } else {
    if (typeof onDenied === 'function') {
      onDenied();
    } else {
      console.warn(`권한 부족: ${requiredRole} 권한이 필요합니다.`);
    }
  }
}

/**
 * 관리자 권한 체크
 * @param {Function} callback - 권한이 있을 때 실행할 함수
 * @param {Function} onDenied - 권한이 없을 때 실행할 함수
 */
function requireAdmin(callback, onDenied) {
  checkPermission('admin', callback, onDenied);
}

/**
 * 매니저 이상 권한 체크
 * @param {Function} callback - 권한이 있을 때 실행할 함수
 * @param {Function} onDenied - 권한이 없을 때 실행할 함수
 */
function requireManager(callback, onDenied) {
  checkPermission('manager', callback, onDenied);
}

/*******************************
 * ===== 전역 함수 등록 =====
 *******************************/

// 전역 함수로 등록하여 다른 모듈에서 사용 가능하도록 함
window.isUserAdmin = isUserAdmin;
window.isUserManager = isUserManager;
window.getUserRole = getUserRole;
window.isUserAdminOrManager = isUserAdminOrManager;
window.canManageUsers = canManageUsers;
window.canViewStats = canViewStats;
window.getCurrentUserEmail = getCurrentUserEmail;
window.getCurrentUserName = getCurrentUserName;
window.getCurrentUserInfo = getCurrentUserInfo;
window.toggleAdminUI = toggleAdminUI;
window.toggleManagerUI = toggleManagerUI;
window.updateUIByUserRole = updateUIByUserRole;
window.checkPermission = checkPermission;
window.requireAdmin = requireAdmin;
window.requireManager = requireManager;

