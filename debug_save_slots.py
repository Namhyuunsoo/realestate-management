from app import create_app
from app.services.repositories import get_sheet_registry_repository
import traceback

app = create_app()

with app.app_context():
    try:
        repo = get_sheet_registry_repository()
        slots = repo.get_all_slots()
        print("현재 슬롯 개수:", len(slots))
        
        # 첫 번째 슬롯만 뽑아서 그대로 업데이트 해봄
        if slots:
            slot = slots[0]
            print("테스트 업데이트 슬롯:", slot)
            
            # save_slots() 호출 시 어떤 에러가 나는지 확인하기 위해 직접 upsert 실행
            try:
                res = repo.client.table(repo.table_name).upsert([slot]).execute()
                print("Upsert 결과:", res)
            except Exception as e:
                print("❌ Upsert 중 에러 발생!!!")
                print(str(e))
    except Exception as e:
        print("초기 설정 에러:", e)
