# app/services/sheet_download_service.py

import os
import time
import logging
from typing import Optional, Dict, Any
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io
import pandas as pd

class SheetDownloadService:
    """Google Sheets를 Excel로 다운로드하는 서비스"""
    
    def __init__(self, service_account_file: str = None):
        self.service_account_file = service_account_file or os.getenv("SERVICE_ACCOUNT_FILE", "service_account.json")
        self.spreadsheet_id = os.getenv("SPREADSHEET_ID", "1D14iWPeTuHAMf9m_LrtsILYEd2Z8dpjAbIfpx-WR8eY")
        self.download_dir = os.getenv("SHEET_DOWNLOAD_DIR", "./data/raw")
        
        # 서비스 계정 인증
        self.credentials = None
        self.drive_service = None
        self.sheets_service = None
        
        self._authenticate()
        self._ensure_download_dir()
    
    def _authenticate(self):
        """Google 서비스 계정 인증"""
        try:
            if not os.path.exists(self.service_account_file):
                logging.error(f"서비스 계정 파일을 찾을 수 없습니다: {self.service_account_file}")
                return
            
            # 서비스 계정으로 인증
            scopes = [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/spreadsheets'
            ]
            
            self.credentials = Credentials.from_service_account_file(
                self.service_account_file, 
                scopes=scopes
            )
            
            # Drive API와 Sheets API 서비스 생성
            self.drive_service = build('drive', 'v3', credentials=self.credentials)
            self.sheets_service = build('sheets', 'v4', credentials=self.credentials)
            
            logging.info("Google API 인증 성공")
            
        except Exception as e:
            logging.error(f"Google API 인증 실패: {str(e)}")
            raise
    
    def _ensure_download_dir(self):
        """다운로드 디렉토리 생성"""
        os.makedirs(self.download_dir, exist_ok=True)
        logging.info(f"다운로드 디렉토리 확인: {self.download_dir}")
    
    def get_sheet_info(self) -> Dict[str, Any]:
        """스프레드시트 정보 조회"""
        try:
            spreadsheet = self.sheets_service.spreadsheets().get(
                spreadsheetId=self.spreadsheet_id
            ).execute()
            
            sheets_info = {}
            for sheet in spreadsheet['sheets']:
                sheet_id = sheet['properties']['sheetId']
                sheet_name = sheet['properties']['title']
                sheets_info[sheet_name] = {
                    'id': sheet_id,
                    'title': sheet_name
                }
            
            logging.info(f"스프레드시트 정보 조회 성공: {len(sheets_info)}개 시트")
            return sheets_info
            
        except Exception as e:
            logging.error(f"스프레드시트 정보 조회 실패: {str(e)}")
            return {}
    
    def download_sheet_as_excel(self, sheet_name: str, file_name: str) -> bool:
        """특정 시트를 Excel 파일로 다운로드"""
        try:
            # 시트 정보 조회
            sheets_info = self.get_sheet_info()
            if sheet_name not in sheets_info:
                logging.error(f"시트를 찾을 수 없습니다: {sheet_name}")
                return False
            
            # 시트 데이터 읽기
            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=sheet_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                logging.warning(f"시트 데이터가 비어있습니다: {sheet_name}")
                return False
            
            # DataFrame으로 변환
            df = pd.DataFrame(values[1:], columns=values[0])
            
            # Excel 파일로 저장 (덮어쓰기)
            file_path = os.path.join(self.download_dir, file_name)
            df.to_excel(file_path, index=False)
            
            logging.info(f"시트 다운로드 성공: {sheet_name} → {file_path}")
            return True
            
        except Exception as e:
            logging.error(f"시트 다운로드 실패 {sheet_name}: {str(e)}")
            return False
    
    def download_all_sheets(self) -> Dict[str, bool]:
        """모든 시트를 Excel로 다운로드"""
        results = {}
        
        # 1번 시트: 상가임대차
        results['상가임대차'] = self.download_sheet_as_excel(
            '상가임대차', '상가임대차.xlsx'
        )
        
        # 2번 시트: 구분상가매매
        results['구분상가매매'] = self.download_sheet_as_excel(
            '구분상가매매', '구분상가매매.xlsx'
        )
        
        # 3번 시트: 건물토지매매
        results['건물토지매매'] = self.download_sheet_as_excel(
            '건물토지매매', '건물토지매매.xlsx'
        )
        
        success_count = sum(results.values())
        logging.info(f"전체 시트 다운로드 완료: {success_count}/{len(results)} 성공")
        
        return results
    
    def get_last_download_time(self) -> float:
        """마지막 다운로드 시간 조회"""
        try:
            # 가장 최근 파일의 수정 시간 확인
            latest_time = 0
            for file_name in ['상가임대차.xlsx', '구분상가매매.xlsx', '건물토지매매.xlsx']:
                file_path = os.path.join(self.download_dir, file_name)
                if os.path.exists(file_path):
                    file_time = os.path.getmtime(file_path)
                    latest_time = max(latest_time, file_time)
            
            return latest_time
            
        except Exception as e:
            logging.error(f"마지막 다운로드 시간 조회 실패: {str(e)}")
            return 0




