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

export function getTabExamples(tab) {
  const examples = {
    market: [
      '동탄2동 카페 매출이 궁금해',
      '수원 인계동 치킨집 경쟁 현황',
      '화성 봉담읍 음식점 유동인구',
      '동탄에서 창업기상도 어때?',
    ],
    policy: [
      '창업 지원금 신청 방법 알려줘',
      '소상공인 정책자금이 있나요?',
      '폐업 지원금 받을 수 있나요?',
      '소진공 교육 프로그램이 있나요?',
    ],
    stats: [
      '동탄 상권 매출 통계 보여줘',
      '수원시 카페 업소 수 추이',
      '화성시 음식점 업소 현황',
      '동탄2동 창업기상도 점수',
    ],
  };
  return examples[tab] || examples.market;
}
