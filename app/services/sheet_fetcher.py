#sheet_fetcher.py
# app/services/sheet_fetcher.py

import os
import pandas as pd
import json
import pickle

def read_local_listing_sheet() -> list[list[str]]:
    """
    상가임대차.xlsx 를 읽어 2차원 배열(문자열) 반환.
    첫 행은 헤더.
    """
    # 캐시 파일 경로
    cache_file = "./data/cache/listing_sheet_cache.pkl"
    cache_dir = os.path.dirname(cache_file)
    
    # 캐시 디렉토리가 없으면 생성
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
    
    # 캐시 파일이 있고 최신이면 캐시 사용
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'rb') as f:
                cached_data = pickle.load(f)
            print("캐시된 데이터 사용 (파일 재읽기 방지)")
            return cached_data
        except Exception as e:
            print(f"캐시 읽기 실패, 파일에서 다시 읽기: {e}")
    
    # 환경변수에서 직접 로드 (Flask 컨텍스트와 관계없이)
    filename = os.getenv("LISTING_SHEET_FILENAME", "상가임대차.xlsx")
    data_dir = os.getenv("DATA_DIR", "./data")
    print(f"환경변수에서 로드: {filename}, {data_dir}")

    path = os.path.join(data_dir, "raw", filename)
    print(f"파일 경로: {path}")
    print(f"파일 존재 여부: {os.path.exists(path)}")

    if not os.path.exists(path):
        raise FileNotFoundError(f"Listing sheet not found: {path}")

    try:
        # 파일을 한 번만 읽기
        print("Excel 파일 읽기 시작...")
        
        # 기본 엔진 사용 (openpyxl과의 충돌 방지)
        df = pd.read_excel(path, dtype=str).fillna("")
        print("기본 엔진으로 Excel 파일 읽기 성공!")
        
        print(f"Excel 파일 읽기 성공! 행 수: {len(df)}")
        
        # 결과를 2차원 배열로 변환
        rows = [df.columns.tolist()] + df.values.tolist()
        
        # 캐시 파일에 저장
        try:
            with open(cache_file, 'wb') as f:
                pickle.dump(rows, f)
            print(f"데이터를 캐시 파일에 저장: {cache_file}")
        except Exception as e:
            print(f"캐시 저장 실패: {e}")
        
        # DataFrame 명시적 해제
        del df
        
        return rows

    except Exception as e:
        print(f"Excel 파일 읽기 실패: {e}")
        raise Exception(f"Excel 파일 읽기 실패: {e}")
