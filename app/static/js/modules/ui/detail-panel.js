/* -----------------------------------------
 * detail-panel.js - 상세 패널 UI
 * ----------------------------------------- */

/**************************************
 * ===== 상세 패널 UI =====
 **************************************/

function renderDetailPanel(item) {
  // showSecondaryPanel 함수 사용 (UI 변동 방지)
  showSecondaryPanel('viewListingDetail');
  
  const viewListingDetail = document.getElementById('viewListingDetail');
  if (!viewListingDetail) {
    console.error('매물상세 뷰 요소를 찾을 수 없습니다');
    return;
  }
  
  const detailTitleEl = document.getElementById("secondaryPanelTitle");
  const detailEl = document.getElementById('viewListingDetail');
  
  if (!detailTitleEl || !detailEl) return;
  
  detailTitleEl.textContent = "매물 상세 정보";
  
  const fields = item.fields || {};
  const addr = item.address_full || '';
  
  detailEl.innerHTML = `
    <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
      <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 6px;">${escapeHtml(fields['가게명'] || fields['건물명'] || '매물명 없음')}</div>
      <div style="color: #666; font-size: 13px;">📍 ${escapeHtml(addr || '주소 없음')} <span class="listing-detail-briefing-status briefing-${getBriefingStatus(item.id)}" onclick="cycleBriefingStatus('${item.id}')">${getBriefingStatusText(getBriefingStatus(item.id))}</span></div>
    </div>
    
    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; height: calc(100vh - 200px); overflow-y: auto;">
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">접수날짜</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['접수날짜'] || '접수날짜 없음')}</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">지역</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['지역'] || '지역 정보 없음')}</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">지번</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['지번'] || '지번 정보 없음')}</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">건물명</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['건물명'] || '건물명 없음')}</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">가게명</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['가게명'] || '가게명 없음')}</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">층수</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['층수'] || '층수 정보 없음')}</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">실평수</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['실평수'] || '실평수 정보 없음')}평</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">보증금</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['보증금'] || '보증금 정보 없음')}</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">월세</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['월세'] || '월세 정보 없음')}</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">권리금</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['권리금'] || '권리금 정보 없음')}</span>
      </div>
      <div class="detail-row sensitive-field" data-field="비고" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">
          ${window.APP_MODE && window.APP_MODE.current === 'briefing' ? '<span class="field-toggle" onclick="toggleSensitiveField(\'비고\')" style="cursor: pointer; color: #007bff;">📋</span>' : ''} 비고
        </span>
        <span class="value sensitive-value" style="color: #666; flex: 1; font-size: 13px;">${escapeHtml(fields['비고'] || '비고 없음')}</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">의뢰인</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['의뢰인'] || '의뢰인 정보 없음')}</span>
      </div>
      <div class="detail-row sensitive-field" data-field="연락처" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">
          ${window.APP_MODE && window.APP_MODE.current === 'briefing' ? '<span class="field-toggle" onclick="toggleSensitiveField(\'연락처\')" style="cursor: pointer; color: #007bff;">��</span>' : ''} 연락처
        </span>
        <span class="value sensitive-value" style="color: #666; font-size: 13px;">${escapeHtml(fields['연락처'] || '연락처 정보 없음')}</span>
      </div>
      ${fields['비고3'] ? `<div class="detail-row sensitive-field" data-field="비고3" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">
          ${window.APP_MODE && window.APP_MODE.current === 'briefing' ? '<span class="field-toggle" onclick="toggleSensitiveField(\'비고3\')" style="cursor: pointer; color: #007bff;">📋</span>' : ''} 비고3
        </span>
        <span class="value sensitive-value" style="color: #666; flex: 1; font-size: 13px;">${escapeHtml(fields['비고3'])}</span>
      </div>` : ''}
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">현황</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(getStatusDisplay(item.status_raw))}</span>
      </div>
      <div class="detail-row" style="display: flex; justify-content: space-between; padding: 6px 0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">담당자</span>
        <span class="value" style="color: #666; font-size: 13px;">${escapeHtml(fields['담당자'] || fields['manager'] || '담당자 정보 없음')}</span>
      </div>
    </div>
  `;
  
  // 브리핑 모드인 경우 민감한 정보 자동 접기
  if (window.APP_MODE && window.APP_MODE.current === 'briefing') {
    setTimeout(() => {
      const sensitiveFields = ['비고', '연락처', '비고3'];
      sensitiveFields.forEach(fieldName => {
        const fieldElement = document.querySelector(`[data-field="${fieldName}"]`);
        if (fieldElement) {
          fieldElement.classList.add('collapsed');
          
          // 내용만 숨기기 (항목명은 그대로 표시)
          const valueElement = fieldElement.querySelector('.sensitive-value');
          if (valueElement) {
            valueElement.style.display = 'none';
            valueElement.style.opacity = '0';
          }
          
          // 아이콘도 잠금 상태로 변경
          const toggleIcon = fieldElement.querySelector('.field-toggle');
          if (toggleIcon) {
            toggleIcon.textContent = '🔒';
            toggleIcon.style.color = '#dc3545';
          }
        }
      });
    }, 50);
  }
}

// 민감한 정보 필드 접기/펼치기 토글
function toggleSensitiveField(fieldName) {
  const fieldElement = document.querySelector(`[data-field="${fieldName}"]`);
  if (!fieldElement) return;
  
  const isCollapsed = fieldElement.classList.contains('collapsed');
  
  if (isCollapsed) {
    // 접힌 상태면 펼치기
    fieldElement.classList.remove('collapsed');
    
    // 내용 표시
    const valueElement = fieldElement.querySelector('.sensitive-value');
    if (valueElement) {
      valueElement.style.display = '';
      valueElement.style.opacity = '1';
    }
    
    // 아이콘 변경
    const toggleIcon = fieldElement.querySelector('.field-toggle');
    if (toggleIcon) {
      toggleIcon.textContent = '📋';
      toggleIcon.style.color = '#007bff';
    }
  } else {
    // 펼쳐진 상태면 접기
    fieldElement.classList.add('collapsed');
    
    // 내용만 숨기기
    const valueElement = fieldElement.querySelector('.sensitive-value');
    if (valueElement) {
      valueElement.style.display = 'none';
      valueElement.style.opacity = '0';
    }
    
    // 아이콘 변경
    const toggleIcon = fieldElement.querySelector('.field-toggle');
    if (toggleIcon) {
      toggleIcon.textContent = '🔒';
      toggleIcon.style.color = '#dc3545';
    }
  }
}

// 상세 패널 UI 관련 함수들을 전역으로 export
window.renderDetailPanel = renderDetailPanel;
window.toggleSensitiveField = toggleSensitiveField; 