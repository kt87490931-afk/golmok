import { supabase } from './supabase_client.js';

const SLUG_MAP = {
  terms: 'terms',
  privacy: 'privacy',
  operation: 'operation',
  user: 'user',
  youth: 'youth',
};

async function loadLegalPage(slug) {
  if (!SLUG_MAP[slug]) return;

  const bodyEl = document.getElementById('legal-body');
  if (!bodyEl) return;

  const { data, error } = await supabase.rpc('get_legal_page', { p_slug: slug });
  if (error || !data?.length) return;

  const row = data[0];
  if (row.title) {
    const titleEl = document.getElementById('legal-title');
    if (titleEl) titleEl.textContent = row.title;
  }
  if (row.updated_label) {
    const updatedEl = document.getElementById('legal-updated');
    if (updatedEl) updatedEl.textContent = row.updated_label;
  }
  if (row.body_html?.trim()) {
    bodyEl.innerHTML = row.body_html;
  }
}

const slug = document.body.dataset.legalSlug;
if (slug) {
  loadLegalPage(slug).catch((e) => console.warn('legal_page', e));
}
