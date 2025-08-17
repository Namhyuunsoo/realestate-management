/* -----------------------------------------
 * user-sheets.js - 사용자별 개별매물장 관리 UI
 * ----------------------------------------- */

/**************************************
 * ===== 전역 변수 =====
 **************************************/

let USER_SHEETS = [];
let CURRENT_USER_SHEET = null;

/**************************************
 * ===== 초기화 =====
 **************************************/

function initUserSheets() {
  console.log("🔧 사용자별 개별매물장 UI 초기화 시작");
  
  // 이벤트 리스너 등록
  bindUserSheetEvents();
  
  // 사용자 시트 로드
  loadUserSheets();
  
  console.log("✅ 사용자별 개별매물장 UI 초기화 완료");
}

function bindUserSheetEvents() {
  // 새 매물장 추가 버튼
  const addBtn = document.getElementById("addUserSheetBtn");
  if (addBtn) {
    addBtn.addEventListener("click", showAddUserSheetModal);
  }
}

/**************************************
 * ===== 사용자 시트 로드 =====
 **************************************/

async function loadUserSheets() {
  if (!currentUser) return;

  try {
    console.log("📋 사용자 시트 로드 중...");
    
    const response = await fetch("/api/user-sheets", {
      headers: { "X-User": currentUser }
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const data = await response.json();
    USER_SHEETS = data.sheets || [];
    
    console.log(`📋 사용자 시트 ${USER_SHEETS.length}개 로드됨`);
    
    // UI 업데이트
    renderUserSheetList();
    updateUserSheetStatistics(data.statistics);
    
  } catch (error) {
    console.error("❌ 사용자 시트 로드 실패:", error);
    showError("사용자 시트를 불러올 수 없습니다.");
  }
}

/**************************************
 * ===== UI 렌더링 =====
 **************************************/

function renderUserSheetList() {
  const container = document.getElementById("userSheetList");
  if (!container) return;
  
  if (USER_SHEETS.length === 0) {
    container.innerHTML = `
      <div class="no-sheets">
        <p>연결된 매물장이 없습니다.</p>
        <p>새 매물장을 추가하여 시작하세요.</p>
      </div>
    `;
    return;
  }
  
  const html = USER_SHEETS.map(sheet => createUserSheetHTML(sheet)).join("");
  container.innerHTML = html;
  
  // 각 시트에 이벤트 리스너 추가
  USER_SHEETS.forEach(sheet => {
    bindUserSheetItemEvents(sheet.id);
  });
}

function createUserSheetHTML(sheet) {
  const statusClass = sheet.is_active ? "active" : "inactive";
  const syncStatusClass = sheet.sync_enabled ? "sync-enabled" : "sync-disabled";
  const lastSync = sheet.last_sync_at ? formatDateTime(sheet.last_sync_at) : "동기화 안됨";
  const apiType = sheet.get_api_type ? sheet.get_api_type() : "default";
  const apiTypeDisplay = {
    "api_key": "🔑 API 키",
    "service_account": "🔐 서비스어카운트",
    "default": "⚙️ 시스템 기본"
  }[apiType] || "⚙️ 시스템 기본";
  
  return `
    <div class="user-sheet-item ${statusClass}" data-sheet-id="${sheet.id}">
      <div class="sheet-header">
        <div class="sheet-info">
          <h4 class="sheet-name">${escapeHtml(sheet.sheet_name)}</h4>
          <span class="sheet-status ${statusClass}">
            ${sheet.is_active ? "활성" : "비활성"}
          </span>
        </div>
        <div class="sheet-actions">
          <button class="btn-toggle-active" data-sheet-id="${sheet.id}" title="활성화/비활성화">
            ${sheet.is_active ? "🔴" : "🟢"}
          </button>
          <button class="btn-toggle-sync" data-sheet-id="${sheet.id}" title="동기화 설정">
            ${sheet.sync_enabled ? "🔄" : "⏸️"}
          </button>
          <button class="btn-edit" data-sheet-id="${sheet.id}" title="편집">✏️</button>
          <button class="btn-delete" data-sheet-id="${sheet.id}" title="삭제">🗑️</button>
        </div>
      </div>
      
      <div class="sheet-details">
        <div class="sheet-url">
          <a href="${sheet.sheet_url}" target="_blank" title="구글 시트 열기">
            📊 구글 시트 열기
          </a>
        </div>
        <div class="sync-info">
          <span class="sync-status ${syncStatusClass}">
            동기화: ${sheet.sync_enabled ? "활성" : "비활성"}
          </span>
          <span class="last-sync">마지막: ${lastSync}</span>
        </div>
      </div>
      
      <div class="sheet-settings">
        <span class="sync-interval">동기화 간격: ${formatSyncInterval(sheet.sync_interval)}</span>
        <span class="custom-fields">사용자 필드: ${Object.keys(sheet.custom_fields).length}개</span>
        <span class="api-type">${apiTypeDisplay}</span>
      </div>
    </div>
  `;
}

function updateUserSheetStatistics(statistics) {
  // 통계 정보를 헤더에 표시
  const header = document.querySelector(".user-sheet-header h3");
  if (header && statistics) {
    const total = statistics.total_sheets || 0;
    const active = statistics.active_sheets || 0;
    const personalApi = statistics.personal_api_sheets || 0;
    
    let headerText = `내 매물장 (${active}/${total})`;
    if (personalApi > 0) {
      headerText += ` | 개인 API: ${personalApi}개`;
    }
    
    header.textContent = headerText;
  }
}

/**************************************
 * ===== 이벤트 처리 =====
 **************************************/

function bindUserSheetItemEvents(sheetId) {
  const sheetElement = document.querySelector(`[data-sheet-id="${sheetId}"]`);
  if (!sheetElement) return;
  
  // 활성화/비활성화 토글
  const toggleActiveBtn = sheetElement.querySelector(".btn-toggle-active");
  if (toggleActiveBtn) {
    toggleActiveBtn.addEventListener("click", () => toggleSheetActive(sheetId));
  }
  
  // 동기화 활성화/비활성화 토글
  const toggleSyncBtn = sheetElement.querySelector(".btn-toggle-sync");
  if (toggleSyncBtn) {
    toggleSyncBtn.addEventListener("click", () => toggleSheetSync(sheetId));
  }
  
  // 편집 버튼
  const editBtn = sheetElement.querySelector(".btn-edit");
  if (editBtn) {
    editBtn.addEventListener("click", () => showEditUserSheetModal(sheetId));
  }
  
  // 삭제 버튼
  const deleteBtn = sheetElement.querySelector(".btn-delete");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => confirmDeleteUserSheet(sheetId));
  }
}

async function toggleSheetActive(sheetId) {
  try {
    const response = await fetch(`/api/user-sheets/${sheetId}/toggle-active`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-User": currentUser 
      }
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const data = await response.json();
    showSuccess(data.message);
    
    // 시트 목록 새로고침
    await loadUserSheets();
    
    // 상태바 매물장 컨트롤도 새로고침
    if (typeof refreshStatusBarSheets === 'function') {
      await refreshStatusBarSheets();
    }
    
  } catch (error) {
    console.error("❌ 시트 활성화/비활성화 실패:", error);
    showError("시트 상태 변경에 실패했습니다.");
  }
}

async function toggleSheetSync(sheetId) {
  try {
    const response = await fetch(`/api/user-sheets/${sheetId}/toggle-sync`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-User": currentUser 
      }
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const data = await response.json();
    showSuccess(data.message);
    
    // 시트 목록 새로고침
    await loadUserSheets();
    
    // 상태바 매물장 컨트롤도 새로고침
    if (typeof refreshStatusBarSheets === 'function') {
      await refreshStatusBarSheets();
    }
    
  } catch (error) {
    console.error("❌ 동기화 활성화/비활성화 실패:", error);
    showError("동기화 설정 변경에 실패했습니다.");
  }
}

/**************************************
 * ===== 모달 관리 =====
 **************************************/

function showAddUserSheetModal() {
  const modal = createUserSheetModal("새 매물장 추가", null);
  document.body.appendChild(modal);
  
  // 모달 표시
  setTimeout(() => modal.classList.add("show"), 10);
}

function showEditUserSheetModal(sheetId) {
  const sheet = USER_SHEETS.find(s => s.id === sheetId);
  if (!sheet) return;
  
  const modal = createUserSheetModal("매물장 편집", sheet);
  document.body.appendChild(modal);
  
  // 모달 표시
  setTimeout(() => modal.classList.add("show"), 10);
}

function createUserSheetModal(title, sheet) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <form id="userSheetForm">
          <div class="form-group">
            <label for="sheetName">매물장 이름 *</label>
            <input type="text" id="sheetName" name="sheet_name" required 
                   value="${sheet ? escapeHtml(sheet.sheet_name) : ''}" 
                   placeholder="예: 강남구 매물장">
          </div>
          
          <div class="form-group">
            <label for="sheetUrl">구글 시트 URL *</label>
            <input type="url" id="sheetUrl" name="sheet_url" required 
                   value="${sheet ? escapeHtml(sheet.sheet_url) : ''}" 
                   placeholder="https://docs.google.com/spreadsheets/d/...">
            <small>구글 시트의 공유 링크를 입력하세요</small>
          </div>
          

          
          <div class="form-group">
            <label for="googleApiKey">구글 API 키 *</label>
            <input type="password" id="googleApiKey" name="google_api_key" 
                   value="${sheet ? escapeHtml(sheet.google_api_key || '') : ''}" 
                   placeholder="개인 API 키를 입력하세요" required>
            <small>구글 스프레드시트에 접근하기 위한 API 키입니다</small>
          </div>
          
          <div class="form-group">
            <label for="serviceAccount">서비스어카운트 JSON *</label>
            <textarea id="serviceAccount" name="service_account_json" 
                      placeholder='{"type": "service_account", "project_id": "...", ...}'
                      rows="4" required>${sheet ? escapeHtml(sheet.service_account_json || '') : ''}</textarea>
            <small>개인 서비스어카운트 정보를 입력하세요</small>
          </div>
          
          <div class="form-group">
            <button type="button" id="testApiBtn" class="btn-secondary">
              🔍 API 연결 테스트
            </button>
            <small>API 키가 올바르게 설정되었는지 테스트합니다</small>
          </div>

          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
              취소
            </button>
            <button type="submit" class="btn-primary">
              ${sheet ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // 폼 제출 이벤트
  const form = modal.querySelector("#userSheetForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleUserSheetSubmit(sheet?.id);
  });
  

  
  // API 테스트 버튼 이벤트
  const testApiBtn = modal.querySelector("#testApiBtn");
  if (testApiBtn) {
    testApiBtn.addEventListener("click", () => {
      testApiConnection(sheet?.id);
    });
  }
  
  return modal;
}

async function handleUserSheetSubmit(sheetId = null) {
  const form = document.getElementById("userSheetForm");
  const formData = new FormData(form);
  

  
  const data = {
    sheet_name: formData.get("sheet_name"),
    sheet_url: formData.get("sheet_url"),
    google_api_key: formData.get("google_api_key"),
    service_account_json: formData.get("service_account_json")
  };
  
  try {
    const url = sheetId ? `/api/user-sheets/${sheetId}` : "/api/user-sheets";
    const method = sheetId ? "PUT" : "POST";
    
    const response = await fetch(url, {
      method: method,
      headers: { 
        "Content-Type": "application/json",
        "X-User": currentUser 
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const result = await response.json();
    showSuccess(result.message);
    
    // 모달 닫기
    document.querySelector(".modal-overlay").remove();
    
    // 시트 목록 새로고침
    await loadUserSheets();
    
    // 상태바 매물장 컨트롤도 새로고침
    if (typeof refreshStatusBarSheets === 'function') {
      await refreshStatusBarSheets();
    }
    
  } catch (error) {
    console.error("❌ 시트 저장 실패:", error);
    showError("시트 저장에 실패했습니다.");
  }
}

async function testApiConnection(sheetId) {
  if (!sheetId) {
    showError("먼저 시트를 저장한 후 API 테스트를 진행하세요.");
    return;
  }
  
  try {
    const testBtn = document.getElementById("testApiBtn");
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.textContent = "🔍 테스트 중...";
    }
    
    const response = await fetch(`/api/user-sheets/${sheetId}/test-api`, {
      method: "POST",
      headers: { "X-User": currentUser }
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess(`${result.message} - ${result.sheet_title} (${result.api_type})`);
    } else {
      showError(result.error);
    }
    
  } catch (error) {
    console.error("❌ API 테스트 실패:", error);
    showError("API 테스트에 실패했습니다.");
  } finally {
    const testBtn = document.getElementById("testApiBtn");
    if (testBtn) {
      testBtn.disabled = false;
      testBtn.textContent = "🔍 API 연결 테스트";
    }
  }
}

async function confirmDeleteUserSheet(sheetId) {
  const sheet = USER_SHEETS.find(s => s.id === sheetId);
  if (!sheet) return;
  
  if (!confirm(`정말로 "${sheet.sheet_name}" 매물장을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/user-sheets/${sheetId}`, {
      method: "DELETE",
      headers: { "X-User": currentUser }
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const result = await response.json();
    showSuccess(result.message);
    
    // 시트 목록 새로고침
    await loadUserSheets();
    
    // 상태바 매물장 컨트롤도 새로고침
    if (typeof refreshStatusBarSheets === 'function') {
      await refreshStatusBarSheets();
    }
    
  } catch (error) {
    console.error("❌ 시트 삭제 실패:", error);
    showError("시트 삭제에 실패했습니다.");
  }
}

/**************************************
 * ===== 유틸리티 함수 =====
 **************************************/

function formatDateTime(dateString) {
  if (!dateString) return "알 수 없음";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "알 수 없음";
  }
}

function formatSyncInterval(seconds) {
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간`;
  return `${Math.floor(seconds / 86400)}일`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showSuccess(message) {
  // 간단한 성공 메시지 표시
  console.log("✅", message);
  // TODO: 실제 UI에 토스트 메시지 표시
}

function showError(message) {
  // 간단한 에러 메시지 표시
  console.error("❌", message);
  // TODO: 실제 UI에 에러 메시지 표시
}

/**************************************
 * ===== 모듈 내보내기 =====
 **************************************/

// 전역 함수로 노출
window.initUserSheets = initUserSheets;
window.loadUserSheets = loadUserSheets;
window.showAddUserSheetModal = showAddUserSheetModal;
