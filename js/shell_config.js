/** 골목대장 v3 공통 셸 — 경로·토큰·활성 메뉴 */
export const SHELL_VER = '20260716';

const analysisBase = (isM) => (isM ? 'analysis.html' : 'analysis.html');

export function detectContext() {
  const path = window.location.pathname || '';
  const isM = /\/m(\/|$)/.test(path);
  const root = isM ? '../' : '';
  const assets = isM ? 'assets/' : 'assets/';
  const aBase = analysisBase(isM);
  const pages = {
    home: isM ? 'index.html' : 'index.html',
    analysis: isM ? 'analysis.html' : 'analysis.html',
    analysisSimple: `${aBase}?tab=simple`,
    analysisTheme: `${aBase}?tab=theme`,
    weather: `${aBase}?tab=weather`,
    hotplace: `${aBase}?tab=hotplace`,
    community: isM ? '../community.html' : 'community.html',
    mentoring: isM ? 'mentoring.html' : 'mentoring.html',
    promo: isM ? 'promo.html' : 'promo.html',
    promoWrite: isM ? 'promo-write.html' : 'promo-write.html',
    neighborhood: isM ? '../neighborhood.html' : 'neighborhood.html',
    policy: isM ? '../policy.html' : 'policy.html',
    profile: isM ? 'profile.html' : 'profile.html',
    post: isM ? 'post.html' : 'post.html',
    aiSearch: isM ? 'ai-search.html' : 'ai-search.html',
  };
  return { isM, root, assets, css: root + 'css/', js: root + 'js/', partials: root + 'partials/', pages };
}

export function applyTokens(html, ctx) {
  const p = ctx.pages;
  return html
    .replace(/@@ASSETS@@/g, ctx.assets)
    .replace(/@@HOME@@/g, p.home)
    .replace(/@@ANALYSIS@@/g, p.analysis)
    .replace(/@@ANALYSIS_SIMPLE@@/g, p.analysisSimple)
    .replace(/@@ANALYSIS_THEME@@/g, p.analysisTheme)
    .replace(/@@WEATHER@@/g, p.weather)
    .replace(/@@HOTPLACE@@/g, p.hotplace)
    .replace(/@@COMMUNITY@@/g, p.community)
    .replace(/@@MENTORING@@/g, p.mentoring)
    .replace(/@@PROMO@@/g, p.promo)
    .replace(/@@PROMO_WRITE@@/g, p.promoWrite)
    .replace(/@@NEIGHBORHOOD@@/g, p.neighborhood)
    .replace(/@@POLICY@@/g, p.policy)
    .replace(/@@PROFILE@@/g, p.profile)
    .replace(/@@AI_SEARCH@@/g, p.aiSearch);
}

/** data-gm-active → pages 키 */
export const ACTIVE_MAP = {
  home: 'home',
  community: 'community',
  analysis: 'analysis',
  simple: 'analysisSimple',
  weather: 'weather',
  hotplace: 'hotplace',
  theme: 'analysisTheme',
  mentoring: 'mentoring',
  promo: 'promo',
  neighborhood: 'neighborhood',
  policy: 'policy',
  profile: 'profile',
  post: 'post',
  ai: 'aiSearch',
};

/** 대장님들의 이야기 → home 탭 */
export const STORIES_NAV = new Set(['home', 'community', 'neighborhood', 'mentoring', 'promo']);

/** 상권분석 하위 → analysis 탭 */
export const ANALYSIS_NAV = new Set(['analysis', 'simple', 'weather', 'hotplace', 'theme', 'policy']);

const ANALYSIS_TAB_TO_NAV = {
  map: 'analysis',
  simple: 'simple',
  weather: 'weather',
  hotplace: 'hotplace',
  theme: 'theme',
};

export function resolveActiveNav(active) {
  if (/analysis\.html$/i.test(window.location.pathname)) {
    const tab = new URLSearchParams(window.location.search).get('tab') || 'map';
    return ANALYSIS_TAB_TO_NAV[tab] || 'analysis';
  }
  return active || '';
}

export function resolveMobileTab(active) {
  const nav = resolveActiveNav(active);
  if (STORIES_NAV.has(nav)) return 'home';
  if (ANALYSIS_NAV.has(nav)) return 'analysis';
  if (nav === 'ai' || nav === 'aiSearch') return 'ai';
  return null;
}

export function hrefForActive(active, ctx) {
  const key = ACTIVE_MAP[active];
  return key ? ctx.pages[key] : null;
}
