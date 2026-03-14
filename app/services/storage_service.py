import os
import uuid
from typing import List, Dict, Any, Optional
from werkzeug.utils import secure_filename
from .commercial_listings_service import get_supabase_client

class StorageService:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.bucket_name = 'listing_photos'

    def upload_photo(self, listing_id: str, file_data: bytes, filename: str, user_email: str = None) -> Optional[Dict[str, Any]]:
        """Supabase Storage에 사진 업로드 및 DB 기록"""
        if not self.supabase:
            return None

        # 1. 파일 경로 준비 (listing_id별로 폴더 구분)
        ext = os.path.splitext(filename)[1].lower()
        if not ext: ext = '.jpg'
        
        unique_id = str(uuid.uuid4())
        storage_path = f"{listing_id}/{unique_id}{ext}"
        
        try:
            # 2. Storage 업로드
            # content_type 자동 추정 (기본 image/jpeg)
            content_type = "image/jpeg"
            if ext == '.png': content_type = "image/png"
            elif ext == '.webp': content_type = "image/webp"

            res = self.supabase.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": content_type}
            )

            # 3. 공개 URL 획득
            full_url = self.supabase.storage.from_(self.bucket_name).get_public_url(storage_path)

            # 4. DB 기록
            photo_data = {
                "listing_id": listing_id,
                "storage_path": storage_path,
                "full_url": full_url,
                "file_name": filename,
                "file_size": len(file_data),
                "created_by": user_email
            }
            
            db_res = self.supabase.table("listing_photos").insert(photo_data).execute()
            
            if db_res.data:
                return db_res.data[0]
            return None

        except Exception as e:
            import logging
            logging.error(f"Error uploading photo: {e}")
            return None

    def get_listing_photos(self, listing_id: str) -> List[Dict[str, Any]]:
        """특정 매물의 사진 목록 조회"""
        if not self.supabase:
            return []
        
        try:
            res = self.supabase.table("listing_photos") \
                .select("*") \
                .eq("listing_id", listing_id) \
                .order("created_at") \
                .execute()
            return res.data or []
        except Exception as e:
            import logging
            logging.error(f"Error fetching photos: {e}")
            return []

    def delete_photo(self, photo_id: str, user_email: str = None) -> bool:
        """사진 삭제 (Storage 및 DB)"""
        if not self.supabase:
            return False
            
        try:
            # 1. 정보 조회
            photo = self.supabase.table("listing_photos").select("*").eq("id", photo_id).execute()
            if not photo.data:
                return False
            
            target = photo.data[0]
            storage_path = target["storage_path"]
            
            # 2. Storage 삭제
            self.supabase.storage.from_(self.bucket_name).remove([storage_path])
            
            # 3. DB 삭제
            self.supabase.table("listing_photos").delete().eq("id", photo_id).execute()
            return True
        except Exception as e:
            import logging
            logging.error(f"Error deleting photo: {e}")
            return False

# 싱글톤 인스턴스
storage_service = StorageService()
