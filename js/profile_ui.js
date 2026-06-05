import { getMyPosts, getBookmarkedPosts, getMyProfile } from './profile.js';
import { getCurrentUser } from './community.js?v=20260622';
const CATEGORY_LABELS = {
  all: '전체',
  qna: '질문·고민',
  info: '정보공유',
  startup: '창업준비',
  issue: '이슈',
  event: '이벤트',
};

function toast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTimeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function getCategoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat || '전체';
}

async function loadActivityList(tab) {
  const list = document.getElementById('activity-list');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">불러오는 중...</div>';

  const user = await getCurrentUser();
  if (!user) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">로그인이 필요합니다.</div>';
    window.openLoginModal?.('login');
    return;
  }

  try {
    const posts = tab === 'my-posts' ? await getMyPosts(user.id) : await getBookmarkedPosts(user.id);

    if (!posts.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:40px;color:#999;">
          <div style="font-size:32px;margin-bottom:12px;">${tab === 'my-posts' ? '📝' : '🔖'}</div>
          <div>${tab === 'my-posts' ? '작성한 게시글이 없습니다' : '저장한 글이 없습니다'}</div>
        </div>`;
      return;
    }

    list.innerHTML = '';
    posts.forEach((post) => {
      const card = document.createElement('div');
      card.style.cssText = 'padding:14px 0;border-bottom:1px solid #F5F1E8;cursor:pointer;';
      card.innerHTML = `
        <div style="font-size:13px;font-weight:500;color:#1A1A1A;margin-bottom:5px;">
          ${escapeHtml(post.title || post.content?.slice(0, 50) || '')}
        </div>
        <div style="font-size:12px;color:#999;display:flex;gap:12px;align-items:center;">
          <span>${escapeHtml(getCategoryLabel(post.category))}</span>
          <span>❤️ ${post.like_count || 0}</span>
          <span>💬 ${post.comment_count || 0}</span>
          <span style="margin-left:auto;">${getTimeAgo(post.created_at)}</span>
        </div>`;
      card.addEventListener('click', () => {
        document.getElementById('my-activity-overlay')?.classList.remove('open');
        window.golmokCommunity?.openPostDetail?.(post.id);
      });      list.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#E24B4A;">목록을 불러오지 못했습니다.</div>';
  }
}

function setActivityTab(tab) {
  document.querySelectorAll('.activity-tab').forEach((t) => {
    const isActive = t.dataset.tab === tab;
    t.style.borderBottomColor = isActive ? '#F5A623' : 'transparent';
    t.style.color = isActive ? '#C17F24' : '#999';
    t.style.fontWeight = isActive ? '500' : '400';
    t.classList.toggle('act', isActive);
  });
}

export async function openMyActivity(tab = 'my-posts') {
  const user = await getCurrentUser();
  if (!user) {
    toast('로그인이 필요합니다');
    window.openLoginModal?.('login');
    return;
  }

  const overlay = document.getElementById('my-activity-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  setActivityTab(tab);
  await loadActivityList(tab);
}

export async function renderSidebarProfile() {
  const user = await getCurrentUser();
  const actions = document.getElementById('sidebar-profile-actions');
  if (!actions) return;

  if (!user) {
    actions.innerHTML = '';
    return;
  }

  try {
    const profile = await getMyProfile(user.id);
    const nick = profile?.nickname || user.user_metadata?.nickname || user.user_metadata?.full_name || user.email?.split('@')[0] || '대장님';
    const sub = [profile?.upjong1nm, profile?.region_dong].filter(Boolean).join(' · ') || '프로필 설정';

    actions.innerHTML = `
      <button type="button" class="sb-act-btn" data-activity="my-posts">
        <i class="ti ti-pencil"></i> 내 게시글
      </button>
      <button type="button" class="sb-act-btn" data-activity="saved-posts">
        <i class="ti ti-bookmark"></i> 저장한 글
      </button>
      <button type="button" class="sb-act-btn sb-act-out" id="sb-logout-btn">
        <i class="ti ti-logout"></i> 로그아웃
      </button>`;

    actions.querySelectorAll('[data-activity]').forEach((btn) => {
      btn.addEventListener('click', () => openMyActivity(btn.dataset.activity));
    });
    actions.querySelector('#sb-logout-btn')?.addEventListener('click', () => window.signOut?.());

    const sbName = document.getElementById('sb-name');
    const sbType = document.querySelector('.sbtype');
    if (sbName) sbName.textContent = nick;
    if (sbType) sbType.textContent = sub;
  } catch (e) {
    console.warn('sidebar profile', e);
    const nick = user.user_metadata?.nickname || user.user_metadata?.full_name || user.email?.split('@')[0] || '대장님';
    actions.innerHTML = `
      <button type="button" class="sb-act-btn" data-activity="my-posts"><i class="ti ti-pencil"></i> 내 게시글</button>
      <button type="button" class="sb-act-btn" data-activity="saved-posts"><i class="ti ti-bookmark"></i> 저장한 글</button>
      <button type="button" class="sb-act-btn sb-act-out" id="sb-logout-btn"><i class="ti ti-logout"></i> 로그아웃</button>`;
    actions.querySelectorAll('[data-activity]').forEach((btn) => {
      btn.addEventListener('click', () => openMyActivity(btn.dataset.activity));
    });
    actions.querySelector('#sb-logout-btn')?.addEventListener('click', () => window.signOut?.());
    document.getElementById('sb-name') && (document.getElementById('sb-name').textContent = nick);
  }
}

function bindActivityModal() {
  if (window.__golmokActivityBound) return;
  window.__golmokActivityBound = true;

  document.getElementById('close-activity-overlay')?.addEventListener('click', () => {
    document.getElementById('my-activity-overlay')?.classList.remove('open');
  });
  document.getElementById('my-activity-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'my-activity-overlay') e.target.classList.remove('open');
  });

  document.querySelectorAll('.activity-tab').forEach((tab) => {
    tab.addEventListener('click', async () => {
      setActivityTab(tab.dataset.tab);
      await loadActivityList(tab.dataset.tab);
    });
  });

  document.getElementById('nav-my-posts')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openMyActivity('my-posts');
  });
  document.getElementById('nav-saved-posts')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openMyActivity('saved-posts');
  });  document.getElementById('pm-my-posts')?.addEventListener('click', () => openMyActivity('my-posts'));
  document.getElementById('pm-saved-posts')?.addEventListener('click', () => openMyActivity('saved-posts'));
}

export function initProfileUI() {
  bindActivityModal();
  window.openMyActivity = openMyActivity;
}

document.addEventListener('DOMContentLoaded', initProfileUI);
