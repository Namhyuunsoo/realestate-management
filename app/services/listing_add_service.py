# app/services/listing_add_service.py

import os
import re
from typing import Dict, Any, Optional
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from flask import current_app

class ListingAddService:
    """매물등록 서비스"""
    
    def __init__(self, service_account_file: str = None):
        self.service_account_file = service_account_file or os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
        self.credentials = None
        self.sheets_service = None
        self._authenticate()
    
    def _authenticate(self):
        """Google 서비스 계정 인증"""
        try:
            if not os.path.exists(self.service_account_file):
                raise Exception(f"서비스 계정 파일을 찾을 수 없습니다: {self.service_account_file}")
            
            scopes = ['https://www.googleapis.com/auth/spreadsheets']
            self.credentials = Credentials.from_service_account_file(
                self.service_account_file, 
                scopes=scopes
            )
            
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
    
    def add_listing_to_user_sheet(self, user_sheet_url: str, listing_data: Dict[str, Any]) -> bool:
        """사용자 시트에 매물 추가"""
        try:
            # 시트 ID 추출
            sheet_id = self.extract_sheet_id_from_url(user_sheet_url)
            if not sheet_id:
                raise Exception("시트 ID를 추출할 수 없습니다.")
            
            # 상가임대차 시트에 새 행 추가
            return self._add_row_to_sheet(sheet_id, '상가임대차', listing_data)
            
        except Exception as e:
            current_app.logger.error(f"매물 추가 실패: {str(e)}")
            return False
    
    def _add_row_to_sheet(self, sheet_id: str, sheet_name: str, listing_data: Dict[str, Any]) -> bool:
        """시트에 새 행 추가"""
        try:
            # 현재 시트의 마지막 행 번호 조회
            last_row = self._get_last_row_number(sheet_id, sheet_name)
            if last_row is None:
                raise Exception("시트의 마지막 행 번호를 조회할 수 없습니다.")
            
            # 매물 데이터를 헤더 순서에 맞게 배열로 변환 (행 번호 전달)
            row_data = self._prepare_row_data(listing_data, last_row + 1)
            
            # 시트에 새 행 추가 (마지막 행 다음에 추가)
            range_name = f"{sheet_name}!A:A"  # A열의 마지막 행 다음에 추가
            
            body = {
                'values': [row_data]
            }
            
            result = self.sheets_service.spreadsheets().values().append(
                spreadsheetId=sheet_id,
                range=range_name,
                valueInputOption='USER_ENTERED',  # 함수가 제대로 작동하도록 변경
                insertDataOption='OVERWRITE',     # INSERT_ROWS 대신 OVERWRITE 사용
                body=body
            ).execute()
            
            current_app.logger.info(f"매물 추가 성공: {sheet_id}/{sheet_name}, 행 {last_row + 1}")
            return True
            
        except HttpError as e:
            current_app.logger.error(f"Google Sheets API 오류: {e}")
            return False
        except Exception as e:
            current_app.logger.error(f"행 추가 실패: {str(e)}")
            return False
    
    def _get_last_row_number(self, sheet_id: str, sheet_name: str) -> Optional[int]:
        """시트의 마지막 행 번호 조회"""
        try:
            # A열의 모든 값 조회
            range_name = f"{sheet_name}!A:A"
            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                return 1  # 헤더만 있는 경우
            
            # 마지막 행 번호 반환 (1부터 시작)
            return len(values)
            
        except Exception as e:
            current_app.logger.error(f"마지막 행 번호 조회 실패: {str(e)}")
            return None
    
    def _prepare_row_data(self, listing_data: Dict[str, Any], row_number: int) -> list:
        """매물 데이터를 헤더 순서에 맞게 배열로 변환"""
        # A열은 비우고 B열부터 데이터 시작
        # 헤더 순서 (정확히 맞춤) - 지역2 제외
        header_order = [
            '접수날짜', '지역', '지번', '건물명', '층수', '가게명', '분양', '실평수',
            '보증금', '월세', '권리금', '비고', '담당자', '현황', '연락처',
            '의뢰인', '비고3', '위반여부', '현수막번호', '간략한위치'
        ]
        
        # A열에 빈 값 추가
        row_data = [""]  # A열은 빈 값
        
        # B열부터 실제 데이터 시작
        for field in header_order:
            if field == '현황':
                # 현황은 자동으로 "생" 입력
                row_data.append("생")
            elif field == '간략한위치':
                # 간략한위치는 빈 값
                row_data.append("")
            else:
                # 일반 필드는 입력값 사용
                value = listing_data.get(field, "")
                row_data.append(str(value) if value is not None else "")
        
        # 지역2는 VLOOKUP 함수를 직접 전송하여 스프레드시트 함수 유지
        # (B열부터 20개 필드 + A열 빈값 = 총 21개)
        # 지역2는 15번째 위치에 함수 삽입
        # 전달받은 실제 행 번호 사용
        vlookup_function = f"=VLOOKUP(C{row_number},'데이터베이스'!A:B,2,0)"
        row_data.insert(15, vlookup_function)  # 지역2 위치에 함수 삽입
        
        return row_data
