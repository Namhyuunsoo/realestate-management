# app/services/customer_service.py

import os
import pandas as pd
from typing import List, Dict, Any, Optional
from flask import current_app
from ..models.customer import Customer

class CustomerService:
    """고객 관련 비즈니스 로직 서비스"""
    
    def __init__(self, data_manager):
        self.data_manager = data_manager
        self.base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self.data_dir = "./data"
    
    def _excel_data_dir(self) -> str:
        """Excel 데이터 디렉토리 경로"""
        return os.path.join(self.data_dir, "raw")
    
    def _user_file(self, user_email: str) -> str:
        """사용자별 Excel 파일 경로"""
        return os.path.join(self._excel_data_dir(), f"{user_email}.xlsx")
    
    def _admin_file(self) -> str:
        """관리자 Excel 파일 경로"""
        return os.path.join(self._excel_data_dir(), "all_customers.xlsx")
    
    def get_customer(self, customer_id: str, user_email: str) -> Optional[Dict[str, Any]]:
        """고객 정보 조회"""
        print(f"🔍 get_customer 호출: cid={customer_id}, user_email={user_email}")
        
        # 사용자 파일에서 고객 찾기
        user_path = self._user_file(user_email)
        if not os.path.exists(user_path):
            return None
        
        try:
            df = pd.read_excel(user_path)
            print(f"📊 Excel 파일에서 {len(df)}개 고객 로드")
            
            # ID로 직접 찾기
            customer = df[df['id'] == customer_id]
            
            if len(customer) == 0:
                print(f"❌ 고객을 찾을 수 없음: ID={customer_id}")
                return None
            
            customer_dict = customer.iloc[0].to_dict()
            # 원래 store.py 로직 사용: NaN 값을 빈 문자열로 처리
            customer_dict = customer_dict.fillna("")
            cleaned_dict = customer_dict.to_dict()
            
            print(f"🔍 원본 고객 데이터 키들: {list(cleaned_dict.keys())}")
            print(f"🔍 floor 관련 데이터: floor={cleaned_dict.get('floor')}, floor_pref={cleaned_dict.get('floor_pref')}")
            print(f"🔍 area 관련 데이터: area={cleaned_dict.get('area')}, area_pref={cleaned_dict.get('area_pref')}")
            print(f"🔍 deposit 관련 데이터: deposit={cleaned_dict.get('deposit')}, deposit_pref={cleaned_dict.get('deposit_pref')}")
            print(f"🔍 rent 관련 데이터: rent={cleaned_dict.get('rent')}, rent_pref={cleaned_dict.get('rent_pref')}")
            print(f"🔍 premium 관련 데이터: premium={cleaned_dict.get('premium')}, premium_pref={cleaned_dict.get('premium_pref')}")
            print(f"🔍 note 관련 데이터: note={cleaned_dict.get('note')}, notes={cleaned_dict.get('notes')}")
            
            # 필드명 매핑 (Excel 컬럼명과 모델 필드명 통일) + 소수점 제거
            # floor → floor_pref (항상 복사하고 소수점 제거)
            if 'floor' in cleaned_dict:
                floor_val = cleaned_dict['floor']
                cleaned_dict['floor_pref'] = self._clean_numeric_value(floor_val)
                print(f"🔧 get_customer floor 정리: '{floor_val}' → '{cleaned_dict['floor_pref']}'")
            
            # area → area_pref (항상 복사하고 소수점 제거)
            if 'area' in cleaned_dict:
                area_val = cleaned_dict['area']
                cleaned_dict['area_pref'] = self._clean_numeric_value(area_val)
                print(f"🔧 get_customer area 정리: '{area_val}' → '{cleaned_dict['area_pref']}'")
            
            # deposit → deposit_pref (항상 복사하고 소수점 제거)
            if 'deposit' in cleaned_dict:
                deposit_val = cleaned_dict['deposit']
                cleaned_dict['deposit_pref'] = self._clean_numeric_value(deposit_val)
                print(f"🔧 get_customer deposit 정리: '{deposit_val}' → '{cleaned_dict['deposit_pref']}'")
            
            # rent → rent_pref (항상 복사하고 소수점 제거)
            if 'rent' in cleaned_dict:
                rent_val = cleaned_dict['rent']
                cleaned_dict['rent_pref'] = self._clean_numeric_value(rent_val)
                print(f"🔧 get_customer rent 정리: '{rent_val}' → '{cleaned_dict['rent_pref']}'")
            
            # premium → premium_pref (항상 복사하고 소수점 제거)
            if 'premium' in cleaned_dict:
                premium_val = cleaned_dict['premium']
                cleaned_dict['premium_pref'] = self._clean_numeric_value(premium_val)
                print(f"🔧 get_customer premium 정리: '{premium_val}' → '{cleaned_dict['premium_pref']}'")
            if 'note' in cleaned_dict and not cleaned_dict.get('notes'):
                cleaned_dict['notes'] = cleaned_dict['note']
            
            print(f"✅ 고객 찾음: {cleaned_dict.get('name')}, {cleaned_dict.get('phone')}")
            return cleaned_dict
            
        except Exception as e:
            print(f"❌ 고객 조회 중 오류: {e}")
            return None
    
    def list_customers(self, user_email: str, filter_type: str = 'own', manager: str = '') -> List[Dict[str, Any]]:
        """고객 목록 조회"""
        print(f"🔍 list_customers 호출: user={user_email}, filter={filter_type}, manager={manager}")
        
        try:
            # 관리자인 경우 전체 고객 조회
            if self.data_manager.is_admin(user_email):
                file_path = self._admin_file()
            else:
                file_path = self._user_file(user_email)
            
            if not os.path.exists(file_path):
                print(f"❌ 파일이 존재하지 않음: {file_path}")
                return []
            
            # 파일 수정 시간 확인하여 캐시 무효화
            current_time = os.path.getmtime(file_path)
            cache_key = f"{file_path}_{current_time}"
            
            df = pd.read_excel(file_path)
            print(f"📊 Excel 파일에서 {len(df)}개 고객 로드 (수정시간: {current_time})")
            
            # 필터링 적용
            filtered_df = self._apply_customer_filters(df, filter_type, manager, user_email)
            
            # 원래 store.py 로직 사용: NaN 값을 빈 문자열로 처리
            filtered_df = filtered_df.fillna("")
            customers = filtered_df.to_dict(orient="records")
            
            # 필드명 매핑 적용 (Excel 컬럼명과 모델 필드명 통일) + 소수점 제거
            for customer in customers:
                # floor → floor_pref (항상 복사하고 소수점 제거)
                if 'floor' in customer:
                    original_val = customer['floor']
                    cleaned_val = self._clean_numeric_value(original_val)
                    customer['floor_pref'] = cleaned_val
                    print(f"🔧 floor 정리: '{original_val}' → '{cleaned_val}'")
                
                # area → area_pref (항상 복사하고 소수점 제거)
                if 'area' in customer:
                    original_val = customer['area']
                    cleaned_val = self._clean_numeric_value(original_val)
                    customer['area_pref'] = cleaned_val
                    print(f"🔧 area 정리: '{original_val}' → '{cleaned_val}'")
                
                # deposit → deposit_pref (항상 복사하고 소수점 제거)
                if 'deposit' in customer:
                    original_val = customer['deposit']
                    cleaned_val = self._clean_numeric_value(original_val)
                    customer['deposit_pref'] = cleaned_val
                    print(f"🔧 deposit 정리: '{original_val}' → '{cleaned_val}'")
                
                # rent → rent_pref (항상 복사하고 소수점 제거)
                if 'rent' in customer:
                    original_val = customer['rent']
                    cleaned_val = self._clean_numeric_value(original_val)
                    customer['rent_pref'] = cleaned_val
                    print(f"🔧 rent 정리: '{original_val}' → '{cleaned_val}'")
                
                # premium → premium_pref (항상 복사하고 소수점 제거)
                if 'premium' in customer:
                    original_val = customer['premium']
                    cleaned_val = self._clean_numeric_value(original_val)
                    customer['premium_pref'] = cleaned_val
                    print(f"🔧 premium 정리: '{original_val}' → '{cleaned_val}'")
                
                # note → notes
                if 'note' in customer and not customer.get('notes'):
                    customer['notes'] = customer['note']
            
            print(f"✅ 필터링 후 {len(customers)}개 고객 반환")
            return customers
            
        except Exception as e:
            print(f"❌ 고객 목록 조회 중 오류: {e}")
            return []
    
    def _apply_customer_filters(self, df: pd.DataFrame, filter_type: str, manager: str, user_email: str) -> pd.DataFrame:
        """고객 데이터 필터링"""
        filtered_df = df.copy()
        
        # 필터 타입별 처리
        if filter_type == 'own':
            # 본인 고객만
            if 'user_email' in filtered_df.columns:
                filtered_df = filtered_df[filtered_df['user_email'] == user_email]
        elif filter_type == 'all':
            # 전체 고객 (관리자만)
            pass
        elif filter_type == 'manager':
            # 특정 매니저의 고객
            if manager and 'manager' in filtered_df.columns:
                filtered_df = filtered_df[filtered_df['manager'] == manager]
        
        return filtered_df
    
    def create_customer(self, user_email: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """고객 생성"""
        print(f"🔍 create_customer 호출: user={user_email}, payload={payload}")
        
        try:
            # 지역명 정규화
            if 'region' in payload:
                payload['region'] = self.normalize_region(payload['region'])
            if 'region2' in payload:
                payload['region2'] = self.normalize_region(payload['region2'])
            
            # Customer 모델 생성 및 검증
            customer = Customer(**payload)
            customer.user_email = user_email
            
            # 검증
            errors = customer.validate()
            if errors:
                print(f"❌ 고객 데이터 검증 실패: {errors}")
                raise ValueError(f"고객 데이터 검증 실패: {', '.join(errors)}")
            
            # ID 생성
            customer.id = self._generate_customer_id(customer.name, customer.phone)
            
            # Excel 파일에 저장
            self._save_customer_to_excel(customer, user_email)
            
            print(f"✅ 고객 생성 완료: {customer.id}")
            return customer.to_dict()
            
        except Exception as e:
            print(f"❌ 고객 생성 중 오류: {e}")
            raise
    
    def update_customer(self, customer_id: str, updates: Dict[str, Any], user_email: str) -> Dict[str, Any]:
        """고객 정보 업데이트"""
        print(f"🔍 update_customer 호출: cid={customer_id}, user={user_email}, updates={updates}")
        
        try:
            # 기존 고객 정보 조회
            existing_customer = self.get_customer(customer_id, user_email)
            if not existing_customer:
                raise ValueError("고객을 찾을 수 없습니다.")
            
            # 빈 값이나 None인 업데이트는 제거 (기존 값 유지)
            cleaned_updates = {}
            for key, value in updates.items():
                if value is not None and value != '' and value != 'undefined':
                    cleaned_updates[key] = value
            
            print(f"🧹 정리된 업데이트 데이터: {cleaned_updates}")
            
            # 지역명 정규화
            if 'region' in cleaned_updates:
                cleaned_updates['region'] = self.normalize_region(cleaned_updates['region'])
            if 'region2' in cleaned_updates:
                cleaned_updates['region2'] = self.normalize_region(cleaned_updates['region2'])
            
            # Customer 모델 생성 및 업데이트
            customer = Customer.from_dict(existing_customer)
            customer.update_from_dict(cleaned_updates)
            
            # 검증
            errors = customer.validate()
            if errors:
                print(f"❌ 고객 데이터 검증 실패: {errors}")
                raise ValueError(f"고객 데이터 검증 실패: {', '.join(errors)}")
            
            # Excel 파일 업데이트
            self._update_customer_in_excel(customer, user_email)
            
            print(f"✅ 고객 업데이트 완료: {customer_id}")
            return customer.to_dict()
            
        except Exception as e:
            print(f"❌ 고객 업데이트 중 오류: {e}")
            raise
    
    def delete_customer(self, customer_id: str, user_email: str) -> bool:
        """고객 삭제"""
        print(f"🔍 delete_customer 호출: cid={customer_id}, user={user_email}")
        
        try:
            # 기존 고객 정보 조회
            existing_customer = self.get_customer(customer_id, user_email)
            if not existing_customer:
                return False
            
            # Excel 파일에서 삭제
            self._delete_customer_from_excel(customer_id, user_email)
            
            print(f"✅ 고객 삭제 완료: {customer_id}")
            return True
            
        except Exception as e:
            print(f"❌ 고객 삭제 중 오류: {e}")
            return False
    
    def get_managers(self, user_email: str) -> List[str]:
        """매니저 목록 조회"""
        print(f"🔍 get_managers 호출: user={user_email}")
        
        try:
            # 관리자인 경우 전체 매니저 조회
            if self.data_manager.is_admin(user_email):
                file_path = self._admin_file()
            else:
                file_path = self._user_file(user_email)
            
            if not os.path.exists(file_path):
                return []
            
            df = pd.read_excel(file_path)
            
            # manager 컬럼이 있는 경우에만 처리
            if 'manager' in df.columns:
                managers = df['manager'].dropna().unique().tolist()
                managers = [m for m in managers if m and m.strip()]
                print(f"✅ {len(managers)}개 매니저 반환")
                return managers
            
            return []
            
        except Exception as e:
            print(f"❌ 매니저 목록 조회 중 오류: {e}")
            return []
    
    def _generate_customer_id(self, name: str, phone: str) -> str:
        """고객 ID 생성"""
        clean_name = name.strip().replace(" ", "_")
        clean_phone = phone.strip().replace("-", "").replace(" ", "")
        return f"{clean_name}_{clean_phone}"
    
    def _save_customer_to_excel(self, customer: Customer, user_email: str):
        """Excel 파일에 고객 저장"""
        file_path = self._user_file(user_email)
        
        # 디렉토리 생성
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # 기존 파일이 있으면 읽기, 없으면 새로 생성
        if os.path.exists(file_path):
            df = pd.read_excel(file_path)
        else:
            df = pd.DataFrame()
        
        # 고객 데이터를 DataFrame에 추가
        customer_dict = customer.to_dict()
        new_row = pd.DataFrame([customer_dict])
        df = pd.concat([df, new_row], ignore_index=True)
        
        # 파일 저장
        df.to_excel(file_path, index=False)
        print(f"✅ Excel 파일에 고객 저장: {file_path}")
    
    def _update_customer_in_excel(self, customer: Customer, user_email: str):
        """Excel 파일에서 고객 업데이트"""
        file_path = self._user_file(user_email)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"고객 파일을 찾을 수 없습니다: {file_path}")
        
        df = pd.read_excel(file_path)
        
        # ID로 고객 찾기
        customer_idx = df[df['id'] == customer.id].index
        if len(customer_idx) == 0:
            raise ValueError(f"업데이트할 고객을 찾을 수 없습니다: {customer.id}")
        
        # 고객 정보 업데이트 (빈 값이나 None인 경우 기존 값 유지)
        customer_dict = customer.to_dict()
        for key, value in customer_dict.items():
            if key in df.columns and value is not None and value != '' and value != 'undefined':
                df.loc[customer_idx[0], key] = value
                print(f"📝 업데이트: {key} = {value}")
            elif key in df.columns:
                print(f"⏭️ 빈 값 유지: {key} = {value}")
        
        # 파일 저장
        df.to_excel(file_path, index=False)
        print(f"✅ Excel 파일에서 고객 업데이트: {file_path}")
        
        # 관리자 파일도 동시에 업데이트 (데이터 일관성 유지)
        admin_path = self._admin_file()
        if os.path.exists(admin_path):
            try:
                df_admin = pd.read_excel(admin_path)
                admin_customer_idx = df_admin[df_admin['id'] == customer.id].index
                
                if len(admin_customer_idx) > 0:
                    for key, value in customer_dict.items():
                        if key in df_admin.columns and value is not None and value != '' and value != 'undefined':
                            df_admin.loc[admin_customer_idx[0], key] = value
                            print(f"📝 관리자 파일 업데이트: {key} = {value}")
                    
                    df_admin.to_excel(admin_path, index=False)
                    print(f"✅ 관리자 파일도 업데이트 완료: {admin_path}")
                else:
                    print(f"⚠️ 관리자 파일에서 고객을 찾을 수 없음: {customer.id}")
            except Exception as e:
                print(f"⚠️ 관리자 파일 업데이트 실패: {e}")
    
    def _delete_customer_from_excel(self, customer_id: str, user_email: str):
        """Excel 파일에서 고객 삭제"""
        file_path = self._user_file(user_email)
        
        if not os.path.exists(file_path):
            return
        
        df = pd.read_excel(file_path)
        
        # ID로 고객 찾기 및 삭제
        df = df[df['id'] != customer_id]
        
        # 파일 저장
        df.to_excel(file_path, index=False)
        print(f"✅ Excel 파일에서 고객 삭제: {file_path}") 

    def normalize_region(self, region: str) -> str:
        """지역명 정규화 (기존 store.py 로직 유지)"""
        if not region:
            return ""
        
        # 공백 제거 및 소문자 변환
        normalized = region.strip().lower()
        
        # 지역명 매핑
        region_mapping = {
            '강남': '강남구',
            '강북': '강북구',
            '강동': '강동구',
            '강서': '강서구',
            '관악': '관악구',
            '광진': '광진구',
            '구로': '구로구',
            '금천': '금천구',
            '노원': '노원구',
            '도봉': '도봉구',
            '동대문': '동대문구',
            '동작': '동작구',
            '마포': '마포구',
            '서대문': '서대문구',
            '서초': '서초구',
            '성동': '성동구',
            '성북': '성북구',
            '송파': '송파구',
            '양천': '양천구',
            '영등포': '영등포구',
            '용산': '용산구',
            '은평': '은평구',
            '종로': '종로구',
            '중구': '중구',
            '중랑': '중랑구'
        }
        
        # 기존 store.py의 추가 정규화 로직
        if "시전체" in region or "시전부" in region:
            return region.split("시전체")[0] + "시"
        
        return region_mapping.get(normalized, region)
    
    def _clean_numeric_value(self, value):
        """숫자 값에서 불필요한 소수점 제거"""
        if value is None or value == '':
            return value
        
        # 문자열로 변환
        str_value = str(value)
        
        # .0으로 끝나는 경우 제거
        if str_value.endswith('.0'):
            cleaned = str_value.replace('.0', '')
            print(f"🔧 .0 제거: '{str_value}' → '{cleaned}'")
            return cleaned
        
        # float이고 정수인 경우 정수로 변환
        try:
            float_val = float(str_value)
            if float_val.is_integer():
                cleaned = str(int(float_val))
                print(f"🔧 float→int 변환: '{str_value}' → '{cleaned}'")
                return cleaned
        except (ValueError, TypeError):
            pass
        
        # pandas NaN 값 처리
        if str_value.lower() in ['nan', 'none', 'null']:
            return ''
        
        return str_value 