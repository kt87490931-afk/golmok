import { initPageShell, bootPage } from '../page_common.js';
import { getApiKey } from '../api-config.js?v=20260644';

/** tab id → API 설정 (live=true: Supabase 실키 4종만 오픈) */
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
    hashPath: '/hotplace/gis',
    keyName: 'SOJANGGONG_STARTUP_KEY',
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
    keyName: 'SOJANGGONG_SIMPLE_KEY',
    live: false,
  },
  detail: {
    group: 'analysis',
    label: '상세분석',
    endpoint: 'detail',
    keyName: 'SOJANGGONG_DETAIL_KEY',
    live: false,
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
    live: false,
  },
  delivery: {
    group: 'theme',
    label: '배달분석',
    endpoint: 'delivery',
    keyName: 'SOJANGGONG_DELIVERY_KEY',
    live: false,
  },
  festival: {
    group: 'theme',
    label: '관광축제',
    endpoint: 'tour',
    keyName: 'SOJANGGONG_TOUR_KEY',
    live: false,
  },
  history: {
    group: 'theme',
    label: '업력현황',
    endpoint: 'stcarSttus',
    keyName: 'SOJANGGONG_STCARSTTUS_KEY',
    live: false,
  },
  sales: {
    group: 'theme',
    label: '매출추이',
    endpoint: 'slsIdex',
    keyName: 'SOJANGGONG_SLSIDEX_KEY',
    live: false,
  },
};

const COMING_SOON_MSG = '추가 API 승인 후 오픈 예정입니다';

/** 이전 URL 파라미터 호환 */
const TAB_ALIASES = {
  tour: 'festival',
  stcar: 'history',
  sls: 'sales',
};

let currentTab = 'map';
let currentGroup = 'status';

function normalizeTabId(tabKey) {
  const key = tabKey || 'map';
  return TAB_ALIASES[key] || key;
}

async function buildTabUrl(entry) {
  const certKey = await getApiKey(entry.keyName);
  if (!certKey || certKey.startsWith('YOUR_') || certKey.startsWith('REPLACE_')) return '';
  const qs = new URLSearchParams({ certKey });
  if (entry.hashPath) {
    return `https://bigdata.sbiz.or.kr/#${entry.hashPath}?${qs.toString()}`;
  }
  return `https://bigdata.sbiz.or.kr/#/openApi/${entry.endpoint}?${qs.toString()}`;
}

function openGroup(groupKey) {
  document.querySelectorAll('.tab-group-menu').forEach((m) => m.classList.remove('open'));
  document.querySelectorAll('.tab-group-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById('menu-' + groupKey)?.classList.add('open');
  document.querySelector(`#group-${groupKey} .tab-group-btn`)?.classList.add('active');
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

  if (!entry.live) {
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
    }
  }

  const url = new URL(window.location.href);
  if (id === 'map') url.searchParams.delete('tab');
  else url.searchParams.set('tab', id);
  window.history.replaceState({}, '', url);

  if (window.innerWidth <= 768) {
    document.querySelectorAll('.tab-group-menu').forEach((m) => m.classList.remove('open'));
    document.querySelectorAll('.tab-group-btn').forEach((b) => b.classList.remove('active'));
    document.querySelector(`#group-${entry.group} .tab-group-btn`)?.classList.add('active');
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
}

function bindOutsideClick() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tab-group')) {
      document.querySelectorAll('.tab-group-menu').forEach((m) => {
        if (m.id !== 'menu-' + currentGroup) m.classList.remove('open');
      });
      document.querySelectorAll('.tab-group-btn').forEach((b) => {
        const groupId = b.closest('.tab-group')?.id?.replace('group-', '');
        if (groupId !== currentGroup) b.classList.remove('active');
      });
    }
  });
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
  bindTabBar();
  bindOutsideClick();
  initTab();
  window.addEventListener('golmok:auth-changed', () => {
    const btn = document.querySelector(`[data-tab="${currentTab}"]`);
    switchTab(currentTab, btn);
  });
}

bootPage(() => {
  const isMobileApp = !!document.querySelector('.app.mobile-analysis');
  if (!isMobileApp) initPageShell('analysis');
  initSbizAnalysisPage();
});
