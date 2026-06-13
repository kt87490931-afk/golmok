/**
 * 골목대장 v3 공통 셸 로더 (B방식)
 * - transform: 레거시 .topnav 페이지
 * - template: #gm-page-tpl
 * - minimal: 게시글·프로필 등 단독 페이지
 */
import { SHELL_VER, detectContext, applyTokens, hrefForActive, resolveActiveNav, resolveMobileTab } from './shell_config.js?v=20260715';
import { mountSiteFooter } from './footer_ui.js?v=20260715';

function bindSidebarGroups() {
  document.querySelectorAll('.sb-group-toggle').forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const group = btn.closest('.sb-group');
      if (!group) return;
      const open = group.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  document.querySelectorAll('.sb-group .sb-a.act').forEach((link) => {
    link.closest('.sb-group')?.classList.add('open');
  });
}

function bindStoriesFilterTabs() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const map = {
    'index.html': 'all',
    'community.html': 'all',
    'neighborhood.html': 'neighborhood',
    'promo.html': 'promo',
    'mentoring.html': 'mentoring',
  };
  const current = map[path];
  if (!current) return;
  document.querySelectorAll('.stories-filter-tabs [data-stories-filter]').forEach((el) => {
    el.classList.toggle('act', el.dataset.storiesFilter === current);
  });
}

function emergencyUnwrapTemplate(shellType) {
  const tpl = document.getElementById('gm-page-tpl');
  if (!tpl || document.querySelector('.layout')) return false;
  const content = document.createDocumentFragment();
  content.appendChild(tpl.content.cloneNode(true));
  tpl.remove();
  if (shellType === 'home') {
    document.body.appendChild(content);
  } else {
    const inner = document.createElement('div');
    inner.className = 'gm-page-inner gm-shell-fallback';
    while (content.firstChild) inner.appendChild(content.firstChild);
    const main = document.createElement('main');
    main.className = 'main';
    main.appendChild(inner);
    document.body.appendChild(main);
  }
  document.body.classList.add('gm-shell-fallback');
  return true;
}

const PARTIALS = ['header-v3.html', 'sidebar-v3.html', 'mobile-tabs-v3.html', 'modals-v3.html'];

async function fetchPartial(name, ctx) {
  const res = await fetch(`${ctx.partials}${name}?v=${SHELL_VER}`);
  if (!res.ok) throw new Error(`partial ${name}: ${res.status}`);
  return applyTokens(await res.text(), ctx);
}

function ensureStyles(ctx) {
  const head = document.head;
  const add = (href) => {
    const file = href.split('/').pop().split('?')[0];
    const full = `${ctx.css}${href}?v=${SHELL_VER}`;
    const existing = [...head.querySelectorAll('link[rel="stylesheet"]')].find((l) => l.href.includes(file));
    if (existing) {
      if (!existing.href.includes(`v=${SHELL_VER}`)) existing.href = full;
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = full;
    head.appendChild(link);
  };
  add('main-v3.css');
  add('shell-pages.css');
  if (ctx.isM) add('main-v3-m.css');
}

function parseHtmlFragment(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content;
}

function applyActiveNav(active) {
  const navActive = resolveActiveNav(active);
  if (!navActive) return;
  document.querySelectorAll('[data-gm-nav]').forEach((el) => {
    el.classList.toggle('act', el.dataset.gmNav === navActive);
  });
  document.querySelectorAll('.sb-group').forEach((group) => {
    group.classList.toggle('has-active', !!group.querySelector('.sb-a.act'));
  });
  const mtab = resolveMobileTab(navActive);
  document.querySelectorAll('[data-gm-mtab]').forEach((el) => {
    el.classList.toggle('act', mtab ? el.dataset.gmMtab === mtab : false);
  });
  bindSidebarGroups();
  bindStoriesFilterTabs();
}

function bindShellGlobals(ctx) {
  if (!window.showToast) {
    window.showToast = (msg) => {
      let t = document.getElementById('toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    };
  }
  window.focusHeroSearch = function focusHeroSearch() {
    const onHome = /index\.html$/.test(location.pathname) || /\/m\/?$/.test(location.pathname);
    if (onHome) {
      const q = document.getElementById('ai-input')?.value?.trim();
      if (q) {
        location.href = `${ctx.pages.aiSearch}?q=${encodeURIComponent(q)}`;
        return;
      }
      document.getElementById('ai-input')?.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    location.href = ctx.pages.aiSearch;
  };
  window.startVoice = window.startVoice || (() => {
    location.href = ctx.pages.aiSearch;
  });
  document.getElementById('write-btn-m')?.addEventListener('click', () => {
    document.getElementById('open-write')?.click() || document.getElementById('write-modal')?.classList.add('open');
  });
}

function bindWriteModalFallback() {
  const open = () => document.getElementById('write-modal')?.classList.add('open');
  document.getElementById('open-write')?.addEventListener('click', open);
  document.getElementById('open-write-btn')?.addEventListener('click', open);
  document.getElementById('feed-photo-btn')?.addEventListener('click', () => {
    open();
    setTimeout(() => document.getElementById('image-file-input')?.click(), 120);
  });
  document.getElementById('close-modal')?.addEventListener('click', () => {
    document.getElementById('write-modal')?.classList.remove('open');
  });
  document.getElementById('write-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'write-modal') e.target.classList.remove('open');
  });
}

async function loadPartials(ctx, shellType) {
  const names = [...PARTIALS];
  if (shellType === 'home') names.push('modals-index-v3.html');
  if (!ctx.isM) names.push('aside-v3.html');
  const htmls = await Promise.all(names.map((n) => fetchPartial(n, ctx)));
  const parts = {
    header: parseHtmlFragment(htmls[0]),
    sidebar: parseHtmlFragment(htmls[1]),
    mobileTabs: parseHtmlFragment(htmls[2]),
    modals: parseHtmlFragment(htmls[3]),
  };
  let idx = 4;
  if (shellType === 'home' && htmls[idx]) {
    parts.indexModals = parseHtmlFragment(htmls[idx]);
    idx += 1;
  }
  if (!ctx.isM && htmls[idx]) {
    parts.aside = parseHtmlFragment(htmls[idx]);
  }
  return parts;
}

function extractLegacyContent() {
  const center = document.querySelector('main.center');
  if (center) {
    const fscroll = center.querySelector('.fscroll.page-main-content') || center.querySelector('.fscroll') || center;
    const wrap = document.createElement('div');
    wrap.className = 'gm-page-inner';
    while (fscroll.firstChild) wrap.appendChild(fscroll.firstChild);
    return wrap;
  }
  const app = document.querySelector('.app.mobile-analysis');
  if (app) {
    const wrap = document.createElement('div');
    wrap.className = 'gm-page-inner gm-analysis-mobile';
    const analysis = app.querySelector('.sbiz-analysis-wrap');
    if (analysis) wrap.appendChild(analysis);
    return { content: wrap, remove: app };
  }
  return null;
}

function removeLegacyChrome() {
  document.querySelector('.topnav')?.remove();
  document.querySelector('.rcol')?.remove();
  document.querySelector('.body > .sidebar')?.remove();
  const bodyEl = document.querySelector('.body');
  if (bodyEl?.parentNode) {
    const parent = bodyEl.parentNode;
    while (bodyEl.firstChild) parent.insertBefore(bodyEl.firstChild, bodyEl);
    bodyEl.remove();
  }
}

function buildLayout(parts, contentSource, shellType, ctx) {
  const layout = document.createElement('div');
  layout.className = 'layout';
  layout.appendChild(parts.sidebar.cloneNode(true));
  if (shellType === 'home') {
    while (contentSource.firstChild) layout.appendChild(contentSource.firstChild);
  } else {
    const main = document.createElement('main');
    main.className = 'main';
    main.appendChild(contentSource);
    layout.appendChild(main);
    if (!ctx?.isM && parts.aside) {
      layout.appendChild(parts.aside.cloneNode(true));
    }
  }
  return layout;
}

async function injectShell(parts, contentNode, opts = {}) {
  const { shellType = 'standard', prependTo = document.body, ctx = detectContext() } = opts;
  const header = parts.header.cloneNode(true);
  const anchor = prependTo.querySelector('#gm-page-tpl') || prependTo.firstElementChild;
  if (anchor) prependTo.insertBefore(header, anchor);
  else prependTo.appendChild(header);

  if (shellType === 'analysis') {
    document.body.classList.add('gm-shell-analysis');
  }
  if (shellType === 'ai') {
    document.body.classList.add('gm-shell-ai');
  }

  const layout = buildLayout(parts, contentNode, shellType, ctx);
  prependTo.appendChild(layout);

  if (!document.querySelector('.mobile-tabs')) {
    prependTo.appendChild(parts.mobileTabs.cloneNode(true));
  }
  if (!document.getElementById('write-modal')) {
    prependTo.appendChild(parts.modals.cloneNode(true));
  }
  if (parts.indexModals && !document.getElementById('analysis-overlay')) {
    prependTo.appendChild(parts.indexModals.cloneNode(true));
  }
  if (!document.getElementById('toast')) {
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    prependTo.appendChild(toast);
  }
  bindWriteModalFallback();
}

async function modeTransform(ctx, parts, shellType) {
  const extracted = extractLegacyContent();
  if (!extracted) return false;
  let contentNode = extracted;
  let removeEl = null;
  if (extracted.content) {
    contentNode = extracted.content;
    removeEl = extracted.remove;
  }
  removeLegacyChrome();
  removeEl?.remove();
  document.querySelector('main.center')?.remove();
  await injectShell(parts, contentNode, { shellType, ctx });
  return true;
}

async function modeTemplate(ctx, parts, shellType) {
  const tpl = document.getElementById('gm-page-tpl');
  if (!tpl) return false;
  const content = document.createDocumentFragment();
  content.appendChild(tpl.content.cloneNode(true));
  tpl.remove();
  document.querySelector('.app.mobile-analysis')?.remove();
  const payload = shellType === 'home'
    ? content
    : (() => {
      const inner = document.createElement('div');
      inner.className = 'gm-page-inner';
      while (content.firstChild) inner.appendChild(content.firstChild);
      return inner;
    })();
  await injectShell(parts, payload, { shellType, ctx });
  return true;
}

async function modeMinimal(ctx, parts) {
  const inner = document.createElement('div');
  inner.className = 'gm-page-inner';
  const movable = [...document.body.children].filter(
    (el) => el.tagName !== 'SCRIPT'
      && !el.classList.contains('mobile-tabs')
      && !el.classList.contains('hd')
      && el.id !== 'toast'
      && !el.classList.contains('layout'),
  );
  movable.forEach((el) => inner.appendChild(el));
  await injectShell(parts, inner, { shellType: 'minimal', ctx });
  return true;
}

function hasStaleEmbeddedChrome() {
  if (!document.querySelector('header.hd') || document.getElementById('gm-page-tpl')) return false;
  const nav = document.querySelector('header.hd .hd-nav');
  if (nav && !nav.querySelector('[data-gm-nav="ai"]')) return true;
  const sidebar = document.querySelector('.layout aside.sidebar, .layout > .sidebar');
  return !!(sidebar && !sidebar.querySelector('.sb-group[data-sb-group="stories"]'));
}

async function refreshEmbeddedChrome(ctx, shellType, active) {
  const parts = await loadPartials(ctx, shellType);

  document.querySelector('header.hd')?.replaceWith(parts.header.cloneNode(true));

  const layout = document.querySelector('.layout');
  const oldSidebar = layout?.querySelector('aside.sidebar, .sidebar');
  if (oldSidebar) {
    oldSidebar.replaceWith(parts.sidebar.cloneNode(true));
  } else if (layout) {
    layout.insertBefore(parts.sidebar.cloneNode(true), layout.firstChild);
  }

  const oldTabs = document.querySelector('nav.mobile-tabs, .mobile-tabs');
  if (oldTabs) {
    oldTabs.replaceWith(parts.mobileTabs.cloneNode(true));
  } else {
    document.body.appendChild(parts.mobileTabs.cloneNode(true));
  }

  if (!document.getElementById('write-modal')) {
    document.body.appendChild(parts.modals.cloneNode(true));
  }

  ensureStyles(ctx);
  if (ctx.isM) document.body.classList.add('m-shell');
  document.body.classList.add('gm-shell-loaded', `gm-shell-${shellType}`);

  applyActiveNav(active);
  bindShellGlobals(ctx);
  bindWriteModalFallback();
  await mountSiteFooter(ctx).catch((e) => console.warn('footer', e));
}

export async function initShell() {
  const staleChrome = hasStaleEmbeddedChrome();
  if (document.body.dataset.gmShellDone === '1' && !staleChrome) return;

  const ctx = detectContext();
  const shellType = document.body.dataset.gmShell || 'standard';
  const active = document.body.dataset.gmActive || '';

  /* 레거시 HTML에 박힌 헤더·사이드바 → partials(sidebar-v3.html)로 통일 */
  if (document.querySelector('header.hd') && !document.getElementById('gm-page-tpl')) {
    if (staleChrome || document.body.dataset.gmShellDone !== '1') {
      await refreshEmbeddedChrome(ctx, shellType, active);
    }
    document.body.dataset.gmShellDone = '1';
    return;
  }

  ensureStyles(ctx);
  if (ctx.isM) document.body.classList.add('m-shell');
  document.body.classList.add('gm-shell-loaded', `gm-shell-${shellType}`);

  if (shellType === 'auth') {
    const parts = await loadPartials(ctx, shellType);
    if (!document.querySelector('.mobile-tabs') && ctx.isM) {
      document.body.appendChild(parts.mobileTabs.cloneNode(true));
    }
    applyActiveNav(active);
    bindShellGlobals(ctx);
    await mountSiteFooter(ctx).catch((e) => console.warn('footer', e));
    document.body.dataset.gmShellDone = '1';
    return;
  }

  const parts = await loadPartials(ctx, shellType);
  let ok = false;

  if (document.getElementById('gm-page-tpl')) {
    ok = await modeTemplate(ctx, parts, shellType);
  } else if (document.querySelector('.topnav') || document.querySelector('.app.mobile-analysis')) {
    ok = await modeTransform(ctx, parts, shellType);
  } else if (shellType === 'minimal' || document.body.dataset.gmShell === 'minimal') {
    ok = await modeMinimal(ctx, parts);
  }

  if (ok) {
    applyActiveNav(active);
    bindShellGlobals(ctx);
    bindWriteModalFallback();
    await mountSiteFooter(ctx).catch((e) => console.warn('footer', e));
  } else if (document.getElementById('gm-page-tpl')) {
    emergencyUnwrapTemplate(shellType);
    bindShellGlobals(ctx);
  }
  document.body.dataset.gmShellDone = '1';
}

function finishShellBoot(shellType) {
  if (!document.querySelector('.layout') && document.getElementById('gm-page-tpl')) {
    emergencyUnwrapTemplate(shellType || document.body.dataset.gmShell || 'standard');
  }
  document.dispatchEvent(new CustomEvent('gm-shell-ready'));
}

initShell()
  .then(() => finishShellBoot(document.body.dataset.gmShell))
  .catch((err) => {
    console.error('[shell_loader]', err);
    emergencyUnwrapTemplate(document.body.dataset.gmShell || 'home');
    finishShellBoot(document.body.dataset.gmShell);
  });
