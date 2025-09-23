/* -----------------------------------------
 * customer-list-modal.js - 모바일 고객리스트 모달
 * ----------------------------------------- */

class CustomerListModalManager {
  constructor() {
    this.container = null;
    this.isOpen = false;
    this.currentCustomers = [];
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.isScrolling = false;
  }

  async openModal() {
    console.log('📱 고객리스트 모달 열기 시작');
    
    // 인증 상태 확인
    if (!currentUser) {
      console.error('❌ 사용자가 로그인되지 않았습니다');
      alert('로그인이 필요합니다.');
      return;
    }

    // 모달 컨테이너 생성 또는 찾기
    this.container = document.getElementById('customerListModal');
    if (!this.container) {
      this.createModal();
    }

    // 모달 표시
    this.container.style.display = 'block';
    this.container.classList.remove('hidden');
    this.isOpen = true;

    // 고객 목록 로드
    await this.loadCustomerList();

    console.log('📱 고객리스트 모달 열기 완료');
  }

  createModal() {
    console.log('📱 고객리스트 모달 생성');
    
    // 모달 컨테이너 생성
    this.container = document.createElement('div');
    this.container.id = 'customerListModal';
    this.container.className = 'customer-list-modal';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      display: none;
    `;

    // 모달 내용 생성
    this.container.innerHTML = `
      <div class="modal-content" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      ">
        <div class="modal-header" style="
          padding: 16px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8f9fa;
        ">
          <h3 style="margin: 0; font-size: 18px; color: #333;">고객 목록</h3>
          <button class="close-btn" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">×</button>
        </div>
        <div class="modal-body" style="
          flex: 1;
          overflow-y: auto;
          padding: 0;
        ">
          <div class="customer-list-container" style="padding: 16px;">
            <div class="loading" style="
              text-align: center;
              padding: 40px;
              color: #666;
            ">고객 목록을 불러오는 중...</div>
          </div>
        </div>
      </div>
    `;

    // 닫기 버튼 이벤트
    const closeBtn = this.container.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => this.closeModal());

    // 모달 배경 클릭 시 닫기
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.closeModal();
      }
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeModal();
      }
    });

    document.body.appendChild(this.container);
  }

  closeModal() {
    console.log('📱 고객리스트 모달 닫기');
    
    if (this.container) {
      this.container.style.display = 'none';
      this.container.classList.add('hidden');
    }
    
    this.isOpen = false;
    this.currentCustomers = [];
  }

  async loadCustomerList() {
    console.log('📱 고객 목록 로드 시작');
    
    try {
      // 사용자 역할에 따라 필터 설정
      const userRole = localStorage.getItem("X-USER-ROLE") || "user";
      const filter = (userRole === 'admin' || userRole === 'manager') ? 'all' : 'own';
      
      let url = '/api/customers';
      if (filter === 'own') {
        url += '?filter=own';
      } else if (filter === 'all') {
        url += '?filter=all';
      }
      
      console.log('📱 고객 목록 요청:', url);
      
      const res = await fetch(url, {
        headers: {
          'X-User': currentUser
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      const customerList = data.items || data.itema || [];
      
      console.log('📱 고객 목록 로드 완료:', customerList.length + '개');
      
      this.currentCustomers = customerList;
      this.renderCustomerList(customerList);
      
    } catch (error) {
      console.error('📱 고객 목록 로드 실패:', error);
      this.showError('고객 목록을 불러오는데 실패했습니다.');
    }
  }

  renderCustomerList(customers) {
    console.log('📱 고객리스트 렌더링 시작:', customers.length + '개');
    
    const container = this.container.querySelector('.customer-list-container');
    if (!container) {
      console.error('📱 고객리스트 컨테이너를 찾을 수 없습니다');
      return;
    }

    if (customers.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">등록된 고객이 없습니다.</div>';
      return;
    }

    // 고객 목록 HTML 생성
    let listHtml = '';
    
    customers.forEach((customer, index) => {
      console.log(`📱 고객 ${index + 1} 렌더링:`, customer);
      
      // 고객 정보 요약
      const summary = [];
      if (customer.regions) summary.push(`📍 ${customer.regions}`);
      if (customer.floor_pref || customer.floor) summary.push(`🏢 ${customer.floor_pref || customer.floor}층`);
      if (customer.area_pref || customer.area) summary.push(`📐 ${customer.area_pref || customer.area}평`);
      if (customer.deposit_pref || customer.deposit) summary.push(`💰 보:${customer.deposit_pref || customer.deposit}`);
      if (customer.rent_pref || customer.rent) summary.push(`💵 월:${customer.rent_pref || customer.rent}`);
      if (customer.premium_pref || customer.premium) summary.push(`🔑 권:${customer.premium_pref || customer.premium}`);
      
      // 참고사항 처리 (긴 경우 줄임)
      let notesDisplay = '';
      if (customer.notes && customer.notes.trim()) {
        const notes = customer.notes.trim();
        notesDisplay = notes.length > 30 ? notes.substring(0, 30) + '...' : notes;
      }
      
      // 상태 표시
      const status = customer.status || '생';
      const statusConfig = {
        '생': { label: '생성', color: '#28a745', bgColor: '#d4edda' },
        '완': { label: '완료', color: '#0c5460', bgColor: '#d1ecf1' },
        '보류': { label: '보류', color: '#856404', bgColor: '#fff3cd' },
        '포기': { label: '포기', color: '#721c24', bgColor: '#f8d7da' }
      };
      const statusInfo = statusConfig[status] || statusConfig['생'];
      
      listHtml += `
        <div class="customer-card" data-customer-id="${customer.id}" style="
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="font-weight: bold; color: #333; font-size: 14px;">${this.escapeHtml(customer.name || '이름 없음')}</div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="color: #666; font-size: 11px;">👤 ${this.escapeHtml(customer.manager || '담당자 없음')}</span>
              <span class="status-badge" style="
                background: ${statusInfo.bgColor};
                color: ${statusInfo.color};
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: bold;
              ">${statusInfo.label}</span>
            </div>
          </div>
          <div style="color: #666; font-size: 12px; margin-bottom: 3px;">📞 ${this.escapeHtml(customer.phone || '연락처 없음')}</div>
          <div style="color: #666; font-size: 11px; line-height: 1.2; margin-bottom: 3px;">
            ${summary.length > 0 ? summary.join(' | ') : '희망 조건 없음'}
          </div>
          ${notesDisplay ? `<div style="color: #888; font-size: 10px; line-height: 1.1; font-style: italic;">📝 ${this.escapeHtml(notesDisplay)}</div>` : ''}
        </div>
      `;
    });

    container.innerHTML = listHtml;

    // 고객카드 이벤트 바인딩
    this.bindCustomerCardEvents();
  }

  bindCustomerCardEvents() {
    console.log('📱 고객카드 이벤트 바인딩 시작');
    
    const customerCards = this.container.querySelectorAll('.customer-card');
    
    customerCards.forEach(card => {
      // 터치 이벤트 변수 초기화
      let touchStartY = 0;
      let touchStartTime = 0;
      let isScrolling = false;
      
      // 터치 시작
      card.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        isScrolling = false;
        
        // 터치 시작 시 시각적 피드백
        card.style.backgroundColor = '#f0f8ff';
      }, { passive: true });
      
      // 터치 이동
      card.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].clientY;
        const deltaY = Math.abs(touchY - touchStartY);
        
        // 10px 이상 움직이면 스크롤로 판단
        if (deltaY > 10) {
          isScrolling = true;
        }
      }, { passive: true });
      
      // 터치 종료
      card.addEventListener('touchend', (e) => {
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime;
        
        // 터치 종료 시 시각적 피드백 제거
        card.style.backgroundColor = 'white';
        
        // 스크롤이 아니고 짧은 터치인 경우에만 클릭 처리
        if (!isScrolling && touchDuration < 500) {
          e.preventDefault();
          e.stopPropagation();
          
          const customerId = card.getAttribute('data-customer-id');
          const customer = this.currentCustomers.find(c => c.id === customerId);
          
          if (customer) {
            console.log('📱 고객카드 터치:', customer.name);
            this.showCustomerDetail(customer);
          }
        }
      }, { passive: false });
      
      // 마우스 이벤트 (데스크톱 테스트용)
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const customerId = card.getAttribute('data-customer-id');
        const customer = this.currentCustomers.find(c => c.id === customerId);
        
        if (customer) {
          console.log('📱 고객카드 클릭:', customer.name);
          this.showCustomerDetail(customer);
        }
      });
      
      // 호버 효과 (데스크톱용)
      card.addEventListener('mouseenter', () => {
        if (!isScrolling) {
          card.style.backgroundColor = '#f0f8ff';
        }
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.backgroundColor = 'white';
      });
    });
    
    console.log('📱 고객카드 이벤트 바인딩 완료');
  }

  showCustomerDetail(customer) {
    console.log('📱 고객 상세보기:', customer.name);
    
    // 고객 상세보기 모달 생성
    this.createCustomerDetailModal(customer);
  }

  createCustomerDetailModal(customer) {
    console.log('📱 고객 상세보기 모달 생성:', customer.name);
    
    // 기존 상세보기 모달이 있으면 제거
    const existingModal = document.getElementById('customerDetailModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // 상세보기 모달 생성
    const detailModal = document.createElement('div');
    detailModal.id = 'customerDetailModal';
    detailModal.className = 'customer-detail-modal';
    detailModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 3000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // 고객 상세정보 HTML 생성
    const detailHtml = this.generateCustomerDetailHtml(customer);
    
    detailModal.innerHTML = `
      <div class="detail-modal-content" style="
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      ">
        <div class="detail-modal-header" style="
          padding: 16px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8f9fa;
        ">
          <h3 style="margin: 0; font-size: 18px; color: #333;">고객 상세정보</h3>
          <button class="detail-close-btn" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">×</button>
        </div>
        <div class="detail-modal-body" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        ">
          ${detailHtml}
        </div>
        <div class="detail-modal-footer" style="
          padding: 16px;
          border-top: 1px solid #eee;
          display: flex;
          gap: 8px;
          background: #f8f9fa;
        ">
          <button class="apply-filter-btn" style="
            flex: 1;
            padding: 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          ">필터 적용</button>
          <button class="cancel-btn" style="
            flex: 1;
            padding: 12px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">취소</button>
        </div>
      </div>
    `;

    // 이벤트 바인딩
    const closeBtn = detailModal.querySelector('.detail-close-btn');
    const cancelBtn = detailModal.querySelector('.cancel-btn');
    const applyFilterBtn = detailModal.querySelector('.apply-filter-btn');
    
    closeBtn.addEventListener('click', () => detailModal.remove());
    cancelBtn.addEventListener('click', () => detailModal.remove());
    
    applyFilterBtn.addEventListener('click', () => {
      console.log('📱 고객 필터 적용:', customer.name);
      this.applyCustomerFilter(customer);
      detailModal.remove();
      this.closeModal(); // 고객리스트 모달도 닫기
    });

    // 모달 배경 클릭 시 닫기
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) {
        detailModal.remove();
      }
    });

    document.body.appendChild(detailModal);
  }

  generateCustomerDetailHtml(customer) {
    // 고객 상세정보 HTML 생성
    let html = `
      <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">담당자</label>
          <div style="color: #666; font-size: 14px;">${this.escapeHtml(customer.manager || '담당자 없음')}</div>
        </div>
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">고객명</label>
          <div style="color: #666; font-size: 14px;">${this.escapeHtml(customer.name || '이름 없음')}</div>
        </div>
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">연락처</label>
          <div style="color: #666; font-size: 14px;">${this.escapeHtml(customer.phone || '연락처 없음')}</div>
        </div>
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">상태</label>
          <div style="color: #666; font-size: 14px;">${this.escapeHtml(customer.status || '생성')}</div>
        </div>
    `;

    // 희망 조건들
    if (customer.regions) {
      html += `
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">희망 지역</label>
          <div style="color: #666; font-size: 14px;">${this.escapeHtml(customer.regions)}</div>
        </div>
      `;
    }

    if (customer.floor_pref || customer.floor) {
      html += `
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">희망 층수</label>
          <div style="color: #666; font-size: 14px;">${this.escapeHtml(customer.floor_pref || customer.floor)}</div>
        </div>
      `;
    }

    if (customer.area_pref || customer.area) {
      html += `
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">희망 면적</label>
          <div style="color: #666; font-size: 14px;">${this.escapeHtml(customer.area_pref || customer.area)}</div>
        </div>
      `;
    }

    if (customer.deposit_pref || customer.deposit) {
      html += `
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">희망 보증금</label>
          <div style="color: #666; font-size: 14px;">${this.escapeHtml(customer.deposit_pref || customer.deposit)}</div>
        </div>
      `;
    }

    if (customer.rent_pref || customer.rent) {
      html += `
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">희망 월세</label>
          <div style="color: #666; font-size: 14px;">${this.escapeHtml(customer.rent_pref || customer.rent)}</div>
        </div>
      `;
    }

    if (customer.premium_pref || customer.premium) {
      html += `
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">희망 권리금</label>
          <div style="color: #666; font-size: 14px;">${this.escapeHtml(customer.premium_pref || customer.premium)}</div>
        </div>
      `;
    }

    if (customer.notes && customer.notes.trim()) {
      html += `
        <div class="detail-row" style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">참고사항</label>
          <div style="color: #666; font-size: 14px; line-height: 1.4;">${this.escapeHtml(customer.notes)}</div>
        </div>
      `;
    }

    html += `</div>`;

    return html;
  }

  applyCustomerFilter(customer) {
    console.log('📱 고객 필터 적용:', customer.name);
    
    // PC의 applyCustomerFilter 로직 재사용
    if (typeof window.applyCustomerFilter === 'function') {
      window.applyCustomerFilter(customer);
      
      // 모바일에서 고객 필터 해제 버튼 표시
      const clearCustomerFilterBtn = document.getElementById('clearCustomerFilterBtn');
      if (clearCustomerFilterBtn) {
        clearCustomerFilterBtn.style.display = 'flex';
        console.log('📱 모바일 고객 필터 해제 버튼 표시');
      }
    } else {
      console.error('❌ applyCustomerFilter 함수를 찾을 수 없습니다');
      alert('필터 적용 기능을 사용할 수 없습니다.');
    }
  }

  showError(message) {
    const container = this.container.querySelector('.customer-list-container');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #dc3545;">
          <div style="font-size: 16px; margin-bottom: 8px;">⚠️ 오류</div>
          <div style="font-size: 14px;">${message}</div>
        </div>
      `;
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성
window.customerListModalManager = new CustomerListModalManager();
