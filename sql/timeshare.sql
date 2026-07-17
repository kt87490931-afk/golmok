-- ============================================================
-- 골목대장 타임셰어 (timeshare_listings)
-- Supabase SQL Editor에 그대로 붙여넣어 실행하세요.
-- 프로젝트: xmjyeethpuljiyixkiwd
-- ============================================================

-- 1) 테이블
CREATE TABLE IF NOT EXISTS public.timeshare_listings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Step 1. 매장 기본 정보
  store_name        TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN ('음식점', '카페', '베이커리', '기타')),
  address_dong      TEXT NOT NULL,          -- 동 단위만 공개 (지번 비공개)
  intro             TEXT NOT NULL DEFAULT '',
  photo_urls        TEXT[] NOT NULL DEFAULT '{}',

  -- Step 2. 셰어 조건 (희망 조건)
  weekdays          TEXT[] NOT NULL DEFAULT '{}',  -- {'월','화',...}
  time_start        TEXT NOT NULL DEFAULT '',
  time_end          TEXT NOT NULL DEFAULT '',
  period            TEXT NOT NULL DEFAULT '6개월',
  deposit_won       BIGINT NOT NULL DEFAULT 0,
  monthly_won       BIGINT NOT NULL DEFAULT 0,
  fee_type          TEXT NOT NULL DEFAULT 'deposit_only'
                    CHECK (fee_type IN ('deposit_only', 'deposit_monthly')),

  -- Step 3. 금기·제한
  restrictions      TEXT[] NOT NULL DEFAULT '{}',
  restrict_etc      TEXT NOT NULL DEFAULT '',

  -- Step 4. 필수 확인 (제출 시점 기록)
  confirmed_landlord BOOLEAN NOT NULL DEFAULT false,
  confirmed_platform BOOLEAN NOT NULL DEFAULT false,
  confirmed_legal    BOOLEAN NOT NULL DEFAULT false,

  -- 공개/상태
  status            TEXT NOT NULL DEFAULT 'published'
                    CHECK (status IN ('draft', 'published', 'hidden', 'closed')),
  is_sample         BOOLEAN NOT NULL DEFAULT false,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) 인덱스
CREATE INDEX IF NOT EXISTS timeshare_listings_status_idx
  ON public.timeshare_listings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS timeshare_listings_owner_idx
  ON public.timeshare_listings (owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS timeshare_listings_category_idx
  ON public.timeshare_listings (category)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS timeshare_listings_dong_idx
  ON public.timeshare_listings (address_dong)
  WHERE status = 'published';

-- 3) updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.timeshare_listings_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS timeshare_listings_updated_at ON public.timeshare_listings;
CREATE TRIGGER timeshare_listings_updated_at
  BEFORE UPDATE ON public.timeshare_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.timeshare_listings_set_updated_at();

-- 4) RLS
ALTER TABLE public.timeshare_listings ENABLE ROW LEVEL SECURITY;

-- 공개 리스트: 누구나 published 열람
DROP POLICY IF EXISTS "timeshare public read published" ON public.timeshare_listings;
CREATE POLICY "timeshare public read published"
  ON public.timeshare_listings
  FOR SELECT
  USING (status = 'published' OR auth.uid() = owner_id);

-- 본인만 등록
DROP POLICY IF EXISTS "timeshare owner insert" ON public.timeshare_listings;
CREATE POLICY "timeshare owner insert"
  ON public.timeshare_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND confirmed_landlord = true
    AND confirmed_platform = true
    AND confirmed_legal = true
  );

-- 본인만 수정
DROP POLICY IF EXISTS "timeshare owner update" ON public.timeshare_listings;
CREATE POLICY "timeshare owner update"
  ON public.timeshare_listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 본인만 삭제
DROP POLICY IF EXISTS "timeshare owner delete" ON public.timeshare_listings;
CREATE POLICY "timeshare owner delete"
  ON public.timeshare_listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- 5) 권한
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.timeshare_listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.timeshare_listings TO authenticated;

-- 6) (선택) 샘플 데이터 — 실제 유저 UUID가 있을 때만 사용
-- INSERT INTO public.timeshare_listings (
--   owner_id, store_name, category, address_dong, intro,
--   weekdays, time_start, time_end, period, deposit_won, monthly_won, fee_type,
--   confirmed_landlord, confirmed_platform, confirmed_legal, status, is_sample
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'OO카페 (인계동)', '카페', '수원시 팔달구 인계동',
--   '인계동 상권, 유동인구 많고 늦게까지 영업하는 매장이 많은 지역입니다.',
--   ARRAY['월','화','수','목','금'], '21:00', '익일 05:00', '6개월',
--   10000000, 1500000, 'deposit_monthly',
--   true, true, true, 'published', true
-- );
