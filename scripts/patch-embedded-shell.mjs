/**
 * 레거시 HTML에 header-v3 / sidebar-v3 / mobile-tabs-v3 정적 병합
 * 실행: node scripts/patch-embedded-shell.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const VER = '20260717';

const TARGETS = [
  'analysis.html',
  'community.html',
  'neighborhood.html',
  'by-industry.html',
  'events.html',
  'policy.html',
  'mentoring.html',
  'promo.html',
  'profile.html',
  'post.html',
  'promo-write.html',
  'm/events.html',
  'm/mentoring.html',
  'm/promo.html',
  'm/profile.html',
  'm/post.html',
  'm/promo-write.html',
];

function pagesCtx(isM) {
  const aBase = 'analysis.html';
  return {
    home: 'index.html',
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
    aiSearch: isM ? 'ai-search.html' : 'ai-search.html',
    assets: isM ? '../assets/' : 'assets/',
  };
}

function applyTokens(html, isM) {
  const p = pagesCtx(isM);
  return html
    .replace(/@@ASSETS@@/g, p.assets)
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

function loadPartial(name) {
  return fs.readFileSync(path.join(ROOT, 'partials', name), 'utf8');
}

function setActiveNav(html, active) {
  if (!active) return html;
  let out = html.replace(/\sclass="act"/g, '');
  out = out.replace(
    new RegExp(`(<[^>]*data-gm-nav="${active}"[^>]*)>`, 'g'),
    (match, open) => {
      if (/\bclass="/.test(open)) {
        return `${open.replace(/class="([^"]*)"/, 'class="$1 act"')}>`;
      }
      return `${open} class="act">`;
    },
  );
  const stories = new Set(['home', 'community', 'neighborhood', 'mentoring', 'promo']);
  const analysis = new Set(['analysis', 'simple', 'weather', 'hotplace', 'theme', 'policy']);
  if (stories.has(active)) {
    out = out.replace(
      /(<div class="sb-sec sb-group)(\s+open)?([^"]*" data-sb-group="stories")/,
      '$1 open$3',
    );
  }
  if (analysis.has(active)) {
    out = out.replace(
      /(<div class="sb-sec sb-group)(\s+open)?([^"]*" data-sb-group="analysis")/,
      '$1 open$3',
    );
  }
  return out;
}

function patchFile(rel) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) {
    console.log('SKIP missing', rel);
    return;
  }
  let html = fs.readFileSync(fp, 'utf8');
  if (!html.includes('<header class="hd">')) {
    console.log('SKIP no header', rel);
    return;
  }
  if (html.includes('data-sb-group="stories"')) {
    console.log('SKIP already v3', rel);
    return;
  }

  const isM = rel.startsWith('m/');
  const activeMatch = html.match(/data-gm-active="([^"]+)"/);
  const active = activeMatch?.[1] || '';

  let header = applyTokens(loadPartial('header-v3.html'), isM);
  let sidebar = applyTokens(loadPartial('sidebar-v3.html'), isM);
  let tabs = applyTokens(loadPartial('mobile-tabs-v3.html'), isM);
  header = setActiveNav(header, active);
  sidebar = setActiveNav(sidebar, active);
  tabs = setActiveNav(tabs, active);

  html = html.replace(/<header class="hd">[\s\S]*?<\/header>/, header.trim());
  html = html.replace(/<aside class="sidebar">[\s\S]*?<\/aside>/, sidebar.trim());
  html = html.replace(/<nav class="mobile-tabs"[\s\S]*?<\/nav>/, tabs.trim());

  html = html.replace(/shell_loader\.js\?v=\d+/g, `shell_loader.js?v=${VER}`);
  html = html.replace(/main-v3\.css\?v=\d+/g, `main-v3.css?v=${VER}`);
  html = html.replace(/shell-pages\.css\?v=\d+/g, `shell-pages.css?v=${VER}`);

  fs.writeFileSync(fp, html, 'utf8');
  console.log('PATCHED', rel);
}

for (const rel of TARGETS) patchFile(rel);
console.log('done', VER);
