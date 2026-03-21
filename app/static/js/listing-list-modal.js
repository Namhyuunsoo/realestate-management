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
                    const li = e.target.closest('li[data-id]');
                    if (li) {
                        // 중복 방지를 위해 e.preventDefault()와 stopPropagation() 적용
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
                // 이미 터치로 처리된 경우 무시
                if (isScrolling) return;

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

        // 🔥 파생 사이드바도 닫기 (상세정보 패널, 클러스터 목록 등)
        if (this.detailContainer && !this.detailContainer.classList.contains('hidden')) {
            this.detailContainer.classList.add('hidden');
            this.detailContainer.style.display = 'none';
        }

        // 네비게이션 스택 초기화
        this.navigationStack = [];
        this.currentState = 'listing';
        this.clusterData = null;
    }

    // bindListItemEvents: 더 이상 사용하지 않으므로 빈 함수로 두거나 제거 가능
    // 호환성을 위해 빈 함수로 둡니다.
    bindListItemEvents() { }

    showListingDetail(listing, opts = {}) {

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
            let rows = "";
            if (isHousingDetail) {
                rows = row('접수일', fields['접수일']) + row('지역', fields['지역']) + row('지번', fields['지번']) + row('유형', fields['유형']) + row('건물명', fields['건물명']) + row('동', fields['동']) + row('층수', fields['층수']) + row('호수', fields['호수']) + row('향', fields['향']) + row('공급/전용', formatSupplyExclDetail(fields['공급'], fields['전용'])) + row('보증금', fields['보증금']) + row('월세', fields['월세']) + row('관리비', fields['관리비']) + row('매매가', fields['매매가']) + row('방', fields['방']) + row('화장실', fields['화장실']) + row('거래유형', fields['거래유형']) + row('의뢰인', fields['의뢰인']) + row('관계', fields['관계']) + rowPhone('연락처', fields['연락처']) + rowPhone('임차인 연락처', fields['임차인 연락처']) + row('비고', fields['비고']) + row('현황', statusDisplay) + row('지역2', fields['지역2']);
            } else {
                rows = row('접수일', fields['접수일']) + row('지역', fields['지역']) + row('지번', fields['지번']) + row('건물명', fields['건물명']) + row('가게명', fields['가게명']) + row('층수', fields['층수']) + row('실평수', fields['실평수'] ? fields['실평수'] + '평' : '') + row('보증금', fields['보증금']) + row('월세', fields['월세']) + row('권리금', fields['권리금']) + row('비고', fields['비고']) + row('의뢰인', fields['의뢰인']) + rowPhone('연락처', fields['연락처']) + (fields['비고3'] ? row('비고3', fields['비고3']) : '') + row('현황', statusDisplay) + row('담당자', fields['담당자'] || fields['manager']);
            }
            const briefingStatus = typeof getBriefingStatus === 'function' ? getBriefingStatus(listing.id) : 'none';
            const briefingText = typeof getBriefingStatusText === 'function' ? getBriefingStatusText(briefingStatus) : '';
            const briefingHtml = briefingText ? ` <span class="listing-detail-briefing-status briefing-${briefingStatus}" onclick="typeof cycleBriefingStatus==='function'&&cycleBriefingStatus(${JSON.stringify(String(listing.id))})" style="cursor:pointer;">${escapeHtml(briefingText)}</span>` : '';
            this.detailContent.innerHTML = `
                <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <div style="font-size: 16px; font-weight: bold; color: #333;">${escapeHtml(titleName)}</div>
                        <button id="mobilePhotoEditBtn" style="background: #6c757d; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 3px;">
                            <span>⚙️</span> 사진편집
                        </button>
                    </div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 10px;">📍 ${escapeHtml(addr || '주소 정보 없음')}${briefingHtml}</div>
                    
                    <!-- 사진 갤러리 영역 -->
                    <div id="mobilePhotoGallery" class="detail-photo-gallery" style="margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 10px;">
                        <div style="grid-column: span 3; color: #999; font-size: 11px; text-align: center; padding: 10px;">사진을 불러오는 중...</div>
                    </div>
                    
                    <!-- 숨김 파일 입력 -->
                    <input type="file" id="mobilePhotoInput" style="display: none;" accept="image/*">
                </div>
                <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px;">${rows}</div>
            `;

            // 사진 로드 실행
            this.loadMobilePhotos(listing.id);

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
        this.renderPhotoEditUI(listing);
    }

    // 사진 편집 모드 종료
    exitPhotoEditMode(listing) {
        this.isPhotoEditMode = false;
        this.isPhotoDeleteMode = false;
        this.selectedPhotoFiles.clear();
        this.showListingDetail(listing); // 원래 상세정보로 복귀
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
                <input type="file" id="mobilePhotoInput" style="display: none;" accept="image/*">
            </div>

            <!-- 하단 액션 바 -->
            <div class="photo-edit-actions" id="photoEditActions">
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

        // 사진 로드 (편집 모드로 로드)
        this.loadMobilePhotos(listing.id);
    }

    // 삭제 모드 진입
    enterDeleteMode(listing) {
        this.isPhotoDeleteMode = true;
        this.selectedPhotoFiles.clear();

        // UI 업데이트
        const tip = document.getElementById('photoEditTip');
        if (tip) {
            tip.innerHTML = '<b style="color: #f44336;">삭제할 사진들을 터치하여 선택하세요.</b>';
            tip.style.background = '#ffebee';
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
            const fileName = item.getAttribute('data-filename');
            if (this.isPhotoDeleteMode) {
                item.classList.add('edit-mode');
                if (this.selectedPhotoFiles.has(fileName)) {
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

    // 사진 선택 토글
    togglePhotoSelection(fileName) {
        if (!this.isPhotoDeleteMode) return;

        if (this.selectedPhotoFiles.has(fileName)) {
            this.selectedPhotoFiles.delete(fileName);
        } else {
            this.selectedPhotoFiles.add(fileName);
        }
        this.refreshGalleryUI();
    }

    // 선택된 사진 일괄 삭제
    async deleteSelectedPhotos(listing) {
        if (this.selectedPhotoFiles.size === 0) return;

        if (!confirm(`${this.selectedPhotoFiles.size}장의 사진을 삭제하시겠습니까?`)) return;

        const listingId = listing.id;
        const photosToDelete = Array.from(this.selectedPhotoFiles);
        let successCount = 0;

        // 버튼 비활성화
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = '⏳ 삭제 중...';
        }

        try {
            for (const fileName of photosToDelete) {
                const response = await fetch(`/api/listings/${listingId}/photos/${fileName}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                    }
                });
                const data = await response.json();
                if (data.success) {
                    successCount++;
                }
            }

            if (typeof showToast === 'function') {
                showToast(`${successCount}장의 사진이 삭제되었습니다.`, 'success');
            }
        } catch (error) {
            console.error('사진 삭제 중 오류:', error);
            alert('일부 사진 삭제 중 오류가 발생했습니다.');
        } finally {
            this.isPhotoDeleteMode = false;
            this.renderPhotoEditUI(listing); // 리프레시
        }
    }

    async loadMobilePhotos(listingId) {
        const gallery = document.getElementById('mobilePhotoGallery');
        if (!gallery) return;

        // 🔥 가드(Guard): 로딩 중 매물이 바뀌는 경우 대비
        gallery.setAttribute('data-loading-id', listingId);

        try {
            const response = await fetch(`/api/listings/${listingId}/photos`);
            const data = await response.json();

            // 다른 매물 사진이 도착했으면 무시
            if (gallery.getAttribute('data-loading-id') !== String(listingId)) return;

            if (data.success && data.photos && data.photos.length > 0) {
                gallery.innerHTML = data.photos.map(photo => `
                    <div class="gallery-item ${this.isPhotoDeleteMode ? 'edit-mode' : ''} ${this.selectedPhotoFiles.has(photo.file_name) ? 'selected' : ''}" 
                         data-filename="${photo.file_name}"
                         onclick="${this.isPhotoDeleteMode ? `listingListModalManager.togglePhotoSelection('${photo.file_name}')` : `window.openLightbox && window.openLightbox('${photo.full_url}', '${photo.file_name}')`}">
                        <img src="${photo.full_url}" alt="매물사진" onerror="this.src='/static/img/no-image.png'">
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

    async handleMobilePhotoUpload(listingId, event) {
        const file = event.target.files[0];
        if (!file) return;

        // 업로드 버튼 찾기 (상세보기 창 또는 편집 창)
        const uploadBtn = document.getElementById('mobilePhotoUploadBtn') || document.getElementById('photoEditUploadBtn');
        const originalText = uploadBtn ? uploadBtn.innerHTML : '';

        try {
            // 업로드 중 상태 표시
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<span>⏳</span> 업로드 중...';
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`/api/listings/${listingId}/photos`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                }
            });

            const data = await response.json();
            if (data.success) {
                if (typeof showToast === 'function') showToast('사진이 등록되었습니다.', 'success');
                // 갤러리 새로고침 (편집 모드 여부에 따라)
                if (this.isPhotoEditMode) {
                    const listing = (window.FILTERED_LISTINGS || []).find(l => String(l.id) === String(listingId)) ||
                        (window.LISTINGS || []).find(l => String(l.id) === String(listingId));
                    if (listing) {
                        this.renderPhotoEditUI(listing);
                    } else {
                        await this.loadMobilePhotos(listingId);
                    }
                } else {
                    await this.loadMobilePhotos(listingId);
                }
            } else {
                alert('업로드 실패: ' + (data.error || '알 수 없는 오류'));
            }
        } catch (error) {
            console.error('사진 업로드 중 오류:', error);
            alert('사진 업로드 중 오류가 발생했습니다.');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = originalText;
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

            // 모바일 모달 모드 플래그 제거 (리스트로 돌아갈 때)
            window.isMobileModalMode = false;

            // 현재 상태를 'listing'으로 변경
            this.currentState = 'listing';

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
