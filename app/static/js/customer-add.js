// app/static/js/customer-add.js

class CustomerAddManager {
    constructor() {
        this.modal = null;
        this.formContainer = null;
        this.currentEditingCustomer = null;
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
        // 🔥 모바일 토글 기능: 이미 열려있으면 닫기
        if (window.MOBILE_APP || (window.innerWidth <= 768)) {
            if (this.modal && !this.modal.classList.contains('hidden')) {
                this.closeModal();
                return;
            }
        }
        
        if (this.modal && this.formContainer) {
            // 초기 UI 설정 (등록 모드)
            this.resetModalUI();
            
            // PC버전의 renderCustomerForm() 함수를 사용해서 폼 렌더링
            if (typeof window.renderCustomerForm === 'function') {
                const originalView = document.getElementById('viewCustomerForm');
                if (originalView) {
                    const originalContent = originalView.innerHTML;
                    if (window.MOBILE_APP) window.isMobileModalMode = true;
                    try {
                        window.renderCustomerForm();
                    } finally {
                        window.isMobileModalMode = false;
                    }
                    this.formContainer.innerHTML = originalView.innerHTML;
                    this.hideDefaultButtons();
                    originalView.innerHTML = originalContent;
                }
            } else {
                console.error('renderCustomerForm 함수를 찾을 수 없습니다.');
                this.formContainer.innerHTML = '<p>고객등록 폼을 로드할 수 없습니다.</p>';
            }
            this.modal.classList.remove('hidden');
            // 🔥 모바일 Z-index 위계 정립 (Layer 3: 4000) [v13.0]
            if (window.MOBILE_APP) {
                this.modal.style.zIndex = '4000';
            }
        }
    }

    // 고객 수정 모달 열기
    openEditModal(customer) {
        if (!this.modal || !this.formContainer) return;

        // UI를 수정 모드로 변경
        const headerTitle = this.modal.querySelector('.modal-header h2');
        if (headerTitle) headerTitle.textContent = "고객 정보 수정";

        const submitBtn = document.getElementById('submitCustomer');
        if (submitBtn) {
            submitBtn.textContent = "수정";
            // 기존 편집 중인 고객 정보 저장 [NEW]
            this.currentEditingCustomer = customer;

            // 기존 이벤트 리스너 제거 (복제하여 교체)
            const newSubmitBtn = submitBtn.cloneNode(true);
            submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
            newSubmitBtn.addEventListener('click', () => this.updateCustomer(customer.id));
        }

        // 폼 렌더링
        if (typeof window.renderCustomerEditForm === 'function') {
            const originalView = document.getElementById('viewCustomerEdit');
            if (originalView) {
                const originalContent = originalView.innerHTML;
                if (window.MOBILE_APP) window.isMobileModalMode = true;
                try {
                    window.renderCustomerEditForm(customer);
                } finally {
                    window.isMobileModalMode = false;
                }
                this.formContainer.innerHTML = originalView.innerHTML;
                this.hideDefaultButtons();
                originalView.innerHTML = originalContent;
            }
        } else {
            console.error('renderCustomerEditForm 함수를 찾을 수 없습니다.');
            this.formContainer.innerHTML = '<p>고객수정 폼을 로드할 수 없습니다.</p>';
        }

        this.modal.classList.remove('hidden');
        // 🔥 모바일 Z-index 위계 정립 (Layer 3: 4000) [v13.0]
        if (window.MOBILE_APP) {
            this.modal.style.zIndex = '4000';
        }
    }

    // 기본 버튼 숨기기
    hideDefaultButtons() {
        const submitBtn = this.formContainer.querySelector('#submitCustomerFormBtn, #submitCustomerEditFormBtn');
        const cancelBtn = this.formContainer.querySelector('#cancelCustomerFormBtn, #cancelCustomerEditFormBtn');
        if (submitBtn) submitBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
    }

    // 모달 UI 초기화
    resetModalUI() {
        const headerTitle = this.modal.querySelector('.modal-header h2');
        if (headerTitle) headerTitle.textContent = "고객등록";

        const submitBtn = document.getElementById('submitCustomer');
        if (submitBtn) {
            submitBtn.textContent = "등록";
            const newSubmitBtn = submitBtn.cloneNode(true);
            submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
            newSubmitBtn.addEventListener('click', () => this.submitCustomer());
        }
    }
    
    closeModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.resetModalUI();
        }
    }
    
    async submitCustomer() {
        if (!window.currentUser) {
            this.showErrorMessage('로그인이 필요합니다.');
            return;
        }

        try {
            const formData = this.collectFormData();
            if (!this.validateForm(formData)) return;
            
            const url = '/api/customers/';
            const cleanedFormData = window.cleanObject ? window.cleanObject(formData) : formData;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User': window.currentUser
                },
                body: JSON.stringify(cleanedFormData)
            });
            
            if (response.ok) {
                this.showSuccessMessage('고객정보가 성공적으로 등록되었습니다.');
                this.closeModal();
                this.refreshCustomerList();
                
                if (window.afterCustomerSaved) {
                    window.afterCustomerSaved();
                }
            } else {
                const errorText = await response.text();
                this.showErrorMessage('고객등록에 실패했습니다: ' + errorText);
            }
        } catch (error) {
            console.error('고객등록 오류:', error);
            this.showErrorMessage('고객등록 중 오류가 발생했습니다.');
        }
    }

    // 고객 정보 업데이트
    async updateCustomer(customerId) {
        if (!window.currentUser) {
            this.showErrorMessage('로그인이 필요합니다.');
            return;
        }

        try {
            const formData = this.collectEditFormData();
            if (!this.validateForm(formData)) return;
            
            const url = `/api/customers/${customerId}`;
            const cleanedFormData = window.cleanObject ? window.cleanObject(formData) : formData;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User': window.currentUser
                },
                body: JSON.stringify(cleanedFormData)
            });
            
            if (response.ok) {
                this.showSuccessMessage('고객정보가 성공적으로 수정되었습니다.');
                this.closeModal();
                this.refreshCustomerList();
                
                // 🔥 모바일 환경: 수정 후 상세 모달로 복귀 [v12.0]
                if (window.MOBILE_APP && window.customerListModalManager && this.currentEditingCustomer) {
                    // 전송한 데이터로 병합하여 표시
                    const updatedCustomer = { ...this.currentEditingCustomer, ...cleanedFormData };
                    
                    // 약간의 지연 후 상세 모달 다시 열기 (애니메이션 겹침 방지)
                    setTimeout(() => {
                        window.customerListModalManager.createCustomerDetailModal(updatedCustomer);
                    }, 100);
                }

                if (window.afterCustomerSaved) {
                    window.afterCustomerSaved();
                }
            } else {
                const errorText = await response.text();
                this.showErrorMessage('고객수정에 실패했습니다: ' + errorText);
            }
        } catch (error) {
            console.error('고객수정 오류:', error);
            this.showErrorMessage('고객수정 중 오류가 발생했습니다.');
        }
    }
    
    collectFormData() {
        const areaVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#frmArea')?.value) : (this.formContainer.querySelector('#frmArea')?.value || '');
        const depositVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#frmDeposit')?.value) : (this.formContainer.querySelector('#frmDeposit')?.value || '');
        const rentVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#frmRent')?.value) : (this.formContainer.querySelector('#frmRent')?.value || '');
        const premiumVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#frmPremium')?.value) : (this.formContainer.querySelector('#frmPremium')?.value || '');
        
        const regionsInput = this.formContainer.querySelector('#frmRegions')?.value || '';
        
        const filterData = {
            region: regionsInput,
            floor: this.formContainer.querySelector('#frmFloor')?.value || '',
            area_real: areaVal,
            deposit: depositVal,
            rent: rentVal,
            premium: premiumVal
        };

        const formData = {
            manager: this.formContainer.querySelector('#frmManager')?.value || '',
            name: this.formContainer.querySelector('#frmName')?.value || '',
            phone: this.formContainer.querySelector('#frmPhone')?.value || '',
            regions: regionsInput,
            floor: filterData.floor,
            area: areaVal,
            deposit: depositVal,
            rent: rentVal,
            premium: premiumVal,
            notes: this.formContainer.querySelector('#frmNotes')?.value || '',
            created_by: window.currentUser,
            created_at: new Date().toISOString()
        };
        
        formData.filter_data = JSON.stringify(filterData);
        return formData;
    }

    collectEditFormData() {
        const areaVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#editArea')?.value) : (this.formContainer.querySelector('#editArea')?.value || '');
        const depositVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#editDeposit')?.value) : (this.formContainer.querySelector('#editDeposit')?.value || '');
        const rentVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#editRent')?.value) : (this.formContainer.querySelector('#editRent')?.value || '');
        const premiumVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#editPremium')?.value) : (this.formContainer.querySelector('#editPremium')?.value || '');
        
        const regionsInput = this.formContainer.querySelector('#editRegions')?.value || '';
        
        const filterData = {
            region: regionsInput,
            floor: this.formContainer.querySelector('#editFloor')?.value || '',
            area_real: areaVal,
            deposit: depositVal,
            rent: rentVal,
            premium: premiumVal
        };

        return {
            manager: this.formContainer.querySelector('#editManager')?.value || '',
            name: this.formContainer.querySelector('#editName')?.value || '',
            phone: this.formContainer.querySelector('#editPhone')?.value || '',
            regions: regionsInput,
            floor_pref: filterData.floor,
            area_pref: areaVal,
            deposit_pref: depositVal,
            rent_pref: rentVal,
            premium_pref: premiumVal,
            notes: this.formContainer.querySelector('#editNotes')?.value || '',
            status: this.formContainer.querySelector('#editStatus')?.value || '생',
            filter_data: JSON.stringify(filterData),
            updated_at: new Date().toISOString()
        };
    }
    
    validateForm(formData) {
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
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }
    
    showErrorMessage(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }
    
    refreshCustomerList() {
        if (window.loadCustomerList) {
            window.loadCustomerList(window.isUserAdmin ? 'all' : 'own');
        }
        if (window.customerListModalManager && window.customerListModalManager.loadCustomerList) {
            window.customerListModalManager.loadCustomerList();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.customerAddManager = new CustomerAddManager();
});
