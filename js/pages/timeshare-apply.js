/** 타임셰어 본주인 신청 — 필수체크·요일 토글 */
import { waitForShell } from '../shell_boot.js';

function toast(msg) {
  if (typeof window.showToast === 'function') {
    window.showToast(msg);
    return;
  }
  alert(msg);
}

function bindApplyForm() {
  const requiredChecks = document.querySelectorAll('.ts-required-check');
  const submitBtn = document.getElementById('ts-submit-btn');
  if (!submitBtn || !requiredChecks.length) return;

  function refresh() {
    const allChecked = Array.from(requiredChecks).every((c) => c.checked);
    submitBtn.classList.toggle('enabled', allChecked);
    submitBtn.textContent = allChecked
      ? '신청서 제출하기'
      : '모든 필수 항목 확인 후 제출 가능';
  }

  requiredChecks.forEach((c) => c.addEventListener('change', refresh));
  refresh();

  document.querySelectorAll('#ts-weekdays button').forEach((el) => {
    el.addEventListener('click', () => el.classList.toggle('on'));
  });

  submitBtn.addEventListener('click', () => {
    if (!submitBtn.classList.contains('enabled')) return;
    toast('신청 접수 기능은 곧 연동됩니다. 작성해 주셔서 감사합니다.');
  });
}

waitForShell().then(bindApplyForm);
