/* -----------------------------------------
 * event-handlers.js - 이벤트 핸들러 관련 함수들
 * ----------------------------------------- */

/**************************************
 * ===== 이벤트 핸들러 관련 함수들 =====
 **************************************/

// 고객 상태 필터 변경 핸들러
window.handleStatusFilterChange = function() {
  const statusFilter = document.getElementById('customerStatusFilter');
  if (statusFilter) {
    const selectedStatus = statusFilter.value;
    console.log('🔄 상태 필터 변경:', selectedStatus);
    
    // 현재 고객 목록에서 필터링
    if (window.currentCustomerList) {
      let filteredList = window.currentCustomerList;
      
      if (selectedStatus !== 'all') {
        filteredList = window.currentCustomerList.filter(customer => 
          (customer.status || '생') === selectedStatus
        );
      }
      
      // 필터링된 목록만 렌더링 (필터는 유지)
      renderFilteredCustomerList(filteredList);
    }
  }
};

// 고객 필터 변경 핸들러
window.handleCustomerFilterChange = function() {
  const filterSelect = document.getElementById('customerFilterSelect');
  if (filterSelect) {
    const selectedFilter = filterSelect.value;
    loadCustomerList(selectedFilter);
  }
};

// 고객 수정 함수
window.editCustomer = function(id) {
  const c = (window.currentCustomerData || []).find(x => x.id === id);
  if (!c) return;
  renderCustomerForm(c);
};

// 고객 삭제 함수
window.deleteCustomer = async function(id) {
  if (!confirm('정말로 이 고객을 삭제하시겠습니까?')) return;
  const c = (window.currentCustomerData || []).find(x => x.id === id);
  if (!c) {
    // 삭제할 고객 정보를 찾을 수 없습니다.
    return;
  }
  try {
    const response = await fetch(`/api/customers/${c.id}`, {
      method: 'DELETE',
      headers: { 'X-User': currentUser }
    });
    if (response.ok) {
      showToast('고객이 삭제되었습니다.', 'success');
      renderCustomerListAndDetail();
    } else {
      // 고객 삭제에 실패했습니다.
    }
  } catch (error) {
    // 고객 삭제 중 오류가 발생했습니다.
  }
};

// 이벤트 핸들러 관련 함수들을 전역으로 export
window.handleStatusFilterChange = window.handleStatusFilterChange;
window.handleCustomerFilterChange = window.handleCustomerFilterChange;
window.editCustomer = window.editCustomer;
window.deleteCustomer = window.deleteCustomer; 

/**************************************
 * ===== 새로고침 버튼 이벤트 =====
 **************************************/

function initRefreshButton() {
  const refreshBtn = document.getElementById('refreshDataBtn');
  if (!refreshBtn) {
    console.warn('⚠️ 새로고침 버튼을 찾을 수 없습니다.');
    return;
  }
  
  refreshBtn.addEventListener('click', async function() {
    if (this.classList.contains('loading')) {
      console.log('🔄 이미 새로고침 중입니다.');
      return;
    }
    
    try {
      console.log('🔄 매물 데이터 새로고침 시작...');
      
      // 버튼 상태 변경
      this.classList.add('loading');
      this.innerHTML = '<span class="control-icon">⏳</span> 새로고침 중...';
      this.disabled = true;
      
      // 토스트 메시지 표시
      if (typeof showToast === 'function') {
        showToast('매물 데이터를 새로고침하고 있습니다...', 'info');
      }
      
      // 강제 새로고침으로 데이터 로드
      const response = await fetch('/api/listings?force=1', {
        headers: { 'X-User': currentUser }
      });
      
      if (!response.ok) {
        throw new Error(`새로고침 실패: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ 새로고침 완료');
      
      // 성공 메시지
      if (typeof showToast === 'function') {
        showToast(`✅ ${data.total}개 매물 데이터가 새로고침되었습니다.`, 'success');
      }
      
      // 마지막 업데이트 시간 표시
      updateLastUpdateTime();
      
      // 매물 목록 새로고침
      if (typeof refreshListingList === 'function') {
        console.log('🔄 매물 목록 새로고침...');
        await refreshListingList();
      }
      
      // 지도 마커 새로고침
      if (typeof refreshMapMarkers === 'function') {
        console.log('🔄 지도 마커 새로고침...');
        await refreshMapMarkers();
      }
      
      // 상태 카운트 업데이트
      if (typeof updateStatusCounts === 'function') {
        console.log('🔄 상태 카운트 업데이트...');
        updateStatusCounts();
      }
      
      console.log('🎉 모든 새로고침 작업 완료!');
      
    } catch (error) {
      console.error('❌ 새로고침 실패:', error);
      
      if (typeof showToast === 'function') {
        showToast('❌ 데이터 새로고침에 실패했습니다.', 'error');
      }
    } finally {
      // 버튼 상태 복원
      this.classList.remove('loading');
      this.innerHTML = '🔄 새로고침';
      this.disabled = false;
    }
  });
  
  console.log('✅ 새로고침 버튼 이벤트 등록 완료');
}

function updateLastUpdateTime() {
  const lastUpdateElement = document.getElementById('lastUpdateTime');
  if (lastUpdateElement) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    lastUpdateElement.textContent = timeString;
    console.log('🕐 마지막 업데이트 시간 업데이트:', timeString);
  } else {
    console.warn('⚠️ 마지막 업데이트 시간 요소를 찾을 수 없습니다.');
  }
}

// 전역 함수로 등록
window.initRefreshButton = initRefreshButton;
window.updateLastUpdateTime = updateLastUpdateTime; 