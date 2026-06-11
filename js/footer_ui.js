import { supabase } from './supabase_client.js';
import { detectContext, SHELL_VER } from './shell_config.js';

let _settingsCache = null;

const SNS_META = [
  {
    key: 'FOOTER_SNS_FACEBOOK',
    label: '페이스북',
    defaultUrl: 'https://facebook.com/golmokmaster',
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  },
  {
    key: 'FOOTER_SNS_INSTAGRAM',
    label: '인스타그램',
    defaultUrl: 'https://instagram.com/golmokmaster',
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
  },
  {
    key: 'FOOTER_SNS_YOUTUBE',
    label: '유튜브',
    defaultUrl: 'https://youtube.com/@golmokmaster',
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>',
  },
];

const DEFAULT_LEGAL = [
  { label: '이용약관', href: 'terms.html', bold: true },
  { label: '개인정보처리방침', href: 'privacy.html', bold: true },
  { label: '운영정책', href: 'policy-operation.html', bold: false },
  { label: '이용자보호 비전과 계획', href: 'policy-user.html', bold: false },
  { label: '청소년보호정책', href: 'policy-youth.html', bold: false },
];

const DEFAULT_FOOTER = {
  FOOTER_COMPANY_NAME: '(주) 골목대장',
  FOOTER_CEO: '대표 ○○○',
  FOOTER_BIZ_NO: '000-00-00000',
  FOOTER_MAIL_ORDER_NO: '통신판매업 신고번호 2024-서울○○-0000',
  FOOTER_JOB_NO: '직업정보제공사업 신고번호 J0000000000000',
  FOOTER_HOSTING: '호스팅 사업자 Amazon Web Service (AWS)',
  FOOTER_ADDRESS: '주소 (어드민에서 수정)',
  FOOTER_PHONE: '000-0000-0000',
  FOOTER_EMAIL: 'help@golmokmaster.com',
  FOOTER_SNS_FACEBOOK: 'https://facebook.com/golmokmaster',
  FOOTER_SNS_INSTAGRAM: 'https://instagram.com/golmokmaster',
  FOOTER_SNS_YOUTUBE: 'https://youtube.com/@golmokmaster',
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
  const clean = href.replace(/^\//, '');
  return `${ctx.root}${clean}`;
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bizNoDigits(bizNo) {
  return String(bizNo || '').replace(/\D/g, '') || '0000000000';
}

function renderSns(container, settings) {
  container.innerHTML = '';
  SNS_META.forEach(({ key, label, defaultUrl, svg }) => {
    const url = (settings[key] || defaultUrl || '').trim();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'gm-sns-btn';
    a.setAttribute('aria-label', label);
    a.innerHTML = svg;
    container.appendChild(a);
  });
}

function renderBizInfo(container, settings) {
  const company = settings.FOOTER_COMPANY_NAME?.trim() || DEFAULT_FOOTER.FOOTER_COMPANY_NAME;
  const ceo = settings.FOOTER_CEO?.trim() || DEFAULT_FOOTER.FOOTER_CEO;
  const biz = settings.FOOTER_BIZ_NO?.trim() || DEFAULT_FOOTER.FOOTER_BIZ_NO;
  const mailOrder = settings.FOOTER_MAIL_ORDER_NO?.trim() || DEFAULT_FOOTER.FOOTER_MAIL_ORDER_NO;
  const jobNo = settings.FOOTER_JOB_NO?.trim() || DEFAULT_FOOTER.FOOTER_JOB_NO;
  const hosting = settings.FOOTER_HOSTING?.trim() || DEFAULT_FOOTER.FOOTER_HOSTING;
  const address = settings.FOOTER_ADDRESS?.trim() || DEFAULT_FOOTER.FOOTER_ADDRESS;
  const phone = settings.FOOTER_PHONE?.trim() || DEFAULT_FOOTER.FOOTER_PHONE;
  const email = settings.FOOTER_EMAIL?.trim() || DEFAULT_FOOTER.FOOTER_EMAIL;
  const wrkr = bizNoDigits(biz);

  const row1 = `
    <div class="gm-biz-row">
      <span class="gm-biz-company">${escapeHtml(company)}</span>
      <span>${escapeHtml(ceo)}</span>
      <span>
        사업자번호 ${escapeHtml(biz)}
        <button type="button" class="gm-biz-check-btn" data-wrkr="${escapeHtml(wrkr)}">사업자 확인</button>
      </span>
    </div>`;

  const row2 = `
    <div class="gm-biz-row">
      <span>${escapeHtml(mailOrder)}</span>
      <span>${escapeHtml(jobNo)}</span>
    </div>`;

  const row3 = `
    <div class="gm-biz-row">
      <span>${escapeHtml(hosting)}</span>
      <span>${escapeHtml(address)}</span>
    </div>`;

  const row4 = `
    <div class="gm-biz-row">
      <span>전화 ${escapeHtml(phone)}</span>
      <span>고객문의
        <a href="mailto:${escapeHtml(email)}" class="gm-biz-mail">${escapeHtml(email)}</a>
      </span>
    </div>`;

  container.innerHTML = row1 + row2 + row3 + row4;

  container.querySelectorAll('.gm-biz-check-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const no = btn.dataset.wrkr || '0000000000';
      window.open(`https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${no}`, '_blank', 'width=500,height=400');
    });
  });
}

function renderLegalLinks(container, settings, ctx) {
  const links = parseLegalLinks(settings.FOOTER_LEGAL_LINKS);
  container.innerHTML = '';
  links.forEach((item) => {
    const a = document.createElement('a');
    a.href = resolveHref(item.href, ctx);
    a.textContent = item.label || '';
    a.className = 'gm-footer-link' + (item.bold ? ' bold' : '');
    container.appendChild(a);
  });
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
  const layout = document.querySelector('.layout');
  const mobileTabs = document.querySelector('.mobile-tabs');

  if (layout?.parentNode) {
    if (mobileTabs) layout.parentNode.insertBefore(footer, mobileTabs);
    else layout.insertAdjacentElement('afterend', footer);
  } else if (mobileTabs?.parentNode) {
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
  renderSns(document.getElementById('footer-sns'), settings);
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
