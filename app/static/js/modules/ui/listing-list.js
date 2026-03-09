/* -----------------------------------------
 * listing-list.js - 매물 리스트 UI 관리
 * ----------------------------------------- */

/**************************************
 * ===== 매물 리스트 UI 관리 =====
 **************************************/

/** 공급/전용 표기: 32평/-, -/28평, 32/28평 */
function formatSupplyExclusive(supply, exclusive) {
  const s = (supply || "").toString().trim();
  const e = (exclusive || "").toString().trim();
  const sp = s ? (s.replace(/평$/, "") || s) + "평" : "-";
  const ep = e ? (e.replace(/평$/, "") || e) + "평" : "-";
  if (!s && !e) return "-/-";
  return `${sp}/${ep}`;
}

/** 방/화장실 표기: 방3화2, 방-화- */
function formatRoomsBath(rooms, bath) {
  const r = (rooms || "").toString().trim() || "-";
  const b = (bath || "").toString().trim() || "-";
  return `방${r}화${b}`;
}

let _currentListData = [];
let _renderedCount = 0;
const _BATCH_SIZE = 20;

function renderListingList(arr) {
  const ul = document.getElementById("listingList");
  if (!ul) return;

  _currentListData = arr || [];
  _renderedCount = 0;
  ul.innerHTML = "";

  if (_currentListData.length === 0) {
    ul.innerHTML = '<li style="padding:20px; text-align:center; color:#999;">검색 결과가 없습니다.</li>';
    return;
  }

  // 첫 번째 배치 렌더링
  renderNextBatch();

  // 스크롤 이벤트 등록 (한 번만)
  if (!ul._hasScrollListener) {
    ul.addEventListener("scroll", () => {
      // 바닥에서 100px 정도 남았을 때 추가 로드
      if (ul.scrollTop + ul.clientHeight >= ul.scrollHeight - 100) {
        renderNextBatch();
      }
    });
    ul._hasScrollListener = true;
  }
}

function renderNextBatch() {
  const ul = document.getElementById("listingList");
  if (!ul || _renderedCount >= _currentListData.length) return;

  const nextBatch = _currentListData.slice(_renderedCount, _renderedCount + _BATCH_SIZE);
  const isHousing = window.UI_STATE && window.UI_STATE.listingMode === "housing";
  const housingSubtype = (window.UI_STATE && window.UI_STATE.housingSubtype) || "sale";

  const fragment = document.createDocumentFragment();

  nextBatch.forEach(item => {
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

    const li = document.createElement("li");
    li.setAttribute('data-id', item.id);
    li.style.position = 'relative';

    let metaBottomHtml = "";
    if (isHousing) {
      const addrDisplayParts = [
        fields["지역"] || (addrParts.length > 0 ? addrParts[0] : ""),
        fields["지번"] || (addrParts.length > 1 ? addrParts[1] : ""),
        fields["건물명"] || fields["가게명"],
        fields["동"],
        floor
      ].map(x => (x || "").toString().trim()).filter(x => x && x !== "-");
      const addressDisplay = escapeHtml(addrDisplayParts.join(" "));
      const supplyExcl = formatSupplyExclusive(fields["공급"], fields["전용"]);
      const roomsBath = formatRoomsBath(fields["방"], fields["화장실"]);
      const rentVal = (fields["월세"] || "").toString().trim();
      const hasRent = !!rentVal && rentVal !== "-";
      if (housingSubtype === "sale") {
        const salePrice = escapeHtml(fields["매매가"] || "-");
        metaBottomHtml = `<span class="rooms-bath">${escapeHtml(roomsBath)}</span><span class="area-real">${supplyExcl}</span><span class="sale-price">매매 ${salePrice}</span>`;
      } else {
        const dep = escapeHtml(fields["보증금"] || "-");
        const rentPart = hasRent ? `<span class="rent">월 ${escapeHtml(rentVal)}</span>` : "";
        metaBottomHtml = `<span class="rooms-bath">${escapeHtml(roomsBath)}</span><span class="area-real">${supplyExcl}</span><span class="deposit">보 ${dep}</span>${rentPart}`;
      }
      li.innerHTML = `
        <div class="listing-item">
          <div class="meta-top">
            <div class="listing-info">
              <span class="address">${addressDisplay}</span>
            </div>
            <div class="listing-controls">
              ${window.createRecommendationStar ? window.createRecommendationStar(item.id) : ''}
            </div>
          </div>
          <div class="meta-bottom">
            ${metaBottomHtml}
          </div>
        </div>
      `;
    } else {
      // 상가 모드: 서브타입별 분기
      const subtype = (window.UI_STATE && window.UI_STATE.commercialSubtype) || "lease";

      const storeName = escapeHtml(fields["가게명"] || fields["건물명"] || "");

      if (subtype === "lease") {
        // 상가 임대차: 기존 포맷 유지
        const areaReal = escapeHtml(fields["실평수"] || "-");
        const dep = escapeHtml(fields["보증금"] || "-");
        const rent = escapeHtml(fields["월세"] || "-");
        const premRaw = (fields["권리금"] ?? "").toString().trim();
        const premDisplay = ["", "무권리", "0", "무"].includes(premRaw)
          ? "무권리"
          : escapeHtml(premRaw);

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
      } else if (subtype === "unit") {
        // 구분상가 매매: 전용(평), 매매가, 수익율 (권리금 제외)
        const areaReal = escapeHtml(fields["전용(평)"] || fields["실평수"] || "-");
        const price = escapeHtml(fields["매매가"] || "-");
        const yieldVal = escapeHtml(fields["수익율"] || "-");

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
              <span class="sale-price">매매: ${price}</span>
              <span class="yield" style="color: #d11; font-weight: bold;">수익: ${yieldVal}</span>
            </div>
          </div>
        `;
      } else if (subtype === "land") {
        // 건물토지 매매: 대지(평), 매매가, 수익율 (권리금/지목/용도 제외)
        const areaLand = escapeHtml(fields["대지(평)"] || fields["대지면적"] || "-");
        const price = escapeHtml(fields["매매가"] || "-");
        const yieldVal = escapeHtml(fields["수익율"] || "-");

        li.innerHTML = `
          <div class="listing-item">
            <div class="meta-top">
              <div class="listing-info">
                <span class="region">${region}</span>
                <span class="jibun">${jibun}</span>
                <span class="store-name" style="font-weight: bold;">${storeName}</span>
              </div>
              <div class="listing-controls">
                ${window.createRecommendationStar ? window.createRecommendationStar(item.id) : ''}
              </div>
            </div>
            <div class="meta-bottom">
              <span class="area-land">대지: ${areaLand}평</span>
              <span class="sale-price">매매: ${price}</span>
              <span class="yield" style="color: #d11; font-weight: bold;">수익: ${yieldVal}</span>
            </div>
          </div>
        `;
      }
    }

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

    fragment.appendChild(li);
  });

  ul.appendChild(fragment);
  _renderedCount += nextBatch.length;
}

function scrollToListing(id) {
  const ul = document.getElementById("listingList");
  if (!ul) return;
  const li = ul.querySelector(`li[data-id="${id}"]`);
  if (!li) return;

  // PC 환경에서 #layout 높이 보호: scrollIntoView 호출 전 높이 저장
  const layout = document.getElementById('layout');
  let savedLayoutHeight = null;
  let savedLayoutMaxHeight = null;

  if (layout && window.innerWidth > 768) {
    // PC 환경에서만 높이 보호
    savedLayoutHeight = layout.style.height;
    savedLayoutMaxHeight = layout.style.maxHeight;
  }

  // 매물카드로 스크롤 이동 (즉시 스크롤로 변경하여 레이아웃 재계산 방지)
  li.scrollIntoView({ behavior: "auto", block: "center" });

  // PC 환경에서 #layout 높이 복원: scrollIntoView 호출 후 높이 복원
  if (layout && window.innerWidth > 768 && savedLayoutHeight !== null) {
    // requestAnimationFrame을 사용하여 레이아웃 재계산 완료 후 복원
    requestAnimationFrame(() => {
      if (savedLayoutHeight) {
        layout.style.height = savedLayoutHeight;
      } else {
        layout.style.height = ''; // 인라인 스타일 제거 (CSS 값 사용)
      }
      if (savedLayoutMaxHeight) {
        layout.style.maxHeight = savedLayoutMaxHeight;
      } else {
        layout.style.maxHeight = ''; // 인라인 스타일 제거 (CSS 값 사용)
      }
    });
  }

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
    window.applyAllFilters();
  }
}

// 기존 함수명 유지 (하위 호환성)
function toggleBriefingList() {
  switchToListingMode(UI_STATE.isBriefingListMode ? 'property' : 'briefing');
}

// 매물 리스트 UI 관련 함수들을 전역으로 export
window.renderListingList = renderListingList;
window.formatSupplyExclusive = formatSupplyExclusive;
window.formatRoomsBath = formatRoomsBath;
window.scrollToListing = scrollToListing;
window.switchToListingMode = switchToListingMode;
window.toggleBriefingList = toggleBriefingList; 