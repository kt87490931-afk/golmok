const fs = require('fs');
const path = require('path');

const ver = '20260655';
const root = path.join(__dirname, '..');

function refactor(rel, isM) {
  const bak = path.join(root, isM ? 'm/index_backup_shell.html' : 'index_backup_shell.html');
  const out = path.join(root, rel);
  const lines = fs.readFileSync(bak, 'utf8').split(/\r?\n/);
  const startIdx = lines.findIndex((l) => l.includes('<main class="main">'));
  const widgetIdx = lines.findIndex((l) => l.includes('<aside class="aside">'));
  let endIdx = -1;
  if (widgetIdx >= 0) {
    endIdx = widgetIdx;
    while (endIdx < lines.length && !/^<\/aside>\s*$/.test(lines[endIdx])) endIdx += 1;
  } else {
    endIdx = lines.findIndex((l, i) => i > startIdx && /^<\/main>\s*$/.test(l));
  }
  if (startIdx < 0 || endIdx < 0) throw new Error(`bounds not found in ${rel}`);
  const tpl = lines.slice(startIdx, endIdx + 1).join('\n');
  const scriptStart = lines.findIndex((l, i) => i > 400 && l.trim() === '<script>' && lines[i + 1] && lines[i + 1].includes('showToast'));
  const scriptLines = lines.slice(scriptStart).join('\n').replace(/\?v=202606\d+/g, `?v=${ver}`);
  const cssBase = isM ? '../css/' : 'css/';
  const jsBase = isM ? '../js/' : 'js/';
  const route = isM ? 'js/desktop-route.js' : 'js/mobile-route.js';
  const bodyClass = isM ? ' class="m-shell"' : '';
  const mCss = isM ? `\n<link rel="stylesheet" href="${cssBase}main-v3-m.css?v=${ver}">` : '';
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="google-site-verification" content="7_bUIeA-EHmgGeP9RFu_B3IodiO7-cQL3pBrrIuqqU4" />
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#F5A623">
<script src="${route}"></script>
<title>골목대장 — 우리는 모두 골목대장, 데이터로 보는 상권의 힘</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
<link rel="stylesheet" href="${cssBase}main-v3.css?v=${ver}">
<link rel="stylesheet" href="${cssBase}shell-pages.css?v=${ver}">${mCss}
<link rel="icon" href="assets/gmlogo.png" type="image/png">
</head>
<body${bodyClass} data-gm-active="home" data-gm-shell="home">

<template id="gm-page-tpl">
${tpl}
</template>

<script type="module" src="${jsBase}shell_loader.js?v=${ver}"></script>
${scriptLines}`;
  fs.writeFileSync(out, html, 'utf8');
  console.log('OK', rel, 'template lines:', endIdx - startIdx + 1);
}

if (process.argv.includes('--m-only')) {
  refactor('m/index.html', true);
} else if (process.argv.includes('--pc-only')) {
  refactor('index.html', false);
} else {
  refactor('index.html', false);
  refactor('m/index.html', true);
}
