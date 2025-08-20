/* -----------------------------------------
 * mode-switcher.js - 모드 전환 관리
 * -----------------------------------------
 * 중개사 모드와 브리핑 모드 간의 전환을 관리합니다.
 * 민감한 정보(비고, 연락처)를 접을 수 있는 기능을 제공합니다.
 * ----------------------------------------- */

// 전역 모드 상태 관리
window.APP_MODE = {
  current: 'agent', // 'agent' 또는 'briefing'
  isInitialized: false
};

// 모드 전환 관리자
class ModeSwitcher {
  constructor() {
    this.currentMode = 'agent';
    this.modeToggleBtn = null;
    this.modeText = null;
    this.modeIcon = null;
    this.init();
  }

  init() {
    console.log('ModeSwitcher 초기화 시작');
    
    // DOM이 완전히 로드될 때까지 대기
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeAfterDOMReady();
      });
    } else {
      this.initializeAfterDOMReady();
    }
  }
  
  // DOM 로드 완료 후 초기화
  initializeAfterDOMReady() {
    // DOM 요소 참조
    this.modeToggleBtn = document.getElementById('modeToggleBtn');
    this.modeText = document.getElementById('modeText');
    this.modeIcon = document.getElementById('modeIcon');
    
    if (!this.modeToggleBtn || !this.modeText || !this.modeIcon) {
      console.error('❌ 모드 전환 버튼 요소를 찾을 수 없습니다. DOM이 아직 준비되지 않았습니다.');
      // 잠시 후 다시 시도
      setTimeout(() => {
        this.initializeAfterDOMReady();
      }, 100);
      return;
    }

    // 초기 모드 설정 (기본값: 중개사)
    this.setMode('agent');
    
    // 모드 전환 버튼 이벤트 리스너 등록
    this.modeToggleBtn.addEventListener('click', () => {
      this.toggleMode();
    });
    
    // Z키 단축키 이벤트 리스너 등록
    document.addEventListener('keydown', (e) => {
      // Z키 (대소문자 구분 없음)를 누르면 모드 전환
      if (e.key.toLowerCase() === 'z') {
        // Ctrl, Alt, Shift 등과 함께 누르지 않았을 때만 동작
        if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
          e.preventDefault(); // 기본 동작 방지
          this.toggleMode();
        }
      }
    });
    
    // 현재 모드에 따라 UI 초기화
    this.updateUI();
    
    console.log('ModeSwitcher 초기화 완료');
  }

  // 모드 전환
  toggleMode() {
    if (this.currentMode === 'agent') {
      this.enterBriefingMode();
    } else {
      this.enterAgentMode();
    }
    
    // 모드 전환 피드백 표시 제거 (손님 몰래 바꿀 수 있도록)
    // this.showModeChangeFeedback();
  }
  
  // 모드 전환 피드백 표시
  showModeChangeFeedback() {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px 40px;
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      z-index: 10000;
      pointer-events: none;
    `;
    
    feedback.textContent = this.currentMode === 'briefing' ? '브리핑 모드' : '중개사 모드';
    document.body.appendChild(feedback);
    
    // 1.5초 후 자동 제거
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 1500);
  }

  // 모드 설정
  setMode(mode) {
    this.currentMode = mode;
    window.APP_MODE = { current: mode };
    
    // 모드에 따른 UI 업데이트
    this.updateUI();
    
    // 모드 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode } }));
  }

  // UI 업데이트
  updateUI() {
    // DOM 요소가 존재하는지 확인
    if (!this.modeText || !this.modeIcon || !this.modeToggleBtn) {
      console.warn('⚠️ UI 업데이트를 위한 DOM 요소가 준비되지 않았습니다.');
      return;
    }
    
    if (this.currentMode === 'briefing') {
      // 브리핑 모드
      this.modeText.textContent = '브리핑';
      this.modeIcon.textContent = '📊';
      this.modeToggleBtn.classList.add('briefing-mode');
      this.modeToggleBtn.classList.remove('agent-mode');
    } else {
      // 중개사 모드
      this.modeText.textContent = '중개사';
      this.modeIcon.textContent = '👥';
      this.modeToggleBtn.classList.add('agent-mode');
      this.modeToggleBtn.classList.remove('briefing-mode');
    }
  }

  // 모드별 동작 실행
  executeModeActions() {
    if (this.currentMode === 'briefing') {
      this.enterBriefingMode();
    } else {
      this.enterAgentMode();
    }
  }

  // 브리핑 모드 진입
  enterBriefingMode() {
    this.setMode('briefing');
    
    // 민감한 정보 필드 접기
    setTimeout(() => {
      this.collapseSensitiveDetailFields();
    }, 100);
  }
  
  // 중개사 모드 진입
  enterAgentMode() {
    this.setMode('agent');
    
    // 모든 민감한 정보 필드 펼치기
    setTimeout(() => {
      this.expandSensitiveDetailFields();
    }, 100);
  }
  
  // 매물 상세정보에서 민감한 필드 접기
  collapseSensitiveDetailFields() {
    const sensitiveFields = ['비고', '연락처', '비고3'];
    sensitiveFields.forEach(fieldName => {
      this.collapseDetailField(fieldName);
    });
  }
  
  // 매물 상세정보에서 민감한 필드 펼치기
  expandSensitiveDetailFields() {
    const sensitiveFields = ['비고', '연락처', '비고3'];
    sensitiveFields.forEach(fieldName => {
      this.expandDetailField(fieldName);
    });
  }
  
  // 매물 상세정보에서 특정 필드 접기
  collapseDetailField(fieldName) {
    const detailPanels = document.querySelectorAll('.detail-row[data-field="' + fieldName + '"]');
    detailPanels.forEach(panel => {
      if (panel) {
        panel.classList.add('collapsed');
        const valueElement = panel.querySelector('.sensitive-value');
        if (valueElement) {
          valueElement.style.display = 'none';
          valueElement.style.opacity = '0';
        }
        
        // 아이콘도 잠금 상태로 변경
        const toggleIcon = panel.querySelector('.field-toggle');
        if (toggleIcon) {
          toggleIcon.textContent = '🔒';
          toggleIcon.style.color = '#dc3545';
        }
      }
    });
  }
  
  // 매물 상세정보에서 특정 필드 펼치기
  expandDetailField(fieldName) {
    const detailPanels = document.querySelectorAll('.detail-row[data-field="' + fieldName + '"]');
    detailPanels.forEach(panel => {
      if (panel) {
        panel.classList.remove('collapsed');
        const valueElement = panel.querySelector('.sensitive-value');
        if (valueElement) {
          valueElement.style.display = '';
          valueElement.style.opacity = '1';
        }
        
        // 아이콘도 열림 상태로 변경
        const toggleIcon = panel.querySelector('.field-toggle');
        if (toggleIcon) {
          toggleIcon.textContent = '📋';
          toggleIcon.style.color = '#007bff';
        }
      }
    });
  }

  // 현재 모드 반환
  getCurrentMode() {
    return this.currentMode;
  }

  // 브리핑 모드인지 확인
  isBriefingMode() {
    return this.currentMode === 'briefing';
  }

  // 중개사 모드인지 확인
  isAgentMode() {
    return this.currentMode === 'agent';
  }
}

// 전역 인스턴스 생성
window.modeSwitcher = new ModeSwitcher();

// 모듈 로드 완료 표시
console.log('✅ mode-switcher.js 로드 완료');
