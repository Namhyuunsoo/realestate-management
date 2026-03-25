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

  async openModal(mode = 'toggle') {
    const isHidden = !this.container || this.container.classList.contains('hidden') || this.container.style.display === 'none';
    
    // 'open' 모드이거나, 'toggle' 인데 닫혀있는 경우에만 엽니다.
    if (mode === 'open' || (mode === 'toggle' && isHidden)) {
      if (!isHidden && this.isOpen) return Promise.resolve();
    } else if (mode === 'close' || (mode === 'toggle' && !isHidden)) {
      this.closeModal();
      return Promise.resolve();
    }
    
    // 인증 상태 확인 및 복원 시도
    if (!window.currentUser) {
      const savedUser = localStorage.getItem('X-USER');
      if (savedUser) {
        window.currentUser = savedUser;
        if (typeof currentUser !== 'undefined') {
          currentUser = savedUser;
        }
      } else {
        console.error('❌ 사용자가 로그인되지 않았습니다');
        alert('로그인이 필요합니다.');
        return;
      }
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
  }

  createModal() {
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
    if (this.container) {
      this.container.style.display = 'none';
      this.container.classList.add('hidden');
    }
    
    // 고객 상세 모달이 열려있으면 함께 닫기
    const customerDetailModals = document.querySelectorAll('.customer-detail-modal');
    customerDetailModals.forEach(modal => {
      if (modal && !modal.classList.contains('hidden')) {
        modal.remove();
      }
    });
    
    this.isOpen = false;
  }

  async loadCustomerList() {
    if (!window.currentUser) {
      const savedUser = localStorage.getItem('X-USER');
      if (savedUser) window.currentUser = savedUser;
    }
    
    try {
      const userRole = localStorage.getItem("X-USER-ROLE") || "user";
      const filter = (userRole === 'admin' || userRole === 'manager') ? 'all' : 'own';
      
      let url = '/api/customers';
      if (filter === 'own') {
        url += '?filter=own';
      } else if (filter === 'all') {
        url += '?filter=all';
      }
      
      const res = await fetch(url, {
        headers: {
          'X-User': window.currentUser
        }
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const customerList = data.items || data.itema || [];
      
      this.currentCustomers = customerList;
      window.currentCustomerList = customerList;
      this.renderCustomerList(customerList);
      
    } catch (error) {
      console.error('📱 고객 목록 로드 실패:', error);
      this.showError('고객 목록을 불러오는데 실패했습니다.');
    }
  }

  renderCustomerList(customers) {
    const container = this.container.querySelector('.customer-list-container');
    if (!container) return;

    if (customers.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">등록된 고객이 없습니다.</div>';
      return;
    }

    let listHtml = '';
    customers.forEach((customer) => {
      const summary = [];
      if (customer.regions) summary.push(`📍 ${customer.regions}`);
      if (customer.floor_pref || customer.floor) summary.push(`🏢 ${customer.floor_pref || customer.floor}층`);
      if (customer.area_pref || customer.area) summary.push(`📐 ${customer.area_pref || customer.area}평`);
      if (customer.deposit_pref || customer.deposit) summary.push(`💰 보:${customer.deposit_pref || customer.deposit}`);
      if (customer.rent_pref || customer.rent) summary.push(`💵 월:${customer.rent_pref || customer.rent}`);
      if (customer.premium_pref || customer.premium) summary.push(`🔑 권:${customer.premium_pref || customer.premium}`);
      
      let notesDisplay = '';
      if (customer.notes && customer.notes.trim()) {
        const notes = customer.notes.trim();
        notesDisplay = notes.length > 30 ? notes.substring(0, 30) + '...' : notes;
      }
      
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
          touch-action: manipulation; /* 🔥 더블 탭 줌 대기 시간 제거 (v14.0) */
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
    this.bindCustomerCardEvents();
  }

  bindCustomerCardEvents() {
    const customerCards = this.container.querySelectorAll('.customer-card');
    customerCards.forEach(card => {
      // 1. 시각적 피드백 (터치 시 배경색 변경)만 유지
      card.addEventListener('touchstart', () => {
        card.style.backgroundColor = '#f0f8ff';
      }, { passive: true });
      
      card.addEventListener('touchend', () => {
        card.style.backgroundColor = 'white';
      }, { passive: true });

      card.addEventListener('touchcancel', () => {
        card.style.backgroundColor = 'white';
      }, { passive: true });
      
      // 2. 모달 오픈 로직을 click 이벤트로 일원화 (v14.0)
      // 이유: click 이벤트는 브라우저의 모든 합성 클릭 처리가 끝난 후 발생하므로 
      // 모달이 열린 뒤에 "유령 클릭"이 발생하여 버튼을 누르는 현상이 원천 차단됨.
      card.addEventListener('click', (e) => {
        const customerId = card.getAttribute('data-customer-id');
        const customer = this.currentCustomers.find(c => c.id === customerId);
        if (customer) {
          this.showCustomerDetail(customer);
        }
      });
    });
  }

  showCustomerDetail(customer) {
    this.createCustomerDetailModal(customer);
  }

  createCustomerDetailModal(customer) {
    const existingModal = document.getElementById('customerDetailModal');
    if (existingModal) existingModal.remove();
    
    const detailModal = document.createElement('div');
    detailModal.id = 'customerDetailModal';
    detailModal.className = 'customer-detail-modal';
    detailModal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.5);
      z-index: 3000; display: flex; align-items: center; justify-content: center;
    `;

    const detailHtml = this.generateCustomerDetailHtml(customer);
    detailModal.innerHTML = `
      <div class="detail-modal-content" style="
        width: 90%; max-width: 500px; max-height: 80vh;
        background: white; border-radius: 8px; overflow: hidden;
        display: flex; flex-direction: column;
      ">
        <div class="detail-modal-header" style="
          padding: 16px; border-bottom: 1px solid #eee;
          display: flex; justify-content: space-between; align-items: center; background: #f8f9fa;
        ">
          <h3 style="margin: 0; font-size: 18px; color: #333;">고객 상세정보</h3>
          <button class="detail-close-btn" style="background: none; border: none; font-size: 24px;">×</button>
        </div>
        <div class="detail-modal-body" style="flex: 1; overflow-y: auto; padding: 16px;">
          ${detailHtml}
        </div>
        <div class="detail-modal-footer" style="padding: 16px; border-top: 1px solid #eee; background: #f8f9fa;">
          <div class="default-footer-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="apply-filter-btn" style="padding: 12px; background: #007bff; color: white; border-radius: 4px; font-weight: bold;">필터 적용</button>
            <button class="edit-btn" style="padding: 12px; background: #1976d2; color: white; border-radius: 4px; font-weight: bold;">수정</button>
            <button class="delete-btn" style="padding: 12px; background: #dc3545; color: white; border-radius: 4px;">삭제</button>
            <button class="cancel-btn" style="padding: 12px; background: #6c757d; color: white; border-radius: 4px;">취소</button>
          </div>
          <div class="delete-confirm-actions" style="display: none; flex-direction: column; gap: 12px; text-align: center;">
            <div style="font-weight: bold; color: #dc3545;">정말로 삭제하시겠습니까?</div>
            <div style="display: flex; gap: 8px;">
              <button class="confirm-delete-btn" style="flex: 1; padding: 12px; background: #dc3545; color: white; border-radius: 4px;">삭제 확인</button>
              <button class="back-from-delete-btn" style="flex: 1; padding: 12px; background: #6c757d; color: white; border-radius: 4px;">이전</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const closeBtn = detailModal.querySelector('.detail-close-btn');
    const cancelBtn = detailModal.querySelector('.cancel-btn');
    const editBtn = detailModal.querySelector('.edit-btn');
    const deleteBtn = detailModal.querySelector('.delete-btn');
    const applyFilterBtn = detailModal.querySelector('.apply-filter-btn');
    const defaultActions = detailModal.querySelector('.default-footer-actions');
    const deleteConfirmActions = detailModal.querySelector('.delete-confirm-actions');
    const confirmDeleteBtn = detailModal.querySelector('.confirm-delete-btn');
    const backFromDeleteBtn = detailModal.querySelector('.back-from-delete-btn');

    closeBtn.addEventListener('click', () => detailModal.remove());
    cancelBtn.addEventListener('click', () => detailModal.remove());
    
    applyFilterBtn.addEventListener('click', () => {
      this.applyCustomerFilter(customer);
      detailModal.remove();
      this.closeModal();
    });

    editBtn.addEventListener('click', () => {
      if (typeof window.editCustomerById === 'function') {
        window.editCustomerById(customer.id);
        detailModal.remove();
        // this.closeModal(); // 🔥 수정 진입 시 리스트 모달을 닫지 않음 (v13.0)
      }
    });

    deleteBtn.addEventListener('click', () => {
      defaultActions.style.display = 'none';
      deleteConfirmActions.style.display = 'flex';
    });

    backFromDeleteBtn.addEventListener('click', () => {
      deleteConfirmActions.style.display = 'none';
      defaultActions.style.display = 'grid';
    });

    confirmDeleteBtn.addEventListener('click', async () => {
      if (typeof window.deleteCustomerById === 'function') {
        const success = await window.deleteCustomerById(customer.id);
        if (success !== false) {
          detailModal.remove();
          this.loadCustomerList();
        }
      }
    });

    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) detailModal.remove();
    });

    document.body.appendChild(detailModal);
  }

  generateCustomerDetailHtml(customer) {
    const phoneRaw = customer.phone || '';
    const telPhone = this.toTelPhone(phoneRaw);
    const phoneDisplay = phoneRaw ? this.escapeHtml(phoneRaw) : '연락처 없음';
    const phoneHtml = telPhone ? `<a href="tel:${telPhone}" style="color: #0d6efd; text-decoration: none;">${phoneDisplay}</a>` : phoneDisplay;

    let html = `<div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">`;
    const fields = [
      { label: '담당자', value: customer.manager },
      { label: '고객명', value: customer.name },
      { label: '연락처', value: phoneHtml, noEscape: true },
      { label: '상태', value: customer.status || '생' },
      { label: '희망 지역', value: customer.regions },
      { label: '희망 층수', value: customer.floor_pref || customer.floor },
      { label: '희망 면적', value: customer.area_pref || customer.area },
      { label: '희망 보증금', value: customer.deposit_pref || customer.deposit },
      { label: '희망 월세', value: customer.rent_pref || customer.rent },
      { label: '희망 권리금', value: customer.premium_pref || customer.premium },
      { label: '참고사항', value: customer.notes, isLong: true }
    ];

    fields.forEach(f => {
      if (f.value) {
        html += `
          <div class="detail-row" style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 600; color: #333; margin-bottom: 4px; font-size: 12px;">${f.label}</label>
            <div style="color: #666; font-size: 14px; ${f.isLong ? 'line-height: 1.4;' : ''}">${f.noEscape ? f.value : this.escapeHtml(f.value)}</div>
          </div>
        `;
      }
    });

    html += `</div>`;
    return html;
  }

  applyCustomerFilter(customer) {
    if (typeof window.applyCustomerFilter === 'function') {
      window.applyCustomerFilter(customer);
      const clearBtn = document.getElementById('clearCustomerFilterBtn');
      if (clearBtn) clearBtn.style.display = 'flex';
    }
  }

  showError(message) {
    const container = this.container.querySelector('.customer-list-container');
    if (container) container.innerHTML = `<div style="text-align: center; padding: 40px; color: #dc3545;">⚠️ ${message}</div>`;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  toTelPhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '');
  }
}

window.customerListModalManager = new CustomerListModalManager();
