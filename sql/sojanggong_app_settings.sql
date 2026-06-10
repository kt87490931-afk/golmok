-- 소상공인365(소진공) OpenAPI 설정 테이블
-- ⚠️ API 키는 Git에 커밋하지 마세요.
--
-- [소상공인365 화면명]  →  [DB key 컬럼값]  →  [API 경로]
-- ① 창업기상도         →  SOJANGGONG_WEATHER_KEY    →  /openApi/weather
-- ② 테마상권 분석      →  SOJANGGONG_HPREPORT_KEY   →  /openApi/hpReport
-- ③ 상권지도           →  SOJANGGONG_STARTUP_KEY    →  /openApi/startupPublic
-- ④ 업소현황           →  SOJANGGONG_STORSTTUS_KEY  →  /openApi/storSttus
-- ⑤ 간단분석           →  SOJANGGONG_SIMPLE_KEY     →  /openApi/simple
-- ⑥ SNS 분석           →  SOJANGGONG_SNS_KEY        →  /openApi/snsAnaly
-- ⑦ 배달분석           →  SOJANGGONG_DELIVERY_KEY   →  /openApi/delivery
-- ⑧ 상세분석           →  SOJANGGONG_DETAIL_KEY     →  /openApi/detail
-- ⑨ 관광 축제 정보     →  SOJANGGONG_TOUR_KEY       →  /openApi/tour
-- ⑩ 업력현황           →  SOJANGGONG_STCARSTTUS_KEY  →  /openApi/stcarSttus
-- ⑪ 점포당 매출 추이   →  SOJANGGONG_SLSIDEX_KEY    →  /openApi/slsIdex
--
-- 실행 순서:
--   1) 이 파일 전체 실행 (테이블 생성)
--   2) sql/sojanggong_keys_update.sql 에서 YOUR_* 자리에 인증키 붙여넣고 실행

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only_settings" ON public.app_settings;
CREATE POLICY "admin_only_settings"
ON public.app_settings FOR ALL
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

-- 어드민 API 관리 화면용 (RLS 우회, check_is_admin 검증)
CREATE OR REPLACE FUNCTION public.get_admin_app_settings()
RETURNS TABLE(
  id uuid,
  key text,
  value text,
  description text,
  is_secret boolean,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.id, s.key::text, s.value, s.description, s.is_secret, s.updated_at
  FROM public.app_settings s
  WHERE public.check_is_admin()
  ORDER BY s.key;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_app_settings() TO authenticated;

-- 비로그인 포함: 소상공인365 iframe용 키만 RPC로 조회 (테이블 직접 SELECT 불가)
CREATE OR REPLACE FUNCTION public.get_sojanggong_settings()
RETURNS TABLE(key TEXT, value TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.key, s.value
  FROM public.app_settings s
  WHERE s.key LIKE 'SOJANGGONG_%';
$$;

GRANT EXECUTE ON FUNCTION public.get_sojanggong_settings() TO anon, authenticated;

-- 초기 행 (키 값은 Supabase 대시보드에서 REPLACE_* 를 실제 발급 키로 교체 후 실행)
INSERT INTO public.app_settings (key, value, description, is_secret)
VALUES
  ('SOJANGGONG_WEATHER_KEY', 'YOUR_WEATHER_KEY', '① 창업기상도 (weather) 인증키', true),
  ('SOJANGGONG_HPREPORT_KEY', 'YOUR_HPREPORT_KEY', '② 테마상권 분석 (hpReport) 인증키', true),
  ('SOJANGGONG_STARTUP_KEY', 'YOUR_STARTUP_KEY', '③ 상권지도 (startupPublic) 인증키', true),
  ('SOJANGGONG_STORSTTUS_KEY', 'YOUR_STORSTTUS_KEY', '④ 업소현황 (storSttus) 인증키', true),
  ('SOJANGGONG_SIMPLE_KEY', 'YOUR_SIMPLE_KEY', '⑤ 간단분석 (simple) 인증키', true),
  ('SOJANGGONG_SNS_KEY', 'YOUR_SNS_KEY', '⑥ SNS 분석 (snsAnaly) 인증키', true),
  ('SOJANGGONG_DELIVERY_KEY', 'YOUR_DELIVERY_KEY', '⑦ 배달분석 (delivery) 인증키', true),
  ('SOJANGGONG_DETAIL_KEY', 'YOUR_DETAIL_KEY', '⑧ 상세분석 (detail) 인증키', true),
  ('SOJANGGONG_TOUR_KEY', 'YOUR_TOUR_KEY', '⑨ 관광 축제 정보 (tour) 인증키', true),
  ('SOJANGGONG_STCARSTTUS_KEY', 'YOUR_STCARSTTUS_KEY', '⑩ 업력현황 (stcarSttus) 인증키', true),
  ('SOJANGGONG_SLSIDEX_KEY', 'YOUR_SLSIDEX_KEY', '⑪ 점포당 매출액 추이 (slsIdex) 인증키', true),
  ('SOJANGGONG_API_ENABLED', 'true', 'API 전체 ON/OFF (true/false)', false),
  ('SOJANGGONG_API_MODE', 'mock', '데이터 모드: mock 또는 real', false)
ON CONFLICT (key) DO NOTHING;
