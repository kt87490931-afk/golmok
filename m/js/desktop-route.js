/**
 * /m/ — 데스크톱(넓은 화면) 접속 시 PC 페이지(golmokmaster.com)로 이동
 * 모바일 강제: ?mobile=1
 */
(function () {
  if (typeof window === 'undefined') return;

  var path = window.location.pathname || '/';
  if (!/\/m(\/|$)/i.test(path)) return;

  if (new URLSearchParams(window.location.search).get('mobile') === '1') return;

  try {
    if (sessionStorage.getItem('gm_force_desktop') === '1') {
      /* PC 페이지로 나갈 때만 사용 — /m/ 에서는 desktop=1 로 root 이동 */
    }
  } catch (e) {}

  function isDesktopClient() {
    var ua = navigator.userAgent || '';
    if (/Android|webOS|iPhone|iPod|iPad|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) {
      if (window.innerWidth >= 1024) {
        try {
          return window.matchMedia('(min-width: 1024px)').matches;
        } catch (e) {
          return true;
        }
      }
      return false;
    }
    try {
      return window.matchMedia('(min-width: 769px)').matches;
    } catch (e) {
      return window.innerWidth > 768;
    }
  }

  if (!isDesktopClient()) return;

  var parts = path.split('/').filter(Boolean);
  var mIdx = parts.indexOf('m');
  var file = mIdx >= 0 && parts[mIdx + 1] ? parts[mIdx + 1] : 'index.html';
  if (!/\.html$/i.test(file)) file = 'index.html';

  var map = {
    'index.html': 'index.html',
    'analysis.html': 'analysis.html',
    'events.html': 'events.html',
    'mentoring.html': 'mentoring.html',
    'promo.html': 'promo.html',
    'promo-write.html': 'promo-write.html',
    'post.html': 'post.html',
    'profile.html': 'profile.html',
    'login.html': 'login.html',
    'coming-soon.html': 'coming-soon.html',
    'startup.html': 'startup.html',
    'privacy.html': 'privacy.html',
    'terms.html': 'terms.html',
    'reset-password.html': 'reset-password.html'
  };

  var pcFile = map[file] || 'index.html';
  var pcPath = pcFile === 'index.html' ? '/index.html' : '/' + pcFile;
  window.location.replace(pcPath + window.location.search + window.location.hash);
})();
