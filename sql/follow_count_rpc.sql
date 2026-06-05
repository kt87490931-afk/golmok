-- 팔로워/팔로잉 카운터 RPC (팔로우 버튼 연동)
-- Supabase SQL Editor에서 실행

CREATE OR REPLACE FUNCTION public.increment_follower_count(target_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users SET follower_count = follower_count + 1 WHERE id = target_user_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_follower_count(target_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = target_user_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_following_count(current_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users SET following_count = following_count + 1 WHERE id = current_user_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_following_count(current_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users SET following_count = GREATEST(following_count - 1, 0) WHERE id = current_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_follower_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_follower_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_following_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_following_count(UUID) TO authenticated;
