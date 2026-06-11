-- 행정동·상권 지역 코드 (AI 검색 · 소진공 API regionCode 매핑)
-- gemini_ai.sql 적용 후 실행

CREATE TABLE IF NOT EXISTS public.region_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code VARCHAR(20) NOT NULL,
  aliases TEXT,
  sido TEXT,
  sigungu TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT region_codes_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_region_codes_enabled ON public.region_codes (enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_region_codes_code ON public.region_codes (code);

ALTER TABLE public.region_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_region_codes" ON public.region_codes;
CREATE POLICY "admin_all_region_codes"
ON public.region_codes FOR ALL
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

-- Edge Function · 공개 조회 (이름·코드·별칭만)
CREATE OR REPLACE FUNCTION public.get_region_code_lookup()
RETURNS TABLE(name TEXT, code TEXT, aliases TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT r.name, r.code, r.aliases
  FROM public.region_codes r
  WHERE r.enabled = true
  ORDER BY length(r.name) DESC, r.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_region_code_lookup() TO anon, authenticated, service_role;

-- 어드민: 목록
CREATE OR REPLACE FUNCTION public.get_admin_region_codes()
RETURNS TABLE(
  id UUID,
  name TEXT,
  code TEXT,
  aliases TEXT,
  sido TEXT,
  sigungu TEXT,
  enabled BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT r.id, r.name, r.code, r.aliases, r.sido, r.sigungu, r.enabled, r.updated_at
  FROM public.region_codes r
  WHERE public.check_is_admin()
  ORDER BY r.sido NULLS LAST, r.sigungu NULLS LAST, r.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_region_codes() TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_admin_region_code(
  p_id UUID,
  p_name TEXT,
  p_code TEXT,
  p_aliases TEXT DEFAULT NULL,
  p_sido TEXT DEFAULT NULL,
  p_sigungu TEXT DEFAULT NULL,
  p_enabled BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.check_is_admin() THEN
    RAISE EXCEPTION 'permission denied: admin only';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.region_codes (name, code, aliases, sido, sigungu, enabled, updated_at)
    VALUES (trim(p_name), trim(p_code), nullif(trim(p_aliases), ''), nullif(trim(p_sido), ''), nullif(trim(p_sigungu), ''), COALESCE(p_enabled, true), NOW())
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.region_codes SET
      name = trim(p_name),
      code = trim(p_code),
      aliases = nullif(trim(p_aliases), ''),
      sido = nullif(trim(p_sido), ''),
      sigungu = nullif(trim(p_sigungu), ''),
      enabled = COALESCE(p_enabled, true),
      updated_at = NOW()
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_admin_region_code(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- AI 어드민 통계
CREATE OR REPLACE FUNCTION public.get_ai_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul');
  v_result JSON;
BEGIN
  IF NOT public.check_is_admin() THEN
    RAISE EXCEPTION 'permission denied: admin only';
  END IF;

  SELECT json_build_object(
    'today_total', (SELECT count(*)::int FROM public.ai_logs WHERE created_at >= v_today_start),
    'today_ok', (SELECT count(*)::int FROM public.ai_logs WHERE created_at >= v_today_start AND blocked = false),
    'today_blocked', (SELECT count(*)::int FROM public.ai_logs WHERE created_at >= v_today_start AND blocked = true),
    'all_total', (SELECT count(*)::int FROM public.ai_logs),
    'region_count', (SELECT count(*)::int FROM public.region_codes WHERE enabled = true)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_ai_logs(p_limit INT DEFAULT 20)
RETURNS TABLE(
  id UUID,
  question TEXT,
  answer TEXT,
  intent VARCHAR,
  api_called VARCHAR,
  blocked BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT l.id, l.question, l.answer, l.intent, l.api_called, l.blocked, l.created_at
  FROM public.ai_logs l
  WHERE public.check_is_admin()
  ORDER BY l.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_ai_logs(INT) TO authenticated;

-- 초기 시드 (ON CONFLICT 무시)
INSERT INTO public.region_codes (name, code, aliases, sido, sigungu) VALUES
  ('동탄2동', '4159025300', '동탄2,화성 동탄2동', '경기', '화성시'),
  ('동탄1동', '4159025100', '동탄1', '경기', '화성시'),
  ('동탄3동', '4159025600', '동탄3', '경기', '화성시'),
  ('봉담읍', '4159025800', '봉담,화성 봉담', '경기', '화성시'),
  ('화성시', '4159000', '화성', '경기', '화성시'),
  ('인계동', '4111179', '수원 인계동,인계', '경기', '수원시'),
  ('영통동', '4111754', '영통,수원 영통', '경기', '수원시'),
  ('광교동', '4111762', '광교', '경기', '수원시'),
  ('수원시', '4111000', '수원', '경기', '수원시'),
  ('오산시', '4137000', '오산', '경기', '오산시'),
  ('성남시', '4113000', '성남', '경기', '성남시'),
  ('분당동', '4113510', '분당', '경기', '성남시'),
  ('정자동', '4113512', '정자', '경기', '성남시'),
  ('판교동', '4113515', '판교', '경기', '성남시'),
  ('용인시', '4146000', '용인', '경기', '용인시'),
  ('기흥구', '4146300', '기흥', '경기', '용인시'),
  ('수지구', '4146500', '수지', '경기', '수지'),
  ('부천시', '4119000', '부천', '경기', '부천시'),
  ('안양시', '4117000', '안양', '경기', '안양시'),
  ('평택시', '4122000', '평택', '경기', '평택시'),
  ('고양시', '4128000', '고양', '경기', '고양시'),
  ('일산동구', '4128100', '일산', '경기', '고양시'),
  ('소공동', '1114052', '서울 중구 소공,중구 소공', '서울', '중구'),
  ('명동', '1114065', '서울 명동', '서울', '중구'),
  ('중구', '1114000', '서울 중구', '서울', '중구'),
  ('종로구', '1111000', '종로', '서울', '종로구'),
  ('강남구', '1168000', '강남', '서울', '강남구'),
  ('역삼동', '1168053', '역삼', '서울', '강남구'),
  ('서초구', '1165000', '서초', '서울', '서초구'),
  ('송파구', '1171000', '송파', '서울', '송파구'),
  ('마포구', '1144000', '마포', '서울', '마포구'),
  ('서울특별시', '1100000', '서울', '서울', NULL)
ON CONFLICT (name) DO NOTHING;
