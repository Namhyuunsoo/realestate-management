# app/services/listing_add_service.py

import os
import re
import uuid
from typing import Dict, Any, Optional
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from flask import current_app

class ListingAddService:
    """매물등록 서비스"""
    
    def __init__(self, service_account_file: str = None):
        self.service_account_file = service_account_file or os.getenv("SERVICE_ACCOUNT_FILE", "../config/service_account.json")
        self.credentials = None
        self.sheets_service = None
        self._authenticate()
    
    def _authenticate(self):
        """Google 서비스 계정 인증"""
        try:
            from app.core.google_auth import get_google_auth_credentials
            self.credentials = get_google_auth_credentials()
            
            if not self.credentials:
                raise Exception("Google 서비스 계정 인증 정보를 로드할 수 없습니다.")
                
            self.sheets_service = build('sheets', 'v4', credentials=self.credentials)
            current_app.logger.info("Google Sheets API 인증 성공")
            
        except Exception as e:
            current_app.logger.error(f"Google Sheets API 인증 실패: {str(e)}")
            raise
    
    def extract_sheet_id_from_url(self, sheet_url: str) -> Optional[str]:
        """시트 URL에서 시트 ID 추출"""
        try:
            # Google Sheets URL 패턴: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
            pattern = r'/spreadsheets/d/([a-zA-Z0-9-_]+)'
            match = re.search(pattern, sheet_url)
            
            if match:
                sheet_id = match.group(1)
                current_app.logger.info(f"시트 ID 추출 성공: {sheet_id}")
                return sheet_id
            else:
                current_app.logger.error(f"시트 ID 추출 실패: {sheet_url}")
                return None
                
        except Exception as e:
            current_app.logger.error(f"시트 ID 추출 중 오류: {str(e)}")
            return None
    
    def add_listing_dynamic(self, target_sheet_id_or_url: str, sheet_name: str, listing_data: Dict[str, Any]) -> bool:
        """선택된 매물 유형(sheet_name)에 맞추어 시트에 새 매물 행 추가"""
        try:
            # URL 형식인 경우 ID 추출, 이미 ID 해시인 경우 그대로 사용
            sheet_id = target_sheet_id_or_url
            if "http" in target_sheet_id_or_url:
                extracted = self.extract_sheet_id_from_url(target_sheet_id_or_url)
                if not extracted:
                    raise Exception("시트 ID 추출 실패")
                sheet_id = extracted

            return self._add_row_to_sheet_dynamic(sheet_id, sheet_name, listing_data)
        except Exception as e:
            current_app.logger.error(f"동적 매물 추가 실패: {str(e)}")
            return None

    def _add_row_to_sheet_dynamic(self, sheet_id: str, sheet_name: str, listing_data: Dict[str, Any]) -> bool:
        try:
            # 마지막 행 번호 조회
            last_row = self._get_last_row_number(sheet_id, sheet_name)
            if last_row is None:
                raise Exception("시트의 마지막 행 번호를 조회할 수 없습니다.")

            # 헤더 정의부 ('상가 3종', '주택 2종')
            headers_map = {
                '상가임대차': ["접수일", "지역", "지번", "건물명", "층수", "가게명", "분양", "실평수", "보증금", "월세", "권리금", "비고", "담당자", "현황", "지역2", "연락처", "의뢰인", "비고3", "위반여부", "현수막번호", "간략한위치"],
                '구분상가매매': ["접수일", "지역", "지번", "건물명", "층수", "가게명", "분양(㎡)", "분양(평)", "전용(평)", "보증금", "월세", "매매가", "평당가격", "LTV", "이율", "수익율", "비고", "담당자", "현황", "소유주", "연락처"],
                '건물토지매매': ["접수일", "지역", "지번", "건물명", "지하총층", "지상총층", "대지(㎡)", "대지(평)", "건축(㎡)", "연(㎡)", "보증금", "월세", "매매가", "평당가격", "LTV", "이율", "수익율", "비고", "담당자", "현황", "소유자", "소유자관계", "연락처"],
                '주택 매매': ["접수일", "지역", "지번", "유형", "건물명", "동", "층수", "호수", "향", "공급", "전용", "보증금", "월세", "관리비", "매매가", "방", "화장실", "평당가격", "LTV", "이율", "수익율", "의뢰인", "관계", "연락처", "임차인 연락처", "비고", "거래유형", "현황", "지역2"],
                '주택임대차': ["접수일", "지역", "지번", "유형", "건물명", "동", "층수", "호수", "향", "공급", "전용", "보증금", "월세", "관리비", "매매가", "방", "화장실", "평당가격", "LTV", "이율", "수익율", "의뢰인", "관계", "연락처", "임차인 연락처", "비고", "거래유형", "현황", "지역2"]
            }

            headers = headers_map.get(sheet_name)
            if not headers:
                raise Exception(f"지원하지 않는 매물 유형입니다: {sheet_name}")

            target_row_number = last_row + 1
            
            # UUID 생성 및 추가
            listing_uuid = str(uuid.uuid4())
            listing_data['UUID'] = listing_uuid
            
            # 헤더에 'UUID'가 명시적으로 없더라도 row_data 준비 과정에서 UUID를 포함하도록 함
            if 'UUID' not in headers:
                # 시트의 맨 끝에 UUID 컬럼이 있다고 가정 (동기화 엔진의 관행)
                headers.append('UUID')
            
            row_data = self._prepare_dynamic_row_data(headers, listing_data, target_row_number)

            # 수동 지정 방식(Update): B열부터 시작하는 정확한 줄 번호를 좌표로 타겟팅 (예: B36)
            range_name = f"'{sheet_name}'!B{target_row_number}"
            body = {'values': [row_data]}

            self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=range_name,
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()

            current_app.logger.info(f"동적 매물 추가 성공: {sheet_id}/{sheet_name}, 행 {target_row_number}, UUID: {listing_uuid}")
            
            # 생성된 UUID 반환 (더 이상 row-based ID를 사용하지 않음)
            return listing_uuid

        except HttpError as e:
            current_app.logger.error(f"Google Sheets API 오류: {e}")
            return False
        except Exception as e:
            current_app.logger.error(f"동적 행 추가 실패: {str(e)}")
            return False

    def _get_last_row_number(self, sheet_id: str, sheet_name: str) -> Optional[int]:
        """시트의 마지막 행 번호 조회"""
        try:
            # 전체 영역(A:Z)을 조회하여 진짜 마지막 행 번호를 찾음 (A열은 항상 비어있을 수 있기 때문)
            range_name = f"'{sheet_name}'!A:Z"
            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                return 1  # 아무것도 없으면 1(헤더 위치)
            
            # 역순 스캔 알고리즘: 중간 이빠짐, 공백으로 인한 배열 압축 버그 완벽 차단
            last_row = 1
            for i in range(len(values) - 1, -1, -1):
                row = values[i]
                # 각 셀(칸)의 문자열 묶음 중 하나라도 빈 공백을 넘은 데이터가 존재하면 진짜 마지막 행으로 간주
                if any(str(cell).strip() for cell in row):
                    last_row = i + 1  # 0-based 인덱스를 1-based 시트 행 번호로 전환
                    break
                    
            return last_row
            
        except Exception as e:
            current_app.logger.error(f"마지막 행 번호 조회 실패: {str(e)}")
            return None

    def _prepare_dynamic_row_data(self, headers: list, listing_data: Dict[str, Any], row_number: int) -> list:
        """가변 헤더 배열에 맞춰 전달된 데이터를 배치. (API가 B열을 테이블 시작으로 인식하므로 첫 빈칸 제거)"""
        row_data = []  # B열(접수일)부터 데이터가 1:1로 매칭됨
        
        for field in headers:
            if field == '현황':
                row_data.append("생")
            elif field in ['간략한위치']:
                row_data.append("")
            elif field == '지역2':
                # 지역2가 헤더에 존재할 시 행번호를 치환한 VLOOKUP 공식 삽입
                # VLOOKUP 공식: =VLOOKUP(C{row_number},'데이터베이스'!A:B,2,0) (C열은 '지번' 혹은 '지역' 등. 여기서는 기존 코드 관행인 C열로 매핑)
                vlookup_function = f"=VLOOKUP(C{row_number},'데이터베이스'!A:B,2,0)"
                row_data.append(vlookup_function)
            else:
                value = listing_data.get(field, "")
                row_data.append(str(value) if value is not None else "")
                
        return row_data
