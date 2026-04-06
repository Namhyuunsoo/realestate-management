# tmp/check_housing_uuid.py
"""
주택매물장 시트 UUID 상태 확인 (읽기 전용)
- DB 쓰기 없음
- 시트 쓰기 없음
- UUID 비어있는 행만 카운트
"""

import sys
import os
import io

# Windows 인코딩 문제 해결
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from dotenv import load_dotenv
load_dotenv()

def get_gspread_client():
    """Google Sheets 클라이언트 직접 생성 (app.core 우회)"""
    import gspread
    from google.oauth2.service_account import Credentials
    import json
    import base64

    # 1. 환경변수 JSON 시도
    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if sa_json:
        try:
            try:
                decoded = base64.b64decode(sa_json).decode('utf-8')
                sa_info = json.loads(decoded)
            except Exception:
                sa_info = json.loads(sa_json)

            creds = Credentials.from_service_account_info(
                sa_info,
                scopes=['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
            )
            return gspread.authorize(creds)
        except Exception as e:
            print(f"환경변수 인증 실패: {e}")

    # 2. 파일 시스템 시도
    sa_file = os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
    alt_paths = [sa_file, "../config/service_account.json", "config/service_account.json", "./data/service_account.json"]

    for path in alt_paths:
        if os.path.exists(path):
            try:
                creds = Credentials.from_service_account_file(
                    path,
                    scopes=['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
                )
                return gspread.authorize(creds)
            except Exception as e:
                print(f"파일 인증 실패 ({path}): {e}")

    return None


def check_housing_uuid():
    HOUSING_SHEET_ID = os.getenv("HOUSING_SHEET_ID", "1KZ7aLN_Vzfnp0MhnOsJXuCtPtGIPuVj-UaHB2xP7JRs")
    SHEET_NAMES = ["주택 매매", "주택임대차"]

    print("=" * 50)
    print("주택매물장 UUID 상태 확인 (읽기 전용)")
    print("=" * 50)

    try:
        client = get_gspread_client()
        if not client:
            print("X Google 인증 실패")
            return

        spreadsheet = client.open_by_key(HOUSING_SHEET_ID)
        print("OK 스프레드시트 연결 성공")
        print()

        for sheet_name in SHEET_NAMES:
            print(f"\n[{sheet_name}] 시트 확인 중...")

            try:
                ws = spreadsheet.worksheet(sheet_name)
                values = ws.get_all_values()
            except Exception as e:
                print(f"   X 시트 접근 실패: {e}")
                continue

            if not values:
                print(f"   ! 데이터 없음")
                continue

            header_row = [h.strip().replace("\n", "") for h in values[0]]
            print(f"   헤더: {header_row[:5]}... ({len(header_row)}개 컬럼)")

            # UUID 컬럼 찾기
            try:
                uuid_col_idx = header_row.index("UUID")
                print(f"   OK UUID 컬럼 발견: {uuid_col_idx + 1}번째 컬럼")
            except ValueError:
                print(f"   ! UUID 컬럼 없음")
                uuid_col_idx = -1

            data_rows = values[1:]
            total_rows = len(data_rows)
            empty_uuid_rows = []
            filled_uuid_rows = []

            for idx, row in enumerate(data_rows, start=2):
                uuid_val = ""
                if uuid_col_idx >= 0 and uuid_col_idx < len(row):
                    uuid_val = row[uuid_col_idx].strip()

                if not uuid_val:
                    empty_uuid_rows.append(idx)
                else:
                    filled_uuid_rows.append(idx)

            print(f"   총 데이터: {total_rows}행")
            print(f"   UUID 있음: {len(filled_uuid_rows)}행")
            print(f"   UUID 없음: {len(empty_uuid_rows)}행")

            if empty_uuid_rows:
                if len(empty_uuid_rows) <= 10:
                    print(f"   UUID 없는 행: {empty_uuid_rows}")
                else:
                    print(f"   UUID 없는 행 (일부): {empty_uuid_rows[:10]}... 외 {len(empty_uuid_rows) - 10}행")

        print("\n" + "=" * 50)
        print("확인 완료")
        print("=" * 50)

    except Exception as e:
        print(f"X 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_housing_uuid()
