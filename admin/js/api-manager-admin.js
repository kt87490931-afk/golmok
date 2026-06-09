import { supabase, showAdminToast, escapeHtml } from './admin-auth.js?v=20260630';

const API_META = {
  SOJANGGONG_WEATHER_KEY: { label: '① 창업기상도', endpoint: 'weather' },
  SOJANGGONG_HPREPORT_KEY: { label: '② 테마상권 분석', endpoint: 'hpReport' },
  SOJANGGONG_STARTUP_KEY: { label: '③ 상권지도', endpoint: 'startupPublic' },
  SOJANGGONG_STORSTTUS_KEY: { label: '④ 업소현황', endpoint: 'storSttus' },
  SOJANGGONG_API_ENABLED: { label: 'API 전체 스위치', endpoint: null },
  SOJANGGONG_API_MODE: { label: '데이터 모드', endpoint: null },
};

const KEY_ORDER = [
  'SOJANGGONG_API_ENABLED',
  'SOJANGGONG_API_MODE',
  'SOJANGGONG_STARTUP_KEY',
  'SOJANGGONG_WEATHER_KEY',
  'SOJANGGONG_HPREPORT_KEY',
  'SOJANGGONG_STORSTTUS_KEY',
];

function isKeyConfigured(value) {
  if (!value) return false;
  const v = String(value).trim();
  if (!v) return false;
  if (v.startsWith('YOUR_') || v.startsWith('REPLACE_')) return false;
  return true;
}

function getStatusBadge(row) {
  const key = row.key;
  const val = row.value;

  if (key === 'SOJANGGONG_API_ENABLED') {
    const on = val === 'true';
    return on
      ? '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#E8F8F0;color:#1D9E75;font-weight:600;">ON · 활성</span>'
      : '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#FFF1F1;color:#E24B4A;font-weight:600;">OFF · 차단</span>';
  }

  if (key === 'SOJANGGONG_API_MODE') {
    const real = val === 'real';
    return real
      ? '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#E8F8F0;color:#1D9E75;font-weight:600;">Real · 실제 API</span>'
      : '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#FFF8E7;color:#C17F24;font-weight:600;">Mock · 테스트</span>';
  }

  if (isKeyConfigured(val)) {
    return '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#E8F8F0;color:#1D9E75;font-weight:600;">키 등록됨</span>';
  }

  return '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#FFF1F1;color:#E24B4A;font-weight:600;">미설정</span>';
}

function getValueCell(row) {
  if (row.is_secret) {
    if (!isKeyConfigured(row.value)) {
      return '<span style="color:#E24B4A;font-size:12px;">키 없음</span>';
    }
    return `<span style="color:#555;font-size:12px;font-family:monospace;">****${escapeHtml(String(row.value).slice(-6))}</span>`;
  }
  return `<span style="font-weight:600;color:#1A1A1A;">${escapeHtml(row.value)}</span>`;
}

function getDescriptionCell(row) {
  const meta = API_META[row.key];
  const desc = row.description || meta?.label || '-';
  const endpoint = meta?.endpoint
    ? `<div style="font-size:11px;color:#999;margin-top:3px;">엔드포인트: <code style="background:#f5f5f5;padding:1px 6px;border-radius:4px;">/openApi/${meta.endpoint}</code></div>`
    : '';
  return `<div style="font-size:12px;color:#555;">${escapeHtml(desc)}</div>${endpoint}`;
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const ai = KEY_ORDER.indexOf(a.key);
    const bi = KEY_ORDER.indexOf(b.key);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

async function clearApiSettingsCacheSafe() {
  try {
    const mod = await import('../../js/api-config.js?v=20260630');
    mod.clearApiSettingsCache?.();
  } catch (_) {
    /* ignore */
  }
}

export async function loadApiSettings() {
  const tbody = document.getElementById('settings-tbody');
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">불러오는 중...</td></tr>';

  const { data, error } = await supabase.rpc('get_admin_app_settings');

  if (error) {
    console.error('loadApiSettings', error);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#E24B4A;line-height:1.6;">
      설정을 불러오지 못했습니다.<br>
      <span style="font-size:12px;color:#999;">${escapeHtml(error.message)}</span><br>
      <span style="font-size:12px;">관리자 권한(is_admin)과 SQL 마이그레이션(get_admin_app_settings)을 확인하세요.</span>
    </td></tr>`;
    showAdminToast('설정 로드 실패', 'error');
    return;
  }

  if (!data?.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">등록된 설정이 없습니다. sql/sojanggong_app_settings.sql 을 실행하세요.</td></tr>';
    return;
  }

  const rows = sortRows(data);

  tbody.innerHTML = rows
    .map((row) => {
      const meta = API_META[row.key];
      const name = meta?.label || row.key;
      return `<tr>
      <td style="font-weight:600;min-width:140px;">
        <div>${escapeHtml(name)}</div>
        <div style="font-size:10px;color:#999;font-family:monospace;margin-top:2px;">${escapeHtml(row.key)}</div>
      </td>
      <td>${getStatusBadge(row)}</td>
      <td>${getValueCell(row)}</td>
      <td>${getDescriptionCell(row)}</td>
      <td>
        <button type="button" class="btn-secondary" data-edit-id="${row.id}" data-edit-key="${escapeHtml(row.key)}" data-edit-secret="${row.is_secret ? '1' : '0'}">수정</button>
      </td>
    </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editSetting(btn.dataset.editId, btn.dataset.editKey, btn.dataset.editSecret === '1');
    });
  });

  const enabledRow = rows.find((r) => r.key === 'SOJANGGONG_API_ENABLED');
  const modeRow = rows.find((r) => r.key === 'SOJANGGONG_API_MODE');
  const toggleBtn = document.getElementById('btn-api-toggle');
  const modeBtn = document.getElementById('btn-mode-toggle');

  if (toggleBtn && enabledRow) {
    const on = enabledRow.value === 'true';
    toggleBtn.textContent = on ? 'ON' : 'OFF';
    toggleBtn.style.background = on ? '#1D9E75' : '#E24B4A';
  }
  if (modeBtn && modeRow) {
    const real = modeRow.value === 'real';
    modeBtn.textContent = real ? 'Real' : 'Mock';
    modeBtn.style.background = real ? '#1D9E75' : '#F5A623';
  }
}

function editSetting(id, key, isSecret) {
  const newValue = prompt(`${key} 값을 입력하세요:`, isSecret ? '' : undefined);
  if (newValue === null || newValue === '') return;

  supabase
    .from('app_settings')
    .update({ value: newValue, updated_at: new Date().toISOString() })
    .eq('id', id)
    .then(({ error }) => {
      if (!error) {
        clearApiSettingsCacheSafe();
        showAdminToast('설정이 저장되었습니다');
        loadApiSettings();
      } else {
        showAdminToast(`저장 실패: ${error.message}`, 'error');
      }
    });
}

export async function toggleApiEnabled(btn) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'SOJANGGONG_API_ENABLED')
    .maybeSingle();

  if (error) {
    showAdminToast('상태 변경 실패', 'error');
    return;
  }

  const newVal = data?.value !== 'true';
  const { error: upErr } = await supabase
    .from('app_settings')
    .update({ value: String(newVal), updated_at: new Date().toISOString() })
    .eq('key', 'SOJANGGONG_API_ENABLED');

  if (upErr) {
    showAdminToast('상태 변경 실패', 'error');
    return;
  }

  clearApiSettingsCacheSafe();
  if (btn) {
    btn.textContent = newVal ? 'ON' : 'OFF';
    btn.style.background = newVal ? '#1D9E75' : '#E24B4A';
  }
  showAdminToast(`API가 ${newVal ? '활성화' : '비활성화'}되었습니다`);
  loadApiSettings();
}

export async function toggleApiMode(btn) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'SOJANGGONG_API_MODE')
    .maybeSingle();

  if (error) {
    showAdminToast('모드 변경 실패', 'error');
    return;
  }

  const newMode = data?.value === 'mock' ? 'real' : 'mock';
  const { error: upErr } = await supabase
    .from('app_settings')
    .update({ value: newMode, updated_at: new Date().toISOString() })
    .eq('key', 'SOJANGGONG_API_MODE');

  if (upErr) {
    showAdminToast('모드 변경 실패', 'error');
    return;
  }

  clearApiSettingsCacheSafe();
  if (btn) {
    btn.textContent = newMode === 'real' ? 'Real' : 'Mock';
    btn.style.background = newMode === 'real' ? '#1D9E75' : '#F5A623';
  }
  showAdminToast(`${newMode.toUpperCase()} 모드로 변경되었습니다`);
  loadApiSettings();
}

export function bindApiManagerUI() {
  document.getElementById('btn-api-toggle')?.addEventListener('click', (e) => toggleApiEnabled(e.currentTarget));
  document.getElementById('btn-mode-toggle')?.addEventListener('click', (e) => toggleApiMode(e.currentTarget));
}
