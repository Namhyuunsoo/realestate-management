/* -----------------------------------------
 * listing-mode-controls.js - 상가/주택 모드 전환 컨트롤
 * ----------------------------------------- */

/**************************************
 * ===== 상가/주택 모드 전환 =====
 **************************************/

/**
 * 모드 전환 버튼 초기화 및 이벤트 바인딩
 */
function initListingModeControls() {

  // 사용자 정보 확인 (일반 사용자면 주택 버튼 비활성화)
  checkUserRoleAndDisableButtons();

  // 상가/주택 모드 버튼
  const modeCommercialBtn = document.getElementById("modeCommercialBtn");
  const modeHousingBtn = document.getElementById("modeHousingBtn");

  if (modeCommercialBtn) {
    modeCommercialBtn.addEventListener("click", () => switchListingMode("commercial"));
  }

  if (modeHousingBtn) {
    modeHousingBtn.addEventListener("click", () => switchListingMode("housing"));
  }

  // 상가 subtype 버튼
  const subtypeCommercialLeaseBtn = document.getElementById("subtypeCommercialLeaseBtn");
  const subtypeCommercialUnitBtn = document.getElementById("subtypeCommercialUnitBtn");
  const subtypeCommercialLandBtn = document.getElementById("subtypeCommercialLandBtn");

  if (subtypeCommercialLeaseBtn) {
    subtypeCommercialLeaseBtn.addEventListener("click", () => switchCommercialSubtype("lease"));
  }

  if (subtypeCommercialUnitBtn) {
    subtypeCommercialUnitBtn.addEventListener("click", () => switchCommercialSubtype("unit"));
  }

  if (subtypeCommercialLandBtn) {
    subtypeCommercialLandBtn.addEventListener("click", () => switchCommercialSubtype("land"));
  }

  // 주택 subtype 버튼
  const subtypeHousingSaleBtn = document.getElementById("subtypeHousingSaleBtn");
  const subtypeHousingJeonseBtn = document.getElementById("subtypeHousingJeonseBtn");
  const subtypeHousingMonthlyBtn = document.getElementById("subtypeHousingMonthlyBtn");

  if (subtypeHousingSaleBtn) {
    subtypeHousingSaleBtn.addEventListener("click", () => switchHousingSubtype("sale"));
  }

  if (subtypeHousingJeonseBtn) {
    subtypeHousingJeonseBtn.addEventListener("click", () => switchHousingSubtype("jeonse"));
  }

  if (subtypeHousingMonthlyBtn) {
    subtypeHousingMonthlyBtn.addEventListener("click", () => switchHousingSubtype("monthly"));
  }

}

/**
 * 사용자 역할 확인 및 주택 버튼 비활성화
 */
async function checkUserRoleAndDisableButtons() {
  try {
    const userInfo = await getCurrentUserInfo();
    if (!userInfo) return;

    // /api/auth/me 응답: { user: { role } } 형식
    const role = userInfo?.user?.role ?? userInfo?.role ?? "user";
    const isManagerOrAdmin = role === "manager" || role === "admin";

    // 주택 모드 버튼 비활성화 (일반 사용자)
    const modeHousingBtn = document.getElementById("modeHousingBtn");
    if (modeHousingBtn) {
      if (!isManagerOrAdmin) {
        modeHousingBtn.disabled = true;
        modeHousingBtn.style.opacity = "0.5";
        modeHousingBtn.style.cursor = "not-allowed";
        modeHousingBtn.title = "매니저·어드민만 이용 가능합니다";
      } else {
        modeHousingBtn.disabled = false;
        modeHousingBtn.style.opacity = "1";
        modeHousingBtn.style.cursor = "pointer";
        modeHousingBtn.title = "";
      }
    }

    // 주택 subtype 버튼들도 비활성화
    const housingSubtypeButtons = document.getElementById("housingSubtypeButtons");
    if (housingSubtypeButtons) {
      const buttons = housingSubtypeButtons.querySelectorAll("button");
      buttons.forEach(btn => {
        if (!isManagerOrAdmin) {
          btn.disabled = true;
          btn.style.opacity = "0.5";
          btn.style.cursor = "not-allowed";
        } else {
          btn.disabled = false;
          btn.style.opacity = "1";
          btn.style.cursor = "pointer";
        }
      });
    }
  } catch (error) {
    console.error("사용자 역할 확인 실패:", error);
  }
}

/**
 * 상가/주택 모드 전환
 */
async function switchListingMode(mode) {
  if (UI_STATE.listingMode === mode) return; // 이미 같은 모드

  // 사용자 역할 확인 (주택 모드로 전환 시)
  if (mode === "housing") {
    const userInfo = await getCurrentUserInfo();
    const role = userInfo?.user?.role ?? userInfo?.role ?? "user";
    if (userInfo && role !== "manager" && role !== "admin") {
      // 일반 사용자는 주택 모드 접근 불가
      if (typeof showToast === 'function') {
        showToast("매니저·어드민만 주택 매물을 조회할 수 있습니다.", "error");
      } else {
        alert("매니저·어드민만 주택 매물을 조회할 수 있습니다.");
      }
      return;
    }
  }

  UI_STATE.listingMode = mode;

  // 버튼 UI 업데이트
  const modeCommercialBtn = document.getElementById("modeCommercialBtn");
  const modeHousingBtn = document.getElementById("modeHousingBtn");
  const commercialSubtypeButtons = document.getElementById("commercialSubtypeButtons");
  const housingSubtypeButtons = document.getElementById("housingSubtypeButtons");

  if (mode === "commercial") {
    if (modeCommercialBtn) modeCommercialBtn.classList.add("active");
    if (modeHousingBtn) modeHousingBtn.classList.remove("active");
    if (commercialSubtypeButtons) commercialSubtypeButtons.classList.remove("hidden");
    if (housingSubtypeButtons) housingSubtypeButtons.classList.add("hidden");

    // 상가 필터 섹션 표시
    const commercialFilterSection = document.getElementById("commercialFilterSection");
    const housingFilterSection = document.getElementById("housingFilterSection");
    if (commercialFilterSection) commercialFilterSection.classList.remove("hidden");
    if (housingFilterSection) housingFilterSection.classList.add("hidden");
    const modalCommercial = document.getElementById("modalCommercialFilter");
    const modalHousing = document.getElementById("modalHousingFilter");
    if (modalCommercial) modalCommercial.classList.remove("hidden");
    if (modalHousing) modalHousing.classList.add("hidden");

    // 상가 기본 subtype으로 설정 (임대차)
    UI_STATE.commercialSubtype = "lease";
    updateCommercialSubtypeButtons();
  } else {
    if (modeCommercialBtn) modeCommercialBtn.classList.remove("active");
    if (modeHousingBtn) modeHousingBtn.classList.add("active");
    if (commercialSubtypeButtons) commercialSubtypeButtons.classList.add("hidden");
    if (housingSubtypeButtons) housingSubtypeButtons.classList.remove("hidden");

    // 주택 필터 섹션 표시
    const commercialFilterSection = document.getElementById("commercialFilterSection");
    const housingFilterSection = document.getElementById("housingFilterSection");
    if (commercialFilterSection) commercialFilterSection.classList.add("hidden");
    if (housingFilterSection) housingFilterSection.classList.remove("hidden");
    const modalCommercial = document.getElementById("modalCommercialFilter");
    const modalHousing = document.getElementById("modalHousingFilter");
    if (modalCommercial) modalCommercial.classList.add("hidden");
    if (modalHousing) modalHousing.classList.remove("hidden");

    // 주택 기본 subtype으로 설정 (매매)
    UI_STATE.housingSubtype = "sale";
    updateHousingSubtypeButtons();
  }

  // 매물 데이터 다시 로드
  if (typeof fetchListings === 'function') {
    fetchListings(true); // force reload
  }
}

/**
 * 상가 subtype 전환
 */
function switchCommercialSubtype(subtype) {
  if (UI_STATE.commercialSubtype === subtype) return;

  UI_STATE.commercialSubtype = subtype;
  updateCommercialSubtypeButtons();

  // 매물 데이터 다시 로드
  if (typeof fetchListings === 'function') {
    fetchListings(true); // force reload
  }
}

/**
 * 주택 subtype 전환
 */
function switchHousingSubtype(subtype) {
  if (UI_STATE.housingSubtype === subtype) return;

  UI_STATE.housingSubtype = subtype;
  updateHousingSubtypeButtons();

  // 매물 데이터 다시 로드
  if (typeof fetchListings === 'function') {
    fetchListings(true); // force reload
  }
}

/**
 * 상가 subtype 버튼 UI 업데이트
 */
function updateCommercialSubtypeButtons() {
  const subtypeCommercialLeaseBtn = document.getElementById("subtypeCommercialLeaseBtn");
  const subtypeCommercialUnitBtn = document.getElementById("subtypeCommercialUnitBtn");
  const subtypeCommercialLandBtn = document.getElementById("subtypeCommercialLandBtn");

  const currentSubtype = UI_STATE.commercialSubtype;

  if (subtypeCommercialLeaseBtn) {
    if (currentSubtype === "lease") {
      subtypeCommercialLeaseBtn.classList.add("active");
    } else {
      subtypeCommercialLeaseBtn.classList.remove("active");
    }
  }

  if (subtypeCommercialUnitBtn) {
    if (currentSubtype === "unit") {
      subtypeCommercialUnitBtn.classList.add("active");
    } else {
      subtypeCommercialUnitBtn.classList.remove("active");
    }
  }

  if (subtypeCommercialLandBtn) {
    if (currentSubtype === "land") {
      subtypeCommercialLandBtn.classList.add("active");
    } else {
      subtypeCommercialLandBtn.classList.remove("active");
    }
  }

  // 필터바 항목 가시성 업데이트
  updateCommercialFilterUI();
}

/**
 * 상가 서브타입에 따른 상단 필터바 UI 동적 전환
 */
function updateCommercialFilterUI() {
  const subtype = UI_STATE.commercialSubtype || "lease";

  // 권리금 필드들
  const premiumFields = document.querySelectorAll(".comm-premium-field");
  // 매매 공통 필드들 (수익율)
  const saleOnlyFields = document.querySelectorAll(".comm-sale-only");
  // 건물토지 전용 필드들 (지목, 용도)
  const landOnlyFields = document.querySelectorAll(".comm-land-only");

  if (subtype === "lease") {
    premiumFields.forEach(el => el.classList.remove("hidden"));
    saleOnlyFields.forEach(el => el.classList.add("hidden"));
    landOnlyFields.forEach(el => el.classList.add("hidden"));
  } else if (subtype === "unit") {
    premiumFields.forEach(el => el.classList.add("hidden"));
    saleOnlyFields.forEach(el => el.classList.remove("hidden"));
    landOnlyFields.forEach(el => el.classList.add("hidden"));
  } else if (subtype === "land") {
    premiumFields.forEach(el => el.classList.add("hidden"));
    saleOnlyFields.forEach(el => el.classList.remove("hidden"));
    landOnlyFields.forEach(el => el.classList.remove("hidden"));
  }
}

/**
 * 주택 subtype 버튼 UI 업데이트
 */
function updateHousingSubtypeButtons() {
  const subtypeHousingSaleBtn = document.getElementById("subtypeHousingSaleBtn");
  const subtypeHousingJeonseBtn = document.getElementById("subtypeHousingJeonseBtn");
  const subtypeHousingMonthlyBtn = document.getElementById("subtypeHousingMonthlyBtn");

  if (subtypeHousingSaleBtn) {
    if (UI_STATE.housingSubtype === "sale") {
      subtypeHousingSaleBtn.classList.add("active");
    } else {
      subtypeHousingSaleBtn.classList.remove("active");
    }
  }

  if (subtypeHousingJeonseBtn) {
    if (UI_STATE.housingSubtype === "jeonse") {
      subtypeHousingJeonseBtn.classList.add("active");
    } else {
      subtypeHousingJeonseBtn.classList.remove("active");
    }
  }

  if (subtypeHousingMonthlyBtn) {
    if (UI_STATE.housingSubtype === "monthly") {
      subtypeHousingMonthlyBtn.classList.add("active");
    } else {
      subtypeHousingMonthlyBtn.classList.remove("active");
    }
  }
}

// 전역 함수로 등록
window.initListingModeControls = initListingModeControls;
window.switchListingMode = switchListingMode;
window.switchCommercialSubtype = switchCommercialSubtype;
window.switchHousingSubtype = switchHousingSubtype;
window.updateCommercialFilterUI = updateCommercialFilterUI;
window.checkUserRoleAndDisableButtons = checkUserRoleAndDisableButtons;

