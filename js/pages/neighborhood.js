import { getCurrentUser, getUserProfile, getDongPosts, getSigunguPosts, getAllPosts, getEventPosts } from '../community.js?v=20260664';
import { renderPostList, renderCommSkeleton, openPostDetail, bindCommWriteInducer, updateWriteInducer } from '../community_ui.js';
import { initPageShell, bootPage } from '../page_common.js';

let rangeType = 'dong';
let userProfile = null;

function renderEventCards(events) {
  const grid = document.getElementById('neighborhood-events');
  if (!grid) return;
  if (!events.length) {
    grid.innerHTML = '<div style="padding:16px;color:#999;font-size:13px;min-width:200px;">등록된 이벤트·이슈가 없습니다.</div>';
    return;
  }
  grid.innerHTML = events
    .map(
      (ev) => `<div class="ev-card-new" data-post-id="${ev.id}" style="min-width:220px;cursor:pointer;">
      <div class="ev-card-top discount"><div class="ev-name-new">${(ev.title || ev.content?.slice(0, 40) || '이벤트').replace(/</g, '&lt;')}</div></div>
      <div class="ev-card-bottom"><div class="ev-shop-new">${(ev.users?.nickname || '대장님').replace(/</g, '&lt;')}</div></div>
    </div>`
    )
    .join('');
  grid.querySelectorAll('[data-post-id]').forEach((el) => {
    el.addEventListener('click', () => openPostDetail(el.dataset.postId));
  });
}

async function loadNeighborhoodFeed(reset = true) {
  if (!userProfile) return;
  if (reset) renderCommSkeleton('neighborhood-post-list');

  let posts = [];
  if (rangeType === 'dong') {
    posts = await getDongPosts({ regionDong: userProfile.region_dong, category: 'all', page: 0, limit: 30 });
  } else if (rangeType === 'sigungu') {
    posts = await getSigunguPosts({ regionSigungu: userProfile.region_sigungu, category: 'all', page: 0, limit: 30 });
  } else {
    posts = await getAllPosts({ category: 'all', page: 0, limit: 30 });
  }
  await renderPostList(posts, 'neighborhood-post-list', { reset });
}

async function initNeighborhood() {
  initPageShell('neighborhood');
  bindCommWriteInducer();
  updateWriteInducer().catch(() => {});

  const wrap = document.getElementById('board-list-view');
  const user = await getCurrentUser();

  if (!user) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:60px 20px;background:#fff;border-radius:12px;border:1px solid #E8E4DC;margin:16px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">🔒</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;">로그인이 필요합니다</div>
        <div style="font-size:14px;color:#999;margin-bottom:20px;">우리동네 피드를 보려면 로그인 후 이용해주세요</div>
        <button type="button" id="nb-login-btn" style="background:#F5A623;color:#fff;border:none;border-radius:20px;padding:10px 24px;font-size:14px;cursor:pointer;">로그인하기</button>
      </div>`;
    document.getElementById('nb-login-btn')?.addEventListener('click', () => window.openLoginModal?.('login'));
    return;
  }

  userProfile = await getUserProfile(user.id);
  if (!userProfile?.region_dong) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:60px 20px;background:#fff;border-radius:12px;border:1px solid #E8E4DC;margin:16px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">📍</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;">동네를 설정해주세요</div>
        <div style="font-size:14px;color:#999;margin-bottom:20px;">우리동네 피드를 보려면 동네 지역을 설정해야 해요</div>
        <button type="button" id="nb-profile-btn" style="background:#F5A623;color:#fff;border:none;border-radius:20px;padding:10px 24px;font-size:14px;cursor:pointer;">회원가입·프로필 설정</button>
      </div>`;
    document.getElementById('nb-profile-btn')?.addEventListener('click', () => window.openLoginModal?.('signup'));
    return;
  }

  document.getElementById('current-region').textContent = userProfile.region_full || userProfile.region_dong;

  document.querySelectorAll('.range-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn').forEach((b) => b.classList.remove('act'));
      btn.classList.add('act');
      rangeType = btn.dataset.range;
      loadNeighborhoodFeed(true);
    });
  });

  const events = await getEventPosts({ regionDong: userProfile.region_dong, limit: 6 });
  renderEventCards(events);
  await loadNeighborhoodFeed(true);
  window.addEventListener('golmok:posts-changed', () => loadNeighborhoodFeed(true));
}

bootPage(() => {
  initPageShell('neighborhood');
  if (new URLSearchParams(window.location.search).get('id')) return;
  initNeighborhood().catch(console.error);
});
