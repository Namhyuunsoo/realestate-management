import os
import json
from typing import Dict, List, Set, Optional
from datetime import datetime

class RecommendationService:
    """추천매물 관리 서비스"""

    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        self.recommendations_file = os.path.join(data_dir, "state", "recommendations.json")
        self._recommendations: Dict[str, Dict] = {}  # listing_id -> {recommended_by: {...}, comments: {...}}
        self._load_recommendations()

    def _load_recommendations(self):
        """추천매물 데이터 로드"""
        try:
            if os.path.exists(self.recommendations_file):
                with open(self.recommendations_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                # 데이터 타입 확인 및 변환
                if isinstance(data, dict):
                    self._recommendations = self._migrate_recommendations_data(data)
                elif isinstance(data, list):
                    # 리스트인 경우 빈 딕셔너리로 초기화
                    self._recommendations = {}
                    print("⚠️ 추천매물 데이터가 리스트 형태입니다. 딕셔너리로 초기화합니다.")
                else:
                    self._recommendations = {}
                    print("⚠️ 알 수 없는 추천매물 데이터 형태입니다. 딕셔너리로 초기화합니다.")
                    
                print(f"✅ 추천매물 데이터 로드됨: {len(self._recommendations)}개 매물")
            else:
                self._recommendations = {}
                print("📝 새로운 추천매물 파일 생성")
        except Exception as e:
            print(f"❌ 추천매물 데이터 로드 실패: {e}")
            self._recommendations = {}

    def _migrate_recommendations_data(self, data):
        """구형 추천매물 데이터를 신형으로 마이그레이션"""
        migrated_data = {}
        
        for listing_id, value in data.items():
            if isinstance(value, list):
                # 구형: ["user1@email.com", "user2@email.com"]
                migrated_data[listing_id] = {
                    "recommended_by": {},
                    "comments": {}
                }
                for user_email in value:
                    migrated_data[listing_id]["recommended_by"][user_email] = {
                        "reason": "마이그레이션된 추천",
                        "recommended_at": datetime.now().isoformat()
                    }
                print(f"🔄 마이그레이션: {listing_id} - {len(value)}명의 추천")
                
            elif isinstance(value, dict) and "recommended_by" in value:
                # 신형: {"recommended_by": {...}, "comments": {...}}
                migrated_data[listing_id] = value
                
            else:
                # 알 수 없는 형태
                print(f"⚠️ 알 수 없는 데이터 형태: {listing_id}")
                
        return migrated_data

    def _save_recommendations(self):
        """추천매물 데이터 저장"""
        try:
            os.makedirs(os.path.dirname(self.recommendations_file), exist_ok=True)
            with open(self.recommendations_file, 'w', encoding='utf-8') as f:
                json.dump(self._recommendations, f, ensure_ascii=False, indent=2)
            print(f"✅ 추천매물 데이터 저장됨: {len(self._recommendations)}개 매물")
        except Exception as e:
            print(f"❌ 추천매물 데이터 저장 실패: {e}")

    def add_recommendation(self, listing_id: str, user_email: str, reason: str) -> bool:
        """매물 추천 추가"""
        try:
            if listing_id not in self._recommendations:
                self._recommendations[listing_id] = {
                    "recommended_by": {},
                    "comments": {}
                }
            
            self._recommendations[listing_id]["recommended_by"][user_email] = {
                "reason": reason,
                "recommended_at": datetime.now().isoformat()
            }
            self._save_recommendations()
            print(f"✅ 매물 추천 추가: {listing_id} by {user_email}")
            return True
        except Exception as e:
            print(f"❌ 매물 추천 추가 실패: {e}")
            return False

    def remove_recommendation(self, listing_id: str, user_email: str) -> bool:
        """매물 추천 제거"""
        try:
            if listing_id in self._recommendations:
                if user_email in self._recommendations[listing_id]["recommended_by"]:
                    del self._recommendations[listing_id]["recommended_by"][user_email]
                    
                    # 추천과 의견이 모두 없으면 해당 매물 제거
                    if (not self._recommendations[listing_id]["recommended_by"] and 
                        not self._recommendations[listing_id]["comments"]):
                        del self._recommendations[listing_id]
                    
                    self._save_recommendations()
                    print(f"✅ 매물 추천 제거: {listing_id} by {user_email}")
                    return True
            return False
        except Exception as e:
            print(f"❌ 매물 추천 제거 실패: {e}")
            return False

    def add_comment(self, listing_id: str, user_email: str, comment: str) -> bool:
        """매물에 의견 추가"""
        try:
            if listing_id not in self._recommendations:
                self._recommendations[listing_id] = {
                    "recommended_by": {},
                    "comments": {}
                }
            
            self._recommendations[listing_id]["comments"][user_email] = {
                "comment": comment,
                "commented_at": datetime.now().isoformat()
            }
            self._save_recommendations()
            print(f"✅ 매물 의견 추가: {listing_id} by {user_email}")
            return True
        except Exception as e:
            print(f"❌ 매물 의견 추가 실패: {e}")
            return False

    def is_recommended(self, listing_id: str, user_email: str) -> bool:
        """특정 사용자가 특정 매물을 추천했는지 확인"""
        return (listing_id in self._recommendations and 
                user_email in self._recommendations[listing_id]["recommended_by"])

    def get_recommendation_data(self, listing_id: str) -> Optional[Dict]:
        """매물의 추천 데이터 조회"""
        return self._recommendations.get(listing_id)

    def get_user_recommendations(self, user_email: str) -> List[str]:
        """사용자가 추천한 매물 목록"""
        recommended_listings = []
        for listing_id, data in self._recommendations.items():
            if user_email in data["recommended_by"]:
                recommended_listings.append(listing_id)
        return recommended_listings

    def get_all_recommendations(self) -> Dict[str, Dict]:
        """모든 추천매물 조회 (API 응답용)"""
        return self._recommendations
