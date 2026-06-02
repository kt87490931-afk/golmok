import { supabase } from './auth.js';

/** Phase 2: 커뮤니티 CRUD — 현재는 조회 골격만 */
export async function getAllPosts({ category = 'all', page = 0, limit = 20 } = {}) {
  let query = supabase
    .from('posts')
    .select('*, users(nickname, profile_image, upjong3nm, region_dong)')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getDongPosts({ regionDong, category = 'all' }) {
  let query = supabase
    .from('posts')
    .select('*, users(nickname, profile_image, upjong3nm, region_dong)')
    .eq('region_dong', regionDong)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
