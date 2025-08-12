/* -----------------------------------------
 * toast.js - 토스트 메시지 UI
 * ----------------------------------------- */

/**************************************
 * ===== 토스트 메시지 UI =====
 **************************************/

function showToast(message, type = 'info') {
  // 기존 토스트 제거
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // 새 토스트 생성
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  // DOM에 추가
  document.body.appendChild(toast);
  
  // 3초 후 자동 제거
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 3000);
  
  // 클릭 시 즉시 제거
  toast.addEventListener('click', () => {
    toast.remove();
  });
}

// 토스트 메시지 함수를 전역으로 export
window.showToast = showToast; 