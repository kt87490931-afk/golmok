import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../js/supabase_config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** OAuth 직후 세션 준비 대기 (대시보드 등에서만 사용) */
export async function waitForSession(timeoutMs = 5000) {
  const {
    data: { session: initial },
  } = await supabase.auth.getSession();
  if (initial?.user) return initial;

  return new Promise((resolve) => {
    let settled = false;
    let subscription = null;

    const finish = (session) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.unsubscribe();
      resolve(session);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) finish(session);
    });
    subscription = data.subscription;
  });
}

export async function checkIsAdmin() {
  const { data, error } = await supabase.rpc('check_is_admin');
  if (error) {
    console.warn('check_is_admin', error.message);
    return false;
  }
  return data === true;
}

export async function requireAdmin() {
  const session = await waitForSession();
  if (!session?.user) {
    window.location.replace('index.html');
    return null;
  }

  if (!(await checkIsAdmin())) {
    await supabase.auth.signOut();
    window.location.replace('index.html');
    return null;
  }

  const { data: user } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();
  return (
    user || {
      id: session.user.id,
      email: session.user.email,
      nickname: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '관리자',
    }
  );
}

export async function signInWithGoogleAdmin() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/admin/index.html` },
  });
  if (error) throw error;
  if (data?.url) window.location.assign(data.url);
}

export async function adminLogout() {
  await supabase.auth.signOut();
  window.location.replace('index.html');
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num) {
  return (num || 0).toLocaleString('ko-KR');
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function showAdminToast(msg, type = 'success') {
  const colors = { success: '#1D9E75', error: '#E24B4A', info: '#378ADD' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;
    background:${colors[type] || colors.success};color:#fff;
    padding:10px 18px;border-radius:8px;
    font-size:13px;font-weight:500;
    z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2);
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
