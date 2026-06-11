import { supabase, showAdminToast, escapeHtml } from './admin-auth.js?v=20260630';

const LEGAL_PAGES = [
  { slug: 'terms', key: 'LEGAL_CONTENT_TERMS', label: '이용약관', preview: '../terms.html', defaultTitle: '서비스 이용약관', defaultUpdated: '시행일: 2026년 6월 4일' },
  { slug: 'privacy', key: 'LEGAL_CONTENT_PRIVACY', label: '개인정보처리방침', preview: '../privacy.html', defaultTitle: '개인정보 처리방침', defaultUpdated: '시행일: 2026년 6월 4일' },
  { slug: 'operation', key: 'LEGAL_CONTENT_OPERATION', label: '운영정책', preview: '../policy-operation.html', defaultTitle: '운영정책', defaultUpdated: '최종 업데이트: 2026년 6월' },
  { slug: 'user', key: 'LEGAL_CONTENT_USER', label: '이용자보호 비전과 계획', preview: '../policy-user.html', defaultTitle: '이용자보호 비전과 계획', defaultUpdated: '최종 업데이트: 2026년 6월' },
  { slug: 'youth', key: 'LEGAL_CONTENT_YOUTH', label: '청소년보호정책', preview: '../policy-youth.html', defaultTitle: '청소년보호정책', defaultUpdated: '최종 업데이트: 2026년 6월' },
];

let activeSlug = 'terms';
let settingsMap = {};

function parseLegalValue(raw, page) {
  if (!raw) return { title: page.defaultTitle, updated: page.defaultUpdated, body: '' };
  try {
    const o = JSON.parse(raw);
    return {
      title: o.title || page.defaultTitle,
      updated: o.updated || page.defaultUpdated,
      body: o.body || '',
    };
  } catch {
    return { title: page.defaultTitle, updated: page.defaultUpdated, body: '' };
  }
}

function tabButtons() {
  return LEGAL_PAGES.map((p) => `
    <button type="button" class="legal-tab${p.slug === activeSlug ? ' active' : ''}" data-slug="${p.slug}"
      style="padding:8px 14px;border-radius:8px;border:1px solid #E8E4DC;background:${p.slug === activeSlug ? '#FFF8E7' : '#fff'};
      color:${p.slug === activeSlug ? '#C17F24' : '#555'};font-size:13px;font-weight:${p.slug === activeSlug ? '700' : '500'};cursor:pointer;">
      ${escapeHtml(p.label)}
    </button>`).join('');
}

function editorHtml(page, data) {
  return `
    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">페이지 제목</label>
      <input type="text" id="legal-title-input" value="${escapeHtml(data.title)}" style="width:100%;padding:10px;border:1px solid #E8E4DC;border-radius:8px;">
    </div>
    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">시행일 / 업데이트 문구</label>
      <input type="text" id="legal-updated-input" value="${escapeHtml(data.updated)}" style="width:100%;padding:10px;border:1px solid #E8E4DC;border-radius:8px;">
    </div>
    <div style="margin-bottom:8px;">
      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">본문 (HTML)</label>
      <p style="font-size:12px;color:#888;margin-bottom:8px;">&lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;&lt;li&gt; 태그로 작성하세요. 저장 후 미리보기에서 확인합니다.</p>
      <textarea id="legal-body-input" rows="18" style="width:100%;padding:12px;border:1px solid #E8E4DC;border-radius:8px;font-family:monospace;font-size:12px;line-height:1.6;">${escapeHtml(data.body)}</textarea>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
      <button type="button" id="btn-legal-save" class="btn-primary" style="padding:10px 24px;border:none;border-radius:8px;background:#F5A623;color:#fff;font-weight:700;cursor:pointer;">저장</button>
      <a href="${page.preview}" target="_blank" rel="noopener" style="padding:10px 16px;font-size:13px;color:#C17F24;">미리보기 ↗</a>
    </div>`;
}

function render() {
  const root = document.getElementById('legal-editor-root');
  if (!root) return;
  const page = LEGAL_PAGES.find((p) => p.slug === activeSlug) || LEGAL_PAGES[0];
  const raw = settingsMap[page.key]?.value || '';
  const data = parseLegalValue(raw, page);

  root.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">${tabButtons()}</div>
    <div class="admin-card" style="padding:20px;">${editorHtml(page, data)}</div>`;

  root.querySelectorAll('.legal-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSlug = btn.dataset.slug;
      render();
    });
  });
  document.getElementById('btn-legal-save')?.addEventListener('click', saveLegal);
}

async function saveLegal() {
  const page = LEGAL_PAGES.find((p) => p.slug === activeSlug);
  if (!page) return;
  const btn = document.getElementById('btn-legal-save');
  const title = document.getElementById('legal-title-input')?.value?.trim() || page.defaultTitle;
  const updated = document.getElementById('legal-updated-input')?.value?.trim() || page.defaultUpdated;
  const body = document.getElementById('legal-body-input')?.value?.trim() || '';

  if (btn) {
    btn.disabled = true;
    btn.textContent = '저장 중...';
  }

  try {
    const payload = JSON.stringify({ title, updated, body });
    const { error } = await supabase.rpc('upsert_admin_app_setting', {
      p_key: page.key,
      p_value: payload,
      p_description: `${page.label} 본문`,
      p_is_secret: false,
    });
    if (error) throw error;
    showAdminToast(`${page.label}이(가) 저장되었습니다`);
    await loadLegalSettings();
  } catch (err) {
    showAdminToast(`저장 실패: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '저장';
    }
  }
}

export async function loadLegalSettings() {
  const root = document.getElementById('legal-editor-root');
  if (!root) return;
  root.innerHTML = '<p style="color:#999;padding:20px;text-align:center;">불러오는 중...</p>';

  const { data, error } = await supabase.rpc('get_admin_app_settings');
  if (error) {
    root.innerHTML = `<p style="color:#E24B4A;padding:20px;">로드 실패: ${escapeHtml(error.message)}</p>`;
    return;
  }

  settingsMap = {};
  (data || []).forEach((r) => {
    settingsMap[r.key] = r;
  });
  render();
}
