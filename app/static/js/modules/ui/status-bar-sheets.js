/* -----------------------------------------
 * status-bar-sheets.js - 상태카운트바 매물장 컨트롤
 * ----------------------------------------- */

/**************************************
 * ===== 전역 변수 =====
 **************************************/

let CURRENT_SELECTED_SHEET = null;
let USER_SHEETS_FOR_STATUS_BAR = [];

/**************************************
 * ===== 초기화 =====
 **************************************/

function initStatusBarSheets() {
  console.log("🔧 상태카운트바 매물장 컨트롤 초기화 시작");
  
  // currentUser 확인
  if (!currentUser) {
    console.log("⏳ currentUser가 아직 설정되지 않음, 잠시 대기...");
    setTimeout(initStatusBarSheets, 500);
    return;
  }
  
  console.log("👤 currentUser 확인됨:", currentUser);
  
  // 이벤트 리스너 등록
  bindStatusBarSheetEvents();
  
  // 사용자 시트 로드
  loadUserSheetsForStatusBar();
  
  console.log("✅ 상태카운트바 매물장 컨트롤 초기화 완료");
}

function bindStatusBarSheetEvents() {
  console.log("🔗 이벤트 리스너 등록 시작");
  
  // 구글 시트 열기 버튼 이벤트
  const openSheetBtn = document.getElementById('openGoogleSheetBtn');
  if (openSheetBtn) {
    console.log("✅ 구글 시트 열기 버튼 찾음, 클릭 이벤트 등록");
    openSheetBtn.addEventListener('click', openSelectedGoogleSheet);
  } else {
    console.error("❌ 구글 시트 열기 버튼을 찾을 수 없습니다");
  }
  
  // 컨텍스트 메뉴 이벤트
  bindContextMenuEvents();
  
  console.log("🔗 이벤트 리스너 등록 완료");
}

/**************************************
 * ===== 사용자 시트 로드 =====
 **************************************/

async function loadUserSheetsForStatusBar() {
  if (!currentUser) return;

  try {
    console.log("📋 상태바용 사용자 시트 로드 중...");
    
    const response = await fetch("/api/user-sheets", {
      headers: { "X-User": currentUser }
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const data = await response.json();
    USER_SHEETS_FOR_STATUS_BAR = data.sheets || [];
    
    console.log(`📋 상태바용 사용자 시트 ${USER_SHEETS_FOR_STATUS_BAR.length}개 로드됨`);
    
    // 가로 버튼 업데이트
    updateSheetButtons();
    
    // 자동 선택 제거 - 사용자가 직접 선택하도록 함
    
  } catch (error) {
    console.error("❌ 상태바용 사용자 시트 로드 실패:", error);
  }
}

/**************************************
 * ===== 가로 버튼 관리 =====
 **************************************/

function updateSheetButtons() {
  const sheetButtonsContainer = document.querySelector('.sheet-buttons');
  if (!sheetButtonsContainer) return;
  
  if (USER_SHEETS_FOR_STATUS_BAR.length === 0) {
    sheetButtonsContainer.innerHTML = `
      <button class="sheet-button add-new" onclick="showAddUserSheetModalFromStatusBar()">
        + 새 매물장 추가
      </button>
    `;
    return;
  }
  
  const sheetButtons = USER_SHEETS_FOR_STATUS_BAR.map(sheet => {
    const isSelected = CURRENT_SELECTED_SHEET && CURRENT_SELECTED_SHEET.id === sheet.id;
    const tooltip = isSelected 
      ? `${escapeHtml(sheet.sheet_name)} (선택됨 - 다시 클릭하면 선택 해제)`
      : `${escapeHtml(sheet.sheet_name)} (클릭하여 선택)`;
    
    return `
      <button class="sheet-button ${isSelected ? 'selected' : ''}" 
              onclick="selectSheet('${sheet.id}')" title="${tooltip}">
        ${escapeHtml(sheet.sheet_name)}
      </button>
    `;
  }).join('');
  
  sheetButtonsContainer.innerHTML = sheetButtons + `
    <button class="sheet-button add-new" onclick="showAddUserSheetModalFromStatusBar()">
      + 새 매물장 추가
    </button>
  `;
  
  // "선택된 시트 열기" 버튼 상태 업데이트
  updateOpenSheetButton();
  
  // 각 버튼에 우클릭 이벤트 추가
  bindSheetButtonContextMenus();
}

function selectSheet(sheetId) {
  const sheet = USER_SHEETS_FOR_STATUS_BAR.find(s => s.id === sheetId);
  if (!sheet) return;
  
  // 같은 시트를 다시 클릭한 경우: 선택 해제
  if (CURRENT_SELECTED_SHEET && CURRENT_SELECTED_SHEET.id === sheetId) {
    const deselectedName = CURRENT_SELECTED_SHEET.sheet_name;
    console.log(`🔄 선택 해제: ${deselectedName}`);
    CURRENT_SELECTED_SHEET = null;
    updateSheetButtons();
    
    // 선택 해제 피드백 (콘솔에 표시)
    console.log(`📋 선택 해제됨: ${deselectedName} - 이제 아무 시트도 선택되지 않음`);
    return;
  }
  
  // 다른 시트를 클릭한 경우: 새로 선택
  if (CURRENT_SELECTED_SHEET) {
    console.log(`🔄 이전 선택 해제: ${CURRENT_SELECTED_SHEET.sheet_name}`);
  }
  
  CURRENT_SELECTED_SHEET = sheet;
  console.log(`✅ 매물장 선택됨: ${sheet.sheet_name}`);
  
  // 버튼 상태 즉시 업데이트
  updateSheetButtons();
  
  // 선택된 시트 정보를 콘솔에 표시
  console.log(`📋 현재 선택된 시트: ${sheet.sheet_name} (${sheet.sheet_url})`);
}

function updateSelectedSheetDisplay() {
  // 가로 버튼 방식에서는 updateSheetButtons()로 처리
  updateSheetButtons();
}

function updateOpenSheetButton() {
  const openSheetBtn = document.getElementById('openGoogleSheetBtn');
  if (!openSheetBtn) return;
  
  if (CURRENT_SELECTED_SHEET) {
    openSheetBtn.disabled = false;
    openSheetBtn.classList.remove('disabled');
    openSheetBtn.title = `선택된 매물장: ${CURRENT_SELECTED_SHEET.sheet_name}`;
  } else {
    openSheetBtn.disabled = true;
    openSheetBtn.classList.add('disabled');
    openSheetBtn.title = '먼저 매물장을 선택해주세요';
  }
}

function bindSheetButtonContextMenus() {
  const sheetButtons = document.querySelectorAll('.sheet-button:not(.add-new)');
  sheetButtons.forEach(button => {
    button.addEventListener('contextmenu', handleSheetButtonRightClick);
  });
}

function handleSheetButtonRightClick(event) {
  event.preventDefault();
  console.log("🖱️ 우클릭 이벤트 발생!");
  
  const button = event.currentTarget;
  console.log("🔘 우클릭된 버튼:", button);
  
  const sheetId = button.getAttribute('onclick')?.match(/selectSheet\('([^']+)'\)/)?.[1];
  console.log("🆔 추출된 시트 ID:", sheetId);
  
  if (!sheetId) {
    console.error("❌ 시트 ID를 찾을 수 없습니다");
    return;
  }
  
  const sheet = USER_SHEETS_FOR_STATUS_BAR.find(s => s.id === sheetId);
  if (!sheet) {
    console.error("❌ 시트 정보를 찾을 수 없습니다");
    return;
  }
  
  console.log("✅ 시트 정보 확인됨:", sheet.sheet_name);
  
  // 컨텍스트 메뉴 표시
  showContextMenu(event.clientX, event.clientY, sheet);
}

function showContextMenu(x, y, sheet) {
  console.log("🎯 컨텍스트 메뉴 표시 시작");
  console.log("📍 위치:", x, y);
  
  const contextMenu = document.getElementById('contextMenu');
  if (!contextMenu) {
    console.error("❌ 컨텍스트 메뉴 요소를 찾을 수 없습니다");
    return;
  }
  
  console.log("✅ 컨텍스트 메뉴 요소 찾음:", contextMenu);
  
  // 메뉴 위치 설정
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  
  // 현재 시트 정보 저장
  contextMenu.dataset.sheetId = sheet.id;
  
  // 메뉴 표시
  contextMenu.classList.add('show');
  console.log("🎨 컨텍스트 메뉴 표시됨 (show 클래스 추가)");
  
  // 메뉴 상태 확인
  console.log("🔍 메뉴 스타일:", {
    display: contextMenu.style.display,
    left: contextMenu.style.left,
    top: contextMenu.style.top,
    zIndex: contextMenu.style.zIndex,
    classes: contextMenu.className
  });
  
  // 외부 클릭 시 메뉴 숨김
  setTimeout(() => {
    document.addEventListener('click', hideContextMenu, { once: true });
  }, 100);
}

function hideContextMenu() {
  const contextMenu = document.getElementById('contextMenu');
  if (contextMenu) {
    contextMenu.classList.remove('show');
  }
}

function bindContextMenuEvents() {
  const contextMenu = document.getElementById('contextMenu');
  if (!contextMenu) {
    console.error("❌ 컨텍스트 메뉴 요소를 찾을 수 없습니다!");
    return;
  }
  
  console.log("✅ 컨텍스트 메뉴 이벤트 바인딩 시작:", contextMenu);
  
  // 메뉴 아이템 클릭 이벤트
  contextMenu.addEventListener('click', handleContextMenuClick);
  

}

function handleContextMenuClick(event) {
  const menuItem = event.target.closest('.context-menu-item');
  if (!menuItem) return;
  
  const action = menuItem.dataset.action;
  const sheetId = event.currentTarget.dataset.sheetId;
  
  if (!sheetId) return;
  
  const sheet = USER_SHEETS_FOR_STATUS_BAR.find(s => s.id === sheetId);
  if (!sheet) return;
  
  hideContextMenu();
  
  switch (action) {
    case 'edit':
      editSheetFromContextMenu(sheet);
      break;
    case 'delete':
      deleteSheetFromContextMenu(sheet);
      break;
  }
}

function editSheetFromContextMenu(sheet) {
  console.log(`✏️ 매물장 수정 시작: ${sheet.sheet_name}`);
  
  // user-sheets.js의 수정 모달을 기본값으로 열기
  if (typeof showEditUserSheetModal === 'function') {
    console.log(`✅ showEditUserSheetModal 함수 호출: ${sheet.id}`);
    showEditUserSheetModal(sheet.id); // sheet.id를 전달
  } else {
    console.error('showEditUserSheetModal 함수를 찾을 수 없습니다.');
    alert('매물장 수정 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
  }
}

function deleteSheetFromContextMenu(sheet) {
  console.log(`🗑️ 매물장 삭제 확인: ${sheet.sheet_name}`);
  
  if (confirm(`정말로 "${sheet.sheet_name}" 매물장을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
    deleteSheetFromStatusBar(sheet);
  }
}

async function deleteSheetFromStatusBar(sheet) {
  try {
    console.log(`🗑️ 매물장 삭제 진행: ${sheet.sheet_name}`);
    
    const response = await fetch(`/api/user-sheets/${sheet.id}`, {
      method: "DELETE",
      headers: { "X-User": currentUser }
    });
    
    if (!response.ok) {
      throw new Error(`삭제 실패: ${response.status}`);
    }
    
    console.log(`✅ 매물장 삭제 성공: ${sheet.sheet_name}`);
    
    // 현재 선택된 시트가 삭제된 시트인 경우 선택 해제
    if (CURRENT_SELECTED_SHEET && CURRENT_SELECTED_SHEET.id === sheet.id) {
      CURRENT_SELECTED_SHEET = null;
    }
    
    // 상태바 새로고침
    await loadUserSheetsForStatusBar();
    
    // 성공 메시지
    alert(`"${sheet.sheet_name}" 매물장이 삭제되었습니다.`);
    
  } catch (error) {
    console.error("❌ 매물장 삭제 실패:", error);
    alert(`매물장 삭제에 실패했습니다: ${error.message}`);
  }
}

/**************************************
 * ===== 구글 시트 열기 =====
 **************************************/

function openSelectedGoogleSheet() {
  if (!CURRENT_SELECTED_SHEET) {
    alert('먼저 매물장을 선택해주세요.\n\n매물장 버튼을 클릭하여 원하는 시트를 선택한 후 다시 시도해주세요.');
    return;
  }
  
  if (!CURRENT_SELECTED_SHEET.sheet_url) {
    alert('선택된 매물장의 URL이 없습니다.');
    return;
  }
  
  try {
    window.open(CURRENT_SELECTED_SHEET.sheet_url, '_blank');
    console.log(`✅ 선택된 매물장 열기: ${CURRENT_SELECTED_SHEET.sheet_name}`);
  } catch (error) {
    console.error(`❌ 구글 시트 열기 실패: ${CURRENT_SELECTED_SHEET.sheet_name}`, error);
    alert('구글 시트를 열 수 없습니다.');
  }
}

/**************************************
 * ===== 외부 함수 연동 =====
 **************************************/

// 새 매물장 추가 후 드롭다운 새로고침
function refreshStatusBarSheets() {
  loadUserSheetsForStatusBar();
}

// 상태바에서 매물장 추가 모달 표시
function showAddUserSheetModalFromStatusBar() {
  // user-sheets.js의 모달 표시 함수 호출
  if (typeof showAddUserSheetModal === 'function') {
    showAddUserSheetModal();
  } else {
    console.error('showAddUserSheetModal 함수를 찾을 수 없습니다.');
    alert('매물장 추가 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
  }
}

/**************************************
 * ===== 유틸리티 함수 =====
 **************************************/

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**************************************
 * ===== 모듈 내보내기 =====
 **************************************/

// 전역 함수로 노출
window.initStatusBarSheets = initStatusBarSheets;
window.refreshStatusBarSheets = refreshStatusBarSheets;
window.selectSheet = selectSheet;
window.showAddUserSheetModalFromStatusBar = showAddUserSheetModalFromStatusBar;
window.openSelectedGoogleSheet = openSelectedGoogleSheet;
window.editSheetFromContextMenu = editSheetFromContextMenu;
window.deleteSheetFromContextMenu = deleteSheetFromContextMenu;
window.deleteSheetFromStatusBar = deleteSheetFromStatusBar;

// 디버깅용 함수들
window.debugStatusBarSheets = function() {
  console.log("🔍 상태바 시트 디버깅 시작");
  // 보안 강화: 사용자 정보 로깅 제거
  // console.log("currentUser:", currentUser);
  console.log("USER_SHEETS_FOR_STATUS_BAR:", USER_SHEETS_FOR_STATUS_BAR);
  console.log("CURRENT_SELECTED_SHEET:", CURRENT_SELECTED_SHEET);
  
  const sheetButtons = document.querySelector('.sheet-buttons');
  const openSheetBtn = document.getElementById('openGoogleSheetBtn');
  
  console.log("DOM 요소들:");
  console.log("  - .sheet-buttons:", sheetButtons);
  console.log("  - #openGoogleSheetBtn:", openSheetBtn);
  
  if (sheetButtons) {
    console.log("시트 버튼 내용:", sheetButtons.innerHTML);
    console.log("시트 버튼 수:", sheetButtons.children.length);
  }
};

window.testButtons = function() {
  console.log("🧪 가로 버튼 테스트 시작");
  updateSheetButtons();
};
