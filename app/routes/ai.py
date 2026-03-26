from flask import Blueprint, request, jsonify, current_app
from app.services.ai_service import AIService

ai_bp = Blueprint('ai', __name__)
ai_service = AIService()

@ai_bp.route('/models', methods=['GET'])
def get_models():
    """가용한 AI 모델 리스트 반환"""
    models = ai_service.get_available_models()
    return jsonify({'models': models})

@ai_bp.route('/chat', methods=['POST'])
def chat():
    """
    제미나이 AI 채팅 엔드포인트 (동적 모델 선택 지원)
    """
    try:
        data = request.json
        message = data.get('message')
        model_name = data.get('model_name') # 선택된 모델명 수신
        
        if not message:
            return jsonify({'error': '메시지가 없습니다.'}), 400
            
        response_text = ai_service.analyze_text(message, model_name=model_name)
        
        return jsonify({
            'answer': response_text,
            'status': 'success'
        })
        
    except Exception as e:
        current_app.logger.error(f"AI 채팅 API 오류: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500
