/* -----------------------------------------
 * briefing-list.js - 브리핑 리스트 UI
 * ----------------------------------------- */

/**************************************
 * ===== 브리핑 리스트 UI =====
 **************************************/

function renderBriefingList() {
  // 브리핑 현황이 체크된 매물만 필터링
  const briefingListings = LISTINGS.filter(item => {
    const status = getBriefingStatus(item.id);
    return status !== BRIEFING_STATUS.NORMAL; // 일반이 아닌 모든 상태 (예정, 완료, 보류)
  });
  
  // 현재 상단 필터 적용
  const effectiveFilters = buildEffectiveFilters();
  let filteredListings = briefingListings;
  
  if (effectiveFilters && Object.keys(effectiveFilters).length > 0) {
    filteredListings = briefingListings.filter(item => {
      const fields = item.fields || {};
      
      // 지역 필터
      if (effectiveFilters.region && effectiveFilters.region.length > 0) {
        const itemRegion = fields['지역'] || '';
        if (!effectiveFilters.region.some(r => itemRegion.includes(r))) {
          return false;
        }
      }
      
      // 지번 필터
      if (effectiveFilters.jibun && effectiveFilters.jibun.length > 0) {
        const itemJibun = fields['지번'] || '';
        if (!effectiveFilters.jibun.some(j => itemJibun.includes(j))) {
          return false;
        }
      }
      
      // 건물명 필터
      if (effectiveFilters.building && effectiveFilters.building.length > 0) {
        const itemBuilding = fields['건물명'] || '';
        if (!effectiveFilters.building.some(b => itemBuilding.includes(b))) {
          return false;
        }
      }
      
      // 층수 필터
      if (effectiveFilters.floor && effectiveFilters.floor.length > 0) {
        const itemFloor = fields['층수'] || '';
        if (!effectiveFilters.floor.some(f => itemFloor.includes(f))) {
          return false;
        }
      }
      
      // 실평수 필터
      if (effectiveFilters.area && effectiveFilters.area.length > 0) {
        const itemArea = parseFloat(fields['실평수']) || 0;
        const areaFilter = effectiveFilters.area[0];
        if (areaFilter.min !== null && itemArea < areaFilter.min) return false;
        if (areaFilter.max !== null && itemArea > areaFilter.max) return false;
      }
      
      // 보증금 필터
      if (effectiveFilters.deposit && effectiveFilters.deposit.length > 0) {
        const itemDeposit = parseFloat(fields['보증금']) || 0;
        const depositFilter = effectiveFilters.deposit[0];
        if (depositFilter.min !== null && itemDeposit < depositFilter.min) return false;
        if (depositFilter.max !== null && itemDeposit > depositFilter.max) return false;
      }
      
      // 월세 필터
      if (effectiveFilters.rent && effectiveFilters.rent.length > 0) {
        const itemRent = parseFloat(fields['월세']) || 0;
        const rentFilter = effectiveFilters.rent[0];
        if (rentFilter.min !== null && itemRent < rentFilter.min) return false;
        if (rentFilter.max !== null && itemRent > rentFilter.max) return false;
      }
      
      // 권리금 필터
      if (effectiveFilters.premium && effectiveFilters.premium.length > 0) {
        const itemPremium = parseFloat(fields['권리금']) || 0;
        const premiumFilter = effectiveFilters.premium[0];
        if (premiumFilter.min !== null && itemPremium < premiumFilter.min) return false;
        if (premiumFilter.max !== null && itemPremium > premiumFilter.max) return false;
      }
      
      // 키워드 필터
      if (effectiveFilters.keyword && effectiveFilters.keyword.length > 0) {
        const itemText = [
          fields['가게명'] || '',
          fields['건물명'] || '',
          fields['지번'] || '',
          fields['비고'] || '',
          fields['비고3'] || ''
        ].join(' ').toLowerCase();
        
        if (!effectiveFilters.keyword.every(k => itemText.includes(k.toLowerCase()))) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  // 정렬 적용
  if (CURRENT_SORT_MODE) {
    sortListingsInPlace(filteredListings);
  }
  
  // 매물 리스트 렌더링
  renderListingList(filteredListings);
  
  // 카운트 업데이트
  updateCountsDisplay(LISTINGS.length, filteredListings.length);
}

// 브리핑 리스트 UI 관련 함수들을 전역으로 export
window.renderBriefingList = renderBriefingList; 