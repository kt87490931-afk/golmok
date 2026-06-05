-- 어드민 로그인: RLS/upsert 충돌 없이 is_admin 확인
-- Supabase SQL Editor에서 실행

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

-- is_admin이 로그인 upsert로 false로 바뀌었을 수 있으므로 재설정
UPDATE public.users SET is_admin = true WHERE email = 'kt87490931@gmail.com';
