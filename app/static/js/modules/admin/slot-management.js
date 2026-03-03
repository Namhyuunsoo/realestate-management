/**
 * app/static/js/modules/admin/slot-management.js
 * 통합 슬롯 관리 (7개 고정 슬롯) 기능 모듈
 */

(function () {
    // 전역 객체 등록
    window.SlotManagement = {
        init: init,
        openModal: openModal,
        loadSlots: loadSlots
    };

    let allUsers = [];

    function init() {
        const slotBtn = document.getElementById('sheetSlotManagementBtn');
        const modal = document.getElementById('slotManagementModal');
        const closeBtn = modal?.querySelector('.modal-close-btn');

        if (slotBtn) {
            slotBtn.addEventListener('click', openModal);
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }

        // 모달 바깥 클릭 시 닫기
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }

    async function openModal() {
        const modal = document.getElementById('slotManagementModal');
        modal.classList.remove('hidden');

        // 1. 유저 목록 먼저 가져오기 (드롭다운 용)
        await loadUsers();
        // 2. 슬롯 데이터 가져오기
        await loadSlots();
    }

    async function loadUsers() {
        try {
            const response = await fetch('/api/admin/users?include_inactive=false', {
                credentials: 'include',
                headers: {
                    ...getCsrfHeaders()
                }
            });
            if (!response.ok) {
                console.error('유저 목록 로드 실패: HTTP', response.status);
                return;
            }
            const data = await response.json();
            allUsers = data.users || [];
        } catch (error) {
            console.error('유저 목록 로드 실패:', error);
            showToast('유저 목록을 불러오지 못했습니다.', 'error');
        }
    }

    async function loadSlots() {
        const tbody = document.getElementById('slotListTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">로딩 중...</td></tr>';

        try {
            const response = await fetch('/api/admin/sheet-slots', {
                credentials: 'include',
                headers: {
                    ...getCsrfHeaders()
                }
            });
            const data = await response.json();
            const slots = data.slots || [];

            tbody.innerHTML = '';
            slots.sort((a, b) => a.id - b.id).forEach(slot => {
                const tr = document.createElement('tr');

                // 유저 선택 드롭다운 생성
                let userOptions = `<option value="">-- 공석 --</option>`;
                allUsers.forEach(u => {
                    const selected = u.id === slot.user_id ? 'selected' : '';
                    userOptions += `<option value="${u.id}" data-name="${u.name}" ${selected}>${u.name} (${u.email})</option>`;
                });

                tr.innerHTML = `
                    <td style="text-align:center; font-weight:bold;">${slot.id}</td>
                    <td>
                        <select class="slot-user-select" data-slot-id="${slot.id}" style="width:100%; padding:5px;">
                            ${userOptions}
                        </select>
                    </td>
                    <td>
                        <input type="text" class="slot-manager-name" value="${slot.manager_name || '공석'}" 
                               style="width:100%; padding:5px;" placeholder="관리명 (공석 시 '공석' 권장)">
                    </td>
                    <td>
                        <input type="text" class="slot-sheet-url" value="${slot.sheet_url || ''}" 
                               style="width:100%; padding:5px;" placeholder="Google Sheets URL">
                    </td>
                    <td style="text-align:center;">
                        <span class="status-badge ${slot.is_active ? 'status-active' : 'status-inactive'}">
                            ${slot.is_active ? '동기화 중' : '중단됨'}
                        </span>
                    </td>
                    <td style="text-align:center;">
                        <button class="btn-save-slot admin-btn" data-slot-id="${slot.id}" style="padding:4px 10px;">저장</button>
                    </td>
                `;
                tbody.appendChild(tr);

                // 유저 선택 시 관리자명 자동 제안
                const userSelect = tr.querySelector('.slot-user-select');
                const managerInput = tr.querySelector('.slot-manager-name');

                userSelect.addEventListener('change', (e) => {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    const userName = selectedOption.getAttribute('data-name');
                    if (userName) {
                        managerInput.value = userName;
                    } else {
                        managerInput.value = '공석';
                    }
                });

                // 저장 버튼 이벤트
                tr.querySelector('.btn-save-slot').addEventListener('click', () => saveSlot(slot.id, tr));
            });
        } catch (error) {
            console.error('슬롯 로드 실패:', error);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">데이터 로드 오류</td></tr>';
        }
    }

    async function saveSlot(slotId, rowElement) {
        const userId = rowElement.querySelector('.slot-user-select').value || null;
        const managerName = rowElement.querySelector('.slot-manager-name').value.trim() || '공석';
        const sheetUrl = rowElement.querySelector('.slot-sheet-url').value.trim();

        const btn = rowElement.querySelector('.btn-save-slot');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '...';

        try {
            const response = await fetch('/api/admin/sheet-slots', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...getCsrfHeaders()
                },
                body: JSON.stringify({
                    slot_id: slotId,
                    user_id: userId,
                    manager_name: managerName,
                    sheet_url: sheetUrl
                })
            });

            if (response.ok) {
                showToast(`슬롯 ${slotId}이 업데이트되었습니다.`, 'success');
                loadSlots(); // 새로고침
            } else {
                const err = await response.json();
                showToast(`업데이트 실패: ${err.error}`, 'error');
            }
        } catch (error) {
            console.error('슬롯 저장 오류:', error);
            showToast('서버 연결 오류', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    // 문서 로드 완료 시 초기화 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
