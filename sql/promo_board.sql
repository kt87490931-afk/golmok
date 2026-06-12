-- 우리동네 무료홍보 게시판 (promos)

CREATE TABLE IF NOT EXISTS public.promos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_name VARCHAR(100) NOT NULL,
  upjong VARCHAR(50),
  upjong_code VARCHAR(10),
  address TEXT,
  region_sido VARCHAR(30),
  region_sigungu VARCHAR(30),
  region_dong VARCHAR(30),
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  phone VARCHAR(20),
  open_hours VARCHAR(100),
  intro TEXT NOT NULL,
  detail TEXT,
  images TEXT[],
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  regular_count INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  is_today BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  promo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS promos_user_date_uidx
  ON public.promos (user_id, promo_date)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS promos_date_dong_idx
  ON public.promos (promo_date DESC, region_dong, is_featured DESC, like_count DESC);

ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promo_select ON public.promos;
CREATE POLICY promo_select ON public.promos
  FOR SELECT USING (is_deleted = false AND is_approved = true);

DROP POLICY IF EXISTS promo_insert ON public.promos;
CREATE POLICY promo_insert ON public.promos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS promo_update_own ON public.promos;
CREATE POLICY promo_update_own ON public.promos
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.promo_regulars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  promo_id UUID NOT NULL REFERENCES public.promos(id) ON DELETE CASCADE,
  shop_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, promo_id)
);

ALTER TABLE public.promo_regulars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promo_regulars_all ON public.promo_regulars;
CREATE POLICY promo_regulars_all ON public.promo_regulars
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.promo_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  promo_id UUID NOT NULL REFERENCES public.promos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, promo_id)
);

ALTER TABLE public.promo_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promo_likes_all ON public.promo_likes;
CREATE POLICY promo_likes_all ON public.promo_likes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.check_daily_promo_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM public.promos
  WHERE user_id = p_user_id
    AND promo_date = CURRENT_DATE
    AND is_deleted = false;
  RETURN cnt = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_daily_promo_limit(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_promo_like(p_promo_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.promos SET like_count = like_count + 1 WHERE id = p_promo_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_promo_like(p_promo_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.promos SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_promo_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_promo_regular(p_promo_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.promos SET regular_count = regular_count + 1 WHERE id = p_promo_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_promo_regular(p_promo_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.promos SET regular_count = GREATEST(regular_count - 1, 0) WHERE id = p_promo_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_promo_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_promo_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_regular(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_promo_regular(UUID) TO authenticated;
