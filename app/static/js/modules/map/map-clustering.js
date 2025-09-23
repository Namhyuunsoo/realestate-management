/* -----------------------------------------
 * map-clustering.js - 클러스터링 관리
 * ----------------------------------------- */

/**************************************
 * ===== 클러스터링 관리 =====
 **************************************/

// 클러스터 클릭 위임 관련 전역 변수 (중복 선언 방지)
if (typeof window._clusterClickDelegationBound === 'undefined') {
  window._clusterClickDelegationBound = false;
}
if (typeof window._clusterClickHandler === 'undefined') {
  window._clusterClickHandler = null;
}

async function renderClusterGroupList(cluster) {
  const markers = cluster.getClusterMember();
  const ids     = markers.map(m => m._listingId);
  const arr     = LISTINGS.filter(x => ids.includes(x.id));

  // 모바일 모달이 열려있는지 확인
  const listingListModal = document.getElementById('listingListModal');
  const isModalOpen = listingListModal && !listingListModal.classList.contains('hidden');
  
  if (isModalOpen) {
    // 모바일 모달이 열려있을 때는 모달 내에서 클러스터 목록 표시
    console.log('모바일 모달 내에서 클러스터 목록 표시');
    
    if (window.listingListModalManager && typeof window.listingListModalManager.showClusterList === 'function') {
      window.listingListModalManager.showClusterList(arr);
    } else {
      console.error('listingListModalManager.showClusterList 함수를 찾을 수 없습니다');
    }
    return; // 기존 클러스터 리스트 표시하지 않고 함수 종료
  }
  
  // 모바일 디바이스인지 확인
  function isMobileDevice() {
    const ua = navigator.userAgent;
    const isMobileOS = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isMobileBrowser = ua.includes('Mobile') || ua.includes('NAVER(inapp');
    return isMobileOS || isMobileBrowser;
  }
  
  // 모바일 디바이스에서는 모달로 클러스터 목록 표시
  if (isMobileDevice()) {
    console.log('모바일 디바이스에서 클러스터 목록을 모달로 표시');
    
    if (window.listingListModalManager && typeof window.listingListModalManager.showClusterList === 'function') {
      // 모달이 열려있지 않으면 먼저 모달 열기
      if (!isModalOpen) {
        await window.listingListModalManager.openModal();
        // 모달이 열린 후 클러스터 목록 표시
        setTimeout(() => {
          window.listingListModalManager.showClusterList(arr);
        }, 100);
      } else {
        window.listingListModalManager.showClusterList(arr);
      }
    } else {
      console.error('listingListModalManager를 찾을 수 없습니다');
    }
    return;
  }

  // PC버전: 모바일 모달이 열려있지 않을 때만 기존 클러스터 리스트 표시
  const wrap = document.getElementById("clusterList");
  const ul   = document.getElementById("clusterItemList");
  const listingList = document.getElementById("listingList");
  if (!wrap || !ul) return;

  // 매물리스트는 그대로 유지 (클러스터 리스트는 절대 위치로 표시되므로 겹치지 않음)
  // 기존 UI 요소들의 크기나 위치를 변경하지 않음
  ul.innerHTML = "";

  arr.forEach(item => {
    const fields      = item.fields || {};
    
    // 주소에서 지역과 지번 추출
    const addr        = item.address_full || "";
    const addrParts   = addr.split(' ');
    const region      = addrParts.length > 0 ? escapeHtml(addrParts[0]) : "";
    const jibun       = addrParts.length > 1 ? escapeHtml(addrParts[1]) : "";
    
    // 층수 처리
    const floorRaw    = fields["층수"] || fields["층"] || "";
    const floor       = floorRaw
      ? (/층|지하|^b\d+/i.test(floorRaw) ? floorRaw : `${floorRaw}층`)
      : "-";
    
    // 가게명
    const storeName   = escapeHtml(fields["가게명"] || fields["건물명"] || "");
    
    // 실평수
    const area_real   = escapeHtml(fields["실평수"] || "-");
    
    // 보증금, 월세, 권리금
    const dep         = escapeHtml(fields["보증금"] || "-");
    const rent        = escapeHtml(fields["월세"]   || "-");
    const rawPrem     = (fields["권리금"] ?? "").toString().trim();
    const premDisplay = ["", "무권리", "0", "무"].includes(rawPrem)
      ? "무권리"
      : escapeHtml(rawPrem);

    const li = document.createElement("li");
    li.classList.add("listing-item");
    li.setAttribute("data-id", item.id);
    li.style.position = 'relative';
    // 현황 정보 추가 (속도 최적화)
    const status = getStatusDisplay(item.status_raw);
    
    li.innerHTML = `
      <div class="listing-item">
        <div class="meta-top">
          <div class="listing-info">
            <span class="region">${region}</span>
            <span class="jibun">${jibun}</span>
            <span class="floor">${floor}</span>
            <span class="store-name">${storeName}</span>
          </div>
          <div class="listing-controls">
            ${window.createRecommendationStar ? window.createRecommendationStar(item.id) : ''}
          </div>
        </div>
        <div class="meta-bottom">
          <span class="area-real">${area_real}평</span>
          <span class="deposit">보: ${dep}</span>
          <span class="rent">월: ${rent}</span>
          <span class="premium">권: ${premDisplay}</span>
        </div>
      </div>
    `;
    
    // 브리핑 상태 표시 추가
    const briefingStatus = getBriefingStatus(item.id);
    updateListingItemBriefingStatus(li, briefingStatus);

    li.addEventListener("click", () => {
      clearSelection();
      setActiveMarker(item.id);
      renderDetailPanel(item);
      
      // 선택 상태 업데이트 (UI 크기나 위치는 변경하지 않음)
      ul.querySelectorAll("li .listing-item.selected")
        .forEach(el => el.classList.remove("selected"));
      const inner = li.querySelector(".listing-item");
      if (inner) {
        inner.classList.add("selected");
      }
      
      // 클릭 시 애니메이션 효과 추가 (UI 크기나 위치는 변경하지 않음)
      const marker = MARKERS.find(m => m._listingId === item.id);
      if (marker && marker.getElement) {
        const dotEl = marker.getElement().querySelector(".marker-dot");
        if (dotEl) {
          dotEl.classList.add("blink");
          setTimeout(() => dotEl.classList.remove("blink"), 800);
        }
      }
      
      // 클러스터 버블 애니메이션도 시도 (UI 크기나 위치는 변경하지 않음)
      if (CLUSTERER && CLUSTERER._clusters) {
        const clusterObj = CLUSTERER._clusters.find(c =>
          c.getClusterMember().some(m => m._listingId === item.id)
        );
        if (clusterObj && clusterObj._clusterMarker) {
          const bubble = clusterObj._clusterMarker
            .getElement()
            .querySelector(".cluster-bubble");
          if (bubble) {
            bubble.classList.remove("cluster-animate");
            void bubble.offsetWidth;
            bubble.classList.add("cluster-animate");
          }
        }
      }
    });

    // 클러스터 목록 마우스오버 이벤트 추가
    li.addEventListener("mouseenter", () => {
      highlightMarkerTemp(item.id, true);
      
      // 마커 도트 blink 효과
      const marker = MARKERS.find(m => m._listingId === item.id);
      if (marker && marker.getElement) {
        const dotEl = marker.getElement().querySelector(".marker-dot");
        if (dotEl) {
          dotEl.classList.add("blink");
          setTimeout(() => dotEl.classList.remove("blink"), 800);
        }
      }
      
      // 클러스터 버블 blink 효과 추가
      if (CLUSTERER && CLUSTERER._clusters) {
        const clusterObj = CLUSTERER._clusters.find(c =>
          c.getClusterMember().some(m => m._listingId === item.id)
        );
        if (clusterObj && clusterObj._clusterMarker) {
          const bubble = clusterObj._clusterMarker
            .getElement()
            .querySelector(".cluster-bubble");
          if (bubble) {
            bubble.style.animation = "clusterBlinkHover 0.6s ease-in-out";
            setTimeout(() => {
              bubble.style.animation = "";
            }, 600);
          }
        }
      }
    });

    li.addEventListener("mouseleave", () => {
      highlightMarkerTemp(item.id, false);
    });

    ul.appendChild(li);
  });

  // 클러스터 리스트를 표시하되, 기존 UI 요소들의 크기나 위치는 변경하지 않음
  wrap.classList.remove("hidden");
  
  // 클러스터 리스트 열 때 히스토리 상태 추가
  window.history.pushState({ panel: 'clusterList' }, '', '/');
  console.log('📱 클러스터 리스트 열기 - 히스토리 상태 추가');
  
  // 클러스터 리스트 닫기 버튼 이벤트 리스너 추가
  const closeBtn = document.getElementById("clusterListCloseBtn");
  if (closeBtn) {
    closeBtn.onclick = () => {
      hideClusterList();
    };
  }
}

function hideClusterList() {
  const wrap = document.getElementById("clusterList");
  const listingList = document.getElementById("listingList");
  if (wrap) wrap.classList.add("hidden");
  // 클러스터 리스트가 숨겨질 때도 기존 UI 요소들의 크기나 위치는 변경하지 않음
  // 매물리스트는 그대로 유지 (이미 보이고 있음)
}

/**
 * 클러스터 매물 목록의 추천 UI 업데이트
 */
function updateClusterRecommendationUI(listingId) {
  // 클러스터 매물 목록의 별표 업데이트
  const clusterStarElement = document.querySelector(`#clusterItemList [data-listing-id="${listingId}"] .recommendation-star`);
  if (clusterStarElement) {
    const isRecommended = (window.USER_RECOMMENDATIONS && window.USER_RECOMMENDATIONS.has) ? window.USER_RECOMMENDATIONS.has(listingId) : false;
    clusterStarElement.classList.toggle('recommended', isRecommended);
    clusterStarElement.title = isRecommended ? '추천 상세보기' : '추천하기';
    clusterStarElement.textContent = isRecommended ? '⭐' : '☆';
  }
}

// 전역 함수로 export
window.updateClusterRecommendationUI = updateClusterRecommendationUI;

function bindClusterClickDelegation() {
  if (window._clusterClickDelegationBound) return;
  const mapWrap = document.getElementById("mapWrap");
  if (!mapWrap) return;

  mapWrap.addEventListener("click", (e) => {
    // 클러스터 버블을 직접 클릭한 경우
    if (e.target.classList.contains("cluster-bubble")) {
      const wrapper = e.target.closest("div[title]");
      if (!wrapper || !CLUSTERER) return;

      const cluster = CLUSTERER._clusters.find(
        c => c._clusterMarker.getElement() === wrapper
      );
      if (!cluster) return;

  

      // 버블 애니메이션 효과
      const bubble = wrapper.querySelector(".cluster-bubble");
      if (bubble) {
        bubble.classList.remove("cluster-animate");
        void bubble.offsetWidth; // 리플로우 강제
        bubble.classList.add("cluster-animate");
      }

      renderClusterGroupList(cluster);
      return;
    }

    // 클러스터 wrapper를 클릭한 경우
    const wrapper = e.target.closest("div[title]");
    if (!wrapper || !CLUSTERER) return;

    const cluster = CLUSTERER._clusters.find(
      c => c._clusterMarker.getElement() === wrapper
    );
    if (!cluster) return;



    const bubble = wrapper.querySelector(".cluster-bubble");
    if (bubble) {
      bubble.classList.remove("cluster-animate");
      void bubble.offsetWidth; // 리플로우 강제
      bubble.classList.add("cluster-animate");
    }

    renderClusterGroupList(cluster);
  });

  window._clusterClickDelegationBound = true;

}

function loadMarkerClustering() {
  if (typeof MarkerClustering !== 'undefined') {
    console.log('✅ MarkerClustering이 이미 로드되어 있습니다.');
    return;
  }
  
  const script = document.createElement('script');
  script.src = '/static/js/vendor/MarkerClustering.js';
  script.onload = function() {
    console.log('✅ MarkerClustering이 성공적으로 로드되었습니다.');
  };
  script.onerror = function() {
    console.error('❌ MarkerClustering 로드에 실패했습니다.');
  };
  document.head.appendChild(script);
}

// 클러스터링 관련 함수들을 전역으로 export
window.renderClusterGroupList = renderClusterGroupList;
window.hideClusterList = hideClusterList;
window.bindClusterClickDelegation = bindClusterClickDelegation;
window.loadMarkerClustering = loadMarkerClustering; 