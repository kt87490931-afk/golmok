/** 사이드바 접이식 그룹 + 소분류 필터 탭 */
export function bindSidebarGroups() {
  document.querySelectorAll('.sb-group-toggle').forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const group = btn.closest('.sb-group');
      if (!group) return;
      const open = group.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  document.querySelectorAll('.sb-group .sb-a.act').forEach((link) => {
    link.closest('.sb-group')?.classList.add('open');
  });
}

export function bindStoriesFilterTabs() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const map = {
    'index.html': 'all',
    'community.html': 'all',
    'neighborhood.html': 'neighborhood',
    'promo.html': 'promo',
    'mentoring.html': 'mentoring',
  };
  const current = map[path];
  if (!current) return;

  document.querySelectorAll('.stories-filter-tabs [data-stories-filter]').forEach((el) => {
    el.classList.toggle('act', el.dataset.storiesFilter === current);
  });
}
