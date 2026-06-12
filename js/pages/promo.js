import {
  getPromos,
  hasTodayPromo,
  togglePromoLike,
  togglePromoRegular,
  resolveUserRegionForPromo,
  getPromoLikedIds,
  getPromoRegularIds,
} from '../promo.js?v=20260711';
import { getCurrentUser } from '../community.js?v=20260711';
import { initPageShell, bootPage, bindInfiniteScroll } from '../page_common.js';
import { waitForShell } from '../shell_boot.js';

const UPJONG_STYLES = {
  음식: 'background:#E1F5EE;color:#085041;',
  소매: 'background:#EEEDFE;color:#3C3489;',
  카페: 'background:#EBF4FF;color:#0C447C;',
  수리: 'background:#FFF1F1;color:#E24B4A;',
  교육: 'background:#FAEEDA;color:#633806;',
  예술: 'background:#EEEDFE;color:#3C3489;',
  숙박: 'background:#E1F5EE;color:#085041;',
  의료: 'background:#EBF4FF;color:#0C447C;',
  기타: 'background:#F5F1E8;color:#555;',
};

let currentRange = 'dong';
let userProfile = null;
let currentPage = 0;
let isLoading = false;
let hasMore = true;

function toast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
  else alert(msg);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTimeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function writePageUrl() {
  const isM = /\/m(\/|$)/.test(window.location.pathname);
  return isM ? 'promo-write.html' : 'promo-write.html';
}

function setWriteButtonState(doneToday) {
  const btn = document.getElementById('btn-write-promo');
  const banner = document.getElementById('promo-done-banner');
  if (doneToday) {
    banner?.classList.add('show');
    if (btn) {
      btn.classList.add('is-disabled');
      btn.title = '오늘 이미 홍보했습니다';
    }
  } else {
    banner?.classList.remove('show');
    if (btn) {
      btn.classList.remove('is-disabled');
      btn.removeAttribute('title');
    }
  }
}

function createPromoCard(promo, isLiked, isRegular) {
  const badgeStyle = UPJONG_STYLES[promo.upjong] || 'background:#F5F1E8;color:#555;';
  const thumb = promo.images?.[0];
  const card = document.createElement('div');
  card.className = 'promo-card';

  card.innerHTML = `
    ${promo.is_featured ? '<div class="promo-card-featured-bar"><i class="ti ti-star"></i> 오늘의 추천 업체</div>' : ''}
    <div class="promo-card-body">
      <div class="promo-card-inner">
        <div class="promo-thumb">
          ${
            thumb
              ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(promo.shop_name)}">`
              : '<i class="ti ti-camera promo-thumb-placeholder"></i>'
          }
        </div>
        <div class="promo-info">
          <div class="promo-shop-name-row">
            <span class="promo-shop-name">${escapeHtml(promo.shop_name)}</span>
            ${
              promo.upjong
                ? `<span class="promo-upjong-badge" style="${badgeStyle}">${escapeHtml(promo.upjong)}</span>`
                : ''
            }
          </div>
          <div class="promo-addr">
            <i class="ti ti-map-pin"></i>
            ${escapeHtml(promo.address || promo.region_dong || promo.users?.region_full || '')}
          </div>
          <div class="promo-intro">${escapeHtml(promo.intro)}</div>
          ${
            promo.open_hours || promo.phone
              ? `<div class="promo-meta">
                  ${
                    promo.open_hours
                      ? `<span><i class="ti ti-clock"></i>${escapeHtml(promo.open_hours)}</span>`
                      : ''
                  }
                  ${
                    promo.phone
                      ? `<span><i class="ti ti-phone"></i>${escapeHtml(promo.phone)}</span>`
                      : ''
                  }
                </div>`
              : ''
          }
          <div class="promo-actions">
            <button type="button" class="promo-action-btn like-btn${isLiked ? ' liked' : ''}" data-id="${promo.id}">
              <i class="ti ti-heart"></i>
              <span class="like-count">${promo.like_count || 0}</span>
            </button>
            <button type="button" class="promo-action-btn comment-btn" data-id="${promo.id}">
              <i class="ti ti-message-circle"></i>
              ${promo.comment_count || 0}
            </button>
            <button type="button" class="promo-action-btn regular-btn${isRegular ? ' regular' : ''}" data-id="${promo.id}" data-shop-user="${promo.user_id}">
              <i class="ti ti-user-star"></i>
              단골 ${isRegular ? '✓' : '등록'}
            </button>
            <span class="promo-time">${getTimeAgo(promo.created_at)}</span>
          </div>
        </div>
      </div>
    </div>`;

  card.querySelector('.like-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const res = await togglePromoLike(promo.id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    const cnt = btn.querySelector('.like-count');
    const n = parseInt(cnt.textContent, 10) || 0;
    if (res.liked) {
      btn.classList.add('liked');
      cnt.textContent = String(n + 1);
    } else {
      btn.classList.remove('liked');
      cnt.textContent = String(Math.max(0, n - 1));
    }
  });

  card.querySelector('.regular-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const res = await togglePromoRegular(promo.id, promo.user_id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    if (res.regular) {
      btn.classList.add('regular');
      btn.innerHTML = '<i class="ti ti-user-star"></i> 단골 ✓';
      toast('단골 등록! 다음 홍보글 알림을 받아요');
    } else {
      btn.classList.remove('regular');
      btn.innerHTML = '<i class="ti ti-user-star"></i> 단골 등록';
      toast('단골 취소');
    }
  });

  card.querySelector('.comment-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toast('댓글 기능은 준비 중입니다');
  });

  return card;
}

async function loadPromoList(reset = true) {
  if (isLoading) return;
  isLoading = true;

  const list = document.getElementById('promo-list');
  const cta = document.getElementById('promo-cta');
  if (!list) {
    isLoading = false;
    return;
  }

  if (reset) {
    currentPage = 0;
    hasMore = true;
    list.innerHTML = '<div class="promo-empty">불러오는 중...</div>';
  }

  try {
    const promos = await getPromos({
      range: currentRange,
      regionDong: userProfile?.region_dong || null,
      page: currentPage,
      limit: 20,
    });

    if (reset) list.innerHTML = '';

    if (!promos.length && reset) {
      if (cta) cta.style.display = 'block';
      list.innerHTML = '<div class="promo-empty"><i class="ti ti-speakerphone" style="font-size:32px;color:#E8E4DC;display:block;margin-bottom:8px;"></i>오늘 등록된 홍보글이 없습니다</div>';
      hasMore = false;
      isLoading = false;
      return;
    }

    if (cta) cta.style.display = 'none';

    const liked = await getPromoLikedIds(promos.map((p) => p.id));
    const regular = await getPromoRegularIds(promos.map((p) => p.id));

    promos.forEach((promo) => {
      list.appendChild(createPromoCard(promo, liked.has(promo.id), regular.has(promo.id)));
    });

    hasMore = promos.length >= 20;
    if (hasMore) currentPage += 1;
  } catch (e) {
    console.error('loadPromoList', e);
    if (reset) {
      list.innerHTML =
        '<div class="promo-empty" style="color:#E24B4A;">홍보글을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.</div>';
    }
  } finally {
    isLoading = false;
  }
}

function bindRangeTabs() {
  document.querySelectorAll('.promo-range-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentRange = tab.dataset.range || 'dong';
      document.querySelectorAll('.promo-range-tab').forEach((t) => t.classList.toggle('act', t === tab));
      loadPromoList(true);
    });
  });
}

async function startPromoPage() {
  await waitForShell();
  initPageShell('promo');

  const user = await getCurrentUser();
  if (user) {
    userProfile = await resolveUserRegionForPromo();
    const done = await hasTodayPromo(user.id);
    setWriteButtonState(done);
  }

  const writeBtn = document.getElementById('btn-write-promo');
  writeBtn?.addEventListener('click', (e) => {
    if (writeBtn.classList.contains('is-disabled')) {
      e.preventDefault();
      toast('오늘 이미 홍보했습니다. 내일 00:00 이후 다시 등록할 수 있어요.');
    }
  });

  bindRangeTabs();
  await loadPromoList(true);
  bindInfiniteScroll(() => {
    if (hasMore && !isLoading) loadPromoList(false);
  });
}

bootPage(() => {
  startPromoPage().catch((e) => {
    console.error('startPromoPage', e);
  });
});
