/**
 * recommendations.js - 추천매물 관리
 * 
 * 모든 사용자가 공유하는 추천 기능
 * - 추천하기 (추천 이유 입력)
 * - 의견 작성하기
 * - 추천 및 의견 조회
 */

// 전역 변수
let RECOMMENDATIONS = {}; // 전체 추천 데이터
let USER_RECOMMENDATIONS = new Set(); // 현재 사용자가 추천한 매물 ID들

/**
 * 추천매물 데이터 로드
 */
async function loadRecommendations() {
  try {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
    const response = await fetch('/api/recommendations', {
      headers: { 
        "X-User": currentUser,
        "X-CSRF-Token": csrfToken
      }
    });
    
    if (!response.ok) {
      throw new Error(`API 실패: ${response.status}`);
    }
    
    const data = await response.json();
    RECOMMENDATIONS = data.all_recommendations || {};
    USER_RECOMMENDATIONS = new Set(data.user_recommended_listings || []);
    
    // 🔥 핵심 수정: 전역 변수 동기화
    window.USER_RECOMMENDATIONS = USER_RECOMMENDATIONS;
    window.RECOMMENDATIONS = RECOMMENDATIONS;
    
    console.log(`✅ 추천매물 데이터 로드됨: ${Object.keys(RECOMMENDATIONS).length}개 매물`);
    
    // 추천 데이터 로드 완료 후 클러스터 버블 업데이트
    setTimeout(() => {
      if (window.updateClusterBubblesRecommendationStatus) {
        window.updateClusterBubblesRecommendationStatus();
      }
    }, 100);
    
    return true;
  } catch (error) {
    console.error('❌ 추천매물 데이터 로드 실패:', error);
    return false;
  }
}

/**
 * 추천 토글 (추천하기/추천해제)
 */
async function toggleRecommendation(listingId) {
  try {
    const isCurrentlyRecommended = USER_RECOMMENDATIONS.has(listingId);
    
    if (isCurrentlyRecommended) {
      // 추천 해제
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
      const response = await fetch(`/api/recommendations/${listingId}`, {
        method: 'DELETE',
        headers: { 
          "X-User": currentUser,
          "X-CSRF-Token": csrfToken
        }
      });
      
      if (!response.ok) {
        throw new Error(`API 실패: ${response.status}`);
      }
      
      USER_RECOMMENDATIONS.delete(listingId);
      if (RECOMMENDATIONS[listingId]) {
        delete RECOMMENDATIONS[listingId]["recommended_by"][currentUser];
        if (Object.keys(RECOMMENDATIONS[listingId]["recommended_by"]).length === 0) {
          delete RECOMMENDATIONS[listingId];
        }
      }
      
      // 동기화 플래그 리셋 (상태 변경됨)
      window._recommendationUISynced = false;
    } else {
      // 추천하기 - 모달 열기
      openRecommendationModal(listingId);
      return;
    }
    
    // UI 업데이트
    updateRecommendationUI(listingId);
    
    const action = isCurrentlyRecommended ? '해제' : '추가';
    showToast(`매물 추천이 ${action}되었습니다.`, 'success');
    return true;
    
  } catch (error) {
    console.error('❌ 추천 토글 실패:', error);
    showToast(`추천 ${isCurrentlyRecommended ? '해제' : '추가'} 실패: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 추천 모달 열기
 */
function openRecommendationModal(listingId) {
  const modal = document.createElement('div');
  modal.className = 'recommendation-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>매물 추천하기</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>추천 이유를 입력해주세요:</label>
          <textarea id="recommendationReason" placeholder="예: 가격이 합리적이고 위치가 좋음" maxlength="100"></textarea>
          <div class="char-count"><span id="charCount">0</span>/100</div>
        </div>
        <div class="form-group">
          <label>의견을 추가로 작성하시겠습니까? (선택사항)</label>
          <textarea id="recommendationComment" placeholder="예: 교통편이 편리해서 좋습니다" maxlength="200"></textarea>
          <div class="char-count"><span id="commentCharCount">0</span>/200</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel">취소</button>
        <button class="btn-submit">추천하기</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 이벤트 리스너
  const reasonTextarea = modal.querySelector('#recommendationReason');
  const commentTextarea = modal.querySelector('#recommendationComment');
  const charCount = modal.querySelector('#charCount');
  const commentCharCount = modal.querySelector('#commentCharCount');
  const closeBtn = modal.querySelector('.close-btn');
  const cancelBtn = modal.querySelector('.btn-cancel');
  const submitBtn = modal.querySelector('.btn-submit');
  
  // 글자 수 카운트
  reasonTextarea.addEventListener('input', () => {
    charCount.textContent = reasonTextarea.value.length;
  });
  
  commentTextarea.addEventListener('input', () => {
    commentCharCount.textContent = commentTextarea.value.length;
  });
  
  // 모달 닫기
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // 추천하기
  submitBtn.addEventListener('click', async () => {
    const reason = reasonTextarea.value.trim();
    const comment = commentTextarea.value.trim();
    
    if (!reason) {
      showToast('추천 이유를 입력해주세요.', 'error');
      return;
    }
    
    try {
      // 추천 추가
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
      const response = await fetch(`/api/recommendations/${listingId}`, {
        method: 'POST',
        headers: {
          "X-User": currentUser,
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) {
        throw new Error(`API 실패: ${response.status}`);
      }
      
      // 의견 추가 (있는 경우)
      if (comment) {
        const commentResponse = await fetch(`/api/recommendations/${listingId}/comments`, {
          method: 'POST',
          headers: {
            "X-User": currentUser,
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          body: JSON.stringify({ comment })
        });
        
        if (!commentResponse.ok) {
          console.warn('추천은 성공했지만 의견 추가 실패');
        }
      }
      
      // 로컬 상태 업데이트
      USER_RECOMMENDATIONS.add(listingId);
      if (!RECOMMENDATIONS[listingId]) {
        RECOMMENDATIONS[listingId] = {
          recommended_by: {},
          comments: {}
        };
      }
      RECOMMENDATIONS[listingId]["recommended_by"][currentUser] = {
        reason,
        recommended_at: new Date().toISOString()
      };
      
      // 동기화 플래그 리셋 (상태 변경됨)
      window._recommendationUISynced = false;
      
      if (comment) {
        RECOMMENDATIONS[listingId]["comments"][currentUser] = {
          comment,
          commented_at: new Date().toISOString()
        };
      }
      
      // UI 업데이트
      updateRecommendationUI(listingId);
      closeModal();
      showToast('매물 추천이 완료되었습니다.', 'success');
      
    } catch (error) {
      console.error('❌ 추천 추가 실패:', error);
      showToast(`추천 추가 실패: ${error.message}`, 'error');
    }
  });
}

/**
 * 추천 취소 확인 모달 열기
 */
function openRecommendationCancelModal(listingId) {
  const modal = document.createElement('div');
  modal.className = 'recommendation-cancel-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>추천 취소</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <p>이 매물의 추천을 취소하시겠습니까?</p>
        <div class="warning-text">
          <small>⚠️ 추천을 취소하면 다른 사용자들이 볼 수 없게 됩니다.</small>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel">취소</button>
        <button class="btn-confirm">확인</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 이벤트 리스너
  const closeBtn = modal.querySelector('.close-btn');
  const cancelBtn = modal.querySelector('.btn-cancel');
  const confirmBtn = modal.querySelector('.btn-confirm');
  
  // 모달 닫기
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // 추천 취소 확인
  confirmBtn.addEventListener('click', async () => {
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
      const response = await fetch(`/api/recommendations/${listingId}`, {
        method: 'DELETE',
        headers: { 
          "X-User": currentUser,
          "X-CSRF-Token": csrfToken
        }
      });
      
      if (!response.ok) {
        throw new Error(`API 실패: ${response.status}`);
      }
      
      // 로컬 상태 업데이트
      USER_RECOMMENDATIONS.delete(listingId);
      if (RECOMMENDATIONS[listingId]) {
        delete RECOMMENDATIONS[listingId]["recommended_by"][currentUser];
        if (Object.keys(RECOMMENDATIONS[listingId]["recommended_by"]).length === 0) {
          delete RECOMMENDATIONS[listingId];
        }
      }
      
      // 동기화 플래그 리셋 (상태 변경됨)
      window._recommendationUISynced = false;
      
      // UI 업데이트
      updateRecommendationUI(listingId);
      closeModal();
      showToast('매물 추천이 취소되었습니다.', 'success');
      
    } catch (error) {
      console.error('❌ 추천 취소 실패:', error);
      showToast(`추천 취소 실패: ${error.message}`, 'error');
    }
  });
}

/**
 * 추천 상세 모달 열기 (추천 및 의견 보기)
 */
function openRecommendationDetailModal(listingId) {
  const recommendationData = RECOMMENDATIONS[listingId];
  if (!recommendationData) return;
  
  const modal = document.createElement('div');
  modal.className = 'recommendation-detail-modal';
  
  // 추천 목록 HTML
  const recommendationsHtml = Object.entries(recommendationData.recommended_by || {})
    .map(([user, data]) => `
      <div class="recommendation-item">
        <div class="user-info">${user}</div>
        <div class="reason">${data.reason}</div>
        <div class="date">${new Date(data.recommended_at).toLocaleString()}</div>
      </div>
    `).join('');
  
  // 의견 목록 HTML
  const commentsHtml = Object.entries(recommendationData.comments || {})
    .map(([user, data]) => `
      <div class="comment-item">
        <div class="user-info">${user}</div>
        <div class="comment">${data.comment}</div>
        <div class="date">${new Date(data.commented_at).toLocaleString()}</div>
      </div>
    `).join('');
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>추천 및 의견</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="recommendations-section">
          <h4>추천 이유</h4>
          <div class="recommendations-list">
            ${recommendationsHtml || '<div class="no-data">추천이 없습니다.</div>'}
          </div>
        </div>
        <div class="comments-section">
          <h4>의견</h4>
          <div class="comments-list">
            ${commentsHtml || '<div class="no-data">의견이 없습니다.</div>'}
          </div>
        </div>
        <div class="add-comment-section">
          <h4>의견 작성</h4>
          <textarea id="newComment" placeholder="의견을 입력해주세요" maxlength="200"></textarea>
          <div class="char-count"><span id="newCommentCharCount">0</span>/200</div>
          <button class="btn-add-comment">의견 추가</button>
        </div>
        <div class="recommendation-actions">
          <button class="btn-cancel-recommendation">추천 취소</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 이벤트 리스너
  const closeBtn = modal.querySelector('.close-btn');
  const commentTextarea = modal.querySelector('#newComment');
  const charCount = modal.querySelector('#newCommentCharCount');
  const addCommentBtn = modal.querySelector('.btn-add-comment');
  const cancelRecommendationBtn = modal.querySelector('.btn-cancel-recommendation');
  
  // 글자 수 카운트
  commentTextarea.addEventListener('input', () => {
    charCount.textContent = commentTextarea.value.length;
  });
  
  // 모달 닫기
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // 추천 취소 버튼
  cancelRecommendationBtn.addEventListener('click', () => {
    closeModal();
    openRecommendationCancelModal(listingId);
  });
  
  // 의견 추가
  addCommentBtn.addEventListener('click', async () => {
    const comment = commentTextarea.value.trim();
    
    if (!comment) {
      showToast('의견을 입력해주세요.', 'error');
      return;
    }
    
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
      const response = await fetch(`/api/recommendations/${listingId}/comments`, {
        method: 'POST',
        headers: {
          "X-User": currentUser,
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({ comment })
      });
      
      if (!response.ok) {
        throw new Error(`API 실패: ${response.status}`);
      }
      
      // 로컬 상태 업데이트
      if (!RECOMMENDATIONS[listingId]) {
        RECOMMENDATIONS[listingId] = {
          recommended_by: {},
          comments: {}
        };
      }
      RECOMMENDATIONS[listingId]["comments"][currentUser] = {
        comment,
        commented_at: new Date().toISOString()
      };
      
      closeModal();
      showToast('의견이 추가되었습니다.', 'success');
      
    } catch (error) {
      console.error('❌ 의견 추가 실패:', error);
      showToast(`의견 추가 실패: ${error.message}`, 'error');
    }
  });
}

/**
 * 추천매물 별표 HTML 생성
 */
function createRecommendationStar(listingId) {
  const isRecommended = USER_RECOMMENDATIONS.has(listingId);
  
  return `
    <div class="recommendation-star-container" data-listing-id="${listingId}">
      <span class="recommendation-star ${isRecommended ? 'recommended' : ''}" 
            title="${isRecommended ? '추천 상세보기' : '추천하기'}"
            onclick="handleRecommendationClick('${listingId}')">
        ${isRecommended ? '⭐' : '☆'}
      </span>
    </div>
  `;
}

/**
 * 추천 클릭 핸들러
 */
function handleRecommendationClick(listingId) {
  const isRecommended = USER_RECOMMENDATIONS.has(listingId);
  
  if (isRecommended) {
    // 추천된 경우: 취소 확인 모달 열기
    openRecommendationCancelModal(listingId);
  } else {
    // 추천 안된 경우: 추천 모달 열기
    openRecommendationModal(listingId);
  }
}

/**
 * 추천매물 UI 업데이트
 */
function updateRecommendationUI(listingId) {
  // 매물 리스트의 별표 업데이트
  const starElement = document.querySelector(`[data-listing-id="${listingId}"] .recommendation-star`);
  if (starElement) {
    const isRecommended = USER_RECOMMENDATIONS.has(listingId);
    starElement.classList.toggle('recommended', isRecommended);
    starElement.title = isRecommended ? '추천 상세보기' : '추천하기';
    starElement.textContent = isRecommended ? '⭐' : '☆';
  }
  
  // 클러스터 매물 목록의 별표 업데이트
  if (window.updateClusterRecommendationUI) {
    window.updateClusterRecommendationUI(listingId);
  }
  
  // 지도 마커 업데이트
  if (window.updateMapMarkerRecommendation) {
    window.updateMapMarkerRecommendation(listingId);
  }
}

/**
 * 전체 추천 UI 동기화 (모든 매물의 추천 상태 업데이트)
 * 성능 최적화: 필요한 경우에만 호출
 */
function syncAllRecommendationUI() {
  // 성능 최적화: 이미 동기화된 경우 스킵
  if (window._recommendationUISynced) {
    return;
  }
  
  console.log('🔄 전체 추천 UI 동기화 시작...');
  
  // 모든 매물 리스트의 별표 업데이트
  const allStarElements = document.querySelectorAll('.recommendation-star');
  allStarElements.forEach(starElement => {
    const container = starElement.closest('[data-listing-id]');
    if (container) {
      const listingId = container.getAttribute('data-listing-id');
      if (listingId) {
        const isRecommended = USER_RECOMMENDATIONS.has(listingId);
        starElement.classList.toggle('recommended', isRecommended);
        starElement.title = isRecommended ? '추천 상세보기' : '추천하기';
        starElement.textContent = isRecommended ? '⭐' : '☆';
      }
    }
  });
  
  // 모든 마커의 추천 상태 업데이트
  if (window.updateAllMarkersRecommendationStatus) {
    window.updateAllMarkersRecommendationStatus();
  }
  
  // 클러스터 버블의 추천 상태 업데이트
  if (window.updateClusterBubblesRecommendationStatus) {
    window.updateClusterBubblesRecommendationStatus();
  }
  
  window._recommendationUISynced = true;
  console.log('✅ 전체 추천 UI 동기화 완료');
}

/**
 * 매물이 추천되었는지 확인
 */
function isRecommended(listingId) {
  return USER_RECOMMENDATIONS.has(listingId);
}

/**
 * 매물의 추천 데이터 반환
 */
function getRecommendationData(listingId) {
  return RECOMMENDATIONS[listingId];
}

// 전역 함수 및 변수로 export
window.loadRecommendations = loadRecommendations;
window.toggleRecommendation = toggleRecommendation;
window.createRecommendationStar = createRecommendationStar;
window.handleRecommendationClick = handleRecommendationClick;
window.updateRecommendationUI = updateRecommendationUI;
window.syncAllRecommendationUI = syncAllRecommendationUI;
window.isRecommended = isRecommended;
window.getRecommendationData = getRecommendationData;
window.USER_RECOMMENDATIONS = USER_RECOMMENDATIONS;
window.RECOMMENDATIONS = RECOMMENDATIONS;
