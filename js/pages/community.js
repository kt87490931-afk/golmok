import { getStoriesPosts, getStoriesCombinedFeed } from '../community.js?v=20260716';
import {
  renderPostList,
  renderCommSkeleton,
  loadHotHighlight,
  updateWriteInducer,
  bindCommWriteInducer,
  openPostDetail,
} from '../community_ui.js?v=20260716';
import { initPageShell, bootPage, bindInfiniteScroll, activateTabs } from '../page_common.js';
import { waitForShell } from '../shell_boot.js';

const urlParams = new URLSearchParams(window.location.search);
const initialPostId = urlParams.get('id') || urlParams.get('post');
const storiesScope = urlParams.get('scope') || 'all';
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPromoFeedCard(promo) {
  const card = document.createElement('article');
  card.className = 'comm-post-card promo-feed-card';
  card.dataset.promoId = promo.id;
  card.innerHTML = `
    <div class="comm-post-hd">
      <span class="pcb-badge" style="background:#E8F8F0;color:#1D9E75;">무료홍보</span>
      <strong>${escapeHtml(promo.shop_name || '우리 가게')}</strong>
    </div>
    <p class="comm-post-body">${escapeHtml(promo.intro || '')}</p>
    <div class="comm-post-meta">
      <span><i class="ti ti-map-pin"></i> ${escapeHtml(promo.region_dong || promo.address || '')}</span>
      <span><i class="ti ti-heart"></i> ${promo.like_count || 0}</span>
    </div>`;
  card.addEventListener('click', () => {
    window.location.href = `promo.html#promo-${promo.id}`;
  });
  return card;
}

async function renderStoriesFeed(items, containerId, { reset = true, append = false } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const list = Array.isArray(items) ? items : [];
  if (reset && !append) {
    if (!list.length) {
      container.innerHTML = `<div style="padding:40px;text-align:center;color:#999;background:#fff;">
        <div style="font-size:32px;margin-bottom:10px;">📝</div>
        <div>아직 게시글이 없습니다.</div>
        <div style="font-size:12px;margin-top:4px;">첫 번째 대장님이 되어보세요!</div>
      </div>`;
      return;
    }
    container.innerHTML = '';
  }

  const posts = list.filter((i) => i._feedKind !== 'promo');
  const promos = list.filter((i) => i._feedKind === 'promo');

  if (posts.length) {
    await renderPostList(posts, containerId, { reset: false, append: true });
  }
  promos.forEach((promo) => {
    container.appendChild(renderPromoFeedCard(promo));
  });
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

    let result;
    if (storiesScope === 'all') {
      result = await getStoriesCombinedFeed({
        category: currentCategory,
        page: currentPage,
        limit: 20,
        sort: currentSort,
        withCount: reset,
      });
    } else {
      result = await getStoriesPosts({
        scope: storiesScope,
        category: currentCategory,
        page: currentPage,
        limit: 20,
        sort: currentSort,
        withCount: reset,
      });
    }

    const items = normalizePosts(result);
    const totalCount = Array.isArray(result) ? null : result?.count;

    if (reset && totalCount != null) {
      const totalEl = document.getElementById('post-total-count');
      if (totalEl) totalEl.textContent = String(totalCount);
    }

    if (storiesScope === 'all') {
      await renderStoriesFeed(items, 'community-post-list', { reset, append: !reset });
    } else {
      await renderPostList(items, 'community-post-list', { reset, append: !reset });
    }

    hasMore = items.length >= 20;
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

  if (initialPostId) {
    openPostDetail(initialPostId).catch(() => {});
  } else {
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
