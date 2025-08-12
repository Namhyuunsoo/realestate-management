#!/usr/bin/env python3
"""
기존 고객 데이터의 ID를 고객명+전화번호 기반으로 업데이트하는 스크립트
"""

import os
import pandas as pd
import re

def generate_customer_id(name: str, phone: str) -> str:
    """고객명과 전화번호로 고객 ID 생성"""
    if not name or not phone:
        return ""
    
    # 특수문자 제거 및 공백 처리
    clean_name = name.strip().replace(" ", "_")
    clean_phone = phone.strip().replace("-", "").replace(" ", "")
    return f"{clean_name}_{clean_phone}"

def update_customer_file(file_path: str):
    """고객 파일의 ID를 업데이트"""
    if not os.path.exists(file_path):
        print(f"파일이 존재하지 않음: {file_path}")
        return
    
    try:
        df = pd.read_excel(file_path)
        print(f"📊 {file_path} 로드 완료: {len(df)}개 고객")
        
        # ID 컬럼이 없으면 추가
        if "id" not in df.columns:
            df["id"] = ""
            print("ID 컬럼 추가됨")
        
        updated_count = 0
        for i, row in df.iterrows():
            name = str(row.get("name", "")).strip()
            phone = str(row.get("phone", "")).strip()
            current_id = str(row.get("id", "")).strip()
            
            # NaN 값 처리
            if name == "nan" or phone == "nan":
                continue
            if current_id == "nan":
                current_id = ""
            
            # 이름과 전화번호가 있고, ID가 없거나 UUID 형식인 경우 업데이트
            if name and phone:
                new_id = generate_customer_id(name, phone)
                if not current_id or current_id.startswith("cus_"):
                    df.at[i, "id"] = new_id
                    updated_count += 1
                    print(f"  업데이트: {name} ({phone}) -> {new_id}")
        
        if updated_count > 0:
            df.to_excel(file_path, index=False)
            print(f"✅ {file_path} 업데이트 완료: {updated_count}개 고객")
        else:
            print(f"ℹ️ {file_path} 변경사항 없음")
            
    except Exception as e:
        print(f"❌ {file_path} 처리 중 오류: {e}")

def main():
    """메인 함수"""
    print("🔄 고객 ID 업데이트 시작...")
    
    # 데이터 디렉토리
    data_dir = "data/raw"
    
    # 고객 파일들
    customer_files = [
        "all_customers.xlsx",
        "darkbirth_customerList.xlsx"
    ]
    
    for filename in customer_files:
        file_path = os.path.join(data_dir, filename)
        print(f"\n📁 처리 중: {filename}")
        update_customer_file(file_path)
    
    print("\n✅ 고객 ID 업데이트 완료!")

if __name__ == "__main__":
    main() 