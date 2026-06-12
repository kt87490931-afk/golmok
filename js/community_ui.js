import {
  getCurrentUser,
  getUserProfile,
  getAllPosts,
  getDongPosts,
  getSigunguPosts,
  getEventPosts,
  getPost,
  createPost,
  toggleLike,
  toggleBookmark,
  getComments,
  createComment,
  deletePost,
  deleteComment,
  toggleFollow,
  getLikedPostIds,
  getBookmarkedPostIds,
  isLiked,
  isFollowing,
  getNeighborUsers,
  getFollowingIds,
  getHotPosts,
  getPopularAreas,
} from './community.js?v=20260710';
import { uploadImages, createImagePreview } from './upload.js';
import { sendCommentNotification } from './fcm.js';
import { waitForShell } from './shell_boot.js';

const DEFAULT_REGION = {
  region_sido: '경기',
  region_sigungu: '화성시',
  region_dong: '동탄2동',
  region_full: '경기 화성시 동탄2동',
};

let currentFeedType = 'dong';
let currentCategory = 'all';
let currentPage = 0;
let isLoading = false;
let hasMore = true;
let selectedWriteCategory = 'qna';
let currentWriteBoard = 'community';
let replyTargetId = null;
let userRegion = { ...DEFAULT_REGION };
let selectedImages = [];

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
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function getTimeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function getCategoryLabel(category) {
  const labels = {
    all: '전체',
    qna: '질문·고민',
    info: '정보공유',
    startup: '창업준비',
    issue: '이슈',
    event: '이벤트',
    question: '질문',
    knowhow: '노하우',
    success: '성공사례',
    failure: '실패담',
  };
  return labels[category] || '전체';
}

function getCategoryStyle(category) {
  const styles = {
    qna: 'background:#FAEEDA;color:#633806;',
    info: 'background:#E1F5EE;color:#085041;',
    startup: 'background:#EEEDFE;color:#3C3489;',
    issue: 'background:#FFF1F1;color:#E24B4A;',
    event: 'background:#EBF4FF;color:#0C447C;',
    question: 'background:#EBF4FF;color:#0C447C;',
    knowhow: 'background:#E1F5EE;color:#085041;',
    success: 'background:#FFF8E7;color:#8B5A10;',
    failure: 'background:#FFF1F1;color:#E24B4A;',
  };
  return styles[category] || 'background:#F5F1E8;color:#555;';
}

function golmokScoreBadgeHtml(score) {
  const n = Number(score) || 0;
  if (n <= 0) return '';
  return `<span class="golmok-score-badge" title="골목지수">${n}</span>`;
}

function resolveWriteBoard() {
  if (window.__golmokWriteBoard) return window.__golmokWriteBoard;
  const active = document.body?.dataset?.gmActive;
  if (active === 'mentoring') return 'mentoring';
  return 'community';
}

function syncWriteCategoryPanels() {
  const board = resolveWriteBoard();
  currentWriteBoard = board;
  const genericCats = document.querySelector('.write-cats:not(.mentoring-write-cats)');
  const mentoringCats = document.querySelector('.mentoring-write-cats');
  if (mentoringCats) {
    const isMentoring = board === 'mentoring';
    mentoringCats.style.display = isMentoring ? 'flex' : 'none';
    if (genericCats) genericCats.style.display = isMentoring ? 'none' : 'flex';
  }
  if (board === 'mentoring' && window.__golmokSelectedMentoringCategory) {
    selectedWriteCategory = window.__golmokSelectedMentoringCategory;
    document.querySelectorAll('.mentoring-write-cats .cat-select-btn').forEach((btn) => {
      btn.classList.toggle('act', btn.dataset.cat === selectedWriteCategory);
    });
  }
}

function parseRangeLabel(label) {
  const t = (label || '').replace(/\s/g, '');
  if (t.includes('인근')) return 'sigungu';
  if (t.includes('전체')) return 'all';
  return 'dong';
}

function isDbPermissionError(err) {
  const msg = String(err?.message || err?.details || '');
  return err?.code === '42501' || msg.includes('permission denied');
}

function feedLoadErrorHtml(err) {
  if (isDbPermissionError(err)) {
    return `<div style="padding:32px 16px;text-align:center;color:#E24B4A;line-height:1.6;">
      <p style="font-weight:600;margin-bottom:8px;">DB 권한 설정이 필요합니다</p>
      <p style="font-size:13px;color:#555;">Supabase SQL Editor에서<br><code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">golmok/sql/community_grants_and_rpc.sql</code><br>파일을 실행한 뒤 새로고침해주세요.</p>
    </div>`;
  }
  return `<div style="padding:32px;text-align:center;color:#E24B4A;">게시글을 불러오지 못했습니다.<br><span style="font-size:12px;color:#999;">${escapeHtml(err?.message || '네트워크 또는 로그인 상태를 확인해주세요.')}</span></div>`;
}

function renderPostImagesHtml(images) {
  if (!images?.length) return '';
  const urls = images.slice(0, 4);
  const count = urls.length;
  const countClass = count === 1 ? 'pcimgs--single' : count === 2 ? 'pcimgs--duo' : 'pcimgs--multi';

  const items = urls
    .map((url, idx) => {
      const hero = count >= 3 && idx === 0 ? ' pcimg-wrap--hero' : '';
      return `<div class="pcimg-wrap${hero}"><img src="${escapeHtml(url)}" alt="" class="pcimg" loading="lazy"></div>`;
    })
    .join('');

  return `<div class="pcimgs ${countClass}">${items}</div>`;
}

function updateImageCountLabel() {
  const countEl = document.getElementById('image-count');
  if (countEl) countEl.textContent = selectedImages.length > 0 ? `(${selectedImages.length}/4)` : '';
}

async function rerenderImagePreviews() {
  const previewWrap = document.getElementById('image-preview-wrap');
  if (!previewWrap) return;
  previewWrap.innerHTML = '';
  if (!selectedImages.length) {
    previewWrap.style.display = 'none';
    updateImageCountLabel();
    return;
  }
  previewWrap.style.display = 'flex';
  for (let idx = 0; idx < selectedImages.length; idx += 1) {
    const file = selectedImages[idx];
    const previewUrl = await createImagePreview(file);
    const div = document.createElement('div');
    div.style.cssText = 'position:relative;width:80px;height:80px;';
    div.innerHTML = `
      <img src="${previewUrl}" alt="미리보기" style="width:80px;height:80px;object-fit:cover;border-radius:8px;">
      <button type="button" data-rm-idx="${idx}" style="position:absolute;top:-6px;right:-6px;background:#E24B4A;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;line-height:1;">×</button>`;
    div.querySelector('button')?.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedImages.splice(idx, 1);
      rerenderImagePreviews();
    });
    previewWrap.appendChild(div);
  }
  updateImageCountLabel();
}

function resetSelectedImages() {
  selectedImages = [];
  const input = document.getElementById('image-file-input');
  if (input) input.value = '';
  rerenderImagePreviews();
}

function bindImageUpload() {
  document.getElementById('btn-photo-upload')?.addEventListener('click', () => {
    document.getElementById('image-file-input')?.click();
  });

  document.getElementById('image-file-input')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (selectedImages.length + files.length > 4) {
      toast('이미지는 최대 4장까지 첨부 가능합니다');
      return;
    }
    selectedImages.push(...files);
    await rerenderImagePreviews();
    e.target.value = '';
  });
}

window.triggerImageUpload = () => document.getElementById('image-file-input')?.click();

function getPostListEl() {
  return document.getElementById('post-list');
}

function getWriteOverlay() {
  const el = document.getElementById('write-modal') || document.getElementById('wr-overlay');
  if (el?.classList.contains('overlay')) return el;
  return el;
}

async function openWriteOverlay() {
  const ov = getWriteOverlay();
  if (!ov) return;
  currentWriteBoard = resolveWriteBoard();
  syncWriteCategoryPanels();
  await resolveUserRegion();
  updateWriteAutoTagsUI();
  ov.classList.add('open');
  window.dispatchEvent(new CustomEvent('golmok:write-open'));
}

function openWriteWithPhoto() {
  openWriteOverlay();
  setTimeout(() => document.getElementById('image-file-input')?.click(), 120);
}

function getPostContentInput() {
  return document.getElementById('post-content') || document.getElementById('post-txt');
}

function getSubmitPostBtn() {
  return document.getElementById('submit-post') || document.getElementById('post-sub');
}

async function resolveUserRegion() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      userRegion = { ...DEFAULT_REGION };
      return userRegion;
    }
    const profile = await getUserProfile(user.id);
    userRegion = {
      region_sido: profile?.region_sido || DEFAULT_REGION.region_sido,
      region_sigungu: profile?.region_sigungu || DEFAULT_REGION.region_sigungu,
      region_dong: profile?.region_dong || DEFAULT_REGION.region_dong,
      region_full: profile?.region_full || DEFAULT_REGION.region_full,
      upjong1cd: profile?.upjong1cd || null,
      upjong1nm: profile?.upjong1nm || null,
      upjong3nm: profile?.upjong3nm || null,
    };
  } catch (e) {
    userRegion = { ...DEFAULT_REGION };
  }
  return userRegion;
}

function updateWriteAutoTagsUI() {
  const wrap = document.getElementById('write-auto-tags');
  if (!wrap) return;

  const loc = userRegion.region_full || userRegion.region_dong || '';
  const upjong = userRegion.upjong3nm || userRegion.upjong1nm || '';
  const chipStyle =
    'display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:16px;font-size:11px;font-weight:500;';

  if (!loc && !upjong) {
    wrap.style.display = 'block';
    wrap.innerHTML =
      '<span style="font-size:11px;color:var(--text3,var(--t3));line-height:1.5;">프로필에 위치·업종을 설정하면 글에 자동으로 붙습니다. <a href="profile.html" style="color:var(--chd);font-weight:500;">프로필 설정</a></span>';
    return;
  }

  const chips = [];
  if (loc) {
    chips.push(
      `<span style="${chipStyle}background:#EBF4FF;color:#0C447C;"><i class="ti ti-map-pin"></i>${escapeHtml(loc)}</span>`
    );
  }
  if (upjong) {
    chips.push(
      `<span style="${chipStyle}background:var(--chl);color:var(--chdd);"><i class="ti ti-tag"></i>${escapeHtml(upjong)}</span>`
    );
  }

  wrap.style.display = 'flex';
  wrap.innerHTML = `<span style="font-size:10px;color:var(--text3,var(--t3));font-weight:600;align-self:center;margin-right:4px;">자동 적용</span>${chips.join('')}`;
}

function showLocationTagInfo() {
  const loc = userRegion.region_full || userRegion.region_dong;
  if (!loc) {
    toast('위치가 없습니다. 프로필 설정에서 동네를 선택해주세요.');
    return;
  }
  toast(`프로필 위치가 이 글에 자동 적용됩니다: ${loc}`);
}

function showUpjongTagInfo() {
  const upjong = userRegion.upjong3nm || userRegion.upjong1nm;
  if (!upjong) {
    toast('업종이 없습니다. 프로필 설정에서 업종을 선택해주세요.');
    return;
  }
  toast(`프로필 업종이 이 글에 자동 적용됩니다: ${upjong}`);
}

async function fetchPostsPage(page) {
  const opts = { category: currentCategory, page, limit: 20 };

  if (currentFeedType === 'all') return getAllPosts(opts);
  if (currentFeedType === 'dong') {
    return getDongPosts({ regionDong: userRegion.region_dong, ...opts });
  }
  if (currentFeedType === 'sigungu') {
    return getSigunguPosts({ regionSigungu: userRegion.region_sigungu, ...opts });
  }
  return getAllPosts(opts);
}

export async function loadFeed(reset = true) {
  if (isLoading) return;
  isLoading = true;

  const list = getPostListEl();
  if (!list) {
    isLoading = false;
    return;
  }

  if (reset) {
    currentPage = 0;
    hasMore = true;
    if (usesV2Cards(list)) renderCommSkeleton(list);
    else list.innerHTML = '<div class="feed-loading" style="padding:24px;text-align:center;color:#999;">불러오는 중...</div>';
  }

  await resolveUserRegion();

  try {
    const posts = await fetchPostsPage(currentPage);
    if (reset) list.innerHTML = '';

    if (!posts.length && currentPage === 0) {
      list.innerHTML = usesV2Cards(list)
        ? renderCommEmptyHtml()
        : '<div style="padding:40px 16px;text-align:center;color:#999;"><p>아직 게시글이 없습니다.</p><p>첫 번째 대장님이 되어보세요!</p></div>';
      list.querySelector('[data-open-write]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openWriteOverlay();
      });
      hasMore = false;
    } else {
      const liked = await getLikedPostIds(posts.map((p) => p.id));
      const saved = await getBookmarkedPostIds(posts.map((p) => p.id));
      const useV2 = usesV2Cards(list);
      posts.forEach((post) =>
        list.appendChild(
          useV2
            ? createPostCardV2(post, liked, saved, 'post-list')
            : createPostCard(post, liked, saved, 'post-list')
        )
      );
      hasMore = posts.length >= 20;
      currentPage += 1;
    }

    await loadEventSection();
    loadNeighborSection().catch(() => {});
  } catch (e) {
    console.error(e);
    if (reset) list.innerHTML = feedLoadErrorHtml(e);
    toast(isDbPermissionError(e) ? 'DB 권한 SQL 실행이 필요합니다' : '피드 로드 실패');
  }

  isLoading = false;
}

async function loadEventSection() {
  const grid =
    document.getElementById('event-grid') ||
    document.getElementById('evt-grid') ||
    document.querySelector('.ev-scroll-wrap');
  const badge = document.querySelector('.event-count-badge') || document.querySelector('.ev-cnt-badge');
  if (!grid || currentFeedType === 'all') return;

  try {
    const events = await getEventPosts({
      regionDong: currentFeedType === 'dong' ? userRegion.region_dong : null,
      regionSigungu: currentFeedType === 'sigungu' ? userRegion.region_sigungu : null,
      limit: 6,
    });

    if (badge) badge.textContent = String(events.length);

    const isMobile = !!document.querySelector('.ev-scroll-wrap');

    if (!events.length) {
      grid.innerHTML = isMobile
        ? '<div class="ev-card-m" style="min-width:200px;opacity:0.7;"><div class="ev-card-m-bottom" style="padding:16px;"><div class="ev-shop-m">등록된 이벤트가 없습니다</div></div></div>'
        : '<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;font-size:13px;">등록된 이벤트·이슈가 없습니다. 이벤트 카테고리로 첫 글을 올려보세요!</div>';
      return;
    }
    grid.innerHTML = events
      .map((ev) => {
        const title = escapeHtml(ev.title || ev.content?.slice(0, 40) || '이벤트');
        const shop = escapeHtml(ev.users?.nickname || '대장님');
        const date = ev.event_end_date ? `~${ev.event_end_date}` : getTimeAgo(ev.created_at);
        if (isMobile) {
          return `<div class="ev-card-m" data-post-id="${ev.id}">
            <div class="ev-card-m-top discount">
              <div class="ev-type-row-m"><span class="ev-chip-m discount"><i class="ti ti-speakerphone"></i> 이벤트</span></div>
              <div class="ev-name-m">${title}</div>
            </div>
            <div class="ev-card-m-bottom">
              <div class="ev-shop-m"><i class="ti ti-store"></i> ${shop}</div>
              <div class="ev-date-m"><i class="ti ti-calendar"></i> ${date}</div>
            </div>
          </div>`;
        }
        const isV3Evt = grid.classList.contains('evt-grid') || !!grid.closest('.evt-wrap');
        if (isV3Evt) {
          return `<div class="evt-card" data-post-id="${ev.id}" style="cursor:pointer;">
          <div class="evt-top" style="background:#FFF8E7">
            <span class="evt-chip" style="background:var(--gold)">이벤트</span>
            <div class="evt-name">${title}</div>
          </div>
          <div class="evt-bot">${shop} · ${date}</div>
        </div>`;
        }
        return `<div class="ev-card-new" data-post-id="${ev.id}" style="cursor:pointer;">
          <div class="ev-card-top discount">
            <div class="ev-type-row"><span class="ev-type-chip discount"><i class="ti ti-speakerphone"></i> 이벤트</span></div>
            <div class="ev-name-new">${title}</div>
          </div>
          <div class="ev-card-bottom">
            <div class="ev-shop-new"><i class="ti ti-store"></i> ${shop}</div>
            <div class="ev-date-new"><i class="ti ti-calendar"></i> ${date}</div>
          </div>
        </div>`;
      })
      .join('');

    grid.querySelectorAll('[data-post-id]').forEach((el) => {
      el.addEventListener('click', () => openPostDetail(el.dataset.postId));
    });
  } catch (e) {
    console.error('event section', e);
  }
}

function avatarHtml(user) {
  if (user?.profile_image) {
    return `<div class="pcav"><img src="${escapeHtml(user.profile_image)}" alt="" class="pcav-img"></div>`;
  }
  const ch = (user?.nickname || '대').charAt(0);
  return `<div class="pcav" style="background:#FAEEDA;color:#633806;">${escapeHtml(ch)}</div>`;
}

const SHELL_BOARD_PAGES = {
  'index.html': { listViewId: 'shell-feed-view', defaultPage: 'index.html' },
  'community.html': { listViewId: 'board-list-view', defaultPage: 'community.html' },
  'mentoring.html': { listViewId: 'board-list-view', defaultPage: 'mentoring.html' },
  'neighborhood.html': { listViewId: 'board-list-view', defaultPage: 'neighborhood.html' },
  'by-industry.html': { listViewId: 'board-list-view', defaultPage: 'by-industry.html' },
  'events.html': { listViewId: 'board-list-view', defaultPage: 'events.html' },
};

const POST_LIST_PAGE_MAP = {
  'community-post-list': 'community.html',
  'mentoring-post-list': 'mentoring.html',
  'post-list': 'index.html',
  'neighborhood-post-list': 'neighborhood.html',
  'industry-post-list': 'by-industry.html',
};

function getCurrentPageFile() {
  const file = window.location.pathname.split('/').pop();
  return file || 'index.html';
}

export function getShellLayout() {
  if (!document.getElementById('shell-post-detail')) return null;
  const page = getCurrentPageFile();
  const cfg = SHELL_BOARD_PAGES[page];
  if (!cfg) return null;
  return { page, listViewId: cfg.listViewId, detailRootId: 'shell-post-detail' };
}

export function getPostPageUrl(postId, basePage) {
  const page = basePage || getCurrentPageFile();
  if (SHELL_BOARD_PAGES[page]) {
    const url = new URL(page, window.location.origin);
    if (page === getCurrentPageFile()) {
      const cur = new URL(window.location.href);
      cur.searchParams.set('id', postId);
      cur.searchParams.delete('post');
      return `${cur.pathname}${cur.search}`;
    }
    url.searchParams.set('id', postId);
    return `${url.pathname}?${url.searchParams.toString()}`;
  }
  return `post.html?id=${encodeURIComponent(postId)}`;
}

export function hideShellPostDetail({ skipPush = false } = {}) {
  const shell = getShellLayout();
  if (!shell) return;
  const listEl = document.getElementById(shell.listViewId);
  const root = document.getElementById(shell.detailRootId);
  if (listEl) listEl.style.display = '';
  if (root) {
    root.style.display = 'none';
    root.innerHTML = '';
  }
  if (!skipPush) {
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    url.searchParams.delete('post');
    window.history.pushState({ view: 'list' }, '', url);
  }
}

export async function showShellPostDetail(postId, { skipPush = false } = {}) {
  const shell = getShellLayout();
  if (!shell) {
    window.location.href = getPostPageUrl(postId);
    return;
  }

  const listEl = document.getElementById(shell.listViewId);
  const root = document.getElementById(shell.detailRootId);
  if (!root) {
    window.location.href = getPostPageUrl(postId, shell.page);
    return;
  }

  if (listEl) listEl.style.display = 'none';
  root.style.display = 'block';
  root.innerHTML = '<div class="pd-loading">불러오는 중...</div>';

  if (!skipPush) {
    const url = new URL(window.location.href);
    url.searchParams.set('id', postId);
    url.searchParams.delete('post');
    window.history.pushState({ view: 'post', postId }, '', url);
  }

  try {
    const post = await getPost(postId);
    const comments = await getComments(postId);
    const liked = await isLiked(postId);
    const authorId = post.users?.id;
    const following = authorId ? await isFollowing(authorId) : false;
    const titleText = post.title || getPostDisplayTitle(post);
    document.title = `${titleText} — 골목대장`;
    const me = await getCurrentUser();
    mountPostDetailPage(root, post, comments, liked, following, { inShell: true, currentUserId: me?.id });
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    console.error(e);
    root.innerHTML =
      '<div class="pd-error">게시글을 불러오지 못했습니다.<br><button type="button" class="pd-back-btn" id="pd-back-to-list">목록으로</button></div>';
    root.querySelector('#pd-back-to-list')?.addEventListener('click', () => hideShellPostDetail());
  }
}

export function navigateToPost(postId) {
  if (!postId) return;
  if (getShellLayout()) {
    showShellPostDetail(postId);
    return;
  }
  window.location.href = getPostPageUrl(postId);
}

function resolvePostUrl(postId, listContainerId) {
  const mapped = listContainerId ? POST_LIST_PAGE_MAP[listContainerId] : null;
  return getPostPageUrl(postId, mapped || undefined);
}

function tryBootShellPostDetail() {
  const shell = getShellLayout();
  if (!shell) return false;
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id') || params.get('post');
  if (!postId) return false;
  showShellPostDetail(postId, { skipPush: true });
  return true;
}

function bindShellPopState() {
  if (window.__golmokShellPopBound) return;
  window.__golmokShellPopBound = true;
  window.addEventListener('popstate', () => {
    const postId = new URLSearchParams(window.location.search).get('id');
    if (postId) showShellPostDetail(postId, { skipPush: true });
    else hideShellPostDetail({ skipPush: true });
  });
}

function getPostDisplayTitle(post) {
  if (post.title?.trim()) return post.title.trim();
  const text = (post.content || '').trim();
  if (!text) return '(내용 없음)';
  const line = text.split('\n').find((l) => l.trim()) || text;
  return line.length > 72 ? `${line.slice(0, 72)}…` : line;
}

function getPostPreview(post) {
  const text = (post.content || '').trim();
  if (!text) return '';
  if (post.title?.trim()) {
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length <= 1) return '';
  const rest = lines.slice(1).join(' ').trim();
  if (!rest) return '';
  return rest.length > 120 ? `${rest.slice(0, 120)}…` : rest;
}

function usesV2Cards(container) {
  if (!container) return false;
  if (container.classList.contains('comm-board-list')) return true;
  return !!container.closest('.comm-wrap, .feed-post-shell');
}

function skeletonCardsHtml(count = 3) {
  return Array(count)
    .fill(0)
    .map(
      () => `<div class="skeleton-card">
        <div class="skeleton-hd">
          <div class="skeleton skeleton-av"></div>
          <div class="skeleton-lines">
            <div class="skeleton skeleton-line" style="width:40%"></div>
            <div class="skeleton skeleton-line" style="width:25%"></div>
          </div>
        </div>
        <div class="skeleton-body">
          <div class="skeleton-text">
            <div class="skeleton skeleton-line" style="width:90%"></div>
            <div class="skeleton skeleton-line" style="width:75%"></div>
          </div>
          <div class="skeleton skeleton-thumb"></div>
        </div>
      </div>`
    )
    .join('');
}

export function renderCommSkeleton(containerIdOrEl, count = 3) {
  const container =
    typeof containerIdOrEl === 'string' ? document.getElementById(containerIdOrEl) : containerIdOrEl;
  if (!container) return;
  container.innerHTML = skeletonCardsHtml(count);
}

function renderCommEmptyHtml() {
  return `<div class="comm-empty">
    <div class="comm-empty-icon">📝</div>
    <div class="comm-empty-title">아직 게시글이 없습니다</div>
    <div class="comm-empty-sub">첫 번째 대장님이 되어보세요!<br>이웃 대장님들과 이야기를 나눠보세요.</div>
    <button type="button" class="comm-empty-btn" data-open-write>
      <i class="ti ti-pencil"></i> 글쓰기
    </button>
  </div>`;
}

function createPostCardV2(post, likedSet, savedSet, listContainerId) {
  const div = document.createElement('div');
  div.className = `post-card-v2${post.is_pinned ? ' pinned' : ''}`;
  div.dataset.postId = post.id;
  div.dataset.cat = post.category;

  const user = post.users || {};
  const liked = likedSet?.has(post.id);
  const saved = savedSet?.has(post.id);
  const images = post.images || [];
  const hasTitle = post.title && post.title.trim().length > 0;
  const preview = getPostPreview(post) || (post.content || '').trim().slice(0, 120);
  const displayTitle = hasTitle ? post.title.trim() : getPostDisplayTitle(post);

  const avHtml = user.profile_image
    ? `<img src="${escapeHtml(user.profile_image)}" alt="">`
    : `<span>${escapeHtml((user.nickname || '대').charAt(0))}</span>`;

  let thumbHtml = '';
  if (images.length === 1) {
    thumbHtml = `<img class="pcv2-thumb" src="${escapeHtml(images[0])}" alt="이미지" loading="lazy"
      onerror="this.style.display='none'">`;
  } else if (images.length >= 2) {
    thumbHtml = `<div class="pcv2-thumb-grid">
      <img src="${escapeHtml(images[0])}" alt="" loading="lazy">
      <img src="${escapeHtml(images[1])}" alt="" loading="lazy">
    </div>`;
  }

  div.innerHTML = `
    <div class="pcv2-hd">
      <div class="pcv2-av">${avHtml}</div>
      <div class="pcv2-info">
        <div class="pcv2-name">
          ${escapeHtml(user.nickname || '대장님')}
          ${golmokScoreBadgeHtml(user.golmok_score)}
          <span class="pcv2-badge" style="${getCategoryStyle(post.category)}">${escapeHtml(getCategoryLabel(post.category))}</span>
          ${post.is_pinned ? '<span class="pcv2-badge" style="background:#FFF8E7;color:#C17F24;">📌 공지</span>' : ''}
        </div>
        <div class="pcv2-meta">
          ${escapeHtml(user.region_full || post.region_full || user.region_dong || '')}
          ${user.follower_count !== undefined ? `· 팔로워 ${user.follower_count || 0}명` : ''}
        </div>
      </div>
      ${post.region_dong ? `<div class="pcv2-loc"><i class="ti ti-map-pin"></i>${escapeHtml(post.region_dong)}</div>` : ''}
    </div>
    <div class="pcv2-body-row">
      <div class="pcv2-text">
        ${hasTitle || displayTitle ? `<div class="pcv2-title">${escapeHtml(displayTitle)}</div>` : ''}
        ${preview ? `<div class="pcv2-preview">${escapeHtml(preview)}</div>` : ''}
      </div>
      ${thumbHtml}
    </div>
    <div class="pcv2-ft">
      <button type="button" class="pcv2-action like-btn${liked ? ' liked' : ''}" data-post-id="${post.id}">
        <i class="ti ti-heart"></i>
        <span class="like-count">${post.like_count || 0}</span>
      </button>
      <button type="button" class="pcv2-action comment-btn" data-post-id="${post.id}">
        <i class="ti ti-message-circle"></i>
        <span>${post.comment_count || 0}</span>
      </button>
      <button type="button" class="pcv2-action share-btn" data-post-id="${post.id}">
        <i class="ti ti-share"></i>
      </button>
      <button type="button" class="pcv2-action save-btn bookmark-btn${saved ? ' saved' : ''}" data-post-id="${post.id}">
        <i class="ti ti-bookmark"></i>
      </button>
      ${post.view_count ? `<span class="pcv2-views"><i class="ti ti-eye"></i> ${post.view_count}</span>` : ''}
      <span class="pcv2-time">${getTimeAgo(post.created_at)}</span>
    </div>`;

  div.querySelector('.like-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const res = await toggleLike(post.id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    const btn = e.currentTarget;
    const count = btn.querySelector('.like-count');
    const n = parseInt(count.textContent, 10) || 0;
    if (res.liked) {
      btn.classList.add('liked');
      count.textContent = n + 1;
      toast('공감했습니다');
    } else {
      btn.classList.remove('liked');
      count.textContent = Math.max(0, n - 1);
    }
  });

  div.querySelector('.bookmark-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const res = await toggleBookmark(post.id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    const btn = e.currentTarget;
    if (res.saved) {
      btn.classList.add('saved');
      toast('저장했습니다');
    } else {
      btn.classList.remove('saved');
      toast('저장 취소');
    }
  });

  div.querySelector('.share-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    sharePost(post.id);
  });

  div.querySelector('.comment-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigateToPost(post.id);
  });

  div.addEventListener('click', () => navigateToPost(post.id));

  return div;
}

export async function loadHotHighlight() {
  const section = document.getElementById('hot-highlight-section');
  const container = document.getElementById('hot-highlight-list');
  if (!container) return;

  try {
    const posts = await getHotPosts(3);
    if (!posts.length) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';

    container.innerHTML = posts
      .map((post, idx) => {
        const title = escapeHtml(post.title || post.content?.replace(/<[^>]*>/g, '').slice(0, 50) || '');
        const thumb = post.images?.[0];
        return `<div class="hot-post-row" data-post-id="${post.id}" role="button" tabindex="0">
          <span class="hot-post-rank ${idx === 0 ? 'top' : ''}">${String(idx + 1).padStart(2, '0')}</span>
          <div class="hot-post-content">
            <div class="hot-post-title">${title}</div>
            <div class="hot-post-meta">
              <span>${escapeHtml(post.users?.nickname || '대장님')}</span>
              <span>❤️ ${post.like_count || 0}</span>
              <span>💬 ${post.comment_count || 0}</span>
              <span>${getTimeAgo(post.created_at)}</span>
            </div>
          </div>
          ${thumb ? `<img class="hot-post-thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        </div>`;
      })
      .join('');

    container.querySelectorAll('.hot-post-row[data-post-id]').forEach((el) => {
      el.addEventListener('click', () => openPostDetail(el.dataset.postId));
    });
  } catch (e) {
    console.error('loadHotHighlight', e);
    if (section) section.style.display = 'none';
  }
}

export async function updateWriteInducer() {
  const av = document.getElementById('write-inducer-av') || document.getElementById('write-av');
  const initial = document.getElementById('write-av-initial');
  const ph = document.querySelector('.write-inducer-ph');
  if (!av) return;

  try {
    const user = await getCurrentUser();
    if (!user) return;
    const profile = await getUserProfile(user.id);
    if (profile?.profile_image) {
      av.innerHTML = `<img src="${escapeHtml(profile.profile_image)}" alt="">`;
    } else if (initial && profile?.nickname) {
      initial.textContent = profile.nickname.charAt(0);
    } else if (profile?.nickname) {
      av.innerHTML = `<span>${escapeHtml(profile.nickname.charAt(0))}</span>`;
    }

    if (ph && document.body?.dataset?.gmActive === 'mentoring') {
      const scoreBadge = golmokScoreBadgeHtml(profile?.golmok_score);
      ph.innerHTML = `대장님, 오늘 어떠셨나요?${scoreBadge}`;
    }
  } catch (e) {
    console.warn('updateWriteInducer', e);
  }
}

export function bindCommWriteInducer() {
  document.querySelectorAll('.write-inducer').forEach((el) => {
    if (el.dataset.boundWrite) return;
    el.dataset.boundWrite = '1';
    el.addEventListener('click', (e) => {
      if (e.target.closest('.write-inducer-btn, .write-inducer-act')) {
        e.stopPropagation();
      }
      if (e.target.closest('.write-inducer-act[data-action="photo"]')) {
        openWriteWithPhoto();
        return;
      }
      if (e.target.closest('.write-inducer-btn')) {
        openWriteOverlay();
        return;
      }
      openWriteOverlay();
    });
    el.querySelector('.write-inducer-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openWriteOverlay();
    });
    el.querySelector('[data-action="photo"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openWriteWithPhoto();
    });
  });
}

function createPostCard(post, likedSet, savedSet, listContainerId) {
  const div = document.createElement('div');
  div.className = 'pc';
  div.dataset.postId = post.id;
  div.dataset.cat = post.category;

  const user = post.users || {};
  const liked = likedSet?.has(post.id);
  const saved = savedSet?.has(post.id);
  const badgeText = post.upjong3nm || user.upjong3nm || getCategoryLabel(post.category);
  const displayTitle = getPostDisplayTitle(post);
  const preview = getPostPreview(post);
  const imageCount = post.images?.length || 0;
  const postUrl = resolvePostUrl(post.id, listContainerId);

  div.innerHTML = `
    <div class="pctop">
      ${avatarHtml(user)}
      <div>
        <span class="pcname pcnm">${escapeHtml(user.nickname || '대장님')}</span>
        <span class="pcbdg" style="${getCategoryStyle(post.category)}">${escapeHtml(badgeText)}</span>
        <div class="pcinfo">${escapeHtml(user.region_full || post.region_full || '')} · 팔로워 ${user.follower_count || 0}명</div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
        ${post.region_dong ? `<span class="pcpin"><i class="ti ti-map-pin"></i> ${escapeHtml(post.region_dong)}</span>` : ''}
      </div>
    </div>
    <a href="${postUrl}" class="pc-link-head">
      <div class="pctit">${escapeHtml(displayTitle)}</div>
      ${preview ? `<div class="pc-preview">${escapeHtml(preview)}</div>` : ''}
      ${imageCount ? `<div class="pc-meta-hint"><i class="ti ti-photo"></i> 사진 ${imageCount}장</div>` : ''}
    </a>
    <div class="pcbot">
      <span class="pca like-btn" data-post-id="${post.id}" style="${liked ? 'color:#E24B4A' : ''}">
        <i class="ti ti-heart" style="${liked ? 'color:#E24B4A' : ''}"></i>
        <span class="cnt like-count">${post.like_count || 0}</span>
      </span>
      <span class="pca comment-btn" data-post-id="${post.id}"><i class="ti ti-message-circle"></i> ${post.comment_count || 0}</span>
      <span class="pca share-btn" data-post-id="${post.id}"><i class="ti ti-share"></i></span>
      <span class="pca save-btn bookmark-btn" data-post-id="${post.id}" style="${saved ? 'color:#F5A623' : ''}"><i class="ti ti-bookmark"></i></span>
      <span class="pct">${getTimeAgo(post.created_at)}</span>
    </div>
  `;

  div.querySelector('.like-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const res = await toggleLike(post.id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    const btn = e.currentTarget;
    const icon = btn.querySelector('i');
    const count = btn.querySelector('.like-count');
    const n = parseInt(count.textContent, 10) || 0;
    if (res.liked) {
      icon.style.color = '#E24B4A';
      btn.style.color = '#E24B4A';
      count.textContent = n + 1;
      toast('공감했습니다');
      const me = await getCurrentUser();
      if (me && post.user_id && post.user_id !== me.id) {
        const profile = await getUserProfile(me.id);
        import('./notifications.js')
          .then((m) =>
            m.notifyLike({
              postOwnerId: post.user_id,
              likerName: profile?.nickname || '대장님',
              postId: post.id,
            })
          )
          .catch(() => {});
      }
    } else {
      icon.style.color = '';
      btn.style.color = '';
      count.textContent = Math.max(0, n - 1);
    }
  });

  div.querySelector('.bookmark-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const res = await toggleBookmark(post.id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    const icon = e.currentTarget.querySelector('i');
    if (res.saved) {
      e.currentTarget.style.color = '#F5A623';
      icon.style.color = '#F5A623';
      toast('저장했습니다');
    } else {
      e.currentTarget.style.color = '';
      icon.style.color = '';
      toast('저장 취소');
    }
  });

  div.querySelector('.share-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    sharePost(post.id);
  });

  div.querySelector('.comment-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigateToPost(post.id);
  });

  return div;
}

export async function renderPostList(posts, containerId, { reset = true, append = false, skeleton = false } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const useV2 = usesV2Cards(container);
  const list = Array.isArray(posts) ? posts : [];

  if (skeleton && reset) {
    renderCommSkeleton(container);
    return;
  }

  if (reset && !append) {
    if (!list.length) {
      container.innerHTML = useV2
        ? renderCommEmptyHtml()
        : `<div style="padding:40px;text-align:center;color:#999;background:#fff;">
          <div style="font-size:32px;margin-bottom:10px;">📝</div>
          <div>아직 게시글이 없습니다.</div>
          <div style="font-size:12px;margin-top:4px;">첫 번째 대장님이 되어보세요!</div>
        </div>`;
      container.querySelector('[data-open-write]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openWriteOverlay();
      });
      return;
    }
    container.innerHTML = '';
  }

  if (!list.length) return;

  try {
    const liked = await getLikedPostIds(list.map((p) => p.id));
    const saved = await getBookmarkedPostIds(list.map((p) => p.id));
    const makeCard = useV2 ? createPostCardV2 : createPostCard;
    list.forEach((post) => container.appendChild(makeCard(post, liked, saved, containerId)));
  } catch (e) {
    console.error('renderPostList', e);
    if (reset) {
      container.innerHTML =
        '<div style="padding:32px;text-align:center;color:#E24B4A;background:#fff;">게시글 표시 중 오류가 발생했습니다.</div>';
    }
  }
}

export function openPostDetail(postId) {
  navigateToPost(postId);
}

export async function initPostDetailPage() {
  const root = document.getElementById('post-detail-root');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id') || params.get('post');
  if (!postId) {
    root.innerHTML =
      '<div class="pd-error">게시글을 찾을 수 없습니다.<br><a href="index.html" style="color:#C17F24;margin-top:8px;display:inline-block;">홈으로</a></div>';
    return;
  }

  root.innerHTML = '<div class="pd-loading">불러오는 중...</div>';

  try {
    const post = await getPost(postId);
    const comments = await getComments(postId);
    const liked = await isLiked(postId);
    const authorId = post.users?.id;
    const following = authorId ? await isFollowing(authorId) : false;
    const titleText = post.title || getPostDisplayTitle(post);
    document.title = `${titleText} — 골목대장`;
    const me = await getCurrentUser();
    mountPostDetailPage(root, post, comments, liked, following, { currentUserId: me?.id });
  } catch (e) {
    console.error(e);
    root.innerHTML =
      '<div class="pd-error">게시글을 불러오지 못했습니다.<br><a href="index.html" style="color:#C17F24;margin-top:8px;display:inline-block;">홈으로</a></div>';
  }
}

function buildCommentsHtml(comments, currentUserId = null) {
  if (!comments.length) {
    return '<div style="color:#999;font-size:13px;text-align:center;padding:20px;">첫 번째 댓글을 남겨보세요!</div>';
  }
  const parents = comments.filter((c) => !c.parent_id);
  const children = comments.filter((c) => c.parent_id);

  return parents
    .map((comment) => {
      const replies = children.filter((c) => c.parent_id === comment.id);
      const user = comment.users || {};
      const repliesHtml = replies
        .map((reply) => {
          const ru = reply.users || {};
          const replyDeleteBtn =
            currentUserId && reply.user_id === currentUserId
              ? `<button type="button" class="comment-delete-btn" data-comment-id="${reply.id}" style="margin-left:8px;font-size:11px;color:#E24B4A;background:none;border:none;cursor:pointer;">삭제</button>`
              : '';
          return `<div style="margin-left:36px;padding:10px 0;border-top:1px solid #F5F5F5;" data-comment-id="${reply.id}">
            <div style="font-size:12px;font-weight:500;">${escapeHtml(ru.nickname || '대장님')} <span style="color:#999;font-weight:400;">${getTimeAgo(reply.created_at)}</span>${replyDeleteBtn}</div>
            <div style="font-size:13px;color:#333;line-height:1.5;margin-top:4px;">${escapeHtml(reply.content)}</div>
          </div>`;
        })
        .join('');

      const commentDeleteBtn =
        currentUserId && comment.user_id === currentUserId
          ? `<button type="button" class="comment-delete-btn" data-comment-id="${comment.id}" style="font-size:11px;color:#E24B4A;background:none;border:none;cursor:pointer;">삭제</button>`
          : '';
      return `<div style="padding:12px 0;border-bottom:1px solid #F5F5F5;" data-comment-id="${comment.id}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:13px;font-weight:500;">${escapeHtml(user.nickname || '대장님')}</span>
          <span style="font-size:11px;color:#999;">${getTimeAgo(comment.created_at)}</span>
          ${commentDeleteBtn}
          <button type="button" data-reply-id="${comment.id}" class="reply-btn" style="margin-left:auto;font-size:11px;color:#F5A623;background:none;border:none;cursor:pointer;">답글</button>
        </div>
        <div style="font-size:13px;color:#333;line-height:1.6;">${escapeHtml(comment.content)}</div>
        ${repliesHtml}
      </div>`;
    })
    .join('');
}

function mountPostDetailPage(
  root,
  post,
  comments,
  liked,
  following = false,
  { inShell = false, currentUserId = null } = {}
) {
  const user = post.users || {};
  const isOwner = currentUserId && (post.user_id === currentUserId || user.id === currentUserId);
  const badgeText = post.upjong3nm || user.upjong3nm || getCategoryLabel(post.category);

  root.innerHTML = `
    ${inShell ? '<button type="button" class="pd-back-btn" id="pd-back-to-list"><i class="ti ti-arrow-left"></i> 목록으로</button>' : ''}
    <article class="pd-article">
      <div class="pd-author">
        ${avatarHtml(user)}
        <div class="pd-author-meta">
          <div class="pd-author-name">${escapeHtml(user.nickname || '대장님')}${golmokScoreBadgeHtml(user.golmok_score)}</div>
          <div class="pd-author-info">
            <span class="pcbdg" style="${getCategoryStyle(post.category)}">${escapeHtml(badgeText)}</span>
            ${escapeHtml(user.region_full || post.region_full || '')} · ${getTimeAgo(post.created_at)}
          </div>
        </div>
        ${
          user.id
            ? `<button type="button" class="detail-follow-btn pd-follow-btn" data-user-id="${user.id}" data-following="${following ? 'true' : 'false'}" style="${
                following
                  ? 'background:#F5F1E8;border:1px solid #E8E4DC;color:#555;'
                  : 'background:#F5A623;color:#fff;border:none;'
              }"><i class="ti ti-user-plus"></i> ${following ? '팔로잉' : '팔로우'}</button>`
            : ''
        }
      </div>
      ${post.title ? `<h1 class="pd-title">${escapeHtml(post.title)}</h1>` : ''}
      <div class="pd-body">${escapeHtml(post.content)}</div>
      ${renderPostImagesHtml(post.images)}
      <div class="pd-actions">
        <button type="button" class="detail-like-btn pd-act-btn" data-post-id="${post.id}" style="${liked ? 'color:#E24B4A;border-color:#E24B4A;' : ''}">
          <i class="ti ti-heart"></i> 공감 <span class="detail-like-count">${post.like_count || 0}</span>
        </button>
        <button type="button" class="detail-bookmark-btn pd-act-btn" data-post-id="${post.id}">
          <i class="ti ti-bookmark"></i> 저장
        </button>
        <button type="button" class="detail-share-btn pd-act-btn" data-post-id="${post.id}">
          <i class="ti ti-share"></i> 공유
        </button>
        ${
          isOwner
            ? `<button type="button" class="detail-delete-btn pd-act-btn pd-delete-btn" data-post-id="${post.id}" style="color:#E24B4A;border-color:#F5C6C6;margin-left:auto;">
          <i class="ti ti-trash"></i> 삭제
        </button>`
            : ''
        }
      </div>
      <div class="pd-comments-head">댓글 <span id="pd-comment-count">${post.comment_count || 0}</span>개</div>
      <div id="comment-list-${post.id}" class="pd-comment-list">${buildCommentsHtml(comments, currentUserId)}</div>
    </article>
    <div class="pd-comment-bar${inShell ? ' pd-comment-bar--inline' : ''}">
      <input id="comment-input-${post.id}" type="text" placeholder="댓글을 입력하세요..." class="pd-comment-input">
      <button type="button" id="comment-submit-${post.id}" class="pd-comment-submit">등록</button>
    </div>
  `;

  if (inShell) {
    root.querySelector('#pd-back-to-list')?.addEventListener('click', () => hideShellPostDetail());
  }

  bindPostDetailEvents(root, post);
}

function bindPostDetailEvents(scope, post) {
  scope.querySelector('.detail-like-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const res = await toggleLike(post.id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    const count = scope.querySelector('.detail-like-count');
    const n = parseInt(count.textContent, 10) || 0;
    count.textContent = res.liked ? n + 1 : Math.max(0, n - 1);
    if (res.liked) {
      btn.style.color = '#E24B4A';
      btn.style.borderColor = '#E24B4A';
    } else {
      btn.style.color = '';
      btn.style.borderColor = '';
    }
  });

  scope.querySelector('.detail-bookmark-btn')?.addEventListener('click', async () => {
    const res = await toggleBookmark(post.id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    toast(res.saved ? '저장했습니다' : '저장 취소');
  });

  scope.querySelector('.detail-share-btn')?.addEventListener('click', () => sharePost(post.id));

  scope.querySelector('.detail-delete-btn')?.addEventListener('click', async () => {
    if (!window.confirm('게시글을 삭제할까요?')) return;
    const res = await deletePost(post.id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    import('./golmok-score.js?v=20260710')
      .then((m) => m.addGolmokScore('post_delete', post.id))
      .catch(() => {});
    toast('게시글이 삭제되었습니다');
    if (getShellLayout()) {
      hideShellPostDetail();
      window.dispatchEvent(new CustomEvent('golmok:posts-changed'));
      loadFeed(true).catch(() => {});
    } else {
      const back = post.board === 'mentoring' ? 'mentoring.html' : 'community.html';
      window.location.href = back;
    }
  });

  scope.querySelector('.detail-follow-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFollowClick(e.currentTarget, e.currentTarget.dataset.userId);
  });

  const bindReplyButtons = () => {
    scope.querySelectorAll('.reply-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        replyTargetId = btn.dataset.replyId;
        const input = scope.querySelector(`#comment-input-${post.id}`);
        if (input) {
          input.placeholder = '답글을 입력하세요...';
          input.focus();
        }
      });
    });
  };

  const refreshComments = async () => {
    const me = await getCurrentUser();
    const updated = await getComments(post.id);
    const listEl = scope.querySelector(`#comment-list-${post.id}`);
    if (listEl) listEl.innerHTML = buildCommentsHtml(updated, me?.id);
    const countEl = scope.querySelector('#pd-comment-count');
    if (countEl) countEl.textContent = String(updated.length);
    bindReplyButtons();
  };

  const commentListEl = scope.querySelector(`#comment-list-${post.id}`);
  if (commentListEl && !commentListEl.dataset.deleteBound) {
    commentListEl.dataset.deleteBound = '1';
    commentListEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('.comment-delete-btn');
      if (!btn) return;
      e.stopPropagation();
      const commentId = btn.dataset.commentId;
      if (!commentId || !window.confirm('댓글을 삭제할까요?')) return;
      const res = await deleteComment(commentId, post.id);
      if (res?.error === 'login') {
        toast('로그인이 필요합니다');
        window.openLoginModal?.('login');
        return;
      }
      import('./golmok-score.js?v=20260710')
        .then((m) => m.addGolmokScore('comment_delete', commentId))
        .catch(() => {});
      await refreshComments();
      toast('댓글이 삭제되었습니다');
    });
  }

  bindReplyButtons();

  const submitComment = async () => {
    const input = scope.querySelector(`#comment-input-${post.id}`);
    const content = input?.value?.trim();
    if (!content) return;
    const res = await createComment({ postId: post.id, content, parentId: replyTargetId });
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    input.value = '';
    replyTargetId = null;
    input.placeholder = '댓글을 입력하세요...';
    await refreshComments();
    const me = await getCurrentUser();
    if (res?.data?.id) {
      import('./golmok-score.js?v=20260710')
        .then((m) => m.addGolmokScore('comment_write', res.data.id))
        .catch(() => {});
    }

    if (me && post.user_id && post.user_id !== me.id) {
      const profile = await getUserProfile(me.id);
      sendCommentNotification(post.user_id, profile?.nickname || '대장님', post.id);
    }
    toast('댓글이 등록되었습니다');
  };

  scope.querySelector(`#comment-submit-${post.id}`)?.addEventListener('click', submitComment);
  scope.querySelector(`#comment-input-${post.id}`)?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitComment();
  });
}

function sharePost(postId) {
  const shell = getShellLayout();
  const page = shell?.page || getCurrentPageFile();
  const shareUrl = new URL(
    getPostPageUrl(postId, SHELL_BOARD_PAGES[page] ? page : 'community.html'),
    window.location.origin
  ).href;
  navigator.clipboard?.writeText(shareUrl).then(() => toast('링크가 복사되었습니다'));
}

async function submitNewPost() {
  const contentEl = getPostContentInput();
  const content = contentEl?.value?.trim();
  if (!content) {
    toast('내용을 입력해주세요');
    return;
  }

  const titleEl = document.getElementById('post-title');
  const title = titleEl?.value?.trim() || null;
  const isEvent = selectedWriteCategory === 'event';
  const eventEndDate = document.getElementById('event-end-date')?.value || null;

  const btn = getSubmitPostBtn();
  if (btn) {
    btn.disabled = true;
    btn.textContent = '게시 중...';
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }

    let imageUrls = [];
    if (selectedImages.length > 0) {
      if (btn) btn.textContent = '이미지 업로드 중...';
      imageUrls = await uploadImages(selectedImages, user.id);
      if (selectedImages.length > 0 && !imageUrls.length) {
        toast('이미지 업로드에 실패했습니다. Storage 버킷(post-images)을 확인해주세요.');
        return;
      }
    }

    const res = await createPost({
      content,
      category: selectedWriteCategory,
      title,
      images: imageUrls.length ? imageUrls : null,
      isEvent,
      eventEndDate,
      regionOverride: userRegion,
      board: currentWriteBoard,
    });

    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }

    if (res?.data?.id) {
      import('./golmok-score.js?v=20260710')
        .then((m) => m.addGolmokScore('post_write', res.data.id))
        .catch(() => {});
    }

    getWriteOverlay()?.classList.remove('open');
    if (contentEl) contentEl.value = '';
    if (titleEl) titleEl.value = '';
    resetSelectedImages();
    await loadFeed(true);
    window.dispatchEvent(new CustomEvent('golmok:posts-changed'));
    toast('게시글이 등록되었습니다!');
  } catch (e) {
    console.error(e);
    if (isDbPermissionError(e)) toast('DB 권한 SQL(community_grants_and_rpc.sql) 실행이 필요합니다');
    else toast(e?.message || '게시글 등록에 실패했습니다');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '게시하기';
    }
  }
}

function bindFeedTabs() {
  const tabAll = document.getElementById('tab-all');
  const tabDong = document.getElementById('tab-dong');
  const rbar = document.getElementById('rbar');
  const eventSec = document.getElementById('event-section') || document.getElementById('ev-sec');

  const setTab = (type) => {
    currentFeedType = type;
    if (tabAll && tabDong) {
      tabAll.classList.toggle('act', type === 'all');
      tabDong.classList.toggle('act', type !== 'all');
    }
    document.querySelectorAll('.feed-tab').forEach((btn) => {
      const id = btn.id;
      if (id === 'tab-all') btn.classList.toggle('act', type === 'all');
      if (id === 'tab-dong') btn.classList.toggle('act', type !== 'all');
    });
    document.getElementById('nav-all')?.classList.toggle('act', type === 'all');
    document.getElementById('nav-dong')?.classList.toggle('act', type !== 'all');
    if (rbar) rbar.style.display = type === 'all' ? 'none' : 'block';
    if (eventSec) eventSec.style.display = type === 'all' ? 'none' : 'block';
    loadFeed(true);
  };

  tabAll?.addEventListener('click', () => setTab('all'));
  tabDong?.addEventListener('click', () => setTab('dong'));

  document.querySelectorAll('.rpill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.rpill').forEach((p) => p.classList.remove('act'));
      pill.classList.add('act');
      if (tabDong && tabAll) {
        tabDong.classList.add('act');
        tabAll.classList.remove('act');
        document.getElementById('nav-dong')?.classList.add('act');
        document.getElementById('nav-all')?.classList.remove('act');
      }
      if (rbar) rbar.style.display = 'block';
      if (eventSec) eventSec.style.display = 'block';
      currentFeedType = parseRangeLabel(pill.dataset.range);
      loadFeed(true);
    });
  });

  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const slider = document.getElementById('seg-slider');
      if (slider) slider.className = `seg-slider pos-${btn.dataset.idx}`;
      const desc = document.getElementById('range-desc-text');
      if (desc) desc.textContent = btn.dataset.desc || '';
      if (tabDong && tabAll) {
        tabDong.classList.add('act');
        tabAll.classList.remove('act');
      }
      if (rbar) rbar.style.display = 'block';
      if (eventSec) eventSec.style.display = 'block';
      currentFeedType = parseRangeLabel(btn.dataset.r);
      loadFeed(true);
    });
  });
}

function bindCategoryTabs() {
  const bindOne = (ct) => {
    ct.addEventListener('click', () => {
      document.querySelectorAll('.ct, .cat-tab[data-cat]').forEach((c) => c.classList.remove('act'));
      ct.classList.add('act');
      currentCategory = ct.dataset.cat || 'all';
      loadFeed(true);
    });
  };
  document.querySelectorAll('.ct').forEach(bindOne);
  document.querySelectorAll('.cat-tab[data-cat]').forEach((ct) => {
    if (!ct.classList.contains('ct')) ct.classList.add('ct');
    bindOne(ct);
  });
}

function bindWriteModal() {
  document.querySelectorAll('.cat-select-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-select-btn').forEach((b) => b.classList.remove('act'));
      btn.classList.add('act');
      selectedWriteCategory = btn.dataset.cat === 'all' ? 'info' : btn.dataset.cat;
      const wrap = document.getElementById('event-date-wrap');
      if (wrap) wrap.style.display = selectedWriteCategory === 'event' ? 'block' : 'none';
    });
  });

  getSubmitPostBtn()?.addEventListener('click', submitNewPost);

  document.getElementById('open-write')?.addEventListener('click', openWriteOverlay);
  document.getElementById('open-write-btn')?.addEventListener('click', openWriteOverlay);
  document.getElementById('write-btn')?.addEventListener('click', openWriteOverlay);
  document.getElementById('write-btn-m')?.addEventListener('click', openWriteOverlay);
  document.getElementById('feed-photo-btn')?.addEventListener('click', openWriteWithPhoto);

  document.querySelectorAll('.wbox .wab[data-write-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const action = btn.dataset.writeAction;
      if (action === 'photo') openWriteWithPhoto();
      else if (action === 'event') {
        openWriteOverlay();
        document.querySelector('.cat-select-btn[data-cat="event"]')?.click();
      } else openWriteOverlay();
    });
  });

  document.getElementById('close-modal')?.addEventListener('click', () => getWriteOverlay()?.classList.remove('open'));
  getWriteOverlay()?.addEventListener('click', (e) => {
    if (e.target === getWriteOverlay()) getWriteOverlay().classList.remove('open');
  });

  document.getElementById('btn-location-tag')?.addEventListener('click', showLocationTagInfo);
  document.getElementById('btn-upjong-tag')?.addEventListener('click', showUpjongTagInfo);

  window.addEventListener('golmok:profile-updated', () => {
    resolveUserRegion().then(() => updateWriteAutoTagsUI());
  });
}

function bindInfiniteScroll() {
  const root = document.querySelector('.screen.active') || document.querySelector('.fscroll') || window;
  const onScroll = () => {
    if (!hasMore || isLoading) return;
    let scrolled;
    let total;
    if (root === window) {
      scrolled = window.scrollY + window.innerHeight;
      total = document.documentElement.scrollHeight;
    } else {
      scrolled = root.scrollTop + root.clientHeight;
      total = root.scrollHeight;
    }
    if (scrolled >= total - 200) loadFeed(false);
  };

  if (root === window) window.addEventListener('scroll', onScroll);
  else root.addEventListener('scroll', onScroll);
}

function setFollowButtonState(btn, following) {
  if (!btn) return;
  btn.dataset.following = following ? 'true' : 'false';
  if (btn.classList.contains('detail-follow-btn')) {
    btn.innerHTML = following
      ? '<i class="ti ti-user-plus"></i> 팔로잉'
      : '<i class="ti ti-user-plus"></i> 팔로우';
  } else {
    btn.textContent = following ? '팔로잉' : '팔로우';
  }
  if (following) {
    btn.style.background = '#F5F1E8';
    btn.style.border = '1px solid #E8E4DC';
    btn.style.color = '#555';
  } else {
    btn.style.background = 'var(--ch)';
    btn.style.color = '#fff';
    btn.style.border = 'none';
  }
}

function syncFollowButtonsForUser(userId, following) {
  document
    .querySelectorAll(`.flbtn[data-user-id="${userId}"], .detail-follow-btn[data-user-id="${userId}"]`)
    .forEach((b) => setFollowButtonState(b, following));
}

async function handleFollowClick(btn, targetUserId) {
  if (!btn || btn.disabled) return;

  const wasFollowing = btn.dataset.following === 'true';
  const nextFollowing = !wasFollowing;

  setFollowButtonState(btn, nextFollowing);
  syncFollowButtonsForUser(targetUserId, nextFollowing);
  btn.disabled = true;

  try {
    const res = await toggleFollow(targetUserId);
    if (res?.error === 'login') {
      syncFollowButtonsForUser(targetUserId, wasFollowing);
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    if (res == null) {
      syncFollowButtonsForUser(targetUserId, wasFollowing);
      return;
    }
    if (res.error) {
      syncFollowButtonsForUser(targetUserId, wasFollowing);
      toast('팔로우 처리에 실패했습니다. 다시 시도해주세요');
      return;
    }
    syncFollowButtonsForUser(targetUserId, !!res.following);
    toast(res.following ? '팔로우했습니다' : '팔로우 취소');
  } catch (e) {
    console.error('handleFollowClick', e);
    syncFollowButtonsForUser(targetUserId, wasFollowing);
    toast('오류가 발생했습니다. 다시 시도해주세요');
  } finally {
    btn.disabled = false;
  }
}

function bindFollowButtons(root = document) {
  const scope = root instanceof Element ? root : document;
  scope.querySelectorAll('.flbtn:not([data-bound])').forEach((btn) => {
    const uid = btn.dataset.userId;
    if (!uid) return;
    btn.dataset.bound = '1';
    if (!btn.dataset.following) {
      btn.dataset.following = btn.textContent.trim() === '팔로잉' ? 'true' : 'false';
    }
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleFollowClick(btn, uid);
    });
  });
}

const NEIGHBOR_AVATAR_STYLES = [
  'background:#FAEEDA;color:#633806;',
  'background:#E1F5EE;color:#085041;',
  'background:#EEEDFE;color:#3C3489;',
  'background:#FFF1F1;color:#8B2942;',
  'background:#EBF4FF;color:#1A4A8A;',
];

export async function loadHotPosts() {
  const hotList = document.getElementById('hot-posts-list');
  if (!hotList) return;

  hotList.innerHTML = '<div style="padding:10px 0;color:#999;font-size:12px;">불러오는 중...</div>';

  try {
    const posts = await getHotPosts(3);
    if (!posts.length) {
      hotList.innerHTML =
        '<div style="padding:10px 0;color:#999;font-size:12px;">아직 인기 게시글이 없습니다</div>';
      return;
    }

    hotList.innerHTML = posts
      .map((post, idx) => {
        const title = escapeHtml(post.title || post.content?.slice(0, 40) || '제목 없음');
        return `<div class="hoti" data-post-id="${post.id}" role="button" tabindex="0">
          <span class="hotn">${String(idx + 1).padStart(2, '0')}</span>
          <div><div class="hott">${title}</div>
          <div class="hotc">공감 ${post.like_count || 0} · 댓글 ${post.comment_count || 0}</div></div>
        </div>`;
      })
      .join('');

    hotList.querySelectorAll('.hoti[data-post-id]').forEach((el) => {
      el.addEventListener('click', () => openPostDetail(el.dataset.postId));
    });
  } catch (err) {
    console.error('loadHotPosts', err);
    hotList.innerHTML =
      '<div style="padding:10px 0;color:#999;font-size:12px;">데이터를 불러올 수 없습니다</div>';
  }
}

function popularAreaTagClass(badge) {
  if (badge === '급상승') return 'up';
  if (badge === '인기') return 'hot';
  if (badge === '신규') return 'new';
  return '';
}

function popularAreaBadgeStyle(badge) {
  if (badge === '급상승') return 'background:#FFF1F1;color:#E24B4A;';
  if (badge === '인기') return 'background:#FFF8E7;color:#C17F24;';
  if (badge === '신규') return 'background:#E8F8F0;color:#1D9E75;';
  return 'background:#F5F1E8;color:#555;';
}

function renderPopularAreasHtml(areas, listEl) {
  const useV3 = !!listEl.closest('.two-col, .widget, .card') && !listEl.closest('.wcard');
  if (useV3) {
    return areas
      .map((area, idx) => {
        const tagCls = popularAreaTagClass(area.badge);
        return `<div class="rank-row popular-area-item" data-area-name="${escapeHtml(area.name)}" role="button" tabindex="0">
          <span class="rank-n">${idx + 1}</span>
          <span class="rank-name">${escapeHtml(area.name)}</span>
          ${area.badge ? `<span class="rank-tag ${tagCls}">${escapeHtml(area.badge)}</span>` : ''}
        </div>`;
      })
      .join('');
  }
  return areas
    .map(
      (area, idx) => `<div class="tri popular-area-item" data-area-name="${escapeHtml(area.name)}" role="button" tabindex="0">
          <span class="trr">${idx + 1}</span>
          <span class="trt">${escapeHtml(area.name)}</span>
          ${
            area.badge
              ? `<span class="trtg" style="${popularAreaBadgeStyle(area.badge)}">${escapeHtml(area.badge)}</span>`
              : ''
          }
        </div>`
    )
    .join('');
}

function bindPopularAreaClicks(list) {
  list.querySelectorAll('.popular-area-item').forEach((el) => {
    el.addEventListener('click', () => searchArea(el.dataset.areaName));
  });
}

export async function loadPopularAreas() {
  const lists = [
    document.getElementById('popular-areas-list'),
    document.getElementById('popular-areas-list-aside'),
  ].filter(Boolean);
  if (!lists.length) return;

  const loadingHtml = '<div style="padding:10px 0;color:#999;font-size:12px;">불러오는 중...</div>';
  lists.forEach((list) => {
    list.innerHTML = loadingHtml;
  });

  try {
    const areas = await getPopularAreas(5);
    if (!areas.length) {
      const emptyHtml =
        '<div style="padding:10px 0;color:#999;font-size:12px;">등록된 인기 상권이 없습니다</div>';
      lists.forEach((list) => {
        list.innerHTML = emptyHtml;
      });
      return;
    }

    lists.forEach((list) => {
      list.innerHTML = renderPopularAreasHtml(areas, list);
      bindPopularAreaClicks(list);
    });
  } catch (err) {
    console.error('loadPopularAreas', err);
    const errHtml =
      '<div style="padding:10px 0;color:#999;font-size:12px;">데이터를 불러올 수 없습니다</div>';
    lists.forEach((list) => {
      list.innerHTML = errHtml;
    });
  }
}

function searchArea(areaName) {
  if (!areaName) return;
  const searchInput =
    document.getElementById('search-input') ||
    document.querySelector('.sbar input') ||
    document.getElementById('srch-inp');
  if (searchInput) {
    searchInput.value = areaName;
    searchInput.focus();
    toast(`"${areaName}" 검색`);
  }
}

function initSidebarWidgets() {
  loadHotPosts().catch(() => {});
  loadPopularAreas().catch(() => {});
  loadNeighborSection().catch(() => {});

  if (window.__golmokWidgetInterval) clearInterval(window.__golmokWidgetInterval);
  window.__golmokWidgetInterval = setInterval(() => {
    loadHotPosts().catch(() => {});
    loadNeighborSection().catch(() => {});
  }, 5 * 60 * 1000);
}

function neighborAvatarHtml(user, fallbackStyle, initial) {
  if (user?.profile_image) {
    return `<div class="flav"><img src="${escapeHtml(user.profile_image)}" alt="" class="neighbor-av-img"></div>`;
  }
  return `<div class="flav" style="${fallbackStyle}">${initial}</div>`;
}

export async function loadNeighborSection() {
  const wrap = document.getElementById('neighbor-list') || document.getElementById('neighbor-users-list');
  if (!wrap) return;

  wrap.innerHTML =
    '<div style="padding:12px 8px;color:#999;font-size:12px;text-align:center;">불러오는 중...</div>';

  try {
    const user = await getCurrentUser();
    let regionSigungu = null;
    let regionLabel = '';
    if (user) {
      const profile = await getUserProfile(user.id);
      regionSigungu = profile?.region_sigungu || null;
      regionLabel = profile?.region_sigungu || profile?.region_dong || '';
    }

    const neighbors = await getNeighborUsers(user?.id, { limit: 5, regionSigungu });

    if (!neighbors.length) {
      wrap.innerHTML = `<div style="padding:12px 8px;color:#999;font-size:12px;text-align:center;">
        ${regionLabel ? `${escapeHtml(regionLabel)} 이웃 대장님이 아직 없습니다.<br>` : ''}곧 새로운 대장님이 합류할 예정이에요!
      </div>`;
      return;
    }

    const followingSet = user ? await getFollowingIds(neighbors.map((n) => n.id)) : new Set();
    wrap.innerHTML = neighbors
      .map((n, i) => {
        const initial = escapeHtml((n.nickname || '대').charAt(0));
        const name = escapeHtml(n.nickname || '대장님');
        const job = n.upjong3nm || n.upjong1nm || '';
        const meta = escapeHtml([job, n.region_dong].filter(Boolean).join(' · ') || '골목대장');
        const following = followingSet.has(n.id);
        const avStyle = NEIGHBOR_AVATAR_STYLES[i % NEIGHBOR_AVATAR_STYLES.length];
        const btnStyle = following
          ? 'background:#F5F1E8;border:1px solid #E8E4DC;color:#555;'
          : 'background:var(--ch);color:#fff;border:none;';
        return `<div class="foli">
          ${neighborAvatarHtml(n, avStyle, initial)}
          <div style="flex:1;min-width:0;"><div class="flnm">${name}</div><div class="fltp">${meta}</div></div>
          <button type="button" class="flbtn" data-user-id="${n.id}" data-following="${following ? 'true' : 'false'}" style="${btnStyle}">${following ? '팔로잉' : '팔로우'}</button>
        </div>`;
      })
      .join('');

    bindFollowButtons(wrap);
  } catch (e) {
    console.error('loadNeighborSection', e);
    wrap.innerHTML =
      '<div style="padding:12px 8px;color:#999;font-size:12px;text-align:center;">이웃 목록을 불러오지 못했습니다.</div>';
  }
}

function redirectLegacyPostQuery() {
  const params = new URLSearchParams(window.location.search);
  const legacyPost = params.get('post');
  if (!legacyPost) return false;
  if (getShellLayout()) {
    const url = new URL(window.location.href);
    url.searchParams.set('id', legacyPost);
    url.searchParams.delete('post');
    window.location.replace(`${url.pathname}${url.search}`);
    return true;
  }
  if (!document.getElementById('post-detail-root')) {
    window.location.replace(getPostPageUrl(legacyPost));
    return true;
  }
  return false;
}

function initCommunityShell() {
  if (redirectLegacyPostQuery()) return;
  bindShellPopState();
  if (tryBootShellPostDetail()) {
    bindWriteModal();
    bindCommWriteInducer();
    bindImageUpload();
    bindFollowButtons();
    initSidebarWidgets();
    updateWriteInducer().catch(() => {});
    return;
  }
  bindWriteModal();
  bindCommWriteInducer();
  bindImageUpload();
  bindFollowButtons();
  initSidebarWidgets();
  updateWriteInducer().catch(() => {});
}

export function initCommunity() {
  if (redirectLegacyPostQuery()) return;
  bindShellPopState();
  bindFeedTabs();
  bindCategoryTabs();
  bindWriteModal();
  bindCommWriteInducer();
  bindImageUpload();
  bindFollowButtons();
  initSidebarWidgets();
  updateWriteInducer().catch(() => {});
  if (tryBootShellPostDetail()) return;
  bindInfiniteScroll();
  loadFeed(true);
}

window.golmokCommunity = {
  loadFeed,
  openPostDetail,
  navigateToPost,
  getPostPageUrl,
  showShellPostDetail,
  hideShellPostDetail,
  initCommunity,
  initPostDetailPage,
  openWriteOverlay,
  openWriteWithPhoto,
  renderPostList,
  renderCommSkeleton,
  loadHotHighlight,
  updateWriteInducer,
  bindCommWriteInducer,
  loadNeighborSection,
  loadHotPosts,
  loadPopularAreas,
  initSidebarWidgets,
};
window.openPostDetail = openPostDetail;
window.navigateToPost = navigateToPost;
window.searchArea = searchArea;
window.sharePost = sharePost;
window.openWriteOverlay = openWriteOverlay;
window.openWriteModal = function openWriteModal(board) {
  if (board) {
    currentWriteBoard = board;
    window.__golmokWriteBoard = board;
  }
  openWriteOverlay();
};
window.renderPostList = renderPostList;

function bootCommunity() {
  if (window.__golmokCommunityBooted) return;
  window.__golmokCommunityBooted = true;
  if (/\/post\.html$/i.test(window.location.pathname) && document.getElementById('post-detail-root')) {
    initPostDetailPage();
    return;
  }
  if (document.getElementById('post-list')) initCommunity();
  else initCommunityShell();
}

async function scheduleCommunityBoot() {
  await waitForShell();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootCommunity, { once: true });
  } else {
    bootCommunity();
  }
}
scheduleCommunityBoot();
