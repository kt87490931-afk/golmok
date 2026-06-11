import { fetchBizinfoPrograms } from '../bizinfo.js?v=20260688';
import { getInfoPosts } from '../community.js?v=20260688';
import { renderPostList } from '../community_ui.js';
import { initPageShell, bootPage } from '../page_common.js';

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderBizinfoList(programs) {
  const root = document.getElementById('bizinfo-policy-list');
  if (!root) return;

  if (!programs?.length) {
    root.innerHTML = `
      <div style="padding:20px;text-align:center;color:#888;background:#faf9f7;border-radius:12px;border:1px dashed #e8e4dc;">
        지원사업 공고를 불러오지 못했습니다. API 키 등록 후 다시 시도해주세요.
      </div>`;
    return;
  }

  root.innerHTML = programs.map((p) => `
    <a href="${escHtml(p.url)}" target="_blank" rel="noopener" class="bizinfo-card">
      <span class="bizinfo-cat">${escHtml(p.category || '지원사업')}</span>
      <div class="bizinfo-title">${escHtml(p.title)}</div>
      <div class="bizinfo-meta">
        🏛 ${escHtml(p.author || '-')}
        ${p.excInsttNm ? ` · ${escHtml(p.excInsttNm)}` : ''}
      </div>
      ${p.period ? `<div class="bizinfo-period">📅 ${escHtml(p.period)}</div>` : ''}
      ${p.target ? `<div class="bizinfo-target">👤 ${escHtml(p.target)}</div>` : ''}
      ${p.summary ? `<div class="bizinfo-sum">${escHtml(p.summary.slice(0, 120))}${p.summary.length > 120 ? '…' : ''}</div>` : ''}
    </a>
  `).join('');
}

async function loadBizinfoPolicies() {
  try {
    const programs = await fetchBizinfoPrograms({ question: '소상공인 지원', limit: 8 });
    renderBizinfoList(programs);
  } catch (e) {
    console.warn('bizinfo policies', e);
    const root = document.getElementById('bizinfo-policy-list');
    if (root) {
      root.innerHTML = `
        <div style="padding:20px;text-align:center;color:#888;background:#faf9f7;border-radius:12px;border:1px dashed #e8e4dc;">
          기업마당 API 연동 준비 중입니다. 어드민에서 BIZINFO_API_KEY를 등록해주세요.
        </div>`;
    }
  }
}

async function loadPolicyPosts() {
  try {
    const posts = await getInfoPosts(20);
    await renderPostList(posts, 'policy-post-list', { reset: true });
  } catch (e) {
    console.error(e);
    const list = document.getElementById('policy-post-list');
    if (list) list.innerHTML = '<div style="padding:24px;text-align:center;color:#E24B4A;background:#fff;">게시글을 불러오지 못했습니다.</div>';
  }
}

bootPage(async () => {
  initPageShell('policy');
  await Promise.all([loadBizinfoPolicies(), loadPolicyPosts()]);
  window.addEventListener('golmok:posts-changed', () => loadPolicyPosts());
});
