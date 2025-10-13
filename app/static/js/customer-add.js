// app/static/js/customer-add.js

class CustomerAddManager {
    constructor() {
        this.modal = null;
        this.formContainer = null;
        this.init();
    }
    
    init() {
        this.modal = document.getElementById('customerAddModal');
        this.formContainer = document.getElementById('customerFormContainer');
        this.bindEvents();
    }
    
    bindEvents() {
        // 모달 닫기 버튼
        const closeBtn = document.getElementById('closeCustomerModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        // 취소 버튼
        const cancelBtn = document.getElementById('cancelCustomer');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
        
        // 등록 버튼
        const submitBtn = document.getElementById('submitCustomer');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitCustomer());
        }
        
        // 모달 외부 클릭 시 닫기
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }
    }
    
    openModal() {
        if (this.modal && this.formContainer) {
            // PC버전의 renderCustomerForm() 함수를 사용해서 폼 렌더링
            if (typeof window.renderCustomerForm === 'function') {
                // 임시로 2차 사이드바에 렌더링한 후 내용을 가져옴
                const originalView = document.getElementById('viewCustomerForm');
                if (originalView) {
                    // 기존 내용 백업
                    const originalContent = originalView.innerHTML;
                    
                    // 모바일 환경에서는 showSecondaryPanel 호출을 건너뛰도록 플래그 설정
                    window.isMobileModalMode = true;
                    
                    // PC버전 함수로 폼 렌더링
                    window.renderCustomerForm();
                    
                    // 모바일 플래그 제거
                    window.isMobileModalMode = false;
                    
                    // 렌더링된 내용을 모달로 복사
                    this.formContainer.innerHTML = originalView.innerHTML;
                    
                    // 모달 내부의 등록/취소 버튼 숨기기
                    const submitBtn = this.formContainer.querySelector('#submitCustomerFormBtn');
                    const cancelBtn = this.formContainer.querySelector('#cancelCustomerFormBtn');
                    if (submitBtn) submitBtn.style.display = 'none';
                    if (cancelBtn) cancelBtn.style.display = 'none';
                    
                    // 기존 내용 복원
                    originalView.innerHTML = originalContent;
                } else {
                    console.error('viewCustomerForm 요소를 찾을 수 없습니다.');
                }
            } else {
                console.error('renderCustomerForm 함수를 찾을 수 없습니다.');
                this.formContainer.innerHTML = '<p>고객등록 폼을 로드할 수 없습니다.</p>';
            }
            
            this.modal.classList.remove('hidden');
        }
    }
    
    closeModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }
    
    async submitCustomer() {
        try {
            // 폼 데이터 수집
            const formData = this.collectFormData();
            
            // 유효성 검사
            if (!this.validateForm(formData)) {
                return;
            }
            
            // PC버전의 고객 저장 로직 사용
            if (typeof window.saveCustomer === 'function') {
                const result = await window.saveCustomer(formData);
                
                if (result && result.success !== false) {
                    this.showSuccessMessage('고객이 성공적으로 등록되었습니다.');
                    this.closeModal();
                    // 고객 목록 새로고침 (필요시)
                    this.refreshCustomerList();
                } else {
                    this.showErrorMessage(result?.error || '고객등록에 실패했습니다.');
                }
            } else {
                // PC버전 저장 함수가 없으면 직접 API 호출
                const response = await fetch('/api/customers/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showSuccessMessage(result.message);
                    this.closeModal();
                    this.refreshCustomerList();
                } else {
                    this.showErrorMessage(result.error || '고객등록에 실패했습니다.');
                }
            }
            
        } catch (error) {
            console.error('고객등록 오류:', error);
            this.showErrorMessage('고객등록 중 오류가 발생했습니다.');
        }
    }
    
    collectFormData() {
        const formData = {};
        
        // 모달 내부의 폼 필드들 수집
        const inputs = this.formContainer.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.id && input.value !== '') {
                // PC버전 필드 ID를 실제 필드명으로 매핑
                const fieldMapping = {
                    'frmManager': 'manager',
                    'frmName': 'name',
                    'frmPhone': 'phone',
                    'frmRegions': 'regions',
                    'frmFloor': 'floor_pref',
                    'frmBudget': 'budget',
                    'frmType': 'type_pref',
                    'frmSize': 'size_pref',
                    'frmNotes': 'notes'
                };
                
                const fieldName = fieldMapping[input.id] || input.id;
                formData[fieldName] = input.value;
            }
        });
        
        return formData;
    }
    
    validateForm(formData) {
        // 필수 필드 검사
        if (!formData.manager || formData.manager.trim() === '') {
            this.showErrorMessage('담당자는 필수 입력 항목입니다.');
            return false;
        }
        
        if (!formData.name || formData.name.trim() === '') {
            this.showErrorMessage('고객명은 필수 입력 항목입니다.');
            return false;
        }
        
        if (!formData.phone || formData.phone.trim() === '') {
            this.showErrorMessage('연락처는 필수 입력 항목입니다.');
            return false;
        }
        
        return true;
    }
    
    showSuccessMessage(message) {
        // 성공 메시지 표시 (기존 토스트 시스템 사용)
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }
    
    showErrorMessage(message) {
        // 에러 메시지 표시 (기존 토스트 시스템 사용)
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }
    
    refreshCustomerList() {
        // 고객 목록 새로고침 (필요시)
        if (window.loadCustomerList) {
            window.loadCustomerList(window.isUserAdmin ? 'all' : 'own');
        }
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.customerAddManager = new CustomerAddManager();
});
