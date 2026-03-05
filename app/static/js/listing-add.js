// app/static/js/listing-add.js

// 5개 매물 유형별 헤더 구성 세팅 (A열 ''(빈칸) 제거 후 순수 필드만)
const LISTING_HEADERS = {
    '상가임대차': [
        "접수일", "지역", "지번", "건물명", "층수", "가게명", "분양", "실평수",
        "보증금", "월세", "권리금", "비고", "담당자", "현황", "지역2", "연락처",
        "의뢰인", "비고3", "위반여부", "현수막번호", "간략한위치"
    ],
    '구분상가매매': [
        "접수일", "지역", "지번", "건물명", "층수", "가게명", "분양(㎡)", "분양(평)",
        "전용(평)", "보증금", "월세", "매매가", "평당가격", "LTV", "이율", "수익율",
        "비고", "담당자", "현황", "소유주", "연락처"
    ],
    '건물토지매매': [
        "접수일", "지역", "지번", "건물명", "지하총층", "지상총층", "대지(㎡)", "대지(평)",
        "건축(㎡)", "연(㎡)", "보증금", "월세", "매매가", "평당가격", "LTV", "이율",
        "수익율", "비고", "담당자", "현황", "소유자", "소유자관계", "연락처"
    ],
    '주택 매매': [
        "접수일", "지역", "지번", "유형", "건물명", "동", "층수", "호수", "향",
        "공급", "전용", "보증금", "월세", "관리비", "매매가", "방", "화장실",
        "평당가격", "LTV", "이율", "수익율", "의뢰인", "관계", "연락처", "임차인 연락처",
        "비고", "거래유형", "현황", "지역2"
    ],
    '주택임대차': [
        "접수일", "지역", "지번", "유형", "건물명", "동", "층수", "호수", "향",
        "공급", "전용", "보증금", "월세", "관리비", "매매가", "방", "화장실",
        "평당가격", "LTV", "이율", "수익율", "의뢰인", "관계", "연락처", "임차인 연락처",
        "비고", "거래유형", "현황", "지역2"
    ]
};

// 동적으로 폼을 구성할 때, 특별한 입력 타입/플레이스홀더/readonly 등을 적용할 필드 정의
const FIELD_PROPS = {
    "접수일": { readonly: true, placeholder: "자동입력" },
    "현황": { type: "hidden", value: "생" },
    "보증금": { placeholder: "만 단위 숫자", type: "number" },
    "월세": { placeholder: "만 단위 숫자", type: "number" },
    "매매가": { placeholder: "만 단위 숫자", type: "number" },
    "권리금": { placeholder: "만 단위 숫자", type: "number" },
    "수익율": { readonly: true, placeholder: "자동계산 (%)" },
    "평당가격": { readonly: true, placeholder: "자동계산 (만원)" },
    "연락처": { required: true, placeholder: "010-1234-5678" }
};

class ListingAddManager {
    constructor() {
        this.modal = null;
        this.form = null;
        this.dynamicContainer = null;
        this.currentType = null;
        this.autoFillData = null; // 지도 등에서 넘어온 사전 입력 데이터
        this.init();
    }

    init() {
        this.modal = document.getElementById('listingAddModal');
        this.form = document.getElementById('listingAddForm');
        this.dynamicContainer = document.getElementById('dynamicFormContainer');
        this.bindEvents();
    }

    bindEvents() {
        // 기존 📝 매물등록 버튼 클릭
        const addListingBtn = document.getElementById('addListingBtn');
        if (addListingBtn) {
            addListingBtn.addEventListener('click', () => {
                if (window.MOBILE_APP || (window.innerWidth <= 768)) {
                    if (this.modal && !this.modal.classList.contains('hidden')) {
                        this.closeModal();
                        return;
                    }
                }
                this.openModal();
            });
        }

        const closeBtn = document.getElementById('closeListingModal');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());

        const cancelBtn = document.getElementById('cancelListing');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        const submitBtn = document.getElementById('submitListing');
        if (submitBtn) submitBtn.addEventListener('click', () => this.submitListing());

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeModal();
            });
        }

        // 1단계: 매물 유형 선택 탭 이벤트
        const typeButtons = document.querySelectorAll('#listingTypeSelector .type-btn');
        typeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 활성화 토글 UI
                typeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 선택된 유형 렌더링
                const targetType = btn.dataset.type;
                this.selectTypeAndRender(targetType);
            });
        });
    }

    // 모달을 열 때, 사전에 넘겨받은 데이터(예: 지도 클릭)가 있다면 유지
    openModal(presetData = null) {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.autoFillData = presetData;

            // 모달 열 때 폼과 탭 뷰 초기화
            this.clearForm();
            this.dynamicContainer.style.display = 'none';
            document.getElementById('매물유형').value = "";
            this.currentType = null;
            document.querySelectorAll('#listingTypeSelector .type-btn').forEach(b => b.classList.remove('active'));
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.autoFillData = null; // 초기화
        }
    }

    clearForm() {
        if (this.form) {
            this.form.reset();
            this.dynamicContainer.innerHTML = '';
        }
    }

    // [핵심] 유형 선택 시 동적 폼 그리기
    selectTypeAndRender(type) {
        this.currentType = type;
        document.getElementById('매물유형').value = type;

        const headers = LISTING_HEADERS[type];
        if (!headers) {
            console.error("Not found headers for type: ", type);
            return;
        }

        // 폼 HTML 구성
        let htmlChunks = [];
        let currentRow = [];

        headers.forEach((fieldStr, index) => {
            // 개행이 포함된 시트 헤더 방어 (예: '현\n황')
            const field = fieldStr.replace('\n', '');

            const prop = FIELD_PROPS[field] || {};
            const isHidden = prop.type === 'hidden';

            if (isHidden) {
                // 숨김 필드는 별도 구성
                htmlChunks.push(`<input type="hidden" id="${field}" name="${field}" value="${prop.value || ''}">`);
                return;
            }

            // 일반 필드 렌더링
            const requiredAttr = prop.required ? 'required' : '';
            const readonlyAttr = prop.readonly ? 'readonly' : '';
            const typeAttr = prop.type || 'text';
            const placeholderAttr = prop.placeholder || (field.includes('비고') ? '비고사항' : field);

            // 넓은 필드(비고 등)는 한 줄을 꽉 채움
            const isFullWidth = field.includes('비고') || field.includes('위치');

            const groupHtml = `
              <div class="form-group ${isFullWidth ? 'full-width' : ''}">
                <label for="${field}">${field}</label>
                ${isFullWidth
                    ? `<textarea id="${field}" name="${field}" placeholder="${placeholderAttr}" rows="3" ${requiredAttr} ${readonlyAttr}></textarea>`
                    : `<input type="${typeAttr}" id="${field}" name="${field}" placeholder="${placeholderAttr}" ${requiredAttr} ${readonlyAttr}>`
                }
              </div>
            `;

            if (isFullWidth) {
                // 모아둔 일반 행 내보내고, 꽉찬 행 내보냄
                if (currentRow.length > 0) {
                    htmlChunks.push(`<div class="form-row">${currentRow.join('')}</div>`);
                    currentRow = [];
                }
                htmlChunks.push(`<div class="form-row">${groupHtml}</div>`);
            } else {
                currentRow.push(groupHtml);
                // 2개가 모이면 한 줄row로 배출
                if (currentRow.length === 2) {
                    htmlChunks.push(`<div class="form-row">${currentRow.join('')}</div>`);
                    currentRow = [];
                }
            }
        });

        // 남아있는 홀수개 요소 처리
        if (currentRow.length > 0) {
            htmlChunks.push(`<div class="form-row">${currentRow.join('')}</div>`);
        }

        // 동적 영역 갱신 및 활성화
        this.dynamicContainer.innerHTML = htmlChunks.join('');
        this.dynamicContainer.style.display = 'block';

        // 기초 데이터 렌더(날짜 및 넘겨받은 파라미터)
        this.setDefaultDate();
        this.applyAutoFillData();

        // 수익률 / 평당가격 자동계산 이벤트 리스너 바인딩
        this.setupAutoCalculations();
    }

    setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateString = `${year}${month}${day}`;

        const dateInput = document.getElementById('접수일');
        if (dateInput) dateInput.value = dateString;
    }

    applyAutoFillData() {
        console.log('applyAutoFillData 호출됨', this.autoFillData);
        if (!this.autoFillData) return;

        // 약간의 지연(setTimeout)을 주어 동적으로 추가된 DOM이 확실히 렌더링된 후 값을 주입
        setTimeout(() => {
            Object.keys(this.autoFillData).forEach(key => {
                // id로 먼저 찾고, 없으면 name 속성으로 찾음
                let el = document.getElementById(key);
                if (!el && this.dynamicContainer) {
                    el = this.dynamicContainer.querySelector(`[name="${key}"]`);
                }

                console.log(`자동 주입 대상 필드 탐색 - key: ${key}, value: ${this.autoFillData[key]}, el:`, el);

                if (el) {
                    el.value = this.autoFillData[key];
                    console.log(`=> 필드(${key})에 값 세팅 성공`);
                } else {
                    console.warn(`=> 필드(${key})를 문서에서 찾을 수 없어 값 세팅 실패`);
                }
            });
        }, 50);
    }

    // 수익율/평당가격 실시간 계산 이벤트
    setupAutoCalculations() {
        const fields = ['보증금', '월세', '매매가', 'LTV', '이율', '분양(평)', '전용(평)', '대지(평)'];
        const elements = {};

        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) {
                elements[f] = el;
                // input, keyup 모두 캐치
                el.addEventListener('input', () => this.calculateMetrics(elements));
            }
        });
    }

    calculateMetrics(els) {
        // 숫자 파싱 유틸
        const getV = (key) => {
            const val = els[key] ? parseFloat(els[key].value) : 0;
            return isNaN(val) ? 0 : val;
        };

        const deposit = getV('보증금');
        const rent = getV('월세');
        const price = getV('매매가');
        const ltv = getV('LTV');
        const rate = getV('이율');

        // 1. 평당가격 계산 (매매가 / 기준 면적)
        // 구분상가매매: 분양(평) 기준. 건물토지매매: 대지(평) 기준
        const pyeongEl = document.getElementById('평당가격');
        if (pyeongEl && price > 0) {
            const areaUnit = getV('분양(평)') || getV('대지(평)') || 1;
            const unitPrice = price / areaUnit;
            pyeongEl.value = unitPrice.toFixed(0);
        }

        // 2. 수익률 계산
        const yieldEl = document.getElementById('수익율');
        if (yieldEl && price > 0) {
            let yieldPercent = 0;
            // 대출이 없는 경우
            if (ltv === 0 && rate === 0) {
                const denominator = price - deposit;
                if (denominator > 0) {
                    yieldPercent = ((rent * 12) / denominator) * 100;
                }
            } else {
                // 대출이 있는 경우
                const loanAmt = price * (ltv / 100);
                const annualInterest = loanAmt * (rate / 100);
                const denominator = price - deposit - loanAmt;
                if (denominator > 0) {
                    yieldPercent = ((rent * 12 - annualInterest) / denominator) * 100;
                }
            }
            yieldEl.value = yieldPercent > 0 ? yieldPercent.toFixed(2) : '';
        }
    }

    async submitListing() {
        if (!this.currentType) {
            this.showErrorMessage("먼저 매물 종류를 1단계에서 선택해주세요.");
            return;
        }

        try {
            const formData = this.collectFormData();
            if (!this.validateForm(formData)) return;

            const submitBtn = document.getElementById('submitListing');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = "등록 중...";
            }

            const response = await fetch('/api/listing-add/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccessMessage(result.message);
                this.closeModal();
                if (window.refreshListings) window.refreshListings();
            } else {
                this.showErrorMessage(result.error || '매물등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('매물등록 오류:', error);
            this.showErrorMessage('네트워크 오류가 발생했습니다.');
        } finally {
            const submitBtn = document.getElementById('submitListing');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "등록";
            }
        }
    }

    collectFormData() {
        const formData = {};
        const formElements = this.form.elements;

        for (let element of formElements) {
            if (element.name && element.value !== '') {
                // '\n' 제거된 깨끗한 이름을 헤더명으로 복구할 필요 없이 API/백엔드에서 매핑
                formData[element.name] = element.value;
            }
        }
        return formData;
    }

    validateForm(formData) {
        if (!formData['연락처'] || formData['연락처'].trim() === '') {
            this.showErrorMessage('연락처는 필수 입력 항목입니다.');
            return false;
        }
        return true;
    }

    showSuccessMessage(message) {
        if (window.showToast) window.showToast(message, 'success');
        else alert(message);
    }

    showErrorMessage(message) {
        if (window.showToast) window.showToast(message, 'error');
        else alert(message);
    }
}

// 전역 호출을 위한 인터페이스 개방 (지도 터치 컨텍스트 연동용)
window.openListingModalWithData = function (autoFillData) {
    if (window.listingAddManager) {
        window.listingAddManager.openModal(autoFillData);
    }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.listingAddManager = new ListingAddManager();
});
