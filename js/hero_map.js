import { waitForShell } from './shell_boot.js';
import { getApiKey } from './api-config.js';

async function waitForHeroIframe(maxMs = 12000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const el = document.getElementById('hero-map-iframe');
    if (el) return el;
    await new Promise((r) => setTimeout(r, 40));
  }
  return document.getElementById('hero-map-iframe');
}

export async function loadHeroMap() {
  const iframe = await waitForHeroIframe();
  if (!iframe || iframe.dataset.heroMapLoaded === '1') return;

  try {
    const certKey = await getApiKey('SOJANGGONG_STARTUP_KEY');
    if (!certKey || certKey.startsWith('YOUR_') || certKey.startsWith('REPLACE_')) return;
    iframe.src = `https://bigdata.sbiz.or.kr/#/openApi/startupPublic?certKey=${encodeURIComponent(certKey)}`;
    iframe.dataset.heroMapLoaded = '1';
  } catch (e) {
    console.warn('loadHeroMap', e);
  }
}

async function bootHeroMap() {
  await waitForShell();
  if (!document.getElementById('hero-map-iframe')) return;
  await loadHeroMap();
}

bootHeroMap();
