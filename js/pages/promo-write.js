import { createPromo, hasTodayPromo } from '../promo.js?v=20260711';
import { getCurrentUser } from '../community.js?v=20260711';
import { bootPage } from '../page_common.js';

let selectedUpjong = '';
let selectedUpjongCode = '';
let selectedPhotos = [];

function toast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
  else alert(msg);
}

function updateChar(el, countId) {
  const el2 = document.getElementById(countId);
  if (el2) el2.textContent = String(el.value.length);
}

function renderPhotoGrid() {
  const grid = document.getElementById('promo-photo-grid');
  if (!grid) return;
  grid.innerHTML = '';

  selectedPhotos.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const div = document.createElement('div');
    div.className = 'promo-photo-preview';
    div.innerHTML = `
      <img src="${url}" alt="미리보기">
      <button type="button" class="promo-photo-del" data-idx="${idx}">×</button>`;
    div.querySelector('.promo-photo-del')?.addEventListener('click', () => {
      selectedPhotos.splice(idx, 1);
      renderPhotoGrid();
    });
    grid.appendChild(div);
  });

  if (selectedPhotos.length < 3) {
    const add = document.createElement('div');
    add.className = 'promo-photo-add';
    add.innerHTML = '<i class="ti ti-camera"></i> 사진 추가';
    add.addEventListener('click', () => document.getElementById('promo-photo-input')?.click());
    grid.appendChild(add);
  }
}

function bindUpjongButtons() {
  document.querySelectorAll('.promo-upjong-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.promo-upjong-btn').forEach((b) => b.classList.remove('act'));
      btn.classList.add('act');
      selectedUpjong = btn.dataset.name || '';
      selectedUpjongCode = btn.dataset.code || '';
    });
  });
}

function bindGpsButton() {
  document.getElementById('btn-promo-gps')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      toast('GPS를 지원하지 않는 브라우저입니다');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const input = document.getElementById('shop-address');
        if (input) input.value = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        input.dataset.lat = String(latitude);
        input.dataset.lng = String(longitude);
      },
      () => toast('위치 정보를 가져올 수 없습니다')
    );
  });
}

async function submitPromo() {
  const shopName = document.getElementById('shop-name')?.value?.trim();
  const intro = document.getElementById('intro')?.value?.trim();
  const address = document.getElementById('shop-address')?.value?.trim();
  const detail = document.getElementById('detail')?.value?.trim();
  const openHours = document.getElementById('open-hours')?.value?.trim();
  const phone = document.getElementById('shop-phone')?.value?.trim();
  const lat = parseFloat(document.getElementById('shop-address')?.dataset.lat || '');
  const lng = parseFloat(document.getElementById('shop-address')?.dataset.lng || '');

  if (!shopName) {
    toast('업체명을 입력해주세요');
    return;
  }
  if (!selectedUpjong) {
    toast('업종을 선택해주세요');
    return;
  }
  if (!intro) {
    toast('한 줄 소개를 입력해주세요');
    return;
  }

  const btn = document.getElementById('btn-submit-promo');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '등록 중...';
  }

  try {
    const res = await createPromo({
      shopName,
      upjong: selectedUpjong,
      upjongCode: selectedUpjongCode,
      address,
      intro,
      detail,
      openHours,
      phone,
      images: selectedPhotos,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    });

    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    if (res?.error === 'daily_limit') {
      toast('오늘 이미 홍보글을 등록했습니다');
      window.location.href = 'promo.html';
      return;
    }

    toast('홍보글이 등록되었습니다!');
    window.location.href = 'promo.html';
  } catch (e) {
    console.error('submitPromo', e);
    toast(e?.message || '등록에 실패했습니다');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '홍보 등록';
    }
  }
}

async function startPromoWritePage() {
  const user = await getCurrentUser();
  if (!user) {
    toast('로그인이 필요합니다');
    window.openLoginModal?.('login');
    return;
  }

  if (await hasTodayPromo(user.id)) {
    document.getElementById('promo-limit-banner')?.style.setProperty('display', 'block');
    document.getElementById('promo-write-form')?.style.setProperty('display', 'none');
    document.getElementById('btn-submit-promo')?.setAttribute('disabled', 'disabled');
    return;
  }

  bindUpjongButtons();
  bindGpsButton();
  renderPhotoGrid();

  document.getElementById('promo-photo-input')?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (selectedPhotos.length + files.length > 3) {
      toast('사진은 최대 3장까지 첨부 가능합니다');
      return;
    }
    selectedPhotos.push(...files.slice(0, 3 - selectedPhotos.length));
    renderPhotoGrid();
    e.target.value = '';
  });

  document.getElementById('intro')?.addEventListener('input', (e) => updateChar(e.target, 'intro-char'));
  document.getElementById('detail')?.addEventListener('input', (e) => updateChar(e.target, 'detail-char'));
  document.getElementById('btn-submit-promo')?.addEventListener('click', submitPromo);
}

bootPage(() => {
  startPromoWritePage().catch(console.error);
});
