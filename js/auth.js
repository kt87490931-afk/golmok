import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, getAuthRedirectUrl } from './supabase_config.js';
import { mountAuthModals } from './auth_modals.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function toast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
}

function initialFromName(name) {
  if (!name || typeof name !== 'string') return '대';
  const t = name.trim();
  return t ? t.charAt(0) : '대';
}

function getProvider(user) {
  return user?.app_metadata?.provider || 'email';
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

export function openLoginModal(tab = 'login') {
  const ov = document.getElementById('login-overlay') || document.getElementById('login-modal');
  ov?.classList.add('open');
  if (tab === 'signup') showSignupTab();
  else showLoginTab();
}

export function closeAllModals() {
  document.querySelectorAll('.modal-bg.open, #login-modal.open').forEach((o) => o.classList.remove('open'));
}

function showLoginTab() {
  document.getElementById('tab-login-content')?.style && (document.getElementById('tab-login-content').style.display = 'block');
  const s = document.getElementById('tab-signup-content');
  const f = document.getElementById('tab-forgot-content');
  if (s) s.style.display = 'none';
  if (f) f.style.display = 'none';
  document.querySelectorAll('.auth-tab').forEach((t) => {
    t.classList.toggle('act', t.dataset.tab === 'login');
  });
}

function showSignupTab() {
  const l = document.getElementById('tab-login-content');
  const s = document.getElementById('tab-signup-content');
  const f = document.getElementById('tab-forgot-content');
  if (l) l.style.display = 'none';
  if (s) s.style.display = 'block';
  if (f) f.style.display = 'none';
  document.querySelectorAll('.auth-tab').forEach((t) => {
    t.classList.toggle('act', t.dataset.tab === 'signup');
  });
}

function showForgotPassword() {
  const l = document.getElementById('tab-login-content');
  const s = document.getElementById('tab-signup-content');
  const f = document.getElementById('tab-forgot-content');
  if (l) l.style.display = 'none';
  if (s) s.style.display = 'none';
  if (f) f.style.display = 'block';
}

async function upsertUserRow(user, extra = {}) {
  const provider = getProvider(user);
  const payload = {
    id: user.id,
    nickname: extra.nickname || user.user_metadata?.nickname || user.user_metadata?.full_name || user.user_metadata?.name || '대장님',
    email: user.email,
    profile_image: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    auth_provider: provider,
    last_login_at: new Date().toISOString(),
    ...extra,
  };
  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

async function fetchUserProfile(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

function needsProfileSetup(profile) {
  if (!profile) return true;
  return !profile.nickname || profile.nickname === '대장님' || !profile.region_dong;
}

function openProfileSetup(user) {
  const ov = document.getElementById('profile-setup-overlay');
  if (!ov) return;
  const nick = document.getElementById('profile-nickname');
  if (nick) {
    nick.value = user.user_metadata?.nickname || user.user_metadata?.full_name || user.user_metadata?.name || '';
  }
  ov.classList.add('open');
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
  const regionText = profile?.region_full || (profile?.region_dong ? `경기 ${profile.region_sigungu || ''} ${profile.region_dong}`.trim() : '동네 설정 예정');

  setText('user-pname', loggedIn ? nickname : '로그인');
  setAvatar('user-pav', nickname, loggedIn ? avatarUrl : null);
  setText('sb-name', loggedIn ? nickname : '로그인');
  setAvatar('sb-av', nickname, loggedIn ? avatarUrl : null);
  setText('prof-nm', loggedIn ? nickname : '로그인');
  setAvatar('prof-av', nickname, loggedIn ? avatarUrl : null);
  setText('prof-tp', loggedIn ? regionText : '로그인 후 이용 가능');

  const legacyLogin = document.getElementById('login-panel');
  const legacyLogged = document.getElementById('logged-panel');
  if (legacyLogin) legacyLogin.style.display = loggedIn ? 'none' : 'block';
  if (legacyLogged) legacyLogged.style.display = loggedIn ? 'block' : 'none';
  setText('logged-email', loggedIn ? `${nickname} (${session?.user?.email || ''})` : '');

  if (loggedIn) closeAllModals();

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
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: getAuthRedirectUrl() },
  });
  if (error) {
    showError('login-error', '카카오 로그인 준비 중입니다. 이메일 가입을 이용해주세요.');
  }
}

export async function signInWithNaver() {
  showError('login-error', '네이버 로그인 준비 중입니다. 이메일 또는 Google을 이용해주세요.');
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  updateAuthUI(null, null);
  toast('로그아웃했습니다.');
}

async function handleSignedIn(user) {
  const { data: existing } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

  if (!existing) {
    await upsertUserRow(user);
    const provider = getProvider(user);
    if (provider !== 'email') {
      openProfileSetup(user);
    }
  } else {
    await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);
    if (needsProfileSetup(existing) && getProvider(user) !== 'email') {
      openProfileSetup(user);
    }
  }

  const profile = await fetchUserProfile(user.id);
  updateAuthUI(profile, { user });
  window.golmokCommunity?.loadFeed?.(true);
}

export async function initAuth() {
  mountAuthModals();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    try {
      await handleSignedIn(session.user);
    } catch (e) {
      console.error(e);
      toast('프로필 동기화 실패');
    }
  } else {
    updateAuthUI(null, null);
  }

  supabase.auth.onAuthStateChange(async (event, nextSession) => {
    if (event === 'SIGNED_IN' && nextSession?.user) {
      try {
        await handleSignedIn(nextSession.user);
        toast('로그인되었습니다.');
      } catch (e) {
        console.error(e);
        toast('로그인 처리 중 오류가 발생했습니다.');
      }
    }
    if (event === 'SIGNED_OUT') updateAuthUI(null, null);
  });
}

function bindEmailSignup() {
  document.getElementById('btn-email-signup')?.addEventListener('click', async () => {
    hideError('signup-error');

    const nickname = document.getElementById('signup-nickname')?.value?.trim();
    const email = document.getElementById('signup-email')?.value?.trim();
    const password = document.getElementById('signup-password')?.value;
    const passwordConfirm = document.getElementById('signup-password-confirm')?.value;
    const agreeTerms = document.getElementById('agree-terms')?.checked;
    const agreePrivacy = document.getElementById('agree-privacy')?.checked;
    const agreeMarketing = document.getElementById('agree-marketing')?.checked;

    if (!nickname || nickname.length < 2) return showError('signup-error', '닉네임은 2자 이상 입력해주세요.');
    if (!email || !email.includes('@')) return showError('signup-error', '올바른 이메일을 입력해주세요.');
    if (!password || password.length < 8) return showError('signup-error', '비밀번호는 8자 이상이어야 합니다.');
    if (password !== passwordConfirm) return showError('signup-error', '비밀번호가 일치하지 않습니다.');
    if (!agreeTerms || !agreePrivacy) return showError('signup-error', '필수 약관에 동의해주세요.');

    const btn = document.getElementById('btn-email-signup');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '가입 중...';
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: { nickname, full_name: nickname },
      },
    });

    if (error) {
      showError('signup-error', error.message.includes('already') ? '이미 가입된 이메일입니다.' : '회원가입에 실패했습니다.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '이메일로 가입하기';
      }
      return;
    }

    if (data.user) {
      await upsertUserRow(data.user, {
        nickname,
        auth_provider: 'email',
        agree_marketing: agreeMarketing,
        is_active: true,
      });
    }

    closeAllModals();
    const addr = document.getElementById('verify-email-address');
    if (addr) addr.textContent = email;
    document.getElementById('verify-email-overlay')?.classList.add('open');
    toast('인증 메일을 발송했습니다. 메일함을 확인해주세요.');

    if (btn) {
      btn.disabled = false;
      btn.textContent = '이메일로 가입하기';
    }
  });
}

function parseRegion(region) {
  if (!region) return {};
  const parts = region.split(' ').filter(Boolean);
  return {
    region_full: region,
    region_sido: parts[0] || null,
    region_sigungu: parts[1] || null,
    region_dong: parts[2] || null,
  };
}

function bindEmailLogin() {
  document.getElementById('btn-email-login')?.addEventListener('click', async () => {
    hideError('login-error');
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    if (!email) return showError('login-error', '이메일을 입력해주세요.');
    if (!password) return showError('login-error', '비밀번호를 입력해주세요.');

    const btn = document.getElementById('btn-email-login');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '로그인 중...';
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        showError('login-error', '이메일 인증이 필요합니다. 메일함의 링크를 클릭해주세요.');
      } else {
        showError('login-error', '이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = '로그인';
      }
      return;
    }

    closeAllModals();
    await handleSignedIn(data.user);
    toast('로그인되었습니다.');

    if (btn) {
      btn.disabled = false;
      btn.textContent = '로그인';
    }
  });
}

function bindForgotPassword() {
  document.getElementById('btn-send-reset')?.addEventListener('click', async () => {
    hideError('forgot-error');
    const ok = document.getElementById('forgot-success');
    if (ok) ok.style.display = 'none';

    const email = document.getElementById('forgot-email')?.value?.trim();
    if (!email) return showError('forgot-error', '이메일을 입력해주세요.');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`,
    });

    if (error) {
      showError('forgot-error', '이메일 발송에 실패했습니다.');
      return;
    }

    if (ok) {
      ok.textContent = `${email}으로 재설정 링크를 보냈습니다.`;
      ok.style.display = 'block';
    }
  });
}

function bindProfileSetup() {
  document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
    const nickname = document.getElementById('profile-nickname')?.value?.trim();
    const region = document.getElementById('profile-region')?.value?.trim();
    const upjong = document.getElementById('profile-upjong')?.value;
    if (!nickname) return toast('닉네임을 입력해주세요.');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('users')
      .update({
        nickname,
        upjong1cd: upjong || null,
        ...parseRegion(region),
      })
      .eq('id', user.id);

    document.getElementById('profile-setup-overlay')?.classList.remove('open');
    const profile = await fetchUserProfile(user.id);
    updateAuthUI(profile, { user });
    toast('회원가입이 완료되었습니다.');
    window.golmokCommunity?.loadFeed?.(true);
  });

  document.getElementById('btn-skip-profile')?.addEventListener('click', () => {
    document.getElementById('profile-setup-overlay')?.classList.remove('open');
    toast('프로필은 내정보에서 나중에 설정할 수 있습니다.');
  });
}

export function bindAuthUI() {
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab === 'signup') showSignupTab();
      else showLoginTab();
    });
  });

  document.getElementById('close-login')?.addEventListener('click', closeAllModals);
  document.getElementById('close-login-modal')?.addEventListener('click', closeAllModals);
  document.getElementById('login-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'login-overlay') closeAllModals();
  });
  document.getElementById('login-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'login-modal') closeAllModals();
  });

  document.getElementById('btn-forgot-open')?.addEventListener('click', showForgotPassword);
  document.getElementById('btn-back-login')?.addEventListener('click', showLoginTab);
  document.getElementById('btn-close-verify')?.addEventListener('click', closeAllModals);

  document.getElementById('btn-resend-email')?.addEventListener('click', async () => {
    const email = document.getElementById('verify-email-address')?.textContent?.trim();
    if (!email) return;
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (!error) toast('인증 메일을 다시 보냈습니다.');
  });

  document.getElementById('agree-all')?.addEventListener('change', (e) => {
    const c = e.target.checked;
    ['agree-terms', 'agree-privacy', 'agree-marketing'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = c;
    });
  });

  const social = [
    ['btn-google-login', signInWithGoogle],
    ['btn-google-signup', signInWithGoogle],
    ['btn-kakao-login', signInWithKakao],
    ['btn-kakao-signup', signInWithKakao],
    ['btn-naver-login', signInWithNaver],
    ['btn-naver-signup', signInWithNaver],
  ];

  social.forEach(([id, fn]) => {
    document.getElementById(id)?.addEventListener('click', async () => {
      try {
        await fn();
      } catch (e) {
        console.error(e);
        showError('login-error', '소셜 로그인에 실패했습니다.');
      }
    });
  });

  bindEmailLogin();
  bindEmailSignup();
  bindForgotPassword();
  bindProfileSetup();

  document.getElementById('open-login')?.addEventListener('click', () => openLoginModal('login'));

  document.getElementById('user-chip')?.addEventListener('click', () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) openLoginModal('login');
      else toast(`${session.user.email || '대장님'} 로그인 중`);
    });
  });

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    try {
      await signOut();
    } catch {
      toast('로그아웃 실패');
    }
  });

  document.getElementById('pm-logout')?.addEventListener('click', async () => {
    try {
      await signOut();
    } catch {
      toast('로그아웃 실패');
    }
  });
}

window.openLoginModal = openLoginModal;
window.closeAllModals = closeAllModals;
window.showForgotPassword = showForgotPassword;
window.showLoginTab = showLoginTab;
window.signOut = signOut;

document.addEventListener('DOMContentLoaded', async () => {
  bindAuthUI();
  await initAuth();
});
