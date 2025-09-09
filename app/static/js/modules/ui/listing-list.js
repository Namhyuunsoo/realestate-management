/* -----------------------------------------
 * listing-list.js - 매물 리스트 UI 관리
 * ----------------------------------------- */

/**************************************
 * ===== 매물 리스트 UI 관리 =====
 **************************************/

function renderListingList(arr) {
  const ul = document.getElementById("listingList");
  if (!ul) return;

  ul.innerHTML = "";
  arr.forEach(item => {
    const fields     = item.fields || {};
    
    // 주소에서 지역과 지번 추출
    const addr       = item.address_full || "";
    const addrParts  = addr.split(' ');
    const region     = addrParts.length > 0 ? escapeHtml(addrParts[0]) : "";
    const jibun      = addrParts.length > 1 ? escapeHtml(addrParts[1]) : "";
    
    // 층수 처리
    const floorRaw   = fields["층수"] || fields["층"] || "";
    const floor      = floorRaw
      ? (/층|지하|^b\d+/i.test(floorRaw) ? floorRaw : `${floorRaw}층`)
      : "-";
    
    // 가게명
    const storeName  = escapeHtml(fields["가게명"] || fields["건물명"] || "");
    
    // 실평수
    const areaReal   = escapeHtml(fields["실평수"] || "-");
    
    // 보증금, 월세, 권리금
    const dep        = escapeHtml(fields["보증금"] || "-");
    const rent       = escapeHtml(fields["월세"]   || "-");
    const premRaw    = (fields["권리금"] ?? "").toString().trim();
    const premDisplay= ["", "무권리", "0", "무"].includes(premRaw)
      ? "무권리"
      : escapeHtml(premRaw);

    const li = document.createElement("li");
    li.setAttribute('data-id', item.id);
    li.style.position = 'relative';
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
          <span class="area-real">${areaReal}평</span>
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

    // 마우스오버 이벤트 추가
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
            // console.log("🔥 매물 리스트 마우스오버 - 클러스터 버블 애니메이션:", bubble);
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
}

function scrollToListing(id) {
  const ul = document.getElementById("listingList");
  if (!ul) return;
  const li = ul.querySelector(`li[data-id="${id}"]`);
  if (!li) return;

  // 매물카드로 스크롤 이동
  li.scrollIntoView({ behavior: "smooth", block: "center" });

  if (CURRENT_SELECTED_LI_ID) {
    const prev = ul.querySelector(`li[data-id="${CURRENT_SELECTED_LI_ID}"] .listing-item`);
    if (prev) prev.classList.remove("selected");
  }
  CURRENT_SELECTED_LI_ID = id;

  const inner = li.querySelector(".listing-item");
  if (inner) {
    inner.classList.add("selected");
  }
}

function switchToListingMode(mode) {
  UI_STATE.isBriefingListMode = (mode === 'briefing');
  
  const propertyBtn = document.getElementById("propertyListBtn");
  const briefingBtn = document.getElementById("briefingListBtn");
  
  if (UI_STATE.isBriefingListMode) {
    // 브리핑 리스트 모드로 전환
    if (propertyBtn) {
      propertyBtn.classList.remove("active");
      propertyBtn.removeAttribute("data-mode");
    }
    if (briefingBtn) {
      briefingBtn.classList.add("active");
      briefingBtn.setAttribute("data-mode", "briefing");
    }
    renderBriefingList();
  } else {
    // 일반 매물 리스트 모드로 전환
    if (propertyBtn) {
      propertyBtn.classList.add("active");
      propertyBtn.setAttribute("data-mode", "property");
    }
    if (briefingBtn) {
      briefingBtn.classList.remove("active");
      briefingBtn.removeAttribute("data-mode");
    }
    applyAllFilters();
  }
}

// 기존 함수명 유지 (하위 호환성)
function toggleBriefingList() {
  switchToListingMode(UI_STATE.isBriefingListMode ? 'property' : 'briefing');
}

// 매물 리스트 UI 관련 함수들을 전역으로 export
window.renderListingList = renderListingList;
window.scrollToListing = scrollToListing;
window.switchToListingMode = switchToListingMode;
window.toggleBriefingList = toggleBriefingList; 