-- 골목지수 + 멘토링 게시판(board) 컬럼
-- Supabase SQL Editor 또는 apply_migration으로 실행

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS golmok_score INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS board TEXT NOT NULL DEFAULT 'community';
UPDATE public.posts SET board = 'community' WHERE board IS NULL OR board = '';

CREATE INDEX IF NOT EXISTS posts_board_created_idx ON public.posts (board, created_at DESC);

-- 골목지수 적립 로그
CREATE TABLE IF NOT EXISTS public.golmok_score_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  delta INTEGER NOT NULL,
  target_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS golmok_score_logs_user_created_idx
  ON public.golmok_score_logs (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS golmok_score_logs_user_action_target_uidx
  ON public.golmok_score_logs (user_id, action, target_id)
  WHERE target_id IS NOT NULL;

ALTER TABLE public.golmok_score_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS golmok_score_logs_select_own ON public.golmok_score_logs;
CREATE POLICY golmok_score_logs_select_own
  ON public.golmok_score_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 골목지수 적립 RPC (users.golmok_score 갱신)
CREATE OR REPLACE FUNCTION public.add_golmok_score(
  p_action TEXT,
  p_target_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_delta INTEGER;
  v_new_score INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  v_delta := CASE p_action
    WHEN 'post_write' THEN 2
    WHEN 'comment_write' THEN 1
    WHEN 'post_delete' THEN -2
    WHEN 'comment_delete' THEN -1
    ELSE 0
  END;

  IF v_delta = 0 THEN
    RETURN jsonb_build_object('error', 'invalid_action');
  END IF;

  IF p_target_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.golmok_score_logs
    WHERE user_id = v_user_id
      AND action = p_action
      AND target_id = p_target_id
  ) THEN
    SELECT golmok_score INTO v_new_score FROM public.users WHERE id = v_user_id;
    RETURN jsonb_build_object('delta', 0, 'golmok_score', COALESCE(v_new_score, 0));
  END IF;

  INSERT INTO public.golmok_score_logs (user_id, action, delta, target_id)
  VALUES (v_user_id, p_action, v_delta, p_target_id);

  UPDATE public.users
  SET golmok_score = GREATEST(0, golmok_score + v_delta)
  WHERE id = v_user_id
  RETURNING golmok_score INTO v_new_score;

  RETURN jsonb_build_object('delta', v_delta, 'golmok_score', v_new_score);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_golmok_score(TEXT, UUID) TO authenticated;
