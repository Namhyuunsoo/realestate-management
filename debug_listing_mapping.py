from app import create_app
from app.services.repositories import get_sheet_registry_repository

app = create_app()

with app.app_context():
    manager_name = "오태식"
    
    print(f"=== 매물 저장 타겟 시트 맵핑 검증 (대상: {manager_name}) ===")
    
    repo = get_sheet_registry_repository()
    slots = repo.get_all_slots()
    
    user_slot = next((slot for slot in slots if slot.get('manager_name') == manager_name and slot.get('is_active')), None)
    
    if not user_slot or not user_slot.get('sheet_url'):
        print(f"❌ 담당자 '{manager_name}'에 할당된 활성 시트 슬롯을 찾을 수 없습니다.")
    else:
        target_sheet_id_or_url = user_slot.get('sheet_url')
        print(f"✅ 상가 매물 타겟 시트 매핑 완료: {manager_name} -> {target_sheet_id_or_url}")
        
    # HOUSING 로직
    housing_url = app.config.get('HOUSING_SHEET_ID')
    print(f"[config] HOUSING_SHEET_ID = {housing_url}")

print("✅ 테스트 완료")
