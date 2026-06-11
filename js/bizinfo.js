import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase_config.js';
import { supabase } from './supabase_client.js';

/** 기업마당 지원사업 목록 — Edge Function(bizinfo-list) 경유 */
export async function fetchBizinfoPrograms({ question = '소상공인 지원', limit = 10 } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/bizinfo-list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ question, limit }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.success) {
    throw new Error(payload.error || '기업마당 API 조회 실패');
  }
  return payload.programs || [];
}
