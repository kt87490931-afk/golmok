/** v3 셸 공통 전역 (정적 병합 페이지용) */
(function () {
  if (window.showToast) return;
  window.showToast = function showToast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2200);
  };
  window.startVoice = window.startVoice || function () { window.showToast('음성검색 준비 중입니다'); };
  window.focusHeroSearch = window.focusHeroSearch || function () {
    var onHome = /index\.html$/.test(location.pathname) || /\/m\/?$/.test(location.pathname);
    if (!onHome) {
      location.href = 'index.html#hero';
      return;
    }
    var inp = document.getElementById('ai-input');
    if (inp) inp.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  document.getElementById('write-btn-m')?.addEventListener('click', function () {
    document.getElementById('open-write')?.click()
      || document.getElementById('write-modal')?.classList.add('open');
  });
  document.body.dataset.gmShellDone = '1';
  document.dispatchEvent(new CustomEvent('gm-shell-ready'));
})();
