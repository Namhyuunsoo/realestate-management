/* -----------------------------------------
 * user-management.js - 사용자 관리 UI
 * ----------------------------------------- */

// 전역 변수
let currentUsers = [];
let editingUserId = null;

// 사용자 관리 초기화
async function initUserManagement() {
  console.log('🔍 initUserManagement 시작, currentUser:', currentUser);
  
  // 어드민 권한 확인
  if (!currentUser) {
    console.log('❌ currentUser가 없음');
    return;
  }

  // 서버에서 사용자 정보 가져오기
  try {
    console.log('🔍 /api/me 요청 시작...');
    const response = await fetch('/api/me', {
      headers: {
        'X-User': currentUser
      }
    });

    console.log('🔍 /api/me 응답 상태:', response.status);
    
    if (response.ok) {
      const userInfo = await response.json();
      console.log('🔍 사용자 정보:', userInfo);
      window.currentUserInfo = userInfo;
      
      if (userInfo.is_admin) {
        // 어드민 UI 표시 (모든 기능)
        showAdminUI(true);
        
        // 이벤트 리스너 등록
        setupUserManagementEvents();
        console.log('✅ 어드민 사용자 관리 기능 초기화 완료');
      } else if (userInfo.role === 'manager') {
        // 매니저 UI 표시 (사용자관리/통계 제외)
        showAdminUI(false);
        
        // 이벤트 리스너 등록
        setupUserManagementEvents();
        console.log('✅ 매니저 사용자 관리 기능 초기화 완료');
      } else {
        console.log('ℹ️ 일반 사용자 - 사용자 관리 기능 비활성화');
      }
    } else {
      console.log('ℹ️ 사용자 정보를 가져올 수 없음 - 사용자 관리 기능 비활성화');
    }
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
  }
}

// 어드민 UI 표시
function showAdminUI(showAllFeatures = true) {
  
  const adminElements = document.querySelectorAll('.admin-only');
  
  
  adminElements.forEach((element, index) => {
    console.log(`🔍 요소 ${index}:`, element.className);
    
    if (showAllFeatures) {
      // 어드민: 모든 기능 표시
      element.classList.remove('hidden');
      element.classList.add('show');
    } else {
      // 매니저: 사용자관리/통계 버튼만 숨김
      const userManagementBtn = element.querySelector('#userManagementBtn');
      const adminStatsBtn = element.querySelector('#adminStatsBtn');
      
      if (userManagementBtn || adminStatsBtn) {
        // 사용자관리/통계 버튼은 숨김
        element.classList.add('hidden');
        element.classList.remove('show');
      } else {
        // 다른 기능들은 표시
        element.classList.remove('hidden');
        element.classList.add('show');
      }
    }
  });
  
  console.log('✅ showAdminUI 완료');
}

// 사용자 관리 이벤트 설정
function setupUserManagementEvents() {
  // 사용자 관리 버튼 클릭 (어드민만)
  const userManagementBtn = document.getElementById('userManagementBtn');
  if (userManagementBtn && window.currentUserInfo && 
      (window.currentUserInfo.is_admin || window.currentUserInfo.role === 'admin')) {
    userManagementBtn.addEventListener('click', openUserManagementModal);
    console.log('✅ 사용자 관리 버튼 이벤트 리스너 등록 완료');
  } else {
    console.log('⚠️ 사용자 관리 버튼 이벤트 리스너 등록 건너뜀 (권한 없음)');
  }

  // 모달 닫기 버튼들
  // 사용자 수정 모달 닫기 버튼은 해당 모달만 닫도록 처리
  const formCloseBtn = document.querySelector('#userFormModal .modal-close-btn');
  if (formCloseBtn) formCloseBtn.addEventListener('click', () => closeModalById('userFormModal'));
  const formCancelBtn = document.getElementById('userFormCancelBtn');
  if (formCancelBtn) formCancelBtn.addEventListener('click', () => closeModalById('userFormModal'));
  // 나머지 모달 닫기 버튼은 공통 처리 유지
  const otherCloseBtns = Array.from(document.querySelectorAll('.modal-close-btn'))
    .filter(btn => !btn.closest('#userFormModal'));
  otherCloseBtns.forEach(btn => btn.addEventListener('click', closeAllModals));

  // 정책 변경으로 새 사용자 추가 버튼 제거됨

  // 사용자 폼 제출
  const userForm = document.getElementById('userForm');
  if (userForm) {
    userForm.addEventListener('submit', handleUserFormSubmit);
  }

  // 비밀번호 재설정 버튼
  const resetPasswordBtn = document.getElementById('resetPasswordBtn');
  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener('click', handlePasswordReset);
  }

  // 모달 외부 클릭 시 닫기
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });
}

// 사용자 관리 모달 열기
async function openUserManagementModal() {
  try {
    console.log('🔍 사용자 관리 모달 열기...');
    
    // 어드민 권한 확인
    if (!window.currentUserInfo || !window.currentUserInfo.is_admin) {
      showToast('사용자 관리 권한이 없습니다.', 'error');
      return;
    }
    
    // 모달 표시
    const modal = document.getElementById('userManagementModal');
    if (modal) {
      modal.classList.remove('hidden');
      
      // JavaScript로 모달 크기 강제 변경 - 더 강력하게
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        // 모달 컨텐츠 크기 변경
        modalContent.style.width = '95vw';
        modalContent.style.maxWidth = '2000px';
        modalContent.style.minWidth = '1800px';
        modalContent.style.maxHeight = 'none';
        
        // 모달 자체도 크기 변경
        modal.style.width = '95vw';
        modal.style.maxWidth = '2000px';
        modal.style.minWidth = '1800px';
        
        // 테이블 컨테이너도 확장
        const tableContainer = modal.querySelector('.table-container');
        if (tableContainer) {
          tableContainer.style.width = '100%';
          tableContainer.style.overflowX = 'hidden';
        }
        
        console.log('✅ 모달 크기 강제 변경 완료');
      }
      
      // 사용자 목록 로드
      await loadUserList();
    }
    
  } catch (error) {
    console.error('❌ 사용자 관리 모달 열기 실패:', error);
    showToast('사용자 관리 모달을 열 수 없습니다.', 'error');
  }
}

// 사용자 목록 로드
async function loadUserList() {
  try {
    const response = await fetch('/api/admin/users');
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
      } else if (response.status === 403) {
        throw new Error('관리자 권한이 필요합니다.');
      } else {
        throw new Error(`API 실패: ${response.status}`);
      }
    }
    
    const data = await response.json();
    const users = data.users || [];
    
    // 전역 변수 업데이트
    currentUsers = users;
    
    // 사용자 목록 테이블 업데이트
    const tbody = document.getElementById('userListTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    users.forEach(user => {
      const row = document.createElement('tr');
      
      // 직책 수정 기능이 포함된 행 생성
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.email}</td>
        <td>${user.name}</td>
        <td>
          <div class="job-title-edit" data-user-id="${user.id}">
            <div class="job-title-display" style="display: ${user.job_title ? 'inline-block' : 'none'}">
              ${user.job_title || ''}
            </div>
            <input type="text" class="job-title-input" value="${user.job_title || ''}" 
                   placeholder="직책 입력" style="display: ${user.job_title ? 'none' : 'inline-block'}">
            <button class="job-title-edit-btn" onclick="editJobTitle('${user.id}')" 
                    style="display: ${user.job_title ? 'inline-block' : 'none'}">수정</button>
            <button class="job-title-save-btn" onclick="saveJobTitle('${user.id}')" 
                    style="display: ${user.job_title ? 'none' : 'inline-block'}">저장</button>
          </div>
        </td>
        <td>${getRoleDisplayName(user.role)}</td>
        <td>
          <div class="manager-name-edit" data-user-id="${user.id}">
            <div class="manager-name-display" style="display: ${user.manager_name ? 'inline-block' : 'none'}">
              ${user.manager_name || ''}
            </div>
            <input type="text" class="manager-name-input" value="${user.manager_name || ''}" 
                   placeholder="담당자명 입력" style="display: ${user.manager_name ? 'none' : 'inline-block'}">
            <button class="manager-name-edit-btn" onclick="editManagerName('${user.id}')" 
                    style="display: ${user.manager_name ? 'inline-block' : 'none'}">수정</button>
            <button class="manager-name-save-btn" onclick="saveManagerName('${user.id}')" 
                    style="display: ${user.manager_name ? 'none' : 'inline-block'}">저장</button>
          </div>
        </td>
        <td>
          <span class="status-badge ${user.status}">${getStatusText(user.status)}</span>
        </td>
        <td>${formatDate(user.created_at)}</td>
        <td>
          <button class="btn-sheet-url" onclick="openSheetUrlModal('${user.id}', '${user.email}')">
            ${user.sheet_url ? '📝 수정' : '➕ 지정'}
          </button>
        </td>
        <td>
          <div class="user-actions">
            ${getUserActionButtons(user)}
          </div>
        </td>
      `;
      
      tbody.appendChild(row);
    });
    
    console.log(`✅ 사용자 목록 로드 완료: ${users.length}명`);
    
  } catch (error) {
    console.error('❌ 사용자 목록 로드 실패:', error);
    showToast(error.message || '사용자 목록을 불러올 수 없습니다.', 'error');
    
    // 에러 발생 시 모달 닫기
    const modal = document.getElementById('userManagementModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
}

// 직책 수정 모드로 전환
function editJobTitle(userId) {
  const container = document.querySelector(`[data-user-id="${userId}"]`);
  if (!container) return;
  
  const display = container.querySelector('.job-title-display');
  const input = container.querySelector('.job-title-input');
  const editBtn = container.querySelector('.job-title-edit-btn');
  const saveBtn = container.querySelector('.job-title-save-btn');
  
  if (display && input && editBtn && saveBtn) {
    display.style.display = 'none';
    input.style.display = 'inline-block';
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    
    // 입력 필드에 포커스
    input.focus();
    input.select();
  }
}

// 직책 저장
async function saveJobTitle(userId) {
  const container = document.querySelector(`[data-user-id="${userId}"]`);
  if (!container) return;
  
  const input = container.querySelector('.job-title-input');
  const jobTitle = input.value.trim();
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/update-job-title`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ job_title: jobTitle })
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 성공 시 UI 업데이트
    const display = container.querySelector('.job-title-display');
    const editBtn = container.querySelector('.job-title-edit-btn');
    const saveBtn = container.querySelector('.job-title-save-btn');
    
    if (display && editBtn && saveBtn) {
      display.textContent = jobTitle;
      display.style.display = 'inline-block';
      input.style.display = 'none';
      editBtn.style.display = 'inline-block';
      saveBtn.style.display = 'none';
    }
    
    showToast('직책이 변경되었습니다.', 'success');
    
    // 상단바 사용자 정보 업데이트 (현재 사용자인 경우)
    updateTopBarUserInfo();
    
  } catch (error) {
    console.error('❌ 직책 변경 실패:', error);
    showToast('직책 변경에 실패했습니다.', 'error');
  }
}

// 담당자명 수정 모드로 전환
function editManagerName(userId) {
  const container = document.querySelector(`[data-user-id="${userId}"]`);
  if (!container) return;
  
  const display = container.querySelector('.manager-name-display');
  const input = container.querySelector('.manager-name-input');
  const editBtn = container.querySelector('.manager-name-edit-btn');
  const saveBtn = container.querySelector('.manager-name-save-btn');
  
  if (display && input && editBtn && saveBtn) {
    display.style.display = 'none';
    input.style.display = 'inline-block';
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    
    // 입력 필드에 포커스
    input.focus();
    input.select();
  }
}

// 담당자명 저장
async function saveManagerName(userId) {
  const container = document.querySelector(`[data-user-id="${userId}"]`);
  if (!container) return;
  
  const input = container.querySelector('.manager-name-input');
  if (!input) {
    console.error('담당자명 입력 필드를 찾을 수 없습니다.');
    showToast('담당자명 입력 필드를 찾을 수 없습니다.', 'error');
    return;
  }
  const managerName = input.value.trim();
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/update-manager-name`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ manager_name: managerName })
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 성공 시 UI 업데이트
    const display = container.querySelector('.manager-name-display');
    const editBtn = container.querySelector('.manager-name-edit-btn');
    const saveBtn = container.querySelector('.manager-name-save-btn');
    
    if (display && editBtn && saveBtn) {
      display.textContent = managerName;
      display.style.display = 'inline-block';
      input.style.display = 'none';
      editBtn.style.display = 'inline-block';
      saveBtn.style.display = 'none';
    }
    
    showToast('담당자명이 변경되었습니다.', 'success');
    
  } catch (error) {
    console.error('❌ 담당자명 변경 실패:', error);
    showToast('담당자명 변경에 실패했습니다.', 'error');
  }
}

// 상단바 사용자 정보 업데이트
function updateTopBarUserInfo() {
  const userRoleNameEl = document.getElementById('userRoleName');
  if (userRoleNameEl) {
    // 세션 기반으로 현재 사용자 정보 가져오기
    fetch('/api/auth/me')
    .then(response => response.json())
    .then(user => {
      if (user.job_title) {
        userRoleNameEl.textContent = `${user.job_title} ${user.name}`;
      } else {
        userRoleNameEl.textContent = user.name;
      }
    })
    .catch(error => {
      console.error('사용자 정보 업데이트 실패:', error);
    });
  }
}

// 사용자 목록 렌더링
function renderUserList(users) {
  const tbody = document.getElementById('userListTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">등록된 사용자가 없습니다.</td></tr>';
    return;
  }

  users.forEach(user => {
    const row = document.createElement('tr');
    const escapedId = String(user.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.name)}</td>
      <td>${getRoleDisplayName(user.role)}</td>
      <td>
        <span class="status-${user.is_active ? 'active' : 'inactive'}">
          ${user.is_active ? '활성' : '비활성'}
        </span>
      </td>
      <td>${formatDate(user.created_at)}</td>
      <td class="user-actions">
        <button class="action-btn edit" onclick="editUser('${escapedId}')">수정</button>
        <button class="action-btn delete" onclick="deleteUser('${escapedId}')">삭제</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 역할 표시명 반환
function getRoleDisplayName(role) {
  const roleMap = {
    'admin': '관리자',
    'manager': '매니저',
    'user': '일반사용자'
  };
  return roleMap[role] || role;
}

// 상태 텍스트 변환
function getStatusText(status) {
  const statusMap = {
    'pending': '승인대기',
    'approved': '승인됨',
    'rejected': '거부됨',
    'inactive': '비활성'
  };
  return statusMap[status] || status;
}

// 날짜 포맷팅
function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('ko-KR');
}

// 사용자 작업 버튼 생성
function getUserActionButtons(user) {
  const buttons = [];
  
  if (user.status === 'pending') {
    buttons.push(`<button class="user-action-btn approve" onclick="approveUser('${user.id}')">승인</button>`);
    buttons.push(`<button class="user-action-btn reject" onclick="rejectUser('${user.id}')">거부</button>`);
  } else if (user.status === 'approved') {
    buttons.push(`<button class="user-action-btn deactivate" onclick="deactivateUser('${user.id}')">비활성화</button>`);
  }
  
  buttons.push(`<button class="user-action-btn reset-password" onclick="resetUserPassword('${user.id}')">비밀번호 재설정</button>`);
  buttons.push(`<button class="user-action-btn edit-role" onclick="editUserRole('${user.id}')">역할 변경</button>`);
  
  return buttons.join('');
}

// 사용자 수정 모달 열기
async function editUser(userId) {
  const user = currentUsers.find(u => u.id === userId);
  if (!user) {
    showToast('사용자를 찾을 수 없습니다.', 'error');
    return;
  }

  editingUserId = userId;
  openUserFormModal(user);
}

// 사용자 삭제
async function deleteUser(userId) {
  const user = currentUsers.find(u => u.id === userId);
  if (!user) {
    showToast('사용자를 찾을 수 없습니다.', 'error');
    return;
  }

  // 관리자는 삭제할 수 없음
  if (user.role === 'admin') {
    showToast('관리자는 삭제할 수 없습니다.', 'warning');
    return;
  }

  if (!confirm(`정말로 "${user.name}" 사용자를 삭제하시겠습니까?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        'X-User': currentUser
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '삭제에 실패했습니다.');
    }

    showToast('사용자가 삭제되었습니다.', 'success');
    // 목록 새로고침
    await loadUserList();
  } catch (error) {
    console.error('사용자 삭제 실패:', error);
    showToast(error.message, 'error');
  }
}

// 사용자 폼 모달 열기
function openUserFormModal(user = null) {
  const modal = document.getElementById('userFormModal');
  const title = document.getElementById('userFormTitle');
  const form = document.getElementById('userForm');
  
  if (!modal || !title || !form) {
    console.error('사용자 폼 모달 요소를 찾을 수 없습니다:', {
      modal: !!modal,
      title: !!title,
      form: !!form
    });
    return;
  }

  // 폼 초기화
  form.reset();
  editingUserId = null;

  if (user) {
    // 수정 모드
    title.textContent = '사용자 수정';
    editingUserId = user.id;
    
    // 폼에 기존 데이터 채우기
    const emailField = document.getElementById('userEmail');
    const nameField = document.getElementById('userName');
    const roleField = document.getElementById('userRole');
    const managerNameField = document.getElementById('userManagerName');
    
    if (emailField) emailField.value = user.email || '';
    if (emailField) emailField.readOnly = true; // 이메일은 수정 불가 (disabled 대신 readonly 사용)
    if (nameField) nameField.value = user.name || '';
    if (roleField) roleField.value = user.role || 'user';
    if (managerNameField) managerNameField.value = user.manager_name || '';
    // 상태 라디오 초기화
    const activeRadio = document.querySelector('input[name="is_active"][value="true"]');
    const inactiveRadio = document.querySelector('input[name="is_active"][value="false"]');
    if (activeRadio && inactiveRadio) {
      if (user.is_active) {
        activeRadio.checked = true;
      } else {
        inactiveRadio.checked = true;
      }
    }
  } else {
    // 추가 모드
    title.textContent = '사용자 추가';
    const emailField = document.getElementById('userEmail');
    if (emailField) emailField.readOnly = false;
  }

  modal.classList.remove('hidden');
}

// 사용자 폼 제출 처리
async function handleUserFormSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  
  // 폼 데이터 안전하게 추출
  let email = formData.get('email');
  const name = formData.get('name');
  const role = formData.get('role');
  const manager_name = formData.get('manager_name');
  const is_active = formData.get('is_active');
  
  // readonly 필드의 경우 직접 DOM에서 값을 가져오기
  if (!email) {
    const emailField = document.getElementById('userEmail');
    if (emailField) {
      email = emailField.value;
    }
  }
  
  // null 체크 및 기본값 설정
  const userData = {
    email: email ? email.trim() : '',
    name: name ? name.trim() : '',
    role: role || 'user',
    manager_name: manager_name ? manager_name.trim() : '',
    is_active: (is_active || 'false') === 'true'
  };

  // 디버깅을 위한 로그
  console.log('🔍 폼 데이터:', { email, name, role, is_active });
  console.log('🔍 처리된 userData:', userData);

  // 유효성 검사
  if (!userData.email || !userData.name || !userData.role) {
    showToast('모든 필수 필드를 입력해주세요.', 'error');
    return;
  }

  if (!userData.email.includes('@')) {
    showToast('올바른 이메일 형식을 입력해주세요.', 'error');
    return;
  }

  try {
    const url = editingUserId ? `/api/users/${encodeURIComponent(editingUserId)}` : '/api/users';
    const method = editingUserId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-User': currentUser
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '저장에 실패했습니다.');
    }

    const result = await response.json();
    const message = editingUserId ? '사용자가 수정되었습니다.' : '사용자가 추가되었습니다.';
    
    showToast(message, 'success');
    closeModalById('userFormModal');
    // 목록 새로고침
    await loadUserList();
  } catch (error) {
    console.error('사용자 저장 실패:', error);
    showToast(error.message, 'error');
  }
}

// 비밀번호 재설정 처리
async function handlePasswordReset() {
  if (!editingUserId) {
    showToast('수정할 사용자를 선택해주세요.', 'error');
    return;
  }

  const newPassword = document.getElementById('userNewPassword').value.trim();
  if (!newPassword) {
    showToast('새 비밀번호를 입력해주세요.', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('비밀번호는 최소 6자 이상이어야 합니다.', 'error');
    return;
  }

  if (!confirm('정말로 이 사용자의 비밀번호를 재설정하시겠습니까?')) {
    return;
  }

  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User': currentUser
      },
      body: JSON.stringify({
        user_id: editingUserId,
        new_password: newPassword
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '비밀번호 재설정에 실패했습니다.');
    }

    showToast('비밀번호가 재설정되었습니다.', 'success');
    document.getElementById('userNewPassword').value = '';
    // 목록 새로고침
    await loadUserList();
  } catch (error) {
    console.error('비밀번호 재설정 실패:', error);
    showToast(error.message, 'error');
  }
}

// 모든 모달 닫기
function closeAllModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.classList.add('hidden');
  });
  
  // 폼 초기화
  const form = document.getElementById('userForm');
  if (form) {
    form.reset();
  }
  editingUserId = null;
}

// 특정 모달만 닫기
function closeModalById(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

// 어드민 권한 확인
function isAdminUser() {
  // 서버에서 받은 사용자 정보를 사용
  return currentUser && window.currentUserInfo && window.currentUserInfo.is_admin;
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 토스트 메시지 표시
function showToast(message, type = 'info') {
  // 기존 토스트 메시지 시스템이 있다면 사용, 없으면 간단한 alert 사용
  if (typeof window.showToast === 'function' && window.showToast !== showToast) {
    window.showToast(message, type);
  } else {
    alert(message);
  }
} 

// 전역 함수로 등록
window.openUserManagementModal = openUserManagementModal;
window.loadUserList = loadUserList;
window.editJobTitle = editJobTitle;
window.saveJobTitle = saveJobTitle;
window.editManagerName = editManagerName;
window.saveManagerName = saveManagerName;
window.updateTopBarUserInfo = updateTopBarUserInfo;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.deactivateUser = deactivateUser;
window.resetUserPassword = resetUserPassword;
window.editUserRole = editUserRole;

// 사용자 승인
async function approveUser(userId) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/approve`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    showToast('사용자가 승인되었습니다.', 'success');
    await loadUserList(); // 목록 새로고침
    
  } catch (error) {
    console.error('❌ 사용자 승인 실패:', error);
    showToast('사용자 승인에 실패했습니다.', 'error');
  }
}

// 사용자 거부
async function rejectUser(userId) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/reject`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    showToast('사용자가 거부되었습니다.', 'success');
    await loadUserList(); // 목록 새로고침
    
  } catch (error) {
    console.error('❌ 사용자 거부 실패:', error);
    showToast('사용자 거부에 실패했습니다.', 'error');
  }
}

// 사용자 비활성화
async function deactivateUser(userId) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    showToast('사용자가 비활성화되었습니다.', 'success');
    await loadUserList(); // 목록 새로고침
    
  } catch (error) {
    console.error('❌ 사용자 비활성화 실패:', error);
    showToast('사용자 비활성화에 실패했습니다.', 'error');
  }
}

// 비밀번호 재설정
async function resetUserPassword(userId) {
  const newPassword = prompt('새 비밀번호를 입력하세요 (6자 이상):');
  if (!newPassword || newPassword.length < 6) {
    showToast('비밀번호는 6자 이상이어야 합니다.', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ new_password: newPassword })
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    showToast('비밀번호가 재설정되었습니다.', 'success');
    
  } catch (error) {
    console.error('❌ 비밀번호 재설정 실패:', error);
    showToast('비밀번호 재설정에 실패했습니다.', 'error');
  }
}

// 사용자 역할 변경
async function editUserRole(userId) {
  // 현재 사용자 정보 가져오기
  const user = currentUsers.find(u => u.id === userId);
  if (!user) {
    showToast('사용자를 찾을 수 없습니다.', 'error');
    return;
  }
  
  // 역할 선택 다이얼로그 생성
  const roleOptions = [
    { value: 'user', label: '일반 사용자' },
    { value: 'manager', label: '매니저' },
    { value: 'admin', label: '관리자' }
  ];
  
  const currentRoleLabel = roleOptions.find(opt => opt.value === user.role)?.label || user.role;
  
  // 간단한 선택 다이얼로그
  const roleText = `현재 역할: ${currentRoleLabel}\n\n새 역할을 선택하세요:\n1. 일반 사용자 (user)\n2. 매니저 (manager)\n3. 관리자 (admin)\n\n번호를 입력하세요 (1-3):`;
  
  const choice = prompt(roleText);
  if (!choice) return;
  
  let newRole;
  switch (choice.trim()) {
    case '1':
      newRole = 'user';
      break;
    case '2':
      newRole = 'manager';
      break;
    case '3':
      newRole = 'admin';
      break;
    default:
      showToast('1, 2, 3 중에서 선택해주세요.', 'error');
      return;
  }
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: newRole })
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const newRoleLabel = roleOptions.find(opt => opt.value === newRole)?.label || newRole;
    showToast(`사용자 역할이 "${newRoleLabel}"로 변경되었습니다.`, 'success');
    await loadUserList(); // 목록 새로고침
    
  } catch (error) {
    console.error('❌ 사용자 역할 변경 실패:', error);
    showToast('사용자 역할 변경에 실패했습니다.', 'error');
  }
}

// 시트지정 모달 열기
function openSheetUrlModal(userId, userEmail) {
  const modal = document.getElementById('sheetUrlModal');
  const form = document.getElementById('sheetUrlForm');
  const urlInput = document.getElementById('sheetUrl');
  
  if (!modal || !form || !urlInput) {
    showToast('시트지정 모달을 열 수 없습니다.', 'error');
    return;
  }
  
  // 현재 시트 URL 설정 (있는 경우)
  const currentUser = currentUsers.find(u => u.id === userId);
  if (currentUser && currentUser.sheet_url) {
    urlInput.value = currentUser.sheet_url;
  } else {
    urlInput.value = '';
  }
  
  // 폼에 사용자 ID 저장
  form.dataset.userId = userId;
  
  // 모달 표시
  modal.classList.remove('hidden');
  
  // 이벤트 리스너 설정
  setupSheetUrlModalEvents();
}

// 시트지정 모달 이벤트 설정
function setupSheetUrlModalEvents() {
  const modal = document.getElementById('sheetUrlModal');
  const form = document.getElementById('sheetUrlForm');
  const closeBtn = document.getElementById('closeSheetUrlModal');
  const cancelBtn = document.getElementById('sheetUrlCancelBtn');
  
  // 닫기 버튼
  if (closeBtn) {
    closeBtn.onclick = () => closeSheetUrlModal();
  }
  
  // 취소 버튼
  if (cancelBtn) {
    cancelBtn.onclick = () => closeSheetUrlModal();
  }
  
  // 폼 제출
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      handleSheetUrlSubmit();
    };
  }
  
  // 모달 외부 클릭 시 닫기
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeSheetUrlModal();
      }
    };
  }
}

// 시트지정 모달 닫기
function closeSheetUrlModal() {
  const modal = document.getElementById('sheetUrlModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 시트 URL 제출 처리
async function handleSheetUrlSubmit() {
  const form = document.getElementById('sheetUrlForm');
  const urlInput = document.getElementById('sheetUrl');
  const userId = form.dataset.userId;
  
  if (!userId || !urlInput.value.trim()) {
    showToast('시트 URL을 입력해주세요.', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/set-sheet-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sheet_url: urlInput.value.trim() })
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const result = await response.json();
    showToast(result.message || '시트 URL이 설정되었습니다.', 'success');
    
    // 모달 닫기
    closeSheetUrlModal();
    
    // 사용자 목록 새로고침
    await loadUserList();
    
  } catch (error) {
    console.error('❌ 시트 URL 설정 실패:', error);
    showToast('시트 URL 설정에 실패했습니다.', 'error');
  }
} 