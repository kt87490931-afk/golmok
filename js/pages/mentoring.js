import { getMentoringPosts } from '../community.js?v=20260710';
import {
  renderPostList,
  renderCommSkeleton,
  updateWriteInducer,
  bindCommWriteInducer,
} from '../community_ui.js?v=20260710';
import { initPageShell, bootPage, bindInfiniteScroll, activateTabs } from '../page_common.js';
import { waitForShell } from '../shell_boot.js';

window.__golmokWriteBoard = 'mentoring';

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

function bindScoreBanner() {
  const banner = document.getElementById('gm-score-banner');
  const closeBtn = document.getElementById('gm-score-banner-close');
  if (!banner) return;

  try {
    if (localStorage.getItem('gm_score_banner_closed') === '1') {
      banner.style.display = 'none';
      return;
    }
  } catch (e) {}

  closeBtn?.addEventListener('click', () => {
    banner.style.display = 'none';
    try {
      localStorage.setItem('gm_score_banner_closed', '1');
    } catch (e) {}
  });
}

function syncWriteCategoryFromTab() {
  const active = document.querySelector('.mentoring-cat-tab.act[data-cat]');
  const cat = active?.dataset.cat;
  if (!cat || cat === 'all') return;
  window.__golmokSelectedMentoringCategory = cat;
  document.querySelectorAll('.mentoring-write-cats .cat-select-btn').forEach((btn) => {
    btn.classList.toggle('act', btn.dataset.cat === cat);
  });
}

function bindMentoringWrite() {
  document.querySelectorAll('.write-inducer, #write-btn-m, [data-open-write]').forEach((el) => {
    el.addEventListener('click', () => {
      window.__golmokWriteBoard = 'mentoring';
      syncWriteCategoryFromTab();
    });
  });

  window.addEventListener('golmok:write-open', () => {
    window.__golmokWriteBoard = 'mentoring';
    syncWriteCategoryFromTab();
  });
}

async function loadMentoringFeed(reset = true) {
  if (isLoading) return;
  isLoading = true;

  const listEl = document.getElementById('mentoring-post-list');

  try {
    if (reset) {
      currentPage = 0;
      hasMore = true;
      renderCommSkeleton('mentoring-post-list');
    }

    const result = await getMentoringPosts({
      category: currentCategory,
      page: currentPage,
      limit: 20,
      sort: currentSort,
      withCount: reset,
    });

    const posts = normalizePosts(result);
    const totalCount = Array.isArray(result) ? null : result?.count;

    if (reset && totalCount != null) {
      const totalEl = document.getElementById('mentoring-total-count');
      if (totalEl) totalEl.textContent = String(totalCount);
    }

    await renderPostList(posts, 'mentoring-post-list', { reset, append: !reset });
    hasMore = posts.length >= 20;
    if (hasMore) currentPage += 1;
  } catch (e) {
    console.error('loadMentoringFeed', e);
    if (reset && listEl) {
      listEl.innerHTML =
        '<div style="padding:32px;text-align:center;color:#E24B4A;background:#fff;">게시글을 불러오지 못했습니다.<br><span style="font-size:12px;color:#999;margin-top:8px;display:block;">새로고침 후 다시 시도해주세요.</span></div>';
    }
  } finally {
    isLoading = false;
  }
}

function bindCategoryTabs() {
  document.querySelectorAll('.mentoring-cat-tab[data-cat]').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentCategory = tab.dataset.cat || 'all';
      if (currentCategory !== 'all') {
        window.__golmokSelectedMentoringCategory = currentCategory;
      }
      const url = new URL(window.location.href);
      if (currentCategory === 'all') url.searchParams.delete('category');
      else url.searchParams.set('category', currentCategory);
      window.history.pushState({}, '', url);
      activateTabs('.mentoring-cat-tab[data-cat]', currentCategory);
      loadMentoringFeed(true);
    });
  });
}

function bindSortButtons() {
  document.querySelectorAll('.mentoring-sort-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentSort = btn.dataset.sort || 'latest';
      document.querySelectorAll('.mentoring-sort-btn').forEach((b) => b.classList.toggle('act', b === btn));
      loadMentoringFeed(true);
    });
  });
}

async function startMentoringPage() {
  await waitForShell();
  initPageShell('mentoring');
  bindScoreBanner();
  bindCommWriteInducer();
  bindMentoringWrite();
  activateTabs('.mentoring-cat-tab[data-cat]', currentCategory);
  bindCategoryTabs();
  bindSortButtons();
  updateWriteInducer().catch(() => {});

  if (!initialPostId) {
    await loadMentoringFeed(true);
    bindInfiniteScroll(() => {
      if (hasMore && !isLoading) loadMentoringFeed(false);
    });
  }

  window.addEventListener('golmok:posts-changed', () => {
    if (!new URLSearchParams(window.location.search).get('id')) loadMentoringFeed(true);
  });
}

bootPage(() => {
  startMentoringPage().catch((e) => {
    console.error('startMentoringPage', e);
    const listEl = document.getElementById('mentoring-post-list');
    if (listEl) {
      listEl.innerHTML =
        '<div style="padding:32px;text-align:center;color:#E24B4A;background:#fff;">멘토링 게시판을 초기화하지 못했습니다. 페이지를 새로고침해주세요.</div>';
    }
  });
});
