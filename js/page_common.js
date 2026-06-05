/** 커뮤니티 분리 페이지 공통: 사이드바 활성화·우측 위젯·글쓰기 버튼 */
export function initPageShell(activePage) {
  document.querySelectorAll('.menu-item[data-page]').forEach((el) => {
    const on = el.dataset.page === activePage;
    el.classList.toggle('act', on);
  });

  document.querySelectorAll('[data-open-write]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.openWriteModal?.();
    });
  });

  window.setTimeout(() => {
    window.golmokCommunity?.loadNeighborSection?.().catch(() => {});
  }, 300);
}

export function bootPage(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

export function bindInfiniteScroll(loadFn) {
  window.addEventListener('scroll', () => {
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 300) {
      loadFn(false);
    }
  });
}

export function activateTabs(selector, activeValue, attr = 'data-cat') {
  document.querySelectorAll(selector).forEach((tab) => {
    const isActive = tab.getAttribute(attr) === activeValue;
    tab.classList.toggle('act', isActive);
    tab.style.borderBottomColor = isActive ? '#F5A623' : 'transparent';
    tab.style.color = isActive ? '#C17F24' : '#555';
    tab.style.fontWeight = isActive ? '700' : '400';
  });
}

export function activatePillButtons(selector, activeBtn) {
  document.querySelectorAll(selector).forEach((btn) => {
    const on = btn === activeBtn;
    btn.style.background = on ? '#F5A623' : 'transparent';
    btn.style.color = on ? '#fff' : '#555';
    btn.style.border = on ? '1px solid #F5A623' : '1px solid #E8E4DC';
  });
}
