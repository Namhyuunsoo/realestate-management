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
        // 🔥 모바일 토글 기능: 이미 열려있으면 닫기
        if (window.MOBILE_APP || (window.innerWidth <= 768)) {
            if (this.modal && !this.modal.classList.contains('hidden')) {
                this.closeModal();
                return;
            }
        }
        
        if (this.modal && this.formContainer) {
            // PC버전의 renderCustomerForm() 함수를 사용해서 폼 렌더링
            if (typeof window.renderCustomerForm === 'function') {
                // 임시로 2차 사이드바에 렌더링한 후 내용을 가져옴
                const originalView = document.getElementById('viewCustomerForm');
                if (originalView) {
                    // 기존 내용 백업
                    const originalContent = originalView.innerHTML;
                    
                    // 모바일 환경에서는 showSecondaryPanel 호출을 건너뛰도록 플래그 설정
                    if (window.MOBILE_APP) window.isMobileModalMode = true;
                    
                    try {
                        // PC버전 함수로 폼 렌더링
                        window.renderCustomerForm();
                    } finally {
                        // 모바일 플래그 제거
                        window.isMobileModalMode = false;
                    }
                    
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
        if (!window.currentUser) {
            this.showErrorMessage('로그인이 필요합니다.');
            return;
        }

        try {
            // 폼 데이터 수집 (PC방식 필터데이터 포함)
            const formData = this.collectFormData();
            
            // 유효성 검사
            if (!this.validateForm(formData)) {
                return;
            }
            
            // URL은 최신 RESTful API 방식 사용
            const url = '/api/customers/';
            
            // formData에서 NaN 값 제거 (PC 로직 복제)
            const cleanedFormData = window.cleanObject ? window.cleanObject(formData) : formData;
            
            // API 직접 호출
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User': window.currentUser
                },
                body: JSON.stringify(cleanedFormData)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccessMessage('고객정보가 성공적으로 등록되었습니다.');
                this.closeModal();
                this.refreshCustomerList();
                
                // 저장 후 발생 이벤트 트리거 (PC 동기화)
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
    
    collectFormData() {
        const areaVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#frmArea')?.value) : (this.formContainer.querySelector('#frmArea')?.value || '');
        const depositVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#frmDeposit')?.value) : (this.formContainer.querySelector('#frmDeposit')?.value || '');
        const rentVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#frmRent')?.value) : (this.formContainer.querySelector('#frmRent')?.value || '');
        const premiumVal = window.cleanValue ? window.cleanValue(this.formContainer.querySelector('#frmPremium')?.value) : (this.formContainer.querySelector('#frmPremium')?.value || '');
        
        const formData = {
            manager: this.formContainer.querySelector('#frmManager')?.value || '',
            name: this.formContainer.querySelector('#frmName')?.value || '',
            phone: this.formContainer.querySelector('#frmPhone')?.value || '',
            regions: this.formContainer.querySelector('#frmRegions')?.value || '',
            floor: this.formContainer.querySelector('#frmFloor')?.value || '',
            area: areaVal,
            deposit: depositVal,
            rent: rentVal,
            premium: premiumVal,
            notes: this.formContainer.querySelector('#frmNotes')?.value || '',
            created_by: window.currentUser,
            created_at: new Date().toISOString()
        };
        
        // 지역명 정규화 (PC 동기화)
        function normalizeRegion(region) {
            if (!region) return region;
            region = region.trim();
            if (region.includes("구 전체") || region.includes("구 전부")) {
                return region.split("구")[0] + "구";
            }
            if (region.includes("구전체") || region.includes("구전부")) {
                return region.split("구전체")[0] + "구";
            }
            if (region.includes("시 전체") || region.includes("시 전부")) {
                return region.split("시")[0] + "시";
            }
            if (region.includes("시전체") || region.includes("시전부")) {
                return region.split("시전체")[0] + "시";
            }
            return region;
        }

        const normalizedRegion = normalizeRegion(formData.regions);

        // 필터 전용 데이터 구성
        const filterData = {
            region: normalizedRegion,
            floor: formData.floor,
            area_real: formData.area,
            deposit: formData.deposit,
            rent: formData.rent,
            premium: formData.premium
        };

        formData.filter_data = JSON.stringify(filterData);
        
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
