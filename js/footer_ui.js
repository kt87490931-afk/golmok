import { supabase } from './supabase_client.js';
import { detectContext, SHELL_VER } from './shell_config.js';

let _settingsCache = null;

const SNS_META = [
  { key: 'FOOTER_SNS_FACEBOOK', icon: 'ti-brand-facebook', label: 'Facebook' },
  { key: 'FOOTER_SNS_INSTAGRAM', icon: 'ti-brand-instagram', label: 'Instagram' },
  { key: 'FOOTER_SNS_YOUTUBE', icon: 'ti-brand-youtube', label: 'YouTube' },
];

const DEFAULT_LEGAL = [
  { label: '이용약관', href: 'terms.html', bold: false },
  { label: '개인정보처리방침', href: 'privacy.html', bold: true },
];

const DEFAULT_FOOTER = {
  FOOTER_COMPANY_NAME: '(주) 골목대장',
  FOOTER_CEO: '대표 ○○○',
  FOOTER_BIZ_NO: '000-00-00000',
  FOOTER_HOSTING: '호스팅 사업자 Amazon Web Service (AWS)',
  FOOTER_ADDRESS: '',
  FOOTER_PHONE: '',
  FOOTER_EMAIL: '',
  FOOTER_SNS_FACEBOOK: '',
  FOOTER_SNS_INSTAGRAM: '',
  FOOTER_SNS_YOUTUBE: '',
  FOOTER_LEGAL_LINKS: JSON.stringify(DEFAULT_LEGAL),
};

function ensureFooterCss(ctx) {
  const href = `${ctx.css}footer.css?v=${SHELL_VER}`;
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href.includes('footer.css'))) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

async function loadFooterSettings() {
  if (_settingsCache) return _settingsCache;
  const { data, error } = await supabase.rpc('get_footer_settings');
  _settingsCache = { ...DEFAULT_FOOTER };
  if (error) {
    console.warn('get_footer_settings', error.message);
    return _settingsCache;
  }
  (data || []).forEach((row) => {
    if (row.value !== undefined && row.value !== null && String(row.value).trim() !== '') {
      _settingsCache[row.key] = row.value;
    }
  });
  return _settingsCache;
}

export function clearFooterSettingsCache() {
  _settingsCache = null;
}

function resolveHref(href, ctx) {
  if (!href) return '#';
  if (/^https?:\/\//i.test(href)) return href;
  return `${ctx.root}${href.replace(/^\//, '')}`;
}

function parseLegalLinks(raw) {
  if (!raw) return DEFAULT_LEGAL;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_LEGAL;
  } catch {
    return DEFAULT_LEGAL;
  }
}

function renderSns(container, settings, ctx) {
  container.innerHTML = '';
  SNS_META.forEach(({ key, icon, label }) => {
    const url = (settings[key] || '').trim();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', label);
    a.innerHTML = `<i class="ti ${icon}"></i>`;
    container.appendChild(a);
  });
}

function renderBizInfo(container, settings) {
  const lines = [];
  const company = settings.FOOTER_COMPANY_NAME?.trim();
  const ceo = settings.FOOTER_CEO?.trim();
  const biz = settings.FOOTER_BIZ_NO?.trim();
  const mailOrder = settings.FOOTER_MAIL_ORDER_NO?.trim();
  const hosting = settings.FOOTER_HOSTING?.trim();
  const address = settings.FOOTER_ADDRESS?.trim();
  const phone = settings.FOOTER_PHONE?.trim();
  const email = settings.FOOTER_EMAIL?.trim();

  if (company) lines.push(company);
  if (ceo) lines.push(ceo);
  if (biz) lines.push(`사업자번호 ${biz}`);
  if (mailOrder) lines.push(`통신판매업 신고번호 ${mailOrder}`);
  if (hosting) lines.push(hosting);
  if (address) lines.push(address);
  const contact = [phone && `전화 ${phone}`, email && `고객문의 ${email}`].filter(Boolean).join(' | ');
  if (contact) lines.push(contact);

  container.innerHTML = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
}

function renderLegalLinks(container, settings, ctx) {
  const links = parseLegalLinks(settings.FOOTER_LEGAL_LINKS);
  container.innerHTML = '';
  links.forEach((item) => {
    const a = document.createElement('a');
    a.href = resolveHref(item.href, ctx);
    a.textContent = item.label || '';
    if (item.bold) a.classList.add('is-bold');
    container.appendChild(a);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchFooterPartial(ctx) {
  const res = await fetch(`${ctx.partials}footer-v3.html?v=${SHELL_VER}`);
  if (!res.ok) throw new Error(`footer partial: ${res.status}`);
  let html = await res.text();
  html = html
    .replace(/@@ASSETS@@/g, ctx.assets)
    .replace(/@@HOME@@/g, ctx.pages.home);
  return html;
}

function insertFooterElement(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  const footer = tpl.content.firstElementChild;
  const mobileTabs = document.querySelector('.mobile-tabs');
  if (mobileTabs) {
    mobileTabs.parentNode.insertBefore(footer, mobileTabs);
  } else {
    document.body.appendChild(footer);
  }
  return footer;
}

export async function mountSiteFooter(ctx = detectContext()) {
  if (document.body.dataset.gmFooter === 'off') return;
  if (document.getElementById('site-footer')?.dataset.mounted === '1') return;

  ensureFooterCss(ctx);

  let footer = document.getElementById('site-footer');
  if (!footer) {
    try {
      const html = await fetchFooterPartial(ctx);
      footer = insertFooterElement(html);
    } catch (err) {
      console.warn('footer partial', err);
      return;
    }
  }

  footer.dataset.mounted = '1';
  const settings = await loadFooterSettings();
  renderSns(document.getElementById('footer-sns'), settings, ctx);
  renderBizInfo(document.getElementById('footer-biz-info'), settings);
  renderLegalLinks(document.getElementById('footer-legal-links'), settings, ctx);
}

if (document.body.dataset.gmFooterAuto !== 'off') {
  const start = () => mountSiteFooter().catch((e) => console.warn('mountSiteFooter', e));
  if (document.body.dataset.gmShellDone === '1' || document.body.classList.contains('gm-shell-loaded')) {
    start();
  } else {
    document.addEventListener('gm-shell-ready', start, { once: true });
  }
}
