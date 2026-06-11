import { initPageShell, bootPage } from '../page_common.js';
import { getApiKey } from '../api-config.js?v=20260665';
import { probeOpenApi } from '../sojanggong-api.js?v=20260666';

/** 개발자 전용: ?debug=1 또는 ?api_debug=1 일 때만 API 프로브 패널 표시 */
function isApiDebugEnabled() {
  const q = new URLSearchParams(window.location.search);
  return q.get('debug') === '1' || q.get('api_debug') === '1';
}

/** tab id → API 설정 */
const TAB_ENTRIES = {
  map: {
    group: 'status',
    label: '상권지도',
    endpoint: 'startupPublic',
    keyName: 'SOJANGGONG_STARTUP_KEY',
    live: true,
  },
  weather: {
    group: 'status',
    label: '창업기상도',
    endpoint: 'weather',
    keyName: 'SOJANGGONG_WEATHER_KEY',
    live: true,
  },
  hotplace: {
    group: 'status',
    label: '핫플레이스',
    gisEmbed: 'hpReport',
    gisParams: { leftMenu: 'hotPlace', mapOnly: 'Y' },
    keyName: 'SOJANGGONG_HPREPORT_KEY',
    live: true,
  },
  store: {
    group: 'analysis',
    label: '업소현황',
    endpoint: 'storSttus',
    keyName: 'SOJANGGONG_STORSTTUS_KEY',
    live: true,
  },
  simple: {
    group: 'analysis',
    label: '간단분석',
    endpoint: 'simple',
    gisEmbed: 'simple',
    gisParams: { type: 'simple' },
    keyName: 'SOJANGGONG_SIMPLE_KEY',
    live: true,
  },
  detail: {
    group: 'analysis',
    label: '상세분석',
    endpoint: 'detail',
    gisEmbed: 'detail',
    gisParams: { type: 'detail' },
    keyName: 'SOJANGGONG_DETAIL_KEY',
    live: true,
  },
  theme: {
    group: 'theme',
    label: '테마상권',
    endpoint: 'hpReport',
    keyName: 'SOJANGGONG_HPREPORT_KEY',
    live: true,
  },
  sns: {
    group: 'theme',
    label: 'SNS분석',
    endpoint: 'snsAnaly',
    keyName: 'SOJANGGONG_SNS_KEY',
    live: true,
  },
  delivery: {
    group: 'theme',
    label: '배달분석',
    endpoint: 'delivery',
    keyName: 'SOJANGGONG_DELIVERY_KEY',
    live: true,
  },
  festival: {
    group: 'theme',
    label: '관광축제',
    endpoint: 'tour',
    keyName: 'SOJANGGONG_TOUR_KEY',
    live: true,
  },
  history: {
    group: 'theme',
    label: '업력현황',
    endpoint: 'stcarSttus',
    keyName: 'SOJANGGONG_STCARSTTUS_KEY',
    live: true,
    usageHint: '지역을 선택한 뒤 iframe 안의 「현황 보기」 버튼을 눌러 데이터를 확인하세요.',
  },
  sales: {
    group: 'theme',
    label: '매출추이',
    endpoint: 'slsIdex',
    keyName: 'SOJANGGONG_SLSIDEX_KEY',
    live: true,
    usageHint: '지역·업종을 선택한 뒤 iframe 안의 「현황 보기」 버튼을 눌러 차트를 확인하세요.',
  },
};

const COMING_SOON_MSG = '추가 API 승인 후 오픈 예정입니다';

const TAB_ALIASES = {
  tour: 'festival',
  stcar: 'history',
  sls: 'sales',
};

let currentTab = 'map';
let currentGroup = 'status';
let probeSeq = 0;

function normalizeTabId(tabKey) {
  const key = tabKey || 'map';
  return TAB_ALIASES[key] || key;
}

async function buildTabUrl(entry) {
  const certKey = await getApiKey(entry.keyName);
  if (!certKey || certKey.startsWith('YOUR_') || certKey.startsWith('REPLACE_')) return '';
  const qs = new URLSearchParams({ certKey, ...(entry.gisParams || {}) });
  if (entry.gisEmbed) {
    return `https://bigdata.sbiz.or.kr/gis/openApi/${entry.gisEmbed}?${qs.toString()}`;
  }
  if (entry.hashPath) {
    return `https://bigdata.sbiz.or.kr/#${entry.hashPath}?${qs.toString()}`;
  }
  return `https://bigdata.sbiz.or.kr/#/openApi/${entry.endpoint}?${qs.toString()}`;
}

function getProbePanel() {
  return document.getElementById('api-probe-panel');
}

function hideProbePanel() {
  const panel = getProbePanel();
  if (!panel) return;
  panel.hidden = true;
  panel.setAttribute('aria-hidden', 'true');
  panel.style.display = 'none';
}

function updateUsageHint(entry) {
  const el = document.getElementById('analysis-usage-hint');
  if (!el) return;
  if (entry?.usageHint) {
    el.textContent = entry.usageHint;
    el.hidden = false;
  } else {
    el.textContent = '';
    el.hidden = true;
  }
}

function showProbeLoading(label) {
  const panel = getProbePanel();
  const pre = document.getElementById('api-probe-result');
  if (!panel || !pre) return;
  panel.hidden = false;
  panel.setAttribute('aria-hidden', 'false');
  panel.style.display = '';
  const title = document.getElementById('api-probe-title');
  if (title) title.textContent = `${label} — API 연결 확인 중...`;
  pre.textContent = 'JSON 응답을 요청하고 있습니다...';
}

function maskCertKeyInUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.searchParams.has('certKey')) {
      const raw = u.searchParams.get('certKey') || '';
      u.searchParams.set('certKey', raw.length > 8 ? `${raw.slice(0, 4)}…${raw.slice(-4)}` : '****');
    }
    return u.toString();
  } catch {
    return url.replace(/certKey=[^&]+/i, 'certKey=****');
  }
}

function renderProbeResult(label, entry, result, iframeUrl) {
  const panel = getProbePanel();
  const pre = document.getElementById('api-probe-result');
  if (!panel || !pre) return;

  panel.hidden = false;
  const title = document.getElementById('api-probe-title');
  if (title) title.textContent = `${label} (${entry.endpoint}) — API 데이터 샘플`;

  const safeProbe = { ...result };
  if (safeProbe.url) safeProbe.url = maskCertKeyInUrl(safeProbe.url);

  const summary = {
    endpoint: entry.endpoint,
    keyName: entry.keyName,
    embed: entry.gisEmbed ? 'gis/openApi (iframe 권장)' : '#/openApi (SPA)',
    iframeUrl: maskCertKeyInUrl(iframeUrl),
    note: '하단 JSON 프로브는 브라우저 CORS로 실패할 수 있습니다. 화면은 상단 iframe을 확인하세요.',
    probe: safeProbe,
  };
  pre.textContent = JSON.stringify(summary, null, 2);
}

async function runApiProbe(entry, iframeUrl) {
  if (!isApiDebugEnabled() || !entry.endpoint) {
    hideProbePanel();
    return;
  }

  const seq = ++probeSeq;
  showProbeLoading(entry.label);

  const result = await probeOpenApi(entry.endpoint, entry.keyName);
  if (seq !== probeSeq) return;
  renderProbeResult(entry.label, entry, result, iframeUrl);
}

const MOBILE_TAB_BP = 768;

function isMobileTabBar() {
  return window.innerWidth <= MOBILE_TAB_BP;
}

/** 모바일: 상위 overflow 클립을 피하기 위해 드롭다운을 body 직속으로 이동 */
function portalizeTabMenus() {
  document.querySelectorAll('.tab-group-menu').forEach((menu) => {
    if (isMobileTabBar()) {
      if (!menu.dataset.portaled) {
        menu._portalHost = menu.parentElement;
        document.body.appendChild(menu);
        menu.dataset.portaled = '1';
      }
    } else if (menu.dataset.portaled && menu._portalHost) {
      menu._portalHost.appendChild(menu);
      delete menu.dataset.portaled;
      menu._portalHost = null;
    }
  });
}

function ensureTabMenuBackdrop() {
  let el = document.getElementById('analysis-tab-menu-backdrop');
  if (!el) {
    el = document.createElement('div');
    el.id = 'analysis-tab-menu-backdrop';
    el.className = 'analysis-tab-menu-backdrop';
    el.setAttribute('aria-hidden', 'true');
    el.addEventListener('click', () => closeMobileTabMenus());
    document.body.appendChild(el);
  }
  return el;
}

function syncTabMenuBodyState() {
  const anyOpen = document.querySelector('.tab-group-menu.open');
  const openOnMobile = Boolean(anyOpen) && isMobileTabBar();
  document.body.classList.toggle('analysis-tab-menu-open', openOnMobile);
  const backdrop = document.getElementById('analysis-tab-menu-backdrop');
  if (backdrop) backdrop.style.display = openOnMobile ? 'block' : 'none';
}

function closeMobileTabMenus() {
  document.querySelectorAll('.tab-group-menu').forEach((m) => {
    if (m.id !== 'menu-' + currentGroup) m.classList.remove('open');
  });
  document.querySelectorAll('.tab-group-btn').forEach((b) => {
    const groupId = b.closest('.tab-group')?.id?.replace('group-', '');
    if (groupId !== currentGroup) b.classList.remove('active');
  });
  syncTabMenuBodyState();
}

function openGroup(groupKey) {
  document.querySelectorAll('.tab-group-menu').forEach((m) => m.classList.remove('open'));
  document.querySelectorAll('.tab-group-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById('menu-' + groupKey)?.classList.add('open');
  document.querySelector(`#group-${groupKey} .tab-group-btn`)?.classList.add('active');
  syncTabMenuBodyState();
}

async function switchTab(tabKey, btnEl) {
  const id = normalizeTabId(tabKey);
  const entry = TAB_ENTRIES[id];
  if (!entry) return;

  document.querySelectorAll('.tab-sub-btn').forEach((b) => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  else document.querySelector(`[data-tab="${id}"]`)?.classList.add('active');

  const labelEl = document.getElementById('current-tab-text');
  if (labelEl) labelEl.textContent = entry.label;

  const iframe = document.getElementById('analysis-iframe');
  const loading = document.getElementById('analysis-iframe-loading');
  if (!iframe || !loading) return;

  currentTab = id;
  currentGroup = entry.group;
  openGroup(entry.group);

  updateUsageHint(entry);

  if (!entry.live) {
    hideProbePanel();
    iframe.style.display = 'none';
    iframe.removeAttribute('src');
    loading.style.display = 'flex';
    loading.innerHTML = `<div class="coming-soon-panel"><i class="ti ti-clock-pause"></i><p>${COMING_SOON_MSG}</p></div>`;
  } else {
    iframe.style.display = 'block';
    loading.style.display = 'flex';
    loading.textContent = `${entry.label} 불러오는 중...`;

    const src = await buildTabUrl(entry);
    if (!src) {
      hideProbePanel();
      loading.innerHTML =
        '<span style="color:#E24B4A;">API 키가 설정되지 않았습니다.<br><span style="font-size:12px;color:#999;">어드민 API 관리에서 확인하세요.</span></span>';
      iframe.removeAttribute('src');
      iframe.style.display = 'none';
    } else {
      iframe.onload = () => {
        loading.style.display = 'none';
      };
      iframe.onerror = () => {
        loading.textContent = '화면을 불러오지 못했습니다.';
      };
      iframe.src = src;
      if (isApiDebugEnabled()) {
        runApiProbe(entry, src).catch((e) => console.warn('api probe', e));
      } else {
        hideProbePanel();
      }
    }
  }

  const url = new URL(window.location.href);
  if (id === 'map') url.searchParams.delete('tab');
  else url.searchParams.set('tab', id);
  window.history.replaceState({}, '', url);

  if (isMobileTabBar()) {
    document.querySelectorAll('.tab-group-menu').forEach((m) => m.classList.remove('open'));
    document.querySelectorAll('.tab-group-btn').forEach((b) => b.classList.remove('active'));
    document.querySelector(`#group-${entry.group} .tab-group-btn`)?.classList.add('active');
    syncTabMenuBodyState();
  }
}

function toggleGroup(groupKey, btnEl) {
  const menu = document.getElementById('menu-' + groupKey);
  const isOpen = menu?.classList.contains('open');

  document.querySelectorAll('.tab-group-menu').forEach((m) => m.classList.remove('open'));
  document.querySelectorAll('.tab-group-btn').forEach((b) => b.classList.remove('active'));

  if (!isOpen) {
    menu?.classList.add('open');
    btnEl?.classList.add('active');
  }
  syncTabMenuBodyState();
}

function bindOutsideClick() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tab-group') && !e.target.closest('.tab-group-menu')) {
      closeMobileTabMenus();
    }
  });
}

function bindProbePanel() {
  document.getElementById('api-probe-close')?.addEventListener('click', hideProbePanel);
}

function initTab() {
  const params = new URLSearchParams(window.location.search);
  const tabParam = normalizeTabId(params.get('tab') || 'map');
  const btn = document.querySelector(`[data-tab="${tabParam}"]`);
  if (TAB_ENTRIES[tabParam]) {
    switchTab(tabParam, btn);
  } else {
    switchTab('map', document.querySelector('[data-tab="map"]'));
  }
}

function bindTabBar() {
  document.querySelectorAll('.tab-group-btn[data-group]').forEach((btn) => {
    btn.addEventListener('click', () => toggleGroup(btn.dataset.group, btn));
  });
  document.querySelectorAll('.tab-sub-btn[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab, btn));
  });
}

window.switchTab = switchTab;
window.toggleGroup = toggleGroup;

async function initSbizAnalysisPage() {
  hideProbePanel();
  ensureTabMenuBackdrop();
  portalizeTabMenus();
  window.addEventListener('resize', () => {
    portalizeTabMenus();
    syncTabMenuBodyState();
  });
  bindTabBar();
  bindOutsideClick();
  bindProbePanel();
  initTab();
  window.addEventListener('golmok:auth-changed', () => {
    const btn = document.querySelector(`[data-tab="${currentTab}"]`);
    switchTab(currentTab, btn);
  });
}

bootPage(() => {
  const start = () => {
    const isMobileApp = document.body.classList.contains('m-shell');
    if (!isMobileApp) initPageShell('analysis');
    initSbizAnalysisPage();
  };
  if (document.body.dataset.gmShellDone === '1') start();
  else document.addEventListener('gm-shell-ready', start, { once: true });
});
