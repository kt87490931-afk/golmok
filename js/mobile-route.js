/**
 * golmokmaster.com ??모바???�속 ??�?golmok-mobile 코드(/m/)�??�동
 * PC 강제: ?desktop=1
 */
(function () {
  if (typeof window === 'undefined') return;

  var params = new URLSearchParams(window.location.search);
  if (params.get('desktop') === '1') {
    try {
      sessionStorage.setItem('gm_force_desktop', '1');
    } catch (e) {}
    return;
  }
  if (params.get('mobile') === '1') {
    try {
      sessionStorage.removeItem('gm_force_desktop');
    } catch (e) {}
  }

  try {
    if (sessionStorage.getItem('gm_force_desktop') === '1') return;
  } catch (e) {}

  var path = window.location.pathname || '/';
  if (/\/m(\/|$)/i.test(path)) return;

  function isMobileClient() {
    var ua = navigator.userAgent || '';
    if (/Android|webOS|iPhone|iPod|iPad|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) {
      if (window.innerWidth >= 1024 && !/iPad|Tablet/i.test(ua)) {
        try {
          return !window.matchMedia('(min-width: 1024px)').matches;
        } catch (e) {
          return window.innerWidth < 1024;
        }
      }
      return true;
    }
    try {
      return window.matchMedia('(max-width: 768px)').matches;
    } catch (e) {
      return window.innerWidth <= 768;
    }
  }

  if (!isMobileClient()) return;

  var parts = path.split('/').filter(Boolean);
  var file = parts.length ? parts[parts.length - 1] : 'index.html';
  if (!/\.html$/i.test(file)) file = 'index.html';

  var map = {
    'index.html': 'index.html',
    'community.html': 'index.html',
    'mentoring.html': 'mentoring.html',
    'neighborhood.html': 'index.html',
    'by-industry.html': 'index.html',
    'analysis.html': 'analysis.html',
    'ai-search.html': 'ai-search.html',
    'events.html': 'events.html',
    'policy.html': 'index.html',
    'post.html': 'post.html',
    'profile.html': 'profile.html',
    'login.html': 'login.html',
    'coming-soon.html': 'coming-soon.html',
    'startup.html': 'startup.html',
    'privacy.html': 'privacy.html',
    'terms.html': 'terms.html',
    'reset-password.html': 'reset-password.html'
  };

  var mobileFile = map[file] || 'index.html';
  var mobilePath = '/m/' + mobileFile;
  var target = mobilePath + window.location.search + window.location.hash;

  if (window.location.pathname + window.location.search + window.location.hash === target) return;
  window.location.replace(target);
})();
