-- 인기 검색 상권 테이블 (어드민 관리용)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS public.popular_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  badge VARCHAR(20),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.popular_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "popular_areas_select" ON public.popular_areas;
CREATE POLICY "popular_areas_select"
ON public.popular_areas FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "popular_areas_admin_all" ON public.popular_areas;
CREATE POLICY "popular_areas_admin_all"
ON public.popular_areas FOR ALL
USING (public.check_is_admin());

GRANT SELECT ON TABLE public.popular_areas TO anon, authenticated;

INSERT INTO public.popular_areas (name, badge, sort_order)
SELECT v.name, v.badge, v.sort_order
FROM (VALUES
  ('동탄 센트럴파크', '급상승', 1),
  ('수원 행궁동', '인기', 2),
  ('화성 봉담읍', '신규', 3),
  ('수원 인계동', NULL, 4),
  ('오산 세마동', NULL, 5)
) AS v(name, badge, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.popular_areas LIMIT 1);
