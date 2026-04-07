/* -----------------------------------------
 * customer-forms.js - 고객 폼 관련 함수들
 * ----------------------------------------- */

/**************************************
 * ===== 고객 폼 관련 함수들 =====
 **************************************/

// 권한 확인 헬퍼 함수들
function isUserAdmin() {
  return localStorage.getItem("X-USER-ROLE") === "admin";
}

function isUserManager() {
  const role = localStorage.getItem("X-USER-ROLE");
  return role === "manager" || role === "admin";
}

function getUserRole() {
  return localStorage.getItem("X-USER-ROLE") || "user";
}

async function submitCustomerForm(customerId) {
  console.log('고객 폼 제출:', customerId);

  if (!currentUser) {
    alert('로그인이 필요합니다.');
    return;
  }

  // 수정 모드인지 확인
  const isEditMode = customerId && customerId !== 'new';

  // 폼 데이터 수집
  const areaVal = document.getElementById('frmArea')?.value || '';
  const depositVal = document.getElementById('frmDeposit')?.value || '';
  const rentVal = document.getElementById('frmRent')?.value || '';
  const premiumVal = document.getElementById('frmPremium')?.value || '';

  // 상단필터 방식으로 필터데이터 구성 (지역명 정규화 포함)
  const regionsInput = document.getElementById('frmRegions')?.value || '';
  
  // 지역명 정규화 함수 (서버의 normalize_region 함수와 동일한 로직)
  function normalizeRegion(region) {
    if (!region) return region;
    
    region = region.trim();
    
    // "구 전체", "구 전부" 패턴 처리
    if (region.includes("구 전체") || region.includes("구 전부")) {
      return region.split("구")[0] + "구";
    }
    
    // "구전체", "구전부" 패턴 처리 (공백 없는 경우)
    if (region.includes("구전체") || region.includes("구전부")) {
      return region.split("구전체")[0] + "구";
    }
    
    // "시 전체", "시 전부" 패턴 처리
    if (region.includes("시 전체") || region.includes("시 전부")) {
      return region.split("시")[0] + "시";
    }
    
    // "시전체", "시전부" 패턴 처리 (공백 없는 경우)
    if (region.includes("시전체") || region.includes("시전부")) {
      return region.split("시전체")[0] + "시";
    }
    
    return region;
  }
  
  const normalizedRegion = normalizeRegion(regionsInput);
  
  // 필터 데이터 구성 (notes 제외)
  const filterData = {
    region: normalizedRegion,  // 정규화된 지역명 사용
    floor: document.getElementById('frmFloor')?.value || '',
    area_real: areaVal,
    deposit: depositVal,
    rent: rentVal,
    premium: premiumVal
  };

  const formData = {
    manager: document.getElementById('frmManager')?.value || '',
    name: document.getElementById('frmName')?.value || '',
    phone: document.getElementById('frmPhone')?.value || '',
    regions: document.getElementById('frmRegions')?.value || '',
    floor_pref: document.getElementById('frmFloor')?.value || '',
    area_pref: areaVal,
    deposit_pref: depositVal,
    rent_pref: rentVal,
    premium_pref: premiumVal,
    notes: document.getElementById('frmNotes')?.value || '',
    status: document.getElementById('frmStatus')?.value || '생',
    // 상단필터 방식의 필터데이터 저장
    filter_data: JSON.stringify(filterData),
    created_by: currentUser,
    created_at: new Date().toISOString()
  };

  // 필수 필드 검증
  if (!formData.name.trim()) {
    alert('고객명을 입력해주세요.');
    return;
  }
  if (!formData.phone.trim()) {
    alert('연락처를 입력해주세요.');
    return;
  }

  try {
    const url = isEditMode ? `/api/customers/${customerId}` : '/api/customers/';
    const method = isEditMode ? 'PUT' : 'POST';
    
    // formData에서 NaN 값 제거
    const cleanedFormData = cleanObject(formData);
    console.log('🧹 정리된 formData (submitCustomerForm):', cleanedFormData);
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-User': currentUser
      },
      body: JSON.stringify(cleanedFormData)
    });
    if (response.ok) {
      const result = await response.json();
      console.log('고객 저장 성공:', result);
      // 알림 제거: alert(isEditMode ? '고객정보가 수정되었습니다.' : '고객정보가 저장되었습니다.');
      const secondaryPanel = document.getElementById('secondaryPanel');
      if (secondaryPanel) {
        secondaryPanel.classList.add('hidden');
        secondaryPanel.classList.remove('visible');
      }
      if (isUserAdmin()) {
        loadCustomerList('all');
      } else {
        loadCustomerList('own');
      }
      
      // 고객 저장 후 목록 갱신
      if (window.afterCustomerSaved) {
        window.afterCustomerSaved();
      }
    } else {
      const error = await response.text();
      console.error('고객 저장 실패:', error);
      alert('저장에 실패했습니다: ' + error);
    }
  } catch (error) {
    console.error('고객 저장 중 오류:', error);
    alert('저장 중 오류가 발생했습니다.');
  }
}

// 고객 수정 전용 폼 제출 함수
async function submitCustomerEditForm(customerId) {
  console.log('고객 수정 폼 제출:', customerId);

  if (!currentUser) {
    alert('로그인이 필요합니다.');
    return;
  }

  // 폼 데이터 수집 (NaN 값 처리)
  const areaVal = cleanValue(document.getElementById('editArea')?.value) || '';
  const depositVal = cleanValue(document.getElementById('editDeposit')?.value) || '';
  const rentVal = cleanValue(document.getElementById('editRent')?.value) || '';
  const premiumVal = cleanValue(document.getElementById('editPremium')?.value) || '';

  // 상단필터 방식으로 필터데이터 구성 (지역명 정규화 포함)
  const regionsInput = cleanValue(document.getElementById('editRegions')?.value) || '';
  
  // 지역명 정규화 함수 (서버의 normalize_region 함수와 동일한 로직)
  function normalizeRegion(region) {
    if (!region) return region;
    
    region = region.trim();
    
    // "구 전체", "구 전부" 패턴 처리
    if (region.includes("구 전체") || region.includes("구 전부")) {
      return region.split("구")[0] + "구";
    }
    
    // "구전체", "구전부" 패턴 처리 (공백 없는 경우)
    if (region.includes("구전체") || region.includes("구전부")) {
      return region.split("구전체")[0] + "구";
    }
    
    // "시 전체", "시 전부" 패턴 처리
    if (region.includes("시 전체") || region.includes("시 전부")) {
      return region.split("시")[0] + "시";
    }
    
    // "시전체", "시전부" 패턴 처리 (공백 없는 경우)
    if (region.includes("시전체") || region.includes("시전부")) {
      return region.split("시전체")[0] + "시";
    }
    
    return region;
  }
  
  const normalizedRegion = normalizeRegion(regionsInput);
  
  // 필터 데이터 구성 (notes 제외)
  const filterData = {
    region: normalizedRegion,  // 정규화된 지역명 사용
    floor: cleanValue(document.getElementById('editFloor')?.value) || '',
    area_real: areaVal,
    deposit: depositVal,
    rent: rentVal,
    premium: premiumVal
  };

  const formData = {
    manager: cleanValue(document.getElementById('editManager')?.value),
    name: cleanValue(document.getElementById('editName')?.value),
    phone: cleanValue(document.getElementById('editPhone')?.value),
    regions: cleanValue(document.getElementById('editRegions')?.value),
    floor_pref: cleanValue(document.getElementById('editFloor')?.value),
    area_pref: areaVal,
    deposit_pref: depositVal,
    rent_pref: rentVal,
    premium_pref: premiumVal,
    notes: cleanValue(document.getElementById('editNotes')?.value),
    status: cleanValue(document.getElementById('editStatus')?.value),
    // 상단필터 방식의 필터데이터 저장
    filter_data: JSON.stringify(filterData)
  };

  // 필수 필드 검증 (기존 값이 있으면 통과)
  if (!formData.name.trim()) {
    alert('고객명을 입력해주세요.');
    return;
  }
  if (!formData.phone.trim()) {
    alert('연락처를 입력해주세요.');
    return;
  }

  try {
    const url = `/api/customers/${customerId}`;
    
    // formData에서 NaN 값 제거
    const cleanedFormData = cleanObject(formData);
    console.log('🧹 정리된 formData:', cleanedFormData);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User': currentUser
      },
      body: JSON.stringify(cleanedFormData)
    });
    
    if (response.ok) {
      try {
        const result = await response.json();
        console.log('고객 수정 성공:', result);
      } catch (jsonError) {
        console.log('JSON 파싱 실패, 하지만 수정은 성공:', jsonError);
      }
      
      // 패널 닫기
      const secondaryPanel = document.getElementById('secondaryPanel');
      if (secondaryPanel) {
        secondaryPanel.classList.add('hidden');
        secondaryPanel.classList.remove('visible');
      }
      
      // 고객 목록 새로고침 (강제 새로고침)
      setTimeout(() => {
        // 현재 고객 목록 캐시 무효화
        if (window.currentCustomerList) {
          window.currentCustomerList = null;
        }
        
        // 페이지 새로고침 없이 강제로 고객 목록 새로고침
        if (isUserAdmin()) {
          loadCustomerList('all');
        } else {
          loadCustomerList('own');
        }
        
        // 고객 저장 후 목록 갱신
        if (window.afterCustomerSaved) {
          window.afterCustomerSaved();
        }
        
        // 추가로 1초 후 한 번 더 새로고침 (서버 동기화 지연 고려)
        setTimeout(() => {
          if (isUserAdmin()) {
            loadCustomerList('all');
          } else {
            loadCustomerList('own');
          }
        }, 1000);
      }, 100);
    } else {
      const error = await response.text();
      console.error('고객 수정 실패:', error);
      // 수정에 실패했습니다: ' + error
    }
  } catch (error) {
    console.error('고객 수정 중 오류:', error);
    console.error('오류 타입:', typeof error);
    console.error('오류 메시지:', error.message);
    console.error('오류 스택:', error.stack);
    
    // 더 구체적인 오류 메시지 제공
    let errorMessage = '수정 중 오류가 발생했습니다.';
    if (error.message) {
      errorMessage += ` (${error.message})`;
    }
    // errorMessage
  }
}

// 고객 상태 변경 함수
window.changeCustomerStatus = async function(customerId, newStatus) {
  console.log('🔄 고객 상태 변경:', customerId, '->', newStatus);
  
  try {
    const url = `/api/customers/${customerId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User': currentUser
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (response.ok) {
      console.log('✅ 고객 상태 변경 성공');
      // 고객 목록 새로고침
      loadCustomerList(isUserAdmin() ? 'all' : 'own');
    } else {
      const error = await response.text();
      console.error('❌ 고객 상태 변경 실패:', error);
      // 상태 변경에 실패했습니다: ' + error
    }
  } catch (error) {
    console.error('❌ 고객 상태 변경 중 오류:', error);
    alert('상태 변경 중 오류가 발생했습니다.');
  }
};

// 고객 상태 드롭다운 표시 함수
window.showStatusDropdown = function(event, customerId, currentStatus) {
  event.stopPropagation();
  
  // 기존 드롭다운 제거
  const existingDropdown = document.querySelector('.status-dropdown');
  if (existingDropdown) {
    existingDropdown.remove();
  }
  
  const statusOptions = [
    { value: '생', label: '생성', color: '#28a745', bgColor: '#d4edda' },
    { value: '완', label: '완료', color: '#0c5460', bgColor: '#d1ecf1' },
    { value: '보류', label: '보류', color: '#856404', bgColor: '#fff3cd' },
    { value: '포기', label: '포기', color: '#721c24', bgColor: '#f8d7da' }
  ];
  
  const dropdown = document.createElement('div');
  dropdown.className = 'status-dropdown';
  dropdown.style.cssText = `
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 1000;
    min-width: 80px;
  `;
  
  statusOptions.forEach(option => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 6px 10px;
      cursor: pointer;
      font-size: 11px;
      border-bottom: 1px solid #f0f0f0;
      background: ${option.value === currentStatus ? '#f8f9fa' : 'white'};
    `;
    item.textContent = option.label;
    
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // 이벤트 버블링 방지
      window.changeCustomerStatus(customerId, option.value);
      dropdown.remove();
    });
    
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f8f9fa';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = option.value === currentStatus ? '#f8f9fa' : 'white';
    });
    
    dropdown.appendChild(item);
  });
  
  // 드롭다운을 클릭한 요소에 추가
  event.target.parentNode.style.position = 'relative';
  event.target.parentNode.appendChild(dropdown);
  
  // 외부 클릭 시 드롭다운 닫기
  setTimeout(() => {
    document.addEventListener('click', function closeDropdown() {
      dropdown.remove();
      document.removeEventListener('click', closeDropdown);
    });
  }, 100);
};

// 고객 폼 관련 함수들을 전역으로 export
window.submitCustomerForm = submitCustomerForm;
window.submitCustomerEditForm = submitCustomerEditForm; 