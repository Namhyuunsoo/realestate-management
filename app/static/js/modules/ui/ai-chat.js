/**
 * Gemini AI Chat Module v5 (Dynamic Model Selector)
 * 실시간 모델 목록 조회 및 동적 모델 전환 기능이 통합되었습니다.
 */

document.addEventListener('DOMContentLoaded', () => {
    const aiChatBtn = document.getElementById('aiChatBtn');
    const geminiPanel = document.getElementById('geminiPanel');
    const closeGeminiBtn = document.getElementById('closeGeminiBtn');
    const geminiChatInput = document.getElementById('geminiChatInput');
    const geminiChatSendBtn = document.getElementById('geminiChatSendBtn');
    const geminiChatMessages = document.getElementById('geminiChatMessages');
    const modelSelect = document.getElementById('geminiModelSelect');
    const chatHeader = geminiPanel.querySelector('.gemini-panel-header');

    if (!aiChatBtn || !geminiPanel) return;

    // --- 가용 모델 리스트 로드 ---
    async function loadAvailableModels() {
        try {
            const response = await fetch('/api/ai/models');
            const data = await response.json();
            
            if (data && data.models && data.models.length > 0) {
                modelSelect.innerHTML = '';
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.display_name.replace('Gemini ', ''); // 이름 간소화
                    
                    // 기본값 설정 (2.0 Flash가 있으면 우선 선택)
                    if (model.name.includes('2.0-flash')) option.selected = true;
                    
                    modelSelect.appendChild(option);
                });
            } else {
                modelSelect.innerHTML = '<option value="gemini-1.5-flash">Gemini 1.5 Flash</option>';
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            modelSelect.innerHTML = '<option value="gemini-1.5-flash">Gemini 1.5 Flash</option>';
        }
    }

    // --- 패널 표시 및 초기화 ---
    aiChatBtn.addEventListener('click', () => {
        geminiPanel.classList.remove('hidden');
        geminiPanel.style.display = 'flex';
        // 패널 열 때 모델 리스트 최신화
        loadAvailableModels();
    });

    closeGeminiBtn.addEventListener('click', () => {
        geminiPanel.classList.add('hidden');
    });

    // --- 드래그 이동 로직 ---
    let isDragging = false;
    let currentX = 0, currentY = 0, initialX, initialY, xOffset = 0, yOffset = 0;

    chatHeader.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === chatHeader || chatHeader.contains(e.target)) isDragging = true;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            geminiPanel.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }

    function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    // --- 메시지 전송 로직 (동적 모델 연동) ---
    async function handleSendMessage() {
        const text = geminiChatInput.value.trim();
        const selectedModel = modelSelect.value;
        if (!text) return;

        geminiChatSendBtn.disabled = true;
        appendMessage('user', text);
        geminiChatInput.value = '';

        const loadingMsg = appendMessage('ai', `${selectedModel.split('-').slice(0,2).join(' ')}이 생각 중`, true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: text,
                    model_name: selectedModel // 선택된 모델 전달
                }),
            });

            const data = await response.json();
            loadingMsg.remove();
            
            if (data && data.answer) {
                appendMessage('ai', data.answer);
            } else {
                appendMessage('ai', '죄송합니다. 오류가 발생했습니다.');
            }
        } catch (error) {
            loadingMsg.remove();
            appendMessage('ai', '네트워크 연결에 실패했습니다.');
        } finally {
            geminiChatSendBtn.disabled = false;
        }
    }

    function appendMessage(sender, text, isLoading = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender} ${isLoading ? 'loading' : ''}`;
        msgDiv.textContent = text;
        geminiChatMessages.appendChild(msgDiv);
        geminiChatMessages.scrollTop = geminiChatMessages.scrollHeight;
        return msgDiv;
    }

    geminiChatSendBtn.addEventListener('click', handleSendMessage);
    geminiChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
});
