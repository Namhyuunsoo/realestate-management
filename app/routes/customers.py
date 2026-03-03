# app/routes/customers.py

from flask import Blueprint, request, jsonify, current_app
from app.core.decorators import require_user, validate_json, handle_errors

bp = Blueprint("customers", __name__, url_prefix="/api/customers")



@bp.post("/")
@require_user()
@validate_json("name", "phone")
@handle_errors()
def create_customer_api():
    # 데코레이터에서 이미 사용자 인증 완료, request.current_user 사용
    user = request.current_user.email

    # 디버깅을 위한 상세 로그 추가
    current_app.logger.info(f'create_customer_api called! user: {user}')
    current_app.logger.debug(f'request.content_type: {request.content_type}')

    try:
        payload = request.get_json(force=True) or {}
        current_app.logger.debug(f'payload type: {type(payload)}')
        current_app.logger.debug(f'payload: {payload}')

        # payload가 딕셔너리가 아닌 경우 처리
        if not isinstance(payload, dict):
            current_app.logger.warning('Error: payload is not a dict, converting...')
            if isinstance(payload, str):
                try:
                    import json
                    payload = json.loads(payload)
                    current_app.logger.info(f'Successfully converted string to dict: {payload}')
                except Exception as e:
                    current_app.logger.error(f'Failed to parse JSON string: {e}')
                    return jsonify({"error": "Invalid JSON format"}), 400
            else:
                current_app.logger.error('Payload is neither dict nor string')
                return jsonify({"error": "Invalid payload format"}), 400

        # 필수 필드 검증
        if not payload.get("name") or not payload.get("phone"):
            return jsonify({"error": "name과 phone은 필수 필드입니다."}), 400

    except Exception as e:
        current_app.logger.error(f'JSON 파싱 오류: {e}', exc_info=True)
        return jsonify({"error": "Invalid JSON"}), 400

    # Repository 패턴 사용
    from app.services.repositories import get_customer_repository
    repo = get_customer_repository()
    try:
        record = repo.create_customer(user, payload)
        current_app.logger.info(f'create_customer result: {record}')
        return jsonify(record), 201
    except Exception as e:
        current_app.logger.error(f'고객 생성 중 오류: {e}', exc_info=True)
        return jsonify({"error": f"고객 생성 실패: {str(e)}"}), 500


@bp.get("/", strict_slashes=False)
@require_user()
@handle_errors()
def list_customers_api():
    # 데코레이터에서 이미 사용자 인증 완료, request.current_user 사용
    user_email = request.current_user.email

    current_app.logger.info(f"🔍 list_customers_api 호출됨: user_email={user_email}, url={request.url}")

    # 사용자 객체 가져오기
    try:
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)

        if not user or not user.is_active():
            current_app.logger.warning(f"Invalid user: {user_email}")
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401

    except Exception as auth_error:
        current_app.logger.error(f"❌ 사용자 인증 중 오류: {auth_error}", exc_info=True)
        return jsonify({"error": f"사용자 인증 실패: {str(auth_error)}"}), 500

    # 필터링 파라미터 처리
    filter_type = request.args.get('filter', 'own')
    manager = request.args.get('manager', '')

    current_app.logger.info(f"🔍 필터 파라미터: filter_type={filter_type}, manager={manager}")

    # Repository 패턴 사용
    from app.services.repositories import get_customer_repository
    repo = get_customer_repository()
    current_app.logger.info(f"🔍 Repository 타입: {type(repo).__name__}")

    try:
        items = repo.list_customers(user, filter_type, manager)
        current_app.logger.info(f"🔍 최종 반환할 고객 수: {len(items)}개")
        return jsonify({"items": items, "total": len(items)})
    except Exception as e:
        current_app.logger.error(f"❌ 고객 목록 조회 중 오류: {e}", exc_info=True)
        return jsonify({"error": f"고객 목록 조회 실패: {str(e)}"}), 500


@bp.get("/<customer_id>")
@require_user()
@handle_errors()
def get_customer_api(customer_id):
    current_app.logger.info(f"🔍 get_customer_api 호출됨: customer_id={customer_id}")
    current_app.logger.debug(f"🔍 request.method: {request.method}, url: {request.url}")

    # 데코레이터에서 이미 사용자 인증 완료, request.current_user 사용
    user = request.current_user.email
    current_app.logger.debug(f"🔍 사용자: {user}")

    # 어드민 권한 확인
    admin_status = current_app.data_manager.is_admin(user)
    current_app.logger.debug(f"🔍 어드민 여부: {admin_status}")

    # Repository 패턴 사용
    from app.services.repositories import get_customer_repository
    repo = get_customer_repository()

    try:
        customer = repo.get_customer(customer_id, user)
        current_app.logger.debug(f"🔍 조회된 고객: {customer}")

        if customer:
            current_app.logger.info(f"✅ 고객 조회 성공: {customer_id}")
            return jsonify(customer), 200
        else:
            current_app.logger.warning(f"❌ 고객을 찾을 수 없음: {customer_id}")
            return jsonify({"error": "고객을 찾을 수 없습니다."}), 404
    except Exception as e:
        current_app.logger.error(f"❌ 고객 조회 중 오류: {e}", exc_info=True)
        return jsonify({"error": f"고객 조회 실패: {str(e)}"}), 500


@bp.delete("/<customer_id>")
@require_user()
@handle_errors()
def delete_customer_api(customer_id):
    current_app.logger.info(f"🗑️ delete_customer_api 호출됨: customer_id={customer_id}")
    current_app.logger.debug(f"🗑️ request.method: {request.method}, url: {request.url}")

    user_email = request.current_user.email
    current_app.logger.debug(f"🗑️ 사용자: {user_email}")

    # Repository 패턴 사용
    from app.services.repositories import get_customer_repository
    repo = get_customer_repository()

    try:
        success = repo.delete_customer(customer_id, user_email)

        if success:
            current_app.logger.info(f"✅ 고객 삭제 성공: {customer_id}")
            return jsonify({"message": "고객이 삭제되었습니다."}), 200
        else:
            current_app.logger.warning(f"❌ 고객 삭제 실패: {customer_id}")
            return jsonify({"error": "고객을 찾을 수 없습니다."}), 404
    except Exception as e:
        current_app.logger.error(f"❌ 고객 삭제 중 오류: {e}", exc_info=True)
        return jsonify({"error": f"고객 삭제 실패: {str(e)}"}), 500


@bp.put("/<customer_id>")
@require_user()
@handle_errors()
def update_customer_api(customer_id):
    current_app.logger.info(f"🔄 update_customer_api 호출됨: customer_id={customer_id}")
    current_app.logger.debug(f"🔄 request.method: {request.method}, url: {request.url}")

    user_email = request.current_user.email
    current_app.logger.debug(f"🔄 사용자: {user_email}")

    try:
        updates = request.get_json(force=True) or {}
        current_app.logger.debug(f"🔄 업데이트 데이터: {updates}")
    except Exception as e:
        current_app.logger.error(f"🔄 JSON 파싱 오류: {e}", exc_info=True)
        return jsonify({"error": "Invalid JSON"}), 400

    # Repository 패턴 사용
    from app.services.repositories import get_customer_repository
    repo = get_customer_repository()
    try:
        updated_customer = repo.update_customer(customer_id, updates, user_email)
        if updated_customer:
            current_app.logger.info(f"✅ 고객 업데이트 성공: {customer_id}")
            return jsonify(updated_customer), 200
        else:
            current_app.logger.warning(f"❌ 고객을 찾을 수 없음: {customer_id}")
            return jsonify({"error": "고객을 찾을 수 없습니다."}), 404
    except Exception as e:
        current_app.logger.error(f"❌ 고객 업데이트 실패: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 400


@bp.get("/managers")
@require_user()
@handle_errors()
def get_managers_api():
    user = request.headers.get("X-User")
    
    # 원래 store.py 함수 사용
    from app.services import store
    managers = store.get_managers(user)
    
    return jsonify({"managers": managers})
