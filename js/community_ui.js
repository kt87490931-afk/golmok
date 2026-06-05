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
  toggleFollow,
  getLikedPostIds,
  getBookmarkedPostIds,
  isLiked,
  isFollowing,
  getNeighborUsers,
  getFollowingIds,
} from './community.js';
import { uploadImages, createImagePreview } from './upload.js';
import { sendCommentNotification } from './fcm.js';

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
  };
  return styles[category] || 'background:#F5F1E8;color:#555;';
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

function openWriteOverlay() {
  const ov = getWriteOverlay();
  if (!ov) return;
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
    };
  } catch (e) {
    userRegion = { ...DEFAULT_REGION };
  }
  return userRegion;
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
    list.innerHTML = '<div class="feed-loading" style="padding:24px;text-align:center;color:#999;">불러오는 중...</div>';
  }

  await resolveUserRegion();

  try {
    const posts = await fetchPostsPage(currentPage);
    if (reset) list.innerHTML = '';

    if (!posts.length && currentPage === 0) {
      list.innerHTML =
        '<div style="padding:40px 16px;text-align:center;color:#999;"><p>아직 게시글이 없습니다.</p><p>첫 번째 대장님이 되어보세요!</p></div>';
      hasMore = false;
    } else {
      const liked = await getLikedPostIds(posts.map((p) => p.id));
      const saved = await getBookmarkedPostIds(posts.map((p) => p.id));
      posts.forEach((post) => list.appendChild(createPostCard(post, liked, saved)));
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
  const grid = document.getElementById('event-grid') || document.querySelector('.ev-scroll-wrap');
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

function createPostCard(post, likedSet, savedSet) {
  const div = document.createElement('div');
  div.className = 'pc';
  div.dataset.postId = post.id;
  div.dataset.cat = post.category;

  const user = post.users || {};
  const liked = likedSet?.has(post.id);
  const saved = savedSet?.has(post.id);
  const badgeText = user.upjong3nm || getCategoryLabel(post.category);

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
    ${post.title ? `<div class="pctit">${escapeHtml(post.title)}</div>` : ''}
    <div class="pcbody">${escapeHtml(post.content)}</div>
    ${renderPostImagesHtml(post.images)}
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
    e.stopPropagation();
    openPostDetail(post.id);
  });

  div.addEventListener('click', () => openPostDetail(post.id));

  return div;
}

export async function renderPostList(posts, containerId, { reset = true, append = false } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (reset && !append) {
    if (!posts?.length) {
      container.innerHTML = `
        <div style="padding:40px;text-align:center;color:#999;background:#fff;">
          <div style="font-size:32px;margin-bottom:10px;">📝</div>
          <div>아직 게시글이 없습니다.</div>
          <div style="font-size:12px;margin-top:4px;">첫 번째 대장님이 되어보세요!</div>
        </div>`;
      return;
    }
    container.innerHTML = '';
  }

  if (!posts?.length) return;

  const liked = await getLikedPostIds(posts.map((p) => p.id));
  const saved = await getBookmarkedPostIds(posts.map((p) => p.id));
  posts.forEach((post) => container.appendChild(createPostCard(post, liked, saved)));
}

export async function openPostDetail(postId) {
  try {
    const post = await getPost(postId);
    const comments = await getComments(postId);
    const liked = await isLiked(postId);
    const authorId = post.users?.id;
    const following = authorId ? await isFollowing(authorId) : false;
    showPostDetailModal(post, comments, liked, following);
  } catch (e) {
    console.error(e);
    toast('게시글을 불러오지 못했습니다');
  }
}

function buildCommentsHtml(comments) {
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
          return `<div style="margin-left:36px;padding:10px 0;border-top:1px solid #F5F5F5;">
            <div style="font-size:12px;font-weight:500;">${escapeHtml(ru.nickname || '대장님')} <span style="color:#999;font-weight:400;">${getTimeAgo(reply.created_at)}</span></div>
            <div style="font-size:13px;color:#333;line-height:1.5;margin-top:4px;">${escapeHtml(reply.content)}</div>
          </div>`;
        })
        .join('');

      return `<div style="padding:12px 0;border-bottom:1px solid #F5F5F5;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:13px;font-weight:500;">${escapeHtml(user.nickname || '대장님')}</span>
          <span style="font-size:11px;color:#999;">${getTimeAgo(comment.created_at)}</span>
          <button type="button" data-reply-id="${comment.id}" class="reply-btn" style="margin-left:auto;font-size:11px;color:#F5A623;background:none;border:none;cursor:pointer;">답글</button>
        </div>
        <div style="font-size:13px;color:#333;line-height:1.6;">${escapeHtml(comment.content)}</div>
        ${repliesHtml}
      </div>`;
    })
    .join('');
}

function showPostDetailModal(post, comments, liked, following = false) {
  document.getElementById('post-detail-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'post-detail-modal';
  modal.className = 'modal-bg open';
  modal.style.zIndex = '250';

  const user = post.users || {};
  const isMobile = window.innerWidth <= 768;
  const boxW = isMobile ? '100%' : '600px';
  const boxH = isMobile ? '100%' : 'auto';
  const maxH = isMobile ? '100vh' : '80vh';
  const radius = isMobile ? '0' : '16px';

  modal.innerHTML = `
    <div class="modal" style="width:${boxW};max-width:100%;max-height:${maxH};height:${boxH};border-radius:${radius};display:flex;flex-direction:column;overflow:hidden;padding:0;">
      <div class="modal-head" style="padding:16px 20px;border-bottom:1px solid #E8E4DC;flex-shrink:0;">
        <span class="modal-title">${escapeHtml(user.nickname || '대장님')}</span>
        <button type="button" class="modal-close" id="close-post-detail"><i class="ti ti-x"></i></button>
      </div>
      <div style="padding:16px 20px;overflow-y:auto;flex:1;">
        ${post.title ? `<div style="font-size:18px;font-weight:700;margin-bottom:10px;">${escapeHtml(post.title)}</div>` : ''}
        <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:14px;">${escapeHtml(post.content)}</div>
        ${renderPostImagesHtml(post.images)}
        <div style="display:flex;gap:8px;flex-wrap:wrap;padding:12px 0;border-top:1px solid #E8E4DC;border-bottom:1px solid #E8E4DC;margin-bottom:14px;">
          <button type="button" class="detail-like-btn" data-post-id="${post.id}" style="display:flex;align-items:center;gap:5px;background:none;border:1px solid #E8E4DC;border-radius:20px;padding:6px 14px;cursor:pointer;font-size:13px;${liked ? 'color:#E24B4A' : ''}">
            <i class="ti ti-heart"></i> 공감 <span class="detail-like-count">${post.like_count || 0}</span>
          </button>
          <button type="button" class="detail-bookmark-btn" data-post-id="${post.id}" style="display:flex;align-items:center;gap:5px;background:none;border:1px solid #E8E4DC;border-radius:20px;padding:6px 14px;cursor:pointer;font-size:13px;">
            <i class="ti ti-bookmark"></i> 저장
          </button>
          <button type="button" class="detail-share-btn" data-post-id="${post.id}" style="display:flex;align-items:center;gap:5px;background:none;border:1px solid #E8E4DC;border-radius:20px;padding:6px 14px;cursor:pointer;font-size:13px;">
            <i class="ti ti-share"></i> 공유
          </button>
          ${
            user.id
              ? `<button type="button" class="detail-follow-btn" data-user-id="${user.id}" style="display:flex;align-items:center;gap:5px;border-radius:20px;padding:6px 14px;cursor:pointer;font-size:13px;${
                  following
                    ? 'background:#F5F1E8;border:1px solid #E8E4DC;color:#555;'
                    : 'background:var(--ch);color:#fff;border:none;'
                }"><i class="ti ti-user-plus"></i> ${following ? '팔로잉' : '팔로우'}</button>`
              : ''
          }
        </div>
        <div style="font-size:14px;font-weight:700;margin-bottom:10px;">댓글 ${post.comment_count || 0}개</div>
        <div id="comment-list-${post.id}">${buildCommentsHtml(comments)}</div>
      </div>
      <div style="padding:12px 16px;border-top:1px solid #E8E4DC;display:flex;gap:8px;flex-shrink:0;">
        <input id="comment-input-${post.id}" type="text" placeholder="댓글을 입력하세요..." style="flex:1;border:1px solid #E8E4DC;border-radius:20px;padding:8px 14px;font-size:13px;outline:none;">
        <button type="button" id="comment-submit-${post.id}" style="background:#F5A623;color:#fff;border:none;border-radius:20px;padding:8px 16px;font-size:13px;cursor:pointer;font-weight:500;">등록</button>
      </div>
    </div>
  `;

  modal.querySelector('#close-post-detail')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector('.detail-like-btn')?.addEventListener('click', async () => {
    const res = await toggleLike(post.id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    const count = modal.querySelector('.detail-like-count');
    const n = parseInt(count.textContent, 10) || 0;
    count.textContent = res.liked ? n + 1 : Math.max(0, n - 1);
  });

  modal.querySelector('.detail-bookmark-btn')?.addEventListener('click', async () => {
    const res = await toggleBookmark(post.id);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    toast(res.saved ? '저장했습니다' : '저장 취소');
  });

  modal.querySelector('.detail-share-btn')?.addEventListener('click', () => sharePost(post.id));

  modal.querySelector('.detail-follow-btn')?.addEventListener('click', async (e) => {
    const uid = e.currentTarget.dataset.userId;
    const btn = e.currentTarget;
    const res = await toggleFollow(uid);
    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
    }
    if (res.following) {
      btn.innerHTML = '<i class="ti ti-user-plus"></i> 팔로잉';
      btn.style.background = '#F5F1E8';
      btn.style.border = '1px solid #E8E4DC';
      btn.style.color = '#555';
      toast('팔로우했습니다');
    } else {
      btn.innerHTML = '<i class="ti ti-user-plus"></i> 팔로우';
      btn.style.background = 'var(--ch)';
      btn.style.border = 'none';
      btn.style.color = '#fff';
      toast('팔로우 취소');
    }
  });

  modal.querySelectorAll('.reply-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      replyTargetId = btn.dataset.replyId;
      const input = modal.querySelector(`#comment-input-${post.id}`);
      if (input) {
        input.placeholder = '답글을 입력하세요...';
        input.focus();
      }
    });
  });

  const submitComment = async () => {
    const input = modal.querySelector(`#comment-input-${post.id}`);
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
    const updated = await getComments(post.id);
    modal.querySelector(`#comment-list-${post.id}`).innerHTML = buildCommentsHtml(updated);
    const me = await getCurrentUser();
    if (me && post.user_id && post.user_id !== me.id) {
      const profile = await getUserProfile(me.id);
      sendCommentNotification(post.user_id, profile?.nickname || '대장님', post.id);
    }
    toast('댓글이 등록되었습니다');
  };

  modal.querySelector(`#comment-submit-${post.id}`)?.addEventListener('click', submitComment);
  modal.querySelector(`#comment-input-${post.id}`)?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitComment();
  });

  document.body.appendChild(modal);
}

function sharePost(postId) {
  const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
  navigator.clipboard?.writeText(url).then(() => toast('링크가 복사되었습니다'));
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
    });

    if (res?.error === 'login') {
      toast('로그인이 필요합니다');
      window.openLoginModal?.('login');
      return;
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
  document.querySelectorAll('.ct').forEach((ct) => {
    ct.addEventListener('click', () => {
      document.querySelectorAll('.ct').forEach((c) => c.classList.remove('act'));
      ct.classList.add('act');
      currentCategory = ct.dataset.cat || 'all';
      loadFeed(true);
    });
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

function bindFollowButtons(root = document) {
  const scope = root instanceof Element ? root : document;
  scope.querySelectorAll('.flbtn:not([data-bound])').forEach((btn) => {
    const uid = btn.dataset.userId;
    if (!uid) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const res = await toggleFollow(uid);
      if (res?.error === 'login') {
        toast('로그인이 필요합니다');
        window.openLoginModal?.('login');
        return;
      }
      if (res.following) {
        btn.textContent = '팔로잉';
        btn.style.background = '#F5F1E8';
        btn.style.border = '1px solid #E8E4DC';
        btn.style.color = '#555';
        toast('팔로우했습니다');
      } else {
        btn.textContent = '팔로우';
        btn.style.background = '';
        btn.style.border = '';
        btn.style.color = '';
        toast('팔로우 취소');
      }
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

export async function loadNeighborSection() {
  const wrap = document.getElementById('neighbor-list');
  if (!wrap) return;

  try {
    const user = await getCurrentUser();
    const neighbors = await getNeighborUsers(user?.id, 5);
    if (!neighbors.length) {
      wrap.innerHTML =
        '<div style="padding:12px 8px;color:#999;font-size:12px;text-align:center;">아직 이웃 대장님이 없습니다.<br>회원가입 후 첫 대장님이 되어보세요!</div>';
      return;
    }

    const followingSet = user ? await getFollowingIds(neighbors.map((n) => n.id)) : new Set();
    wrap.innerHTML = neighbors
      .map((n, i) => {
        const initial = escapeHtml((n.nickname || '대').charAt(0));
        const name = escapeHtml(n.nickname || '대장님');
        const meta = escapeHtml([n.upjong3nm, n.region_dong].filter(Boolean).join(' · ') || '골목대장');
        const following = followingSet.has(n.id);
        const avStyle = NEIGHBOR_AVATAR_STYLES[i % NEIGHBOR_AVATAR_STYLES.length];
        const btnStyle = following
          ? 'background:#F5F1E8;border:1px solid #E8E4DC;color:#555;'
          : 'background:var(--ch);color:#fff;border:none;';
        return `<div class="foli">
          <div class="flav" style="${avStyle}">${initial}</div>
          <div><div class="flnm">${name}</div><div class="fltp">${meta}</div></div>
          <button type="button" class="flbtn" data-user-id="${n.id}" style="${btnStyle}">${following ? '팔로잉' : '팔로우'}</button>
        </div>`;
      })
      .join('');

    bindFollowButtons(wrap);
  } catch (e) {
    console.warn('loadNeighborSection', e);
    wrap.innerHTML = '<div style="padding:12px 8px;color:#999;font-size:12px;">이웃 목록을 불러오지 못했습니다.</div>';
  }
}

function initCommunityShell() {
  bindWriteModal();
  bindImageUpload();
  bindFollowButtons();
  loadNeighborSection().catch(() => {});
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('post');
  if (postId) openPostDetail(postId);
}

export function initCommunity() {
  bindFeedTabs();
  bindCategoryTabs();
  bindWriteModal();
  bindImageUpload();
  bindInfiniteScroll();
  bindFollowButtons();
  loadNeighborSection().catch(() => {});

  const params = new URLSearchParams(window.location.search);
  const postId = params.get('post');
  if (postId) {
    openPostDetail(postId);
  } else {
    loadFeed(true);
  }
}

window.golmokCommunity = { loadFeed, openPostDetail, initCommunity, openWriteOverlay, openWriteWithPhoto, renderPostList, loadNeighborSection };
window.sharePost = sharePost;
window.openWriteOverlay = openWriteOverlay;
window.openWriteModal = openWriteOverlay;
window.renderPostList = renderPostList;

function bootCommunity() {
  if (window.__golmokCommunityBooted) return;
  window.__golmokCommunityBooted = true;
  if (document.getElementById('post-list')) initCommunity();
  else initCommunityShell();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCommunity);
} else {
  bootCommunity();
}
