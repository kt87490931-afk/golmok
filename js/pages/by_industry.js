import { getPostsByIndustry } from '../community.js?v=20260664';
import { renderPostList, renderCommSkeleton, bindCommWriteInducer, updateWriteInducer } from '../community_ui.js';
import { initPageShell, bootPage } from '../page_common.js';
import { loadStoreStatus } from '../store-status.js?v=20260629';
import { getCurrentUser, getUserProfile } from '../community.js?v=20260664';

let selectedIndustryCode = '';
let userRegionFull = '경기 화성시 동탄2동';

function activateIndustryBtn(btn) {
  document.querySelectorAll('.industry-btn').forEach((b) => {
    b.style.background = '#fff';
    b.style.borderColor = '#E8E4DC';
    const label = b.querySelector('.industry-label');
    if (label) label.style.color = '#555';
    b.classList.remove('act');
  });
  btn.style.background = '#FFF8E7';
  btn.style.borderColor = '#F5A623';
  const label = btn.querySelector('.industry-label');
  if (label) label.style.color = '#C17F24';
  btn.classList.add('act');
}

async function loadIndustryFeed() {
  renderCommSkeleton('industry-post-list');

  try {
    const posts = await getPostsByIndustry(selectedIndustryCode || null, { page: 0, limit: 30 });
    const countEl = document.getElementById('industry-post-count');
    if (countEl) countEl.textContent = String(posts.length);
    await renderPostList(posts, 'industry-post-list', { reset: true });
    await loadStoreStatus(selectedIndustryCode, userRegionFull);
  } catch (e) {
    console.error(e);
    const list = document.getElementById('industry-post-list');
    if (list) list.innerHTML = '<div style="padding:24px;text-align:center;color:#E24B4A;background:#fff;">불러오지 못했습니다</div>';
  }
}

async function resolveUserRegion() {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const profile = await getUserProfile(user.id);
    if (profile?.region_full) userRegionFull = profile.region_full;
  } catch (e) {
    console.warn(e);
  }
}

bootPage(() => {
  initPageShell('by-industry');
  bindCommWriteInducer();
  updateWriteInducer().catch(() => {});
  resolveUserRegion();
  document.querySelectorAll('.industry-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activateIndustryBtn(btn);
      selectedIndustryCode = btn.dataset.code || '';
      document.getElementById('selected-industry-name').textContent = btn.dataset.name || '전체';
      loadIndustryFeed();
    });
  });
  loadIndustryFeed();
  window.addEventListener('golmok:posts-changed', () => loadIndustryFeed());
});
