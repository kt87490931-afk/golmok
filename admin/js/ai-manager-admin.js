import { supabase, showAdminToast, escapeHtml } from './admin-auth.js?v=20260681';

const GEMINI_FIELDS = [
  { key: 'GEMINI_ENABLED', label: 'AI 기능 ON/OFF', type: 'toggle', desc: '비용 급증 시 즉시 차단 (API 키 없이도 OFF 유지)' },
  { key: 'GEMINI_DAILY_LIMIT', label: '일일 질문 한도', type: 'number', desc: '0=무제한, 1 이상=하루 최대 호출 수', min: 0, max: 1000 },
  { key: 'GEMINI_MAX_TOKENS', label: '최대 출력 토큰', type: 'number', desc: 'Gemini 답변 길이 제한', min: 80, max: 1024 },
  {
    key: 'GEMINI_MODEL',
    label: 'Gemini 모델',
    type: 'select',
    options: ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-2.5-flash-lite'],
    desc: '의도 파악 + 답변 생성에 사용',
  },
  { key: 'BIZINFO_API_ENABLED', label: '기업마당 정책 API', type: 'toggle', desc: '정책·지원 탭 / policy.html 지원사업 공고' },
];

function isKeyConfigured(value) {
  if (!value) return false;
  const v = String(value).trim();
  return v && !v.startsWith('YOUR_') && !v.startsWith('REPLACE_');
}

function toggleStyle(on) {
  return on
    ? 'background:#1D9E75;color:#fff;'
    : 'background:#E24B4A;color:#fff;';
}

export async function loadAIManager() {
  await Promise.all([loadAISettings(), loadAIStats(), loadAILogs(), loadRegionCodes()]);
}

async function loadAISettings() {
  const root = document.getElementById('ai-settings-root');
  if (!root) return;

  root.innerHTML = '<p style="color:#999;padding:16px;text-align:center;">불러오는 중...</p>';

  const { data, error } = await supabase.rpc('get_admin_app_settings');
  if (error) {
    root.innerHTML = `<p style="color:#E24B4A;">${escapeHtml(error.message)}</p>`;
    return;
  }

  const map = {};
  (data || []).forEach((r) => { map[r.key] = r.value; });

  const apiKeyRow = (data || []).find((r) => r.key === 'GEMINI_API_KEY');
  const apiConfigured = isKeyConfigured(apiKeyRow?.value);
  const bizKeyRow = (data || []).find((r) => r.key === 'BIZINFO_API_KEY');
  const bizConfigured = isKeyConfigured(bizKeyRow?.value);

  let fieldsHtml = GEMINI_FIELDS.map((f) => {
    const val = map[f.key] ?? '';
    if (f.type === 'toggle') {
      const on = val === 'true';
      return `<div class="ai-setting-row" style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #F5F1E8;">
        <div>
          <div style="font-size:14px;font-weight:600;">${escapeHtml(f.label)}</div>
          <div style="font-size:12px;color:#999;margin-top:2px;">${escapeHtml(f.desc)}</div>
        </div>
        <button type="button" class="ai-toggle-btn" data-key="${f.key}" data-on="${on ? '1' : '0'}"
          style="padding:8px 18px;border-radius:20px;border:none;font-size:13px;font-weight:700;cursor:pointer;${toggleStyle(on)}">
          ${on ? 'ON' : 'OFF'}
        </button>
      </div>`;
    }
    if (f.type === 'select') {
      const opts = f.options.map((o) =>
        `<option value="${escapeHtml(o)}"${o === val ? ' selected' : ''}>${escapeHtml(o)}</option>`,
      ).join('');
      return `<div style="padding:14px 0;border-bottom:1px solid #F5F1E8;">
        <label style="font-size:14px;font-weight:600;">${escapeHtml(f.label)}</label>
        <div style="font-size:12px;color:#999;margin:2px 0 8px;">${escapeHtml(f.desc)}</div>
        <select data-ai-key="${f.key}" style="width:100%;max-width:320px;padding:8px 10px;border:1px solid #E8E4DC;border-radius:8px;font-size:13px;">${opts}</select>
      </div>`;
    }
    return `<div style="padding:14px 0;border-bottom:1px solid #F5F1E8;">
      <label style="font-size:14px;font-weight:600;">${escapeHtml(f.label)}</label>
      <div style="font-size:12px;color:#999;margin:2px 0 8px;">${escapeHtml(f.desc)}</div>
      <input type="number" data-ai-key="${f.key}" value="${escapeHtml(val)}" min="${f.min}" max="${f.max}"
        style="width:120px;padding:8px 10px;border:1px solid #E8E4DC;border-radius:8px;font-size:13px;">
    </div>`;
  }).join('');

  fieldsHtml += `<div style="padding:14px 0;border-bottom:1px solid #F5F1E8;opacity:.85;">
    <div style="font-size:14px;font-weight:600;">Gemini API 키</div>
    <div style="font-size:12px;color:#999;margin:4px 0 8px;">마지막 단계에서 등록 예정 · 현재 ${apiConfigured ? '등록됨' : '미등록'}</div>
    <input type="password" disabled placeholder="API 키는 별도 등록 예정"
      style="width:100%;max-width:400px;padding:8px 10px;border:1px solid #E8E4DC;border-radius:8px;font-size:13px;background:#f9f9f9;">
    ${apiConfigured ? `<div style="font-size:11px;color:#1D9E75;margin-top:6px;">****${escapeHtml(String(apiKeyRow.value).slice(-6))}</div>` : ''}
  </div>`;

  fieldsHtml += `<div style="padding:14px 0;border-bottom:1px solid #F5F1E8;">
    <div style="font-size:14px;font-weight:600;">기업마당 API 키 (crtfcKey)</div>
    <div style="font-size:12px;color:#999;margin:4px 0 8px;">
      <a href="https://www.bizinfo.go.kr/apiDetail.do?id=bizinfoApi" target="_blank" rel="noopener">기업마당 API 신청</a>
      · 현재 ${bizConfigured ? '등록됨' : '미등록'}
    </div>
    <input type="password" id="bizinfo-api-key-input" data-bizinfo-key="1"
      placeholder="${bizConfigured ? '변경 시 새 키 입력' : '발급받은 crtfcKey 입력'}"
      style="width:100%;max-width:400px;padding:8px 10px;border:1px solid #E8E4DC;border-radius:8px;font-size:13px;">
    ${bizConfigured ? `<div style="font-size:11px;color:#1D9E75;margin-top:6px;">****${escapeHtml(String(bizKeyRow.value).slice(-6))}</div>` : ''}
  </div>`;

  root.innerHTML = `
    ${fieldsHtml}
    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
      <button type="button" id="btn-ai-save" style="padding:10px 24px;border:none;border-radius:8px;background:#F5A623;color:#fff;font-weight:700;cursor:pointer;">설정 저장</button>
      <a href="../ai-search.html" target="_blank" rel="noopener" style="padding:10px 16px;font-size:13px;color:#C17F24;">AI 검색 미리보기 ↗</a>
    </div>`;

  root.querySelectorAll('.ai-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.dataset.on !== '1';
      btn.dataset.on = on ? '1' : '0';
      btn.textContent = on ? 'ON' : 'OFF';
      btn.style.cssText = `padding:8px 18px;border-radius:20px;border:none;font-size:13px;font-weight:700;cursor:pointer;${toggleStyle(on)}`;
    });
  });

  document.getElementById('btn-ai-save')?.addEventListener('click', saveAISettings);
}

async function saveAISettings() {
  const btn = document.getElementById('btn-ai-save');
  if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }

  try {
    for (const f of GEMINI_FIELDS) {
      let value;
      if (f.type === 'toggle') {
        const el = document.querySelector(`.ai-toggle-btn[data-key="${f.key}"]`);
        value = el?.dataset.on === '1' ? 'true' : 'false';
      } else {
        const el = document.querySelector(`[data-ai-key="${f.key}"]`);
        value = el?.value?.trim() ?? '';
      }
      const { error } = await supabase.rpc('upsert_admin_app_setting', {
        p_key: f.key,
        p_value: value,
        p_description: f.label,
        p_is_secret: false,
      });
      if (error) throw error;
    }

    const bizKeyInput = document.getElementById('bizinfo-api-key-input');
    const newBizKey = bizKeyInput?.value?.trim();
    if (newBizKey) {
      const { error } = await supabase.rpc('upsert_admin_app_setting', {
        p_key: 'BIZINFO_API_KEY',
        p_value: newBizKey,
        p_description: '기업마당 지원사업정보 API crtfcKey',
        p_is_secret: true,
      });
      if (error) throw error;
      if (bizKeyInput) bizKeyInput.value = '';
    }

    showAdminToast('AI 설정이 저장되었습니다');
    loadAISettings();
    loadAIStats();
  } catch (err) {
    showAdminToast(`저장 실패: ${err.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '설정 저장'; }
  }
}

async function loadAIStats() {
  const root = document.getElementById('ai-stats-root');
  if (!root) return;

  const { data, error } = await supabase.rpc('get_ai_admin_stats');
  if (error) {
    root.innerHTML = `<p style="color:#E24B4A;font-size:13px;">${escapeHtml(error.message)}</p>`;
    return;
  }

  const s = data || {};
  root.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">
      <div style="padding:14px;background:#F7F3EB;border-radius:10px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:#1A1A1A;">${s.today_total ?? 0}</div>
        <div style="font-size:11px;color:#888;margin-top:4px;">오늘 호출</div>
      </div>
      <div style="padding:14px;background:#E8F8F0;border-radius:10px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:#1D9E75;">${s.today_ok ?? 0}</div>
        <div style="font-size:11px;color:#888;margin-top:4px;">오늘 정상 답변</div>
      </div>
      <div style="padding:14px;background:#FFF1F1;border-radius:10px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:#E24B4A;">${s.today_blocked ?? 0}</div>
        <div style="font-size:11px;color:#888;margin-top:4px;">오늘 차단</div>
      </div>
      <div style="padding:14px;background:#F7F3EB;border-radius:10px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:#1A1A1A;">${s.all_total ?? 0}</div>
        <div style="font-size:11px;color:#888;margin-top:4px;">누적 로그</div>
      </div>
      <div style="padding:14px;background:#FFF8E7;border-radius:10px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:#C17F24;">${s.region_count ?? 0}</div>
        <div style="font-size:11px;color:#888;margin-top:4px;">활성 지역코드</div>
      </div>
    </div>`;
}

async function loadAILogs() {
  const tbody = document.getElementById('ai-logs-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:#999;">불러오는 중...</td></tr>';

  const { data, error } = await supabase.rpc('get_admin_ai_logs', { p_limit: 15 });
  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#E24B4A;padding:16px;">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:#999;">아직 AI 호출 로그가 없습니다</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((row) => {
    const dt = row.created_at ? new Date(row.created_at).toLocaleString('ko-KR') : '-';
    const status = row.blocked
      ? '<span style="color:#E24B4A;font-size:11px;">차단</span>'
      : '<span style="color:#1D9E75;font-size:11px;">정상</span>';
    return `<tr>
      <td style="font-size:12px;white-space:nowrap;">${escapeHtml(dt)}</td>
      <td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(row.question)}">${escapeHtml(row.question)}</td>
      <td style="font-size:11px;">${escapeHtml(row.intent || '-')}</td>
      <td style="font-size:11px;">${escapeHtml(row.api_called || '-')}</td>
      <td>${status}</td>
    </tr>`;
  }).join('');
}

async function loadRegionCodes() {
  const tbody = document.getElementById('region-codes-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#999;">불러오는 중...</td></tr>';

  const { data, error } = await supabase.rpc('get_admin_region_codes');
  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#E24B4A;padding:16px;">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#999;">등록된 지역이 없습니다</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((r) => `<tr data-region-id="${r.id}">
    <td style="font-size:12px;">${escapeHtml(r.sido || '-')}</td>
    <td style="font-size:12px;">${escapeHtml(r.sigungu || '-')}</td>
    <td style="font-size:12px;font-weight:600;">${escapeHtml(r.name)}</td>
    <td style="font-size:11px;font-family:monospace;">${escapeHtml(r.code)}</td>
    <td style="font-size:11px;color:#888;max-width:120px;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(r.aliases || '')}">${escapeHtml(r.aliases || '-')}</td>
    <td>${r.enabled ? '<span style="color:#1D9E75;font-size:11px;">ON</span>' : '<span style="color:#999;font-size:11px;">OFF</span>'}</td>
  </tr>`).join('');
}

export function bindRegionForm() {
  document.getElementById('btn-region-add')?.addEventListener('click', async () => {
    const name = document.getElementById('region-name')?.value?.trim();
    const code = document.getElementById('region-code')?.value?.trim();
    const aliases = document.getElementById('region-aliases')?.value?.trim();
    const sido = document.getElementById('region-sido')?.value?.trim();
    const sigungu = document.getElementById('region-sigungu')?.value?.trim();

    if (!name || !code) {
      showAdminToast('지역명과 코드는 필수입니다', 'error');
      return;
    }

    const { error } = await supabase.rpc('upsert_admin_region_code', {
      p_id: null,
      p_name: name,
      p_code: code,
      p_aliases: aliases || null,
      p_sido: sido || null,
      p_sigungu: sigungu || null,
      p_enabled: true,
    });

    if (error) {
      showAdminToast(`등록 실패: ${error.message}`, 'error');
      return;
    }

    showAdminToast('지역 코드가 등록되었습니다');
    document.getElementById('region-name').value = '';
    document.getElementById('region-code').value = '';
    document.getElementById('region-aliases').value = '';
    loadRegionCodes();
    loadAIStats();
  });
}
