import { supabase } from './supabase_client.js';
import { getCurrentUser } from './community.js?v=20260710';

export async function addGolmokScore(action, targetId) {
  const user = await getCurrentUser();
  if (!user) return { error: 'login' };

  const { data, error } = await supabase.rpc('add_golmok_score', {
    p_action: action,
    p_target_id: targetId || null,
  });

  if (error) {
    console.warn('addGolmokScore', error.message);
    return { error: error.message };
  }

  if (data?.delta > 0) showGolmokScoreToast(data.delta);
  return data;
}

export function showGolmokScoreToast(delta) {
  const n = Number(delta) || 0;
  if (n <= 0) return;

  let el = document.getElementById('golmok-score-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'golmok-score-toast';
    el.className = 'golmok-score-toast';
    document.body.appendChild(el);
  }

  el.innerHTML = `<i class="ti ti-trophy"></i> 골목지수 <strong>+${n}</strong>`;
  el.classList.add('show');
  window.clearTimeout(el._hideTimer);
  el._hideTimer = window.setTimeout(() => el.classList.remove('show'), 2800);
}

window.GolmokScore = {
  add: addGolmokScore,
  showToast: showGolmokScoreToast,
};
