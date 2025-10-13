# app/core/auth.py
# 이 파일은 더 이상 사용되지 않습니다.
# 세션 기반 인증으로 완전 전환되었습니다.
# 
# 기존 기능:
# - get_current_user() -> app/core/decorators.py의 require_user() 사용
# - require_user() -> app/core/decorators.py의 require_user() 사용

from dataclasses import dataclass

@dataclass
class CurrentUser:
    """레거시 클래스 - 더 이상 사용되지 않음"""
    user_id: str
    is_admin: bool

# 모든 인증 로직은 app/core/decorators.py로 이전됨
# 이 파일은 하위 호환성을 위해 유지되지만 실제로는 사용되지 않음
