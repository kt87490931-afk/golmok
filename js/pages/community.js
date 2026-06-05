import { getAllPosts } from '../community.js';
import { renderPostList } from '../community_ui.js';
import { initPageShell, bootPage, bindInfiniteScroll, activateTabs } from '../page_common.js';

const urlParams = new URLSearchParams(window.location.search);
let currentCategory = urlParams.get('category') || 'all';
let currentPage = 0;
let isLoading = false;
let hasMore = true;

async function loadCommunityFeed(reset = true) {
  if (isLoading) return;
  isLoading = true;
  const loader = document.getElementById('loading-indicator');
  if (loader) loader.style.display = 'block';

  if (reset) {
    currentPage = 0;
    hasMore = true;
  }

  try {
    const posts = await getAllPosts({ category: currentCategory, page: currentPage, limit: 20 });
    await renderPostList(posts, 'community-post-list', { reset, append: !reset });
    hasMore = posts.length >= 20;
    if (hasMore) currentPage += 1;
  } catch (e) {
    console.error(e);
    if (reset) {
      document.getElementById('community-post-list').innerHTML =
        '<div style="padding:32px;text-align:center;color:#E24B4A;background:#fff;">게시글을 불러오지 못했습니다.</div>';
    }
  }

  if (loader) loader.style.display = 'none';
  isLoading = false;
}

function bindCategoryTabs() {
  document.querySelectorAll('.cat-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentCategory = tab.dataset.cat || 'all';
      const url = new URL(window.location.href);
      if (currentCategory === 'all') url.searchParams.delete('category');
      else url.searchParams.set('category', currentCategory);
      window.history.pushState({}, '', url);
      activateTabs('.cat-tab', currentCategory);
      loadCommunityFeed(true);
    });
  });
}

bootPage(() => {
  initPageShell('community');
  activateTabs('.cat-tab', currentCategory);
  bindCategoryTabs();
  loadCommunityFeed(true);
  bindInfiniteScroll((reset) => {
    if (hasMore && !isLoading) loadCommunityFeed(false);
  });
  window.addEventListener('golmok:posts-changed', () => loadCommunityFeed(true));
});
