/* -----------------------------------------
 * filter-modal.js - 필터 모달 관리
 * -----------------------------------------
 * 모바일에서 필터바를 모달로 대체하는 기능
 * 기존 필터링 로직을 그대로 유지하면서 UI만 모달로 변경
 * ----------------------------------------- */

/*******************************
 * ===== 필터 모달 관리 =====
 *******************************/

// 필터 모달 상태 관리
const filterModalState = {
  isOpen: false,
  originalValues: {} // 원본 필터 값들 저장
};

// 필터 모달 초기화
function initializeFilterModal() {
  console.log('🔍 필터 모달 초기화 시작...');
  
  // 이벤트 리스너 설정
  setupFilterModalEvents();
  
  // 기존 필터 값들을 모달로 복사
  syncFilterValuesToModal();
  
  console.log('✅ 필터 모달 초기화 완료');
}

// 필터 모달 이벤트 리스너 설정 (모바일에서만)
function setupFilterModalEvents() {
  // 모바일 환경에서만 이벤트 리스너 설정
  const isMobile = window.MOBILE_APP || window.innerWidth <= 768 || 
                   /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  console.log('🔍 setupFilterModalEvents 호출, isMobile:', isMobile, 'window.MOBILE_APP:', window.MOBILE_APP);
  
  if (!isMobile) {
    console.log('💻 PC 환경: 필터 모달 이벤트 리스너 설정 건너뜀');
    return; // PC에서는 이벤트 리스너 설정하지 않음
  }
  
  // 필터 버튼 클릭 이벤트 - 기존 이벤트 리스너 제거 후 재설정
  const filterToggleBtn = document.getElementById('filterToggleBtn');
  if (filterToggleBtn) {
    // 기존 이벤트 리스너 제거 (중복 방지)
    filterToggleBtn.removeEventListener('click', openFilterModal);
    // 새 이벤트 리스너 추가
    filterToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔍 필터 토글 버튼 클릭됨!');
      openFilterModal();
    });
    console.log('✅ 모바일 필터 버튼 이벤트 리스너 설정 완료');
  } else {
    console.warn('⚠️ 필터 버튼을 찾을 수 없습니다.');
  }
  
  // 새로운 지도 컨트롤 필터 버튼 이벤트 리스너
  const filterBtn = document.getElementById('filterBtn');
  if (filterBtn) {
    // 기존 이벤트 리스너 제거 (중복 방지)
    filterBtn.removeEventListener('click', openFilterModal);
    // 새 이벤트 리스너 추가
    filterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔍 필터 버튼 클릭됨!');
      openFilterModal();
    });
    console.log('✅ 지도 컨트롤 필터 버튼 이벤트 리스너 설정 완료');
  } else {
    console.warn('⚠️ 지도 컨트롤 필터 버튼을 찾을 수 없습니다.');
  }
  
  // 모달 닫기 버튼들
  const closeFilterModalBtn = document.getElementById('closeFilterModal');
  if (closeFilterModalBtn) {
    closeFilterModalBtn.addEventListener('click', closeFilterModal);
  }
  
  const cancelFilterBtn = document.getElementById('cancelFilterBtn');
  if (cancelFilterBtn) {
    cancelFilterBtn.addEventListener('click', closeFilterModal);
  }
  
  // 적용 버튼
  const applyFilterBtn = document.getElementById('applyFilterBtn');
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', applyFilterFromModal);
  }
  
  // 초기화 버튼
  const resetFilterBtn = document.getElementById('resetFilterBtn');
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', resetFilterInModal);
  }
  
  // 모달 배경 클릭으로 닫기
  const filterModal = document.getElementById('filterModal');
  if (filterModal) {
    filterModal.addEventListener('click', (e) => {
      if (e.target === filterModal) {
        closeFilterModal();
      }
    });
  }
  
  // ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && filterModalState.isOpen) {
      closeFilterModal();
    }
  });
}

// 필터 모달 열기
function openFilterModal() {
  console.log('🔍 필터 모달 열기');
  
  const filterModal = document.getElementById('filterModal');
  if (!filterModal) {
    console.error('❌ 필터 모달을 찾을 수 없습니다.');
    return;
  }
  
  console.log('🔍 필터 모달 요소 찾음:', filterModal);
  
  // 기존 필터 값들을 모달로 복사
  syncFilterValuesToModal();
  
  // 모달 표시 - CSS와 JavaScript 모두로 확실히 표시
  filterModal.classList.remove('hidden');
  filterModal.style.display = 'block';
  filterModalState.isOpen = true;
  
  console.log('🔍 모달 표시 설정 완료, display:', filterModal.style.display, 'hidden 클래스:', filterModal.classList.contains('hidden'));
  
  // 첫 번째 입력 필드에 포커스
  const firstInput = filterModal.querySelector('input');
  if (firstInput) {
    setTimeout(() => {
      firstInput.focus();
    }, 100);
  }
  
  // 모바일에서 스크롤 방지
  document.body.style.overflow = 'hidden';
  
  console.log('✅ 필터 모달 열기 완료');
}

// 필터 모달 닫기
function closeFilterModal() {
  console.log('🔍 필터 모달 닫기');
  
  const filterModal = document.getElementById('filterModal');
  if (!filterModal) {
    console.error('❌ 필터 모달을 찾을 수 없습니다.');
    return;
  }
  
  // 모달 숨기기 - CSS와 JavaScript 모두로 확실히 숨김
  filterModal.classList.add('hidden');
  filterModal.style.display = 'none';
  filterModalState.isOpen = false;
  
  // 모바일 스크롤 복원
  document.body.style.overflow = '';
  
  console.log('✅ 필터 모달 닫기 완료');
}

// 기존 필터 값들을 모달로 복사
function syncFilterValuesToModal() {
  console.log('🔄 필터 값들을 모달로 복사');
  
  // 필터 필드 매핑
  const filterFieldMapping = {
    'tf_region': 'modal_tf_region',
    'tf_jibun': 'modal_tf_jibun',
    'tf_building': 'modal_tf_building',
    'tf_floor': 'modal_tf_floor',
    'tf_store': 'modal_tf_store',
    'tf_area_sale': 'modal_tf_area_sale',
    'tf_area_real': 'modal_tf_area_real',
    'tf_deposit': 'modal_tf_deposit',
    'tf_rent': 'modal_tf_rent',
    'tf_premium': 'modal_tf_premium',
    'tf_note': 'modal_tf_note',
    'tf_manager': 'modal_tf_manager',
    'tf_region2': 'modal_tf_region2',
    'tf_phone': 'modal_tf_phone',
    'tf_client': 'modal_tf_client',
    'tf_note3': 'modal_tf_note3'
  };
  
  // 각 필드의 값을 모달로 복사
  Object.entries(filterFieldMapping).forEach(([originalId, modalId]) => {
    const originalField = document.getElementById(originalId);
    const modalField = document.getElementById(modalId);
    
    if (originalField && modalField) {
      modalField.value = originalField.value;
      
      // 원본 값 저장 (취소 시 복원용)
      if (!filterModalState.originalValues[originalId]) {
        filterModalState.originalValues[originalId] = originalField.value;
      }
    } else {
      console.warn(`⚠️ 필터 필드 매핑 실패: ${originalId} -> ${modalId}`, {
        originalField: !!originalField,
        modalField: !!modalField
      });
    }
  });
  
  console.log('✅ 필터 값 복사 완료');
}

// 모달의 필터 값들을 기존 필터로 복사
function syncModalValuesToFilter() {
  console.log('🔄 모달 값들을 기존 필터로 복사');
  
  // 필터 필드 매핑
  const filterFieldMapping = {
    'tf_region': 'modal_tf_region',
    'tf_jibun': 'modal_tf_jibun',
    'tf_building': 'modal_tf_building',
    'tf_floor': 'modal_tf_floor',
    'tf_store': 'modal_tf_store',
    'tf_area_sale': 'modal_tf_area_sale',
    'tf_area_real': 'modal_tf_area_real',
    'tf_deposit': 'modal_tf_deposit',
    'tf_rent': 'modal_tf_rent',
    'tf_premium': 'modal_tf_premium',
    'tf_note': 'modal_tf_note',
    'tf_manager': 'modal_tf_manager',
    'tf_region2': 'modal_tf_region2',
    'tf_phone': 'modal_tf_phone',
    'tf_client': 'modal_tf_client',
    'tf_note3': 'modal_tf_note3'
  };
  
  // 각 필드의 값을 기존 필터로 복사
  Object.entries(filterFieldMapping).forEach(([originalId, modalId]) => {
    const originalField = document.getElementById(originalId);
    const modalField = document.getElementById(modalId);
    
    if (originalField && modalField) {
      originalField.value = modalField.value;
    } else {
      console.warn(`⚠️ 필터 필드 매핑 실패: ${modalId} -> ${originalId}`, {
        originalField: !!originalField,
        modalField: !!modalField
      });
    }
  });
  
  console.log('✅ 모달 값 복사 완료');
}

// 모달에서 필터 적용
function applyFilterFromModal() {
  console.log('🔍 모달에서 필터 적용');
  
  try {
    // 모달의 값들을 기존 필터로 복사
    syncModalValuesToFilter();
    
    // 기존 필터 적용 로직 실행
    if (typeof window.applyAllFilters === 'function') {
      window.applyAllFilters();
      console.log('✅ 기존 필터 적용 로직 실행 완료');
    } else {
      console.warn('⚠️ applyAllFilters 함수를 찾을 수 없습니다.');
    }
    
    // 모달 닫기
    closeFilterModal();
    
    // 성공 메시지
    if (typeof window.showToast === 'function') {
      window.showToast('필터가 적용되었습니다.', 'success');
    }
    
  } catch (error) {
    console.error('❌ 필터 적용 중 오류:', error);
    if (typeof window.showToast === 'function') {
      window.showToast('필터 적용 중 오류가 발생했습니다.', 'error');
    }
  }
}

// 모달에서 필터 초기화
function resetFilterInModal() {
  console.log('🔍 모달에서 필터 초기화');
  
  try {
    // 모든 모달 입력 필드 초기화
    const modalInputs = document.querySelectorAll('#filterModal input');
    modalInputs.forEach(input => {
      input.value = '';
    });
    
    // 기존 필터도 초기화
    if (typeof window.resetAllFilters === 'function') {
      window.resetAllFilters();
      console.log('✅ 기존 필터 초기화 로직 실행 완료');
    } else {
      // 수동으로 기존 필터 초기화
      const originalInputs = document.querySelectorAll('#topFilterBar input');
      originalInputs.forEach(input => {
        input.value = '';
      });
      console.log('✅ 수동으로 기존 필터 초기화 완료');
    }
    
    // 필터 적용
    if (typeof window.applyAllFilters === 'function') {
      window.applyAllFilters();
    }
    
    // 성공 메시지
    if (typeof window.showToast === 'function') {
      window.showToast('필터가 초기화되었습니다.', 'success');
    }
    
  } catch (error) {
    console.error('❌ 필터 초기화 중 오류:', error);
    if (typeof window.showToast === 'function') {
      window.showToast('필터 초기화 중 오류가 발생했습니다.', 'error');
    }
  }
}

// 모바일 환경에서 기존 필터바 숨기기
function hideOriginalFilterBar() {
  const topFilterBar = document.getElementById('topFilterBar');
  if (topFilterBar) {
    topFilterBar.classList.add('mobile-hidden');
    console.log('✅ 기존 필터바 숨김 완료');
  } else {
    console.warn('⚠️ topFilterBar를 찾을 수 없습니다.');
  }
}

// 모바일 환경 감지 및 필터바 대체
function setupMobileFilterReplacement() {
  // 모바일 환경 감지
  const isMobile = window.MOBILE_APP || window.innerWidth <= 768 || 
                   /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  console.log('🔍 setupMobileFilterReplacement 호출, isMobile:', isMobile, 'window.MOBILE_APP:', window.MOBILE_APP);
  
  if (isMobile) {
    console.log('📱 모바일 환경 감지 - 필터바를 모달로 대체');
    hideOriginalFilterBar();
    
    // 모바일에서만 필터 버튼과 모달 활성화
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterBtn = document.getElementById('filterBtn');
    const filterModal = document.getElementById('filterModal');
    
    if (filterToggleBtn) {
      filterToggleBtn.style.display = 'flex';
      console.log('✅ 모바일 필터 버튼 활성화');
    } else {
      console.warn('⚠️ filterToggleBtn을 찾을 수 없습니다.');
    }
    
    if (filterBtn) {
      filterBtn.style.display = 'flex';
      console.log('✅ 지도 컨트롤 필터 버튼 활성화');
    } else {
      console.warn('⚠️ filterBtn을 찾을 수 없습니다.');
    }
    
    if (filterModal) {
      filterModal.style.display = 'none'; // 모바일에서도 기본적으로 숨김
      console.log('✅ 필터 모달 설정 완료');
    } else {
      console.warn('⚠️ filterModal을 찾을 수 없습니다.');
    }
    
    // 모바일에서 이벤트 리스너 재설정 (지연 실행)
    setTimeout(() => {
      setupFilterModalEvents();
    }, 100);
    
  } else {
    console.log('💻 PC 환경 감지 - 기존 필터바 유지');
    
    // PC에서는 필터 버튼과 모달 숨기기
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterBtn = document.getElementById('filterBtn');
    const filterModal = document.getElementById('filterModal');
    
    if (filterToggleBtn) {
      filterToggleBtn.style.display = 'none';
    }
    if (filterBtn) {
      filterBtn.style.display = 'none';
    }
    if (filterModal) {
      filterModal.style.display = 'none';
    }
  }
}

/*******************************
 * ===== 전역 함수 export =====
 *******************************/

// 전역으로 export
window.initializeFilterModal = initializeFilterModal;
window.openFilterModal = openFilterModal;
window.closeFilterModal = closeFilterModal;
window.applyFilterFromModal = applyFilterFromModal;
window.resetFilterInModal = resetFilterInModal;
window.setupMobileFilterReplacement = setupMobileFilterReplacement;

// DOM 로드 완료 시 초기화 (지연 실행)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // window.MOBILE_APP 설정을 기다린 후 초기화
    setTimeout(() => {
      initializeFilterModal();
      setupMobileFilterReplacement();
    }, 100);
  });
} else {
  // window.MOBILE_APP 설정을 기다린 후 초기화
  setTimeout(() => {
    initializeFilterModal();
    setupMobileFilterReplacement();
  }, 100);
}

// 모바일 환경에서 추가 초기화 (지연 실행)
setTimeout(() => {
  const isMobile = window.MOBILE_APP || window.innerWidth <= 768 || 
                   /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  console.log('🔍 모바일 환경 추가 초기화, isMobile:', isMobile, 'window.MOBILE_APP:', window.MOBILE_APP);
  
  if (isMobile) {
    console.log('📱 모바일 환경 추가 초기화 실행');
    setupMobileFilterReplacement();
    
    // 필터 버튼 클릭 이벤트 강제 설정
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    if (filterToggleBtn) {
      // 기존 이벤트 리스너 모두 제거
      filterToggleBtn.replaceWith(filterToggleBtn.cloneNode(true));
      
      // 새 이벤트 리스너 추가
      const newFilterBtn = document.getElementById('filterToggleBtn');
      if (newFilterBtn) {
        newFilterBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('🔍 필터 버튼 클릭됨');
          openFilterModal();
        });
        console.log('✅ 모바일 필터 버튼 이벤트 리스너 강제 설정 완료');
      }
    } else {
      console.warn('⚠️ filterToggleBtn을 찾을 수 없습니다.');
    }
    
    // 지도 컨트롤 필터 버튼 클릭 이벤트 강제 설정
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
      // 기존 이벤트 리스너 모두 제거
      filterBtn.replaceWith(filterBtn.cloneNode(true));
      
      // 새 이벤트 리스너 추가
      const newMapFilterBtn = document.getElementById('filterBtn');
      if (newMapFilterBtn) {
        newMapFilterBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('🔍 지도 컨트롤 필터 버튼 클릭됨');
          openFilterModal();
        });
        console.log('✅ 지도 컨트롤 필터 버튼 이벤트 리스너 강제 설정 완료');
      }
    } else {
      console.warn('⚠️ filterBtn을 찾을 수 없습니다.');
    }
  }
}, 500);

console.log('✅ filter-modal.js 모듈 로드 완료');
