import { supabase } from './supabase_client.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase_config.js';

function getSessionId() {
  let sid = sessionStorage.getItem('gm_ai_sid');
  if (!sid) {
    sid = `sess_${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem('gm_ai_sid', sid);
  }
  return sid;
}

async function getRegionHint() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('users')
      .select('region_dong, region_full')
      .eq('id', user.id)
      .maybeSingle();
    return data?.region_dong || data?.region_full || null;
  } catch {
    return null;
  }
}

/**
 * 골목대장 AI — Supabase Edge Function(ai-ask) 경유
 * Gemini·소진공 키는 서버에서만 사용
 */
export async function askGemini(question, tab = 'market') {
  if (!question?.trim()) {
    return { success: false, error: '질문을 입력해주세요' };
  }

  const sessionId = getSessionId();
  const regionHint = await getRegionHint();

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: question.trim().slice(0, 300),
        tab,
        sessionId,
        regionHint,
      }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: payload.error || payload.message || 'AI 서비스 응답 오류',
      };
    }

    return payload;
  } catch (err) {
    console.error('askGemini', err);
    return { success: false, error: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
  }
}

export function getChatExamples() {
  return [
    '동탄2동 카페 매출이 궁금해',
    '소상공인 지원금 신청 방법 알려줘',
    '동탄 상권 매출 통계 보여줘',
    '수원 인계동 치킨집 경쟁 현황',
  ];
}

/** @deprecated use getChatExamples */
export function getTabExamples() {
  return getChatExamples();
}
