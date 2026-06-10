/**

 * v3 정적 병합 페이지에 우측 aside 위젯 삽입 + 상권분석 레이아웃 패치

 */

import fs from 'fs';

import path from 'path';

import { fileURLToPath } from 'url';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, '..');

const VER = '20260657';



const PC_PAGES = [

  'analysis.html',

  'community.html',

  'neighborhood.html',

  'by-industry.html',

  'events.html',

  'policy.html',

  'profile.html',

  'post.html',

];



function pagesCtx() {

  return { community: 'community.html' };

}



function applyTokens(html) {

  const p = pagesCtx();

  return html.replace(/@@COMMUNITY@@/g, p.community);

}



function loadAside() {

  return applyTokens(fs.readFileSync(path.join(ROOT, 'partials', 'aside-v3.html'), 'utf8'));

}



const LEGACY_AI_RE = /\/\/ AI 채팅[\s\S]*?aiInput\.addEventListener\('keydown',[\s\S]*?\);\s*\r?\n/;



function fixLegacyAiScript(html) {

  if (!LEGACY_AI_RE.test(html)) return html;

  return html.replace(

    LEGACY_AI_RE,

    '// 레거시 rcol AI 제거 — 우측 위젯(ai-widget-input)·shell_globals 사용\n\n',

  );

}



function bumpVersions(html) {

  return html

    .replace(/shell-pages\.css\?v=\d+/g, `shell-pages.css?v=${VER}`)

    .replace(/analysis-tabs\.css\?v=\d+/g, `analysis-tabs.css?v=${VER}`)

    .replace(/shell_globals\.js\?v=\d+/g, `shell_globals.js?v=${VER}`)

    .replace(/main-v3\.css\?v=\d+/g, `main-v3.css?v=${VER}`);

}



function patchFile(file) {

  const fp = path.join(ROOT, file);

  if (!fs.existsSync(fp)) {

    console.log('MISSING', file);

    return;

  }

  let html = fs.readFileSync(fp, 'utf8');

  if (!html.includes('<header class="hd">')) {

    console.log('SKIP (no v3 shell)', file);

    return;

  }



  let changed = false;



  if (!html.includes('<aside class="aside">')) {

    const aside = loadAside();

    const before = html;

    html = html.replace(

      /<\/main>\s*\r?\n<\/div>\s*\r?\n\r?\n<nav class="mobile-tabs"/,

      `</main>\n${aside}\n</div>\n\n<nav class="mobile-tabs"`,

    );

    if (html === before) {

      html = html.replace(

        /<\/main>\s*\r?\n<\/div>\s*\r?\n<nav class="mobile-tabs"/,

        `</main>\n${aside}\n</div>\n<nav class="mobile-tabs"`,

      );

    }

    if (html.includes('<aside class="aside">')) {

      console.log('INSERTED ASIDE', file);

      changed = true;

    } else {

      console.error('FAILED ASIDE INSERT', file);

    }

  } else {

    console.log('HAS ASIDE', file);

  }



  if (file === 'analysis.html') {

    if (!html.includes('gm-shell-analysis')) {

      html = html.replace(

        /<body class="gm-shell-loaded"/,

        '<body class="gm-shell-loaded gm-shell-analysis"',

      );

      changed = true;

    }

    html = html.replace(

      /class="sb-a" data-gm-nav="analysis" class="act"/,

      'class="sb-a act" data-gm-nav="analysis"',

    );

  }



  const fixed = fixLegacyAiScript(html);

  if (fixed !== html) {

    html = fixed;

    changed = true;

    console.log('FIXED LEGACY AI SCRIPT', file);

  }



  html = bumpVersions(html);



  const prev = fs.readFileSync(fp, 'utf8');

  if (changed || html !== prev) {

    fs.writeFileSync(fp, html, 'utf8');

    console.log('PATCHED', file);

  }

}



for (const f of PC_PAGES) patchFile(f);

console.log('DONE patch-aside-v3');


