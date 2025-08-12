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