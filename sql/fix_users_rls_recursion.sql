-- users RLS 무한 재귀 수정 (에러: infinite recursion detected in policy for relation "users")
-- Supabase SQL Editor에서 실행 (어드민 admin_setup.sql 실행 후 게시글/피드 오류 시)
-- 원인: admin 정책이 users 테이블을 다시 SELECT → RLS 재진입 → 42P17

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;

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

DROP POLICY IF EXISTS "admin_can_view_reports" ON public.reports;
CREATE POLICY "admin_can_view_reports"
ON public.reports FOR SELECT
USING (public.check_is_admin());

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
