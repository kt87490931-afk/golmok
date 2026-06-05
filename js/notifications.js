import { supabase } from './supabase_client.js';
import { getCurrentUser } from './community.js';

export async function createNotification({ userId, type, title, body, postId = null }) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      body,
      link_post_id: postId,
    })
    .select('id')
    .single();
  if (error) {
    console.warn('createNotification', error.message);
    return null;
  }
  return data;
}

export async function getMyNotifications(limit = 30) {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
}

export async function notifyComment({ postOwnerId, commenterName, postId }) {
  if (!postOwnerId) return;
  const me = await getCurrentUser();
  if (me && me.id === postOwnerId) return;

  await createNotification({
    userId: postOwnerId,
    type: 'comment',
    title: '새 댓글',
    body: `${commenterName}님이 댓글을 남겼습니다.`,
    postId,
  });
}

export async function notifyLike({ postOwnerId, likerName, postId }) {
  if (!postOwnerId) return;
  const me = await getCurrentUser();
  if (me && me.id === postOwnerId) return;

  await createNotification({
    userId: postOwnerId,
    type: 'like',
    title: '새 공감',
    body: `${likerName}님이 게시글에 공감했습니다.`,
    postId,
  });
}
