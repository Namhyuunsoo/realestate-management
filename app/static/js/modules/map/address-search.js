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

    // 임시 검색 마커 저장 변수
    let searchMarker = null;

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

                // 기존 마커 제거
                if (searchMarker) {
                    searchMarker.setMap(null);
                }

                // 새 임시 마커 생성 (눈에 띄는 디자인)
                searchMarker = new naver.maps.Marker({
                    position: coord,
                    map: window.MAP,
                    icon: {
                        content: `
                            <div style="position: relative; width: 40px; height: 40px;">
                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background-color: #ff3b30; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 1;"></div>
                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 30px; height: 30px; background-color: rgba(255, 59, 48, 0.3); border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                            </div>
                            <style>
                                @keyframes pulse {
                                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
                                    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                                }
                            </style>
                        `,
                        anchor: new naver.maps.Point(20, 20)
                    },
                    zIndex: 2000
                });

                // 마커 클릭 시 제거 (선택적)
                naver.maps.Event.addListener(searchMarker, 'click', function() {
                    searchMarker.setMap(null);
                    searchMarker = null;
                });

                // 사용자 요청에 따라 "위치로 이동했습니다" 알림은 제거함 (가시성 확보됨)
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
