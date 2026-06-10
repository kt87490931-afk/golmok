import { getEventsByType } from '../community.js?v=20260665';
import { openPostDetail, bindCommWriteInducer, updateWriteInducer } from '../community_ui.js?v=20260665';
import { initPageShell, bootPage } from '../page_common.js';

let currentEventType = 'all';

const TYPE_CONFIG = {
  discount: { label: '할인이벤트', bg: 'linear-gradient(135deg,#FFF8E7,#FAEEDA)', chip: '#F5A623' },
  groupbuy: { label: '공동구매', bg: 'linear-gradient(135deg,#E8F8F0,#D0F0E0)', chip: '#1D9E75' },
  meeting: { label: '모임·행사', bg: 'linear-gradient(135deg,#EBF4FF,#D6EAFF)', chip: '#378ADD' },
  issue: { label: '이슈', bg: 'linear-gradient(135deg,#FFF1F1,#FFE0E0)', chip: '#E24B4A' },
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderEventGrid(events) {
  const grid = document.getElementById('events-grid');
  const empty = document.getElementById('events-empty');
  if (!grid) return;

  if (!events.length) {
    grid.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = '';

  events.forEach((event) => {
    const tc = TYPE_CONFIG[event.event_type] || { label: '기타', bg: '#F7F3EB', chip: '#999' };
    const dday = event.event_end_date
      ? Math.ceil((new Date(event.event_end_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const card = document.createElement('div');
    card.style.cssText = 'border-radius:14px;overflow:hidden;border:1px solid #E8E4DC;cursor:pointer;transition:transform .15s;background:#fff;';
    card.innerHTML = `
      <div style="padding:14px;background:${tc.bg};">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="background:${tc.chip};color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;">${tc.label}</span>
          ${dday !== null ? `<span style="font-size:11px;font-weight:700;color:${dday <= 3 ? '#E24B4A' : '#555'};">${dday <= 0 ? '오늘 마감' : `D-${dday}`}</span>` : ''}
        </div>
        <div style="font-size:14px;font-weight:700;color:#1A1A1A;line-height:1.4;margin-bottom:6px;">${escapeHtml(event.title || event.content?.slice(0, 30) || '')}</div>
        <div style="font-size:12px;color:#555;">${escapeHtml(event.users?.nickname || '대장님')} · ${escapeHtml(event.region_dong || '')}</div>
      </div>
      <div style="padding:10px 14px;border-top:1px solid rgba(0,0,0,.06);font-size:11px;color:#999;display:flex;gap:8px;">
        <span>❤️ ${event.like_count || 0}</span>
        <span>💬 ${event.comment_count || 0}</span>
        ${event.event_end_date ? `<span style="margin-left:auto;">~${event.event_end_date}</span>` : ''}
      </div>`;
    card.addEventListener('click', () => openPostDetail(event.id));
    card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-2px)'; });
    card.addEventListener('mouseleave', () => { card.style.transform = 'translateY(0)'; });
    grid.appendChild(card);
  });
}

async function loadEvents() {
  try {
    const events = await getEventsByType(currentEventType);
    renderEventGrid(events);
  } catch (e) {
    console.error(e);
  }
}

window.openEventWriteModal = function openEventWriteModal() {
  window.openWriteModal?.();
  window.setTimeout(() => {
    document.querySelectorAll('.cat-select-btn').forEach((b) => b.classList.remove('act'));
    const eventBtn = document.querySelector('.cat-select-btn[data-cat="event"]');
    eventBtn?.classList.add('act');
    const wrap = document.getElementById('event-date-wrap');
    if (wrap) wrap.style.display = 'block';
  }, 120);
};

bootPage(() => {
  initPageShell('events');
  bindCommWriteInducer();
  updateWriteInducer().catch(() => {});

  document.querySelectorAll('.event-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.event-filter-btn').forEach((b) => b.classList.remove('act'));
      btn.classList.add('act');
      currentEventType = btn.dataset.type || 'all';
      loadEvents();
    });
  });
  loadEvents();
  window.addEventListener('golmok:posts-changed', () => loadEvents());
});
