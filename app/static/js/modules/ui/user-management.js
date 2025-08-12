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
    
        // 어드민 UI 표시
        showAdminUI();
        
        // 이벤트 리스너 등록
        setupUserManagementEvents();
        console.log('✅ 어드민 사용자 관리 기능 초기화 완료');
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
function showAdminUI() {
  
  const adminElements = document.querySelectorAll('.admin-only');
  
  
  adminElements.forEach((element, index) => {
    console.log(`🔍 요소 ${index}:`, element.className);
    element.classList.remove('hidden');
    element.classList.add('show');
    
  });
  
  console.log('✅ showAdminUI 완료');
}

// 사용자 관리 이벤트 설정
function setupUserManagementEvents() {
  // 사용자 관리 버튼 클릭
  const userManagementBtn = document.getElementById('userManagementBtn');
  if (userManagementBtn) {
    userManagementBtn.addEventListener('click', openUserManagementModal);
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
  const modal = document.getElementById('userManagementModal');
  if (!modal) return;

  modal.classList.remove('hidden');
  await loadUserList();
}

// 사용자 목록 로드
async function loadUserList() {
  try {
    const response = await fetch('/api/users', {
      headers: {
        'X-User': currentUser
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    currentUsers = data.users || [];
    
    renderUserList(currentUsers);
  } catch (error) {
    console.error('사용자 목록 로드 실패:', error);
    showToast('사용자 목록을 불러오는데 실패했습니다.', 'error');
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

// 날짜 포맷팅
function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('ko-KR');
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
    
    if (emailField) emailField.value = user.email || '';
    if (emailField) emailField.readOnly = true; // 이메일은 수정 불가 (disabled 대신 readonly 사용)
    if (nameField) nameField.value = user.name || '';
    if (roleField) roleField.value = user.role || 'user';
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