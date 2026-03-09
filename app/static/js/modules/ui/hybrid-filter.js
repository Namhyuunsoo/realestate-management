/**
 * hybrid-filter.js - 상단 필터바 하이브리드 개편 로직
 * (PC 버전의 상단 필터바를 모달/사이드바와 칩 요약 바 형태로 전환)
 */

(function () {
    // 상태 관리
    const state = {
        isModalOpen: false
    };

    // 초기화 함수
    function init() {
        console.log('🚀 Hybrid Filter Module Initializing...');

        // 0. 하이브리드 모드 클래스 강제 적용
        document.body.classList.add('hybrid-mode');

        // 1. 이벤트 리스너 바인딩
        bindEvents();

        // 2. 초기 요약 칩 렌더링
        updateFilterSummary();

        // 3. 필터 적용 로직 가로채기 (이벤트 전파 활용)
        // 기존 applyAllFilters 호출 후 요약 업데이트가 되도록 감시
    }

    // 이벤트 리스너 바인딩
    function bindEvents() {
        const triggerBtn = document.getElementById('filterTriggerBtn');
        const closeBtn = document.getElementById('modalCloseBtn');
        const overlay = document.getElementById('hybridFilterOverlay');
        const applyBtn = document.getElementById('topFilterApplyBtn');
        const resetBtn = document.getElementById('topFilterResetBtn');

        // 모달 토글
        if (triggerBtn) triggerBtn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) overlay.addEventListener('click', closeModal);

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isModalOpen) closeModal();
        });

        // 필터 적용/초기화 시 요약 업데이트 연동
        // 기존 event-handlers.js에서 이 버튼들에 이벤트를 걸었으므로, 
        // 여기서는 추가적으로 요약 업데이트만 수행하도록 래핑하거나 이벤트를 추가합니다.
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                // 약간의 지연을 주어 globals.js의 EFFECTIVE_FILTERS가 업데이트되길 기다림
                setTimeout(() => {
                    updateFilterSummary();
                    closeModal();
                }, 100);
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                setTimeout(() => {
                    updateFilterSummary();
                    // 초기화 시에는 모달을 닫지 않는 것이 사용자 경험상 좋을 수 있으나, 
                    // 현재 로직에 따라 판단. 일단 유지.
                }, 100);
            });
        }
    }

    // 모달 열기
    function openModal() {
        const modal = document.getElementById('hybridFilterModal');
        const overlay = document.getElementById('hybridFilterOverlay');
        if (modal && overlay) {
            // 현재 모드에 따라 필터 섹션 토글
            const isHousing = window.UI_STATE && window.UI_STATE.listingMode === 'housing';
            const commSection = document.getElementById('modalCommercialFilter');
            const housSection = document.getElementById('modalHousingFilter');

            if (commSection && housSection) {
                if (isHousing) {
                    commSection.style.display = 'none';
                    housSection.style.display = 'grid';
                    commSection.classList.add('hidden');
                    housSection.classList.remove('hidden');
                } else {
                    commSection.style.display = 'grid';
                    housSection.style.display = 'none';
                    commSection.classList.remove('hidden');
                    housSection.classList.add('hidden');
                }
            }

            modal.classList.add('show');
            overlay.classList.add('show');
            state.isModalOpen = true;
            document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
        }
    }

    // 모달 닫기
    function closeModal() {
        const modal = document.getElementById('hybridFilterModal');
        const overlay = document.getElementById('hybridFilterOverlay');
        if (modal && overlay) {
            modal.classList.remove('show');
            overlay.classList.remove('show');
            state.isModalOpen = false;
            document.body.style.overflow = '';
        }
    }

    // 필터 요약 칩 업데이트
    function updateFilterSummary() {
        const summaryArea = document.getElementById('filterSummaryArea');
        if (!summaryArea) return;

        summaryArea.innerHTML = '';

        // globals.js의 EFFECTIVE_FILTERS 또는 직접 DOM에서 값 읽기
        // 여기서는 직관적으로 실시간 적용된 필터를 보여주기 위해 EFFECTIVE_FILTERS 사용 권장
        const filters = window.EFFECTIVE_FILTERS || {};

        // 표시할 라벨 매핑 (모든 가용한 필터 필드 대응)
        const labelMap = {
            region: '지역',
            jibun: '지번',
            region2: '지역2',
            building: '건물',
            floor: '층',
            store: '가게',
            status: '현황',
            deposit: '보증',
            rent: '월세',
            premium: '권리',
            area_sale: '분양',
            area_real: '전용',
            manager: '담당',
            phone: '연락처',
            client: '의뢰인',
            note: '비고',
            note3: '비고3',
            type: '유형',
            dong: '동',
            ho: '호수',
            direction: '향',
            supply: '공급',
            exclusive: '전용',
            rooms: '방',
            bath: '화장실',
            tenant: '임차인',
            sale_price: '매매',
            yield: '수익'
        };

        let count = 0;
        Object.keys(filters).forEach(key => {
            const val = filters[key];
            // 값이 있고, '전체'가 아닌 경우만 표시 (0은 유효한 값으로 취급)
            if (val !== undefined && val !== null && val !== '' && val !== '전체') {
                // 주택 필터(tf_h_...) 또는 상가 필터(tf_...) 접두사 제거
                const cleanKey = key.replace(/^modal_/, '').replace(/^tf_h_/, '').replace(/^tf_/, '');
                const label = labelMap[cleanKey] || cleanKey;

                const chip = document.createElement('div');
                chip.className = 'filter-chip';
                chip.innerHTML = `
                  <span>${label}: ${val}</span>
                  <span class="remove-chip" data-key="${key}">&times;</span>
                `;

                chip.querySelector('.remove-chip').addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeFilter(key);
                });

                summaryArea.appendChild(chip);
                count++;
            }
        });

        // 필터가 하나도 없으면 메시지 표시 (옵션)
        if (count === 0) {
            summaryArea.innerHTML = '<span style="color:#aaa; font-size:11px; margin-left:4px;">적용된 필터 없음</span>';
        }
    }

    // 개별 필터 제거
    function removeFilter(key) {
        // ID 접두사 후보 (상가: tf_, 주택: tf_h_)
        const prefixes = ['tf_', 'tf_h_'];
        let input = null;

        // 1. 직접 ID로 시도
        input = document.getElementById(key);

        // 2. 접두사 붙여서 시도
        if (!input) {
            for (const p of prefixes) {
                const targetId = p + key.replace('tf_h_', '').replace('tf_', '');
                input = document.getElementById(targetId);
                if (input) break;
            }
        }

        if (input) {
            if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }

            // 기존 필터 적용 함수 호출
            if (typeof window.applyAllFilters === 'function') {
                window.applyAllFilters();
            }

            // 요약 업데이트
            setTimeout(updateFilterSummary, 100);
        } else {
            console.warn(`⚠️ 필터 요소를 찾을 수 없음: ${key}`);
            // 요소는 못 찾았지만 EFFECTIVE_FILTERS에서 강제로 지우고 다시 적용 시도
            if (window.EFFECTIVE_FILTERS) {
                delete window.EFFECTIVE_FILTERS[key];
                if (typeof window.applyAllFilters === 'function') {
                    window.applyAllFilters();
                }
                setTimeout(updateFilterSummary, 100);
            }
        }
    }

    // 전역 노출
    window.HybridFilter = {
        init,
        updateSummary: updateFilterSummary,
        open: openModal,
        close: closeModal
    };

    // DOM 로드 완료 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
