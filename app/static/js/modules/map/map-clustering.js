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

function renderClusterGroupList(cluster) {
  const markers = cluster.getClusterMember();
  const ids     = markers.map(m => m._listingId);
  const arr     = LISTINGS.filter(x => ids.includes(x.id));

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
      <div class="title">${region} ${jibun} ${floor} ${storeName}</div>
      <div class="meta">
        ${area_real}평 보: ${dep} 월: ${rent} 권: ${premDisplay} ${status}
      </div>
    `;
    
    // 브리핑 상태 표시 추가
    const briefingStatus = getBriefingStatus(item.id);
    updateListingItemBriefingStatus(li, briefingStatus);

    li.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      setActiveMarker(item.id);

      let clusterObj = null;
      if (CLUSTERER && Array.isArray(CLUSTERER._clusters)) {
        clusterObj = CLUSTERER._clusters.find(c =>
          c.getClusterMember().some(m => m._listingId === item.id)
        );
      }
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

      const mk = MARKERS.find(m => m._listingId === item.id);
      if (mk?.getElement) {
        const dotEl = mk.getElement().querySelector(".marker-dot");
        if (dotEl) {
          dotEl.classList.add("blink");
          setTimeout(() => dotEl.classList.remove("blink"), 800);
        }
      }

      ul.querySelectorAll("li.selected")
        .forEach(el => el.classList.remove("selected"));
      li.classList.add("selected");

      const mainUl = document.getElementById("listingList");
      const mainLi = mainUl?.querySelector(`li[data-id="${item.id}"]`);
      if (mainLi) {
        const inner = mainLi.querySelector(".listing-item");
        if (inner) {
          inner.classList.add("selected");
          // UI 변동 방지를 위해 scrollIntoView 제거
          // mainLi.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      renderDetailPanel(item);
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