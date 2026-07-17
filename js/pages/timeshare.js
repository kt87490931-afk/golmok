/** 타임셰어 리스트 — 필터·채팅 CTA */
import { waitForShell } from '../shell_boot.js';

function toast(msg) {
  if (typeof window.showToast === 'function') {
    window.showToast(msg);
    return;
  }
  alert(msg);
}

function bindFilters() {
  const chips = document.querySelectorAll('#ts-filters .ts-chip');
  const cards = document.querySelectorAll('#ts-grid .ts-card');
  if (!chips.length) return;

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter || 'all';
      cards.forEach((card) => {
        const tags = card.dataset.tags || '';
        const show = filter === 'all' || tags.includes(filter);
        card.style.display = show ? '' : 'none';
      });
    });
  });
}

function bindChatButtons() {
  document.querySelectorAll('[data-ts-chat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      toast('채팅 연결은 곧 오픈됩니다. 가이드라인을 먼저 확인해 주세요.');
    });
  });
}

waitForShell().then(() => {
  bindFilters();
  bindChatButtons();
});
