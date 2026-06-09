/**
 * 모바일 사이트(m.golmokmaster.com)에서 데스크톱 접속 시 golmokmaster.com 으로 이동
 * 강제 모바일 보기: ?mobile=1
 */
(function () {
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get('mobile') === '1') return;

  var host = window.location.hostname;
  var mobileHosts = { 'm.golmokmaster.com': 1 };
  var onGithubMobile =
    host === 'kt87490931-afk.github.io' &&
    /^\/golmok-mobile(\/|$)/i.test(window.location.pathname);

  if (!mobileHosts[host] && !onGithubMobile) return;

  function isDesktopClient() {
    var ua = navigator.userAgent || '';
    if (/Android|webOS|iPhone|iPod|iPad|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) {
      return false;
    }
    if (navigator.maxTouchPoints > 1 && window.innerWidth < 1024) return false;
    try {
      return window.matchMedia('(min-width: 1024px)').matches;
    } catch (e) {
      return window.innerWidth >= 1024;
    }
  }

  if (!isDesktopClient()) return;

  var pcOrigin = 'https://golmokmaster.com';
  if (host === 'kt87490931-afk.github.io') {
    pcOrigin = 'https://kt87490931-afk.github.io/golmok';
  }

  var path = window.location.pathname || '/';
  if (onGithubMobile) {
    path = path.replace(/^\/golmok-mobile/i, '') || '/';
  }
  if (path === '/index.html') path = '/';

  var target = pcOrigin + path + window.location.search + window.location.hash;
  window.location.replace(target);
})();
