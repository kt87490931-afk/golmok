import { askGemini, getTabExamples } from './gemini.js?v=20260687';
import { supabase } from './supabase_client.js';
import { searchRelatedPosts } from './community.js?v=20260687';

let currentTab = 'market';
let isThinking = false;
let recognition = null;
let isListening = false;
let thinkId = null;

const TAB_LABELS = {
  market: '상권정보',
  policy: '정책·지원',
  stats: '통계정보',
};

const TAB_EXAMPLE_META = {
  market: [
    { text: '동탄에서 치킨집 배달 많은 요일은?', icon: 'ti-bike' },
    { text: '수원 인계동 카페 경쟁 현황 알려줘', icon: 'ti-coffee' },
    { text: '화성 봉담읍 음식점 매출 추이', icon: 'ti-chart-line' },
    { text: '너의 사용법이 궁금해!', icon: 'ti-help-circle' },
  ],
  policy: [
    { text: '창업하고 싶은데 지원받을 수 있는 게 있나요?', icon: 'ti-file-text' },
    { text: '현재 지원받을 수 있는 정책이 있나요?', icon: 'ti-building-bank' },
    { text: '소상공인을 위한 대출이 있나요?', icon: 'ti-cash' },
    { text: '폐업 지원금 신청 방법은?', icon: 'ti-alert-circle' },
  ],
  stats: [
    { text: '동탄 상권 매출 통계 보여줘', icon: 'ti-chart-bar' },
    { text: '수원시 카페 업소 수 추이', icon: 'ti-trending-up' },
    { text: '화성시 음식점 업소 현황', icon: 'ti-store' },
    { text: '동탄2동 창업기상도 점수', icon: 'ti-cloud' },
  ],
};

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function escAttr(s) {
  return String(s || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

/** JSON 조각·코드 블록이 섞인 답변을 사용자용 문장으로 정리 */
function normalizeAnswerText(text) {
  let t = String(text || '').trim();
  if (!t) return '';

  t = t.replace(/```json/gi, '').replace(/```/g, '').trim();

  if (/^\s*[\{\[]/.test(t) || /\{\s*"answer"\s*:/.test(t)) {
    try {
      const obj = JSON.parse(t);
      if (obj?.answer && typeof obj.answer === 'string') return obj.answer.trim();
    } catch {
      const m = t.match(/"answer"\s*:\s*"([\s\S]*?)(?:"|$)/);
      if (m?.[1]?.trim()) return m[1].trim();
    }
    return '';
  }

  return t;
}

const RELATED_CAT_LABELS = {
  qna: '질문·고민',
  info: '정보공유',
  startup: '창업준비',
  issue: '이슈',
  event: '이벤트',
};

function getRelatedPostUrl(postId) {
  const isMobile = document.body.classList.contains('m-shell');
  const base = isMobile ? '../community.html' : 'community.html';
  return `${base}?id=${encodeURIComponent(postId)}`;
}

function renderRelatedPostsBody(posts) {
  const hasPosts = posts?.length > 0;
  if (hasPosts) {
    return `<ul class="ai-related-list">
        ${posts.map((p) => `
          <li>
            <a href="${getRelatedPostUrl(p.id)}" class="ai-related-item">
              <span class="ai-related-cat">${escHtml(RELATED_CAT_LABELS[p.category] || '게시글')}</span>
              <span class="ai-related-subj">${escHtml(p.title)}</span>
              <span class="ai-related-meta">
                ${p.region_dong ? escHtml(p.region_dong) + ' · ' : ''}👁 ${p.view_count || 0} · ❤ ${p.like_count || 0}
              </span>
            </a>
          </li>
        `).join('')}
      </ul>`;
  }
  return `<p class="ai-related-empty">관련 커뮤니티 글이 없습니다.</p>`;
}

function renderRelatedPosts(posts) {
  return `
    <div class="ai-related-posts">
      <div class="ai-related-title"><i class="ti ti-message-2"></i> 관련 커뮤니티 글</div>
      <div class="ai-related-body">${renderRelatedPostsBody(posts)}</div>
    </div>
  `;
}

async function hydrateRelatedPosts(slotEl, question, intent) {
  if (!slotEl) return;
  try {
    const related = await fetchRelatedPosts(question, intent);
    slotEl.innerHTML = renderRelatedPostsBody(related);
  } catch {
    slotEl.innerHTML = renderRelatedPostsBody([]);
  }
}

async function fetchRelatedPosts(question, intent) {
  try {
    return await searchRelatedPosts(question, {
      region: intent?.region || null,
      upjong: intent?.upjong || null,
      limit: 5,
    });
  } catch {
    return [];
  }
}

function getTabLabel() {
  return TAB_LABELS[currentTab] || '상권정보';
}

function scrollMessages() {
  const msgs = document.getElementById('ai-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

window.switchAITab = function switchAITab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.ai-tab').forEach((t) => {
    t.classList.toggle('act', t === btn);
  });
  document.querySelectorAll('.msg-ai-name .badge').forEach((b) => {
    b.textContent = `${getTabLabel()} 모드`;
  });
  updateExampleBtns();
};

function updateExampleBtns() {
  const wrap = document.getElementById('ai-examples');
  if (!wrap) return;
  const examples = TAB_EXAMPLE_META[currentTab] || TAB_EXAMPLE_META.market;
  wrap.innerHTML = examples.map((ex) => `
    <button type="button" class="ai-example-btn"
      onclick="window.sendAIExample('${escAttr(ex.text)}')">
      <i class="ti ${ex.icon}"></i>
      <div>
        <div>${escHtml(ex.text)}</div>
        <div class="ai-example-label">${escHtml(getTabLabel())}</div>
      </div>
    </button>
  `).join('');
}

window.sendAIExample = function sendAIExample(text) {
  const input = document.getElementById('ai-input');
  if (input) {
    input.value = text;
    handleInputChange(input);
    window.sendAIMessage();
  }
};

function appendUserMsg(text) {
  const msgs = document.getElementById('ai-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'msg-user';
  div.innerHTML = `<div class="msg-user-bubble">${escHtml(text)}</div>`;
  msgs.appendChild(div);
  scrollMessages();
}

function renderSuggestions(suggestions = []) {
  if (!suggestions?.length) return '';
  return `
    <div class="ai-suggestions">
      ${suggestions.map((s) => `
        <button type="button" class="ai-sug-btn"
          onclick="window.sendAIExample('${escAttr(s)}')">
          <i class="ti ti-message-question"></i>
          Q. ${escHtml(s)}
        </button>
      `).join('')}
    </div>
  `;
}

function renderDataCards(d) {
  if (!d) return '';
  const hasMetric = d.dailyPopulation != null || d.monthlyRevenue != null
    || d.storeCount != null || d.peakDay;
  if (!hasMetric) return '';

  return `
    <div class="ai-data-grid">
      ${d.dailyPopulation != null ? `
        <div class="ai-data-card">
          <div class="ai-data-label"><i class="ti ti-users"></i> 일 평균 유동인구</div>
          <div class="ai-data-value">${(d.dailyPopulation / 10000).toFixed(1)}만명</div>
          ${d.populationChange != null ? `
            <div class="ai-data-change ${d.populationChange >= 0 ? 'up' : 'dn'}">
              ${d.populationChange >= 0 ? '▲' : '▼'} ${Math.abs(d.populationChange)}% 전월 대비
            </div>` : ''}
        </div>` : ''}
      ${d.monthlyRevenue != null ? `
        <div class="ai-data-card">
          <div class="ai-data-label"><i class="ti ti-chart-bar"></i> 월 평균 매출</div>
          <div class="ai-data-value">${Math.round(d.monthlyRevenue / 10000)}만원</div>
          ${d.revenueChange != null ? `
            <div class="ai-data-change ${d.revenueChange >= 0 ? 'up' : 'dn'}">
              ${d.revenueChange >= 0 ? '▲' : '▼'} ${Math.abs(d.revenueChange)}% 전년 대비
            </div>` : ''}
        </div>` : ''}
      ${d.storeCount != null ? `
        <div class="ai-data-card">
          <div class="ai-data-label"><i class="ti ti-store"></i> 동종 업소 수</div>
          <div class="ai-data-value">${d.storeCount}개</div>
          ${d.storeChange != null ? `
            <div class="ai-data-change ${d.storeChange >= 0 ? 'dn' : 'up'}">
              ${d.storeChange >= 0 ? '▲' : '▼'} ${Math.abs(d.storeChange)}% 전년 대비
            </div>` : ''}
        </div>` : ''}
      ${d.peakDay ? `
        <div class="ai-data-card">
          <div class="ai-data-label"><i class="ti ti-clock"></i> 피크타임</div>
          <div class="ai-data-value">${escHtml(d.peakDay)}</div>
          <div class="ai-data-change" style="color:var(--g5);">${escHtml(d.peakTime || '')}</div>
        </div>` : ''}
      ${d.weatherScore != null ? `
        <div class="ai-data-card">
          <div class="ai-data-label"><i class="ti ti-cloud"></i> 창업기상도</div>
          <div class="ai-data-value">${d.weatherScore}점</div>
          <div class="ai-data-change" style="color:var(--g5);">${escHtml(d.weatherLabel || '')}</div>
        </div>` : ''}
    </div>
  `;
}

function appendAIMsg(text, suggestions = [], withRelated = false) {
  const msgs = document.getElementById('ai-messages');
  if (!msgs) return null;
  const div = document.createElement('div');
  div.className = 'msg-ai';
  div.innerHTML = `
    <div class="msg-ai-av">🤖</div>
    <div class="msg-ai-body">
      <div class="msg-ai-name">
        골목대장 AI
        <span class="badge">${getTabLabel()} 모드</span>
      </div>
      <div class="msg-ai-bubble">${text}${withRelated ? renderRelatedPosts([]) : ''}${renderSuggestions(suggestions)}</div>
    </div>
  `;
  msgs.appendChild(div);
  scrollMessages();
  return div.querySelector('.ai-related-body');
}

function renderPolicyCards(programs = []) {
  if (!programs?.length) {
    return `<p class="ai-policy-empty">관련 지원사업 공고를 찾지 못했습니다.</p>`;
  }
  return `<ul class="ai-policy-list">
    ${programs.map((p) => `
      <li>
        <a href="${escAttr(p.url)}" target="_blank" rel="noopener" class="ai-policy-item">
          <span class="ai-policy-cat">${escHtml(p.category || '지원사업')}</span>
          <span class="ai-policy-subj">${escHtml(p.title)}</span>
          <span class="ai-policy-meta">
            ${p.author ? escHtml(p.author) : ''}${p.period ? ` · 📅 ${escHtml(p.period)}` : ''}
          </span>
        </a>
      </li>
    `).join('')}
  </ul>`;
}

async function appendPolicyMsg(result, question) {
  const msgs = document.getElementById('ai-messages');
  if (!msgs) return;

  const div = document.createElement('div');
  div.className = 'msg-ai';
  div.innerHTML = `
    <div class="msg-ai-av">🤖</div>
    <div class="msg-ai-body">
      <div class="msg-ai-name">
        골목대장 AI
        <span class="badge">${getTabLabel()} 모드</span>
      </div>
      <div class="msg-ai-bubble">
        <div class="ai-data-source">
          📋 <strong>기업마당</strong> 지원사업 공고 · 실시간
        </div>
        <div class="ai-answer-box">${escHtml(normalizeAnswerText(result.answer) || '답변을 생성하지 못했습니다.')}</div>
        <div class="ai-policy-section">
          <div class="ai-related-title"><i class="ti ti-file-text"></i> 관련 지원사업 공고</div>
          ${renderPolicyCards(result.policyPrograms)}
        </div>
        ${renderRelatedPosts([])}
        ${renderSuggestions(result.suggestions || getTabExamples(currentTab))}
      </div>
    </div>
  `;
  msgs.appendChild(div);
  scrollMessages();
  await hydrateRelatedPosts(div.querySelector('.ai-related-body'), question, result.intent);
}

async function appendDataMsg(result, question) {
  const msgs = document.getElementById('ai-messages');
  if (!msgs) return;
  const d = result.apiData || {};
  const intent = result.intent || {};
  const regionLabel = intent.region || d.region || '';
  const upjongLabel = intent.upjong || d.upjong || '';

  const div = document.createElement('div');
  div.className = 'msg-ai';
  div.innerHTML = `
    <div class="msg-ai-av">🤖</div>
    <div class="msg-ai-body">
      <div class="msg-ai-name">
        골목대장 AI
        <span class="badge">${getTabLabel()} 모드</span>
      </div>
      <div class="msg-ai-bubble">
        ${regionLabel ? `
          <div class="ai-data-source">
            📍 <strong>${escHtml(regionLabel)}${upjongLabel ? ` · ${escHtml(upjongLabel)}` : ''}</strong>
            기준 소진공 데이터
            ${result.dataSource === 'mock' || result.dataSource === 'mock_fallback' ? '<span class="ai-data-mock"> · 샘플</span>' : ''}
          </div>` : ''}
        ${renderDataCards(d)}
        <div class="ai-answer-box">${escHtml(normalizeAnswerText(result.answer) || '답변을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.')}</div>
        ${result.summary ? `<div class="ai-summary">💡 ${escHtml(result.summary)}</div>` : ''}
        ${renderRelatedPosts([])}
        ${renderSuggestions(result.suggestions || getTabExamples(currentTab))}
      </div>
    </div>
  `;
  msgs.appendChild(div);
  scrollMessages();
  await hydrateRelatedPosts(div.querySelector('.ai-related-body'), question, intent);
}

async function appendBlockedMsg(answer, suggestions, question, intent) {
  const relatedSlot = appendAIMsg(`<div class="msg-blocked">⚠️ ${escHtml(answer)}</div>`, suggestions, true);
  await hydrateRelatedPosts(relatedSlot, question, intent);
}

function appendErrorMsg(text) {
  appendAIMsg(`<div class="msg-blocked">⚠️ ${escHtml(text)}</div>`);
}

let _thinkCnt = 0;
function appendThinking() {
  const id = `think-${++_thinkCnt}`;
  const msgs = document.getElementById('ai-messages');
  if (!msgs) return id;
  const div = document.createElement('div');
  div.className = 'msg-thinking';
  div.id = id;
  div.innerHTML = `
    <div class="msg-ai-av">🤖</div>
    <div class="thinking-dots">
      <div class="thinking-dot"></div>
      <div class="thinking-dot"></div>
      <div class="thinking-dot"></div>
    </div>
  `;
  msgs.appendChild(div);
  scrollMessages();
  return id;
}

function removeThinking(id) {
  document.getElementById(id)?.remove();
}

window.sendAIMessage = async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const q = input?.value?.trim();
  if (!q || isThinking) return;

  const examples = document.getElementById('ai-examples');
  if (examples) examples.style.display = 'none';

  appendUserMsg(q);
  if (input) {
    input.value = '';
    handleInputChange(input);
  }

  thinkId = appendThinking();
  isThinking = true;
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.disabled = true;

  const result = await askGemini(q, currentTab);

  removeThinking(thinkId);
  isThinking = false;
  if (sendBtn) sendBtn.disabled = false;

  if (!result.success) {
    appendErrorMsg(result.error || '답변을 생성하지 못했습니다');
    if (result.limitExceeded) return;
    return;
  }

  if (result.blocked || result.needMoreInfo) {
    await appendBlockedMsg(result.answer, result.suggestions || getTabExamples(currentTab), q, result.intent);
    return;
  }

  if (result.dataSource === 'bizinfo' || result.policyPrograms) {
    await appendPolicyMsg(result, q);
    return;
  }

  if (result.answer) {
    await appendDataMsg(result, q);
    return;
  }

  appendErrorMsg('답변을 생성하지 못했습니다');
};

window.handleInputChange = function handleInputChange(el) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  const len = el.value.length;
  const cc = document.getElementById('char-count');
  const sb = document.getElementById('send-btn');
  if (cc) {
    cc.textContent = len;
    cc.className = `ai-char-count${len > 250 ? ' warn' : ''}`;
  }
  if (sb) sb.disabled = !el.value.trim();
};

window.handleKeyDown = function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    window.sendAIMessage();
  }
};

window.toggleVoice = function toggleVoice() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    window.showToast?.('Chrome 브라우저에서 음성 인식을 이용해주세요');
    return;
  }
  if (isListening) cancelVoice();
  else startVoice();
};

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'ko-KR';
  recognition.continuous = false;
  recognition.interimResults = true;
  isListening = true;

  document.getElementById('voice-btn')?.classList.add('listening');
  document.getElementById('voice-overlay')?.classList.add('show');

  recognition.onresult = (e) => {
    const text = Array.from(e.results).map((r) => r[0].transcript).join('');
    const el = document.getElementById('voice-result');
    if (el) el.textContent = text;
    if (e.results[e.results.length - 1].isFinal) {
      const input = document.getElementById('ai-input');
      if (input) {
        input.value = text;
        handleInputChange(input);
      }
      cancelVoice();
    }
  };
  recognition.onerror = () => cancelVoice();
  recognition.onend = () => { if (isListening) cancelVoice(); };
  recognition.start();
}

window.cancelVoice = function cancelVoice() {
  isListening = false;
  recognition?.stop();
  recognition = null;
  document.getElementById('voice-btn')?.classList.remove('listening');
  document.getElementById('voice-overlay')?.classList.remove('show');
};

window.newAIChat = function newAIChat() {
  if (!confirm('새 채팅을 시작하시겠습니까?')) return;
  const url = new URL(window.location.href);
  url.searchParams.delete('q');
  window.location.href = url.pathname;
};

window.goBackFromAI = function goBackFromAI() {
  if (window.history.length > 1) window.history.back();
  else window.location.href = document.body.classList.contains('m-shell') ? 'index.html' : 'index.html';
};

function consumeInitialQuery() {
  const q = new URLSearchParams(window.location.search).get('q');
  if (!q?.trim()) return;
  const input = document.getElementById('ai-input');
  if (input) {
    input.value = q.trim();
    handleInputChange(input);
    window.setTimeout(() => window.sendAIMessage(), 400);
  }
}

function bindShellVoice() {
  window.startVoice = () => window.toggleVoice();
}

async function showAIStatusBanner() {
  try {
    const { data } = await supabase.rpc('get_ai_public_config');
    const map = {};
    (data || []).forEach((r) => { map[r.key] = r.value; });
    const enabled = map.GEMINI_ENABLED === 'true';
    const limit = map.GEMINI_DAILY_LIMIT ?? '0';
    const limitLabel = !limit || limit === '0' ? '무제한' : `${escHtml(limit)}회`;
    const banner = document.getElementById('ai-status-banner');
    if (!banner) return;
    if (!enabled) {
      banner.hidden = false;
      banner.innerHTML = '⚠️ AI 기능이 현재 <strong>OFF</strong> 상태입니다. 어드민 → AI 관리에서 ON으로 변경 후 API 키를 등록하세요.';
    } else {
      banner.hidden = false;
      banner.innerHTML = `ℹ️ 일일 질문 <strong>${limitLabel}</strong> · 소진공 API 데이터 기반 답변 · API 비용 관리를 위해 필요 시 어드민에서 한도를 설정할 수 있습니다.`;
    }
  } catch {
    /* ignore */
  }
}

function initAIChatPage() {
  updateExampleBtns();
  bindShellVoice();
  showAIStatusBanner();
  consumeInitialQuery();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAIChatPage);
} else {
  initAIChatPage();
}

document.addEventListener('gm-shell-ready', initAIChatPage);
