/**
 * 레거시 HTML → v3 셸 정적 병합 (fetch/transform 없이 즉시 v3 UI)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const VER = '20260656';

const PAGES = [
  { file: 'analysis.html', active: 'analysis', shell: 'analysis', isM: false },
  { file: 'community.html', active: 'community', shell: 'standard', isM: false },
  { file: 'neighborhood.html', active: 'neighborhood', shell: 'standard', isM: false },
  { file: 'by-industry.html', active: 'by-industry', shell: 'standard', isM: false },
  { file: 'events.html', active: 'events', shell: 'standard', isM: false },
  { file: 'policy.html', active: 'policy', shell: 'standard', isM: false },
  { file: 'm/events.html', active: 'events', shell: 'standard', isM: true },
];

function pagesCtx(isM) {
  return {
    home: 'index.html',
    analysis: 'analysis.html',
    weather: 'analysis.html?tab=weather',
    hotplace: 'analysis.html?tab=hotplace',
    community: isM ? '../community.html' : 'community.html',
    neighborhood: isM ? '../neighborhood.html' : 'neighborhood.html',
    byIndustry: isM ? '../by-industry.html' : 'by-industry.html',
    events: isM ? 'events.html' : 'events.html',
    policy: isM ? '../policy.html' : 'policy.html',
    profile: isM ? 'profile.html' : 'profile.html',
  };
}

function applyTokens(html, isM) {
  const p = pagesCtx(isM);
  return html
    .replace(/@@ASSETS@@/g, 'assets/')
    .replace(/@@HOME@@/g, p.home)
    .replace(/@@ANALYSIS@@/g, p.analysis)
    .replace(/@@WEATHER@@/g, p.weather)
    .replace(/@@HOTPLACE@@/g, p.hotplace)
    .replace(/@@COMMUNITY@@/g, p.community)
    .replace(/@@NEIGHBORHOOD@@/g, p.neighborhood)
    .replace(/@@BY_INDUSTRY@@/g, p.byIndustry)
    .replace(/@@EVENTS@@/g, p.events)
    .replace(/@@POLICY@@/g, p.policy)
    .replace(/@@PROFILE@@/g, p.profile);
}

function loadPartial(name) {
  return fs.readFileSync(path.join(ROOT, 'partials', name), 'utf8');
}

function setActiveNav(html, active) {
  return html.replace(
    new RegExp(`(<a\\s)([^>]*data-gm-nav="${active}"[^>]*)>`, 'g'),
    (match, open, attrs) => {
      if (/\bact\b/.test(attrs)) return `${open}${attrs}>`;
      if (/class="/.test(attrs)) {
        return `${open}${attrs.replace(/class="([^"]*)"/, 'class="$1 act"')}>`;
      }
      return `${open}class="act" ${attrs}>`;
    },
  );
}

function extractInner(html) {
  const m = html.match(/<main class="center">[\s\S]*?<div class="fscroll page-main-content">([\s\S]*?)<\/div>\s*<\/main>/);
  return m ? m[1].trim() : null;
}

function extractTail(html) {
  const markers = ['<!-- 글쓰기 모달 -->', '<div class="modal-bg" id="write-modal">', '<!-- 토스트 -->', '<div class="toast"'];
  let idx = -1;
  for (const mk of markers) {
    const i = html.indexOf(mk);
    if (i >= 0 && (idx < 0 || i < idx)) idx = i;
  }
  if (idx < 0) {
    const s = html.indexOf('<script');
    return s >= 0 ? html.slice(s) : '';
  }
  let tail = html.slice(idx);
  tail = tail.replace(/<script type="module" src="[^"]*shell_loader\.js[^"]*"><\/script>\s*/g, '');
  return tail;
}

function patchHead(head, isM) {
  const css = isM ? '../css/' : 'css/';
  let h = head
    .replace(/<link rel="stylesheet" href="[^"]*mobile-shell\.css[^"]*">\s*/g, '')
    .replace(/<script src="[^"]*mobile-nav\.js[^"]*"[^>]*><\/script>\s*/g, '');
  if (!h.includes('main-v3.css')) {
    h = h.replace('</head>', `<link rel="stylesheet" href="${css}main-v3.css?v=${VER}">\n</head>`);
  } else {
    h = h.replace(/main-v3\.css\?v=\d+/g, `main-v3.css?v=${VER}`);
  }
  if (!h.includes('shell-pages.css')) {
    h = h.replace('</head>', `<link rel="stylesheet" href="${css}shell-pages.css?v=${VER}">\n</head>`);
  } else {
    h = h.replace(/shell-pages\.css\?v=\d+/g, `shell-pages.css?v=${VER}`);
  }
  if (isM && !h.includes('main-v3-m.css')) {
    h = h.replace('</head>', `<link rel="stylesheet" href="${css}main-v3-m.css?v=${VER}">\n</head>`);
  }
  return h;
}

function buildShell(active, shell, isM) {
  const header = setActiveNav(applyTokens(loadPartial('header-v3.html'), isM), active);
  const sidebar = setActiveNav(applyTokens(loadPartial('sidebar-v3.html'), isM), active);
  const tabs = applyTokens(loadPartial('mobile-tabs-v3.html'), isM);
  return { header, sidebar, tabs };
}

function mergeOne({ file, active, shell, isM }) {
  const fp = path.join(ROOT, file);
  let html = fs.readFileSync(fp, 'utf8');
  if (!html.includes('class="topnav"') && !html.includes('<header class="hd">')) {
    console.log('SKIP', file);
    return;
  }
  if (html.includes('<header class="hd">') && !html.includes('class="topnav"')) {
    console.log('ALREADY V3', file);
    return;
  }

  const inner = extractInner(html);
  if (!inner) {
    console.error('NO INNER', file);
    return;
  }

  const headM = html.match(/<head>[\s\S]*?<\/head>/);
  if (!headM) return;
  const head = patchHead(headM[0], isM);
  const tail = extractTail(html);
  const { header, sidebar, tabs } = buildShell(active, shell, isM);
  const bodyCls = isM ? 'm-shell gm-shell-loaded' : 'gm-shell-loaded';

  const js = isM ? '../js/' : 'js/';
  const out = `<!DOCTYPE html>
<html lang="ko">
${head}
<body class="${bodyCls}" data-gm-active="${active}" data-gm-shell="${shell}">

${header}
<div class="layout">
${sidebar}
<main class="main">
<div class="gm-page-inner">
${inner}
</div>
</main>
</div>

${tabs}
<script src="${js}shell_globals.js?v=${VER}"></script>
${tail}`;

  fs.writeFileSync(fp, out, 'utf8');
  console.log('MERGED', file);
}

function mergeMinimal(file, active, isM) {
  const fp = path.join(ROOT, file);
  const html = fs.readFileSync(fp, 'utf8');
  if (html.includes('<header class="hd">')) {
    console.log('ALREADY MINIMAL V3', file);
    return;
  }
  const headM = html.match(/<head>[\s\S]*?<\/head>/);
  if (!headM) return;
  const head = patchHead(headM[0], isM);
  const bodyM = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (!bodyM) return;
  let inner = bodyM[1]
    .replace(/<script type="module" src="[^"]*shell_loader\.js[^"]*"><\/script>\s*/g, '');
  const { header, sidebar, tabs } = buildShell(active, 'minimal', isM);
  const js = isM ? '../js/' : 'js/';
  const bodyCls = isM ? 'm-shell gm-shell-loaded gm-shell-minimal' : 'gm-shell-loaded gm-shell-minimal';
  const out = `<!DOCTYPE html>
<html lang="ko">
${head}
<body class="${bodyCls}" data-gm-active="${active}" data-gm-shell="minimal">

${header}
<div class="layout">
${sidebar}
<main class="main">
<div class="gm-page-inner">
${inner.trim()}
</div>
</main>
</div>

${tabs}
<script src="${js}shell_globals.js?v=${VER}"></script>
</body>
</html>`;
  fs.writeFileSync(fp, out, 'utf8');
  console.log('MERGED MINIMAL', file);
}

for (const p of PAGES) mergeOne(p);
mergeMinimal('profile.html', 'profile', false);
mergeMinimal('post.html', 'post', false);
mergeMinimal('m/profile.html', 'profile', true);
mergeMinimal('m/post.html', 'post', true);
