/** 셸 로더 완료 대기 — 홈·서브페이지 공통 */
export function waitForShell() {
  if (document.body.dataset.gmShellDone === '1') return Promise.resolve();
  if (!document.body.dataset.gmShell) return Promise.resolve();
  return new Promise((resolve) => {
    const fallback = setTimeout(resolve, 1500);
    document.addEventListener('gm-shell-ready', () => {
      clearTimeout(fallback);
      resolve();
    }, { once: true });
  });
}
