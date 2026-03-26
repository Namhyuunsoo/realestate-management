import os
import google.generativeai as genai
from flask import current_app

class AIService:
    def __init__(self):
        self.api_key = None
        self.model = None

    def _setup(self):
        """AI 모델 초기화"""
        if self.model:
            return

        self.api_key = current_app.config.get('GOOGLE_API_KEY')
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY가 설정되지 않았습니다.")

        genai.configure(api_key=self.api_key)
        # 사용자가 명시한 3.0 Flash 모델 사용
        self.model = genai.GenerativeModel('gemini-3.0-flash')

    def get_available_models(self):
        """사용 가능한 제미나이 모델 리스트 조회 (generateContent 지원 모델만)"""
        try:
            self._setup()
            models = []
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    # 'models/' 접두사 제거한 깔끔한 이름 저장
                    name = m.name.replace('models/', '')
                    display_name = m.display_name
                    models.append({'name': name, 'display_name': display_name})
            return models
        except Exception as e:
            current_app.logger.error(f"모델 리스트 조회 중 오류: {e}")
            return []

    def analyze_text(self, prompt: str, model_name: str = None) -> str:
        """일반 텍스트 분석 및 응답 생성 (모델 동적 전환 지원)"""
        try:
            self._setup()
            
            # 요청받은 모델이 있으면 해당 모델로 즉시 전환
            target_model = model_name if model_name else 'gemini-1.5-flash'
            
            # 404 예방을 위한 모델 생성
            current_model = genai.GenerativeModel(target_model)
            
            response = current_model.generate_content(prompt)
            return response.text
        except Exception as e:
            error_msg = str(e)
            current_app.logger.error(f"AI 분석 중 오류 발생: {error_msg}")
            
            # 404 에러일 경우 사용자에게 모델 부재 알림
            if "404" in error_msg:
                return f"Error: 요청하신 모델({model_name})을 찾을 수 없습니다. 목록에서 다른 모델을 선택해 주세요."
            return error_msg

    def extract_address_from_text(self, text: str) -> str:
        """텍스트(예: 등기부)에서 주소 정보만 추출"""
        prompt = f"""
        다음 텍스트에서 부동산 주소 정보만 정확히 추출해줘. 
        다른 설명은 생략하고 주소만 출력해.
        
        텍스트:
        {text}
        """
        return self.analyze_text(prompt)

    def summarize_listing(self, listing_data: dict) -> str:
        """매물 정보를 바탕으로 홍보용 요약 문구 생성"""
        prompt = f"""
        다음 매물 정보를 바탕으로 네이버 부동산 광고용 홍보 문구를 요약해줘.
        강조할 점: 입지, 가격, 특징 위주로 3줄 이내.
        
        매물 정보:
        {listing_data}
        """
        return self.analyze_text(prompt)
