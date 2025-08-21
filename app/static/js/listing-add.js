// app/static/js/listing-add.js

class ListingAddManager {
    constructor() {
        this.modal = null;
        this.form = null;
        this.init();
    }
    
    init() {
        this.modal = document.getElementById('listingAddModal');
        this.form = document.getElementById('listingAddForm');
        this.bindEvents();
        this.setDefaultDate();
    }
    
    bindEvents() {
        // 매물등록 버튼 클릭
        const addListingBtn = document.getElementById('addListingBtn');
        if (addListingBtn) {
            addListingBtn.addEventListener('click', () => this.openModal());
        }
        
        // 모달 닫기 버튼
        const closeBtn = document.getElementById('closeListingModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        // 취소 버튼
        const cancelBtn = document.getElementById('cancelListing');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
        
        // 등록 버튼
        const submitBtn = document.getElementById('submitListing');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitListing());
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
    
    setDefaultDate() {
        // 접수날짜를 오늘 날짜를 250821 형식으로 설정
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2); // 연도 뒤 2자리
        const month = String(today.getMonth() + 1).padStart(2, '0'); // 월 2자리
        const day = String(today.getDate()).padStart(2, '0'); // 일 2자리
        
        const dateString = `${year}${month}${day}`; // 예: 250821
        
        const dateInput = document.getElementById('접수날짜');
        if (dateInput) {
            dateInput.value = dateString;
        }
    }
    
    openModal() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.setDefaultDate();
            this.clearForm();
        }
    }
    
    closeModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }
    
    clearForm() {
        if (this.form) {
            this.form.reset();
            this.setDefaultDate();
        }
    }
    
    async submitListing() {
        try {
            // 폼 데이터 수집
            const formData = this.collectFormData();
            
            // 유효성 검사
            if (!this.validateForm(formData)) {
                return;
            }
            
            // API 호출
            const response = await fetch('/api/listing-add/add', {
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
                // 매물 목록 새로고침 (필요시)
                this.refreshListings();
            } else {
                this.showErrorMessage(result.error || '매물등록에 실패했습니다.');
            }
            
        } catch (error) {
            console.error('매물등록 오류:', error);
            this.showErrorMessage('매물등록 중 오류가 발생했습니다.');
        }
    }
    
    collectFormData() {
        const formData = {};
        const formElements = this.form.elements;
        
        for (let element of formElements) {
            if (element.name && element.value !== '') {
                formData[element.name] = element.value;
            }
        }
        
        // 숨김 필드들도 포함
        const hiddenFields = ['현황', '지역2', '간략한위치'];
        hiddenFields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                formData[field] = element.value;
            }
        });
        
        return formData;
    }
    
    validateForm(formData) {
        // 연락처만 필수 입력
        if (!formData['연락처'] || formData['연락처'].trim() === '') {
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
    
    refreshListings() {
        // 매물 목록 새로고침 (필요시)
        // 기존 새로고침 함수가 있다면 호출
        if (window.refreshListings) {
            window.refreshListings();
        }
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.listingAddManager = new ListingAddManager();
});
