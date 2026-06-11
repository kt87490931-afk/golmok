-- 약관/정책 본문 — app_settings + 공개 조회 RPC

CREATE OR REPLACE FUNCTION public.get_legal_page(p_slug text)
RETURNS TABLE(title text, updated_label text, body_html text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    COALESCE((s.value::jsonb ->> 'title'), ''),
    COALESCE((s.value::jsonb ->> 'updated'), ''),
    COALESCE((s.value::jsonb ->> 'body'), '')
  FROM public.app_settings s
  WHERE s.key = CASE p_slug
    WHEN 'terms' THEN 'LEGAL_CONTENT_TERMS'
    WHEN 'privacy' THEN 'LEGAL_CONTENT_PRIVACY'
    WHEN 'operation' THEN 'LEGAL_CONTENT_OPERATION'
    WHEN 'user' THEN 'LEGAL_CONTENT_USER'
    WHEN 'youth' THEN 'LEGAL_CONTENT_YOUTH'
    ELSE NULL
  END
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_legal_page(text) TO anon, authenticated;
