-- 골목대장 어드민 설정 SQL
-- Supabase SQL Editor에서 실행하세요.
-- ⚠️ YOUR_ADMIN_EMAIL@gmail.com 을 실제 관리자 Google 이메일로 변경 후 실행

-- 1. users 테이블 어드민·활성 필드
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30);

-- 2. posts 테이블 상단고정 필드
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 3. 관리자 계정 지정 (이메일 변경 필수)
-- UPDATE public.users SET is_admin = true WHERE email = 'YOUR_ADMIN_EMAIL@gmail.com';

-- 4. reports 신고 테이블
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.users(id),
  post_id UUID REFERENCES public.posts(id),
  comment_id UUID REFERENCES public.comments(id),
  reason VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_report" ON public.reports;
CREATE POLICY "users_can_report"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "admin_can_view_reports" ON public.reports;
CREATE POLICY "admin_can_view_reports"
ON public.reports FOR SELECT
USING (public.check_is_admin());

GRANT SELECT, INSERT ON TABLE public.reports TO authenticated;

-- 5. 어드민 RLS 정책 (기존 정책과 충돌 시 DROP 후 재생성)
-- ⚠️ users 테이블을 서브쿼리하면 RLS 무한 재귀(42P17) — check_is_admin() 사용
DROP POLICY IF EXISTS "admin_can_view_all_users" ON public.users;
CREATE POLICY "admin_can_view_all_users"
ON public.users FOR SELECT
USING (
  auth.uid() = id
  OR public.check_is_admin()
);

DROP POLICY IF EXISTS "admin_can_update_users" ON public.users;
CREATE POLICY "admin_can_update_users"
ON public.users FOR UPDATE
USING (
  auth.uid() = id
  OR public.check_is_admin()
);

DROP POLICY IF EXISTS "admin_can_view_all_posts" ON public.posts;
CREATE POLICY "admin_can_view_all_posts"
ON public.posts FOR SELECT
USING (
  is_deleted = false
  OR public.check_is_admin()
);

DROP POLICY IF EXISTS "admin_can_update_posts" ON public.posts;
CREATE POLICY "admin_can_update_posts"
ON public.posts FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.check_is_admin()
);

-- 6. Redirect URLs (Supabase Dashboard → Authentication → URL Configuration)
-- https://golmokmaster.com/admin/index.html
-- https://golmokmaster.com/admin/dashboard.html
