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
    print('create_customer_api called! user:', user)
    print('request.content_type:', request.content_type)
    print('request.data:', request.data)
    
    try:
        payload = request.get_json(force=True) or {}
        print('payload type:', type(payload))
        print('payload:', payload)
        
        # payload가 딕셔너리가 아닌 경우 처리
        if not isinstance(payload, dict):
            print('Error: payload is not a dict, converting...')
            if isinstance(payload, str):
                try:
                    import json
                    payload = json.loads(payload)
                    print('Successfully converted string to dict:', payload)
                except Exception as e:
                    print('Failed to parse JSON string:', e)
                    return jsonify({"error": "Invalid JSON format"}), 400
            else:
                print('Payload is neither dict nor string')
                return jsonify({"error": "Invalid payload format"}), 400
        
        # 필수 필드 검증
        if not payload.get("name") or not payload.get("phone"):
            return jsonify({"error": "name과 phone은 필수 필드입니다."}), 400
            
    except Exception as e:
        print('JSON 파싱 오류:', e)
        return jsonify({"error": "Invalid JSON"}), 400
    
    # 원래 store.py 함수 사용
    from app.services import store
    record = store.create_customer(user, payload)
    print('create_customer result:', record)
    
    return jsonify(record), 201


@bp.get("/")
@require_user()
@handle_errors()
def list_customers_api():
    # 데코레이터에서 이미 사용자 인증 완료, request.current_user 사용
    user_email = request.current_user.email
    
    # 사용자 객체 가져오기
    try:
        user_service = current_app.data_manager.user_service
        user = user_service.get_user_by_email(user_email)
        
        if not user or not user.is_active():
            current_app.logger.warning(f"Invalid user: {user_email}")
            return jsonify({"error": "유효하지 않은 사용자입니다."}), 401
            
    except Exception as auth_error:
        current_app.logger.error(f"❌ 사용자 인증 중 오류: {auth_error}")
        return jsonify({"error": f"사용자 인증 실패: {str(auth_error)}"}), 500

    # 필터링 파라미터 처리
    filter_type = request.args.get('filter', 'own')
    manager = request.args.get('manager', '')
    
    # 원래 store.py 함수 사용 (User 객체 전달)
    from app.services import store
    items = store.list_customers(user, filter_type, manager)
    
    return jsonify({"items": items, "total": len(items)})


@bp.get("/<customer_id>")
@require_user()
@handle_errors()
def get_customer_api(customer_id):
    print(f"🔍 get_customer_api 호출됨: customer_id={customer_id}")
    print(f"🔍 request.method: {request.method}")
    print(f"🔍 request.url: {request.url}")
    
    # 데코레이터에서 이미 사용자 인증 완료, request.current_user 사용
    user = request.current_user.email
    print(f"🔍 사용자: {user}")
    
    # 어드민 권한 확인
    admin_status = current_app.data_manager.is_admin(user)
    print(f"🔍 어드민 여부: {admin_status}")
    
    # 원래 store.py 함수 사용
    from app.services import store
    customer = store.get_customer(customer_id, user)
    print(f"🔍 조회된 고객: {customer}")
    
    if customer:
        print(f"✅ 고객 조회 성공: {customer_id}")
        
        # 간단하고 안전한 JSON 응답
        return jsonify(customer), 200
    else:
        print(f"❌ 고객을 찾을 수 없음: {customer_id}")
        return jsonify({"error": "고객을 찾을 수 없습니다."}), 404


@bp.delete("/<customer_id>")
@require_user()
@handle_errors()
def delete_customer_api(customer_id):
    print(f"🗑️ delete_customer_api 호출됨: customer_id={customer_id}")
    print(f"🗑️ request.method: {request.method}")
    print(f"🗑️ request.url: {request.url}")
    
    user = request.headers.get("X-User")
    print(f"🗑️ 사용자: {user}")
    
    # 원래 store.py 함수 사용
    from app.services import store
    success = store.delete_customer(customer_id, user)
    
    if success:
        print(f"✅ 고객 삭제 성공: {customer_id}")
        return jsonify({"message": "고객이 삭제되었습니다."}), 200
    else:
        print(f"❌ 고객 삭제 실패: {customer_id}")
        return jsonify({"error": "고객을 찾을 수 없습니다."}), 404


@bp.put("/<customer_id>")
@require_user()
@handle_errors()
def update_customer_api(customer_id):
    print(f"🔄 update_customer_api 호출됨: customer_id={customer_id}")
    print(f"🔄 request.method: {request.method}")
    print(f"🔄 request.url: {request.url}")
    
    user = request.headers.get("X-User")
    print(f"🔄 사용자: {user}")
    
    try:
        updates = request.get_json(force=True) or {}
        print(f"🔄 업데이트 데이터: {updates}")
    except Exception as e:
        print(f"🔄 JSON 파싱 오류: {e}")
        return jsonify({"error": "Invalid JSON"}), 400
    
    # 원래 store.py 함수 사용
    from app.services import store
    try:
        updated_customer = store.update_customer(customer_id, updates, user)
        print(f"✅ 고객 업데이트 성공: {customer_id}")
        
        return jsonify(updated_customer), 200
    except ValueError as e:
        print(f"❌ 고객 업데이트 실패: {e}")
        return jsonify({"error": str(e)}), 400
    except FileNotFoundError as e:
        print(f"❌ 고객 파일을 찾을 수 없음: {e}")
        return jsonify({"error": "고객 파일을 찾을 수 없습니다."}), 404


@bp.get("/managers")
@require_user()
@handle_errors()
def get_managers_api():
    user = request.headers.get("X-User")
    
    # 원래 store.py 함수 사용
    from app.services import store
    managers = store.get_managers(user)
    
    return jsonify({"managers": managers})
