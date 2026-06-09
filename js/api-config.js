import { supabase } from './supabase_client.js';

let _settings = null;
let _settingsPromise = null;

export const SOJANGGONG_BASE = 'https://bigdata.sbiz.or.kr';

export async function getApiSettings(force = false) {
  if (_settings && !force) return _settings;
  if (_settingsPromise && !force) return _settingsPromise;

  _settingsPromise = (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      _settings = null;
      return null;
    }

    const { data, error } = await supabase.rpc('get_sojanggong_settings');
    if (error) {
      console.warn('get_sojanggong_settings', error.message);
      _settings = null;
      return null;
    }

    _settings = {};
    (data || []).forEach((row) => {
      _settings[row.key] = row.value;
    });
    return _settings;
  })();

  return _settingsPromise;
}

export function clearApiSettingsCache() {
  _settings = null;
  _settingsPromise = null;
}

export async function getApiKey(keyName) {
  const settings = await getApiSettings();
  return settings?.[keyName] || null;
}

export async function isApiEnabled() {
  const settings = await getApiSettings();
  return settings?.SOJANGGONG_API_ENABLED === 'true';
}

export async function getApiMode() {
  const settings = await getApiSettings();
  return settings?.SOJANGGONG_API_MODE || 'mock';
}

export function buildApiUrl(endpoint, params = {}) {
  const url = new URL(`${SOJANGGONG_BASE}/openApi/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') {
      url.searchParams.append(k, v);
    }
  });
  return url.toString();
}
