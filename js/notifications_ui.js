import { getMyNotifications, getUnreadNotificationCount, markAllNotificationsRead } from './notifications.js';

function toast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTimeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

async function refreshNotificationBadge() {
  const count = await getUnreadNotificationCount();
  document.querySelectorAll('.nbadge').forEach((el) => {
    if (count > 0) {
      el.classList.add('has-unread');
      el.setAttribute('data-count', count > 99 ? '99+' : String(count));
    } else {
      el.classList.remove('has-unread');
      el.removeAttribute('data-count');
    }
  });
  const pmBadge = document.getElementById('sidebar-notify-badge');
  if (pmBadge) {
    if (count > 0) {
      pmBadge.style.display = '';
      pmBadge.textContent = count > 99 ? '99+' : String(count);
    } else {
      pmBadge.style.display = 'none';
      pmBadge.textContent = '';
    }
  }
  document.querySelectorAll('.pm-bdg').forEach((el) => {
    if (count > 0) {
      el.style.display = '';
      el.textContent = count > 99 ? '99+' : String(count);
    } else {
      el.style.display = 'none';
      el.textContent = '';
    }
  });
}

async function loadNotificationList() {
  const list = document.getElementById('notification-list');
  if (!list) return;
  list.innerHTML = '<div style="padding:24px;text-align:center;color:#999;">불러오는 중...</div>';

  try {
    const items = await getMyNotifications();
    await markAllNotificationsRead();
    await refreshNotificationBadge();

    if (!items.length) {
      list.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">새 알림이 없습니다.</div>';
      return;
    }

    list.innerHTML = '';
    items.forEach((n) => {
      const row = document.createElement('div');
      row.style.cssText = `padding:14px 0;border-bottom:1px solid #F5F1E8;cursor:${n.link_post_id ? 'pointer' : 'default'};opacity:${n.is_read ? '0.75' : '1'};`;
      row.innerHTML = `
        <div style="font-size:13px;font-weight:600;color:#1A1A1A;">${escapeHtml(n.title || '알림')}</div>
        <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.5;">${escapeHtml(n.body || '')}</div>
        <div style="font-size:11px;color:#999;margin-top:6px;">${getTimeAgo(n.created_at)}</div>`;
      if (n.link_post_id) {
        row.addEventListener('click', () => {
          document.getElementById('notification-overlay')?.classList.remove('open');
          window.golmokCommunity?.openPostDetail?.(n.link_post_id);
        });
      }
      list.appendChild(row);
    });
  } catch (e) {
    console.error(e);
    list.innerHTML = '<div style="padding:24px;text-align:center;color:#E24B4A;">알림을 불러오지 못했습니다.<br><span style="font-size:12px;">notifications 테이블 SQL 실행이 필요할 수 있습니다.</span></div>';
  }
}

export async function openNotifications() {
  const user = await import('./community.js').then((m) => m.getCurrentUser());
  if (!user) {
    toast('로그인이 필요합니다');
    window.openLoginModal?.('login');
    return;
  }
  document.getElementById('notification-overlay')?.classList.add('open');
  await loadNotificationList();
}

function bindNotificationsUI() {
  if (window.__golmokNotifyBound) return;
  window.__golmokNotifyBound = true;

  document.getElementById('open-notifications')?.addEventListener('click', openNotifications);
  document.getElementById('nav-notifications')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openNotifications();
  });
  document.getElementById('close-notification-overlay')?.addEventListener('click', () => {
    document.getElementById('notification-overlay')?.classList.remove('open');
  });
  document.getElementById('notification-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'notification-overlay') e.target.classList.remove('open');
  });
}

export function initNotificationsUI() {
  bindNotificationsUI();
  window.openNotifications = openNotifications;
  refreshNotificationBadge().catch(() => {});
}

document.addEventListener('DOMContentLoaded', initNotificationsUI);

export { refreshNotificationBadge };
