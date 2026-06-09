import { supabase, showAdminToast, escapeHtml } from './admin-auth.js?v=20260629';
import { clearApiSettingsCache } from '../../js/api-config.js';

export async function loadApiSettings() {
  const { data, error } = await supabase.from('app_settings').select('*').order('key');
  if (error) {
    console.error('loadApiSettings', error);
    showAdminToast('설정을 불러오지 못했습니다', 'error');
    return;
  }

  const tbody = document.getElementById('settings-tbody');
  if (!tbody) return;

  if (!data?.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;padding:20px;color:#999;">등록된 설정이 없습니다. sql/sojanggong_app_settings.sql 을 실행하세요.</td></tr>';
    return;
  }

  tbody.innerHTML = data
    .map(
      (row) => `
    <tr>
      <td style="font-weight:500;">${escapeHtml(row.key)}</td>
      <td>${
        row.is_secret
          ? `<span style="color:#999;font-size:12px;">****${escapeHtml(String(row.value).slice(-6))}</span>`
          : escapeHtml(row.value)
      }</td>
      <td style="color:#999;font-size:12px;">${escapeHtml(row.description || '-')}</td>
      <td>
        <button type="button" class="btn-secondary" data-edit-id="${row.id}" data-edit-key="${escapeHtml(row.key)}" data-edit-secret="${row.is_secret ? '1' : '0'}">수정</button>
      </td>
    </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editSetting(btn.dataset.editId, btn.dataset.editKey, btn.dataset.editSecret === '1');
    });
  });

  const enabledRow = data.find((r) => r.key === 'SOJANGGONG_API_ENABLED');
  const modeRow = data.find((r) => r.key === 'SOJANGGONG_API_MODE');
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
        clearApiSettingsCache();
        showAdminToast('설정이 저장되었습니다');
        loadApiSettings();
      } else {
        showAdminToast('저장에 실패했습니다', 'error');
      }
    });
}

export async function toggleApiEnabled(btn) {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'SOJANGGONG_API_ENABLED').maybeSingle();
  const newVal = data?.value !== 'true';
  await supabase
    .from('app_settings')
    .update({ value: String(newVal), updated_at: new Date().toISOString() })
    .eq('key', 'SOJANGGONG_API_ENABLED');
  clearApiSettingsCache();
  if (btn) {
    btn.textContent = newVal ? 'ON' : 'OFF';
    btn.style.background = newVal ? '#1D9E75' : '#E24B4A';
  }
  showAdminToast(`API가 ${newVal ? '활성화' : '비활성화'}되었습니다`);
}

export async function toggleApiMode(btn) {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'SOJANGGONG_API_MODE').maybeSingle();
  const newMode = data?.value === 'mock' ? 'real' : 'mock';
  await supabase
    .from('app_settings')
    .update({ value: newMode, updated_at: new Date().toISOString() })
    .eq('key', 'SOJANGGONG_API_MODE');
  clearApiSettingsCache();
  if (btn) {
    btn.textContent = newMode === 'real' ? 'Real' : 'Mock';
    btn.style.background = newMode === 'real' ? '#1D9E75' : '#F5A623';
  }
  showAdminToast(`${newMode.toUpperCase()} 모드로 변경되었습니다`);
}

export function bindApiManagerUI() {
  document.getElementById('btn-api-toggle')?.addEventListener('click', (e) => toggleApiEnabled(e.currentTarget));
  document.getElementById('btn-mode-toggle')?.addEventListener('click', (e) => toggleApiMode(e.currentTarget));
}
