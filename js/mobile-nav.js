/**
 * 모바일: 햄버거 사이드바 + 하단 네비 (단일 도메인 반응형)
 */
(function () {
  if (typeof window === 'undefined') return;

  var MQ = window.matchMedia('(max-width: 768px)');

  function isMobile() {
    return MQ.matches;
  }

  function currentPage() {
    var file = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0];
    return file || 'index.html';
  }

  function setupSidebarDrawer() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar || document.getElementById('sidebar-overlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    document.body.appendChild(overlay);

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    function openSidebar() {
      sidebar.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    overlay.addEventListener('click', closeSidebar);
    sidebar.querySelectorAll('a.ni').forEach(function (link) {
      link.addEventListener('click', closeSidebar);
    });

    var topnav = document.querySelector('.topnav');
    if (topnav && !document.getElementById('mobile-menu-btn')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-menu-btn';
      btn.id = 'mobile-menu-btn';
      btn.setAttribute('aria-label', '메뉴 열기');
      btn.innerHTML = '<i class="ti ti-menu-2"></i>';
      var logo = topnav.querySelector('.logo-row');
      if (logo && logo.nextSibling) {
        topnav.insertBefore(btn, logo.nextSibling);
      } else {
        topnav.prepend(btn);
      }
      btn.addEventListener('click', function () {
        if (sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
      });
    }

    window.__golmokCloseSidebar = closeSidebar;
  }

  function setupBottomNav() {
    if (document.getElementById('bottom-mnav') || !document.querySelector('.body')) return;

    var page = currentPage();
    var nav = document.createElement('nav');
    nav.className = 'bottom-mnav';
    nav.id = 'bottom-mnav';
    nav.setAttribute('aria-label', '하단 메뉴');

    var homeAct = page === 'index.html' ? ' act' : '';
    var commAct = page === 'community.html' ? ' act' : '';
    var analysisAct = page === 'analysis.html' ? ' act' : '';

    nav.innerHTML =
      '<div class="bottom-mnav-inner">' +
      '<a href="index.html" class="bm-item' +
      homeAct +
      '"><i class="ti ti-home"></i><span>홈</span></a>' +
      '<a href="community.html" class="bm-item' +
      commAct +
      '"><i class="ti ti-world"></i><span>게시판</span></a>' +
      '<div class="bm-plus-wrap"><button type="button" class="bm-plus" id="bm-write" aria-label="글쓰기"><i class="ti ti-plus"></i></button><span>글쓰기</span></div>' +
      '<a href="analysis.html" class="bm-item' +
      analysisAct +
      '"><i class="ti ti-map"></i><span>상권</span></a>' +
      '<a href="profile.html" class="bm-item"><i class="ti ti-user"></i><span>프로필</span></a>' +
      '</div>';

    document.body.appendChild(nav);
    document.body.classList.add('has-bottom-nav');

    nav.querySelector('#bm-write')?.addEventListener('click', function () {
      if (typeof window.openWriteModal === 'function') window.openWriteModal();
      else if (typeof window.openWriteOverlay === 'function') window.openWriteOverlay();
      else document.getElementById('open-write')?.click();
    });
  }

  function teardownMobileChrome() {
    document.getElementById('sidebar-overlay')?.remove();
    document.getElementById('mobile-menu-btn')?.remove();
    document.getElementById('bottom-mnav')?.remove();
    document.body.classList.remove('has-bottom-nav');
    document.querySelector('.sidebar')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function apply() {
    if (isMobile()) {
      setupSidebarDrawer();
      setupBottomNav();
    } else {
      teardownMobileChrome();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  if (typeof MQ.addEventListener === 'function') {
    MQ.addEventListener('change', apply);
  } else if (typeof MQ.addListener === 'function') {
    MQ.addListener(apply);
  }
})();
