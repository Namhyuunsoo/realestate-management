/**
 * address-search.js - 주소 및 건물명 검색 기능 (네이버 지도 Geocoder 연동)
 */

(function () {
    // 초기화
    function init() {
        console.log('🔍 주소 검색 모듈 초기화 중...');

        const searchInput = document.getElementById('addressSearchInput');
        const searchBtn = document.getElementById('addressSearchBtn');

        if (!searchInput || !searchBtn) {
            console.warn('⚠️ 주소 검색 관련 요소를 찾을 수 없습니다.');
            return;
        }

        // 버튼 클릭 이벤트
        searchBtn.addEventListener('click', () => {
            handleSearch(searchInput.value);
        });

        // 엔터 키 이벤트
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleSearch(searchInput.value);
            }
        });
    }

    // 주소 검색 처리
    function handleSearch(query) {
        if (!query || query.trim() === '') {
            if (typeof window.showToast === 'function') {
                window.showToast('검색어를 입력해 주세요.', 'warning');
            } else {
                alert('검색어를 입력해 주세요.');
            }
            return;
        }

        // 네이버 지도 Service 모듈 (Geocoding) 호출
        if (!window.naver || !window.naver.maps || !window.naver.maps.Service) {
            console.error('❌ 네이버 지도 서비스가 아직 로드되지 않았습니다.');
            return;
        }

        naver.maps.Service.geocode({
            query: query
        }, function (status, response) {
            if (status !== naver.maps.Service.Status.OK) {
                return console.error('검색 중 오류 발생:', status);
            }

            const result = response.v2; // 검색 결과 컨테이너
            const items = result.addresses; // 검색 결과 배열

            if (items.length <= 0) {
                if (typeof window.showToast === 'function') {
                    window.showToast('검색 결과가 없습니다. 정확한 지번이나 도로명을 입력해 주세요.', 'error');
                } else {
                    alert('검색 결과가 없습니다.');
                }
                return;
            }

            // 첫 번째 검색 결과 사용
            const item = items[0];
            const x = parseFloat(item.x);
            const y = parseFloat(item.y);
            const coord = new naver.maps.LatLng(y, x);

            // 지도 이동 (전역 MAP 변수 사용)
            if (window.MAP) {
                window.MAP.setCenter(coord);
                window.MAP.setZoom(17); // 상세 보기 수준으로 줌 조정

                // 검색어 입력창 비우기 (선택 사항)
                // document.getElementById('addressSearchInput').value = '';

                if (typeof window.showToast === 'function') {
                    window.showToast(`"${item.roadAddress || item.jibunAddress}" 위치로 이동했습니다.`, 'success');
                }
            } else {
                console.error('❌ 지도 객체(MAP)를 찾을 수 없습니다.');
            }
        });
    }

    // DOM 로드 완료 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
