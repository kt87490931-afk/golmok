import { supabase } from './supabase_client.js';

export async function getMyPosts(userId, page = 0, limit = 20) {
  const { data, error } = await supabase
    .from('posts')
    .select(`*, users(nickname, profile_image, region_dong)`)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return data || [];
}

export async function getBookmarkedPosts(userId, page = 0, limit = 20) {
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`post_id, created_at, posts (*, users(nickname, profile_image, region_dong))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return (data || []).map((b) => b.posts).filter(Boolean);
}

export async function getMyProfile(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return !error;
}
