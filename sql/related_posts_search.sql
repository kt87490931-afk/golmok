-- AI 검색 · 관련 커뮤니티 게시글 (전체 게시판, 관련도+인기도)
-- posts 테이블 + community_grants 적용 후 실행

CREATE OR REPLACE FUNCTION public.search_related_posts(
  p_query TEXT,
  p_region TEXT DEFAULT NULL,
  p_upjong TEXT DEFAULT NULL,
  p_limit INT DEFAULT 5,
  p_min_score NUMERIC DEFAULT 12
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  category VARCHAR,
  view_count INT,
  like_count INT,
  comment_count INT,
  region_dong VARCHAR,
  created_at TIMESTAMPTZ,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query TEXT := lower(trim(coalesce(p_query, '')));
  v_region TEXT := nullif(trim(coalesce(p_region, '')), '');
  v_upjong TEXT := nullif(trim(coalesce(p_upjong, '')), '');
  v_limit INT := LEAST(GREATEST(coalesce(p_limit, 5), 1), 5);
BEGIN
  IF length(v_query) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH kw AS (
    SELECT DISTINCT w AS token
    FROM unnest(regexp_split_to_array(v_query, '\s+')) AS w
    WHERE length(w) >= 2
    UNION
    SELECT v_query WHERE length(v_query) >= 2
  ),
  scored AS (
    SELECT
      p.id,
      p.title::text AS title,
      p.category,
      p.view_count,
      p.like_count,
      p.comment_count,
      p.region_dong,
      p.created_at,
      (
        -- 제목 키워드 (8점/키워드)
        COALESCE((
          SELECT COUNT(*)::numeric * 8
          FROM kw k
          WHERE lower(p.title) LIKE '%' || k.token || '%'
        ), 0)
        +
        -- 본문 키워드 (3점/키워드, 상한 18)
        LEAST(COALESCE((
          SELECT COUNT(*)::numeric * 3
          FROM kw k
          WHERE lower(left(coalesce(p.content, ''), 1000)) LIKE '%' || k.token || '%'
        ), 0), 18)
        +
        -- 전체 질문 구절 제목 포함 (+15)
        CASE WHEN length(v_query) >= 3 AND lower(p.title) LIKE '%' || v_query || '%' THEN 15 ELSE 0 END
        +
        -- 지역 일치
        CASE WHEN v_region IS NOT NULL AND (
          coalesce(p.region_dong, '') ILIKE '%' || v_region || '%'
          OR coalesce(p.region_full, '') ILIKE '%' || v_region || '%'
          OR v_region ILIKE '%' || coalesce(p.region_dong, '') || '%'
        ) THEN 15 ELSE 0 END
        +
        -- 업종 일치
        CASE WHEN v_upjong IS NOT NULL AND (
          coalesce(p.upjong3nm, '') ILIKE '%' || v_upjong || '%'
          OR coalesce(p.upjong2nm, '') ILIKE '%' || v_upjong || '%'
          OR coalesce(p.upjong1nm, '') ILIKE '%' || v_upjong || '%'
        ) THEN 10 ELSE 0 END
        +
        -- 인기도 (조회·좋아요, 로그 스케일)
        (ln(greatest(coalesce(p.view_count, 0), 0) + 1) * 1.2
         + ln(greatest(coalesce(p.like_count, 0), 0) + 1) * 2.0)
        +
        -- 최신성 (30일 이내 +3)
        CASE WHEN p.created_at >= (NOW() - interval '30 days') THEN 3 ELSE 0 END
      ) AS text_pop_score,
      (
        COALESCE((
          SELECT COUNT(*)::numeric * 8 FROM kw k
          WHERE lower(p.title) LIKE '%' || k.token || '%'
        ), 0)
        + LEAST(COALESCE((
          SELECT COUNT(*)::numeric * 3 FROM kw k
          WHERE lower(left(coalesce(p.content, ''), 1000)) LIKE '%' || k.token || '%'
        ), 0), 18)
        + CASE WHEN length(v_query) >= 3 AND lower(p.title) LIKE '%' || v_query || '%' THEN 15 ELSE 0 END
        + CASE WHEN v_region IS NOT NULL AND (
          coalesce(p.region_dong, '') ILIKE '%' || v_region || '%'
          OR coalesce(p.region_full, '') ILIKE '%' || v_region || '%'
        ) THEN 15 ELSE 0 END
        + CASE WHEN v_upjong IS NOT NULL AND (
          coalesce(p.upjong3nm, '') ILIKE '%' || v_upjong || '%'
          OR coalesce(p.upjong2nm, '') ILIKE '%' || v_upjong || '%'
        ) THEN 10 ELSE 0 END
      ) AS match_score
    FROM public.posts p
    WHERE p.is_deleted = false
  )
  SELECT
    s.id,
    s.title,
    s.category,
    s.view_count,
    s.like_count,
    s.comment_count,
    s.region_dong,
    s.created_at,
    round(s.text_pop_score::numeric, 2) AS relevance_score
  FROM scored s
  WHERE s.text_pop_score >= p_min_score
    AND s.match_score >= 4
  ORDER BY s.text_pop_score DESC, s.like_count DESC, s.view_count DESC, s.created_at DESC
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_related_posts(TEXT, TEXT, TEXT, INT, NUMERIC) TO anon, authenticated;
