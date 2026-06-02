import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, getAuthRedirectUrl } from './supabase_config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function toast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
}

function initialFromName(name) {
  if (!name || typeof name !== 'string') return '대';
  const t = name.trim();
  return t ? t.charAt(0) : '대';
}

async function createUserIfNotExists(user) {
  const { data: existing, error: selErr } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return;

  const { error: insErr } = await supabase.from('users').insert({
    id: user.id,
    nickname: user.user_metadata?.full_name || user.user_metadata?.name || '대장님',
    email: user.email,
    profile_image: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  });
  if (insErr) throw insErr;
}

async function fetchUserProfile(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setAvatar(id, name, imageUrl) {
  const el = document.getElementById(id);
  if (!el) return;
  if (imageUrl) {
    el.innerHTML = `<img src="${imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    return;
  }
  el.textContent = initialFromName(name);
}

export function updateAuthUI(profile, session) {
  const loggedIn = Boolean(session?.user);
  const nickname = profile?.nickname || session?.user?.user_metadata?.full_name || '대장님';
  const avatarUrl = profile?.profile_image || session?.user?.user_metadata?.avatar_url;

  setText('user-pname', loggedIn ? nickname : '로그인');
  setAvatar('user-pav', nickname, loggedIn ? avatarUrl : null);
  setText('sb-name', loggedIn ? nickname : '로그인');
  setAvatar('sb-av', nickname, loggedIn ? avatarUrl : null);
  setText('prof-nm', loggedIn ? nickname : '로그인');
  setAvatar('prof-av', nickname, loggedIn ? avatarUrl : null);
  setText('prof-tp', loggedIn ? (profile?.region || '동네 설정 예정') : '로그인 후 이용 가능');

  const loginModal = document.getElementById('login-modal');
  const loginPanel = document.getElementById('login-panel');
  const loggedPanel = document.getElementById('logged-panel');
  if (loginPanel) loginPanel.style.display = loggedIn ? 'none' : 'block';
  if (loggedPanel) loggedPanel.style.display = loggedIn ? 'block' : 'none';
  setText('logged-email', loggedIn ? `${nickname} (${session?.user?.email || ''})` : '');
  if (loginModal && loggedIn) loginModal.classList.remove('open');

  document.querySelectorAll('[data-requires-auth]').forEach((el) => {
    el.style.opacity = loggedIn ? '1' : '0.55';
  });
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getAuthRedirectUrl() },
  });
  if (error) throw error;
}

export async function signInWithKakao() {
  toast('카카오 로그인은 Supabase Provider 설정 후 연결됩니다.');
}

export async function signInWithNaver() {
  toast('네이버 로그인은 Supabase Custom OAuth 설정 후 연결됩니다.');
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  updateAuthUI(null, null);
  toast('로그아웃했습니다.');
}

export async function initAuth() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    try {
      await createUserIfNotExists(session.user);
      const profile = await fetchUserProfile(session.user.id);
      updateAuthUI(profile, session);
    } catch (e) {
      console.error(e);
      toast('프로필 동기화 실패: ' + (e.message || e));
    }
  } else {
    updateAuthUI(null, null);
  }

  supabase.auth.onAuthStateChange(async (event, nextSession) => {
    if (event === 'SIGNED_IN' && nextSession?.user) {
      try {
        await createUserIfNotExists(nextSession.user);
        const profile = await fetchUserProfile(nextSession.user.id);
        updateAuthUI(profile, nextSession);
        toast('로그인되었습니다.');
      } catch (e) {
        console.error(e);
        toast('로그인 후 프로필 생성 실패');
      }
    }
    if (event === 'SIGNED_OUT') updateAuthUI(null, null);
  });
}

function openLoginModal() {
  document.getElementById('login-modal')?.classList.add('open');
}

function closeLoginModal() {
  document.getElementById('login-modal')?.classList.remove('open');
}

export function bindAuthUI() {
  document.getElementById('open-login')?.addEventListener('click', openLoginModal);

  document.getElementById('user-chip')?.addEventListener('click', () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) openLoginModal();
      else toast(`${session.user.email || '대장님'} 로그인 중`);
    });
  });

  document.getElementById('btn-google-login')?.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
      toast('Google 로그인 실패: Supabase에서 Google Provider를 활성화해주세요.');
    }
  });

  document.getElementById('btn-kakao-login')?.addEventListener('click', () => signInWithKakao());
  document.getElementById('btn-naver-login')?.addEventListener('click', () => signInWithNaver());
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    try {
      await signOut();
    } catch (e) {
      toast('로그아웃 실패');
    }
  });

  document.getElementById('close-login-modal')?.addEventListener('click', closeLoginModal);
  document.getElementById('login-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'login-modal') closeLoginModal();
  });

  document.getElementById('pm-logout')?.addEventListener('click', async () => {
    try {
      await signOut();
    } catch (e) {
      toast('로그아웃 실패');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindAuthUI();
  await initAuth();
});
