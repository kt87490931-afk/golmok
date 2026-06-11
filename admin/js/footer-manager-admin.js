import { supabase, showAdminToast, escapeHtml } from './admin-auth.js?v=20260630';

const FOOTER_KEYS = [
  { key: 'FOOTER_COMPANY_NAME', label: '상호', type: 'text' },
  { key: 'FOOTER_CEO', label: '대표자', type: 'text' },
  { key: 'FOOTER_BIZ_NO', label: '사업자등록번호', type: 'text' },
  { key: 'FOOTER_MAIL_ORDER_NO', label: '통신판매업 신고번호', type: 'text' },
  { key: 'FOOTER_JOB_NO', label: '직업정보제공사업 신고번호', type: 'text' },
  { key: 'FOOTER_HOSTING', label: '호스팅 사업자', type: 'text' },
  { key: 'FOOTER_ADDRESS', label: '주소', type: 'text' },
  { key: 'FOOTER_PHONE', label: '전화', type: 'text' },
  { key: 'FOOTER_EMAIL', label: '고객문의 이메일', type: 'text' },
  { key: 'FOOTER_SNS_FACEBOOK', label: 'Facebook URL', type: 'url' },
  { key: 'FOOTER_SNS_INSTAGRAM', label: 'Instagram URL', type: 'url' },
  { key: 'FOOTER_SNS_YOUTUBE', label: 'YouTube URL', type: 'url' },
  { key: 'FOOTER_LEGAL_LINKS', label: '약관 링크 (JSON)', type: 'json' },
];

async function clearFooterCache() {
  try {
    const mod = await import('../../js/footer_ui.js?v=20260674');
    mod.clearFooterSettingsCache?.();
  } catch (_) {
    /* ignore */
  }
}

function fieldHtml(row) {
  const meta = FOOTER_KEYS.find((k) => k.key === row.key);
  const label = meta?.label || row.key;
  const isJson = meta?.type === 'json';
  const val = row.value || '';
  return `<div class="footer-field" style="margin-bottom:16px;">
    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#333;">${escapeHtml(label)}
      <span style="font-size:10px;color:#999;font-weight:400;margin-left:6px;">${escapeHtml(row.key)}</span>
    </label>
    ${isJson
      ? `<textarea data-footer-id="${row.id}" data-footer-key="${escapeHtml(row.key)}" rows="6" style="width:100%;padding:10px;border:1px solid #E8E4DC;border-radius:8px;font-family:monospace;font-size:12px;">${escapeHtml(val)}</textarea>
         <div style="font-size:11px;color:#999;margin-top:4px;">예: [{"label":"이용약관","href":"terms.html","bold":false}]</div>`
      : `<input type="text" data-footer-id="${row.id}" data-footer-key="${escapeHtml(row.key)}" value="${escapeHtml(val)}" style="width:100%;padding:10px;border:1px solid #E8E4DC;border-radius:8px;font-size:13px;">`}
  </div>`;
}

export async function loadFooterSettings() {
  const root = document.getElementById('footer-settings-root');
  if (!root) return;

  root.innerHTML = '<p style="color:#999;padding:20px;text-align:center;">불러오는 중...</p>';

  const { data, error } = await supabase.rpc('get_admin_app_settings');
  if (error) {
    root.innerHTML = `<p style="color:#E24B4A;padding:20px;">로드 실패: ${escapeHtml(error.message)}</p>`;
    return;
  }

  const map = {};
  (data || []).forEach((r) => {
    map[r.key] = r;
  });

  const rows = FOOTER_KEYS.map((k) => map[k.key] || { id: null, key: k.key, value: '' });

  root.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px 24px;">
      ${rows.map((r) => fieldHtml(r)).join('')}
    </div>
    <div style="margin-top:20px;display:flex;gap:10px;">
      <button type="button" id="btn-footer-save" class="btn-primary" style="padding:10px 24px;border:none;border-radius:8px;background:#F5A623;color:#fff;font-weight:700;cursor:pointer;">저장</button>
      <a href="../index.html" target="_blank" rel="noopener" style="padding:10px 16px;font-size:13px;color:#C17F24;">사이트에서 미리보기 ↗</a>
    </div>`;

  document.getElementById('btn-footer-save')?.addEventListener('click', saveFooterSettings);
}

async function saveFooterSettings() {
  const inputs = document.querySelectorAll('[data-footer-key]');
  const btn = document.getElementById('btn-footer-save');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '저장 중...';
  }

  try {
    for (const el of inputs) {
      const key = el.dataset.footerKey;
      const value = el.value.trim();
      const id = el.dataset.footerId;

      if (key === 'FOOTER_LEGAL_LINKS' && value) {
        JSON.parse(value);
      }

      if (id) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('app_settings').insert({
          key,
          value,
          description: FOOTER_KEYS.find((k) => k.key === key)?.label || key,
          is_secret: false,
        });
        if (error) throw error;
      }
    }
    await clearFooterCache();
    showAdminToast('푸터 설정이 저장되었습니다');
    loadFooterSettings();
  } catch (err) {
    showAdminToast(`저장 실패: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '저장';
    }
  }
}
