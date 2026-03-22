/* -----------------------------------------
 * detail-panel.js - 상세 패널 UI
 * ----------------------------------------- */

/**************************************
 * ===== 상세 패널 UI =====
 **************************************/

async function renderDetailPanel(item) {
  // 모바일 디바이스인지 확인
  function isMobileDevice() {
    const ua = navigator.userAgent;
    const isMobileOS = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isMobileBrowser = ua.includes('Mobile') || ua.includes('NAVER(inapp');
    return isMobileOS || isMobileBrowser;
  }

  // 모바일 환경에서는 기존 매물리스트 모달 사용
  if (isMobileDevice() || window.MOBILE_APP) {
    // 기존 매물리스트 모달 매니저 사용
    if (window.listingListModalManager && typeof window.listingListModalManager.showListingDetail === 'function') {
      // 모달이 열려있지 않으면 먼저 모달 열기
      const listingListModal = document.getElementById('listingListModal');
      const isModalOpen = listingListModal && !listingListModal.classList.contains('hidden');

      if (!isModalOpen) {
        // 상세정보 표시 시 모달을 명시적으로 '열기' (이미 열려있으면 유지)
        await window.listingListModalManager.openModal('open');
        // 모달이 열린 후 상세정보 표시 (단일 마커 진입 플래그)
        setTimeout(() => {
          window.listingListModalManager.showListingDetail(item, { fromMarker: true });
        }, 100);
      } else {
        window.listingListModalManager.showListingDetail(item);
      }
    } else {
      console.error('listingListModalManager를 찾을 수 없습니다');
    }
    return;
  }

  // PC버전: 2차 사이드바 열기
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
  const isHousing = (typeof item.id === 'string' && item.id.startsWith('h_')) || (window.UI_STATE && window.UI_STATE.listingMode === "housing");

  const sensitiveFields = ['비고', '연락처', '비고3'];
  const dr = (label, val) => {
    const isSensitive = sensitiveFields.includes(label);
    const dataFieldAttr = isSensitive ? `data-field="${label}"` : '';
    const sensitiveValueClass = isSensitive ? 'sensitive-value' : '';
    const toggleIcon = isSensitive ? `<span class="field-toggle" style="cursor: pointer; margin-left: 8px; font-size: 14px;" onclick="toggleSensitiveField('${label}')">📋</span>` : '';
    return `<div class="detail-row" ${dataFieldAttr} style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
        <span class="label" style="font-weight: 600; color: #333; min-width: 70px; font-size: 13px;">${label}${toggleIcon}</span>
        <span class="value ${sensitiveValueClass}" style="color: #666; font-size: 13px;">${escapeHtml(val || '-')}</span>
      </div>`;
  };

  const formatSupplyExcl = typeof window.formatSupplyExclusive === 'function' ? window.formatSupplyExclusive : (s, e) => (s || e) ? `${s || '-'}/${e || '-'}` : '-/-';
  let detailRows = "";
  if (isHousing) {
    detailRows = dr('접수일', fields['접수일']) + dr('지역', fields['지역']) + dr('지번', fields['지번']) + dr('유형', fields['유형']) +
      dr('건물명', fields['건물명']) + dr('동', fields['동']) + dr('층수', fields['층수']) + dr('호수', fields['호수']) + dr('향', fields['향']) +
      dr('공급/전용', formatSupplyExcl(fields['공급'], fields['전용'])) +
      dr('보증금', fields['보증금']) + dr('월세', fields['월세']) + dr('관리비', fields['관리비']) + dr('매매가', fields['매매가']) +
      dr('방', fields['방']) + dr('화장실', fields['화장실']) + dr('거래유형', fields['거래유형']) +
      dr('소유자', fields['의뢰인']) + dr('소유자관계', fields['관계']) + dr('연락처', fields['연락처']) + dr('임차인 연락처', fields['임차인 연락처']) +
      dr('비고', fields['비고']) + dr('현황', getStatusDisplay(item.status_raw)) + dr('지역2', fields['지역2']);
  } else {
    // 상가 모드: 서브타입별 분기
    const subtype = (window.UI_STATE && window.UI_STATE.commercialSubtype) || "lease";

    if (subtype === "lease") {
      // 상가 임대차 전문 필드
      detailRows = dr('접수일', fields['접수일']) + dr('지역', fields['지역']) + dr('지번', fields['지번']) + dr('건물명', fields['건물명']) + dr('가게명', fields['가게명']) +
        dr('층수', fields['층수']) + dr('실평수', fields['실평수'] ? fields['실평수'] + '평' : '') + dr('보증금', fields['보증금']) + dr('월세', fields['월세']) + dr('권리금', fields['권리금']);
    } else if (subtype === "unit") {
      // 구분상가 매매 (실제 시트 헤더 순서 반영)
      detailRows = dr('접수일', fields['접수일']) + dr('지역', fields['지역']) + dr('지번', fields['지번']) +
        dr('건물명', fields['건물명']) + dr('층수', fields['층수']) + dr('가게명', fields['가게명']) +
        dr('분양(㎡)', fields['분양(㎡)']) + dr('분양(평)', fields['분양(평)']) + dr('전용(평)', fields['전용(평)']) +
        dr('보증금', fields['보증금']) + dr('월세', fields['월세']) + dr('매매가', fields['매매가']) +
        dr('평당가격', fields['평당가격']) + dr('LTV', fields['LTV']) + dr('이율', fields['이율']) + dr('수익율', fields['수익율']);
    } else if (subtype === "land") {
      // 건물토지 매매 (실제 시트 헤더 순서 반영)
      detailRows = dr('접수일', fields['접수일']) + dr('지역', fields['지역']) + dr('지번', fields['지번']) +
        dr('건물명', fields['건물명']) + dr('지하총층', fields['지하총층']) + dr('지상총층', fields['지상총층']) +
        dr('대지(㎡)', fields['대지(㎡)']) + dr('대지(평)', fields['대지(평)']) +
        dr('건축(㎡)', fields['건축(㎡)']) + dr('연(㎡)', fields['연(㎡)']) +
        dr('보증금', fields['보증금']) + dr('월세', fields['월세']) + dr('매매가', fields['매매가']) +
        dr('평당가격', fields['평당가격']) + dr('LTV', fields['LTV']) + dr('이율', fields['이율']) + dr('수익율', fields['수익율']);
    }

    // 소유자 정보 및 공통 마무리
    detailRows += dr('비고', fields['비고']) + dr('담당자', fields['담당자'] || fields['manager']) +
      dr('현황', getStatusDisplay(item.status_raw)) +
      dr('소유자', fields['의뢰인']) + dr('소유자관계', fields['비고3']) + dr('연락처', fields['연락처']);
  }

  const titleName = isHousing
    ? ((fields['건물명'] || '') + (fields['동'] ? ' ' + fields['동'] : '') + (fields['호수'] ? ' ' + fields['호수'] : '') || '매물명 없음')
    : (fields['가게명'] || fields['건물명'] || '매물명 없음');

  detailEl.innerHTML = `
    <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <div style="font-size: 16px; font-weight: bold; color: #333;">${escapeHtml(titleName)}</div>
        <button id="pcPhotoUploadBtn" style="background: #007bff; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px;">
          <span>📷</span> 사진추가
        </button>
      </div>
      <div style="color: #666; font-size: 13px; margin-bottom: 10px;">📍 ${escapeHtml(addr || '주소 없음')} <span class="listing-detail-briefing-status briefing-${getBriefingStatus(item.id)}" onclick="cycleBriefingStatus('${item.id}')">${getBriefingStatusText(getBriefingStatus(item.id))}</span></div>
    </div>
    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px;">
      ${detailRows}
    </div>
    <input type="file" id="pcPhotoInput" style="display: none;" accept="image/*">
  `;

  // 브리핑 모드인 경우 민감한 정보 자동 접기 (동기 실행)
  if (window.APP_MODE && window.APP_MODE.current === 'briefing') {
    const sensitiveFields = ['비고', '연락처', '비고3'];
    sensitiveFields.forEach(fieldName => {
      const fieldElement = document.querySelector(`[data-field="${fieldName}"]`);
      if (fieldElement) {
        fieldElement.classList.add('collapsed');
        const valueElement = fieldElement.querySelector('.sensitive-value');
        if (valueElement) {
          valueElement.style.display = 'none';
          valueElement.style.opacity = '0';
        }
        const toggleIcon = fieldElement.querySelector('.field-toggle');
        if (toggleIcon) {
          toggleIcon.textContent = '🔒';
          toggleIcon.style.color = '#dc3545';
        }
      }
    });
  }

  // 매물 사진 갤러리 컨테이너 추가
  const galleryContainer = document.createElement('div');
  galleryContainer.id = 'listingPhotoGallery';
  galleryContainer.className = 'detail-photo-gallery';
  galleryContainer.innerHTML = '<div style="grid-column: span 3; color: #999; font-size: 12px; text-align: center; padding: 10px;">사진을 불러오는 중...</div>';

  const targetArea = detailEl.querySelector('div[style*="background: #f8f9fa"]');
  if (targetArea) {
    targetArea.appendChild(galleryContainer);
  } else {
    detailEl.prepend(galleryContainer);
  }

  // 사진 데이터 비동기 로드 및 렌더링
  loadAndRenderPhotos(item.id);

  // 업로드 버튼 이벤트 바인딩
  const uploadBtn = document.getElementById('pcPhotoUploadBtn');
  const fileInput = document.getElementById('pcPhotoInput');
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handlePhotoUpload(item.id, e);
  }
}

// 사진 업로드 처리 (PC)
async function handlePhotoUpload(listingId, event) {
  const file = event.target.files[0];
  if (!file) return;

  const uploadBtn = document.getElementById('pcPhotoUploadBtn');
  const originalText = uploadBtn.innerHTML;

  try {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span>⏳</span>...';

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
      loadAndRenderPhotos(listingId);
    } else {
      alert('업로드 실패: ' + (data.error || '알 수 없는 오류'));
    }
  } catch (error) {
    console.error('사진 업로드 중 오류:', error);
    alert('사진 업로드 중 오류가 발생했습니다.');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = originalText;
    event.target.value = '';
  }
}

// 사진 목록 로드 및 렌더링
async function loadAndRenderPhotos(listingId) {
  const gallery = document.getElementById('listingPhotoGallery');
  if (!gallery) return;

  try {
    const response = await fetch(`/api/listings/${listingId}/photos`);
    const data = await response.json();

    if (data.success && data.photos && data.photos.length > 0) {
      gallery.innerHTML = data.photos.map(photo => `
        <div class="gallery-item" onclick="openLightbox('${photo.full_url}', '${photo.file_name}')">
          <img src="${photo.full_url}" alt="매물사진" onerror="this.src='/static/img/no-image.png'">
        </div>
      `).join('');
    } else {
      gallery.innerHTML = '<div style="grid-column: span 3; color: #999; font-size: 11px; text-align: center; padding: 5px;">등록된 사진이 없습니다.</div>';
      // 사진이 없으면 영역 숨김 처리 (선택 사항)
      // gallery.style.display = 'none';
    }
  } catch (error) {
    console.error('사진 로드 중 오류:', error);
    gallery.innerHTML = '<div style="grid-column: span 3; color: #f44336; font-size: 11px; text-align: center; padding: 5px;">사진을 불러오지 못했습니다.</div>';
  }
}

// 라이트박스 제어
// 라이트박스 제어 (다중 사진 스와이프 확장)
// 전역 상태
let _lbPhotos = [];   // [{full_url, file_name}, ...]
let _lbIndex = 0;

function _lbUpdateUI() {
  const img = document.getElementById('lightboxImage');
  const downloadBtn = document.getElementById('downloadPhotoBtn');
  const counter = document.getElementById('lightboxCounter');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  if (!img) return;

  const photo = _lbPhotos[_lbIndex];
  if (!photo) return;

  // 1. 새 이미지 로딩 전 기존 이미지 숨김 (깜박임 방지 핵심)
  img.style.transition = 'none';
  img.style.opacity = '0';

  // 2. 이미지 로드 완료 시 페이드인 처리
  const tempImg = new Image();
  tempImg.onload = () => {
    img.src = photo.full_url;
    // 브라우저 렌더링 동기를 위해 requestAnimationFrame 사용
    requestAnimationFrame(() => {
      img.style.transition = 'opacity 0.2s ease-in-out';
      img.style.opacity = '1';
    });
  };
  tempImg.src = photo.full_url;

  if (downloadBtn) {
    downloadBtn.href = photo.full_url;
    downloadBtn.setAttribute('download', photo.file_name || 'listing_photo.jpg');
  }

  // 다중 사진일 때만 네비게이션 UI 표시
  const isMulti = _lbPhotos.length > 1;
  if (counter) {
    counter.style.display = isMulti ? 'block' : 'none';
    counter.textContent = `${_lbIndex + 1} / ${_lbPhotos.length}`;
  }
  if (prevBtn) prevBtn.style.display = (isMulti && _lbIndex > 0) ? 'block' : 'none';
  if (nextBtn) nextBtn.style.display = (isMulti && _lbIndex < _lbPhotos.length - 1) ? 'block' : 'none';
}

function lightboxNavigate(direction) {
  const newIdx = _lbIndex + direction;
  if (newIdx >= 0 && newIdx < _lbPhotos.length) {
    _lbIndex = newIdx;
    _lbUpdateUI();
  }
}
window.lightboxNavigate = lightboxNavigate;

/**
 * openLightbox - 단일/다중 사진 모두 지원
 * 사용법 1 (기존 호환): openLightbox(url, filename)
 * 사용법 2 (다중 사진): openLightbox(photosArray, startIndex)
 *   photosArray: [{full_url, file_name}, ...]
 */
function openLightbox(urlOrPhotos, filenameOrIndex) {
  const lightbox = document.getElementById('photoLightbox');
  if (!lightbox) return;

  // 사용법 판별: 배열이면 다중 모드, 문자열이면 단일 모드
  if (Array.isArray(urlOrPhotos)) {
    _lbPhotos = urlOrPhotos;
    _lbIndex = (typeof filenameOrIndex === 'number') ? filenameOrIndex : 0;
  } else {
    // 단일 사진 (기존 호환)
    _lbPhotos = [{ full_url: urlOrPhotos, file_name: filenameOrIndex || 'listing_photo.jpg' }];
    _lbIndex = 0;
  }

  // 1. 탭 지연 방지를 위해 즉시 모달 구조 표시 (v1.2 최적화 클래스 적용)
  lightbox.classList.add('active');
  window.isLightboxOpen = true; // 🔥 근본 해결: 리사이즈 루프 차단 플래그 활성화
  
  // 2. 백그라운드 레이어 고정 (V1.4: 깜박임 방지를 위해 블러/투명도 필터 제거)
  const appRoot = document.getElementById('appRoot');

  // 3. 백그라운드 이미지 비동기 로딩 시작
  _lbUpdateUI();

  // 닫기 이벤트 (1회만 바인딩)
  const closeBtn = document.getElementById('closeLightbox');
  if (closeBtn && !closeBtn.dataset.bound) {
    const closeHandler = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // V1.4: 레이어 격리 해제 (필터 제거됨)

      // 0.05초 지연 후 닫기 (고스트 클릭 방지 유지)
      lightbox.style.pointerEvents = 'none';
      setTimeout(() => {
        lightbox.classList.remove('active');
        lightbox.style.pointerEvents = '';
        window.isLightboxOpen = false; // 🔥 근본 해결: 리사이즈 루프 차단 플래그 해제
      }, 50);
    };
    closeBtn.onclick = closeHandler;
    lightbox.onclick = (e) => {
      if (e.target === lightbox || e.target.classList.contains('modal-content')) closeHandler(e);
    };
    closeBtn.dataset.bound = "true";
  }

  // 터치 스와이프 (1회만 바인딩)
  const modalContent = lightbox.querySelector('.modal-content');
  if (modalContent && !modalContent.dataset.swipeBound) {
    let touchStartX = 0;
    let touchStartY = 0;

    modalContent.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    modalContent.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      const dy = e.changedTouches[0].screenY - touchStartY;
      // 수평 이동이 수직보다 크고, 최소 50px 이상 이동했을 때만 스와이프로 인식
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) lightboxNavigate(1);   // 왼쪽 스와이프 → 다음
        else lightboxNavigate(-1);          // 오른쪽 스와이프 → 이전
      }
    }, { passive: true });

    modalContent.dataset.swipeBound = "true";
  }
}

// 전역 할당
window.openLightbox = openLightbox;

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