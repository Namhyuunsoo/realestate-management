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

  // 이벤트 리스너 설정
  setupFilterModalEvents();

  // 기존 필터 값들을 모달로 복사
  syncFilterValuesToModal();

}

// 필터 모달 이벤트 리스너 설정 (모바일에서만)
function setupFilterModalEvents() {
  // 모바일 환경에서만 이벤트 리스너 설정
  const isMobile = window.MOBILE_APP || window.innerWidth <= 768 ||
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


  if (!isMobile) {
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
      openFilterModal();
    });
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
      openFilterModal();
    });
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
  // 🔥 성능 최적화: 중복 등록 방지
  if (!window._filterModalEscListenerRegistered) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && filterModalState.isOpen) {
        closeFilterModal();
      }
    });
    window._filterModalEscListenerRegistered = true;
  }
}

// 필터 모달 열기
function openFilterModal() {

  const filterModal = document.getElementById('filterModal');
  if (!filterModal) {
    console.error('❌ 필터 모달을 찾을 수 없습니다.');
    return;
  }

  // 모드에 따라 필터 섹션 표시
  const modalCommercial = document.getElementById('modalCommercialFilter');
  const modalHousing = document.getElementById('modalHousingFilter');
  if (window.UI_STATE && window.UI_STATE.listingMode === 'housing') {
    if (modalCommercial) modalCommercial.classList.add('hidden');
    if (modalHousing) modalHousing.classList.remove('hidden');
  } else {
    if (modalCommercial) modalCommercial.classList.remove('hidden');
    if (modalHousing) modalHousing.classList.add('hidden');
  }

  // 기존 필터 값들을 모달로 복사
  syncFilterValuesToModal();

  // 상가 서브타입에 따른 필터 가시성 업데이트 (매매가, 권리금 등)
  if (typeof window.updateCommercialFilterUI === 'function') {
    window.updateCommercialFilterUI();
  }

  // 모달 표시 - CSS와 JavaScript 모두로 확실히 표시
  filterModal.classList.remove('hidden');
  filterModal.style.display = 'block';
  filterModalState.isOpen = true;


  // 첫 번째 입력 필드에 포커스
  const firstInput = filterModal.querySelector('input');
  if (firstInput) {
    setTimeout(() => {
      firstInput.focus();
    }, 100);
  }

  // 모바일에서 스크롤 방지 - body 위치 고정
  const originalBodyStyles = {
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
    left: document.body.style.left,
    width: document.body.style.width,
    height: document.body.style.height
  };

  // 원본 스타일 저장 (복원용)
  if (!filterModalState.originalBodyStyles) {
    filterModalState.originalBodyStyles = originalBodyStyles;
  }

  // body 스크롤 완전 차단 및 위치 고정
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = '0';
  document.body.style.left = '0';
  document.body.style.width = '100%';
  document.body.style.height = '100vh';

}

// 필터 모달 닫기
function closeFilterModal() {

  const filterModal = document.getElementById('filterModal');
  if (!filterModal) {
    console.error('❌ 필터 모달을 찾을 수 없습니다.');
    return;
  }

  // 모달 숨기기 - CSS와 JavaScript 모두로 확실히 숨김
  filterModal.classList.add('hidden');
  filterModal.style.display = 'none';
  filterModalState.isOpen = false;

  // 모바일 스크롤 복원 - body 위치 복원
  const originalStyles = filterModalState.originalBodyStyles || {};

  document.body.style.overflow = originalStyles.overflow || '';
  document.body.style.position = originalStyles.position || '';
  document.body.style.top = originalStyles.top || '';
  document.body.style.left = originalStyles.left || '';
  document.body.style.width = originalStyles.width || '';
  document.body.style.height = originalStyles.height || '';

  // 저장된 원본 스타일 초기화
  filterModalState.originalBodyStyles = null;

}

// 기존 필터 값들을 모달로 복사
function syncFilterValuesToModal() {

  const filterFieldMapping = window.UI_STATE && window.UI_STATE.listingMode === 'housing'
    ? {
      'tf_h_region': 'modal_tf_h_region', 'tf_h_jibun': 'modal_tf_h_jibun', 'tf_h_region2': 'modal_tf_h_region2',
      'tf_h_type': 'modal_tf_h_type', 'tf_h_building': 'modal_tf_h_building', 'tf_h_dong': 'modal_tf_h_dong',
      'tf_h_ho': 'modal_tf_h_ho', 'tf_h_direction': 'modal_tf_h_direction', 'tf_h_floor': 'modal_tf_h_floor',
      'tf_h_supply': 'modal_tf_h_supply', 'tf_h_exclusive': 'modal_tf_h_exclusive', 'tf_h_deposit': 'modal_tf_h_deposit',
      'tf_h_rent': 'modal_tf_h_rent', 'tf_h_rooms': 'modal_tf_h_rooms', 'tf_h_bath': 'modal_tf_h_bath',
      'tf_h_status': 'modal_tf_h_status', 'tf_h_client': 'modal_tf_h_client', 'tf_h_phone': 'modal_tf_h_phone',
      'tf_h_tenant': 'modal_tf_h_tenant', 'tf_h_note': 'modal_tf_h_note'
    }
    : {
      'tf_region': 'modal_tf_region', 'tf_jibun': 'modal_tf_jibun', 'tf_building': 'modal_tf_building',
      'tf_floor': 'modal_tf_floor', 'tf_store': 'modal_tf_store', 'tf_area_sale': 'modal_tf_area_sale',
      'tf_area_real': 'modal_tf_area_real', 'tf_deposit': 'modal_tf_deposit', 'tf_rent': 'modal_tf_rent',
      'tf_premium': 'modal_tf_premium', 'tf_sale_price': 'modal_tf_sale_price', 'tf_yield': 'modal_tf_yield',
      'tf_area_land_py': 'modal_tf_area_land_py', 'tf_note': 'modal_tf_note', 'tf_manager': 'modal_tf_manager',
      'tf_region2': 'modal_tf_region2', 'tf_phone': 'modal_tf_phone', 'tf_client': 'modal_tf_client',
      'tf_note3': 'modal_tf_note3'
    };

  Object.entries(filterFieldMapping).forEach(([originalId, modalId]) => {
    const originalField = document.getElementById(originalId);
    const modalField = document.getElementById(modalId);
    if (originalField && modalField) {
      modalField.value = originalField.value;
      if (!filterModalState.originalValues[originalId]) {
        filterModalState.originalValues[originalId] = originalField.value;
      }
    }
  });
}

// 모달의 필터 값들을 기존 필터로 복사
function syncModalValuesToFilter() {

  const filterFieldMapping = window.UI_STATE && window.UI_STATE.listingMode === 'housing'
    ? {
      'tf_h_region': 'modal_tf_h_region', 'tf_h_jibun': 'modal_tf_h_jibun', 'tf_h_region2': 'modal_tf_h_region2',
      'tf_h_type': 'modal_tf_h_type', 'tf_h_building': 'modal_tf_h_building', 'tf_h_dong': 'modal_tf_h_dong',
      'tf_h_ho': 'modal_tf_h_ho', 'tf_h_direction': 'modal_tf_h_direction', 'tf_h_floor': 'modal_tf_h_floor',
      'tf_h_supply': 'modal_tf_h_supply', 'tf_h_exclusive': 'modal_tf_h_exclusive', 'tf_h_deposit': 'modal_tf_h_deposit',
      'tf_h_rent': 'modal_tf_h_rent', 'tf_h_rooms': 'modal_tf_h_rooms', 'tf_h_bath': 'modal_tf_h_bath',
      'tf_h_status': 'modal_tf_h_status', 'tf_h_client': 'modal_tf_h_client', 'tf_h_phone': 'modal_tf_h_phone',
      'tf_h_tenant': 'modal_tf_h_tenant', 'tf_h_note': 'modal_tf_h_note'
    }
    : {
      'tf_region': 'modal_tf_region', 'tf_jibun': 'modal_tf_jibun', 'tf_building': 'modal_tf_building',
      'tf_floor': 'modal_tf_floor', 'tf_store': 'modal_tf_store', 'tf_area_sale': 'modal_tf_area_sale',
      'tf_area_real': 'modal_tf_area_real', 'tf_deposit': 'modal_tf_deposit', 'tf_rent': 'modal_tf_rent',
      'tf_premium': 'modal_tf_premium', 'tf_sale_price': 'modal_tf_sale_price', 'tf_yield': 'modal_tf_yield',
      'tf_area_land_py': 'modal_tf_area_land_py', 'tf_note': 'modal_tf_note', 'tf_manager': 'modal_tf_manager',
      'tf_region2': 'modal_tf_region2', 'tf_phone': 'modal_tf_phone', 'tf_client': 'modal_tf_client',
      'tf_note3': 'modal_tf_note3'
    };

  Object.entries(filterFieldMapping).forEach(([originalId, modalId]) => {
    const originalField = document.getElementById(originalId);
    const modalField = document.getElementById(modalId);
    if (originalField && modalField) {
      originalField.value = modalField.value;
    }
  });
}

// 모달에서 필터 적용
function applyFilterFromModal() {

  try {
    // 모달의 값들을 기존 필터로 복사
    syncModalValuesToFilter();

    // 기존 필터 적용 로직 실행
    if (typeof window.applyAllFilters === 'function') {
      window.applyAllFilters();
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

  try {
    if (window.UI_STATE && window.UI_STATE.listingMode === 'housing') {
      document.querySelectorAll('#modalHousingFilter input').forEach(inp => {
        inp.value = inp.id === 'modal_tf_h_status' ? '생' : '';
      });
      document.querySelectorAll('#housingFilterSection input').forEach(inp => {
        inp.value = inp.id === 'tf_h_status' ? '생' : '';
      });
    } else {
      // 상가 필터 초기화: 모든 입력 필드 비움
      document.querySelectorAll('#modalCommercialFilter input').forEach(inp => { inp.value = ''; });
      document.querySelectorAll('#commercialFilterSection input').forEach(inp => { inp.value = ''; });
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
  } else {
    console.warn('⚠️ topFilterBar를 찾을 수 없습니다.');
  }
}

// 모바일 환경 감지 및 필터바 대체
function setupMobileFilterReplacement() {
  // 모바일 환경 감지
  const isMobile = window.MOBILE_APP || window.innerWidth <= 768 ||
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


  if (isMobile) {
    hideOriginalFilterBar();

    // 모바일에서만 필터 버튼과 모달 활성화
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterBtn = document.getElementById('filterBtn');
    const filterModal = document.getElementById('filterModal');

    if (filterToggleBtn) {
      filterToggleBtn.style.display = 'flex';
    } else {
      console.warn('⚠️ filterToggleBtn을 찾을 수 없습니다.');
    }

    if (filterBtn) {
      filterBtn.style.display = 'flex';
    } else {
      console.warn('⚠️ filterBtn을 찾을 수 없습니다.');
    }

    if (filterModal) {
      filterModal.style.display = 'none'; // 모바일에서도 기본적으로 숨김
    } else {
      console.warn('⚠️ filterModal을 찾을 수 없습니다.');
    }

    // 모바일에서 이벤트 리스너 재설정 (지연 실행)
    setTimeout(() => {
      setupFilterModalEvents();
    }, 100);

  } else {

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


  if (isMobile) {
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
          openFilterModal();
        });
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
          openFilterModal();
        });
      }
    } else {
      console.warn('⚠️ filterBtn을 찾을 수 없습니다.');
    }
  }
}, 500);

