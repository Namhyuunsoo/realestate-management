// app/static/js/listing-list-modal.js

// HTML 이스케이프 함수 (전역 사용)
function escapeHtml(str) {
    const safeStr = String(str ?? "");
    const div = document.createElement("div");
    div.textContent = safeStr;
    return div.innerHTML;
}

function toTelPhone(phone) {
    if (!phone) return "";
    const normalized = String(phone).replace(/[^0-9+]/g, "");
    return normalized.replace(/(?!^)\+/g, "");
}

class ListingListModalManager {
    constructor() {
        this.modal = null;
        this.modalContent = null;
        this.dragHandle = null;
        this.container = null;
        this.detailContainer = null;
        this.detailContent = null;
        this.isDragging = false;
        this.startY = 0;
        this.startHeight = 0;

        // 네비게이션 스택 관리
        this.navigationStack = [];
        this.currentState = 'listing'; // 'listing', 'cluster', 'detail'
        this.clusterData = null;

        // 닫기 작업 진행 중 플래그 (중복 실행 방지)
        this.isClosing = false;
        // 무한 스크롤 관련 상태
        this.listingsData = [];
        this.renderedCount = 0;
        this.BATCH_SIZE = 20;

        // 사진 편집 모드 상태
        this.isPhotoEditMode = false;
        this.isPhotoDeleteMode = false;
        this.selectedPhotoFiles = new Set();

        this.init();
    }

    init() {
        this.modal = document.getElementById('listingListModal');
        this.modalContent = this.modal?.querySelector('.modal-content');
        this.dragHandle = document.getElementById('listingListDragHandle');
        this.container = document.getElementById('listingListContainer');
        this.createDetailContainer();
        this.bindEvents();
        this.bindGlobalListeners(); // 🔥 추가: 전역 이벤트 위임
    }

    createDetailContainer() {
        // 매물 상세정보 컨테이너 동적 생성
        this.detailContainer = document.createElement('div');
        this.detailContainer.id = 'listingDetailContainer';
        this.detailContainer.className = 'hidden';
        this.detailContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            z-index: 10;
            display: none;
            height: 100%;
            overflow: hidden;
            width: 100%;
        `;

        // 뒤로가기 버튼
        const detailHeader = document.createElement('div');
        detailHeader.className = 'detail-header';
        detailHeader.style.cssText = `
            padding: 12px 16px;
            border-bottom: 1px solid #e0e0e0;
            background: #f8f9fa;
            display: flex;
            justify-content: flex-end;
            align-items: center;
        `;

        const backBtn = document.createElement('button');
        backBtn.id = 'listingDetailBackBtn';
        backBtn.className = 'detail-back-btn';
        backBtn.innerHTML = '&times;';
        backBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            color: #666;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        detailHeader.appendChild(backBtn);

        // 상세정보 내용 영역
        this.detailContent = document.createElement('div');
        this.detailContent.id = 'listingDetailContent';
        this.detailContent.style.cssText = `
            padding: 16px;
            height: calc(100% - 60px);
            overflow-y: auto;
            overflow-x: hidden;
        `;

        this.detailContainer.appendChild(detailHeader);
        this.detailContainer.appendChild(this.detailContent);

        // 모달 바디에 추가
        const modalBody = this.modalContent.querySelector('.modal-body');
        if (modalBody) {
            modalBody.appendChild(this.detailContainer);
        }
    }

    bindEvents() {
        // 모달 닫기 버튼
        const closeBtn = document.getElementById('closeListingListModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // 모달 외부 클릭 시 닫기 기능 제거 (지도 터치를 위해)
        // if (this.modal) {
        //     this.modal.addEventListener('click', (e) => {
        //         if (e.target === this.modal) {
        //             this.closeModal();
        //         }
        //     });
        // }

        // 뒤로가기 버튼 이벤트 - 중복 등록 방지
        const backBtn = document.getElementById('listingDetailBackBtn');
        if (backBtn) {
            // 기존 리스너 제거 (중복 방지)
            const existingHandler = backBtn._detailBackHandler;
            if (existingHandler) {
                backBtn.removeEventListener('click', existingHandler);
            }

            // 새 핸들러 생성 및 저장
            const detailBackHandler = () => {
                // 닫기 작업이 이미 진행 중이면 무시
                if (this.isClosing) {
                    return;
                }

                // 상태 확인 후 닫기
                if (this.currentState === 'detail' && this.detailContainer && this.detailContainer.style.display === 'block') {
                    this.isClosing = true;
                    this.showListingList();
                    // 닫기 작업 완료 후 플래그 해제 (짧은 지연으로 중복 클릭 방지)
                    setTimeout(() => {
                        this.isClosing = false;
                    }, 300);
                }
            };

            backBtn._detailBackHandler = detailBackHandler;
            backBtn.addEventListener('click', detailBackHandler);
        }

        // 드래그 핸들 이벤트
        if (this.dragHandle) {
            this.dragHandle.addEventListener('mousedown', (e) => this.startDrag(e));
            this.dragHandle.addEventListener('touchstart', (e) => this.startDrag(e));
        }

        // 드래그 중 이벤트
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('touchmove', (e) => this.drag(e));

        // 드래그 종료 이벤트
        document.addEventListener('mouseup', () => this.endDrag());
        document.addEventListener('touchend', () => this.endDrag());
    }

    bindGlobalListeners() {
        // 🔥 근본 해결: 이벤트 위임(Event Delegation) 단일화
        // 모달 내의 모든 클릭/터치 이벤트를 이 한 곳에서만 관리합니다.

        // 터치 상태 추적용 초기값 (클로저 변수가 아닌 클래스 속성으로 관리 가능하지만 여기서는 지역 변수로 유지)
        let touchStartY = 0;
        let touchStartTime = 0;
        let isScrolling = false;

        if (this.modalContent) {
            // 터치 시작
            this.modalContent.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
                isScrolling = false;
            }, { passive: true });

            // 터치 이동
            this.modalContent.addEventListener('touchmove', (e) => {
                const touchY = e.touches[0].clientY;
                const deltaY = Math.abs(touchY - touchStartY);
                if (deltaY > 10) isScrolling = true;
            }, { passive: true });

            // 터치 종료 (리스트 아이템 클릭 처리)
            this.modalContent.addEventListener('touchend', (e) => {
                const touchDuration = Date.now() - touchStartTime;
                if (!isScrolling && touchDuration < 300) {
                    // 🔥 근본 해결: 클릭된 대상이 버튼이나 대화형 요소인지 확인
                    if (e.target.closest('button, select, input, a, .recommendation-star, .listing-detail-briefing-status')) {
                        return; // 대화형 요소면 리스트 선택 로직 실행 안 함
                    }

                    const li = e.target.closest('li[data-id]');
                    if (li) {
                        e.preventDefault();
                        e.stopPropagation();

                        const listingId = li.getAttribute('data-id');
                        this.handleItemSelection(listingId);
                    }
                }
                setTimeout(() => { isScrolling = false; }, 100);
            }, { passive: false });

            // 클릭 이벤트 (PC 마우스 및 Ghost Click 대응)
            this.modalContent.addEventListener('click', (e) => {
                if (isScrolling) return;

                // 🔥 근본 해결: 클릭된 대상이 버튼이나 대화형 요소인지 확인
                if (e.target.closest('button, select, input, a, .recommendation-star, .listing-detail-briefing-status')) {
                    return; // 대화형 요소는 각각의 고유 리스너가 처리하게 둠
                }

                const li = e.target.closest('li[data-id]');
                if (li) {
                    e.stopPropagation();
                    const listingId = li.getAttribute('data-id');
                    this.handleItemSelection(listingId);
                }
            });
        }
    }

    handleItemSelection(listingId) {
        if (!listingId) return;

        let listing = window.FILTERED_LISTINGS.find(l => String(l.id) === String(listingId));
        if (!listing && window.LISTINGS) {
            listing = window.LISTINGS.find(l => String(l.id) === String(listingId));
        }

        if (listing) {
            // 클러스터 목록에서 진입하는 경우 스택에 추가
            if (this.currentState === 'cluster' && this.clusterData) {
                // 이미 스택에 동일한 클러스터가 있는지 확인
                const last = this.navigationStack[this.navigationStack.length - 1];
                if (!last || last.state !== 'cluster') {
                    this.navigationStack.push({
                        state: 'cluster',
                        data: this.clusterData
                    });
                }
            }
            this.showListingDetail(listing);
        }
    }

    async openModal(mode = 'toggle') {
        // 🔥 근본 해결: 모달을 열 때 상세페이지 레이어가 남아있으면 강제 숨김
        if (this.detailContainer) {
            this.detailContainer.style.display = 'none';
        }

        // 🔥 근본 해결: 모달 개폐 의도를 명확히 처리
        const isHidden = !this.modal || this.modal.classList.contains('hidden');

        // 'open' 모드이거나, 'toggle' 인데 닫혀있는 경우에만 엽니다.
        if (mode === 'open' || (mode === 'toggle' && isHidden)) {
            if (!isHidden) return Promise.resolve(); // 이미 열려있으면 무시
        } else if (mode === 'close' || (mode === 'toggle' && !isHidden)) {
            this.closeModal();
            return Promise.resolve();
        }


        try {
            if (!this.modal || !this.container) {
                console.error('❌ 모달 또는 컨테이너를 찾을 수 없습니다');
                return Promise.reject(new Error('모달 또는 컨테이너를 찾을 수 없습니다'));
            }

            // 사용자 인증 상태 확인 및 강화
            if (!window.currentUser || !currentUser) {

                // localStorage에서 사용자 정보 복원 시도
                const savedUser = localStorage.getItem('X-USER');
                if (savedUser) {
                    window.currentUser = savedUser;
                    currentUser = savedUser;
                } else {
                    this.container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">로그인이 필요합니다.<br><small>페이지를 새로고침해주세요.</small></p>';
                    this.modal.classList.remove('hidden');

                    // 🔥 모바일 깜박임 방지: 리스트 모달 수준에서는 지도를 숨기지 않습니다. (v5.15 화이트아웃 해결)
                    return Promise.resolve(); // 모달은 열었지만 에러 상태
                }
            }

            // 전역 변수 동기화 보장
            if (window.currentUser && !currentUser) {
                currentUser = window.currentUser;
            }

            // 보안 강화: 사용자 정보 로깅 제거
            // console.log('📱 매물리스트 모달: 사용자 인증 확인됨, currentUser:', window.currentUser);

            // 모바일에서 데이터가 없으면 강제로 로드
            if (!window.LISTINGS || window.LISTINGS.length === 0) {

                // currentUser가 없으면 localStorage에서 복원
                if (!window.currentUser) {
                    const savedUser = localStorage.getItem('X-USER');
                    if (savedUser) {
                        window.currentUser = savedUser;
                        currentUser = savedUser;
                    }
                }

                // fetchListings 강제 실행
                if (window.currentUser && typeof window.fetchListings === 'function') {
                    try {
                        await window.fetchListings(true); // force=true로 강제 로드
                    } catch (error) {
                        console.error('📱 모바일: fetchListings 강제 실행 실패:', error);
                    }
                }
            }

            // 필터링 상태 확인 및 적용
            if (typeof window.applyAllFilters === 'function') {

                // 필터가 설정되어 있는 경우에만 필터링 실행
                const hasFilters = Object.keys(window.EFFECTIVE_FILTERS || {}).length > 0 ||
                    Object.keys(window.TOP_FILTERS || {}).some(k => window.TOP_FILTERS[k] && window.TOP_FILTERS[k].trim() !== "");

                if (hasFilters) {
                    window.applyAllFilters();
                } else {
                    // 기존 FILTERED_LISTINGS가 없으면 LISTINGS 사용
                    if (!window.FILTERED_LISTINGS || window.FILTERED_LISTINGS.length === 0) {
                        window.FILTERED_LISTINGS = [...(window.LISTINGS || [])];
                    }
                }
            } else {
                console.warn('⚠️ applyAllFilters 함수를 찾을 수 없습니다');
                // 함수가 없으면 LISTINGS 사용
                if (!window.FILTERED_LISTINGS || window.FILTERED_LISTINGS.length === 0) {
                    window.FILTERED_LISTINGS = [...(window.LISTINGS || [])];
                }
            }

            // 이전 중복 체크 코드 제거 (함수 상단에서 처리됨)

            // 매물리스트 렌더링
            await this.renderListingList();

            // 모달 표시
            this.modal.classList.remove('hidden');

            // 🔥 모바일 깜박임 방지: 리스트 모달 수준에서는 지도를 숨기지 않습니다. (v5.15 화이트아웃 해결)
            // (상세페이지나 편집모드와 같이 전체 화면을 덮을 때만 개별적으로 숨깁니다)

            // 모달이 열린 상태를 보장하기 위해 Promise 반환
            return Promise.resolve();

        } catch (error) {
            console.error('❌ 매물리스트 모달 열기 중 오류:', error);
            if (this.container) {
                this.container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">오류가 발생했습니다.<br><small>페이지를 새로고침해주세요.</small></p>';
            }
            if (this.modal) {
                this.modal.classList.remove('hidden');
            }
        }
    }

    closeModal() {

        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        window.isMobileModalMode = false;

        // 🔥 모바일 깜박임 방지: 배경 지도(map) 복구 (v5.15)
        const mapEl = document.getElementById('map');
        if (mapEl) {
            mapEl.style.visibility = 'visible';
        }

        // 🔥 파생 사이드바도 닫기 (상세정보 패널, 클러스터 목록 등)
        if (this.detailContainer && !this.detailContainer.classList.contains('hidden')) {
            this.detailContainer.classList.add('hidden');
            this.detailContainer.style.display = 'none';
        }

        // 네비게이션 스택 초기화
        this.navigationStack = [];
        this.currentState = 'listing';
        this.clusterData = null;

        // 🔥 근본 해결: 모달 전체가 닫힐 때도 이전에 열었던 매물ID를 반드시 초기화
        // 이를 누락하면, 다시 목록이나 클러스터를 열었을 때 해당 매물이 먹통이 됨
        this.currentListingId = null;
    }

    // bindListItemEvents: 더 이상 사용하지 않으므로 빈 함수로 두거나 제거 가능
    // 호환성을 위해 빈 함수로 둡니다.
    bindListItemEvents() { }

    showListingDetail(listing, opts = {}) {
        if (!listing) return;

        // 🔥 근본 해결: 이미 같은 매물이 열려있으면 중복 렌더링(Wipeout) 방지
        if (this.currentListingId === String(listing.id)) {
            // console.log('이미 동일한 매물이 열려있어 렌더링을 생략합니다:', listing.id);
            return;
        }
        this.currentListingId = String(listing.id);

        // 현재 상태를 네비게이션 스택에 저장
        // detail 상태가 아닐 때만 스택에 추가 (중복 푸시 방지)
        // 단일 마커 진입 시 fromMarker 플래그로 구분 (닫기 시 모달만 닫음)
        if (this.currentState !== 'detail') {
            const lastStackItem = this.navigationStack.length > 0 ? this.navigationStack[this.navigationStack.length - 1] : null;
            if (!lastStackItem || lastStackItem.state !== this.currentState) {
                this.navigationStack.push({
                    state: opts.fromMarker ? 'fromMarker' : this.currentState,
                    data: this.currentState === 'cluster' ? this.clusterData : null
                });
            }
        }

        // 매물 상세정보 표시
        if (this.detailContainer && this.detailContent) {

            // 현재 상태를 'detail'로 변경
            this.currentState = 'detail';

            // 🔥 근본 해결: 렌더링 전 이전 데이터 잔상 물리적 소거 (Ghosting 방지)
            this.detailContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">로딩 중...</div>';

            // 모바일 모달 모드 플래그 설정 (2차 사이드바 열기 방지)
            // 🔥 환경 격리: 모바일 앱일 때만 플래그 설정
            if (window.MOBILE_APP) {
                window.isMobileModalMode = true;
            }

            const fields = listing.fields || {};
            const addr = listing.address_full || '';
            const isHousingDetail = (typeof listing.id === 'string' && listing.id.startsWith('h_')) || (window.UI_STATE && window.UI_STATE.listingMode === "housing");
            const formatSupplyExclDetail = typeof window.formatSupplyExclusive === "function" ? window.formatSupplyExclusive : (s, e) => (s || e) ? `${s || "-"}/${e || "-"}` : "-/-";
            const row = (l, v) => `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;"><span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">${l}</span><span style="color: #666; font-size: 13px;">${escapeHtml(String(v || '-'))}</span></div>`;
            const rowPhone = (l, v) => {
                const safeValue = String(v || "").trim();
                const telPhone = toTelPhone(safeValue);
                const phoneContent = telPhone
                    ? `<a href="tel:${telPhone}" style="color: #0d6efd; text-decoration: none;">${escapeHtml(safeValue)}</a>`
                    : escapeHtml(safeValue || "-");
                return `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;"><span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">${l}</span><span style="color: #666; font-size: 13px;">${phoneContent}</span></div>`;
            };
            const titleName = isHousingDetail
                ? ((fields['건물명'] || '') + (fields['동'] ? ' ' + fields['동'] : '') + (fields['호수'] ? ' ' + fields['호수'] : '') || '매물명 없음')
                : (fields['가게명'] || fields['건물명'] || '매물명 없음');
            const statusDisplay = (typeof getStatusDisplay === 'function' ? getStatusDisplay(listing.status_raw) : listing.status_raw) || '-';

            // 🆕 현황 수정 권한 체크 (PC 버전 detail-panel.js와 동일하게 일원화)
            const userRole = (localStorage.getItem("X-USER-ROLE") || "user").toLowerCase();
            const isAdmin = userRole === "admin";
            const userName = localStorage.getItem("X-USER-NAME");
            
            let assignedSlots = [];
            try {
                assignedSlots = JSON.parse(localStorage.getItem("X-USER-ASSIGNED-SLOTS") || "[]");
            } catch (e) {}

            // 슬롯 ID 추출 (다양한 경로 대응)
            const slotId = listing.slot_id || (listing.fields && listing.fields.slot_id);

            const isAssignedManager = (slotId && assignedSlots.some(s => String(s) === String(slotId))) || 
                                     (userName && (fields['담당자'] === userName || fields['manager'] === userName || listing.manager_name === userName));
            
            const canEditStatus = isAdmin || isAssignedManager;

            // 🆕 현황 row 조건부 렌더링
            const rowStatus = () => {
                const statusValue = statusDisplay || '-';

                if (canEditStatus) {
                    return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">현황</span>
                        <span style="color: #007bff; cursor: pointer; text-decoration: underline; font-weight: bold; font-size: 13px;"
                              onclick="changeListingStatus('${listing.id}', '${listing.status_raw || ''}')">${escapeHtml(String(statusValue))} 📝</span>
                    </div>`;
                } else {
                    return row('현황', statusValue);
                }
            };

            let rows = "";
            if (isHousingDetail) {
                rows = row('접수일', fields['접수일']) + row('지역', fields['지역']) + row('지번', fields['지번']) + row('유형', fields['유형']) + row('건물명', fields['건물명']) + row('동', fields['동']) + row('층수', fields['층수']) + row('호수', fields['호수']) + row('향', fields['향']) + row('공급/전용', formatSupplyExclDetail(fields['공급'], fields['전용'])) + row('보증금', fields['보증금']) + row('월세', fields['월세']) + row('관리비', fields['관리비']) + row('매매가', fields['매매가']) + row('방', fields['방']) + row('화장실', fields['화장실']) + row('거래유형', fields['거래유형']) + row('소유자', fields['의뢰인']) + row('소유자관계', fields['관계']) + rowPhone('연락처', fields['연락처']) + rowPhone('임차인 연락처', fields['임차인 연락처']) + row('비고', fields['비고']) + rowStatus() + row('지역2', fields['지역2']);
            } else {
                rows = row('접수일', fields['접수일']) + row('지역', fields['지역']) + row('지번', fields['지번']) + row('건물명', fields['건물명']) + row('가게명', fields['가게명']) + row('층수', fields['층수']) + row('실평수', fields['실평수'] ? fields['실평수'] + '평' : '') + row('보증금', fields['보증금']) + row('월세', fields['월세']) + row('권리금', fields['권리금']) + row('비고', fields['비고']) + row('소유자', fields['의뢰인']) + row('소유자관계', fields['비고3']) + rowPhone('연락처', fields['연락처']) + rowStatus() + row('담당자', fields['담당자'] || fields['manager']);
            }
            const briefingStatus = typeof getBriefingStatus === 'function' ? getBriefingStatus(listing.id) : 'none';
            const briefingText = typeof getBriefingStatusText === 'function' ? getBriefingStatusText(briefingStatus) : '';
            const briefingHtml = briefingText ? ` <span class="listing-detail-briefing-status briefing-${briefingStatus}" onclick="typeof cycleBriefingStatus==='function'&&cycleBriefingStatus(${JSON.stringify(String(listing.id))})" style="cursor:pointer;">${escapeHtml(briefingText)}</span>` : '';
            this.detailContent.innerHTML = `
                <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <div style="font-size: 16px; font-weight: bold; color: #333; flex: 1; margin-right: 8px;">${escapeHtml(titleName)}</div>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            <button id="mobilePhotoCountBtn" style="background: #0d6efd; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; white-space: nowrap;">
                                📷 사진(-)
                            </button>
                            <button id="mobilePhotoEditBtn" style="background: #6c757d; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 3px;">
                                <span>⚙️</span> 사진편집
                            </button>
                        </div>
                    </div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 10px;">📍 ${escapeHtml(addr || '주소 정보 없음')}${briefingHtml}</div>
                    
                    <!-- 숨김 파일 입력 -->
                    <input type="file" id="mobilePhotoInput" style="display: none;" accept="image/*" multiple>
                </div>
                <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px;">${rows}</div>
            `;

            // 백그라운드에서 사진 API 호출 → 버튼 숫자 업데이트 + 캐싱
            this.loadMobilePhotos(listing.id);

            // 사진 보기 버튼 이벤트 바인딩
            const countBtn = document.getElementById('mobilePhotoCountBtn');
            if (countBtn) {
                countBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault(); // 모바일 터치 시 의도치 않은 스크롤/포커스 점프 차단
                    // 캐싱된 사진이 있으면 즉시 Lightbox 열기
                    if (window._currentMobilePhotos && window._currentMobilePhotos.length > 0) {
                        window.openLightbox && window.openLightbox(window._currentMobilePhotos, 0);
                    } else {
                        // 아직 로딩 안됐거나 사진 없음 → 재시도
                        this.loadMobilePhotos(listing.id);
                    }
                };
            }

            // 업로드 버튼 이벤트 바인딩
            const uploadBtn = document.getElementById('mobilePhotoUploadBtn');
            const editBtn = document.getElementById('mobilePhotoEditBtn');
            const fileInput = document.getElementById('mobilePhotoInput');

            if (uploadBtn && fileInput) {
                uploadBtn.onclick = (e) => {
                    e.stopPropagation();
                    fileInput.click();
                };
                fileInput.onchange = (e) => this.handleMobilePhotoUpload(listing.id, e);
            }

            if (editBtn) {
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.enterPhotoEditMode(listing);
                };
            }


            // 상세정보 컨테이너 표시
            this.detailContainer.style.display = 'block';
            this.container.style.display = 'none';

            // 🔥 모바일 깜박임 방지 전략 수정 (v5.17): 상세창 진입 시에는 지도를 숨기지 않고 유지합니다.
            // (사용자가 사진을 보거나 편집 버튼을 누를 때만 선택적으로 숨겨 개방감을 확보합니다)
            const mapEl = document.getElementById('map');
            if (mapEl) {
                mapEl.style.visibility = 'visible'; // 명시적으로 노출 유지
            }

            // 현재 상태를 'detail'로 변경
            this.currentState = 'detail';

            // 모바일 모달 모드 플래그 설정 (2차 사이드바 열기 방지)
            if (window.MOBILE_APP) {
                window.isMobileModalMode = true;
            }
        } else {
            console.error('detailContainer 또는 detailContent를 찾을 수 없습니다');
        }
    }

    // 사진 편집 모드 진입
    enterPhotoEditMode(listing) {
        this.isPhotoEditMode = true;
        this.isPhotoDeleteMode = false;
        this.selectedPhotoFiles.clear();

        // v6.2: 수칙(Rule 39) 준수를 위해 지도를 숨기지 않고 CSS 레이어 격리만 사용

        // 🔥 사진 관리 모드 전체 화면화: 모달 높이를 확충하여 환경 격리
        if (this.modalContent) {
            this._originalModalHeight = this.modalContent.style.height;
            this.modalContent.style.height = '100dvh';
            this.modalContent.style.top = '0';
        }

        this.renderPhotoEditUI(listing);
    }

    // 사진 편집 모드 종료
    exitPhotoEditMode(listing) {
        this.isPhotoEditMode = false;
        this.isPhotoDeleteMode = false;
        this.selectedPhotoFiles.clear();

        // v6.6: 닫기 애니메이션 안정화를 위해 미세 지연 후 상세정보 렌더링
        setTimeout(() => {
            if (this.modalContent && this._originalModalHeight) {
                this.modalContent.style.height = this._originalModalHeight;
                this.modalContent.style.top = '';
            }
            this.showListingDetail(listing);
        }, 30);
    }

    // 사진 편집 UI 렌더링
    renderPhotoEditUI(listing) {
        if (!this.detailContent) return;

        const fields = listing.fields || {};
        const titleName = (fields['가게명'] || fields['건물명'] || '매물명 없음');

        this.detailContent.innerHTML = `
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="font-size: 16px; font-weight: bold; color: #333;">🖼️ 사진 관리 - ${escapeHtml(titleName)}</div>
                    <button class="photo-edit-btn cancel" id="exitPhotoEditBtn" style="padding: 4px 10px; font-size: 11px;">닫기</button>
                </div>
                
                <!-- 상단 안내 문구 -->
                <div id="photoEditTip" style="font-size: 12px; color: #666; margin-bottom: 12px; padding: 8px; background: white; border-radius: 4px;">
                    등록된 사진을 추가하거나 삭제할 수 있습니다.
                </div>

                <!-- 사진 그리드 -->
                <div id="mobilePhotoGallery" class="detail-photo-gallery" style="margin-top: 10px; min-height: 200px;">
                    <div style="grid-column: span 3; color: #999; font-size: 11px; text-align: center; padding: 20px;">사진을 불러오는 중...</div>
                </div>

                <!-- 숨김 파일 입력 -->
                <input type="file" id="mobilePhotoInput" style="display: none;" accept="image/*" multiple>
            </div>

            <!-- 하단 액션 바 (v6.5: 불투명화 및 하드웨어 가속 강제) -->
            <div class="photo-edit-actions" id="photoEditActions" style="background: #f8f9fa !important; box-shadow: 0 -2px 10px #ccc; transform: translateZ(0);">
                <button class="photo-edit-btn upload" id="photoEditUploadBtn">📷 사진 등록</button>
                <button class="photo-edit-btn delete" id="photoEditDeleteStartBtn">🗑️ 사진 삭제</button>
            </div>
        `;

        // 이벤트 바인딩
        document.getElementById('exitPhotoEditBtn').onclick = () => this.exitPhotoEditMode(listing);

        const uploadBtn = document.getElementById('photoEditUploadBtn');
        const fileInput = document.getElementById('mobilePhotoInput');
        if (uploadBtn && fileInput) {
            uploadBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => this.handleMobilePhotoUpload(listing.id, e);
        }

        const deleteStartBtn = document.getElementById('photoEditDeleteStartBtn');
        if (deleteStartBtn) {
            deleteStartBtn.onclick = () => this.enterDeleteMode(listing);
        }

        // 사진 로드 (편집 모드 전용 - Gallery Grid에 렌더링)
        this.loadEditModePhotos(listing.id);
    }

    // 편집 모드 전용 사진 로더 (Gallery Grid에 이미지 삽입)
    async loadEditModePhotos(listingId) {
        const gallery = document.getElementById('mobilePhotoGallery');
        if (!gallery) return;

        try {
            const response = await fetch(`/api/listings/${listingId}/photos`);
            const data = await response.json();

            if (data.success && data.photos && data.photos.length > 0) {
                window._currentMobilePhotos = data.photos;

                gallery.innerHTML = data.photos.map((photo, idx) => `
                    <div class="gallery-item ${this.isPhotoDeleteMode ? 'edit-mode' : ''} ${this.selectedPhotoFiles.has(String(photo.id)) ? 'selected' : ''}" 
                         data-filename="${photo.file_name}"
                         data-id="${photo.id}"
                         onclick="${this.isPhotoDeleteMode 
                            ? `(window.listingListModalManager || this).togglePhotoSelection('${photo.id}')` 
                            : `window.openLightbox && window.openLightbox(window._currentMobilePhotos, ${idx})`}">
                        <img src="${photo.full_url}" alt="매물사진" decoding="async" style="transform: translateZ(0); pointer-events: none;" onerror="this.src='/static/img/no-image.png'">
                    </div>
                `).join('');
            } else {
                gallery.innerHTML = '<div style="grid-column: span 3; color: #999; font-size: 11px; text-align: center; padding: 5px;">등록된 사진이 없습니다.</div>';
            }
        } catch (error) {
            console.error('사진 로드 중 오류:', error);
            gallery.innerHTML = '<div style="grid-column: span 3; color: #f44336; font-size: 11px; text-align: center; padding: 5px;">사진 로딩 실패</div>';
        }
    }

    // 삭제 모드 진입
    enterDeleteMode(listing) {
        this.isPhotoDeleteMode = true;
        this.selectedPhotoFiles.clear();

        // UI 업데이트
        const tip = document.getElementById('photoEditTip');
        if (tip) {
            tip.innerHTML = '<b style="color: #f44336;">삭제할 사진들을 터치하여 선택하세요.</b>';
            tip.style.background = '#ffffff';
            tip.style.border = '2px solid #f44336';
        }

        const actions = document.getElementById('photoEditActions');
        if (actions) {
            actions.innerHTML = `
                <button class="photo-edit-btn confirm" id="confirmDeleteBtn">✅ 삭제 확정 (0)</button>
                <button class="photo-edit-btn cancel" id="cancelDeleteModeBtn">❌ 취소</button>
            `;

            document.getElementById('cancelDeleteModeBtn').onclick = () => {
                this.isPhotoDeleteMode = false;
                this.renderPhotoEditUI(listing);
            };

            document.getElementById('confirmDeleteBtn').onclick = () => this.deleteSelectedPhotos(listing);
        }

        // 갤러리 갱신 (선택 가능하게)
        this.refreshGalleryUI();
    }

    // 갤러리 UI만 갱신 (상태에 따른 선택 표시)
    refreshGalleryUI() {
        const galleryItems = document.querySelectorAll('.gallery-item');
        galleryItems.forEach(item => {
            const photoId = item.getAttribute('data-id');
            if (this.isPhotoDeleteMode) {
                item.classList.add('edit-mode');
                if (this.selectedPhotoFiles.has(photoId)) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            } else {
                item.classList.remove('edit-mode', 'selected');
            }
        });

        // 삭제 버튼 숫자 업데이트
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmBtn) {
            confirmBtn.textContent = `✅ 삭제 확정 (${this.selectedPhotoFiles.size})`;
            confirmBtn.disabled = this.selectedPhotoFiles.size === 0;
            confirmBtn.style.opacity = this.selectedPhotoFiles.size === 0 ? '0.5' : '1';
        }
    }

    // 사진 선택 토글 (v8.9: 파일명 대신 DB ID 사용)
    togglePhotoSelection(photoId) {
        if (!this.isPhotoDeleteMode) return;

        if (this.selectedPhotoFiles.has(photoId)) {
            this.selectedPhotoFiles.delete(photoId);
        } else {
            this.selectedPhotoFiles.add(photoId);
        }
        this.refreshGalleryUI();
    }

    // 선택된 사진 일괄 삭제
    async deleteSelectedPhotos(listing) {
        if (!this.selectedPhotoFiles || this.selectedPhotoFiles.size === 0) return;

        if (!confirm(`${this.selectedPhotoFiles.size}장의 사진을 삭제하시겠습니까?`)) return;

        const listingId = listing.id;
        const photosToDelete = Array.from(this.selectedPhotoFiles);
        let successCount = 0;
        let failCount = 0;

        // 버튼 비활성화 및 로딩 상태 표시
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const originalText = confirmBtn ? confirmBtn.textContent : '';
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = '⏳ 삭제 중...';
        }

        try {
            // 순차적 삭제 (v8.9: 서버 규격에 맞게 /api/listings/photos/<id> 호출)
            for (const photoId of photosToDelete) {
                try {
                    const response = await fetch(`/api/listings/photos/${photoId}`, {
                        method: 'DELETE',
                        headers: {
                            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                        }
                    });
                    const data = await response.json();
                    if (data.success) {
                        successCount++;
                    } else {
                        console.warn(`사진 삭제 실패 (ID: ${photoId}):`, data.error);
                        failCount++;
                    }
                } catch (e) {
                    console.error(`사진 삭제 통신 오류 (ID: ${photoId}):`, e);
                    failCount++;
                }
            }

            // 결과 안내
            if (successCount > 0) {
                if (typeof showToast === 'function') {
                    showToast(`${successCount}장의 사진이 삭제되었습니다.`, 'success');
                }
            }
            if (failCount > 0) {
                alert(`${failCount}장의 사진 삭제에 실패했습니다. 네트워크 상태를 확인해주세요.`);
            }

        } catch (globalError) {
            console.error('사진 일괄 삭제 프로세스 오류:', globalError);
            alert('삭제 작업 중 예상치 못한 오류가 발생했습니다.');
        } finally {
            // 삭제 모드 해제 및 UI 강제 리프레시 (안전성 확보)
            this.isPhotoDeleteMode = false;
            this.selectedPhotoFiles.clear();
            
            // UI 복구
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText;
            }
            
            this.renderPhotoEditUI(listing); 
        }
    }

    async loadMobilePhotos(listingId) {
        const countBtn = document.getElementById('mobilePhotoCountBtn');
        if (!countBtn) return;

        try {
            const response = await fetch(`/api/listings/${listingId}/photos`);
            const data = await response.json();

            // 사진 데이터 캐싱 (Lightbox 스와이프용)
            if (data.success && data.photos && data.photos.length > 0) {
                window._currentMobilePhotos = data.photos;
                countBtn.textContent = `📷 사진(${data.photos.length})`;
            } else {
                window._currentMobilePhotos = [];
                countBtn.textContent = `📷 사진(0)`;
            }
        } catch (error) {
            console.error('사진 로드 중 오류:', error);
            // 네트워크 실패 시 버튼 상태 유지 (사진(-))
        }
    }

    async handleMobilePhotoUpload(listingId, event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // 업로드 버튼 찾기 (상세보기 창 또는 편집 창)
        const uploadBtn = document.getElementById('mobilePhotoUploadBtn') || document.getElementById('photoEditUploadBtn');
        const originalText = uploadBtn ? uploadBtn.innerHTML : '';
        const totalFiles = files.length;
        let successCount = 0;
        let failCount = 0;

        try {
            // 업로드 중 상태 표시
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = `<span>⏳</span> 1/${totalFiles} 업로드 중...`;
            }

            // 병렬 업로드 처리
            const uploadPromises = files.map(async (file, index) => {
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const response = await fetch(`/api/listings/${listingId}/photos`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                        }
                    });

                    const data = await response.json();
                    if (data.success) {
                        successCount++;
                        // 진행 상황 업데이트
                        if (uploadBtn && totalFiles > 1) {
                            uploadBtn.innerHTML = `<span>⏳</span> ${Math.min(index + 1, successCount + failCount)}/${totalFiles} 업로드 중...`;
                        }
                        return { success: true };
                    } else {
                        failCount++;
                        console.error(`업로드 실패 (${file.name}):`, data.error);
                        return { success: false, error: data.error };
                    }
                } catch (err) {
                    failCount++;
                    console.error(`업로드 오류 (${file.name}):`, err);
                    return { success: false, error: err.message };
                }
            });

            // 모든 업로드 완료 대기
            await Promise.all(uploadPromises);

            // 결과 알림
            if (successCount > 0) {
                const msg = totalFiles === 1
                    ? '사진이 등록되었습니다.'
                    : `${successCount}장의 사진이 등록되었습니다.${failCount > 0 ? ` (${failCount}장 실패)` : ''}`;
                if (typeof showToast === 'function') showToast(msg, failCount > 0 ? 'warning' : 'success');

                // 갤러리 새로고침 (편집 모드 여부에 따라)
                if (this.isPhotoEditMode) {
                    const listing = (window.FILTERED_LISTINGS || []).find(l => String(l.id) === String(listingId)) ||
                        (window.LISTINGS || []).find(l => String(l.id) === String(listingId));
                    if (listing) {
                        this.renderPhotoEditUI(listing);
                    } else {
                        await this.loadEditModePhotos(listingId);
                    }
                } else {
                    await this.loadMobilePhotos(listingId);
                }
            }

            if (failCount > 0 && successCount === 0) {
                alert('모든 사진 업로드에 실패했습니다.');
            }
        } catch (error) {
            console.error('사진 업로드 중 오류:', error);
            alert('사진 업로드 중 오류가 발생했습니다.');
        } finally {
            // 🔥 안전하게 DOM에서 다시 조회하여 버튼 상태 복원
            const currentUploadBtn = document.getElementById('photoEditUploadBtn');
            if (currentUploadBtn) {
                currentUploadBtn.disabled = false;
                currentUploadBtn.innerHTML = originalText;
            }
            event.target.value = ''; // 초기화
        }
    }

    async renderListingList() {

        // currentUser가 없으면 localStorage에서 복원 시도
        if (!window.currentUser) {
            const savedUser = localStorage.getItem('X-USER');
            if (savedUser) {
                window.currentUser = savedUser;
                currentUser = savedUser;
            }
        }

        // 🔥 핵심 수정: 데이터 우선순위 및 대체 로직 강화
        let listings = [];

        // 1순위: FILTERED_LISTINGS
        if (window.FILTERED_LISTINGS && window.FILTERED_LISTINGS.length > 0) {
            listings = window.FILTERED_LISTINGS;
        }
        // 2순위: LISTINGS
        else if (window.LISTINGS && window.LISTINGS.length > 0) {
            listings = window.LISTINGS;
        }
        // 3순위: 전역 변수 LISTINGS (소문자)
        else if (typeof LISTINGS !== 'undefined' && LISTINGS && LISTINGS.length > 0) {
            listings = LISTINGS;
        }
        // 4순위: 전역 변수 FILTERED_LISTINGS (소문자)
        else if (typeof FILTERED_LISTINGS !== 'undefined' && FILTERED_LISTINGS && FILTERED_LISTINGS.length > 0) {
            listings = FILTERED_LISTINGS;
        }

        if (listings.length === 0) {
            // 🔥 핵심 수정: 데이터가 없으면 강제 로드 시도
            try {
                if (typeof window.fetchListings === 'function') {
                    await window.fetchListings(true);
                    // 다시 시도
                    listings = window.FILTERED_LISTINGS || window.LISTINGS || [];
                }
            } catch (error) {
                console.error('📱 모바일: 강제 로드 실패:', error);
            }

            if (listings.length === 0) {
                this.container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">매물 데이터를 로드할 수 없습니다.<br><small>페이지를 새로고침해주세요.</small></p>';
                return;
            }
        }

        // 무한 스크롤 상태 초기화
        this.listingsData = listings;
        this.renderedCount = 0;
        this.container.innerHTML = '<ul class="listing-list"></ul>';

        // 첫 번째 배치 렌더링
        this.renderNextBatch();

        // 스크롤 이벤트 등록 (한 번만)
        if (!this.container._hasScrollListener) {
            this.container.addEventListener('scroll', () => {
                if (this.container.scrollTop + this.container.clientHeight >= this.container.scrollHeight - 100) {
                    this.renderNextBatch();
                }
            });
            this.container._hasScrollListener = true;
        }
    }

    renderNextBatch() {
        if (!this.container || this.renderedCount >= this.listingsData.length) return;

        const ul = this.container.querySelector('ul.listing-list');
        if (!ul) return;

        const nextBatch = this.listingsData.slice(this.renderedCount, this.renderedCount + this.BATCH_SIZE);
        const isHousing = window.UI_STATE && window.UI_STATE.listingMode === "housing";
        const housingSubtype = (window.UI_STATE && window.UI_STATE.housingSubtype) || "sale";
        const formatSupplyExcl = typeof window.formatSupplyExclusive === "function" ? window.formatSupplyExclusive : (s, e) => (s || e) ? `${s || "-"}/${e || "-"}` : "-/-";
        const formatRoomsBath = typeof window.formatRoomsBath === "function" ? window.formatRoomsBath : (r, b) => `방${(r || "").toString().trim() || "-"}화${(b || "").toString().trim() || "-"}`;

        let listHtml = '';
        nextBatch.forEach(item => {
            const fields = item.fields || {};
            const addr = item.address_full || "";
            const addrParts = addr.split(' ');
            const region = addrParts.length > 0 ? escapeHtml(addrParts[0]) : "";
            const jibun = addrParts.length > 1 ? escapeHtml(addrParts[1]) : "";
            const floorRaw = fields["층수"] || fields["층"] || "";
            const floor = floorRaw ? (/층|지하|^b\d+/i.test(floorRaw) ? floorRaw : `${floorRaw}층`) : "-";
            const briefingStatus = typeof getBriefingStatus === 'function' ? getBriefingStatus(item.id) : 'none';
            const briefingIcon = briefingStatus === 'briefed' ? '📋' : briefingStatus === 'in_progress' ? '⏳' : '';
            const isRecommended = (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) ? window.USER_RECOMMENDATIONS.has(item.id) : false;
            const recommendationStar = isRecommended ? '⭐' : '☆';

            let metaBottom = "";
            if (isHousing) {
                const addrDisplayParts = [
                    fields["지역"] || (addrParts.length > 0 ? addrParts[0] : ""),
                    fields["지번"] || (addrParts.length > 1 ? addrParts[1] : ""),
                    fields["건물명"] || fields["가게명"],
                    fields["동"],
                    floor
                ].map(x => (x || "").toString().trim()).filter(x => x && x !== "-");
                const addressDisplay = escapeHtml(addrDisplayParts.join(" "));
                const supplyExcl = formatSupplyExcl(fields["공급"], fields["전용"]);
                const roomsBath = formatRoomsBath(fields["방"], fields["화장실"]);
                const rentVal = (fields["월세"] || "").toString().trim();
                const hasRent = !!rentVal && rentVal !== "-";
                if (housingSubtype === "sale") {
                    const salePrice = escapeHtml(fields["매매가"] || "-");
                    metaBottom = `<span class="rooms-bath">${escapeHtml(roomsBath)}</span><span class="area-real">${supplyExcl}</span><span class="sale-price">매매 ${salePrice}</span>`;
                } else {
                    const dep = escapeHtml(fields["보증금"] || "-");
                    const rentPart = hasRent ? `<span class="rent">월 ${escapeHtml(rentVal)}</span>` : "";
                    metaBottom = `<span class="rooms-bath">${escapeHtml(roomsBath)}</span><span class="area-real">${supplyExcl}</span><span class="deposit">보 ${dep}</span>${rentPart}`;
                }
                listHtml += `
                <li data-id="${item.id}" style="position: relative; cursor: pointer; padding: 10px; border-bottom: 1px solid #eee;">
                    <div class="listing-item">
                        <div class="meta-top">
                            <div class="listing-info">
                                <span class="address">${addressDisplay}</span>
                                ${briefingIcon ? `<span class="briefing-icon">${briefingIcon}</span>` : ''}
                            </div>
                            <div class="listing-controls">
                                <span class="recommendation-star ${isRecommended ? 'recommended' : ''}" data-listing-id="${item.id}" onclick="handleRecommendationClick('${item.id}')" title="${isRecommended ? '추천 상세보기' : '추천하기'}" style="cursor: pointer; font-size: 18px; margin-left: 8px;">${recommendationStar}</span>
                            </div>
                        </div>
                        <div class="meta-bottom">${metaBottom}</div>
                    </div>
                </li>
            `;
            } else {
                // 상가 모드: 서브타입별 분기
                const subtype = (window.UI_STATE && window.UI_STATE.commercialSubtype) || "lease";
                const storeName = escapeHtml(fields["가게명"] || fields["건물명"] || "");

                let metaBottomHtml = "";
                let metaTopInfoHtml = "";

                if (subtype === "lease") {
                    const areaReal = escapeHtml(fields["실평수"] || "-");
                    const dep = escapeHtml(fields["보증금"] || "-");
                    const rent = escapeHtml(fields["월세"] || "-");
                    const premRaw = (fields["권리금"] ?? "").toString().trim();
                    const premDisplay = ["", "무권리", "0", "무"].includes(premRaw) ? "무권리" : escapeHtml(premRaw);

                    metaTopInfoHtml = `
                        <span class="region">${region}</span>
                        <span class="jibun">${jibun}</span>
                        <span class="floor">${floor}</span>
                        <span class="store-name">${storeName}</span>
                    `;
                    metaBottomHtml = `
                        <span class="area-real">${areaReal}평</span>
                        <span class="deposit">보: ${dep}</span>
                        <span class="rent">월: ${rent}</span>
                        <span class="premium">권: ${premDisplay}</span>
                    `;
                } else if (subtype === "unit") {
                    const areaReal = escapeHtml(fields["전용(평)"] || fields["실평수"] || "-");
                    const price = escapeHtml(fields["매매가"] || "-");
                    const yieldVal = escapeHtml(fields["수익율"] || "-");

                    metaTopInfoHtml = `
                        <span class="region">${region}</span>
                        <span class="jibun">${jibun}</span>
                        <span class="floor">${floor}</span>
                        <span class="store-name">${storeName}</span>
                    `;
                    metaBottomHtml = `
                        <span class="area-real">${areaReal}평</span>
                        <span class="sale-price">매매: ${price}</span>
                        <span class="yield" style="color: #d11; font-weight: bold;">수익: ${yieldVal}</span>
                    `;
                } else if (subtype === "land") {
                    const areaLand = escapeHtml(fields["대지(평)"] || fields["대지면적"] || "-");
                    const price = escapeHtml(fields["매매가"] || "-");
                    const yieldVal = escapeHtml(fields["수익율"] || "-");

                    metaTopInfoHtml = `
                        <span class="region">${region}</span>
                        <span class="jibun">${jibun}</span>
                        <span class="store-name" style="font-weight: bold;">${storeName}</span>
                    `;
                    metaBottomHtml = `
                        <span class="area-land">대지: ${areaLand}평</span>
                        <span class="sale-price">매매: ${price}</span>
                        <span class="yield" style="color: #d11; font-weight: bold;">수익: ${yieldVal}</span>
                    `;
                }

                listHtml += `
                <li data-id="${item.id}" style="position: relative; cursor: pointer; padding: 10px; border-bottom: 1px solid #eee;">
                    <div class="listing-item">
                        <div class="meta-top">
                            <div class="listing-info">
                                ${metaTopInfoHtml}
                                ${briefingIcon ? `<span class="briefing-icon">${briefingIcon}</span>` : ''}
                            </div>
                            <div class="listing-controls">
                                <span class="recommendation-star ${isRecommended ? 'recommended' : ''}" data-listing-id="${item.id}" onclick="handleRecommendationClick('${item.id}')" title="${isRecommended ? '추천 상세보기' : '추천하기'}" style="cursor: pointer; font-size: 18px; margin-left: 8px;">${recommendationStar}</span>
                            </div>
                        </div>
                        <div class="meta-bottom">${metaBottomHtml}</div>
                    </div>
                </li>
            `;
            }
        });

        const tempUl = document.createElement('div');
        tempUl.innerHTML = listHtml;
        while (tempUl.firstChild) {
            ul.appendChild(tempUl.firstChild);
        }

        this.renderedCount += nextBatch.length;
        this.originalListingContent = this.container.innerHTML;

        // 더 이상 수동 호출하지 않음 (전역 위임에서 처리)
        // this.bindListItemEvents();

        // 추천 UI 동기화
        this.syncRecommendationUI();
    }

    // 추천 UI 동기화 메서드
    syncRecommendationUI() {
        if (!window.USER_RECOMMENDATIONS) {
            return;
        }


        // 모든 추천 별표 업데이트
        const starElements = this.container.querySelectorAll('.recommendation-star');
        starElements.forEach(starElement => {
            const listingId = starElement.getAttribute('data-listing-id');
            if (listingId) {
                const isRecommended = window.USER_RECOMMENDATIONS.has(listingId);
                starElement.classList.toggle('recommended', isRecommended);
                starElement.title = isRecommended ? '추천 상세보기' : '추천하기';
                starElement.textContent = isRecommended ? '⭐' : '☆';
            }
        });

    }

    renderListingListWithData(listings) {

        // 직접 매물리스트 HTML 생성
        let listHtml = '<ul class="listing-list">';
        listings.forEach(item => {
            const fields = item.fields || {};

            // 주소에서 지역과 지번 추출
            const addr = item.address_full || "";
            const addrParts = addr.split(' ');
            const region = addrParts.length > 0 ? escapeHtml(addrParts[0]) : "";
            const jibun = addrParts.length > 1 ? escapeHtml(addrParts[1]) : "";

            // 층수 처리
            const floorRaw = fields["층수"] || fields["층"] || "";
            const floor = floorRaw
                ? (/층|지하|^b\d+/i.test(floorRaw) ? floorRaw : `${floorRaw}층`)
                : "-";

            // 가게명
            const storeName = escapeHtml(fields["가게명"] || fields["건물명"] || "");

            // 실평수
            const areaReal = escapeHtml(fields["실평수"] || "-");

            // 보증금, 월세, 권리금
            const dep = escapeHtml(fields["보증금"] || "-");
            const rent = escapeHtml(fields["월세"] || "-");
            const premRaw = (fields["권리금"] ?? "").toString().trim();
            const premDisplay = ["", "무권리", "0", "무"].includes(premRaw)
                ? "무권리"
                : escapeHtml(premRaw);

            listHtml += `
                <li data-id="${item.id}" style="position: relative;">
                    <div class="listing-item">
                        <div class="meta-top">
                            <div class="listing-info">
                                <span class="region">${region}</span>
                                <span class="jibun">${jibun}</span>
                                <span class="floor">${floor}</span>
                            </div>
                            <div class="listing-price">
                                <span class="dep">${dep}</span>
                                <span class="rent">${rent}</span>
                                <span class="prem">${premDisplay}</span>
                            </div>
                        </div>
                        <div class="meta-bottom">
                            <div class="store-name">${storeName}</div>
                            <div class="area-real">${areaReal}</div>
                        </div>
                    </div>
                </li>
            `;
        });
        listHtml += '</ul>';

        this.container.innerHTML = listHtml;
    }

    showListingList() {

        // 상세정보가 열려있지 않으면 바로 리턴
        if (this.currentState !== 'detail' || !this.detailContainer || this.detailContainer.style.display !== 'block') {
            this.isClosing = false; // 플래그 해제
            return;
        }

        // 네비게이션 스택에서 이전 상태 확인
        if (this.navigationStack.length > 0) {
            const previousState = this.navigationStack.pop();

            // 단일 마커에서 진입한 경우: 모달만 닫기 (매물리스트 표시 안 함)
            if (previousState && previousState.state === 'fromMarker') {
                this.detailContainer.style.display = 'none';
                this.isClosing = false;
                this.closeModal();
                return;
            }

            if (previousState && previousState.state === 'cluster' && previousState.data) {
                // 클러스터 목록으로 돌아가기
                // 상세정보 컨테이너 먼저 숨기기
                this.detailContainer.style.display = 'none';
                // 리스트 컨테이너 다시 표시 (상세 보기에서 display:none 했던 것 복원)
                if (this.container) this.container.style.display = 'block';
                this.currentState = 'cluster';
                this.showClusterList(previousState.data);
                return;
            }
        }

        // 매물리스트로 돌아가기
        if (this.detailContainer && this.container) {
            this.detailContainer.style.display = 'none';
            this.container.style.display = 'block';

            // 🔥 모바일 깜박임 방지 해제: 리스트로 돌아올 때 지도 복구
            const mapEl = document.getElementById('map');
            if (mapEl) {
                mapEl.style.visibility = 'visible';
            }

            // 모바일 모달 모드 플래그 제거 (리스트로 돌아갈 때)
            window.isMobileModalMode = false;

            // 현재 상태를 'listing'으로 변경
            this.currentState = 'listing';

            // 🔥 근본 해결: 상세창을 닫을 때 이전에 열었던 매물ID 초기화
            // 이를 누락하면 동일 매물을 다시 클릭했을 때 열리지 않음
            this.currentListingId = null;

            // 원래 매물리스트 복원
            if (this.originalListingContent) {
                this.container.innerHTML = this.originalListingContent;
                this.bindListItemEvents(); // 이벤트 리스너 다시 바인딩
            }
        }

        // 닫기 작업 완료 플래그 해제
        this.isClosing = false;
    }

    showClusterList(clusterItems) {
        // 클러스터 목록을 모달 내에서 표시

        // 🔥 수정: 모달이 열려있는지 확인
        if (!this.modal || this.modal.classList.contains('hidden')) {
            // 모달이 닫혀있으면 먼저 모달 열기
            return this.openModal().then(() => {
                // 모달이 열린 후 클러스터 목록 표시
                this.showClusterList(clusterItems);
            }).catch((error) => {
                console.error('❌ 모달 열기 실패:', error);
            });
        }

        // 모달이 열려있는지 확인
        if (!this.container) {
            console.error('❌ 컨테이너를 찾을 수 없습니다');
            return;
        }

        // 클러스터 데이터 저장
        this.clusterData = clusterItems;
        this.currentState = 'cluster';

        // 리스트 컨테이너 표시 보장 (상세에서 돌아온 뒤 또는 다른 버블 터치 시)
        if (this.container) this.container.style.display = 'block';
        
        // 🔥 근본 해결: 클러스터 목록을 열 때 상세페이지 레이어가 남아있으면 강제 숨김
        if (this.detailContainer) {
            this.detailContainer.style.display = 'none';
        }

        if (this.container) {
            // 클러스터 목록 헤더
            const clusterHeader = document.createElement('div');
            clusterHeader.className = 'cluster-list-header';
            clusterHeader.style.cssText = `
                padding: 12px 16px;
                border-bottom: 1px solid #e0e0e0;
                background: #f8f9fa;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: bold;
            `;
            clusterHeader.innerHTML = `
                <span>클러스터 매물 목록 (${clusterItems.length}건)</span>
                <button id="clusterListBackBtn" class="cluster-list-back-btn" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
            `;

            // 클러스터 목록 컨테이너
            const clusterListContainer = document.createElement('div');
            clusterListContainer.id = 'clusterListContainer';
            clusterListContainer.style.cssText = `
                height: calc(100% - 60px);
                overflow-y: auto;
                padding: 0;
            `;

            // 클러스터 목록 생성
            const clusterList = document.createElement('ul');
            clusterList.id = 'clusterItemList';
            clusterList.style.cssText = `
                list-style: none;
                padding: 0;
                margin: 0;
            `;

            const isHousingCluster = window.UI_STATE && window.UI_STATE.listingMode === "housing";
            const housingSubtypeCluster = (window.UI_STATE && window.UI_STATE.housingSubtype) || "sale";
            const formatSupplyExclCluster = typeof window.formatSupplyExclusive === "function" ? window.formatSupplyExclusive : (s, e) => (s || e) ? `${s || "-"}/${e || "-"}` : "-/-";
            const formatRoomsBathCluster = typeof window.formatRoomsBath === "function" ? window.formatRoomsBath : (r, b) => `방${(r || "").toString().trim() || "-"}화${(b || "").toString().trim() || "-"}`;

            clusterItems.forEach(item => {
                const fields = item.fields || {};
                const addr = item.address_full || '';
                const addrParts = addr.split(' ');
                const floorRaw = fields.층수 || fields.층 || '';
                const floor = floorRaw ? (/층|지하|^b\d+/i.test(floorRaw) ? floorRaw : `${floorRaw}층`) : '-';

                let addressDisplay = '';
                let priceInfo = "";
                let floorArea = "";
                if (isHousingCluster) {
                    const addrDisplayParts = [
                        fields.지역 || (addrParts[0] || ''),
                        fields.지번 || (addrParts.slice(1).join(' ') || ''),
                        fields.건물명 || fields.가게명,
                        fields.동,
                        floor
                    ].map(x => (x || '').toString().trim()).filter(x => x && x !== '-');
                    addressDisplay = escapeHtml(addrDisplayParts.join(' '));
                    const supplyExcl = formatSupplyExclCluster(fields.공급, fields.전용);
                    const roomsBath = formatRoomsBathCluster(fields.방, fields.화장실);
                    const rentVal = (fields.월세 || "").toString().trim();
                    const hasRent = !!rentVal && rentVal !== "-";
                    const floorPart = floor !== "-" ? floor : "";
                    floorArea = [roomsBath, floorPart, supplyExcl].filter(Boolean).join(" / ");
                    if (housingSubtypeCluster === "sale") {
                        priceInfo = `${fields.매매가 || '-'}`;
                    } else {
                        priceInfo = hasRent ? `${fields.보증금 || '-'} / ${fields.월세 || '-'}` : `${fields.보증금 || '-'}`;
                    }
                } else {
                    const subtype = (window.UI_STATE && window.UI_STATE.commercialSubtype) || "lease";
                    const region = addrParts[0] || '';
                    const jibun = addrParts.slice(1).join(' ') || '';
                    addressDisplay = `<div style="font-size: 12px; color: #666; margin-bottom: 2px;">${escapeHtml(region)}</div><div style="font-size: 11px; color: #999;">${escapeHtml(jibun)}</div>`;

                    if (subtype === "lease") {
                        priceInfo = `${fields.보증금 || '-'} / ${fields.월세 || '-'}`;
                        floorArea = `${floor} / ${fields.실평수 || '-'}평`;
                    } else if (subtype === "unit") {
                        priceInfo = `매매 ${fields.매매가 || '-'}`;
                        floorArea = `${floor} / ${fields["전용(평)"] || fields.실평수 || '-'}평`;
                    } else if (subtype === "land") {
                        priceInfo = `매매 ${fields.매매가 || '-'}`;
                        floorArea = `대지 ${fields["대지(평)"] || fields.대지면적 || '-'}평`;
                    }
                }

                const metaTopContent = isHousingCluster
                    ? `<div class="address" style="font-size: 12px; color: #666; flex: 1;">${addressDisplay}</div>`
                    : `<div class="listing-info" style="flex: 1;">${addressDisplay}</div><div class="store-name" style="font-size: 14px; font-weight: bold; color: #333; text-align: right; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(fields.가게명 || fields.건물명 || '-')}</div>`;

                const li = document.createElement('li');
                li.setAttribute('data-id', item.id);
                // 🔥 중복 제거: 이제 bindGlobalListeners가 modalContent 전체의 이벤트를 처리하므로,
                // 개별 리스너 등록은 불필요합니다. 단, 필요한 경우 stopPropagation 등을 위해 남겨둘 수 있으나
                // 현재 구조에서는 제거하는 것이 가장 깔끔합니다.
                li.style.cssText = `
                    padding: 12px 16px;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                `;

                li.innerHTML = `
                    <div class="listing-item" style="display: flex; flex-direction: column; gap: 4px;">
                        <div class="meta-top" style="display: flex; justify-content: space-between; align-items: flex-start;">
                            ${metaTopContent}
                        </div>
                        <div class="meta-bottom" style="display: flex; justify-content: space-between; align-items: center;">
                            <div class="price-info" style="font-size: 13px; font-weight: bold; color: #007AFF;">${priceInfo}</div>
                            <div class="floor-area" style="font-size: 12px; color: #666;">${floorArea}</div>
                        </div>
                    </div>
                `;

                // 호버 효과 (PC에서만)
                li.addEventListener('mouseenter', () => {
                    li.style.backgroundColor = '#f0f8ff';
                });
                li.addEventListener('mouseleave', () => {
                    li.style.backgroundColor = 'transparent';
                });

                clusterList.appendChild(li);
            });

            clusterListContainer.appendChild(clusterList);

            // 기존 내용을 클러스터 목록으로 교체
            this.container.innerHTML = '';
            this.container.appendChild(clusterHeader);
            this.container.appendChild(clusterListContainer);

            // 클러스터 목록에 이벤트 위임 추가 - 스크롤 감지 로직 포함
            // 터치 이벤트 상태 추적 (컨테이너별 독립 관리)
            let clusterTouchStartY = 0;
            let clusterTouchStartTime = 0;
            let clusterIsScrolling = false;

            // 🔥 중복 제거: 이제 bindGlobalListeners가 modalContent 전체의 이벤트를 처리함

            // 뒤로가기 버튼 이벤트 - 중복 등록 방지
            const backBtn = document.getElementById('clusterListBackBtn');
            if (backBtn) {
                // 기존 리스너 제거 (중복 방지)
                const existingHandler = backBtn._clusterBackHandler;
                if (existingHandler) {
                    backBtn.removeEventListener('click', existingHandler);
                }

                // 새 핸들러 생성 및 저장
                const clusterBackHandler = () => {
                    // 클러스터 목록에서 뒤로가기 시 매물리스트로 이동
                    // 상세정보가 열려있으면 먼저 닫기
                    if (this.currentState === 'detail' && this.detailContainer && this.detailContainer.style.display === 'block') {
                        // 상세정보 닫기
                        this.detailContainer.style.display = 'none';
                        this.currentState = 'cluster';
                        // 🔥 근본 해결: 클러스터 목록으로 돌아올 때 ID 캐시 초기화 (Sticking 방지)
                        this.currentListingId = null;
                    }

                    // 매물리스트 표시
                    if (this.container) {
                        this.container.style.display = 'block';
                        this.currentState = 'listing';

                        // 원래 매물리스트 복원
                        if (this.originalListingContent) {
                            this.container.innerHTML = this.originalListingContent;
                            this.bindListItemEvents();
                        }
                    }
                };

                backBtn._clusterBackHandler = clusterBackHandler;
                backBtn.addEventListener('click', clusterBackHandler);
            }
        }
    }

    // 🔥 추가: 클러스터 내비게이션 복귀 시 ID 캐시 초기화
    clusterBackHandler() {
        // 상세정보가 열려있으면 닫기
        if (this.currentState === 'detail' && this.detailContainer) {
            this.detailContainer.style.display = 'none';
            this.currentState = 'cluster';
            this.currentListingId = null; // ID 캐시 초기화 (Sticking 방지)
        }

        // 매물리스트 표시
        if (this.container) {
            this.container.style.display = 'block';
            this.currentState = 'listing';

            if (this.originalListingContent) {
                this.container.innerHTML = this.originalListingContent;
                this.bindListItemEvents();
            }
        }
    }

    startDrag(e) {
        this.isDragging = true;
        this.startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
        this.startHeight = this.modalContent.offsetHeight;

        // 드래그 중 스크롤 방지
        document.body.style.overflow = 'hidden';

        e.preventDefault();
    }

    drag(e) {
        if (!this.isDragging) return;

        const currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
        const deltaY = this.startY - currentY; // 위로 드래그하면 양수
        const newHeight = this.startHeight + deltaY;

        // 최소/최대 높이 제한
        const minHeight = window.innerHeight * 0.3; // 화면의 30%
        const maxHeight = window.innerHeight * 0.8; // 화면의 80%

        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

        this.modalContent.style.height = `${clampedHeight}px`;

        e.preventDefault();
    }

    endDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;
        document.body.style.overflow = '';
    }

    // ==================== 현황 상태 변경 메서드들 ====================

    /**
     * 현황 상태 변경 하단 시트 표시
     */
    showStatusChangeSheet(listingId, currentStatus) {
        // 기존 시트 제거
        const existingSheet = document.getElementById('statusChangeSheet');
        if (existingSheet) existingSheet.remove();

        const statuses = [
            { key: '생', label: '생 (진행중)', color: '#28a745' },
            { key: '완', label: '완 (완료)', color: '#6c757d' },
            { key: '보류', label: '보류', color: '#ffc107' },
            { key: '', label: '없음', color: '#17a2b8' }
        ];

        const optionsHtml = statuses.map(s => `
            <div class="status-option" data-status="${s.key}"
                 style="padding: 14px 16px; cursor: pointer; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px; ${s.key === currentStatus ? 'background: #e9ecef;' : ''}"
                 onclick="window.listingListModalManager && window.listingListModalManager.submitMobileStatusChange('${listingId}', '${s.key}')">
                <span style="width: 12px; height: 12px; border-radius: 50%; background: ${s.color};"></span>
                <span style="font-size: 14px;">${s.label}</span>
                ${s.key === currentStatus ? '<span style="margin-left: auto; color: #007bff;">✓</span>' : ''}
            </div>
        `).join('');

        const sheetHtml = `
            <div id="statusChangeSheet" style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 10001;">
                <!-- 배경 오버레이 -->
                <div onclick="window.listingListModalManager && window.listingListModalManager.hideStatusChangeSheet()"
                     style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000;"></div>

                <!-- 시트 본체 -->
                <div style="position: relative; z-index: 10001; background: white; border-radius: 16px 16px 0 0; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); max-height: 60vh; overflow: hidden;">
                    <!-- 드래그 핸들 -->
                    <div style="width: 40px; height: 4px; background: #ddd; border-radius: 2px; margin: 8px auto;"></div>

                    <!-- 헤더 -->
                    <div style="padding: 12px 16px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold; font-size: 16px;">
                        현황 상태 변경
                    </div>

                    <!-- 옵션 목록 -->
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${optionsHtml}
                    </div>

                    <!-- 취소 버튼 -->
                    <div onclick="window.listingListModalManager && window.listingListModalManager.hideStatusChangeSheet()"
                         style="padding: 14px; text-align: center; cursor: pointer; color: #666; font-size: 14px; background: #f8f9fa;">
                        취소
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', sheetHtml);

        // 진입 애니메이션
        requestAnimationFrame(() => {
            const sheet = document.getElementById('statusChangeSheet');
            if (sheet) {
                sheet.querySelector('div:last-child').style.transform = 'translateY(0)';
            }
        });
    }

    /**
     * 현황 상태 변경 시트 숨기기
     */
    hideStatusChangeSheet() {
        const sheet = document.getElementById('statusChangeSheet');
        if (sheet) {
            sheet.remove();
        }
    }

    /**
     * 현황 상태 변경 API 호출
     */
    async submitMobileStatusChange(listingId, newStatus) {
        try {
            // 로딩 표시
            const sheet = document.getElementById('statusChangeSheet');
            if (sheet) {
                sheet.querySelectorAll('.status-option').forEach(opt => {
                    opt.style.opacity = '0.5';
                    opt.style.pointerEvents = 'none';
                });
            }

            const response = await fetch(`/api/listings/${listingId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();

            if (data.success) {
                // 토스트 표시
                if (typeof showToast === 'function') {
                    showToast(data.message || '현황이 변경되었습니다.', 'success');
                }

                // 시트 닫기
                this.hideStatusChangeSheet();

                // 전역 데이터 갱신
                if (window.LISTINGS) {
                    window.LISTINGS.forEach(i => { if (String(i.id) === String(listingId)) i.status_raw = newStatus; });
                }
                if (window.ORIGINAL_LIST) {
                    window.ORIGINAL_LIST.forEach(i => { if (String(i.id) === String(listingId)) i.status_raw = newStatus; });
                }
                if (window.FILTERED_LISTINGS) {
                    window.FILTERED_LISTINGS.forEach(i => { if (String(i.id) === String(listingId)) i.status_raw = newStatus; });
                }
                if (window._listingData) {
                    const item = window._listingData.find(i => String(i.id) === String(listingId));
                    if (item) item.status_raw = newStatus;
                }

                // 필터 재적용
                if (typeof window.applyAllFilters === 'function') {
                    window.applyAllFilters();
                }

                // 상세 화면 갱신
                const listing = (window.FILTERED_LISTINGS || []).find(l => String(l.id) === String(listingId)) ||
                                (window.LISTINGS || []).find(l => String(l.id) === String(listingId));
                if (listing) {
                    listing.status_raw = newStatus;
                    this.currentListingId = null; // 캐시 초기화 (재렌더링 허용)
                    this.showListingDetail(listing);
                }

            } else {
                alert('상태 변경 실패: ' + (data.error || '알 수 없는 오류'));
                // UI 복원
                if (sheet) {
                    sheet.querySelectorAll('.status-option').forEach(opt => {
                        opt.style.opacity = '1';
                        opt.style.pointerEvents = 'auto';
                    });
                }
            }
        } catch (error) {
            console.error('상태 변경 중 오류:', error);
            alert('상태 변경 중 오류가 발생했습니다.');
            this.hideStatusChangeSheet();
        }
    }
}

// 모듈 로딩 시스템에서 초기화
function initializeListingListModal() {
    if (!window.listingListModalManager) {
        window.listingListModalManager = new ListingListModalManager();
    }
}

// 전역 함수로 등록 (즉시 실행)
window.initializeListingListModal = initializeListingListModal;

// 모듈 로드 완료 시 즉시 초기화
if (typeof window !== 'undefined') {
    try {
        initializeListingListModal();
    } catch (error) {
        console.error('❌ ListingListModalManager 즉시 초기화 실패:', error);
    }
}

// ==================== 현황 상태 변경 전역 함수 (PC와 동일한 패턴) ====================

/**
 * 현황 상태 변경 하단 시트 표시 (모바일 전용)
 * PC 버전과 동일한 함수명을 사용하여 일관성 유지
 */
async function changeListingStatus(listingId, currentStatus) {
    // 기존 시트 제거
    const existingSheet = document.getElementById('statusChangeSheet');
    if (existingSheet) existingSheet.remove();

    const statuses = [
        { key: '생', label: '생 (진행중)', color: '#28a745' },
        { key: '완', label: '완 (완료)', color: '#6c757d' },
        { key: '보류', label: '보류', color: '#ffc107' },
        { key: '', label: '없음', color: '#17a2b8' }
    ];

    const optionsHtml = statuses.map(s => `
        <div class="status-option" data-status="${s.key}"
             style="padding: 14px 16px; cursor: pointer; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px; ${s.key === currentStatus ? 'background: #e9ecef;' : ''}"
             onclick="submitStatusChange('${listingId}', '${s.key}')">
            <span style="width: 12px; height: 12px; border-radius: 50%; background: ${s.color};"></span>
            <span style="font-size: 14px;">${s.label}</span>
            ${s.key === currentStatus ? '<span style="margin-left: auto; color: #007bff;">✓</span>' : ''}
        </div>
    `).join('');

    const sheetHtml = `
        <div id="statusChangeSheet" style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 10001;">
            <!-- 배경 오버레이 -->
            <div onclick="closeStatusChangeSheet()"
                 style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000;"></div>

            <!-- 시트 본체 -->
            <div style="position: relative; z-index: 10001; background: white; border-radius: 16px 16px 0 0; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); max-height: 60vh; overflow: hidden;">
                <!-- 드래그 핸들 -->
                <div style="width: 40px; height: 4px; background: #ddd; border-radius: 2px; margin: 8px auto;"></div>

                <!-- 헤더 -->
                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold; font-size: 16px;">
                    현황 상태 변경
                </div>

                <!-- 옵션 목록 -->
                <div style="max-height: 300px; overflow-y: auto;">
                    ${optionsHtml}
                </div>

                <!-- 취소 버튼 -->
                <div onclick="closeStatusChangeSheet()"
                     style="padding: 14px; text-align: center; cursor: pointer; color: #666; font-size: 14px; background: #f8f9fa;">
                    취소
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', sheetHtml);
}

/**
 * 현황 상태 변경 시트 닫기
 */
function closeStatusChangeSheet() {
    const sheet = document.getElementById('statusChangeSheet');
    if (sheet) {
        sheet.remove();
    }
}

/**
 * 현황 상태 변경 API 호출 (PC와 동일한 함수명)
 */
async function submitStatusChange(listingId, newStatus) {
    try {
        // 로딩 표시
        const sheet = document.getElementById('statusChangeSheet');
        if (sheet) {
            sheet.querySelectorAll('.status-option').forEach(opt => {
                opt.style.opacity = '0.5';
                opt.style.pointerEvents = 'none';
            });
        }

        const response = await fetch(`/api/listings/${listingId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (data.success) {
            // 토스트 표시
            if (typeof showToast === 'function') {
                showToast(data.message || '현황이 변경되었습니다.', 'success');
            }

            // 시트 닫기
            closeStatusChangeSheet();

            // 전역 데이터 갱신
            if (window.LISTINGS) {
                window.LISTINGS.forEach(i => { if (String(i.id) === String(listingId)) i.status_raw = newStatus; });
            }
            if (window.ORIGINAL_LIST) {
                window.ORIGINAL_LIST.forEach(i => { if (String(i.id) === String(listingId)) i.status_raw = newStatus; });
            }
            if (window.FILTERED_LISTINGS) {
                window.FILTERED_LISTINGS.forEach(i => { if (String(i.id) === String(listingId)) i.status_raw = newStatus; });
            }
            if (window._listingData) {
                const item = window._listingData.find(i => String(i.id) === String(listingId));
                if (item) item.status_raw = newStatus;
            }

            // 필터 재적용
            if (typeof window.applyAllFilters === 'function') {
                window.applyAllFilters();
            }

            // 상세 화면 갱신 (모바일 모달 사용 중인 경우)
            const listing = (window.FILTERED_LISTINGS || []).find(l => String(l.id) === String(listingId)) ||
                            (window.LISTINGS || []).find(l => String(l.id) === String(listingId));
            if (listing && window.listingListModalManager) {
                listing.status_raw = newStatus;
                window.listingListModalManager.currentListingId = null; // 캐시 초기화 (재렌더링 허용)
                window.listingListModalManager.showListingDetail(listing);
            }

            // PC 상세 패널 갱신 (PC에서 사용 중인 경우)
            if (window.UI_STATE && window.UI_STATE.selectedItem && String(window.UI_STATE.selectedItem.id) === String(listingId)) {
                window.UI_STATE.selectedItem.status_raw = newStatus;
                if (typeof renderDetailPanel === 'function') renderDetailPanel(window.UI_STATE.selectedItem);
            }

        } else {
            alert('상태 변경 실패: ' + (data.error || '알 수 없는 오류'));
            // UI 복원
            if (sheet) {
                sheet.querySelectorAll('.status-option').forEach(opt => {
                    opt.style.opacity = '1';
                    opt.style.pointerEvents = 'auto';
                });
            }
        }
    } catch (error) {
        console.error('상태 변경 중 오류:', error);
        alert('상태 변경 중 오류가 발생했습니다.');
        closeStatusChangeSheet();
    }
}

// 전역 함수 등록
window.changeListingStatus = changeListingStatus;
window.submitStatusChange = submitStatusChange;
window.closeStatusChangeSheet = closeStatusChangeSheet;
