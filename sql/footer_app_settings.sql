-- 골목대장 푸터 / 사업자정보 / 약관 링크 설정
-- app_settings 테이블(sojanggong_app_settings.sql) 생성 후 실행

CREATE OR REPLACE FUNCTION public.get_footer_settings()
RETURNS TABLE(key TEXT, value TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.key, s.value
  FROM public.app_settings s
  WHERE s.key LIKE 'FOOTER_%';
$$;

GRANT EXECUTE ON FUNCTION public.get_footer_settings() TO anon, authenticated;

INSERT INTO public.app_settings (key, value, description, is_secret)
VALUES
  ('FOOTER_COMPANY_NAME', '(주) 골목대장', '푸터 — 상호', false),
  ('FOOTER_CEO', '대표 ○○○', '푸터 — 대표자명', false),
  ('FOOTER_BIZ_NO', '000-00-00000', '푸터 — 사업자등록번호', false),
  ('FOOTER_MAIL_ORDER_NO', '', '푸터 — 통신판매업 신고번호', false),
  ('FOOTER_HOSTING', '호스팅 사업자 Amazon Web Service (AWS)', '푸터 — 호스팅', false),
  ('FOOTER_ADDRESS', '주소 (어드민에서 수정)', '푸터 — 주소', false),
  ('FOOTER_PHONE', '', '푸터 — 전화', false),
  ('FOOTER_EMAIL', '', '푸터 — 고객문의 이메일', false),
  ('FOOTER_SNS_FACEBOOK', '', '푸터 — Facebook URL', false),
  ('FOOTER_SNS_INSTAGRAM', '', '푸터 — Instagram URL', false),
  ('FOOTER_SNS_YOUTUBE', '', '푸터 — YouTube URL', false),
  ('FOOTER_LEGAL_LINKS', '[{"label":"이용약관","href":"terms.html","bold":false},{"label":"개인정보처리방침","href":"privacy.html","bold":true}]', '푸터 — 약관 링크 JSON', false)
ON CONFLICT (key) DO NOTHING;
