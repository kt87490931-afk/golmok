import { initPageShell, bootPage } from '../page_common.js';
import { getApiKey } from '../api-config.js?v=20260643';

const TABS = [
  { id: 'map', label: '상권지도', endpoint: 'startupPublic', keyName: 'SOJANGGONG_STARTUP_KEY' },
  { id: 'weather', label: '창업기상도', endpoint: 'weather', keyName: 'SOJANGGONG_WEATHER_KEY' },
  { id: 'theme', label: '테마상권', endpoint: 'hpReport', keyName: 'SOJANGGONG_HPREPORT_KEY' },
  { id: 'store', label: '업소현황', endpoint: 'storSttus', keyName: 'SOJANGGONG_STORSTTUS_KEY' },
  { id: 'simple', label: '간단분석', endpoint: 'simple', keyName: 'SOJANGGONG_SIMPLE_KEY' },
  { id: 'detail', label: '상세분석', endpoint: 'detail', keyName: 'SOJANGGONG_DETAIL_KEY' },
  { id: 'sns', label: 'SNS분석', endpoint: 'snsAnaly', keyName: 'SOJANGGONG_SNS_KEY' },
  { id: 'delivery', label: '배달분석', endpoint: 'delivery', keyName: 'SOJANGGONG_DELIVERY_KEY' },
  { id: 'tour', label: '관광축제', endpoint: 'tour', keyName: 'SOJANGGONG_TOUR_KEY' },
  { id: 'stcar', label: '업력현황', endpoint: 'stcarSttus', keyName: 'SOJANGGONG_STCARSTTUS_KEY' },
  { id: 'sls', label: '매출추이', endpoint: 'slsIdex', keyName: 'SOJANGGONG_SLSIDEX_KEY' },
];

let activeTabId = 'map';

function toast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
  else alert(msg);
}

function getTabFromQuery() {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return TABS.some((t) => t.id === tab) ? tab : 'map';
}

function renderTabs() {
  const wrap = document.getElementById('sbiz-tabs');
  if (!wrap) return;
  wrap.innerHTML = TABS.map(
    (t) =>
      `<button type="button" class="sbiz-tab${t.id === activeTabId ? ' act' : ''}" data-tab="${t.id}">${t.label}</button>`
  ).join('');
  wrap.querySelectorAll('.sbiz-tab').forEach((btn) => {
    btn.addEventListener('click', () => selectTab(btn.dataset.tab));
  });
}

async function buildTabUrl(tab) {
  const certKey = await getApiKey(tab.keyName);
  if (!certKey) return '';
  const qs = new URLSearchParams({ certKey });
  return `https://bigdata.sbiz.or.kr/#/openApi/${tab.endpoint}?${qs.toString()}`;
}

async function selectTab(tabId, { updateQuery = true } = {}) {
  const tab = TABS.find((t) => t.id === tabId) || TABS[0];
  activeTabId = tab.id;

  document.querySelectorAll('.sbiz-tab').forEach((el) => {
    el.classList.toggle('act', el.dataset.tab === tab.id);
  });

  if (updateQuery) {
    const url = new URL(window.location.href);
    if (tab.id === 'map') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab.id);
    window.history.replaceState({}, '', url);
  }

  const iframe = document.getElementById('sbiz-iframe');
  const loading = document.getElementById('sbiz-iframe-loading');
  if (!iframe || !loading) return;

  loading.style.display = 'flex';
  loading.textContent = `${tab.label} 불러오는 중...`;

  const src = await buildTabUrl(tab);
  if (!src) {
    loading.innerHTML = `<span style="color:#E24B4A;text-align:center;padding:16px;">API 키가 설정되지 않았습니다.<br><span style="font-size:12px;color:#999;">Supabase app_settings 또는 어드민 API 관리에서 확인하세요.</span></span>`;
    iframe.removeAttribute('src');
    return;
  }

  iframe.onload = () => {
    loading.style.display = 'none';
  };
  iframe.onerror = () => {
    loading.textContent = '지도를 불러오지 못했습니다.';
  };
  iframe.src = src;
}

async function initSbizAnalysisPage() {
  activeTabId = getTabFromQuery();
  renderTabs();
  await selectTab(activeTabId, { updateQuery: false });

  window.addEventListener('golmok:auth-changed', async () => {
    await selectTab(activeTabId, { updateQuery: false });
  });
}

bootPage(() => {
  const isMobileApp = !!document.querySelector('.app.mobile-analysis');
  if (!isMobileApp) initPageShell('analysis');
  initSbizAnalysisPage();
});
