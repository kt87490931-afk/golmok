-- ============================================================
-- STEP 2: API 키 입력 (STEP 1 sojanggong_app_settings.sql 실행 후)
-- ============================================================
-- 아래 YOUR_* 를 소상공인365 마이페이지 > 오픈API 신청현황 의
-- "인증키" 전체 문자열로 바꾼 뒤 실행하세요.
-- (창업기상도_키 같은 한글 이름은 사용하지 않습니다!)
-- ============================================================

UPDATE public.app_settings
SET value = 'YOUR_WEATHER_KEY', updated_at = NOW()
WHERE key = 'SOJANGGONG_WEATHER_KEY';   -- ① 창업기상도

UPDATE public.app_settings
SET value = 'YOUR_HPREPORT_KEY', updated_at = NOW()
WHERE key = 'SOJANGGONG_HPREPORT_KEY';  -- ② 테마상권 분석

UPDATE public.app_settings
SET value = 'YOUR_STARTUP_KEY', updated_at = NOW()
WHERE key = 'SOJANGGONG_STARTUP_KEY';   -- ③ 상권지도

UPDATE public.app_settings
SET value = 'YOUR_STORSTTUS_KEY', updated_at = NOW()
WHERE key = 'SOJANGGONG_STORSTTUS_KEY'; -- ④ 업소현황

-- 입력 확인 (마지막 6자만 표시)
SELECT
  key,
  description,
  CASE WHEN is_secret THEN '****' || RIGHT(value, 6) ELSE value END AS value_masked,
  updated_at
FROM public.app_settings
WHERE key LIKE 'SOJANGGONG_%'
ORDER BY key;
