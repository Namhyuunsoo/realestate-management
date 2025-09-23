// app/static/js/listing-list-modal.js

// HTML 이스케이프 함수 (전역 사용)
function escapeHtml(str) {
    const safeStr = String(str ?? "");
    const div = document.createElement("div");
    div.textContent = safeStr;
    return div.innerHTML;
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
        
        this.init();
    }
    
    init() {
        this.modal = document.getElementById('listingListModal');
        this.modalContent = this.modal?.querySelector('.modal-content');
        this.dragHandle = document.getElementById('listingListDragHandle');
        this.container = document.getElementById('listingListContainer');
        this.createDetailContainer();
        this.bindEvents();
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
        
        // 뒤로가기 버튼 이벤트
        const backBtn = document.getElementById('listingDetailBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showListingList());
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
    
    async openModal() {
        console.log('📱 매물리스트 모달 openModal 호출');
        
        try {
            if (!this.modal || !this.container) {
                console.error('❌ 모달 또는 컨테이너를 찾을 수 없습니다');
                return;
            }
            
            // 사용자 인증 상태 확인 및 강화
            if (!window.currentUser || !currentUser) {
                console.log('📱 매물리스트 모달: 사용자 인증 상태 확인 중...');
                
                // localStorage에서 사용자 정보 복원 시도
                const savedUser = localStorage.getItem('X-USER');
                if (savedUser) {
                    window.currentUser = savedUser;
                    currentUser = savedUser;
                    console.log('🔄 모달에서 currentUser 복원:', savedUser);
                } else {
                    console.log('❌ 매물리스트 모달: 사용자 인증 정보가 없습니다');
                    this.container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">로그인이 필요합니다.<br><small>페이지를 새로고침해주세요.</small></p>';
                    this.modal.classList.remove('hidden');
                    return;
                }
            }
            
            // 전역 변수 동기화 보장
            if (window.currentUser && !currentUser) {
                currentUser = window.currentUser;
                console.log('🔄 모달에서 currentUser 전역 변수 동기화:', currentUser);
            }
            
            console.log('📱 매물리스트 모달: 사용자 인증 확인됨, currentUser:', window.currentUser);
            
            // 모바일에서 데이터가 없으면 강제로 로드
            if (!window.LISTINGS || window.LISTINGS.length === 0) {
                console.log('📱 매물리스트 모달: 데이터가 없어서 강제 로드 시도');
                
                // currentUser가 없으면 localStorage에서 복원
                if (!window.currentUser) {
                    const savedUser = localStorage.getItem('X-USER');
                    if (savedUser) {
                        window.currentUser = savedUser;
                        currentUser = savedUser;
                        console.log('📱 모바일: localStorage에서 currentUser 복원:', savedUser);
                    }
                }
                
                // fetchListings 강제 실행
                if (window.currentUser && typeof window.fetchListings === 'function') {
                    try {
                        await window.fetchListings(true); // force=true로 강제 로드
                        console.log('📱 모바일: fetchListings 강제 실행 완료, LISTINGS:', window.LISTINGS?.length);
                    } catch (error) {
                        console.error('📱 모바일: fetchListings 강제 실행 실패:', error);
                    }
                }
            }
            
            // 필터링 상태 확인 및 적용
            if (typeof window.applyAllFilters === 'function') {
                console.log('📱 매물리스트 모달: 필터링 상태 확인');
                
                // 필터가 설정되어 있는 경우에만 필터링 실행
                const hasFilters = Object.keys(window.EFFECTIVE_FILTERS || {}).length > 0 || 
                                  Object.keys(window.TOP_FILTERS || {}).some(k => window.TOP_FILTERS[k] && window.TOP_FILTERS[k].trim() !== "");
                
                if (hasFilters) {
                    console.log('📱 매물리스트 모달: 필터가 있어서 applyAllFilters 호출');
                    window.applyAllFilters();
                } else {
                    console.log('📱 매물리스트 모달: 필터가 없어서 기존 데이터 사용');
                    // 기존 FILTERED_LISTINGS가 없으면 LISTINGS 사용
                    if (!window.FILTERED_LISTINGS || window.FILTERED_LISTINGS.length === 0) {
                        window.FILTERED_LISTINGS = [...(window.LISTINGS || [])];
                        console.log('📱 모바일: LISTINGS에서 FILTERED_LISTINGS 설정, 개수:', window.FILTERED_LISTINGS.length);
                    }
                }
            } else {
                console.warn('⚠️ applyAllFilters 함수를 찾을 수 없습니다');
                // 함수가 없으면 LISTINGS 사용
                if (!window.FILTERED_LISTINGS || window.FILTERED_LISTINGS.length === 0) {
                    window.FILTERED_LISTINGS = [...(window.LISTINGS || [])];
                    console.log('📱 모바일: LISTINGS에서 FILTERED_LISTINGS 설정, 개수:', window.FILTERED_LISTINGS.length);
                }
            }
            
            // 매물리스트 렌더링
            await this.renderListingList();
            
            // 모달 표시
            this.modal.classList.remove('hidden');
            console.log('📱 매물리스트 모달 표시 완료');
            
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
    }
    
    bindListItemEvents() {
        // 터치 이벤트 상태 추적
        let touchStartY = 0;
        let touchStartTime = 0;
        let isScrolling = false;
        
        // 이벤트 위임 방식으로 클릭 이벤트 처리
        this.container.addEventListener('click', (e) => {
            // 스크롤 중이면 클릭 이벤트 무시
            if (isScrolling) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            const li = e.target.closest('li[data-id]');
            if (li) {
                const listingId = li.getAttribute('data-id');
                if (listingId) {
                    // 매물 상세 정보를 모달 내에서 표시
                    let listing = window.FILTERED_LISTINGS.find(l => l.id === listingId);
                    if (!listing) {
                        // 타입 변환해서 다시 찾기
                        const listingIdNum = parseInt(listingId);
                        const listingIdStr = String(listingId);
                        
                        listing = window.FILTERED_LISTINGS.find(l => 
                            l.id === listingIdNum || l.id === listingIdStr || String(l.id) === listingIdStr
                        );
                        
                        console.log('🔄 매물 찾기 재시도:', {
                            originalId: listingId,
                            found: !!listing,
                            listing: listing
                        });
                    }
                    
                    if (!listing && window.LISTINGS) {
                        // FILTERED_LISTINGS에서 못 찾으면 LISTINGS에서 찾기
                        listing = window.LISTINGS.find(l => l.id === listingId);
                        if (!listing) {
                            const listingIdNum = parseInt(listingId);
                            listing = window.LISTINGS.find(l => 
                                l.id === listingIdNum || String(l.id) === String(listingId)
                            );
                        }
                        console.log('🔄 LISTINGS에서 매물 찾기:', listing);
                    }
                    
                    if (listing) {
                        console.log('매물리스트에서 매물카드 클릭:', listing);
                        this.showListingDetail(listing);
                    } else {
                        console.error('❌ 매물을 찾을 수 없습니다:', listingId);
                    }
                }
            }
        });
        
        // 모바일 터치 이벤트 개선 - 스크롤과 클릭 구분
        // 터치 시작 이벤트
        this.container.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isScrolling = false;
        }, { passive: true });
        
        // 터치 이동 이벤트 (스크롤 감지)
        this.container.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const deltaY = Math.abs(touchY - touchStartY);
            
            // 10px 이상 움직이면 스크롤로 판단
            if (deltaY > 10) {
                isScrolling = true;
            }
        }, { passive: true });
        
        // 터치 종료 이벤트
        this.container.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            
            // 스크롤이 아니고 짧은 터치(300ms 이하)인 경우에만 클릭으로 처리
            if (!isScrolling && touchDuration < 300) {
                const li = e.target.closest('li[data-id]');
                if (li) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const listingId = li.getAttribute('data-id');
                    if (listingId) {
                        let listing = window.FILTERED_LISTINGS.find(l => l.id === listingId);
                        if (!listing && window.LISTINGS) {
                            listing = window.LISTINGS.find(l => l.id === listingId);
                        }
                        
                        if (listing) {
                            console.log('매물리스트에서 매물카드 터치:', listing);
                            this.showListingDetail(listing);
                        }
                    }
                }
            }
            
            // 상태 초기화
            setTimeout(() => {
                isScrolling = false;
            }, 100);
        }, { passive: false });
    }
    
    showListingDetail(listing) {
        console.log('매물 상세정보 표시 시작:', listing);
        console.log('detailContainer 존재:', !!this.detailContainer);
        console.log('detailContent 존재:', !!this.detailContent);
        
        // 현재 상태를 네비게이션 스택에 저장 (클러스터에서 직접 호출된 경우가 아닐 때만)
        if (this.currentState !== 'detail') {
            this.navigationStack.push({
                state: this.currentState,
                data: this.currentState === 'cluster' ? this.clusterData : null
            });
        }
        
        // 매물 상세정보 표시
        if (this.detailContainer && this.detailContent) {
            console.log('상세정보 컨테이너들 존재 확인됨');
            
            // 현재 상태를 'detail'로 변경
            this.currentState = 'detail';
            
            // 모바일 모달 모드 플래그 설정 (2차 사이드바 열기 방지)
            window.isMobileModalMode = true;
            
            // 매물 상세정보 직접 생성 (PC버전과 동일한 스타일)
            const fields = listing.fields || {};
            const addr = listing.address_full || '';
            
            console.log('상세정보 HTML 생성 중...');
            this.detailContent.innerHTML = `
                <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                    <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 6px;">
                        ${fields['가게명'] || fields['건물명'] || '매물명 없음'}
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        ${addr || '주소 정보 없음'}
                    </div>
                </div>
                
                <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">접수일</span>
                        <span style="color: #666; font-size: 13px;">${fields['접수일'] || '접수일 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">지역</span>
                        <span style="color: #666; font-size: 13px;">${fields['지역'] || '지역 정보 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">지번</span>
                        <span style="color: #666; font-size: 13px;">${fields['지번'] || '지번 정보 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">건물명</span>
                        <span style="color: #666; font-size: 13px;">${fields['건물명'] || '건물명 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">가게명</span>
                        <span style="color: #666; font-size: 13px;">${fields['가게명'] || '가게명 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">층수</span>
                        <span style="color: #666; font-size: 13px;">${fields['층수'] || '층수 정보 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">실평수</span>
                        <span style="color: #666; font-size: 13px;">${fields['실평수'] || '실평수 정보 없음'}평</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">보증금</span>
                        <span style="color: #666; font-size: 13px;">${fields['보증금'] || '보증금 정보 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">월세</span>
                        <span style="color: #666; font-size: 13px;">${fields['월세'] || '월세 정보 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">권리금</span>
                        <span style="color: #666; font-size: 13px;">${fields['권리금'] || '권리금 정보 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">비고</span>
                        <span style="color: #666; flex: 1; font-size: 13px;">${fields['비고'] || '비고 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">의뢰인</span>
                        <span style="color: #666; font-size: 13px;">${fields['의뢰인'] || '의뢰인 정보 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">연락처</span>
                        <span style="color: #666; font-size: 13px;">${fields['연락처'] || '연락처 정보 없음'}</span>
                    </div>
                    ${fields['비고3'] ? `
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">비고3</span>
                        <span style="color: #666; flex: 1; font-size: 13px;">${fields['비고3']}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">현황</span>
                        <span style="color: #666; font-size: 13px;">${getStatusDisplay ? getStatusDisplay(listing.status_raw) : listing.status_raw || '현황 정보 없음'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                        <span style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">담당자</span>
                        <span style="color: #666; font-size: 13px;">${fields['담당자'] || fields['manager'] || '담당자 정보 없음'}</span>
                    </div>
                </div>
            `;
            
            console.log('상세정보 HTML 생성 완료, 컨테이너 표시 중...');
            
            // 상세정보 컨테이너 표시
            this.detailContainer.style.display = 'block';
            this.container.style.display = 'none';
            
            // 현재 상태를 'detail'로 변경
            this.currentState = 'detail';
            
            console.log('detailContainer display:', this.detailContainer.style.display);
            console.log('container display:', this.container.style.display);
            
            console.log('매물 상세정보 표시 완료');
        } else {
            console.error('detailContainer 또는 detailContent를 찾을 수 없습니다');
        }
    }
    
    async renderListingList() {
        console.log('매물리스트 모달: renderListingList 호출');
        
        // currentUser가 없으면 localStorage에서 복원 시도
        if (!window.currentUser) {
            const savedUser = localStorage.getItem('X-USER');
            if (savedUser) {
                window.currentUser = savedUser;
                currentUser = savedUser;
                console.log('🔄 모달에서 currentUser 복원:', savedUser);
            }
        }
        
        // 🔥 핵심 수정: 데이터 우선순위 및 대체 로직 강화
        let listings = [];
        
        // 1순위: FILTERED_LISTINGS
        if (window.FILTERED_LISTINGS && window.FILTERED_LISTINGS.length > 0) {
            listings = window.FILTERED_LISTINGS;
            console.log('📱 모바일: FILTERED_LISTINGS 사용, 개수:', listings.length);
        }
        // 2순위: LISTINGS
        else if (window.LISTINGS && window.LISTINGS.length > 0) {
            listings = window.LISTINGS;
            console.log('📱 모바일: LISTINGS 사용, 개수:', listings.length);
        }
        // 3순위: 전역 변수 LISTINGS (소문자)
        else if (typeof LISTINGS !== 'undefined' && LISTINGS && LISTINGS.length > 0) {
            listings = LISTINGS;
            console.log('📱 모바일: 전역 LISTINGS 사용, 개수:', listings.length);
        }
        // 4순위: 전역 변수 FILTERED_LISTINGS (소문자)
        else if (typeof FILTERED_LISTINGS !== 'undefined' && FILTERED_LISTINGS && FILTERED_LISTINGS.length > 0) {
            listings = FILTERED_LISTINGS;
            console.log('📱 모바일: 전역 FILTERED_LISTINGS 사용, 개수:', listings.length);
        }
        
        console.log('📱 모바일 매물리스트 렌더링:', {
            window_FILTERED_LISTINGS: window.FILTERED_LISTINGS?.length || 0,
            window_LISTINGS: window.LISTINGS?.length || 0,
            전역_FILTERED_LISTINGS: typeof FILTERED_LISTINGS !== 'undefined' ? FILTERED_LISTINGS?.length || 0 : 'undefined',
            전역_LISTINGS: typeof LISTINGS !== 'undefined' ? LISTINGS?.length || 0 : 'undefined',
            최종사용데이터: listings.length
        });
        
        if (listings.length === 0) {
            // 🔥 핵심 수정: 데이터가 없으면 강제 로드 시도
            console.log('📱 모바일: 데이터가 없어서 강제 로드 시도');
            try {
                if (typeof window.fetchListings === 'function') {
                    await window.fetchListings(true);
                    // 다시 시도
                    listings = window.FILTERED_LISTINGS || window.LISTINGS || [];
                    console.log('📱 모바일: 강제 로드 후 데이터 개수:', listings.length);
                }
            } catch (error) {
                console.error('📱 모바일: 강제 로드 실패:', error);
            }
            
            if (listings.length === 0) {
                this.container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">매물 데이터를 로드할 수 없습니다.<br><small>페이지를 새로고침해주세요.</small></p>';
                return;
            }
        }
        
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
            
            // 브리핑 상태 확인
            const briefingStatus = getBriefingStatus(item.id);
            const briefingIcon = briefingStatus === 'briefed' ? '📋' : 
                               briefingStatus === 'in_progress' ? '⏳' : '';
            
            // 추천 상태 확인
            const isRecommended = (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) ? 
                                window.USER_RECOMMENDATIONS.has(item.id) : false;
            const recommendationStar = isRecommended ? '⭐' : '☆';
            
            listHtml += `
                <li data-id="${item.id}" style="position: relative; cursor: pointer; padding: 10px; border-bottom: 1px solid #eee;">
                    <div class="listing-item">
                        <div class="meta-top">
                            <div class="listing-info">
                                <span class="region">${region}</span>
                                <span class="jibun">${jibun}</span>
                                <span class="floor">${floor}</span>
                                <span class="store-name">${storeName}</span>
                                ${briefingIcon ? `<span class="briefing-icon">${briefingIcon}</span>` : ''}
                            </div>
                            <div class="listing-controls">
                                <span class="recommendation-star ${isRecommended ? 'recommended' : ''}" 
                                      data-listing-id="${item.id}"
                                      onclick="handleRecommendationClick('${item.id}')"
                                      title="${isRecommended ? '추천 상세보기' : '추천하기'}"
                                      style="cursor: pointer; font-size: 18px; margin-left: 8px;">
                                    ${recommendationStar}
                                </span>
                            </div>
                        </div>
                        <div class="meta-bottom">
                            <span class="area-real">${areaReal}평</span>
                            <span class="deposit">보: ${dep}</span>
                            <span class="rent">월: ${rent}</span>
                            <span class="premium">권: ${premDisplay}</span>
                        </div>
                    </div>
                </li>
            `;
        });
        listHtml += '</ul>';
        
        this.container.innerHTML = listHtml;
        this.originalListingContent = this.container.innerHTML;
        
        // 모달 내부의 리스트 아이템에 클릭 이벤트 추가
        this.bindListItemEvents();
        
        // 추천 UI 동기화
        this.syncRecommendationUI();
        
        console.log('매물리스트 모달: HTML 생성 완료');
    }
    
    // 추천 UI 동기화 메서드
    syncRecommendationUI() {
        if (!window.USER_RECOMMENDATIONS) {
            console.log('📱 추천 UI 동기화: USER_RECOMMENDATIONS가 없습니다');
            return;
        }
        
        console.log('📱 추천 UI 동기화 시작');
        
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
        
        console.log('📱 추천 UI 동기화 완료');
    }
    
    renderListingListWithData(listings) {
        console.log('매물리스트 모달: renderListingListWithData 호출, 개수:', listings.length);
        
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
        console.log('매물리스트 모달: renderListingListWithData 완료');
    }
    
    showListingList() {
        // 네비게이션 스택에서 이전 상태 확인
        if (this.navigationStack.length > 0) {
            const previousState = this.navigationStack.pop();
            
            if (previousState.state === 'cluster' && previousState.data) {
                // 클러스터 목록으로 돌아가기
                console.log('클러스터 목록으로 돌아가기');
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
    }

    showClusterList(clusterItems) {
        // 클러스터 목록을 모달 내에서 표시
        console.log('클러스터 목록 표시:', clusterItems);
        
        // 클러스터 데이터 저장
        this.clusterData = clusterItems;
        this.currentState = 'cluster';
        
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

            clusterItems.forEach(item => {
                const fields = item.fields || {};
                const addr = item.address_full || '';
                const addrParts = addr.split(' ');
                const region = addrParts[0] || '';
                const jibun = addrParts.slice(1).join(' ') || '';

                const li = document.createElement('li');
                li.setAttribute('data-id', item.id);
                li.style.cssText = `
                    padding: 12px 16px;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                `;

                li.innerHTML = `
                    <div class="listing-item" style="display: flex; flex-direction: column; gap: 4px;">
                        <div class="meta-top" style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div class="listing-info" style="flex: 1;">
                                <div class="region" style="font-size: 12px; color: #666; margin-bottom: 2px;">${region}</div>
                                <div class="jibun" style="font-size: 11px; color: #999;">${jibun}</div>
                            </div>
                            <div class="store-name" style="font-size: 14px; font-weight: bold; color: #333; text-align: right; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fields.건물명 || '-'}</div>
                        </div>
                        <div class="meta-bottom" style="display: flex; justify-content: space-between; align-items: center;">
                            <div class="price-info" style="font-size: 13px; font-weight: bold; color: #007AFF;">
                                ${fields.보증금 || '-'} / ${fields.월세 || '-'}
                            </div>
                            <div class="floor-area" style="font-size: 12px; color: #666;">
                                ${fields.층수 || '-'}층 / ${fields.실평수 || '-'}평
                            </div>
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

            // 클러스터 목록에 이벤트 위임 추가
            clusterListContainer.addEventListener('click', (e) => {
                const li = e.target.closest('li[data-id]');
                if (li) {
                    const listingId = li.getAttribute('data-id');
                    const listing = clusterItems.find(item => item.id === listingId);
                    if (listing) {
                        console.log('클러스터목록에서 매물카드 클릭:', listing);
                        // 클러스터 목록 상태를 네비게이션 스택에 저장
                        this.navigationStack.push({
                            state: 'cluster',
                            data: clusterItems
                        });
                        this.showListingDetail(listing);
                    }
                }
            });

            // 모바일 터치 이벤트도 추가
            clusterListContainer.addEventListener('touchstart', (e) => {
                const li = e.target.closest('li[data-id]');
                if (li) {
                    e.preventDefault();
                    const listingId = li.getAttribute('data-id');
                    const listing = clusterItems.find(item => item.id === listingId);
                    if (listing) {
                        console.log('클러스터목록에서 매물카드 터치:', listing);
                        // 클러스터 목록 상태를 네비게이션 스택에 저장
                        this.navigationStack.push({
                            state: 'cluster',
                            data: clusterItems
                        });
                        this.showListingDetail(listing);
                    }
                }
            });

            // 뒤로가기 버튼 이벤트
            const backBtn = document.getElementById('clusterListBackBtn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    // 네비게이션 스택에서 이전 상태 확인
                    if (this.navigationStack.length > 0) {
                        const previousState = this.navigationStack.pop();
                        if (previousState.state === 'listing') {
                            this.showListingList();
                        } else {
                            this.showListingList(); // 기본적으로 매물리스트로
                        }
                    } else {
                        this.showListingList(); // 기본적으로 매물리스트로
                    }
                });
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
        console.log('✅ ListingListModalManager 초기화 완료');
    }
}

// 전역 함수로 등록 (즉시 실행)
window.initializeListingListModal = initializeListingListModal;

// 모듈 로드 완료 시 즉시 초기화
if (typeof window !== 'undefined') {
    console.log('📱 listing-list-modal.js 로드 완료, 즉시 초기화 시도');
    try {
        initializeListingListModal();
        console.log('✅ ListingListModalManager 즉시 초기화 완료');
    } catch (error) {
        console.error('❌ ListingListModalManager 즉시 초기화 실패:', error);
    }
}
