-- 프로필 사진 Storage (avatars 버킷)
-- Supabase 대시보드에서 avatars 버킷 생성(Public ON) 후 실행

-- 기존 정책명 충돌 시 DROP POLICY 후 재실행
-- DROP POLICY IF EXISTS "avatar_upload" ON storage.objects;
-- DROP POLICY IF EXISTS "avatar_view" ON storage.objects;
-- DROP POLICY IF EXISTS "avatar_delete" ON storage.objects;
-- DROP POLICY IF EXISTS "avatar_update" ON storage.objects;

CREATE POLICY "avatar_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatar_view"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatar_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatar_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
