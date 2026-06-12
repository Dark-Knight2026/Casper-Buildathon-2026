-- ============================================================
-- Migration: storage_key on listing_media (ADR-007 D1, media pipeline)
-- Description: Records the backend storage key alongside the public URL so a
--   removed media item can be deleted from MediaStorage (delete takes the key,
--   not the URL, and the key is not derivable from the URL across backends).
--   Nullable: rows created before this migration have no key and are skipped
--   on storage delete (the blob is orphaned rather than the request failing).
-- ============================================================

ALTER TABLE listing_media
  ADD COLUMN IF NOT EXISTS storage_key TEXT;

COMMENT ON COLUMN listing_media.storage_key IS 'Backend storage key for MediaStorage::delete; null for rows created before this column existed';
