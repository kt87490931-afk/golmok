import { supabase } from './supabase_client.js';

const CHARACTERS = [
  '/assets/characters/char_default.png',
  '/assets/characters/char_radish.png',
  '/assets/characters/char_chef_cat.png',
  '/assets/characters/char_white_cat.png',
];

const UPJONG_MAP = {
  I2: '음식',
  G2: '소매',
  S2: '수리·개인',
  R1: '예술·스포츠',
  P1: '교육',
  L1: '부동산',
  I1: '숙박',
  M1: '과학·기술',
  Q1: '보건의료',
  N1: '시설관리·임대',
};

let currentProfile = null;
let currentUser = null;
let selectedAvatarFile = null;
let selectedCharacterUrl = null;
let nicknameChecked = false;
let currentStatus = 'operating';

function showToast(msg) {
  if (typeof window.showToast === 'function') {
    window.showToast(msg);
    return;
  }
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function showMsg(elId, text, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'success' ? '#1D9E75' : type === 'error' ? '#E24B4A' : '#999';
}

function absolutizeAssetUrl(url) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
}

function parseRegionFields(region) {
  if (!region) return {};
  const parts = region.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    return {
      region_full: region.trim(),
      region_sido: parts[0],
      region_sigungu: parts[1],
      region_dong: parts.slice(2).join(' '),
    };
  }
  return { region_full: region.trim(), region_dong: region.trim() };
}

function hasEmailPasswordProvider(user) {
  const providers = user?.identities?.map((i) => i.provider) || [];
  if (providers.includes('email')) return true;
  return user?.app_metadata?.provider === 'email';
}

function renderAvatar(url, nickname) {
  const el = document.getElementById('avatar-preview');
  if (!el) return;
  if (url) {
    el.innerHTML = `<img src="${url}" alt="프로필" style="width:100%;height:100%;object-fit:cover;">`;
    el.style.background = 'transparent';
  } else {
    el.innerHTML = `<span style="font-size:32px;font-weight:700;color:#633806;">${(nickname || '대').charAt(0)}</span>`;
    el.style.background = '#FAEEDA';
  }
}

function toggleUpjong(status) {
  const wrap = document.getElementById('upjong-field-wrap');
  if (wrap) wrap.style.display = status === 'operating' ? 'block' : 'none';
}

function fillForm(profile, user) {
  renderAvatar(profile?.profile_image, profile?.nickname);

  const nickEl = document.getElementById('edit-nickname');
  if (nickEl) nickEl.value = profile?.nickname || '';

  currentStatus = profile?.user_status || 'operating';
  document.querySelectorAll('.status-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === currentStatus);
  });
  toggleUpjong(currentStatus);

  const upjong = document.getElementById('edit-upjong');
  if (upjong) upjong.value = profile?.upjong1cd || '';

  const region = document.getElementById('edit-region');
  if (region) region.value = profile?.region_full || '';

  const email = document.getElementById('display-email');
  if (email) email.textContent = user.email || '-';

  const phone = document.getElementById('display-phone');
  if (phone) {
    phone.textContent = profile?.phone || '미등록';
    phone.style.color = profile?.phone ? '#555' : '#bbb';
  }

  renderLinkedProviders(user);
  togglePasswordSection(user);

  nicknameChecked = false;
  const nickMsg = document.getElementById('nickname-msg');
  if (nickMsg) nickMsg.textContent = '';
}

function togglePasswordSection(user) {
  const section = document.getElementById('password-section');
  if (!section) return;
  if (!hasEmailPasswordProvider(user)) {
    section.innerHTML = `
      <div class="profile-section-title"><i class="ti ti-lock"></i> 비밀번호 변경</div>
      <p style="font-size:13px;color:#999;line-height:1.6;padding:8px 0;">
        Google 등 간편 로그인으로 가입한 계정은 이 화면에서 비밀번호를 변경할 수 없습니다.<br>
        이메일 가입 계정만 비밀번호 변경이 가능합니다.
      </p>`;
  }
}

function renderLinkedProviders(user) {
  const container = document.getElementById('linked-providers');
  if (!container) return;
  const linkedIds = (user.identities || []).map((i) => i.provider);
  const providers = [
    { id: 'google', name: 'Google', icon: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' },
    { id: 'kakao', name: '카카오', emoji: '💛' },
    { id: 'naver', name: '네이버', emoji: '🟢' },
  ];
  container.innerHTML = providers
    .map((p) => {
      const linked = linkedIds.includes(p.id);
      return `<div class="social-item">
        ${p.icon ? `<img src="${p.icon}" alt="" style="width:20px;height:20px;">` : `<span style="font-size:20px;">${p.emoji}</span>`}
        <span style="font-size:13px;font-weight:500;flex:1;">${p.name}</span>
        <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;${linked ? 'background:#E8F8F0;color:#1D9E75;' : 'background:#F5F1E8;color:#999;'}">${linked ? '연결됨' : '미연결'}</span>
      </div>`;
    })
    .join('');
}

async function refreshGlobalUI() {
  try {
    const { updateAuthUI } = await import('./auth.js');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data: profile } = await supabase.from('users').select('*').eq('id', currentUser.id).maybeSingle();
    updateAuthUI(profile, session);
  } catch (e) {
    console.warn('refreshGlobalUI', e);
  }
  window.golmokCommunity?.loadNeighborSection?.().catch(() => {});
}

async function resizeAvatar(file, maxSize = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const size = Math.min(img.width, img.height, maxSize);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('이미지 변환 실패'));
            return;
          }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지 로드 실패'));
    };
    img.src = objectUrl;
  });
}

window.selectStatus = function (btn) {
  document.querySelectorAll('.status-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  currentStatus = btn.dataset.value;
  toggleUpjong(currentStatus);
};

window.checkNickname = async function () {
  const val = document.getElementById('edit-nickname')?.value?.trim();
  if (!val || val.length < 2) {
    showMsg('nickname-msg', '닉네임은 2자 이상 입력해주세요', 'error');
    return;
  }
  if (val === currentProfile?.nickname) {
    showMsg('nickname-msg', '현재 사용중인 닉네임입니다', 'info');
    nicknameChecked = true;
    return;
  }
  const { data } = await supabase.from('users').select('id').eq('nickname', val).maybeSingle();
  if (data) {
    showMsg('nickname-msg', '이미 사용중인 닉네임입니다', 'error');
    nicknameChecked = false;
  } else {
    showMsg('nickname-msg', '✓ 사용 가능한 닉네임입니다', 'success');
    nicknameChecked = true;
  }
};

window.openCharacterSelect = function () {
  const grid = document.getElementById('character-grid');
  if (!grid) return;
  if (!CHARACTERS.length) {
    showToast('등록된 캐릭터가 없습니다');
    return;
  }
  grid.innerHTML = CHARACTERS.map(
    (url) => `<div class="character-item" data-url="${url}">
      <img src="${url}" alt="">
    </div>`
  ).join('');
  grid.querySelectorAll('.character-item').forEach((el) => {
    el.addEventListener('click', () => selectCharacter(el.dataset.url, el));
  });
  document.getElementById('character-overlay')?.classList.add('open');
};

function selectCharacter(url, el) {
  document.querySelectorAll('.character-item').forEach((c) => c.classList.remove('selected'));
  el?.classList.add('selected');
  const preview = document.getElementById('avatar-preview');
  if (preview) {
    preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
    preview.style.background = 'transparent';
  }
  selectedCharacterUrl = url;
  selectedAvatarFile = null;
  setTimeout(() => {
    document.getElementById('character-overlay')?.classList.remove('open');
    showToast('캐릭터가 선택되었습니다');
  }, 300);
}

window.closeCharacterSelect = function () {
  document.getElementById('character-overlay')?.classList.remove('open');
};

window.resetAvatar = function () {
  selectedAvatarFile = null;
  selectedCharacterUrl = 'reset';
  renderAvatar(null, currentProfile?.nickname);
  showToast('기본 이미지로 초기화됩니다');
};

window.togglePw = function (id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
};

function showPwMsg(text, type) {
  const el = document.getElementById('pw-change-msg');
  if (!el) return;
  el.className = type === 'success' ? 'msg-success' : 'msg-error';
  el.textContent = text;
  el.style.display = 'block';
  if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function bindEvents() {
  document.getElementById('avatar-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('5MB 이하 이미지만 업로드 가능합니다');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById('avatar-preview');
      if (preview) {
        preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        preview.style.background = 'transparent';
      }
    };
    reader.readAsDataURL(file);
    selectedAvatarFile = file;
    selectedCharacterUrl = null;
  });

  document.getElementById('btn-save-profile')?.addEventListener('click', saveProfile);
  document.getElementById('btn-change-pw')?.addEventListener('click', changePassword);

  document.getElementById('edit-nickname')?.addEventListener('input', () => {
    nicknameChecked = false;
    const msg = document.getElementById('nickname-msg');
    if (msg) msg.textContent = '';
  });

  document.getElementById('new-pw')?.addEventListener('input', (e) => {
    const pw = e.target.value;
    const el = document.getElementById('pw-strength');
    if (!el) return;
    if (!pw) {
      el.innerHTML = '';
      return;
    }
    const score = [/[A-Z]/.test(pw), /[0-9]/.test(pw), /[!@#$%^&*(),.?":{}|<>]/.test(pw), pw.length >= 8].filter(Boolean).length;
    const lvs = [
      { label: '매우 약함', color: '#E24B4A', w: '25%' },
      { label: '약함', color: '#FF8C00', w: '50%' },
      { label: '보통', color: '#F5A623', w: '75%' },
      { label: '강함', color: '#1D9E75', w: '100%' },
    ];
    const lv = lvs[Math.max(score - 1, 0)];
    el.innerHTML = `<div style="height:4px;background:#E8E4DC;border-radius:4px;overflow:hidden;margin:4px 0 2px;"><div style="height:100%;width:${lv.w};background:${lv.color};border-radius:4px;"></div></div><div style="font-size:11px;color:${lv.color};">강도: ${lv.label}</div>`;
  });

  document.getElementById('new-pw-confirm')?.addEventListener('input', (e) => {
    const pw = document.getElementById('new-pw')?.value;
    const msg = document.getElementById('pw-match-msg');
    if (!msg || !e.target.value) return;
    if (pw === e.target.value) {
      msg.textContent = '✓ 비밀번호가 일치합니다';
      msg.style.color = '#1D9E75';
    } else {
      msg.textContent = '✗ 비밀번호가 일치하지 않습니다';
      msg.style.color = '#E24B4A';
    }
  });

  document.getElementById('character-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'character-overlay') closeCharacterSelect();
  });
}

async function saveProfile() {
  const nickname = document.getElementById('edit-nickname')?.value?.trim();
  const region = document.getElementById('edit-region')?.value?.trim();
  const upjong = document.getElementById('edit-upjong')?.value;

  if (!nickname || nickname.length < 2) {
    showToast('닉네임은 2자 이상 입력해주세요');
    return;
  }
  if (nickname !== currentProfile?.nickname && !nicknameChecked) {
    showToast('닉네임 중복확인을 해주세요');
    return;
  }

  const btn = document.getElementById('btn-save-profile');
  btn.disabled = true;
  btn.textContent = '저장 중...';

  try {
    const regionFields = parseRegionFields(region);
    let profileImageUrl = currentProfile?.profile_image || null;

    if (selectedAvatarFile) {
      const resized = await resizeAvatar(selectedAvatarFile);
      const fileName = `${currentUser.id}/avatar_${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(fileName, resized, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);
      profileImageUrl = publicUrl;
    } else if (selectedCharacterUrl === 'reset') {
      profileImageUrl = null;
    } else if (selectedCharacterUrl) {
      profileImageUrl = absolutizeAssetUrl(selectedCharacterUrl);
    } else if (profileImageUrl && !/^https?:\/\//i.test(profileImageUrl)) {
      profileImageUrl = absolutizeAssetUrl(profileImageUrl);
    }

    const updatedAt = new Date().toISOString();
    const upjongCd = currentStatus === 'operating' ? upjong || null : null;
    const { error } = await supabase
      .from('users')
      .update({
        nickname,
        user_status: currentStatus,
        upjong1cd: upjongCd,
        upjong1nm: upjongCd ? UPJONG_MAP[upjongCd] || null : null,
        ...regionFields,
        profile_image: profileImageUrl,
        updated_at: updatedAt,
      })
      .eq('id', currentUser.id);

    if (error) throw error;

    try {
      await supabase.auth.updateUser({
        data: { avatar_url: profileImageUrl || null },
      });
    } catch (metaErr) {
      console.warn('auth metadata avatar sync', metaErr);
    }

    currentProfile = {
      ...currentProfile,
      nickname,
      user_status: currentStatus,
      profile_image: profileImageUrl,
      updated_at: updatedAt,
      ...regionFields,
    };
    renderAvatar(profileImageUrl, nickname);
    selectedAvatarFile = null;
    selectedCharacterUrl = null;
    nicknameChecked = false;

    showToast('프로필이 저장되었습니다 ✨');
    const msgEl = document.getElementById('profile-save-msg');
    if (msgEl) {
      msgEl.className = 'msg-success';
      msgEl.textContent = '✓ 프로필이 저장되었습니다';
      msgEl.style.display = 'block';
      setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
    }
    await refreshGlobalUI();
  } catch (err) {
    console.error('saveProfile', err);
    showToast('저장에 실패했습니다. 다시 시도해주세요');
  } finally {
    btn.disabled = false;
    btn.textContent = '저장하기';
  }
}

async function changePassword() {
  if (!hasEmailPasswordProvider(currentUser)) {
    showPwMsg('이메일 가입 계정만 비밀번호를 변경할 수 있습니다', 'error');
    return;
  }

  const cur = document.getElementById('current-pw')?.value;
  const nw = document.getElementById('new-pw')?.value;
  const nwc = document.getElementById('new-pw-confirm')?.value;

  if (!cur) {
    showPwMsg('현재 비밀번호를 입력해주세요', 'error');
    return;
  }
  if (!nw || nw.length < 8) {
    showPwMsg('새 비밀번호는 8자 이상 입력해주세요', 'error');
    return;
  }
  const valid = /[A-Z]/.test(nw) && /[0-9]/.test(nw) && /[!@#$%^&*(),.?":{}|<>]/.test(nw);
  if (!valid) {
    showPwMsg('대문자, 숫자, 특수문자를 포함해주세요', 'error');
    return;
  }
  if (nw !== nwc) {
    showPwMsg('새 비밀번호가 일치하지 않습니다', 'error');
    return;
  }
  if (cur === nw) {
    showPwMsg('현재 비밀번호와 다른 비밀번호를 입력해주세요', 'error');
    return;
  }

  const btn = document.getElementById('btn-change-pw');
  btn.disabled = true;
  btn.textContent = '변경 중...';

  try {
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: cur,
    });
    if (signInErr) {
      showPwMsg('현재 비밀번호가 올바르지 않습니다', 'error');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: nw });
    if (error) throw error;

    document.getElementById('current-pw').value = '';
    document.getElementById('new-pw').value = '';
    document.getElementById('new-pw-confirm').value = '';
    document.getElementById('pw-strength').innerHTML = '';
    document.getElementById('pw-match-msg').textContent = '';

    showPwMsg('비밀번호가 변경되었습니다 ✓', 'success');
    showToast('비밀번호가 변경되었습니다');
  } catch (err) {
    console.error('changePassword', err);
    showPwMsg('비밀번호 변경에 실패했습니다', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '비밀번호 변경';
  }
}

async function initProfilePage() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = user;
  const { data: profile, error } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
  if (error) {
    console.error(error);
    showToast('프로필을 불러오지 못했습니다');
    return;
  }

  currentProfile = profile || { id: user.id };
  fillForm(currentProfile, user);
}

function boot() {
  bindEvents();
  initProfilePage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
