-- 골목대장 커뮤니티: 테이블 권한(GRANT) + 카운터 RPC
-- Supabase SQL Editor에서 한 번 실행하세요.
-- 증상: 피드 "게시글을 불러오지 못했습니다" / REST 42501 permission denied

-- 스키마 사용 권한
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- posts (비로그인도 피드 조회)
GRANT SELECT ON TABLE public.posts TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.posts TO authenticated;

-- users (게시글 작성자 조인)
GRANT SELECT ON TABLE public.users TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.users TO authenticated;

-- comments
GRANT SELECT ON TABLE public.comments TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.comments TO authenticated;

-- likes
GRANT SELECT ON TABLE public.likes TO authenticated;
GRANT INSERT, DELETE ON TABLE public.likes TO authenticated;

-- bookmarks
GRANT SELECT ON TABLE public.bookmarks TO authenticated;
GRANT INSERT, DELETE ON TABLE public.bookmarks TO authenticated;

-- follows
GRANT SELECT ON TABLE public.follows TO authenticated;
GRANT INSERT, DELETE ON TABLE public.follows TO authenticated;

-- RPC: 조회수 / 공감 / 댓글 카운터
CREATE OR REPLACE FUNCTION public.increment_view_count(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts SET view_count = view_count + 1 WHERE id = post_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_like_count(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts SET like_count = like_count + 1 WHERE id = post_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_like_count(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = post_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_comment_count(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = post_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_comment_count(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = post_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_like_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_like_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_comment_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_comment_count(UUID) TO authenticated;
