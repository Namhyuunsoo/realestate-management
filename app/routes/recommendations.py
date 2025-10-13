from flask import Blueprint, request, jsonify, current_app, session
from ..core.decorators import require_user, validate_csrf_token
import json

bp = Blueprint("recommendations", __name__)

@bp.route("/api/recommendations", methods=["GET"])
@require_user()
@validate_csrf_token()
def get_recommendations():
    user = request.current_user
    user_email = user.email

    try:
        # RecommendationService 지연 초기화 확인
        data_manager = current_app.data_manager
        if not hasattr(data_manager, 'recommendation_service') or data_manager.recommendation_service is None:
            # RecommendationService 강제 초기화
            data_manager._ensure_recommendation_service()
        
        recommendation_service = data_manager.recommendation_service
        all_recommendations = recommendation_service.get_all_recommendations()
        
        # 현재 사용자가 추천한 매물 ID 목록
        user_recommended_listings = recommendation_service.get_user_recommendations(user_email)

        return jsonify({
            "user_recommended_listings": user_recommended_listings,
            "all_recommendations": all_recommendations
        })
    except Exception as e:
        current_app.logger.error(f"❌ 추천매물 조회 실패: {e}")
        return jsonify({"error": "추천매물 조회 실패"}), 500

@bp.route("/api/recommendations/<string:listing_id>", methods=["POST"])
@require_user()
@validate_csrf_token()
def add_recommendation(listing_id):
    user = request.current_user
    user_email = user.email

    try:
        data = request.get_json()
        reason = data.get("reason", "").strip()
        
        if not reason:
            return jsonify({"error": "추천 이유를 입력해주세요."}), 400

        recommendation_service = current_app.data_manager.recommendation_service
        if recommendation_service.add_recommendation(listing_id, user_email, reason):
            current_app.logger.info(f"✅ 매물 추천 추가: {listing_id} by {user_email}")
            return jsonify({"success": True, "message": "매물 추천이 추가되었습니다."})
        return jsonify({"success": False, "message": "매물 추천 추가 실패"}), 500
    except Exception as e:
        current_app.logger.error(f"❌ 매물 추천 추가 실패: {e}")
        return jsonify({"error": "매물 추천 추가 실패"}), 500

@bp.route("/api/recommendations/<string:listing_id>", methods=["DELETE"])
@require_user()
@validate_csrf_token()
def remove_recommendation(listing_id):
    user = request.current_user
    user_email = user.email

    try:
        recommendation_service = current_app.data_manager.recommendation_service
        if recommendation_service.remove_recommendation(listing_id, user_email):
            current_app.logger.info(f"✅ 매물 추천 제거: {listing_id} by {user_email}")
            return jsonify({"success": True, "message": "매물 추천이 제거되었습니다."})
        return jsonify({"success": False, "message": "매물 추천 제거 실패"}), 500
    except Exception as e:
        current_app.logger.error(f"❌ 매물 추천 제거 실패: {e}")
        return jsonify({"error": "매물 추천 제거 실패"}), 500

@bp.route("/api/recommendations/<string:listing_id>/comments", methods=["POST"])
@require_user()
@validate_csrf_token()
def add_comment(listing_id):
    user = request.current_user
    user_email = user.email

    try:
        data = request.get_json()
        comment = data.get("comment", "").strip()
        
        if not comment:
            return jsonify({"error": "의견을 입력해주세요."}), 400

        recommendation_service = current_app.data_manager.recommendation_service
        if recommendation_service.add_comment(listing_id, user_email, comment):
            current_app.logger.info(f"✅ 매물 의견 추가: {listing_id} by {user_email}")
            return jsonify({"success": True, "message": "의견이 추가되었습니다."})
        return jsonify({"success": False, "message": "의견 추가 실패"}), 500
    except Exception as e:
        current_app.logger.error(f"❌ 매물 의견 추가 실패: {e}")
        return jsonify({"error": "의견 추가 실패"}), 500

@bp.route("/api/recommendations/<string:listing_id>/comments", methods=["GET"])
@require_user()
@validate_csrf_token()
def get_comments(listing_id):
    user = request.current_user
    user_email = user.email

    try:
        recommendation_service = current_app.data_manager.recommendation_service
        recommendation_data = recommendation_service.get_recommendation_data(listing_id)
        
        if not recommendation_data:
            return jsonify({"recommendations": {}, "comments": {}})

        return jsonify({
            "recommendations": recommendation_data.get("recommended_by", {}),
            "comments": recommendation_data.get("comments", {})
        })
    except Exception as e:
        current_app.logger.error(f"❌ 매물 의견 조회 실패: {e}")
        return jsonify({"error": "의견 조회 실패"}), 500
