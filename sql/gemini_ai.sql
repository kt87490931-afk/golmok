-- Gemini AI 설정 + 호출 로그 (골목대장 AI 검색)
-- app_settings(sojanggong_app_settings.sql) 생성 후 실행

INSERT INTO public.app_settings (key, value, description, is_secret)
VALUES
  ('GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY', 'Google Gemini API 키', true),
  ('GEMINI_ENABLED', 'false', 'AI 기능 ON/OFF', false),
  ('GEMINI_DAILY_LIMIT', '10', '사용자·세션당 일일 최대 호출 횟수', false),
  ('GEMINI_MAX_TOKENS', '300', '최대 출력 토큰 수', false),
  ('GEMINI_MODEL', 'gemini-2.0-flash', 'Gemini 모델명', false)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,
  question TEXT NOT NULL,
  answer TEXT,
  intent VARCHAR(50),
  api_called VARCHAR(100),
  blocked BOOLEAN DEFAULT false,
  token_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user_day
  ON public.ai_logs (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_logs_session_day
  ON public.ai_logs (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_ai_logs" ON public.ai_logs;
CREATE POLICY "users_view_own_ai_logs"
ON public.ai_logs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_view_all_ai_logs" ON public.ai_logs;
CREATE POLICY "admin_view_all_ai_logs"
ON public.ai_logs FOR SELECT
USING (public.check_is_admin());

-- 공개: AI ON/OFF·한도만 (키 미포함)
CREATE OR REPLACE FUNCTION public.get_ai_public_config()
RETURNS TABLE(key TEXT, value TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.key, s.value
  FROM public.app_settings s
  WHERE s.key IN (
    'GEMINI_ENABLED',
    'GEMINI_DAILY_LIMIT',
    'GEMINI_MAX_TOKENS'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_public_config() TO anon, authenticated;

-- Edge Function 전용: 일일 한도 확인
CREATE OR REPLACE FUNCTION public.check_ai_daily_limit(
  p_user_id UUID,
  p_session_id TEXT,
  p_limit INT DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_count INT;
  v_start TIMESTAMPTZ := date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul');
BEGIN
  IF p_limit IS NULL OR p_limit < 1 THEN
    RETURN true;
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO v_count
    FROM public.ai_logs
    WHERE user_id = p_user_id
      AND blocked = false
      AND created_at >= v_start;
  ELSIF p_session_id IS NOT NULL AND p_session_id <> '' THEN
    SELECT COUNT(*)::INT INTO v_count
    FROM public.ai_logs
    WHERE session_id = p_session_id
      AND blocked = false
      AND created_at >= v_start;
  ELSE
    RETURN false;
  END IF;

  RETURN COALESCE(v_count, 0) < p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_daily_limit(UUID, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_daily_limit(UUID, TEXT, INT) TO service_role;

-- Edge Function 전용: AI·소진공 설정 (비밀키 포함, service_role만)
CREATE OR REPLACE FUNCTION public.get_ai_server_config()
RETURNS TABLE(key TEXT, value TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.key::text, s.value
  FROM public.app_settings s
  WHERE s.key IN (
    'GEMINI_API_KEY',
    'GEMINI_ENABLED',
    'GEMINI_DAILY_LIMIT',
    'GEMINI_MAX_TOKENS',
    'GEMINI_MODEL',
    'SOJANGGONG_API_ENABLED',
    'SOJANGGONG_API_MODE',
    'SOJANGGONG_WEATHER_KEY',
    'SOJANGGONG_HPREPORT_KEY',
    'SOJANGGONG_STORSTTUS_KEY'
  );
$$;

REVOKE ALL ON FUNCTION public.get_ai_server_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ai_server_config() TO service_role;
