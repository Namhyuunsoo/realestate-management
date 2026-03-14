/* -----------------------------------------
 * user-management.js - 사용자 관리 UI
 * ----------------------------------------- */

// 전역 변수
let currentUsers = [];
let editingUserId = null;

/**
 * 상단 바 사용자 정보 업데이트
 */
export async function updateTopBarUserInfo() {
    const userEmailDisplay = document.getElementById('user-display-email');
    const userRoleDisplay = document.getElementById('user-display-role');
    const userAvatarText = document.getElementById('user-avatar-text');
    
    // 추가적인 ID들 (auth.js 등에서 사용하는 경우 대비)
    const userDisplay = document.getElementById("userDisplay");
    const userEmailDisplayOld = document.getElementById("userEmailDisplay");
    const userRoleNameEl = document.getElementById('userRoleName');
    
    if (!userEmailDisplay && !userDisplay) return;

    // 1. 우선 로컬 스토리지 데이터로 즉시 표시 (UX 개선)
    const localEmail = localStorage.getItem('user_email') || localStorage.getItem('X-USER');
    const localName = localStorage.getItem('user_name');
    const localRole = localStorage.getItem('user_role') || localStorage.getItem('X-USER-ROLE');
    const localManager = localStorage.getItem('manager_name');

    if (localEmail) {
        const displayName = localName || localEmail.split('@')[0];
        
        if (userEmailDisplay) userEmailDisplay.textContent = displayName;
        if (userDisplay) userDisplay.textContent = displayName;
        if (userEmailDisplayOld) userEmailDisplayOld.textContent = localEmail;
        
        const roleText = localManager || (localRole === 'admin' ? '관리자' : '상담사');
        if (userRoleDisplay) userRoleDisplay.textContent = roleText;
        if (userRoleNameEl) userRoleNameEl.textContent = localName ? `${localRole === 'admin' ? '관리자' : '상담사'} ${localName}` : displayName;
        
        if (userAvatarText) userAvatarText.textContent = displayName.substring(0, 1).toUpperCase();
    }

    // 2. 서버에서 최신 데이터 가져와서 동기화
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const userData = await response.json();
            const user = userData.user || userData;
            
            const finalName = user.name || user.email.split('@')[0];
            
            // UI 업데이트
            if (userEmailDisplay) userEmailDisplay.textContent = finalName;
            if (userDisplay) userDisplay.textContent = finalName;
            if (userEmailDisplayOld) userEmailDisplayOld.textContent = user.email;
            
            const roleText = user.manager_name || (user.role === 'admin' ? '관리자' : '상담사');
            if (userRoleDisplay) userRoleDisplay.textContent = roleText;
            if (userRoleNameEl) userRoleNameEl.textContent = user.job_title ? `${user.job_title} ${finalName}` : finalName;
            
            if (userAvatarText) userAvatarText.textContent = finalName.substring(0, 1).toUpperCase();
            
            // 로컬 스토리지 최신화
            localStorage.setItem('user_email', user.email);
            localStorage.setItem('X-USER', user.email);
            localStorage.setItem('user_name', user.name || '');
            localStorage.setItem('user_role', user.role);
            localStorage.setItem('X-USER-ROLE', user.role);
            localStorage.setItem('manager_name', user.manager_name || '');
            
            window.currentUserInfo = user;
        }
    } catch (error) {
        console.error('사용자 정보 업데이트 실패:', error);
    }
}

// 전역 함수 노출
window.updateTopBarUserInfo = updateTopBarUserInfo;

// 사용자 관리 초기화 (나머지 로직은 기존 파일 유지)
async function initUserManagement() {
    if (!localStorage.getItem('user_email') && !localStorage.getItem('X-USER')) {
        return;
    }
    updateTopBarUserInfo();
}
