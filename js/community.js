import { supabase } from './supabase_client.js';

const POST_SELECT = `
  *,
  users (
    id, nickname, profile_image,
    upjong3nm, region_dong, region_full, region_sigungu,
    follower_count
  )
`;

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

const DEFAULT_PROFILE_REGION = {
  region_sido: '경기',
  region_sigungu: '화성시',
  region_dong: '동탄2동',
  region_full: '경기 화성시 동탄2동',
};

/** 게시글/댓글 FK — users 행이 없으면 자동 생성 */
export async function ensureUserProfile(user) {
  if (!user) return null;
  const existing = await getUserProfile(user.id);
  if (existing) return existing;

  const payload = {
    id: user.id,
    nickname: user.user_metadata?.nickname || user.user_metadata?.full_name || user.user_metadata?.name || '대장님',
    email: user.email,
    profile_image: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    ...DEFAULT_PROFILE_REGION,
  };
  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return getUserProfile(user.id);
}

async function bumpPostField(postId, field, delta) {
  const { data: row, error } = await supabase.from('posts').select(field).eq('id', postId).maybeSingle();
  if (error || !row) return;
  const next = Math.max(0, (row[field] || 0) + delta);
  await supabase.from('posts').update({ [field]: next }).eq('id', postId);
}

async function runPostCounterRpc(fn, postId) {
  const { error } = await supabase.rpc(fn, { post_id: postId });
  if (!error) return true;
  console.warn(`rpc ${fn}`, error.message);
  return false;
}

export async function getAllPosts({ category = 'all', page = 0, limit = 20 } = {}) {
  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getDongPosts({ regionDong, category = 'all', page = 0, limit = 20 }) {
  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('region_dong', regionDong)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getSigunguPosts({ regionSigungu, category = 'all', page = 0, limit = 20 }) {
  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('region_sigungu', regionSigungu)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEventPosts({ regionDong, regionSigungu, limit = 6 } = {}) {
  let query = supabase
    .from('posts')
    .select(`*, users(nickname, profile_image, upjong3nm)`)
    .eq('is_event', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (regionDong) query = query.eq('region_dong', regionDong);
  else if (regionSigungu) query = query.eq('region_sigungu', regionSigungu);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPost(postId, { bumpView = true } = {}) {
  if (bumpView) {
    const ok = await runPostCounterRpc('increment_view_count', postId);
    if (!ok) await bumpPostField(postId, 'view_count', 1);
  }

  const { data, error } = await supabase.from('posts').select(POST_SELECT).eq('id', postId).single();

  if (error) throw error;
  return data;
}

export async function createPost({
  content,
  category = 'all',
  title = null,
  images = null,
  isEvent = false,
  eventType = null,
  eventEndDate = null,
  regionOverride = null,
}) {
  const user = await getCurrentUser();
  if (!user) return { error: 'login' };

  const profile = (await ensureUserProfile(user)) || {};
  const region = { ...DEFAULT_PROFILE_REGION, ...profile, ...regionOverride };

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      content: content.trim(),
      category: category === 'all' ? 'info' : category,
      title,
      images,
      region_sido: region?.region_sido || '경기',
      region_sigungu: region?.region_sigungu || '화성시',
      region_dong: region?.region_dong || '동탄2동',
      region_full: region?.region_full || '경기 화성시 동탄2동',
      upjong1cd: region?.upjong1cd || null,
      upjong1nm: region?.upjong1nm || null,
      upjong3nm: region?.upjong3nm || null,
      is_event: isEvent || category === 'event',
      event_type: eventType,
      event_end_date: eventEndDate,
    })
    .select(POST_SELECT)
    .single();

  if (error) throw error;

  try {
    await supabase
      .from('users')
      .update({ post_count: (profile?.post_count || 0) + 1 })
      .eq('id', user.id);
  } catch (e) {
    console.warn('post_count update', e);
  }

  return { data };
}

export async function deletePost(postId) {
  const { error } = await supabase.from('posts').update({ is_deleted: true }).eq('id', postId);
  if (error) throw error;
  return true;
}

export async function toggleLike(postId) {
  const user = await getCurrentUser();
  if (!user) return { error: 'login' };

  await ensureUserProfile(user);

  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
    const ok = await runPostCounterRpc('decrement_like_count', postId);
    if (!ok) await bumpPostField(postId, 'like_count', -1);
    return { liked: false };
  }

  await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
  const ok = await runPostCounterRpc('increment_like_count', postId);
  if (!ok) await bumpPostField(postId, 'like_count', 1);
  return { liked: true };
}

export async function isLiked(postId) {
  const user = await getCurrentUser();
  if (!user) return false;

  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  return !!data;
}

export async function getLikedPostIds(postIds) {
  const user = await getCurrentUser();
  if (!user || !postIds?.length) return new Set();

  const { data } = await supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds);

  return new Set((data || []).map((r) => r.post_id));
}

export async function toggleBookmark(postId) {
  const user = await getCurrentUser();
  if (!user) return { error: 'login' };

  await ensureUserProfile(user);

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId);
    return { saved: false };
  }

  await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });
  return { saved: true };
}

export async function getBookmarkedPostIds(postIds) {
  const user = await getCurrentUser();
  if (!user || !postIds?.length) return new Set();

  const { data } = await supabase
    .from('bookmarks')
    .select('post_id')
    .eq('user_id', user.id)
    .in('post_id', postIds);

  return new Set((data || []).map((r) => r.post_id));
}

export async function getComments(postId) {
  const { data, error } = await supabase
    .from('comments')
    .select(`*, users (id, nickname, profile_image, upjong3nm, region_dong)`)
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createComment({ postId, content, parentId = null }) {
  const user = await getCurrentUser();
  if (!user) return { error: 'login' };

  await ensureUserProfile(user);

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content: content.trim(),
      parent_id: parentId,
    })
    .select(`*, users (id, nickname, profile_image, upjong3nm, region_dong)`)
    .single();

  if (error) throw error;

  const ok = await runPostCounterRpc('increment_comment_count', postId);
  if (!ok) await bumpPostField(postId, 'comment_count', 1);
  return { data };
}

export async function toggleFollow(targetUserId) {
  const user = await getCurrentUser();
  if (!user) return { error: 'login' };
  if (user.id === targetUserId) return null;

  const { data: existing } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (existing) {
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
    return { following: false };
  }

  await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
  return { following: true };
}

export async function isFollowing(targetUserId) {
  const user = await getCurrentUser();
  if (!user) return false;

  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();

  return !!data;
}
