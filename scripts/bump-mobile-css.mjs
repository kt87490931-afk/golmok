/**
 * /m/ HTML — main-v3-m.css · main-v3.css 캐시 버전 일괄 갱신
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const VER = '20260663';

const mDir = path.join(ROOT, 'm');
const files = fs.readdirSync(mDir).filter((f) => f.endsWith('.html') && !f.includes('backup'));

for (const file of files) {
  const fp = path.join(mDir, file);
  let html = fs.readFileSync(fp, 'utf8');
  const before = html;
  html = html
    .replace(/main-v3-m\.css\?v=\d+/g, `main-v3-m.css?v=${VER}`)
    .replace(/main-v3\.css\?v=\d+/g, `main-v3.css?v=${VER}`)
    .replace(/shell-pages\.css\?v=\d+/g, `shell-pages.css?v=${VER}`);
  if (html !== before) {
    fs.writeFileSync(fp, html, 'utf8');
    console.log('BUMPED', file);
  }
}

console.log('DONE', VER);
