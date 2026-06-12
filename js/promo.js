import { supabase } from './supabase_client.js';
import { getCurrentUser, getUserProfile, ensureUserProfile } from './community.js?v=20260711';
import { uploadImages } from './upload.js';

const PROMO_SELECT = `
  *,
  users (id, nickname, profile_image, region_dong, region_sigungu, region_full)
`;

export function todayDateStr() {
  return new Date().toISOString().split('T')[0];
}

export async function hasTodayPromo(userId) {
  if (!userId) return false;
  const { data } = await supabase
    .from('promos')
    .select('id')
    .eq('user_id', userId)
    .eq('promo_date', todayDateStr())
    .eq('is_deleted', false)
    .maybeSingle();
  return !!data;
}

export async function getPromos({ range = 'dong', regionDong = null, page = 0, limit = 20 } = {}) {
  let query = supabase
    .from('promos')
    .select(PROMO_SELECT)
    .eq('is_deleted', false)
    .eq('is_approved', true)
    .eq('promo_date', todayDateStr())
    .order('is_featured', { ascending: false })
    .order('like_count', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (range === 'dong' && regionDong) {
    query = query.eq('region_dong', regionDong);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPromoLikedIds(promoIds) {
  const user = await getCurrentUser();
  if (!user || !promoIds?.length) return new Set();

  const { data } = await supabase
    .from('promo_likes')
    .select('promo_id')
    .eq('user_id', user.id)
    .in('promo_id', promoIds);

  return new Set((data || []).map((r) => r.promo_id));
}

export async function getPromoRegularIds(promoIds) {
  const user = await getCurrentUser();
  if (!user || !promoIds?.length) return new Set();

  const { data } = await supabase
    .from('promo_regulars')
    .select('promo_id')
    .eq('user_id', user.id)
    .in('promo_id', promoIds);

  return new Set((data || []).map((r) => r.promo_id));
}

export async function togglePromoLike(promoId) {
  const user = await getCurrentUser();
  if (!user) return { error: 'login' };

  await ensureUserProfile(user);

  const { data: existing } = await supabase
    .from('promo_likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('promo_id', promoId)
    .maybeSingle();

  if (existing) {
    await supabase.from('promo_likes').delete().eq('user_id', user.id).eq('promo_id', promoId);
    await supabase.rpc('decrement_promo_like', { p_promo_id: promoId });
    return { liked: false };
  }

  await supabase.from('promo_likes').insert({ user_id: user.id, promo_id: promoId });
  await supabase.rpc('increment_promo_like', { p_promo_id: promoId });
  return { liked: true };
}

export async function togglePromoRegular(promoId, shopUserId) {
  const user = await getCurrentUser();
  if (!user) return { error: 'login' };

  await ensureUserProfile(user);

  const { data: existing } = await supabase
    .from('promo_regulars')
    .select('id')
    .eq('user_id', user.id)
    .eq('promo_id', promoId)
    .maybeSingle();

  if (existing) {
    await supabase.from('promo_regulars').delete().eq('user_id', user.id).eq('promo_id', promoId);
    await supabase.rpc('decrement_promo_regular', { p_promo_id: promoId });
    return { regular: false };
  }

  await supabase.from('promo_regulars').insert({
    user_id: user.id,
    promo_id: promoId,
    shop_user_id: shopUserId || null,
  });
  await supabase.rpc('increment_promo_regular', { p_promo_id: promoId });
  return { regular: true };
}

function parseRegionFromAddress(address, profile) {
  if (profile?.region_dong) {
    return {
      region_sido: profile.region_sido || null,
      region_sigungu: profile.region_sigungu || null,
      region_dong: profile.region_dong || null,
    };
  }
  if (!address) return { region_sido: null, region_sigungu: null, region_dong: null };
  const parts = address.trim().split(/\s+/);
  return {
    region_sido: parts[0] || null,
    region_sigungu: parts[1] || null,
    region_dong: parts.slice(2).join(' ') || null,
  };
}

export async function createPromo({
  shopName,
  upjong,
  upjongCode,
  address,
  intro,
  detail,
  openHours,
  phone,
  images = [],
  lat = null,
  lng = null,
}) {
  const user = await getCurrentUser();
  if (!user) return { error: 'login' };

  const profile = await ensureUserProfile(user);

  const { data: canPost, error: limitErr } = await supabase.rpc('check_daily_promo_limit', {
    p_user_id: user.id,
  });
  if (limitErr) throw limitErr;
  if (!canPost) return { error: 'daily_limit' };

  const region = parseRegionFromAddress(address, profile);
  const finalAddress = address || profile?.region_full || null;

  let imageUrls = [];
  if (images.length > 0) {
    imageUrls = await uploadImages(images.slice(0, 3), user.id);
  }

  const { data, error } = await supabase
    .from('promos')
    .insert({
      user_id: user.id,
      shop_name: shopName.trim(),
      upjong: upjong || null,
      upjong_code: upjongCode || null,
      address: finalAddress,
      region_sido: region.region_sido,
      region_sigungu: region.region_sigungu,
      region_dong: region.region_dong || profile?.region_dong || null,
      lat,
      lng,
      phone: phone || null,
      open_hours: openHours || null,
      intro: intro.trim(),
      detail: detail?.trim() || null,
      images: imageUrls.length ? imageUrls : null,
      promo_date: todayDateStr(),
    })
    .select(PROMO_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'daily_limit' };
    throw error;
  }

  return { data };
}

export async function resolveUserRegionForPromo() {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await getUserProfile(user.id);
  return profile;
}
