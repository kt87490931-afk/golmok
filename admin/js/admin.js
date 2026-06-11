import { adminLogout, escapeHtml } from './admin-auth.js';

/** 사이드바 HTML (STEP 9) */
export function getSidebarHtml(activePage) {
  const items = [
    { section: '메인', links: [{ page: 'dashboard', href: 'dashboard.html', icon: 'ti-dashboard', label: '대시보드' }] },
    {
      section: '운영 관리',
      links: [
        { page: 'members', href: 'members.html', icon: 'ti-users', label: '회원 관리' },
        { page: 'posts', href: 'posts.html', icon: 'ti-pencil', label: '게시글 관리' },
      ],
    },
    {
      section: '시스템',
      links: [
        { page: 'api', href: 'api-manager.html', icon: 'ti-plug', label: 'API 관리' },
        { page: 'footer', href: 'footer-manager.html', icon: 'ti-layout-bottombar', label: '푸터 관리' },
        { page: 'legal', href: 'legal-manager.html', icon: 'ti-file-text', label: '약관 본문' },
        { page: 'ai', href: 'ai-manager.html', icon: 'ti-robot', label: 'AI 관리', soon: true },
      ],
    },
    {
      section: 'Phase 3',
      links: [{ page: 'mentors', href: 'mentors.html', icon: 'ti-award', label: '멘토 관리', soon: true }],
    },
  ];

  let nav = '';
  items.forEach((sec) => {
    nav += `<div class="nav-section-label">${sec.section}</div>`;
    sec.links.forEach((link) => {
      const active = link.page === activePage ? ' active' : '';
      const soon = link.soon ? '<span class="nav-soon">준비중</span>' : '';
      nav += `<a href="${link.href}" class="nav-item${active}" data-page="${link.page}">
        <i class="ti ${link.icon}"></i> ${link.label}${soon}
      </a>`;
    });
  });

  return `
<aside class="admin-sidebar">
  <div class="admin-logo">
    <img src="../assets/gmlogo.png" alt="골목대장">
    <div>
      <div class="admin-logo-text">골목대장</div>
      <div class="admin-logo-sub">관리자 페이지</div>
    </div>
  </div>
  <nav class="admin-nav">${nav}</nav>
  <div class="admin-user-info">
    <div class="avatar" id="admin-avatar">관</div>
    <div>
      <div class="name" id="admin-name">관리자</div>
      <div class="role">Administrator</div>
    </div>
    <button type="button" class="admin-logout" id="btn-admin-logout" title="로그아웃">
      <i class="ti ti-logout"></i>
    </button>
  </div>
</aside>`;
}

/** 어드민 레이아웃 초기화 */
export async function initAdminPage({ activePage, pageTitle, adminUser }) {
  const wrap = document.querySelector('.admin-wrap');
  if (wrap && !wrap.querySelector('.admin-sidebar')) {
    wrap.insertAdjacentHTML('afterbegin', getSidebarHtml(activePage));
  }

  document.getElementById('admin-page-title').textContent = pageTitle;

  if (adminUser) {
    const name = adminUser.nickname || adminUser.email || '관리자';
    document.getElementById('admin-name').textContent = name;
    const av = document.getElementById('admin-avatar');
    if (av) av.textContent = escapeHtml(name.charAt(0));
  }

  document.getElementById('btn-admin-logout')?.addEventListener('click', () => adminLogout());
  window.adminLogout = adminLogout;
}
