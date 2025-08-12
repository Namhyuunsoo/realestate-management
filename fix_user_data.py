#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
사용자 데이터 일관성 검증 및 수정 스크립트
"""

import json
import os
import time

def fix_user_data():
    """사용자 데이터의 일관성을 검증하고 수정"""
    
    # 데이터 파일 경로
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    users_file = os.path.join(data_dir, "users.json")
    
    if not os.path.exists(users_file):
        print("❌ users.json 파일을 찾을 수 없습니다.")
        return
    
    print("🔍 사용자 데이터 일관성 검증 시작...")
    
    try:
        with open(users_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        users = data.get("users", [])
        fixed_count = 0
        
        for user in users:
            original_user = user.copy()
            
            # status와 is_active 필드 일관성 확인
            status = user.get("status", "pending")
            is_active = user.get("is_active")
            
            # status가 있지만 is_active가 없는 경우
            if "status" in user and "is_active" not in user:
                user["is_active"] = status == "approved"
                fixed_count += 1
                print(f"✅ {user['email']}: is_active 필드 추가 ({user['is_active']})")
            
            # is_active가 있지만 status가 없는 경우
            elif "is_active" in user and "status" not in user:
                user["status"] = "approved" if is_active else "inactive"
                fixed_count += 1
                print(f"✅ {user['email']}: status 필드 추가 ({user['status']})")
            
            # 두 필드가 모두 있지만 일치하지 않는 경우
            elif "status" in user and "is_active" in user:
                expected_status = "approved" if is_active else "inactive"
                if status != expected_status:
                    user["status"] = expected_status
                    fixed_count += 1
                    print(f"✅ {user['email']}: status 필드 수정 ({status} → {expected_status})")
            
            # 삭제된 사용자 필터링
            if user.get("deleted_at"):
                print(f"🗑️ {user['email']}: 삭제된 사용자 발견")
        
        if fixed_count > 0:
            # 백업 생성
            backup_file = users_file + f".backup.{int(time.time())}"
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"📁 백업 파일 생성: {backup_file}")
            
            # 수정된 데이터 저장
            with open(users_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"✅ {fixed_count}개의 사용자 데이터가 수정되었습니다.")
        else:
            print("✅ 모든 사용자 데이터가 일관성을 유지하고 있습니다.")
        
        # 현재 사용자 목록 출력
        print(f"\n📊 현재 사용자 목록 ({len(users)}명):")
        for user in users:
            if not user.get("deleted_at"):
                status_display = "활성" if user.get("is_active", user.get("status") == "approved") else "비활성"
                print(f"  - {user['email']} ({user['name']}) - {status_display}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    fix_user_data()
