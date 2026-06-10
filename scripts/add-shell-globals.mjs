import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'analysis.html', 'community.html', 'neighborhood.html', 'by-industry.html',
  'events.html', 'policy.html', 'm/events.html',
  'profile.html', 'post.html', 'm/profile.html', 'm/post.html',
];

for (const f of files) {
  const fp = path.join(root, f);
  let h = fs.readFileSync(fp, 'utf8');
  if (h.includes('shell_globals.js')) continue;
  const isM = f.startsWith('m/');
  const tag = `<script src="${isM ? '../js/' : 'js/'}shell_globals.js?v=20260656"></script>`;
  h = h.replace(/(<nav class="mobile-tabs"[\s\S]*?<\/nav>)/, `$1\n${tag}`);
  fs.writeFileSync(fp, h);
  console.log('added', f);
}
