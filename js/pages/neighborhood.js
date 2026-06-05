import { getCurrentUser, getUserProfile, getDongPosts, getSigunguPosts, getAllPosts, getEventPosts } from '../community.js?v=20260624';
import { renderPostList, openPostDetail } from '../community_ui.js';
import { initPageShell, bootPage, activatePillButtons } from '../page_common.js';

let rangeType = 'dong';
let userProfile = null;

function renderEventCards(events) {
  const grid = document.getElementById('neighborhood-events');
  if (!grid) return;
  if (!events.length) {
    grid.innerHTML = '<div style="padding:16px;color:#999;font-size:13px;">?깅줉???대깽?맞룹씠?덇? ?놁뒿?덈떎.</div>';
    return;
  }
  grid.innerHTML = events
    .map(
      (ev) => `<div class="ev-card-new" data-post-id="${ev.id}" style="min-width:220px;cursor:pointer;">
      <div class="ev-card-top discount"><div class="ev-name-new">${(ev.title || ev.content?.slice(0, 40) || '?대깽??).replace(/</g, '&lt;')}</div></div>
      <div class="ev-card-bottom"><div class="ev-shop-new">${(ev.users?.nickname || '??λ떂').replace(/</g, '&lt;')}</div></div>
    </div>`
    )
    .join('');
  grid.style.display = 'flex';
  grid.style.gap = '10px';
  grid.style.overflowX = 'auto';
  grid.querySelectorAll('[data-post-id]').forEach((el) => {
    el.addEventListener('click', () => openPostDetail(el.dataset.postId));
  });
}

async function loadNeighborhoodFeed(reset = true) {
  if (!userProfile) return;
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
  const wrap = document.getElementById('neighborhood-content');
  const user = await getCurrentUser();

  if (!user) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:60px 20px;background:#fff;border-radius:12px;border:1px solid #E8E4DC;">
        <div style="font-size:48px;margin-bottom:16px;">?뱧</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;">濡쒓렇?몄씠 ?꾩슂?⑸땲??/div>
        <div style="font-size:14px;color:#999;margin-bottom:20px;">?곕━?숇꽕 ?쇰뱶??濡쒓렇?????댁슜?????덉뼱??/div>
        <button type="button" id="nb-login-btn" style="background:#F5A623;color:#fff;border:none;border-radius:20px;padding:10px 24px;font-size:14px;cursor:pointer;">濡쒓렇?명븯湲?/button>
      </div>`;
    document.getElementById('nb-login-btn')?.addEventListener('click', () => window.openLoginModal?.('login'));
    return;
  }

  userProfile = await getUserProfile(user.id);
  if (!userProfile?.region_dong) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:60px 20px;background:#fff;border-radius:12px;border:1px solid #E8E4DC;">
        <div style="font-size:48px;margin-bottom:16px;">?뿺截?/div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;">?숇꽕瑜??ㅼ젙?댁＜?몄슂</div>
        <div style="font-size:14px;color:#999;margin-bottom:20px;">?곕━?숇꽕 ?쇰뱶瑜?蹂대젮硫??쒕룞 吏??쓣 ?ㅼ젙?댁빞 ?댁슂</div>
        <button type="button" id="nb-profile-btn" style="background:#F5A623;color:#fff;border:none;border-radius:20px;padding:10px 24px;font-size:14px;cursor:pointer;">?뚯썝媛???꾨줈???ㅼ젙</button>
      </div>`;
    document.getElementById('nb-profile-btn')?.addEventListener('click', () => window.openLoginModal?.('signup'));
    return;
  }

  document.getElementById('current-region').textContent = userProfile.region_full || userProfile.region_dong;

  document.querySelectorAll('.range-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activatePillButtons('.range-btn', btn);
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
  initNeighborhood().catch(console.error);
});
