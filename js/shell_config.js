/** 골목대장 v3 공통 셸 — 경로·토큰·활성 메뉴 */
export const SHELL_VER = '20260701';

export function detectContext() {
  const path = window.location.pathname || '';
  const isM = /\/m(\/|$)/.test(path);
  const root = isM ? '../' : '';
  const assets = isM ? 'assets/' : 'assets/';
  const pages = {
    home: isM ? 'index.html' : 'index.html',
    analysis: isM ? 'analysis.html' : 'analysis.html',
    weather: (isM ? 'analysis.html' : 'analysis.html') + '?tab=weather',
    hotplace: (isM ? 'analysis.html' : 'analysis.html') + '?tab=hotplace',
    community: isM ? '../community.html' : 'community.html',
    neighborhood: isM ? '../neighborhood.html' : 'neighborhood.html',
    byIndustry: isM ? '../by-industry.html' : 'by-industry.html',
    events: isM ? 'events.html' : 'events.html',
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
    .replace(/@@WEATHER@@/g, p.weather)
    .replace(/@@HOTPLACE@@/g, p.hotplace)
    .replace(/@@COMMUNITY@@/g, p.community)
    .replace(/@@NEIGHBORHOOD@@/g, p.neighborhood)
    .replace(/@@BY_INDUSTRY@@/g, p.byIndustry)
    .replace(/@@EVENTS@@/g, p.events)
    .replace(/@@POLICY@@/g, p.policy)
    .replace(/@@PROFILE@@/g, p.profile)
    .replace(/@@AI_SEARCH@@/g, p.aiSearch);
}

/** data-gm-active → href 키 */
export const ACTIVE_MAP = {
  home: 'home',
  analysis: 'analysis',
  weather: 'weather',
  hotplace: 'hotplace',
  community: 'community',
  neighborhood: 'neighborhood',
  'by-industry': 'byIndustry',
  events: 'events',
  policy: 'policy',
  profile: 'profile',
  post: 'post',
  ai: 'aiSearch',
};

export function hrefForActive(active, ctx) {
  const key = ACTIVE_MAP[active];
  return key ? ctx.pages[key] : null;
}
