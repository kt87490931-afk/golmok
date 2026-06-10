import { getAllPosts } from '../community.js?v=20260665';
import {
  renderPostList,
  renderCommSkeleton,
  loadHotHighlight,
  updateWriteInducer,
  bindCommWriteInducer,
} from '../community_ui.js?v=20260665';
import { initPageShell, bootPage, bindInfiniteScroll, activateTabs } from '../page_common.js';
import { waitForShell } from '../shell_boot.js';

const urlParams = new URLSearchParams(window.location.search);
const initialPostId = urlParams.get('id') || urlParams.get('post');
let currentCategory = urlParams.get('category') || 'all';
let currentSort = 'latest';
let currentPage = 0;
let isLoading = false;
let hasMore = true;

function normalizePosts(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.posts)) return result.posts;
  return [];
}

async function loadCommunityFeed(reset = true) {
  if (isLoading) return;
  isLoading = true;

  const listEl = document.getElementById('community-post-list');

  try {
    if (reset) {
      currentPage = 0;
      hasMore = true;
      renderCommSkeleton('community-post-list');
    }

    const result = await getAllPosts({
      category: currentCategory,
      page: currentPage,
      limit: 20,
      sort: currentSort,
      withCount: reset,
    });

    const posts = normalizePosts(result);
    const totalCount = Array.isArray(result) ? null : result?.count;

    if (reset && totalCount != null) {
      const totalEl = document.getElementById('post-total-count');
      if (totalEl) totalEl.textContent = String(totalCount);
    }

    await renderPostList(posts, 'community-post-list', { reset, append: !reset });
    hasMore = posts.length >= 20;
    if (hasMore) currentPage += 1;
  } catch (e) {
    console.error('loadCommunityFeed', e);
    if (reset && listEl) {
      listEl.innerHTML =
        '<div style="padding:32px;text-align:center;color:#E24B4A;background:#fff;">게시글을 불러오지 못했습니다.<br><span style="font-size:12px;color:#999;margin-top:8px;display:block;">새로고침 후 다시 시도해주세요.</span></div>';
    }
  } finally {
    isLoading = false;
  }
}

function bindCategoryTabs() {
  document.querySelectorAll('.comm-cat-tab, .cat-tab[data-cat]').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentCategory = tab.dataset.cat || 'all';
      const url = new URL(window.location.href);
      if (currentCategory === 'all') url.searchParams.delete('category');
      else url.searchParams.set('category', currentCategory);
      window.history.pushState({}, '', url);
      activateTabs('.comm-cat-tab, .cat-tab[data-cat]', currentCategory);
      loadCommunityFeed(true);
    });
  });
}

function bindSortButtons() {
  document.querySelectorAll('.comm-sort-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentSort = btn.dataset.sort || 'latest';
      document.querySelectorAll('.comm-sort-btn').forEach((b) => b.classList.toggle('act', b === btn));
      loadCommunityFeed(true);
    });
  });
}

function bindHotHighlightMore() {
  document.querySelector('.hot-highlight-more')?.addEventListener('click', () => {
    currentSort = 'popular';
    document.querySelectorAll('.comm-sort-btn').forEach((b) => {
      b.classList.toggle('act', b.dataset.sort === 'popular');
    });
    loadCommunityFeed(true);
    document.getElementById('community-post-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

async function startCommunityPage() {
  await waitForShell();
  initPageShell('community');
  bindCommWriteInducer();
  activateTabs('.comm-cat-tab, .cat-tab[data-cat]', currentCategory);
  bindCategoryTabs();
  bindSortButtons();
  bindHotHighlightMore();
  updateWriteInducer().catch(() => {});
  loadHotHighlight().catch(() => {});

  if (!initialPostId) {
    await loadCommunityFeed(true);
    bindInfiniteScroll(() => {
      if (hasMore && !isLoading) loadCommunityFeed(false);
    });
  }

  window.addEventListener('golmok:posts-changed', () => {
    if (!new URLSearchParams(window.location.search).get('id')) loadCommunityFeed(true);
  });
}

bootPage(() => {
  startCommunityPage().catch((e) => {
    console.error('startCommunityPage', e);
    const listEl = document.getElementById('community-post-list');
    if (listEl) {
      listEl.innerHTML =
        '<div style="padding:32px;text-align:center;color:#E24B4A;background:#fff;">게시판을 초기화하지 못했습니다. 페이지를 새로고침해주세요.</div>';
    }
  });
});
