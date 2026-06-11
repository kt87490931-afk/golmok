-- 어드민 app_settings 저장 RPC (테이블 직접 UPDATE 권한 없이 사용)
-- footer-manager, api-manager 저장 오류(permission denied) 해결

CREATE OR REPLACE FUNCTION public.upsert_admin_app_setting(
  p_key text,
  p_value text,
  p_description text DEFAULT NULL,
  p_is_secret boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.check_is_admin() THEN
    RAISE EXCEPTION 'permission denied: admin only';
  END IF;

  INSERT INTO public.app_settings (key, value, description, is_secret, updated_at)
  VALUES (p_key, p_value, COALESCE(p_description, p_key), p_is_secret, NOW())
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, app_settings.description),
    is_secret = EXCLUDED.is_secret,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_admin_app_setting(text, text, text, boolean) TO authenticated;
