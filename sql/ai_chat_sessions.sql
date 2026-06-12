-- ai_chat_sessions: 골목대장 AI 채팅 히스토리 (Supabase SQL Editor)
-- 프로젝트: xmjyeethpuljiyixkiwd

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id          TEXT PRIMARY KEY DEFAULT ('sess_' || extract(epoch from now())::bigint::text),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '새 채팅',
  messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_id_idx
  ON public.ai_chat_sessions (user_id, updated_at DESC);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can manage own sessions" ON public.ai_chat_sessions;
CREATE POLICY "users can manage own sessions"
  ON public.ai_chat_sessions
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.ai_chat_sessions_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_chat_sessions_updated_at ON public.ai_chat_sessions;
CREATE TRIGGER ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.ai_chat_sessions_set_updated_at();
