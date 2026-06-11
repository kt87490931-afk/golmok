-- 기업마당(지원사업정보) API 설정 + Edge Function 조회 확장

INSERT INTO public.app_settings (key, value, description, is_secret)
VALUES
  ('BIZINFO_API_ENABLED', 'true', '기업마당 지원사업 API ON/OFF (true/false)', false),
  ('BIZINFO_API_KEY', 'YOUR_BIZINFO_KEY', '기업마당 지원사업정보 API crtfcKey', true)
ON CONFLICT (key) DO NOTHING;

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
    'SOJANGGONG_STORSTTUS_KEY',
    'SOJANGGONG_DELIVERY_KEY',
    'BIZINFO_API_ENABLED',
    'BIZINFO_API_KEY'
  );
$$;

REVOKE ALL ON FUNCTION public.get_ai_server_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ai_server_config() TO service_role;

-- 공개: 정책 API 사용 여부만 (키는 비공개)
CREATE OR REPLACE FUNCTION public.get_ai_public_config()
RETURNS TABLE(key TEXT, value TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.key::text, s.value
  FROM public.app_settings s
  WHERE s.key IN (
    'GEMINI_ENABLED',
    'GEMINI_DAILY_LIMIT',
    'GEMINI_MAX_TOKENS',
    'BIZINFO_API_ENABLED'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_public_config() TO anon, authenticated;
