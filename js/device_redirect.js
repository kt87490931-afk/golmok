/**
 * PC 사이트(golmokmaster.com)에서 모바일 기기 접속 시 m.golmokmaster.com 으로 이동
 * 강제 PC 보기: ?desktop=1
 */
(function () {
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get('desktop') === '1') return;

  var host = window.location.hostname;
  var pcHosts = { 'golmokmaster.com': 1, 'www.golmokmaster.com': 1 };
  var onGithubPc =
    host === 'kt87490931-afk.github.io' &&
    /^\/golmok(\/|$)/i.test(window.location.pathname);

  if (!pcHosts[host] && !onGithubPc) return;

  function isMobileClient() {
    var ua = navigator.userAgent || '';
    if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
    if (/iPad/i.test(ua)) return true;
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
    try {
      return (
        window.matchMedia('(max-width: 768px)').matches &&
        window.matchMedia('(pointer: coarse)').matches
      );
    } catch (e) {
      return window.innerWidth <= 768;
    }
  }

  if (!isMobileClient()) return;

  var mobileOrigin = 'https://m.golmokmaster.com';
  if (host === 'kt87490931-afk.github.io') {
    mobileOrigin = 'https://kt87490931-afk.github.io/golmok-mobile';
  }

  var path = window.location.pathname || '/';
  if (onGithubPc) {
    path = path.replace(/^\/golmok/i, '') || '/';
  }
  if (path === '/index.html') path = '/';

  var target = mobileOrigin + path + window.location.search + window.location.hash;
  window.location.replace(target);
})();
