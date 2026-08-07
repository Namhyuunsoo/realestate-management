import os
import uuid
import re
from typing import List, Dict, Any, Optional
from werkzeug.utils import secure_filename
from .commercial_listings_service import get_supabase_client

class StorageService:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.bucket_name = 'listing_photos'

    def _normalize_listing_id(self, listing_id: str) -> str:
        """프론트엔드에서 넘어온 접두사(r_, u_, l_, h_ 등)가 붙은 ID를 순수 UUID/ID로 정규화"""
        if not listing_id: return listing_id
        # 일반적인 접두사 패턴 (한 글자 + 언더바) 제거
        return re.sub(r'^[rulph]_', '', listing_id)

    def upload_photo(self, listing_id: str, file_data: bytes, filename: str, user_email: str = None) -> Optional[Dict[str, Any]]:
        """Supabase Storage에 사진 업로드 및 DB 기록"""
        if not self.supabase:
            return None

        # ID 정규화
        normalized_id = self._normalize_listing_id(listing_id)

        # 1. 파일 경로 준비 (ID별로 폴더 구분)
        ext = os.path.splitext(filename)[1].lower()
        if not ext: ext = '.jpg'
        
        unique_id = str(uuid.uuid4())
        storage_path = f"{normalized_id}/{unique_id}{ext}"
        
        try:
            # 2. Storage 업로드
            content_type = "image/jpeg"
            if ext == '.png': content_type = "image/png"
            elif ext == '.webp': content_type = "image/webp"

            self.supabase.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": content_type}
            )

            # 3. 공개 URL 획득
            full_url = self.supabase.storage.from_(self.bucket_name).get_public_url(storage_path)

            # 4. DB 기록
            photo_data = {
                "listing_id": normalized_id,
                "storage_path": storage_path,
                "full_url": full_url,
                "file_name": filename,
                "file_size": len(file_data),
                "created_by": user_email
            }
            
            try:
                db_res = self.supabase.table("listing_photos").insert(photo_data).execute()
                if db_res.data:
                    return db_res.data[0]
                # DB insert 결과 없음 → Storage 롤백
                raise Exception("DB insert 결과 없음")
            except Exception as db_err:
                # 🔥 [Fix] DB insert 실패 시 Storage 파일 즉시 롤백 (고아 파일 방지)
                import logging
                logging.error(f"DB insert 실패, Storage 롤백 시도: {db_err}")
                try:
                    self.supabase.storage.from_(self.bucket_name).remove([storage_path])
                    logging.info(f"Storage 롤백 성공: {storage_path}")
                except Exception as rollback_err:
                    logging.error(f"Storage 롤백 실패 (수동 삭제 필요): {storage_path} — {rollback_err}")
                return None

        except Exception as e:
            import logging
            logging.error(f"Error uploading photo: {e}")
            return None

    def get_listing_photos(self, listing_id: str) -> List[Dict[str, Any]]:
        """특정 매물의 사진 목록 조회 (ID 정규화 포함)"""
        if not self.supabase:
            return []
        
        normalized_id = self._normalize_listing_id(listing_id)
        
        try:
            res = self.supabase.table("listing_photos") \
                .select("*") \
                .eq("listing_id", normalized_id) \
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

    def delete_photos_by_listing_ids(self, listing_ids: list) -> int:
        """
        매물 삭제 시 사진 cascade 삭제.
        주의: 이 함수는 관리자 API를 통해서만 호출되어야 함.
        Ghost Cleanup에서는 호출하지 않음 (이관 데이터 사진 유지 위해).
        Returns: 삭제된 사진 수
        """
        if not self.supabase or not listing_ids:
            return 0
        import logging
        deleted_count = 0
        try:
            # 순수 UUID 목록으로 정규화 (h_, r_, u_, l_ 접두사 제거)
            pure_ids = [self._normalize_listing_id(lid) for lid in listing_ids]

            # 100개 단위 배치 처리
            for i in range(0, len(pure_ids), 100):
                chunk = pure_ids[i:i+100]
                # 해당 매물의 사진 조회
                res = self.supabase.table("listing_photos").select("id, storage_path").in_("listing_id", chunk).execute()
                if not res.data:
                    continue
                # Storage 파일 일괄 삭제
                paths = [r["storage_path"] for r in res.data if r.get("storage_path")]
                if paths:
                    try:
                        self.supabase.storage.from_(self.bucket_name).remove(paths)
                    except Exception as se:
                        logging.error(f"Storage 사진 삭제 실패 (계속 진행): {se}")
                # DB 레코드 삭제
                photo_ids = [r["id"] for r in res.data]
                self.supabase.table("listing_photos").delete().in_("id", photo_ids).execute()
                deleted_count += len(photo_ids)
        except Exception as e:
            logging.error(f"사진 cascade 삭제 실패: {e}")
        return deleted_count

# 싱글톤 인스턴스
storage_service = StorageService()
