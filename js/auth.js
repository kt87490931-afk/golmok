import { getAuthRedirectUrl, getPasswordResetRedirectUrl } from './supabase_config.js';
import { supabase } from './supabase_client.js';
import { mountAuthModals } from './auth_modals.js';

export { supabase };

let handlingSignIn = false;

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

/** 현재 보이는 로그인/회원가입 탭에 맞는 에러 영역에 표시 */
function showAuthError(msg) {
  const signupVisible = document.getElementById('tab-signup-content')?.style.display !== 'none';
  const forgotVisible = document.getElementById('tab-forgot-content')?.style.display !== 'none';
  if (forgotVisible) showError('forgot-error', msg);
  else if (signupVisible) showError('signup-error', msg);
  else showError('login-error', msg);
}

function setButtonLoading(btn, loading, idleText) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) btn.dataset.idleText = btn.textContent;
  btn.textContent = loading ? '처리 중...' : btn.dataset.idleText || idleText || btn.textContent;
}

export function openLoginModal(tab = 'login') {
  mountAuthModals();
  setupAuthClickDelegate();
  const ov = document.getElementById('login-overlay');
  ov?.classList.add('open');
  if (tab === 'signup') showSignupTab();
  else showLoginTab();
}

export function closeAllModals() {
  document.querySelectorAll('.modal-bg.open').forEach((o) => o.classList.remove('open'));
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
  hideError('login-error');
  hideError('signup-error');
}

function parseSignupRegion(region) {
  if (!region) return {};
  const parts = region.split(' ').filter(Boolean);
  if (parts.length >= 3) {
    return {
      region_full: region,
      region_sido: parts[0],
      region_sigungu: parts[1],
      region_dong: parts.slice(2).join(' '),
    };
  }
  return { region_full: region, region_dong: region };
}

/** 가입 폼 → auth user_metadata (이메일 인증 전에도 보존) */
function signupMetaFromForm({ nickname, phone, userStatus, upjong, region, agreeMarketing }) {
  return {
    nickname,
    full_name: nickname,
    phone,
    user_status: userStatus,
    upjong1cd: upjong || null,
    agree_marketing: !!agreeMarketing,
    agreed_at: new Date().toISOString(),
    ...parseSignupRegion(region),
  };
}

function userRowFromMetadata(user, extra = {}) {
  const m = { ...(user.user_metadata || {}), ...extra };
  return {
    id: user.id,
    nickname: m.nickname || m.full_name || m.name || '대장님',
    email: user.email,
    profile_image: m.avatar_url || m.picture || null,
    phone: m.phone || null,
    user_status: m.user_status || 'operating',
    upjong1cd: m.upjong1cd || null,
    region_full: m.region_full || null,
    region_sido: m.region_sido || null,
    region_sigungu: m.region_sigungu || null,
    region_dong: m.region_dong || null,
    agree_marketing: m.agree_marketing === true,
    agreed_at: m.agreed_at || null,
  };
}

async function upsertUserRow(user, extra = {}) {
  const payload = userRowFromMetadata(user, extra);
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
  const nickname =
    profile?.nickname ||
    session?.user?.user_metadata?.nickname ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    '대장님';
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

  refreshSidebarProfile();
}

async function refreshSidebarProfile() {
  try {
    const { renderSidebarProfile } = await import('./profile_ui.js');
    await renderSidebarProfile();
  } catch (e) {
    console.warn('sidebar profile refresh', e);
  }
}

async function runInitFCM() {
  try {
    const { initFCM } = await import('./fcm.js');
    await initFCM();
  } catch (e) {
    console.warn('fcm init', e);
  }
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getAuthRedirectUrl() },
  });
  if (error) throw error;
  if (data?.url) window.location.assign(data.url);
}

export async function signInWithKakao() {
  showAuthError('카카오 로그인 준비 중입니다. 이메일 가입을 이용해주세요.');
}

export async function signInWithNaver() {
  showAuthError('네이버 로그인 준비 중입니다. 이메일 또는 Google을 이용해주세요.');
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  updateAuthUI(null, null);
  toast('로그아웃했습니다.');
}

async function handleSignedIn(user) {
  if (handlingSignIn) return;
  handlingSignIn = true;
  try {
    await handleSignedInCore(user);
  } finally {
    handlingSignIn = false;
  }
}

async function handleSignedInCore(user) {
  const { data: existing, error: existingErr } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
  if (existingErr) console.warn('users select', existingErr.message);

  try {
    if (!existing) {
      await upsertUserRow(user);
      const provider = getProvider(user);
      if (provider !== 'email') openProfileSetup(user);
    } else {
      if (user.user_metadata?.phone || user.user_metadata?.nickname) {
        await upsertUserRow(user);
      }
      if (needsProfileSetup(existing) && getProvider(user) !== 'email') openProfileSetup(user);
    }
  } catch (e) {
    console.warn('users upsert', e);
  }

  let profile = null;
  try {
    profile = await fetchUserProfile(user.id);
  } catch (e) {
    console.warn('fetchUserProfile', e);
  }

  updateAuthUI(profile, { user });
  window.golmokCommunity?.loadFeed?.(true);
  runInitFCM();
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
      toast('프로필 동기화 중 오류가 있었습니다');
      updateAuthUI(null, session);
    }
  } else {
    updateAuthUI(null, null);
  }

  supabase.auth.onAuthStateChange(async (event, nextSession) => {
    if (event === 'SIGNED_IN' && nextSession?.user) {
      try {
        await handleSignedIn(nextSession.user);
        toast('로그인되었습니다.');
        window.golmokCommunity?.loadNeighborSection?.().catch(() => {});
      } catch (e) {
        console.error(e);
        toast('로그인 처리 중 오류가 발생했습니다.');
        updateAuthUI(null, nextSession);
      }
    }
    if (event === 'SIGNED_OUT') {
      updateAuthUI(null, null);
      window.golmokCommunity?.loadNeighborSection?.().catch(() => {});
    }
  });
}

/** 모달 내부 클릭 — document 위임(한 번만 등록, 요소별 bind 실패 방지) */
function setupAuthClickDelegate() {
  if (window.__golmokAuthDelegate) return;
  window.__golmokAuthDelegate = true;

  document.addEventListener('click', async (e) => {
    const loginOverlay = document.getElementById('login-overlay');
    const chip = e.target.closest?.('#user-chip');
    if (chip) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) openLoginModal('login');
      else toast(`${session.user.email || '대장님'} 로그인 중`);
      return;
    }

    if (e.target.closest?.('#open-login')) {
      openLoginModal('login');
      return;
    }

    const btn = e.target.closest?.('button[id]');

    if (e.target.closest?.('#verify-email-overlay')) {
      if (btn?.id === 'btn-close-verify') closeAllModals();
      if (btn?.id === 'btn-resend-email') {
        const email = document.getElementById('verify-email-address')?.textContent?.trim();
        if (!email) return;
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        if (!error) toast('인증 메일을 다시 보냈습니다.');
      }
      return;
    }

    if (e.target.closest?.('#profile-setup-overlay')) {
      if (btn?.id === 'btn-save-profile') await runSaveProfile();
      if (btn?.id === 'btn-skip-profile') {
        document.getElementById('profile-setup-overlay')?.classList.remove('open');
        toast('프로필은 내정보에서 나중에 설정할 수 있습니다.');
      }
      return;
    }

    if (!loginOverlay?.classList.contains('open')) return;

    if (e.target.id === 'login-overlay' || e.target === loginOverlay) {
      closeAllModals();
      return;
    }

    if (!e.target.closest?.('#login-overlay')) return;

    const tab = e.target.closest?.('.auth-tab');
    if (tab) {
      e.preventDefault();
      if (tab.dataset.tab === 'signup') showSignupTab();
      else showLoginTab();
      return;
    }

    if (!btn) return;

    switch (btn.id) {
      case 'close-login':
        closeAllModals();
        return;
      case 'btn-forgot-open':
        e.preventDefault();
        showForgotPassword();
        return;
      case 'btn-back-login':
        e.preventDefault();
        showLoginTab();
        return;
      case 'btn-google-login':
      case 'btn-google-signup':
        await runSocialClick(btn, signInWithGoogle);
        return;
      case 'btn-kakao-login':
      case 'btn-kakao-signup':
        await runSocialClick(btn, signInWithKakao);
        return;
      case 'btn-naver-login':
      case 'btn-naver-signup':
        await runSocialClick(btn, signInWithNaver);
        return;
      case 'btn-email-login':
        await runEmailLogin(btn);
        return;
      case 'btn-email-signup':
        await runEmailSignup(btn);
        return;
      case 'btn-send-reset':
        await runForgotSend(btn);
        return;
      default:
        break;
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'agree-all') {
      const c = e.target.checked;
      ['agree-terms', 'agree-privacy', 'agree-marketing'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = c;
      });
    }
  });
}

async function runSocialClick(btn, fn) {
  hideError('login-error');
  hideError('signup-error');
  setButtonLoading(btn, true);
  try {
    await fn();
  } catch (err) {
    console.error(err);
    const msg = err?.message?.includes('not enabled')
      ? 'Google 로그인 설정이 완료되지 않았습니다. 이메일 로그인을 이용해주세요.'
      : '소셜 로그인에 실패했습니다.';
    showAuthError(msg);
  } finally {
    setButtonLoading(btn, false);
  }
}

async function runEmailLogin(btn) {
  hideError('login-error');
  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;
  if (!email) return showError('login-error', '이메일을 입력해주세요.');
  if (!password) return showError('login-error', '비밀번호를 입력해주세요.');
  setButtonLoading(btn, true, '로그인');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        showError('login-error', '이메일 인증이 필요합니다. 메일함의 링크를 클릭해주세요.');
      } else {
        showError('login-error', '이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      return;
    }
    closeAllModals();
    await handleSignedIn(data.user);
    toast('로그인되었습니다.');
  } catch (err) {
    console.error(err);
    showError('login-error', '로그인 요청 중 오류가 발생했습니다.');
  } finally {
    setButtonLoading(btn, false, '로그인');
  }
}

function getSelectedUserStatus() {
  return document.querySelector('input[name="user-status"]:checked')?.value || 'operating';
}

function validateSignupPassword(password) {
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return password.length >= 8 && hasUpper && hasNumber && hasSpecial;
}

function renderPasswordStrength(pw) {
  const strengthEl = document.getElementById('password-strength');
  if (!strengthEl) return;
  if (!pw) {
    strengthEl.innerHTML = '';
    return;
  }
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
  const hasLength = pw.length >= 8;
  const score = [hasUpper, hasNumber, hasSpecial, hasLength].filter(Boolean).length;
  const levels = [
    { label: '매우 약함', color: '#E24B4A', width: '25%' },
    { label: '약함', color: '#FF8C00', width: '50%' },
    { label: '보통', color: '#F5A623', width: '75%' },
    { label: '강함', color: '#1D9E75', width: '100%' },
  ];
  const lv = levels[Math.max(0, score - 1)] || levels[0];
  strengthEl.innerHTML = `
    <div style="height:4px;background:#E8E4DC;border-radius:4px;overflow:hidden;margin-bottom:3px;">
      <div style="height:100%;width:${lv.width};background:${lv.color};border-radius:4px;transition:width .3s;"></div>
    </div>
    <div style="font-size:11px;color:${lv.color};">
      비밀번호 강도: ${lv.label}
      ${!hasUpper ? ' · 대문자 필요' : ''}
      ${!hasNumber ? ' · 숫자 필요' : ''}
      ${!hasSpecial ? ' · 특수문자 필요' : ''}
    </div>`;
}

function renderPasswordMatch() {
  const pw = document.getElementById('signup-password')?.value;
  const pwc = document.getElementById('signup-password-confirm')?.value;
  const msg = document.getElementById('password-match-msg');
  if (!msg || !pwc) return;
  if (pw === pwc) {
    msg.textContent = '✓ 비밀번호가 일치합니다';
    msg.style.color = '#1D9E75';
  } else {
    msg.textContent = '✗ 비밀번호가 일치하지 않습니다';
    msg.style.color = '#E24B4A';
  }
}

function formatSignupPhoneInput(el) {
  let val = el.value.replace(/\D/g, '');
  if (val.length <= 3) el.value = val;
  else if (val.length <= 7) el.value = `${val.slice(0, 3)}-${val.slice(3)}`;
  else el.value = `${val.slice(0, 3)}-${val.slice(3, 7)}-${val.slice(7, 11)}`;
}

function setStatusBtnActive(value) {
  document.querySelectorAll('.status-btn').forEach((b) => {
    b.classList.toggle('act', b.dataset.value === value);
  });
  const upjongField = document.getElementById('upjong-field');
  if (upjongField) upjongField.style.display = value === 'operating' ? 'block' : 'none';
}

export function setupSignupFormInteractions() {
  if (window.__golmokSignupUi) return;
  window.__golmokSignupUi = true;

  document.addEventListener('click', (e) => {
    const pwBtn = e.target.closest?.('.pw-toggle');
    if (pwBtn?.dataset.pw) {
      const el = document.getElementById(pwBtn.dataset.pw);
      if (el) el.type = el.type === 'password' ? 'text' : 'password';
      return;
    }
    const statusBtn = e.target.closest?.('.status-btn');
    if (statusBtn?.closest('#tab-signup-content')) {
      const value = statusBtn.dataset.value;
      const radio = document.querySelector(`input[name="user-status"][value="${value}"]`);
      if (radio) radio.checked = true;
      setStatusBtnActive(value);
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'signup-phone') formatSignupPhoneInput(e.target);
    if (e.target.id === 'signup-password') renderPasswordStrength(e.target.value);
    if (e.target.id === 'signup-password-confirm' || e.target.id === 'signup-password') renderPasswordMatch();
  });

  setStatusBtnActive(getSelectedUserStatus());
}

window.togglePasswordVisibility = (id) => {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
};

async function runEmailSignup(btn) {
  hideError('signup-error');

  const nickname = document.getElementById('signup-nickname')?.value?.trim();
  const email = document.getElementById('signup-email')?.value?.trim();
  const password = document.getElementById('signup-password')?.value;
  const passwordConfirm = document.getElementById('signup-password-confirm')?.value;
  const phone = document.getElementById('signup-phone')?.value?.trim();
  const region = document.getElementById('signup-region')?.value?.trim();
  const upjong = document.getElementById('signup-upjong')?.value;
  const agreeTerms = document.getElementById('agree-terms')?.checked;
  const agreePrivacy = document.getElementById('agree-privacy')?.checked;
  const agreeMarketing = document.getElementById('agree-marketing')?.checked;
  const userStatus = getSelectedUserStatus();

  if (!nickname || nickname.length < 2) return showError('signup-error', '닉네임은 2자 이상 입력해주세요.');
  if (!email || !email.includes('@')) return showError('signup-error', '올바른 이메일 주소를 입력해주세요.');
  if (!validateSignupPassword(password)) {
    return showError('signup-error', '비밀번호에 대문자, 숫자, 특수문자를 포함해 8자 이상 입력해주세요.');
  }
  if (password !== passwordConfirm) return showError('signup-error', '비밀번호가 일치하지 않습니다.');
  if (!phone || phone.length < 12) {
    return showError('signup-error', '연락처를 정확히 입력해주세요. (예: 010-0000-0000)');
  }
  if (!agreeTerms || !agreePrivacy) return showError('signup-error', '필수 약관에 동의해주세요.');

  setButtonLoading(btn, true, '이메일로 가입하기');
  try {
    const signupMeta = signupMetaFromForm({
      nickname,
      phone,
      userStatus,
      upjong,
      region,
      agreeMarketing,
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: signupMeta,
      },
    });
    if (error) {
      console.error('signUp', error);
      let msg = '회원가입에 실패했습니다. 다시 시도해주세요.';
      if (error.message?.includes('already') || error.message?.includes('registered')) {
        msg = '이미 가입된 이메일입니다. 로그인해주세요.';
      } else if (error.message) {
        msg = error.message;
      }
      showError('signup-error', msg);
      return;
    }

    // 이메일 인증 ON: session 없음 → users INSERT는 RLS 때문에 실패함 → 로그인/인증 후 upsert
    if (data.session && data.user) {
      const { error: dbError } = await supabase.from('users').upsert(userRowFromMetadata(data.user), { onConflict: 'id' });
      if (dbError) {
        console.error('users upsert', dbError);
        showError('signup-error', dbError.message || '프로필 저장에 실패했습니다.');
        return;
      }
      closeAllModals();
      await handleSignedIn(data.user);
      toast('가입이 완료되었습니다!');
      return;
    }

    closeAllModals();
    const addr = document.getElementById('verify-email-address');
    if (addr) addr.textContent = email;
    document.getElementById('verify-email-overlay')?.classList.add('open');
    toast('인증 메일을 발송했습니다. 메일함(스팸함 포함)을 확인해주세요.');
  } catch (err) {
    console.error(err);
    const detail = err?.message || err?.details || '';
    showError('signup-error', detail ? `회원가입 오류: ${detail}` : '회원가입 요청 중 오류가 발생했습니다.');
  } finally {
    setButtonLoading(btn, false, '이메일로 가입하기');
  }
}

async function runForgotSend(btn) {
  hideError('forgot-error');
  const ok = document.getElementById('forgot-success');
  if (ok) ok.style.display = 'none';
  const email = document.getElementById('forgot-email')?.value?.trim();
  if (!email) return showError('forgot-error', '이메일을 입력해주세요.');
  setButtonLoading(btn, true, '재설정 링크 보내기');
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    if (error) {
      showError('forgot-error', '이메일 발송에 실패했습니다.');
      return;
    }
    if (ok) {
      ok.textContent = `${email}으로 재설정 링크를 보냈습니다.`;
      ok.style.display = 'block';
    }
  } catch (err) {
    console.error(err);
    showError('forgot-error', '요청 중 오류가 발생했습니다.');
  } finally {
    setButtonLoading(btn, false, '재설정 링크 보내기');
  }
}

async function runSaveProfile() {
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

function bindLogoutButtons() {
  ['btn-logout', 'pm-logout'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.bound === '1') return;
    el.dataset.bound = '1';
    el.addEventListener('click', async () => {
      try {
        await signOut();
      } catch {
        toast('로그아웃 실패');
      }
    });
  });
}

export function bindAuthUI() {
  mountAuthModals();
  setupAuthClickDelegate();
  setupSignupFormInteractions();
  bindLogoutButtons();
}

window.openLoginModal = openLoginModal;
window.closeAllModals = closeAllModals;
window.showForgotPassword = showForgotPassword;
window.showLoginTab = showLoginTab;
window.signOut = signOut;

document.addEventListener('DOMContentLoaded', async () => {
  mountAuthModals();
  bindAuthUI();
  await initAuth();
});
