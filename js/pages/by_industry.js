import { getPostsByIndustry } from '../community.js';
import { renderPostList } from '../community_ui.js';
import { initPageShell, bootPage } from '../page_common.js';

let selectedIndustryCode = '';

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
  const list = document.getElementById('industry-post-list');
  if (list) list.innerHTML = '<div style="padding:20px;text-align:center;color:#999;background:#fff;">불러오는 중...</div>';

  try {
    const posts = await getPostsByIndustry(selectedIndustryCode || null, { page: 0, limit: 30 });
    const countEl = document.getElementById('industry-post-count');
    if (countEl) countEl.textContent = `${posts.length}개의 게시글`;
    await renderPostList(posts, 'industry-post-list', { reset: true });
  } catch (e) {
    console.error(e);
    if (list) list.innerHTML = '<div style="padding:24px;text-align:center;color:#E24B4A;background:#fff;">불러오지 못했습니다.</div>';
  }
}

bootPage(() => {
  initPageShell('by-industry');
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
